import type { Section } from '../types';

/**
 * The long-form Security Policy, modeled on a repository `SECURITY.md`:
 * supported versions, how to report a vulnerability, the disclosure process,
 * scope and safe harbor.
 *
 * Ids are prefixed `security-policy-` so they never collide with the Privacy
 * Policy's own `security` (Data Security and Retention) section when both
 * render on one page.
 */
export const SECURITY_FULL_SECTIONS: Section[] = [
  {
    id: 'security-policy-overview',
    title: 'Security Policy',
    icon: 'Shield',
    accent: 'indigo',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'p',
        text: '{{appName}} takes the security of our Services and of our users\' data seriously. This Security Policy explains which versions of {{appName}} receive security updates, how to report a suspected vulnerability to us, and what you can expect from us after you do.',
      },
      {
        type: 'p',
        text: 'We welcome reports from security researchers, customers and anyone else who believes they have found a security issue in our Services. Responsible disclosure helps us protect everyone who relies on {{appName}}.',
      },
    ],
  },
  {
    id: 'security-policy-supported-versions',
    title: 'Supported Versions',
    icon: 'CheckCircle',
    accent: 'emerald',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'p',
        text: 'Security updates are provided for the versions of {{appName}} listed below. If you are running an unsupported version, please upgrade before reporting an issue, as it may already be fixed.',
      },
      {
        type: 'ul',
        items: [
          '{{supportedVersions}}: supported, receives security fixes.',
          'All earlier versions: not supported, please upgrade.',
        ],
      },
    ],
  },
  {
    id: 'security-policy-reporting',
    title: 'Reporting a Vulnerability',
    icon: 'Mail',
    accent: 'rose',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'p',
        text: 'Please do not report security vulnerabilities through public issues, forums, social media or other public channels. Instead, email a report to {{securityEmail}}. If possible, encrypt sensitive details or ask us for a secure channel before sending them.',
      },
      {
        type: 'ul',
        lead: 'To help us triage your report quickly, please include as much of the following as you can:',
        items: [
          'The type of issue (for example injection, cross-site scripting, authentication bypass or data exposure).',
          'The product, version, URL or component affected.',
          'Step-by-step instructions to reproduce the issue.',
          'Proof-of-concept or exploit code, if available.',
          'The impact of the issue, including how an attacker might exploit it.',
          'Your name or handle and how to reach you, if you would like to be credited.',
        ],
      },
    ],
  },
  {
    id: 'security-policy-disclosure',
    title: 'Disclosure Process',
    icon: 'Clock',
    accent: 'amber',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'p',
        text: 'We follow a coordinated disclosure process. After you submit a report:',
      },
      {
        type: 'ol',
        items: [
          'We will acknowledge receipt of your report within {{securityResponseDays}} business days.',
          'We will investigate, confirm whether the issue is a vulnerability, and assess its severity.',
          'We will keep you informed of our progress and may ask you for additional information.',
          'We will develop, test and release a fix, prioritized according to severity.',
          'Once a fix is available, we will publicly disclose the issue and, with your permission, credit you for the discovery.',
        ],
      },
      {
        type: 'p',
        text: 'We ask that you give us a reasonable period, typically up to {{disclosureDays}} days from your report, to remediate the issue before you disclose it publicly or to any third party.',
      },
    ],
  },
  {
    id: 'security-policy-scope',
    title: 'Scope',
    icon: 'Target',
    accent: 'blue',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'p',
        text: 'This policy covers the Services operated by {{companyName}}, including our websites, applications and APIs. The following are out of scope:',
      },
      {
        type: 'ul',
        items: [
          'Denial-of-service attacks or tests that degrade the Services for other users.',
          'Social engineering or phishing of our employees, contractors or users.',
          'Physical attacks against our offices, data centers or equipment.',
          'Vulnerabilities in third-party services or platforms we do not control.',
          'Reports from automated scanners without a demonstrated security impact.',
          'Missing best-practice configurations without a demonstrated security impact.',
        ],
      },
    ],
  },
  {
    id: 'security-policy-safe-harbor',
    title: 'Safe Harbor',
    icon: 'Scale',
    accent: 'teal',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'p',
        text: 'We will not pursue legal action against, or ask law enforcement to investigate, researchers who discover and report vulnerabilities in good faith and in accordance with this policy. To qualify, you must:',
      },
      {
        type: 'ul',
        items: [
          'Make a good-faith effort to avoid privacy violations, destruction of data, and interruption or degradation of the Services.',
          'Only interact with accounts you own or have the explicit permission of the account holder to access.',
          'Not exploit a vulnerability beyond what is necessary to demonstrate it, and not access, modify or retain other users\' data.',
          'Give us a reasonable time to fix the issue before disclosing it, as described above.',
        ],
      },
    ],
  },
  {
    id: 'security-policy-contact',
    title: 'Security Contact',
    icon: 'Mail',
    accent: 'slate',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'p',
        text: 'Report security vulnerabilities to {{securityEmail}}. For questions about our other policies, contact us at {{contactEmail}}.',
      },
    ],
  },
];

