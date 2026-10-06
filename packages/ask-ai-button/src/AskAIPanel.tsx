/**
 * @file AskAIPanel.tsx
 * @description The panel itself: a message box, a link/content toggle, the
 * provider list and copy actions. Rendered inside the dropdown and the floating
 * button, or on its own with `inline`.
 */
"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { copyText, fetchMarkdown } from "./clipboard";
import { GitHubIcon } from "./icons";
import {
  buildPrompt,
  DEFAULT_MAX_URL_LENGTH,
  faviconFor,
  resolveProviderTarget,
  toAbsoluteUrl,
} from "./prompt";
import { resolveProviders, type ProviderOption } from "./providers";
import { useAskAIStyles } from "./styles";
import type { AIProvider, PageContext, PromptInput, PromptMode } from "./types";

export interface AskAIPanelProps {
  /** URL of the page's raw Markdown/MDX (e.g. `${page.url}.mdx`). Relative is fine. */
  markdownUrl?: string;
  /** URL of the page. Defaults to `window.location.href`. */
  pageUrl?: string;
  /** Page title, named in the prompt. */
  title?: string;
  /** Source file on GitHub; adds an "Open in GitHub" action. */
  githubUrl?: string;
  /** Provider IDs and/or custom providers, in display order. Defaults to all built-ins. */
  providers?: ProviderOption[];
  /** Starting prompt mode. Defaults to `link` when `markdownUrl` is set, else `content`. */
  defaultMode?: PromptMode;
  /** Show the link/content toggle. Default `true`. */
  showModeToggle?: boolean;
  /**
   * Where `content` mode gets the page text. Defaults to fetching
   * `markdownUrl`, or reading the page's `<article>`/`<main>` text without one.
   */
  getContent?: () => string | Promise<string>;
  /** Replace the built-in prompt wording. */
  promptTemplate?: (input: PromptInput) => string;
  /** Longest provider URL before falling back to the link prompt. Default 8000. */
  maxUrlLength?: number;
  /** Placeholder for the message box. */
  placeholder?: string;
  /** Heading above the message box. Pass `null` to hide it. */
  heading?: ReactNode;
  /** Called whenever a prompt is sent to a provider — handy for analytics. */
  onSend?: (event: {
    provider: AIProvider;
    prompt: string;
    href?: string;
  }) => void;
  /** Focus the message box on mount. */
  autoFocus?: boolean;
  /** Render in normal flow instead of as a floating popover. */
  inline?: boolean;
  /** Inject the bundled stylesheet. Default `true`. */
  injectStyles?: boolean;
  className?: string;
  /** Internal: popover alignment class. */
  alignClassName?: string;
}

type LoadState = "idle" | "loading" | "ready" | "error";
type Status = { text: string; tone?: "error" } | null;

/** Visible text of the page's main content, for `content` mode without Markdown. */
function readPageText(): string {
  if (typeof document === "undefined") return "";
  const node =
    document.querySelector("article") ??
    document.querySelector("main") ??
    document.body;
  return (node as HTMLElement).innerText ?? node.textContent ?? "";
}

