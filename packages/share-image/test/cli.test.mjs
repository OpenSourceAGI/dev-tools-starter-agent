import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../bin/share-image.mjs", import.meta.url));
const DEMO = fileURLToPath(new URL("./demo.mjs", import.meta.url));
const MOCK_FETCH = fileURLToPath(new URL("./mock-fetch.cjs", import.meta.url));

const API_URL = "https://api.imgur.com/3/image";
const DEFAULT_CLIENT_ID = "9b0aa5cb5d65843";
const IMAGE_URL = "https://example.com/a.png";
const IMAGE_BYTES = "fake image bytes";
const IMAGE_BASE64 = Buffer.from(IMAGE_BYTES).toString("base64");

const uploaded = (link = "https://i.imgur.com/abc.png") => ({ body: { data: { link } } });
const rejected = (status, error = "rejected") => ({ status, body: { data: { error } } });
const base64 = contents => Buffer.from(contents).toString("base64");

// Creates files from a { "relative/path": contents } map for the length of the callback.
async function withFiles(files, callback) {
	const dir = await mkdtemp(join(tmpdir(), "share-image-files-"));
	try {
		for (const [path, contents] of Object.entries(files)) {
			await mkdir(dirname(join(dir, path)), { recursive: true });
			await writeFile(join(dir, path), contents);
		}
		return await callback(dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function run(args, { routes = {}, env = {}, script = CLI } = {}) {
	const dir = await mkdtemp(join(tmpdir(), "share-image-test-"));
	const logPath = join(dir, "requests.log");

	try {
		const { IMGUR_CLIENT_ID, IMGUR_CLIENT_SECRET, ...cleanEnv } = process.env;
		const { code, stdout, stderr } = await new Promise(resolve => {
			execFile(
				process.execPath,
				["--require", MOCK_FETCH, script, ...args],
				{
					env: {
						...cleanEnv,
						...env,
						MOCK_FETCH_ROUTES: JSON.stringify(routes),
						MOCK_FETCH_LOG: logPath,
					},
				},
				(error, stdout, stderr) => resolve({ code: error ? error.code : 0, stdout, stderr }),
			);
		});

		const log = await readFile(logPath, "utf8").catch(() => "");
		const calls = log
			.split("\n")
			.filter(Boolean)
			.map(line => JSON.parse(line));

		assert.deepEqual(
			calls.filter(call => call.unmatched).map(call => call.key),
			[],
			"the CLI made a request the test didn't expect",
		);
		return { code, stdout, stderr, calls };
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

describe("arguments", () => {
	for (const flag of ["-h", "--help"]) {
		test(`${flag} prints usage and exits 0`, async () => {
			const { code, stdout, calls } = await run([flag]);
			assert.equal(code, 0);
			assert.match(stdout, /^Usage:/);
			assert.equal(calls.length, 0);
		});
	}

	const invalid = [
		["no arguments", [], /No image URLs, files or folders given/],
		["only --json", ["--json"], /No image URLs, files or folders given/],
		["an empty JSON array", ["[]"], /No image URLs, files or folders given/],
		["an unknown option", ["--nope", IMAGE_URL], /Unknown option: --nope/],
		["malformed JSON", ['["https://example.com/a.png"'], /Invalid JSON array/],
		["non-strings in a JSON array", ['["https://example.com/a.png", 1]'], /only URL strings/],
	];

	for (const [name, args, message] of invalid) {
		test(`${name} prints usage to stderr and exits 2`, async () => {
			const { code, stdout, stderr, calls } = await run(args);
			assert.equal(code, 2);
			assert.equal(stdout, "");
			assert.match(stderr, message);
			assert.match(stderr, /Usage:/);
			assert.equal(calls.length, 0);
		});
	}

	test("accepts a JSON array, with leading whitespace", async () => {
		const { code, stdout } = await run([`  ["${IMAGE_URL}"]`], {
			routes: { [`POST ${IMAGE_URL}`]: uploaded() },
		});
		assert.equal(code, 0);
		assert.equal(stdout, `${IMAGE_URL}\thttps://i.imgur.com/abc.png\n`);
	});

	test("combines positional URLs and JSON arrays in argument order", async () => {
		const routes = {
			"POST https://example.com/1.png": uploaded("https://i.imgur.com/1.png"),
			"POST https://example.com/2.png": uploaded("https://i.imgur.com/2.png"),
			"POST https://example.com/3.png": uploaded("https://i.imgur.com/3.png"),
		};
		const { stdout } = await run(
			["https://example.com/1.png", '["https://example.com/2.png"]', "https://example.com/3.png"],
			{ routes },
		);
		assert.equal(
			stdout,
			[
				"https://example.com/1.png\thttps://i.imgur.com/1.png",
				"https://example.com/2.png\thttps://i.imgur.com/2.png",
				"https://example.com/3.png\thttps://i.imgur.com/3.png",
				"",
			].join("\n"),
		);
	});

	test("--json works after the URLs", async () => {
		const { stdout } = await run([IMAGE_URL, "--json"], {
			routes: { [`POST ${IMAGE_URL}`]: uploaded() },
		});
		assert.deepEqual(JSON.parse(stdout), [{ input: IMAGE_URL, imgur: "https://i.imgur.com/abc.png" }]);
	});
});

describe("the Imgur request", () => {
	test("posts the URL as a form field with a timeout", async () => {
		const { calls } = await run([IMAGE_URL], { routes: { [`POST ${IMAGE_URL}`]: uploaded() } });
		assert.equal(calls.length, 1);
		const [call] = calls;
		assert.equal(call.method, "POST");
		assert.equal(call.url, API_URL);
		assert.equal(call.image, IMAGE_URL);
		assert.equal(call.contentType, "URLSearchParams");
		assert.equal(call.hasTimeout, true);
	});

	test("uses the built-in client ID by default", async () => {
		const { calls } = await run([IMAGE_URL], { routes: { [`POST ${IMAGE_URL}`]: uploaded() } });
		assert.equal(calls[0].headers.Authorization, `Client-ID ${DEFAULT_CLIENT_ID}`);
	});

	test("IMGUR_CLIENT_ID overrides the client ID", async () => {
		const { calls } = await run([IMAGE_URL], {
			routes: { [`POST ${IMAGE_URL}`]: uploaded() },
			env: { IMGUR_CLIENT_ID: "my-client-id" },
		});
		assert.equal(calls[0].headers.Authorization, "Client-ID my-client-id");
	});

	test("rewrites an http link to https", async () => {
		const { stdout } = await run([IMAGE_URL], {
			routes: { [`POST ${IMAGE_URL}`]: uploaded("http://i.imgur.com/abc.png") },
		});
		assert.equal(stdout, `${IMAGE_URL}\thttps://i.imgur.com/abc.png\n`);
	});

	test("sends only the base64 payload of a data: URL", async () => {
		const input = `data:image/png;base64,${IMAGE_BASE64}`;
		const { code, stdout, calls } = await run([input], {
			routes: { [`POST ${IMAGE_BASE64}`]: uploaded() },
		});
		assert.equal(code, 0);
		assert.equal(stdout, `${input}\thttps://i.imgur.com/abc.png\n`);
		assert.equal(calls.length, 1);
	});
});

describe("inputs rejected before any request", () => {
	const cases = [
		["a string that isn't a URL", "not-a-url", "not a valid URL or an existing file or folder"],
		["an empty string", "", "not a valid URL or an existing file or folder"],
		["an unsupported scheme", "ftp://example.com/a.png", 'unsupported URL scheme "ftp:"'],
		["a file: URL", "file:///etc/passwd", 'unsupported URL scheme "file:"'],
	];

	for (const [name, input, reason] of cases) {
		test(name, async () => {
			const { code, stdout, calls } = await run([input]);
			assert.equal(code, 1);
			assert.equal(stdout, `${input}\tERROR: ${reason}\n`);
			assert.equal(calls.length, 0);
		});
	}
});

describe("fallback to sending the image bytes", () => {
	test("downloads and uploads the image when Imgur can't fetch the URL", async () => {
		const { code, stdout, calls } = await run([IMAGE_URL], {
			routes: {
				[`POST ${IMAGE_URL}`]: rejected(400, "Invalid URL"),
				[`GET ${IMAGE_URL}`]: { body: IMAGE_BYTES },
				[`POST ${IMAGE_BASE64}`]: uploaded(),
			},
		});
		assert.equal(code, 0);
		assert.equal(stdout, `${IMAGE_URL}\thttps://i.imgur.com/abc.png\n`);
		assert.deepEqual(
			calls.map(call => call.key),
			[`POST ${IMAGE_URL}`, `GET ${IMAGE_URL}`, `POST ${IMAGE_BASE64}`],
		);
	});

	test("the download sends a User-Agent and has a timeout", async () => {
		const { calls } = await run([IMAGE_URL], {
			routes: {
				[`POST ${IMAGE_URL}`]: rejected(400),
				[`GET ${IMAGE_URL}`]: { body: IMAGE_BYTES },
				[`POST ${IMAGE_BASE64}`]: uploaded(),
			},
		});
		const download = calls.find(call => call.method === "GET");
		assert.equal(download.headers["User-Agent"], "imgur-upload-cli/1.0");
		assert.equal(download.hasTimeout, true);
	});

	const triggers = [
		["a network error", { networkError: "fetch failed" }],
		["a 500 with an HTML body", { status: 500, body: "<html>Bad gateway</html>" }],
		["a 200 with no link", { body: { data: {} } }],
	];

	for (const [name, response] of triggers) {
		test(`falls back on ${name}`, async () => {
			const { code, stdout } = await run([IMAGE_URL], {
				routes: {
					[`POST ${IMAGE_URL}`]: response,
					[`GET ${IMAGE_URL}`]: { body: IMAGE_BYTES },
					[`POST ${IMAGE_BASE64}`]: uploaded(),
				},
			});
			assert.equal(code, 0);
			assert.equal(stdout, `${IMAGE_URL}\thttps://i.imgur.com/abc.png\n`);
		});
	}

	for (const status of [401, 403, 429]) {
		test(`doesn't fall back on ${status}`, async () => {
			const { code, stdout, calls } = await run([IMAGE_URL], {
				routes: { [`POST ${IMAGE_URL}`]: rejected(status, "Too many requests") },
			});
			assert.equal(code, 1);
			assert.equal(stdout, `${IMAGE_URL}\tERROR: Too many requests\n`);
			assert.equal(calls.length, 1);
		});
	}

	test("doesn't fall back for a data: URL", async () => {
		const input = `data:image/png;base64,${IMAGE_BASE64}`;
		const { code, stdout, calls } = await run([input], {
			routes: { [`POST ${IMAGE_BASE64}`]: rejected(400, "Bad image") },
		});
		assert.equal(code, 1);
		assert.equal(stdout, `${input}\tERROR: Bad image\n`);
		assert.equal(calls.length, 1);
	});

	test("reports both errors when the download returns an error status", async () => {
		const { code, stdout } = await run([IMAGE_URL], {
			routes: {
				[`POST ${IMAGE_URL}`]: rejected(400, "Invalid URL"),
				[`GET ${IMAGE_URL}`]: { status: 404 },
			},
		});
		assert.equal(code, 1);
		assert.equal(stdout, `${IMAGE_URL}\tERROR: Imgur: Invalid URL; direct download: HTTP 404\n`);
	});

	test("reports both errors when the download hits a network error", async () => {
		const { stdout } = await run([IMAGE_URL], {
			routes: {
				[`POST ${IMAGE_URL}`]: rejected(400, "Invalid URL"),
				[`GET ${IMAGE_URL}`]: { networkError: "fetch failed" },
			},
		});
		assert.equal(stdout, `${IMAGE_URL}\tERROR: Imgur: Invalid URL; direct download: fetch failed\n`);
	});

	test("reports the second Imgur error when uploading the bytes fails", async () => {
		const { code, stdout } = await run([IMAGE_URL], {
			routes: {
				[`POST ${IMAGE_URL}`]: rejected(400, "Invalid URL"),
				[`GET ${IMAGE_URL}`]: { body: IMAGE_BYTES },
				[`POST ${IMAGE_BASE64}`]: rejected(400, "Unsupported file type"),
			},
		});
		assert.equal(code, 1);
		assert.equal(stdout, `${IMAGE_URL}\tERROR: Unsupported file type\n`);
	});
});

describe("Imgur error messages", () => {
	const cases = [
		["data.error.message", { status: 403, body: { data: { error: { message: "Nested reason" } } } }, "Nested reason"],
		["a data.error string", { status: 403, body: { data: { error: "Plain reason" } } }, "Plain reason"],
		["the status for a non-JSON body", { status: 429, body: "<html>Slow down</html>" }, "HTTP 429"],
		["the status for JSON with no error", { status: 403, body: { data: {} } }, "HTTP 403"],
	];

	for (const [name, response, reason] of cases) {
		test(`uses ${name}`, async () => {
			const { stdout } = await run([IMAGE_URL], { routes: { [`POST ${IMAGE_URL}`]: response } });
			assert.equal(stdout, `${IMAGE_URL}\tERROR: ${reason}\n`);
		});
	}
});

describe("files and folders", () => {
	test("uploads a file's bytes and prints its path", async () => {
		await withFiles({ "logo.png": "logo" }, async dir => {
			const path = join(dir, "logo.png");
			const { code, stdout, calls } = await run([path], {
				routes: { [`POST ${base64("logo")}`]: uploaded() },
			});
			assert.equal(code, 0);
			assert.equal(stdout, `${path}\thttps://i.imgur.com/abc.png\n`);
			assert.equal(calls.length, 1);
		});
	});

	test("accepts a file in a JSON array", async () => {
		await withFiles({ "logo.png": "logo" }, async dir => {
			const path = join(dir, "logo.png");
			const { stdout } = await run([JSON.stringify([path])], {
				routes: { [`POST ${base64("logo")}`]: uploaded() },
			});
			assert.equal(stdout, `${path}\thttps://i.imgur.com/abc.png\n`);
		});
	});

	test("a failed file upload reports the error without a fallback", async () => {
		await withFiles({ "logo.png": "logo" }, async dir => {
			const path = join(dir, "logo.png");
			const { code, stdout, calls } = await run([path], {
				routes: { [`POST ${base64("logo")}`]: rejected(400, "Bad image") },
			});
			assert.equal(code, 1);
			assert.equal(stdout, `${path}\tERROR: Bad image\n`);
			assert.equal(calls.length, 1);
		});
	});

	test("finds images in subfolders, sorted by name, matching extensions in any case", async () => {
		const files = { "z.GIF": "z", "a.png": "a", "m/c.jpg": "c", "m/deep/d.webp": "d" };
		await withFiles(files, async dir => {
			const routes = Object.fromEntries(
				Object.values(files).map(contents => [
					`POST ${base64(contents)}`,
					uploaded(`https://i.imgur.com/${contents}.png`),
				]),
			);
			const { code, stdout } = await run([dir], { routes });
			assert.equal(code, 0);
			assert.equal(
				stdout,
				[
					`${join(dir, "a.png")}\thttps://i.imgur.com/a.png`,
					`${join(dir, "m/c.jpg")}\thttps://i.imgur.com/c.png`,
					`${join(dir, "m/deep/d.webp")}\thttps://i.imgur.com/d.png`,
					`${join(dir, "z.GIF")}\thttps://i.imgur.com/z.png`,
					"",
				].join("\n"),
			);
		});
	});

	// Mixed case because filesystems tend to list in byte order, which puts "B" before "a".
	test("sorts by locale rather than keeping the filesystem's order", async () => {
		const names = ["B.png", "a.png", "D.png", "c.png"];
		const files = Object.fromEntries(names.map(name => [name, name]));
		await withFiles(files, async dir => {
			const routes = Object.fromEntries(names.map(name => [`POST ${base64(name)}`, uploaded()]));
			const { stdout } = await run([dir], { routes });
			assert.deepEqual(
				stdout.trimEnd().split("\n").map(line => line.split("\t")[0]),
				["a.png", "B.png", "c.png", "D.png"].map(name => join(dir, name)),
			);
		});
	});

	test("skips non-images, hidden files and folders, and symlinks", async () => {
		const files = {
			"keep.png": "keep",
			"notes.txt": "notes",
			"no-extension": "none",
			".hidden.png": "hidden",
			".git/inside.png": "inside",
		};
		await withFiles(files, async dir => {
			await symlink(join(dir, "keep.png"), join(dir, "link.png"));
			await symlink(join(dir, ".git"), join(dir, "linked-folder"));

			const { stdout, calls } = await run([dir], {
				routes: { [`POST ${base64("keep")}`]: uploaded() },
			});
			assert.equal(stdout, `${join(dir, "keep.png")}\thttps://i.imgur.com/abc.png\n`);
			assert.equal(calls.length, 1);
		});
	});

	test("a folder with no images is a failed upload", async () => {
		await withFiles({ "notes.txt": "notes" }, async dir => {
			const { code, stdout, calls } = await run([dir]);
			assert.equal(code, 1);
			assert.equal(stdout, `${dir}\tERROR: no images found in folder\n`);
			assert.equal(calls.length, 0);
		});
	});

	test("keeps argument order across URLs, folders and files", async () => {
		await withFiles({ "photos/a.png": "a", "photos/b.png": "b", "logo.png": "logo" }, async dir => {
			const routes = {
				[`POST ${IMAGE_URL}`]: uploaded("https://i.imgur.com/url.png"),
				[`POST ${base64("a")}`]: uploaded("https://i.imgur.com/a.png"),
				[`POST ${base64("b")}`]: uploaded("https://i.imgur.com/b.png"),
				[`POST ${base64("logo")}`]: uploaded("https://i.imgur.com/logo.png"),
			};
			const { stdout } = await run([join(dir, "logo.png"), IMAGE_URL, join(dir, "photos")], { routes });
			assert.equal(
				stdout,
				[
					`${join(dir, "logo.png")}\thttps://i.imgur.com/logo.png`,
					`${IMAGE_URL}\thttps://i.imgur.com/url.png`,
					`${join(dir, "photos/a.png")}\thttps://i.imgur.com/a.png`,
					`${join(dir, "photos/b.png")}\thttps://i.imgur.com/b.png`,
					"",
				].join("\n"),
			);
		});
	});
});

describe("demo", () => {
	const input = "https://example.com/photos/cat.jpeg?w=100&s=2";

	test("prints the input file name and the Imgur link", async () => {
		const { code, stdout } = await run([input], {
			script: DEMO,
			routes: { [`POST ${input}`]: uploaded("https://i.imgur.com/TtaUiZf.jpeg") },
		});
		assert.equal(code, 0);
		assert.equal(stdout, "input file: cat.jpeg\noutput url: https://i.imgur.com/TtaUiZf.jpeg\n");
	});

	test("prints the whole input when it has no file name", async () => {
		const noName = "https://example.com/image";
		const { stdout } = await run([noName], {
			script: DEMO,
			routes: { [`POST ${noName}`]: uploaded() },
		});
		assert.match(stdout, /^input file: https:\/\/example\.com\/image\n/);
	});

	test("fails when the link doesn't look like an Imgur image link", async () => {
		for (const link of ["https://example.com/abc.png", "https://i.imgur.com/abc"]) {
			const { code, stdout } = await run([input], {
				script: DEMO,
				routes: { [`POST ${input}`]: uploaded(link) },
			});
			assert.equal(code, 1);
			assert.equal(stdout, `input file: cat.jpeg\nFAIL: not an Imgur image link: ${link}\n`);
		}
	});

	test("fails when the upload fails", async () => {
		const { code, stdout } = await run([input], {
			script: DEMO,
			routes: { [`POST ${input}`]: rejected(429, "Too many requests") },
		});
		assert.equal(code, 1);
		assert.equal(stdout, "input file: cat.jpeg\nFAIL: Too many requests\n");
	});

	test("fails when the CLI rejects its arguments", async () => {
		const { code, stderr } = await run(["--nope"], { script: DEMO });
		assert.equal(code, 1);
		assert.match(stderr, /Unknown option: --nope/);
	});
});

describe("multiple inputs", () => {
	const good = "https://example.com/good.png";
	const bad = "https://example.com/bad.png";
	const partialFailure = {
		[`POST ${good}`]: uploaded("https://i.imgur.com/good.png"),
		[`POST ${bad}`]: rejected(429, "Too many requests"),
	};

	test("a failure doesn't stop the others, and exits 1", async () => {
		const { code, stdout } = await run([bad, good], { routes: partialFailure });
		assert.equal(code, 1);
		assert.equal(stdout, `${bad}\tERROR: Too many requests\n${good}\thttps://i.imgur.com/good.png\n`);
	});

	test("--json reports an imgur or error field for each input, and exits 1", async () => {
		const { code, stdout } = await run(["--json", good, bad], { routes: partialFailure });
		assert.equal(code, 1);
		assert.deepEqual(JSON.parse(stdout), [
			{ input: good, imgur: "https://i.imgur.com/good.png" },
			{ input: bad, error: "Too many requests" },
		]);
	});

	test("results keep input order when uploads finish out of order", async () => {
		const routes = {
			"POST https://example.com/slow.png": { ...uploaded("https://i.imgur.com/slow.png"), delay: 150 },
			"POST https://example.com/fast.png": uploaded("https://i.imgur.com/fast.png"),
		};
		const { stdout } = await run(["https://example.com/slow.png", "https://example.com/fast.png"], { routes });
		assert.equal(
			stdout,
			"https://example.com/slow.png\thttps://i.imgur.com/slow.png\n" +
				"https://example.com/fast.png\thttps://i.imgur.com/fast.png\n",
		);
	});

	test("uploads at most 4 at a time, and uploads every input", async () => {
		const urls = Array.from({ length: 10 }, (_, index) => `https://example.com/${index}.png`);
		const routes = Object.fromEntries(urls.map(url => [`POST ${url}`, { ...uploaded(), delay: 25 }]));
		const { code, stdout, calls } = await run(urls, { routes });
		assert.equal(code, 0);
		assert.equal(stdout.trimEnd().split("\n").length, urls.length);
		assert.equal(calls.length, urls.length);
		assert.equal(Math.max(...calls.map(call => call.inFlight)), 4);
	});
});
