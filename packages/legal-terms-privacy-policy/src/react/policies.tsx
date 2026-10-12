'use client';

import React from 'react';
import LegalTermsPrivacyPolicy, { type LegalTermsPrivacyPolicyProps } from './LegalTermsPrivacyPolicy';

/** Props for the single-policy pages: everything except `document`. */
export type PolicyPageProps = Omit<LegalTermsPrivacyPolicyProps, 'document'>;

/**
 * Just the Terms of Service — the combined page with `document="terms"`.
 *
 * @example
 * ```tsx
 * <TermsOfService appName="QwkSearch" contactEmail="legal@qwksearch.com" />
 * ```
 */
export function TermsOfService(props: PolicyPageProps) {
  return <LegalTermsPrivacyPolicy {...props} document="terms" />;
}

/** Just the Privacy Policy — the combined page with `document="privacy"`. */
export function PrivacyPolicy(props: PolicyPageProps) {
  return <LegalTermsPrivacyPolicy {...props} document="privacy" />;
}

/**
 * A Security Policy modeled on a `SECURITY.md`: supported versions, how to
 * report a vulnerability (to `securityEmail`, defaulting to `contactEmail`),
 * the disclosure process, scope and safe harbor.
 */
export function SecurityPolicy(props: PolicyPageProps) {
  return <LegalTermsPrivacyPolicy {...props} document="security" />;
}
