#!/usr/bin/env node
// Upload images to Imgur anonymously by URL, file or folder and print the Imgur link for each.
// Requires Node 18+. No dependencies.

import { spawn } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";

const USAGE = `Usage:
  share-image [--json] <url|file|folder> [...]
  share-image [--json] '["<url|file|folder>", ...]'

Folders are searched for images, including in subfolders. Hidden files and
folders and symlinks are skipped. Uploads are public and can't be deleted.

Prints one "<url or file path><TAB><imgur url>" line per image, in input order.
A failed upload prints "<url or file path><TAB>ERROR: <reason>" and the exit code is 1.

The Imgur links, and nothing else, are also copied to the clipboard, one per line.

Options:
  --json      Print a JSON array of {"input", "imgur"} or {"input", "error"}
  -h, --help  Show this help

Environment:
  IMGUR_CLIENT_ID      Imgur API client ID (defaults to a built-in shared ID)
  IMGUR_CLIENT_SECRET  Imgur API client secret (defaults to a built-in shared secret)`;

const API_URL = "https://api.imgur.com/3/image";
const CLIENT_ID = process.env.IMGUR_CLIENT_ID || "9b0aa5cb5d65843";
const CLIENT_SECRET = process.env.IMGUR_CLIENT_SECRET || "97851ab8356b4994619acc566d854529b0ca640f";
const CONCURRENCY = 4;
const TIMEOUT_MS = 60_000;
const IMAGE_EXTENSIONS = new Set([
	".apng", ".bmp", ".gif", ".heic", ".jpeg", ".jpg", ".png", ".svg", ".tif", ".tiff", ".webp",
]);

// Retrying with the image bytes can't help when the client is rejected or rate limited.
const NO_FALLBACK_STATUSES = new Set([401, 403, 429]);

// Tried in order until one works. Linux varies by display server, so wl-copy fails over to xclip.
const CLIPBOARD_COMMANDS = {
	darwin: [["pbcopy"]],
	win32: [["clip"]],
};
const DEFAULT_CLIPBOARD_COMMANDS = [["wl-copy"], ["xclip", "-selection", "clipboard"]];
const CLIPBOARD_TIMEOUT_MS = 5_000;

class ImgurError extends Error {
	constructor(message, status) {
		super(message);
		this.status = status;
	}
}

async function postImage(image) {
	const response = await fetch(API_URL, {
		method: "POST",
		headers: { Authorization: `Client-ID ${CLIENT_ID}` },
		body: new URLSearchParams({ image }),
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});

	const text = await response.text();
	let body = null;
	try {
		body = JSON.parse(text);
	} catch {
		// Rate limit and gateway errors can come back as HTML.
	}

	const link = body?.data?.link;
	if (!response.ok || !link) {
		const error = body?.data?.error;
		const reason = error?.message ?? (typeof error === "string" ? error : null);
		throw new ImgurError(reason ?? `HTTP ${response.status}`, response.status);
	}

	return link.replace(/^http:/, "https:");
}

