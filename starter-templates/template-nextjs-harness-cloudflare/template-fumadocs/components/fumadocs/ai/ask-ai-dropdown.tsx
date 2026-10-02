/**
 * @file ask-ai-dropdown.tsx
 * @description Dropdown component providing links to various AI providers for page interaction.
 */
"use client";

import React, { useMemo } from "react";
import { ChevronDown, ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger as PopoverTriggerBase,
} from "fumadocs-ui/components/ui/popover";
import { cva } from "class-variance-authority";
import { buttonVariants } from "../../ui/button";

const PopoverTrigger = PopoverTriggerBase as any;

const optionVariants = cva(
  "text-sm p-2 rounded-lg inline-flex items-center gap-2 hover:text-fd-accent-foreground hover:bg-fd-accent [&_svg]:size-4",
);

interface AIProvider {
  id: string;
  title: string;
  getHref: (params: { q: string; githubUrl?: string }) => string;
  icon?: React.ReactNode;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: "github",
    title: "Open in GitHub",
    getHref: ({ githubUrl }) => githubUrl || "",
    icon: (
      <svg fill="currentColor" role="img" viewBox="0 0 24 24">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
  {
    id: "qwksearch",
    title: "Ask QwkSearch",
    getHref: ({ q }) => `https://qwksearch.com/?q=${new URLSearchParams({ q })}`,
    icon: (
      <svg
        role="img"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="
    M10 1
    a9 9 0 1 0 0 18
    a9 9 0 0 0 0 -18
    z
    M10 3.7
    a6.3 6.3 0 1 1 0 12.6
    a6.3 6.3 0 0 1 0 -12.6
    z
  "
        />
        <path
          d="M15.5 15.5 L20.8 20.8"
          stroke="currentColor"
          strokeWidth="2.9"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M4.3 4.3 L1.5 1.5"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="1.1" cy="1.1" r="1.4" />
        <path
          d="M15.7 4.3 L18.5 1.5"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="18.9" cy="1.1" r="1.4" />
        <path
          d="M4.3 15.7 L1.5 18.5"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="1.1" cy="18.9" r="1.4" />
      </svg>
    ),
  },
  {
    id: "claude",
    title: "Ask Claude",
    getHref: ({ q }) => `https://claude.ai/new?${new URLSearchParams({ q })}`,
    icon: (
      <svg
        fill="currentColor"
        role="img"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
      </svg>
    ),
  },
  {
    id: "perplexity",
    title: "Ask Perplexity",
    getHref: ({ q }) =>
      `https://www.perplexity.ai/search?${new URLSearchParams({ q })}`,
    icon: (
      <svg
        role="img"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z" />
      </svg>
    ),
  },
  {
    id: "chatgpt",
    title: "Ask ChatGPT",
    getHref: ({ q }) =>
      `https://chatgpt.com/?${new URLSearchParams({ hints: "search", q })}`,
    icon: (
      <svg
        role="img"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
      </svg>
    ),
  },
  {
    id: "gemini",
    title: "Ask Gemini",
    getHref: ({ q }) =>
      `https://aistudio.google.com/prompts/new_chat?prompt=${encodeURIComponent(q)}`,
    icon: (
      <svg
        role="img"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" />
      </svg>
    ),
  },
  {
    id: "brave",
    title: "Ask Brave",
    getHref: ({ q }) =>
      `https://search.brave.com/ask?q=${encodeURIComponent(q)}`,
    icon: (
      <svg
        role="img"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g strokeWidth="0" />
        <g strokeLinecap="round" />
        <g>
          {" "}
          <g>
            {" "}
            <path
              d="m153.52 57.56 3.4-8.51s-4.33-4.72-9.58-10.08-16.34-2.2-16.34-2.2l-12.73-14.66H73.73L61.05 36.77S49.92 33.62 44.66 39s-9.58 10.08-9.58 10.08l3.4 8.51-4.33 12.6s12.73 49.11 14.23 55.11c2.93 11.82 4.94 16.38 13.29 22.37s23.51 16.38 26 18 5.57 4.26 8.35 4.26 5.88-2.68 8.35-4.26 17.63-12 26-18 10.36-10.55 13.29-22.37c1.5-6 14.23-55.14 14.23-55.14Z"
            ></path>{" "}
            <path
              d="M96.05 54.06a17.59 17.59 0 0 1 4.91 1c3 1 6.2 2.27 7.69 2.27s12.52-2.14 12.52-2.14 13.07 16.1 13.07 19.54-1.64 4.37-3.24 6.16l-9.86 10.61c-.93 1-2.86 2.52-1.72 5.26s2.81 6.23 1 9.76c-1.73 3.28-4.6 5.55-6.64 5.55a3.57 3.57 0 0 1-.47 0c-2-.39-6.85-3-8.61-4.12s-7.37-5.87-7.37-7.67 5.79-5 6.86-5.77 6-3.58 6-4.69.06-1.45-1.38-4.2-4-6.44-3.6-8.89 4.61-3.72 7.59-4.86 8.73-3.32 9.45-3.66.53-.65-1.64-.86c-1.5-.15-4.91-.59-7.79-.59a13.3 13.3 0 0 0-3.34.33c-2.78.79-7.53 2-7.91 2.63s-.73.66-.33 2.86 2.43 12.74 2.63 14.61.58 3.11-1.4 3.58A49.3 49.3 0 0 1 96 92a49.3 49.3 0 0 1-6.47-1.26c-2-.47-1.59-1.7-1.4-3.58s2.24-12.42 2.63-14.61.06-2.22-.33-2.86-5.13-1.84-7.91-2.63a13.3 13.3 0 0 0-3.34-.33c-2.88 0-6.29.44-7.79.59-2.17.21-2.36.53-1.64.86s6.46 2.51 9.45 3.66 7.16 2.42 7.59 4.86-2.16 6.13-3.6 8.89-1.48 3.08-1.38 4.2 5 4 6 4.69 6.86 4 6.86 5.77-5.6 6.5-7.37 7.67-6.57 3.73-8.61 4.12a3.57 3.57 0 0 1-.47 0c-2 0-4.91-2.27-6.64-5.55-1.86-3.53-.18-7 1-9.76s-.79-4.26-1.72-5.26l-9.81-10.58c-1.65-1.79-3.29-2.7-3.29-6.14s13.07-19.54 13.07-19.54 11 2.14 12.52 2.14 4.72-1.26 7.69-2.27a17.59 17.59 0 0 1 4.91-1h.1m0 55.68a39.56 39.56 0 0 1 8.53 3.41c3.49 1.84 6 3.14 6.83 3.66s.32 1.49-.42 2-10.64 8.35-11.6 9.21-2.39 2.29-3.39 2.29-2.37-1.42-3.34-2.29-10.87-8.68-11.6-9.21-1.23-1.5-.42-2 3.36-1.83 6.83-3.68a39.56 39.56 0 0 1 8.53-3.41m0-67.68h-.44a29.59 29.59 0 0 0-8.43 1.65c-.64.21-1.29.44-1.93.67s-1.65.58-2.38.81c-2.18-.35-6.32-1.11-9.75-1.77a11.84 11.84 0 0 0-2.29-.22 12 12 0 0 0-9.31 4.43c-.14.18-3.5 4.31-6.9 9-6.71 9.15-8.86 13.56-8.86 18.16a18.08 18.08 0 0 0 6 13.8c.16.15.32.31.48.49l3.58 3.87 3.87 4.19a19.91 19.91 0 0 0 1.33 15 24.49 24.49 0 0 0 7.64 8.75 14 14 0 0 0 5.3 7.64c1.13.85 9.41 7.39 10.74 8.51l.24.21c1.94 1.79 5.55 5.1 11.06 5.1s9.12-3.31 11.06-5.09l.24-.22c1.33-1.12 9.61-7.66 10.74-8.51a14 14 0 0 0 5.3-7.64 24.49 24.49 0 0 0 7.64-8.75 19.91 19.91 0 0 0 1.33-15l7.5-8.14c.16-.18.32-.34.48-.49a18.08 18.08 0 0 0 6-13.8c0-4.6-2.15-9-8.86-18.16-3.4-4.64-6.76-8.77-6.9-9a12 12 0 0 0-9.31-4.43 11.84 11.84 0 0 0-2.29.22c-3.43.66-7.57 1.42-9.75 1.77-.73-.23-1.67-.56-2.38-.81s-1.29-.46-1.93-.67a29.59 29.59 0 0 0-8.43-1.65Z"
            ></path>{" "}
          </g>{" "}
          <path
            d="M80.68 115.22 96 106v-9.16l-12.25-6.13 3.62-11.9a6.13 6.13 0 0 0-3.92-7.6L73 67.74m38.32 47.48L96 106v-9.16l12.25-6.13-3.62-11.9a6.13 6.13 0 0 1 3.92-7.6L119 67.74"
          ></path>{" "}
        </g>
      </svg>
    ),
  },
  {
    id: "cursor",
    title: "Ask Cursor",
    getHref: ({ q }) =>
      `https://cursor.com/link/prompt?text=${encodeURIComponent(q)}`,
    icon: (
      <svg
        role="img"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
      </svg>
    ),
  },
];

export type AIProviderID = (typeof AI_PROVIDERS)[number]["id"];

export function AskAIDropdown({
  markdownUrl,
  githubUrl,
  providers,
}: {
  /**
   * A URL to the raw Markdown/MDX content of page
   */
  markdownUrl: string;

  /**
   * Source file URL on GitHub
   */
  githubUrl?: string;

  /**
   * List of provider IDs to show (e.g. ['claude', 'chatgpt']),
   * or custom AIProvider objects, or a mix of both.
   * Defaults to all providers.
   */
  providers?: (AIProviderID | AIProvider)[];
}) {
  const items = useMemo(() => {
    const fullMarkdownUrl =
      typeof window !== "undefined"
        ? new URL(markdownUrl, window.location.origin)
        : "loading";
    const q = `Read ${fullMarkdownUrl}, I want to ask questions about it.`;

    const resolvedProviders: AIProvider[] = providers
      ? providers
        .map((p) =>
          typeof p === "string" ? AI_PROVIDERS.find((ap) => ap.id === p)! : p,
        )
        .filter(Boolean)
      : AI_PROVIDERS;

    return resolvedProviders
      .map((provider) => {
        if (provider.id === "github" && !githubUrl) return null;

        const href = provider.getHref({ q, githubUrl });
        const icon =
          provider.icon ??
          (href ? (
            <img
              src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${encodeURIComponent(new URL(href).origin)}`}
              alt=""
              className="size-4"
            />
          ) : null);

        return {
          id: provider.id,
          title: provider.title,
          href,
          icon,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [githubUrl, markdownUrl, providers]);

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({
            size: "sm",
            className: "gap-2",
          }),
        )}
      >
        {items.find((p) => p.id !== "github")?.icon}
        Ask AI
        <ChevronDown className="size-3.5 text-fd-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col overflow-auto !w-48 !min-w-0 !p-1">
        {items.map((item, index) => (
          <React.Fragment key={item.href}>
            <a
              href={item.href}
              rel="noreferrer noopener"
              target="_blank"
              className={cn(optionVariants())}
            >
              {item.icon}
              {item.title}
              <ExternalLinkIcon className="text-fd-muted-foreground size-3.5 ms-auto" />
            </a>
            {index === 0 && <hr className="my-1 border-fd-border" />}
          </React.Fragment>
        ))}
      </PopoverContent>
    </Popover>
  );
}