/** The scannable card version of {@link SECURITY_FULL_SECTIONS}. */
export const SECURITY_SUMMARY_SECTIONS: Section[] = [
  {
    id: 'security-policy-overview',
    title: 'Security Policy',
    icon: 'Shield',
    accent: 'indigo',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'p',
        text: '{{appName}} takes security seriously. Here is which versions we support, how to report a vulnerability, and what happens after you do.',
      },
    ],
  },
  {
    id: 'security-policy-supported-versions',
    title: 'Supported Versions',
    icon: 'CheckCircle',
    accent: 'emerald',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'cards',
        columns: 2,
        items: [
          { title: '{{supportedVersions}}', text: 'Supported, receives security fixes.', icon: 'CheckCircle' },
          { title: 'Earlier versions', text: 'Not supported, please upgrade.', icon: 'XCircle' },
        ],
      },
    ],
  },
  {
    id: 'security-policy-reporting',
    title: 'Reporting a Vulnerability',
    icon: 'Mail',
    accent: 'rose',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'p',
        text: 'Email {{securityEmail}}. Please do not open a public issue or post about it publicly.',
      },
      {
        type: 'note',
        title: 'Include in your report',
        icon: 'FileText',
        items: [
          'Type of issue and affected component or version',
          'Steps to reproduce, and proof-of-concept if available',
          'Impact and how an attacker might exploit it',
          'How to reach you, and whether you would like credit',
        ],
      },
    ],
  },
  {
    id: 'security-policy-disclosure',
    title: 'Disclosure Process',
    icon: 'Clock',
    accent: 'amber',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'cards',
        columns: 4,
        center: true,
        items: [
          { title: 'Acknowledge', text: 'Within {{securityResponseDays}} business days.', icon: 'Mail' },
          { title: 'Investigate', text: 'Confirm the issue and assess severity.', icon: 'Search' },
          { title: 'Fix', text: 'Develop, test and release a fix.', icon: 'Wrench' },
          { title: 'Disclose', text: 'Publish the issue and credit you, with permission.', icon: 'Megaphone' },
        ],
      },
      {
        type: 'p',
        text: 'Please allow up to {{disclosureDays}} days for a fix before disclosing publicly.',
      },
    ],
  },
  {
    id: 'security-policy-safe-harbor',
    title: 'Safe Harbor',
    icon: 'Scale',
    accent: 'teal',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'p',
        text: 'Good-faith research that follows this policy will not face legal action from us. Avoid privacy violations, data destruction and service disruption, test only accounts you own, and give us time to fix the issue. Denial-of-service, social engineering and third-party services are out of scope.',
      },
    ],
  },
  {
    id: 'security-policy-contact',
    title: 'Security Contact',
    icon: 'Mail',
    accent: 'slate',
    part: 'core',
    documents: ['security'],
    blocks: [
      {
        type: 'cards',
        columns: 2,
        items: [
          { title: 'Security reports', text: '{{securityEmail}}', icon: 'Shield' },
          { title: 'Other questions', text: '{{contactEmail}}', icon: 'Mail' },
        ],
      },
    ],
  },
];
