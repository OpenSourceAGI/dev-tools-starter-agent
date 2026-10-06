/**
 * @file AskAIButton.tsx
 * @description The trigger: a dropdown button for a docs page header, or a
 * floating action button pinned to a corner. Both open the same AskAIPanel.
 */
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { copyPendingText, fetchMarkdown } from "./clipboard";
import {
  AskAIPanel,
  CopyIcon,
  SparkleIcon,
  type AskAIPanelProps,
} from "./AskAIPanel";
import { toAbsoluteUrl } from "./prompt";
import { useAskAIStyles } from "./styles";

export interface AskAIButtonProps extends Omit<
  AskAIPanelProps,
  "inline" | "alignClassName"
> {
  /** `dropdown` (default) sits inline; `fab` floats in a corner of the viewport. */
  variant?: "dropdown" | "fab";
  /** Trigger text. Default "Ask AI". The FAB shows only its icon when set to `null`. */
  label?: ReactNode;
  /** Trigger icon. Defaults to a sparkle. */
  icon?: ReactNode;
  /** Dropdown only: which edge of the trigger the panel lines up with. Default `start`. */
  align?: "start" | "end";
  /** FAB only: which corner it sits in. Default `bottom-right`. */
  position?: "bottom-right" | "bottom-left";
  /** Start open (uncontrolled). */
  defaultOpen?: boolean;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Class for the trigger button. */
  triggerClassName?: string;
  /** Class for the panel. */
  panelClassName?: string;
}

function ChevronDown() {
  return (
    <svg
      className="aai-chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function AskAIButton({
  variant = "dropdown",
  label = "Ask AI",
  icon = <SparkleIcon />,
  align = "start",
  position = "bottom-right",
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  triggerClassName,
  panelClassName,
  className,
  injectStyles = true,
  ...panelProps
}: AskAIButtonProps) {
  useAskAIStyles(injectStyles);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  const isFab = variant === "fab";
  const rootClasses = [
    "aai-root",
    isFab && "aai-fab-root",
    isFab && `aai-pos-${position}`,
    open && "aai-open",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={rootRef} className={rootClasses}>
      <button
        ref={triggerRef}
        type="button"
        className={[isFab ? "aai-fab" : "aai-btn", triggerClassName]
          .filter(Boolean)
          .join(" ")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label === null ? "Ask AI" : undefined}
        onClick={() => setOpen(!open)}
      >
        {icon}
        {label}
        {!isFab && <ChevronDown />}
      </button>
      {open && (
        <AskAIPanel
          {...panelProps}
          injectStyles={false}
          autoFocus={panelProps.autoFocus ?? true}
          className={panelClassName}
          alignClassName={isFab ? undefined : `aai-align-${align}`}
        />
      )}
    </div>
  );
}

export interface CopyPageButtonProps {
  /** URL of the page's raw Markdown/MDX. */
  markdownUrl: string;
  /** Button text. Default "Copy page". */
  label?: ReactNode;
  className?: string;
  injectStyles?: boolean;
}

/** One-click "copy this page as Markdown" — the old LLMCopyButton. */
export function CopyPageButton({
  markdownUrl,
  label = "Copy page",
  className,
  injectStyles = true,
}: CopyPageButtonProps) {
  useAskAIStyles(injectStyles);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(
    "idle",
  );

  useEffect(() => {
    if (state !== "done" && state !== "error") return;
    const timer = setTimeout(() => setState("idle"), 1500);
    return () => clearTimeout(timer);
  }, [state]);

  const onClick = async () => {
    setState("busy");
    try {
      const ok = await copyPendingText(
        fetchMarkdown(toAbsoluteUrl(markdownUrl)),
      );
      setState(ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <span className="aai-root">
      <button
        type="button"
        className={["aai-btn", className].filter(Boolean).join(" ")}
        disabled={state === "busy"}
        onClick={() => void onClick()}
      >
        {state === "done" ? <CheckIcon /> : <CopyIcon />}
        {state === "done"
          ? "Copied"
          : state === "error"
            ? "Copy failed"
            : label}
      </button>
    </span>
  );
}

function CheckIcon() {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
