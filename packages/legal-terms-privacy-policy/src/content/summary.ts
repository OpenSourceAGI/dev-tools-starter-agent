import type { Section } from '../types';

/**
 * The short, scannable presentation — the card-and-icon layout published at
 * rights.institute/terms-privacy, lifted verbatim and tokenized.
 *
 * This is a plain-language summary, not a substitute for {@link FULL_SECTIONS}:
 * ship both and let readers switch between them.
 */
export const SUMMARY_SECTIONS: Section[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    icon: 'BookOpen',
    accent: 'emerald',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: 'Welcome to {{appName}}, operated by {{companyName}}. These Terms of Service ("Terms") and Privacy Policy govern your use of our website, applications, and services (collectively, the "Services").',
      },
      {
        type: 'p',
        text: 'By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you disagree with any part of these terms, then you may not access the Services.',
      },
      {
        type: 'p',
        text: 'We are committed to protecting your privacy and ensuring transparency in how we collect, use, and protect your personal information. This document combines our Terms of Service and Privacy Policy to provide you with a comprehensive understanding of your rights and our responsibilities.',
      },
    ],
  },
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    icon: 'FileText',
    accent: 'blue',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: "By accessing and using {{appName}}, you accept and agree to be bound by the terms and provision of this agreement. Additionally, when using this website's particular services, you shall be subject to any posted guidelines or rules applicable to such services.",
      },
      {
        type: 'note',
        title: 'Legal Agreement',
        icon: 'Scale',
        items: [
          'You must be at least {{minimumAge}} years old to use our Services',
          'You agree to provide accurate and complete information',
          'You are responsible for maintaining the security of your account',
          'You agree to use our Services in compliance with all applicable laws',
        ],
      },
    ],
  },
  {
    id: 'ai-ethics',
    title: 'AI Ethical Use',
    icon: 'Sparkles',
    accent: 'purple',
    part: 'ai',
    blocks: [
      {
        type: 'p',
        text: 'Artificial intelligence and large language models are frontier technologies that are still improving in accuracy, reliability and safety. Outputs may look authoritative and still be wrong — confirm anything you intend to rely on.',
      },
      {
        type: 'cards',
        columns: 2,
        items: [
          {
            title: 'Trust, But Verify',
            icon: 'AlertTriangle',
            items: [
              'Outputs may contain material inaccuracies',
              'Confirm accuracy independently before relying on them',
              'Outputs may not be correct, current, or complete',
            ],
          },
          {
            title: 'Respect Privacy',
            icon: 'Lock',
            items: [
              'No personal data processing that breaks applicable law',
              'No biometric identification, including facial recognition',
              'No spyware, surveillance, or unauthorized monitoring',
            ],
          },
          {
            title: 'Protect Safety & Rights',
            icon: 'Shield',
            items: [
              'No unreviewed legal, medical, or financial advice',
              'No high-stakes automated decisions about people',
              'No gambling, payday lending, or political campaigning',
            ],
          },
          {
            title: 'Be Truthful',
            icon: 'Eye',
            items: [
              'No disinformation or false online engagement',
              'No impersonation without consent or legal right',
              'Disclose to people when they are talking to AI',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'user-accounts',
    title: 'User Accounts',
    icon: 'User',
    accent: 'amber',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: 'When you create an account with us, you must provide information that is accurate, complete, and current at all times.',
      },
      {
        type: 'note',
        title: 'Account Security',
        icon: 'Lock',
        items: [
          'Use a strong, unique password for your account',
          'Enable two-factor authentication when available',
          'Do not share your account credentials with others',
          'Notify us immediately of any unauthorized access',
        ],
      },
      {
        type: 'note',
        title: 'Account Responsibility',
        icon: 'AlertTriangle',
        text: 'You are responsible for safeguarding the password and for any activities that occur under your account. We cannot and will not be liable for any loss or damage arising from your failure to comply with this security obligation.',
      },
    ],
  },
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    icon: 'Shield',
    accent: 'rose',
    part: 'privacy',
    blocks: [
      {
        type: 'p',
        text: 'Your privacy is critically important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Services.',
      },
      {
        type: 'cards',
        columns: 3,
        items: [
          {
            title: 'Transparency',
            icon: 'Eye',
            text: "We're clear about what data we collect and why we collect it.",
          },
          {
            title: 'Security',
            icon: 'Lock',
            text: 'Your data is protected with industry-standard security measures.',
          },
          {
            title: 'Control',
            icon: 'Users',
            text: 'You have control over your personal information and privacy settings.',
          },
        ],
      },
    ],
  },
  {
    id: 'data-collection',
    title: 'Data Collection',
    icon: 'Eye',
    accent: 'cyan',
    part: 'privacy',
    blocks: [
      {
        type: 'p',
        text: 'We collect information you provide directly to us, information we obtain automatically when you use our Services, and information from other sources.',
      },
      {
        type: 'note',
        title: 'Information You Provide',
        icon: 'User',
        items: [
          'Account information (name, email, profile details)',
          'Content you create, upload, or share',
          'Communications with us and other users',
          'Payment and billing information',
        ],
      },
      {
        type: 'note',
        title: 'Automatically Collected Information',
        icon: 'Settings',
        items: [
          'Device and browser information',
          'IP address and location data',
          'Usage patterns and preferences',
          'Cookies and similar tracking technologies',
        ],
      },
    ],
  },
  {
    id: 'data-usage',
    title: 'How We Use Your Data',
    icon: 'Settings',
    accent: 'teal',
    part: 'privacy',
    blocks: [
      {
        type: 'p',
        text: 'We use the information we collect to provide, maintain, and improve our Services, process transactions, and communicate with you.',
      },
      {
        type: 'cards',
        columns: 2,
        items: [
          {
            title: 'Service Operations',
            icon: 'Globe',
            items: [
              'Provide and maintain our Services',
              'Process transactions and payments',
              'Provide customer support',
            ],
          },
          {
            title: 'Communications',
            icon: 'Mail',
            items: [
              'Send service notifications',
              'Respond to inquiries',
              'Marketing (with consent)',
            ],
          },
          {
            title: 'Improvements',
            icon: 'Star',
            items: [
              'Analyze usage patterns',
              'Develop new features',
              'Enhance user experience',
            ],
          },
          {
            title: 'Security & Legal',
            icon: 'Shield',
            items: [
              'Prevent fraud and abuse',
              'Enforce our Terms',
              'Comply with legal requirements',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'user-rights',
    title: 'Your Rights & Choices',
    icon: 'Scale',
    accent: 'indigo',
    part: 'privacy',
    blocks: [
      {
        type: 'p',
        text: 'You have certain rights regarding your personal information. We provide you with the ability to access, update, and delete your information.',
      },
      {
        type: 'cards',
        columns: 4,
        center: true,
        items: [
          { title: 'Access', icon: 'Eye', text: 'View the personal data we have about you' },
          { title: 'Update', icon: 'Settings', text: 'Correct or update your information' },
          { title: 'Delete', icon: 'X', text: 'Request deletion of your data' },
          { title: 'Control', icon: 'Lock', text: 'Manage privacy settings' },
        ],
      },
    ],
  },
  {
    id: 'security',
    title: 'Security Measures',
    icon: 'Lock',
    accent: 'green',
    part: 'security',
    blocks: [
      {
        type: 'p',
        text: 'We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.',
      },
      {
        type: 'cards',
        columns: 3,
        items: [
          {
            title: 'Encryption',
            icon: 'Shield',
            text: 'Data is encrypted in transit and at rest using industry-standard protocols.',
          },
          {
            title: 'Access Controls',
            icon: 'Eye',
            text: 'Strict access controls ensure only authorized personnel can access your data.',
          },
          {
            title: 'Monitoring',
            icon: 'AlertTriangle',
            text: 'Continuous monitoring and regular security audits protect against threats.',
          },
        ],
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies & Tracking Technologies',
    icon: 'Star',
    accent: 'yellow',
    part: 'cookies',
    blocks: [
      {
        type: 'p',
        text: 'We use cookies and similar tracking technologies to track activity on our Service and hold certain information to improve your experience.',
      },
      {
        type: 'cards',
        columns: 2,
        items: [
          { title: 'Essential Cookies', text: 'Required for basic site functionality' },
          { title: 'Analytics Cookies', text: 'Help us understand how you use our site' },
          { title: 'Preference Cookies', text: 'Remember your settings and preferences' },
          { title: 'Marketing Cookies', text: 'Provide relevant ads and content' },
        ],
      },
      {
        type: 'note',
        title: 'Your Cookie Choices',
        icon: 'User',
        text: 'You can control cookies through your browser settings. Note that disabling certain cookies may affect the functionality of our Services.',
      },
    ],
  },
  {
    id: 'third-party',
    title: 'Third Party Services',
    icon: 'Building2',
    accent: 'purple',
    part: 'thirdParty',
    blocks: [
      {
        type: 'p',
        text: 'Our Services may contain links to third-party websites or integrate with third-party services. We are not responsible for the privacy practices of these third parties.',
      },
      {
        type: 'note',
        title: 'Important Notice',
        icon: 'AlertTriangle',
        items: [
          'Third-party sites have their own privacy policies',
          'We encourage you to review these policies',
          'We are not responsible for third-party practices',
          'Integration services may share data according to their terms',
        ],
      },
    ],
  },
  {
    id: 'liability',
    title: 'Liability & Disclaimers',
    icon: 'AlertTriangle',
    accent: 'red',
    part: 'core',
    blocks: [
      {
        type: 'note',
        title: 'Service Disclaimer',
        icon: 'Shield',
        text: 'Our Services are provided "as is" and "as available" without warranties of any kind, either express or implied.',
        items: [
          'We do not guarantee uninterrupted access',
          'Services may be modified or discontinued',
          'Content accuracy is not guaranteed',
        ],
      },
      {
        type: 'note',
        title: 'Limitation of Liability',
        icon: 'Scale',
        text: 'To the maximum extent permitted by law, {{companyName}} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our Services.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact Information',
    icon: 'Mail',
    accent: 'blue',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: 'If you have any questions about these Terms of Service and Privacy Policy, please contact us:',
      },
      {
        type: 'cards',
        columns: 2,
        items: [
          {
            title: 'Company Information',
            icon: 'Building2',
            items: ['Company: {{companyName}}', 'Service: {{appName}}'],
          },
          {
            title: 'Contact Details',
            icon: 'Mail',
            items: ['Email: {{contactEmail}}'],
          },
        ],
      },
    ],
  },
];