function ProviderIcon({
  provider,
  href,
}: {
  provider: AIProvider;
  href?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (provider.icon !== undefined) return <>{provider.icon}</>;
  const favicon = href ? faviconFor(href) : undefined;
  if (favicon && !failed) {
    return (
      <img
        src={favicon}
        alt=""
        className="aai-favicon"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="aai-favicon aai-letter" aria-hidden="true">
      {provider.title.charAt(0)}
    </span>
  );
}

export function AskAIPanel({
  markdownUrl,
  pageUrl,
  title,
  githubUrl,
  providers,
  defaultMode,
  showModeToggle = true,
  getContent,
  promptTemplate = buildPrompt,
  maxUrlLength = DEFAULT_MAX_URL_LENGTH,
  placeholder = "Ask a question about this page…",
  heading = "Ask AI about this page",
  onSend,
  autoFocus,
  inline,
  injectStyles = true,
  className,
  alignClassName,
}: AskAIPanelProps) {
  useAskAIStyles(injectStyles);
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<PromptMode>(
    defaultMode ?? (markdownUrl ? "link" : "content"),
  );
  const [content, setContent] = useState<string>();
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [status, setStatus] = useState<Status>(null);

  const items = useMemo(() => resolveProviders(providers), [providers]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const loadContent = useCallback(async (): Promise<string | undefined> => {
    if (content !== undefined) return content;
    setLoadState("loading");
    try {
      const text = getContent
        ? await getContent()
        : markdownUrl
          ? await fetchMarkdown(toAbsoluteUrl(markdownUrl))
          : readPageText();
      setContent(text);
      setLoadState("ready");
      return text;
    } catch {
      setLoadState("error");
      setStatus({
        text: "Couldn't load the page text — sending a link instead.",
        tone: "error",
      });
      return undefined;
    }
  }, [content, getContent, markdownUrl]);

  // Prefetch as soon as content mode is chosen, so a provider click can open
  // its tab synchronously (popup blockers drop window.open after an await).
  useEffect(() => {
    if (mode === "content" && loadState === "idle") void loadContent();
  }, [mode, loadState, loadContent]);

  const page = useCallback((): PageContext => {
    const absolutePage = toAbsoluteUrl(
      pageUrl ?? (typeof window !== "undefined" ? window.location.href : ""),
    );
    return {
      pageUrl: absolutePage,
      markdownUrl: markdownUrl ? toAbsoluteUrl(markdownUrl) : undefined,
      title,
      githubUrl,
    };
  }, [pageUrl, markdownUrl, title, githubUrl]);

  const prompts = useCallback(() => {
    const ctx = page();
    const linkPrompt = promptTemplate({ ...ctx, message, mode: "link" });
    const fullPrompt =
      mode === "content" && content
        ? promptTemplate({ ...ctx, message, mode: "content", content })
        : linkPrompt;
    return { ctx, linkPrompt, fullPrompt };
  }, [page, promptTemplate, message, mode, content]);

  const send = useCallback(
    async (provider: AIProvider) => {
      const { ctx, linkPrompt, fullPrompt } = prompts();
      if (provider.onSelect) {
        onSend?.({ provider, prompt: fullPrompt });
        try {
          await provider.onSelect(fullPrompt, ctx);
          setStatus({ text: `Sent to ${provider.title}.` });
        } catch {
          setStatus({
            text: `${provider.title} failed to receive the prompt.`,
            tone: "error",
          });
        }
        return;
      }
      const target = resolveProviderTarget(
        provider,
        fullPrompt,
        linkPrompt,
        ctx,
        maxUrlLength,
      );
      if (!target.href) return;
      window.open(target.href, "_blank", "noopener,noreferrer");
      onSend?.({ provider, prompt: fullPrompt, href: target.href });
      if (target.shortened) {
        const copied = await copyText(fullPrompt);
        setStatus({
          text: copied
            ? `Page too long for a link — sent a link, and the full prompt is on your clipboard to paste into ${provider.title}.`
            : `Page too long for a link — sent a link to ${provider.title} instead.`,
        });
      } else {
        setStatus(null);
      }
    },
    [prompts, onSend, maxUrlLength],
  );

  const copyPrompt = useCallback(async () => {
    const { fullPrompt } = prompts();
    const ok = await copyText(fullPrompt);
    setStatus(
      ok
        ? { text: "Prompt copied." }
        : { text: "Couldn't copy.", tone: "error" },
    );
  }, [prompts]);

  const copyPage = useCallback(async () => {
    const text = await loadContent();
    if (text === undefined) return;
    const ok = await copyText(text);
    setStatus(
      ok
        ? { text: "Page copied as Markdown." }
        : { text: "Couldn't copy.", tone: "error" },
    );
  }, [loadContent]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && items[0]) {
      event.preventDefault();
      void send(items[0]);
    }
  };

  const waiting = mode === "content" && loadState === "loading";
  const classes = [
    "aai-panel",
    inline && "aai-root aai-inline",
    alignClassName,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="dialog" aria-label="Ask AI">
      {heading !== null && (
        <div className="aai-heading">
          <label htmlFor={inputId}>{heading}</label>
          {title && <small title={title}>{title}</small>}
        </div>
      )}
      <textarea
        id={inputId}
        ref={inputRef}
        className="aai-input"
        value={message}
        placeholder={placeholder}
        aria-label={heading === null ? "Message" : undefined}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={onKeyDown}
      />
      {showModeToggle && (
        <div className="aai-modes" role="group" aria-label="What to send">
          <button
            type="button"
            className="aai-mode"
            aria-pressed={mode === "link"}
            onClick={() => setMode("link")}
          >
            Link to page
          </button>
          <button
            type="button"
            className="aai-mode"
            aria-pressed={mode === "content"}
            onClick={() => setMode("content")}
          >
            Include page text
          </button>
        </div>
      )}
      <div className="aai-label">Send to</div>
      <div className="aai-providers">
        {items.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className="aai-provider"
            disabled={waiting}
            data-provider={provider.id}
            onClick={() => void send(provider)}
          >
            <ProviderIcon
              provider={provider}
              href={provider.getHref?.("", page())}
            />
            <span>{provider.title}</span>
          </button>
        ))}
      </div>
      <div className="aai-actions">
        <button
          type="button"
          className="aai-btn"
          onClick={() => void copyPrompt()}
          disabled={waiting}
        >
          <CopyIcon /> Copy prompt
        </button>
        <button
          type="button"
          className="aai-btn"
          onClick={() => void copyPage()}
        >
          <CopyIcon /> Copy page
        </button>
        {githubUrl && (
          <a
            className="aai-btn"
            href={githubUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            <GitHubIcon /> GitHub
          </a>
        )}
      </div>
      <div
        className="aai-status"
        role="status"
        aria-live="polite"
        data-tone={status?.tone}
      >
        {waiting ? "Loading page…" : status?.text}
      </div>
    </div>
  );
}

export function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4M22 5h-4M4 17v2M5 18H3" />
    </svg>
  );
}