async function downloadAsBase64(url) {
	const response = await fetch(url, {
		headers: { "User-Agent": "imgur-upload-cli/1.0" },
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}
	return Buffer.from(await response.arrayBuffer()).toString("base64");
}

async function upload(input) {
	let protocol;
	try {
		protocol = new URL(input).protocol;
	} catch {
		throw new Error("not a valid URL or an existing file or folder");
	}

	if (protocol === "data:") {
		return postImage(input.split(",")[1] ?? "");
	}
	if (protocol !== "http:" && protocol !== "https:") {
		throw new Error(`unsupported URL scheme "${protocol}"`);
	}

	try {
		return await postImage(input);
	} catch (imgurError) {
		if (NO_FALLBACK_STATUSES.has(imgurError.status)) {
			throw imgurError;
		}

		// Imgur couldn't fetch the URL itself, so send the image bytes instead.
		let image;
		try {
			image = await downloadAsBase64(input);
		} catch (downloadError) {
			throw new Error(`Imgur: ${imgurError.message}; direct download: ${downloadError.message}`);
		}
		return postImage(image);
	}
}

async function findImages(folder) {
	let entries;
	try {
		entries = await readdir(folder, { withFileTypes: true });
	} catch (error) {
		return [{ input: folder, error: error.message }];
	}

	entries.sort((a, b) => a.name.localeCompare(b.name));

	const items = [];
	for (const entry of entries) {
		if (entry.name.startsWith(".")) {
			continue;
		}
		const path = join(folder, entry.name);
		if (entry.isDirectory()) {
			items.push(...await findImages(path));
		} else if (entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
			items.push({ input: path, isFile: true });
		}
	}
	return items;
}

async function expandInputs(inputs) {
	const items = [];
	for (const input of inputs) {
		// Anything that isn't on disk, such as a URL, makes stat fail.
		const stats = await stat(input).catch(() => null);
		if (stats?.isDirectory()) {
			const found = await findImages(input);
			items.push(...(found.length > 0 ? found : [{ input, error: "no images found in folder" }]));
		} else {
			items.push({ input, isFile: stats?.isFile() ?? false });
		}
	}
	return items;
}

async function uploadItem({ input, isFile, error }) {
	if (error) {
		throw new Error(error);
	}
	return isFile ? postImage((await readFile(input)).toString("base64")) : upload(input);
}

async function uploadAll(items) {
	const results = new Array(items.length);
	let next = 0;

	async function worker() {
		while (next < items.length) {
			const index = next++;
			const item = items[index];
			try {
				results[index] = { input: item.input, imgur: await uploadItem(item) };
			} catch (error) {
				results[index] = { input: item.input, error: error.message };
			}
		}
	}

	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
	return results;
}

function pipeToCommand([command, ...args], text) {
	return new Promise(resolve => {
		const child = spawn(command, args, {
			stdio: ["pipe", "ignore", "ignore"],
			timeout: CLIPBOARD_TIMEOUT_MS,
		});
		child.on("error", () => resolve(false));
		child.on("close", code => resolve(code === 0));
		// A missing or crashing command closes the pipe, which "error" and "close" already report.
		child.stdin.on("error", () => {});
		child.stdin.end(text);
	});
}

async function copyToClipboard(text) {
	for (const command of CLIPBOARD_COMMANDS[process.platform] ?? DEFAULT_CLIPBOARD_COMMANDS) {
		if (await pipeToCommand(command, text)) {
			return true;
		}
	}
	return false;
}

function usageError(message) {
	console.error(`${message}\n\n${USAGE}`);
	process.exit(2);
}

function parseArgs(argv) {
	const inputs = [];
	let json = false;

	for (const arg of argv) {
		if (arg === "-h" || arg === "--help") {
			console.log(USAGE);
			process.exit(0);
		} else if (arg === "--json") {
			json = true;
		} else if (arg.startsWith("-")) {
			usageError(`Unknown option: ${arg}`);
		} else if (arg.trimStart().startsWith("[")) {
			let urls;
			try {
				urls = JSON.parse(arg);
			} catch (error) {
				usageError(`Invalid JSON array: ${error.message}`);
			}
			if (!urls.every(url => typeof url === "string")) {
				usageError("JSON array must contain only URL strings");
			}
			inputs.push(...urls);
		} else {
			inputs.push(arg);
		}
	}

	if (inputs.length === 0) {
		usageError("No image URLs, files or folders given");
	}
	return { inputs, json };
}

const { inputs, json } = parseArgs(process.argv.slice(2));
const results = await uploadAll(await expandInputs(inputs));

if (json) {
	console.log(JSON.stringify(results, null, 2));
} else {
	for (const { input, imgur, error } of results) {
		console.log(`${input}\t${imgur ?? `ERROR: ${error}`}`);
	}
}

// Status goes to stderr so stdout stays safe to parse. The exit code only reports uploads.
const links = results.flatMap(result => result.imgur ?? []);
if (links.length > 0) {
	console.error((await copyToClipboard(links.join("\n"))) ? "Copied to clipboard" : "Couldn't copy to clipboard");
}

process.exitCode = results.some(result => result.error) ? 1 : 0;
