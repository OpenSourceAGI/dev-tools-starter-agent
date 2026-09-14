import type { Section } from '../types';

/**
 * The long-form combined Terms of Service and Privacy Policy — the text
 * currently published by QwkSearch, Debate AI and AI Broker, lifted verbatim
 * and tokenized.
 *
 * Section ids are stable and double as anchors; the `part` field groups them
 * so callers can drop, say, every AI clause with `parts: { ai: false }`.
 */
export const FULL_SECTIONS: Section[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    icon: 'BookOpen',
    accent: 'emerald',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: 'These Terms of Service ("Terms") govern your use of {{appName}}\'s products and services, along with any associated apps, software, and websites (together, our "Services"). These Terms are a contract between you and {{appName}}, and they include our Acceptable Use Policy. By accessing our Services, you agree to these Terms.',
      },
      {
        type: 'p',
        text: 'This document also describes how {{appName}} ("we", "us," "our") collects, uses and discloses information about individuals who use our websites, applications, services, tools and features, purchase our products or otherwise interact with us (collectively, the "Services"). For the purposes of this document, "you" and "your" means you as the user of the Services, whether you are a customer, website visitor, job applicant, representative of a company with whom we do business, or another individual whose information we have collected pursuant to this Privacy Policy. Please note that the Services are designed for users in {{jurisdiction}} only and are not intended for users located outside {{jurisdiction}}.',
      },
      {
        type: 'p',
        text: 'Please read this document carefully. By using any of the Services, you agree to the collection, use, and disclosure of your information as described in this document. If you do not agree to these terms, please do not use or access the Services.',
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    icon: 'FileText',
    accent: 'blue',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: 'We may revise and update these Terms at our discretion. We may modify this document from time to time, in which case we will update the "Last Updated" date at the top of this document. If we make material changes to the way in which we use or disclose information we collect, we will use reasonable efforts to notify you (such as by emailing you at the last email address you provided us, by posting notice of such changes on the Services, or by other means consistent with applicable law) and will take additional steps as required by applicable law. If you continue to access the Services after we post the updated Terms, you agree to the updated Terms. If you do not agree to any updates to this document, please do not continue using or accessing the Services.',
      },
    ],
  },
  {
    id: 'ai-ethics',
    title: 'Artificial Intelligence Ethical Use Policy',
    icon: 'Sparkles',
    accent: 'purple',
    part: 'ai',
    subsections: [
      {
        id: 'ai-trust-but-verify',
        title: 'Trust, But Verify Outputs',
        icon: 'AlertTriangle',
        part: 'ai',
        blocks: [
          {
            type: 'ol',
            lead: 'Artificial intelligence and large language models (LLMs) are frontier technologies that are still improving in accuracy, reliability and safety. When you use our Services, you acknowledge and agree:',
            items: [
              'Outputs may not always be accurate and may contain material inaccuracies even if they appear accurate because of their level of detail or specificity.',
              'You should not rely on any Outputs without independently confirming their accuracy.',
              'The Services and any Outputs may not reflect correct, current, or complete information.',
            ],
          },
        ],
      },
      {
        id: 'ai-privacy-protection',
        title: 'Privacy Protection',
        icon: 'Lock',
        part: 'ai',
        blocks: [
          {
            type: 'ol',
            lead: "Don't compromise the privacy of others, including:",
            items: [
              'Collecting, processing, disclosing, inferring or generating personal data without complying with applicable legal requirements',
              'Using biometric systems for identification or assessment, including facial recognition',
              'Facilitating spyware, communications surveillance, or unauthorized monitoring of individuals',
            ],
          },
        ],
      },
      {
        id: 'ai-safety-rights',
        title: 'Safety and Rights Protection',
        icon: 'Shield',
        part: 'ai',
        blocks: [
          {
            type: 'ol',
            lead: "Don't perform or facilitate activities that may significantly impair the safety, wellbeing, or rights of others, including:",
            items: [
              'Providing tailored legal, medical/health, or financial advice without review by a qualified professional and disclosure of the use of AI assistance and its potential limitations',
              "Making high-stakes automated decisions in domains that affect an individual's safety, rights or well-being",
              'Facilitating real money gambling or payday lending',
              'Engaging in political campaigning or lobbying, including generating campaign materials personalized to or targeted at specific demographics',
              'Deterring people from participation in democratic processes',
            ],
          },
        ],
      },
      {
        id: 'ai-truthfulness',
        title: 'Truthfulness and Transparency',
        icon: 'Eye',
        part: 'ai',
        blocks: [
          {
            type: 'ol',
            lead: "Don't misuse our platform to cause harm by intentionally deceiving or misleading others, including:",
            items: [
              'Generating or promoting disinformation, misinformation, or false online engagement',
              'Impersonating another individual or organization without consent or legal right',
              'Engaging in or promoting academic dishonesty',
              "Failing to ensure that automated systems disclose to people that they are interacting with AI, unless it's obvious from the context",
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'accounts',
    title: 'Account Creation and Access',
    icon: 'User',
    accent: 'amber',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: 'Your {{appName}} Account: To access our Services, we may ask you to create an Account. You agree to provide correct, current, and complete Account information. You may not share your Account login information with anyone else. You are responsible for all activity occurring under your Account.',
      },
      {
        type: 'p',
        text: 'You may close your Account at any time by contacting us at {{contactEmail}}.',
      },
    ],
  },
  {
    id: 'use-of-services',
    title: 'Use of Our Services',
    icon: 'Globe',
    accent: 'blue',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: 'You may access and use our Services only in compliance with our Terms, our Acceptable Use Policy, and any guidelines or supplemental terms we may post on the Services (the "Permitted Use").',
      },
      {
        type: 'p',
        text: 'You may not access or use, or help another person to access or use, our Services in any manner that violates these Terms or applicable laws.',
      },
    ],
  },
  {
    id: 'materials',
    title: 'Prompts, Outputs, and Materials',
    icon: 'FileText',
    accent: 'indigo',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: 'You may be allowed to submit text or other materials to our Services for processing (we call these "Prompts"). Our Services may generate responses based on your Prompts (we call these "Outputs"). Prompts and Outputs collectively are "Materials."',
      },
      {
        type: 'p',
        text: 'You are responsible for all Prompts you submit to our Services. By submitting Prompts, you represent and warrant that you have all necessary rights and permissions.',
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
        text: 'When you use or access the Services, we collect certain categories of information about you from a variety of sources.',
      },
    ],
    subsections: [
      {
        id: 'information-you-provide',
        title: 'Information You Provide to Us',
        icon: 'User',
        part: 'privacy',
        blocks: [
          {
            type: 'ol',
            lead: 'Some features of the Services may require you to directly provide us with certain information about yourself. You may elect not to provide this information, but doing so may prevent you from using or accessing these features. Information that you directly submit through our Services includes:',
            items: [
              'Basic contact details, such as name, address, phone number, and email. We use this information to provide the Services, and to communicate with you (including to tell you about certain promotions or products or services that may be of interest to you).',
              'Account information, such as name, username (email) and password. We use this information to provide the Services and to maintain and secure your account with us. If you choose to register an account, you are responsible for keeping your account credentials safe. We recommend you do not share your access details with anyone else. If you believe your account has been compromised, please contact us immediately.',
              'Your Input and Output, such as questions, prompts and other content that you input, upload or submit to the Services, and the output that you create. This content may constitute or contain personal information, depending on the substance and how it is associated with your account. We use this information to generate and output new content as part of the Services.',
              'Any other information you choose to include in communications with us, for example, when sending a message through the Services or provide your size when purchasing certain products.',
            ],
          },
        ],
      },
      {
        id: 'information-collected-automatically',
        title: 'Information We Collect Automatically',
        icon: 'Settings',
        part: 'privacy',
        blocks: [
          {
            type: 'ol',
            lead: 'We also automatically collect certain information about your interaction with the Services ("Usage Data"). To do this, we may use cookies and other tracking technologies ("Tracking Technologies"). Usage Data includes:',
            items: [
              'Device information, such as device type, operating system, unique device identifier, and internet protocol (IP) address.',
              'Location information, such as approximate location.',
              'Other information regarding your interaction with the Services, such as browser type, log data, date and time stamps, clickstream data, interactions with marketing emails, and ad impressions.',
            ],
          },
          {
            type: 'p',
            text: 'We use Usage Data to tailor features and content to you, run analytics and better understand user interaction with the Services. For more information on how we use Tracking Technologies and your choices, see the Cookies and Other Tracking Technologies section.',
          },
        ],
      },
      {
        id: 'information-from-other-sources',
        title: 'Information Collected From Other Sources',
        icon: 'Building2',
        part: 'privacy',
        blocks: [
          {
            type: 'ol',
            lead: 'We may obtain information about you from outside sources, including information that we collect directly from third parties and information from third parties that you choose to share with us. Such information includes:',
            items: [
              'Analytics data we receive from analytics providers such as Google Analytics.',
              'Information we receive from consumer marketing databases or other data enrichment companies, which we use to better customize advertising and marketing to you.',
            ],
          },
          {
            type: 'p',
            text: "Any information we receive from outside sources will be treated in accordance with this document. We are not responsible for the accuracy of the information provided to us by third parties and are not responsible for any third party's policies or practices. For more information, see the Third Party Websites and Links section.",
          },
          {
            type: 'p',
            text: 'In addition to the specific uses described above, we may use any of the above information to provide you with and improve the Services and to maintain our business relationship, including by enhancing the safety and security of our Services (e.g., troubleshooting, data analysis, testing, system maintenance, and reporting), providing customer support, sending service and other non-marketing communications, monitoring and analyzing trends, conducting internal research and development, complying with applicable legal obligations, enforcing any applicable terms of service, and protecting the Services, our rights, and the rights of our employees, users or other individuals.',
          },
          {
            type: 'p',
            text: 'Finally, we may deidentify or anonymize your information such that it cannot reasonably be used to infer information about you or otherwise be linked to you ("deidentified information") (or we may collect information that has already been deidentified/anonymized), and we may use such deidentified information for any purpose. To the extent we possess or process any deidentified information, we will maintain and use such information in deidentified/anonymized form and not attempt to re-identify the information, except solely for the purpose of determining whether our deidentification/anonymization process satisfies legal requirements.',
          },
        ],
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies and Other Tracking Technologies',
    icon: 'Star',
    accent: 'yellow',
    part: 'cookies',
    blocks: [
      {
        type: 'p',
        text: 'Most browsers accept cookies automatically, but you may be able to control the way in which your devices permit the use of Tracking Technologies. If you so choose, you may block or delete our cookies from your browser; however, blocking or deleting cookies may cause some of the Services, including certain features and general functionality, to work incorrectly. If you have questions regarding the specific information about you that we process or retain, as well as your choices regarding our collection and use practices, please contact us using the information listed below.',
      },
      {
        type: 'p',
        text: 'To opt out of tracking by Google Analytics, click here: https://tools.google.com/dlpage/gaoptout',
      },
      {
        type: 'p',
        text: 'Your browser settings may allow you to transmit a "do not track" signal, "opt-out preference" signal, or other mechanism for exercising your choice regarding the collection of your information when you visit various websites. Like many websites, our website is not designed to respond to such signals, and we do not use or disclose your information in any way that would legally require us to recognize opt-out preference signals. To learn more about "do not track" signals, you can visit http://www.allaboutdnt.com/.',
      },
    ],
  },
  {
    id: 'disclosure',
    title: 'Disclosure of Your Information',
    icon: 'Users',
    accent: 'purple',
    part: 'privacy',
    blocks: [
      {
        type: 'ol',
        lead: 'We may disclose your information to third parties for legitimate purposes subject to this document, including the following categories of third parties:',
        items: [
          'Company Group: Our affiliates or others within our corporate group.',
          'Service Providers: Vendors or other service providers who help us provide the Services, including for system administration, cloud storage, security, customer relationship management, marketing communications, web analytics, payment networks, and payment processing.',
          'Other Third Parties: Third parties to whom you request or direct us to disclose information, such as through your use of social media widgets or login integration.',
          'Professional advisors: such as auditors, law firms, or accounting firms.',
          'Business Transactions: Third parties in connection with or anticipation of an asset sale, merger, or other business transaction, including in the context of a bankruptcy.',
        ],
      },
      {
        type: 'p',
        text: 'We may also disclose your information as needed to comply with applicable law or any obligations thereunder or to cooperate with law enforcement, judicial orders, and regulatory inquiries, to enforce any applicable terms of service, and to ensure the safety and security of our business, employees, and users.',
      },
    ],
  },
  {
    id: 'social-features',
    title: 'Social Features',
    icon: 'Users',
    accent: 'cyan',
    part: 'thirdParty',
    blocks: [
      {
        type: 'p',
        text: 'Certain features of the Services may allow you to initiate interactions between the Services and third-party services or platforms, such as social networks ("Social Features"). Social Features include features that allow you to access our pages on third-party platforms, and from there "like" or "share" our content. Use of Social Features may allow a third party to collect and/or use your information. If you use Social Features, information you post or make accessible may be publicly displayed by the third-party service. Both we and the third party may have access to information about you and your use of both the Services and the third-party service. For more information, see the Third Party Websites and Links section.',
      },
    ],
  },
  {
    id: 'third-party',
    title: 'Third Party Websites and Links',
    icon: 'Building2',
    accent: 'purple',
    part: 'thirdParty',
    blocks: [
      {
        type: 'p',
        text: 'We may provide links to third-party websites or platforms. If you follow links to sites or platforms that we do not control and are not affiliated with us, you should review the applicable privacy notice, policies and other terms. We are not responsible for the privacy or security of, or information found on, these sites or platforms. Information you provide on public or semi-public venues, such as third-party social networking platforms, may also be viewable by other users of the Services and/or users of those third-party platforms without limitation as to its use. Our inclusion of such links does not, by itself, imply any endorsement of the content on such platforms or of their owners or operators.',
      },
    ],
  },
  {
    id: 'children',
    title: "Children's Privacy",
    icon: 'Users',
    accent: 'emerald',
    part: 'children',
    blocks: [
      {
        type: 'p',
        text: 'Children under the age of {{childrenAge}} are not permitted to use the Services, and we do not seek or knowingly collect any personal information about children under {{childrenAge}} years of age. If we become aware that we have unknowingly collected information about a child under {{childrenAge}} years of age, we will make commercially reasonable efforts to delete such information. If you are the parent or guardian of a child under {{childrenAge}} years of age who has provided us with their personal information, you may contact us using the below information to request that it be deleted.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Data Security and Retention',
    icon: 'Lock',
    accent: 'green',
    part: 'security',
    blocks: [
      {
        type: 'p',
        text: 'Despite our reasonable efforts to protect your information, no security measures are impenetrable, and we cannot guarantee "perfect security." Any information you send to us electronically, while using the Services or otherwise interacting with us, may not be secure while in transit. We recommend that you do not use unsecure channels to send us sensitive or confidential information.',
      },
      {
        type: 'p',
        text: 'We retain your information for as long as is reasonably necessary for the purposes specified in this document. When determining the length of time to retain your information, we consider various criteria, including whether we need the information to continue to provide you the Services, resolve a dispute, enforce our contractual agreements, prevent harm, promote safety, security and integrity, or protect ourselves, including our rights, property or products.',
      },
      {
        type: 'p',
        text: 'You may opt out of information collection for AI, which would prohibit us from using your search information to improve our AI models in your settings page if you are logged into the Services. If you delete your account, we will delete your personal information from our servers within {{dataDeletionDays}} days. Please contact us at {{contactEmail}} to request deletion.',
      },
    ],
  },
  {
    id: 'california',
    title: 'California Residents',
    icon: 'Scale',
    accent: 'indigo',
    part: 'california',
    blocks: [
      {
        type: 'p',
        text: 'This section applies to you only if you are a California resident ("resident" or "residents"). For purposes of this section, references to "personal information" shall include "sensitive personal information," as these terms are defined under the California Consumer Privacy Act ("CCPA").',
      },
    ],
    subsections: [
      {
        id: 'california-processing',
        title: 'Processing of Personal Information',
        icon: 'Eye',
        part: 'california',
        blocks: [
          {
            type: 'ol',
            lead: 'In the preceding 12 months, we collected and disclosed for a business purpose the following categories of personal information and sensitive personal information (denoted by *) about residents:',
            items: [
              'Identifiers such as name, e-mail address, IP address',
              'Personal information categories listed in the California Customer Records statute such as name, address and telephone number',
              'Commercial information such as records of products or services purchased',
              'Internet or other similar network activity such as information regarding your interaction with the Platform',
              'Geolocation data such as IP address',
              'Professional or employment-related information such as title of profession, employer, professional background and other information provided by you when you apply for a job with us',
              'Non-public education information collected by certain federally funded institutions such as education records',
              'Account access credentials* such as account log-in',
            ],
          },
          {
            type: 'p',
            text: 'The specific business or commercial purposes for which we collect your personal information and the categories of sources from which we collect your personal information are described in the Privacy Policy section. We only use and disclose sensitive personal information for the purposes specified in the CCPA. The criteria we use to determine how long to retain your personal information is described in the Data Security and Retention section.',
          },
          {
            type: 'ol',
            lead: 'We disclosed personal information over the preceding 12 months for the following business or commercial purposes:',
            items: [
              'to communicate with you, provide you with products and services, to market to you, etc.',
              'to maintain and secure your account with us',
              'to process your payment, to provide you with products or services you have requested',
              'to evaluate your candidacy and process your application for employment.',
            ],
          },
        ],
      },
      {
        id: 'california-selling',
        title: 'Selling and/or Sharing of Personal Information',
        icon: 'Building2',
        part: 'california',
        blocks: [
          {
            type: 'p',
            text: 'We do not "sell" or "share" (as those terms are defined under the CCPA) personal information, nor have we done so in the preceding 12 months. Further, we do not have actual knowledge that we "sell" or "share" personal information of residents under 16 years of age.',
          },
        ],
      },
      {
        id: 'california-rights',
        title: 'Your California Privacy Rights',
        icon: 'Scale',
        part: 'california',
        blocks: [
          {
            type: 'p',
            text: 'As a California resident, you may have the rights listed below in relation to personal information that we have collected about you. However, these rights are not absolute, and in certain cases, we may decline your request as permitted by law.',
          },
          {
            type: 'ol',
            items: [
              {
                text: 'Right to Know. You have a right to request the following information about our collection, use and disclosure of your personal information:',
                items: [
                  'categories of personal information we have collected, disclosed for a business purpose;',
                  'categories of sources from which we collected personal information;',
                  'the business or commercial purposes for collecting personal information;',
                  'categories of third parties to whom the personal information was disclosed for a business purpose; and',
                  'specific pieces of personal information we have collected.',
                ],
              },
              'Right to Delete. You have a right to request that we delete personal information we maintain about you.',
              'Right to Correct. You have a right to request that we correct inaccurate personal information we maintain about you.',
            ],
          },
          {
            type: 'p',
            text: 'You may exercise any of these rights by contacting us using the information provided below. We will not discriminate against you for exercising any of these rights. We may need to collect information from you to verify your identity, such as your email address and government issued ID, before providing a substantive response to the request. You may designate, in writing or through a power of attorney document, an authorized agent to make requests on your behalf to exercise your rights. Before accepting such a request from an agent, we will require that the agent provide proof you have authorized them to act on your behalf, and we may need you to verify your identity directly with us.',
          },
        ],
      },
    ],
  },
  {
    id: 'feedback',
    title: 'Feedback',
    icon: 'Star',
    accent: 'amber',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: 'If you provide Feedback to us, you agree that we may use the Feedback however we choose without any obligation or payment to you.',
      },
    ],
  },
  {
    id: 'liability',
    title: 'Disclaimer of Warranties and Limitations of Liability',
    icon: 'AlertTriangle',
    accent: 'red',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: 'The services are provided "as is" and "as available" without warranties of any kind. {{companyName}} disclaims all warranties, express or implied.',
      },
      {
        type: 'p',
        text: 'To the fullest extent permissible under applicable law, {{companyName}} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.',
      },
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    icon: 'X',
    accent: 'slate',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: 'We may suspend or terminate your access to the Services at any time if we believe that you have breached these Terms, or if we must do so to comply with law.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'How to Contact Us',
    icon: 'Mail',
    accent: 'blue',
    part: 'core',
    blocks: [
      {
        type: 'p',
        text: 'Should you have any questions about our privacy practices, these Terms of Service, or this document, please email us at {{contactEmail}}',
      },
    ],
  },
];
