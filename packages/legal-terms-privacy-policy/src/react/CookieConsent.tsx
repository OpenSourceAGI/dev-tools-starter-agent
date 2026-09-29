'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentChoice,
  type CookieConsentRecord,
} from '../cookie-consent';

/** A link in the row under the banner copy — usually the policy pages. */
export interface CookieConsentLink {
  url: string;
  text: string;
}

export interface CookieConsentProps {
  /** Product name, named in the default copy. */
  appName: string;
  /**
   * Links shown under the copy. Point at least one at the page rendering
   * {@link LegalTermsPrivacyPolicy} — a banner that asks for consent without
   * linking the policy is not asking for informed consent.
   */
  links?: CookieConsentLink[];
  /** Banner heading. Defaults to "Cookies & Privacy". */
  title?: string;
  /** Body copy. Defaults to a sentence naming `appName`. */
  message?: React.ReactNode;
  /** Label on the accept-everything button. Defaults to "Accept All". */
  acceptLabel?: string;
  /** Label on the essential-only button. Defaults to "Reject". */
  rejectLabel?: string;
  /** `localStorage` key holding the decision. Defaults to `cookie-consent`. */
  storageKey?: string;
  /**
   * Show the dismiss (×) button, which hides the banner for this page view
   * without recording a decision. Defaults to `true`.
   */
  dismissible?: boolean;
  /**
   * Publish the banner's height (plus its margin) into this CSS custom
   * property on `<html>` while it is up, and remove it once it is gone. Other
   * chrome anchored to the same corner can then read the property and sit
   * above the banner instead of underneath it.
   */
  heightVar?: string;
  /** Called with the stored record when the visitor accepts or rejects. */
  onDecision?: (record: CookieConsentRecord) => void;
  /** Extra classes on the fixed wrapper, for sites that reposition it. */
  className?: string;
}

/** A no-op the effect can return, so every branch cleans up the same way. */
const noop = () => {};

/**
 * The cookie consent banner: one corner card stating what the app stores, the
 * links to read the detail, and the two answers.
 *
 * It shows only when no decision is on record, so once a visitor has answered
 * it stays gone. The check runs in an effect, which keeps the banner out of
 * pre-rendered HTML — a cached page would otherwise show it to someone who
 * already answered.
 *
 * @example
 * ```tsx
 * <CookieConsent
 *   appName="QwkSearch"
 *   links={[{ url: '/legal/privacy', text: 'Privacy' }]}
 *   heightVar="--app-bottom-right-inset"
 * />
 * ```
 */
export default function CookieConsent({
  appName,
  links = [],
  title = 'Cookies & Privacy',
  message,
  acceptLabel = 'Accept All',
  rejectLabel = 'Reject',
  storageKey = COOKIE_CONSENT_STORAGE_KEY,
  dismissible = true,
  heightVar,
  onDecision,
  className,
}: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!readCookieConsent(storageKey)) setIsVisible(true);
  }, [storageKey]);

  // The height is measured rather than assumed: the copy wraps to a different
  // number of lines at different widths, and chrome offset by the wrong number
  // overlaps the buttons.
  useEffect(() => {
    const card = cardRef.current;
    if (!heightVar || !isVisible || !card) return noop;

    const root = document.documentElement;
    const sync = () =>
      root.style.setProperty(heightVar, `${Math.ceil(card.getBoundingClientRect().height) + 16}px`);

    sync();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync);
    observer?.observe(card);

    return () => {
      observer?.disconnect();
      root.style.removeProperty(heightVar);
    };
  }, [heightVar, isVisible]);

  const decide = (choice: CookieConsentChoice) => () => {
    // Recorded first, then reported: `onDecision?.(write(...))` would skip the
    // write entirely whenever no handler is passed, since an optional call
    // does not evaluate its arguments.
    const record = writeCookieConsent(choice, storageKey);
    onDecision?.(record);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-0 right-0 z-50 m-4 max-w-sm ${className ?? ''}`}>
      <div
        ref={cardRef}
        role="region"
        aria-label={title}
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="mb-2 text-sm font-semibold">{title}</h3>
            <p className="mb-3 text-xs opacity-70">
              {message ??
                `${appName} uses cookies to run the service, measure how it is used, and improve it. We respect your privacy and use only essential cookies by default.`}
            </p>
            {links.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                {links.map((link) => {
                  const external = !link.url.startsWith('/');
                  return (
                    <a
                      key={link.url}
                      href={link.url}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {link.text}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
          {dismissible ? (
            <button
              type="button"
              onClick={() => setIsVisible(false)}
              aria-label="Close"
              className="shrink-0 opacity-50 transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={decide('all')}
            className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {acceptLabel}
          </button>
          <button
            type="button"
            onClick={decide('essential')}
            className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            {rejectLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export { CookieConsent };
