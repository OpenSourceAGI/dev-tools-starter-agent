import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LegalTermsPrivacyPolicy from '../src/react/LegalTermsPrivacyPolicy';

/**
 * Server-renders the page the way a Next.js route does. Catches what the data
 * tests cannot: a bad hook order, an icon name the component can't resolve, a
 * block type the view forgot to handle.
 */
function render(props: React.ComponentProps<typeof LegalTermsPrivacyPolicy>) {
  return renderToStaticMarkup(<LegalTermsPrivacyPolicy {...props} />);
}

describe('<LegalTermsPrivacyPolicy />', () => {
  it('renders the summary variant with its cards and section anchors', () => {
    const html = render({ appName: 'Acme', defaultVariant: 'summary' });
    expect(html).toContain('Acme Terms of Service &amp; Privacy Policy');
    expect(html).toContain('id="data-collection"');
    expect(html).toContain('Legal Agreement');
    expect(html).toContain('<svg'); // lucide icons resolved
  });

  it('renders the full variant with numbered sections', () => {
    const html = render({ appName: 'Acme', defaultVariant: 'full' });
    expect(html).toContain('id="california"');
    expect(html).toContain('3.1');
    expect(html).toContain('Artificial Intelligence Ethical Use Policy');
  });

  it('shows the variant switch by default and hides it on request', () => {
    expect(render({ appName: 'Acme' })).toContain('Full Text');
    expect(render({ appName: 'Acme', features: { variantSwitch: false } })).not.toContain(
      'Full Text',
    );
  });

  it('honours a controlled variant over defaultVariant', () => {
    const html = render({ appName: 'Acme', variant: 'full', defaultVariant: 'summary' });
    expect(html).toContain('id="social-features"');
  });

  it('renders caller-authored sections, including unknown icon names', () => {
    const html = render({
      appName: 'Acme',
      defaultVariant: 'summary',
      add: [
        {
          after: 'introduction',
          section: {
            id: 'arbitration',
            title: 'Arbitration',
            icon: 'NoSuchIcon',
            blocks: [
              { type: 'p', text: 'Disputes with {{companyName}} go to arbitration.' },
              { type: 'ul', lead: 'Exceptions:', items: ['Small claims'] },
              { type: 'cards', items: [{ title: 'Venue', text: 'Delaware', icon: 'Scale' }] },
              { type: 'note', title: 'Note', items: ['Opt out within 30 days'] },
            ],
          },
        },
      ],
    });
    expect(html).toContain('id="arbitration"');
    expect(html).toContain('Disputes with Acme go to arbitration.');
    expect(html).toContain('Small claims');
    expect(html).toContain('Delaware');
    expect(html).toContain('Opt out within 30 days');
  });

  it('links the contact email', () => {
    const html = render({ appName: 'Acme', contactEmail: 'legal@acme.com', variant: 'full' });
    expect(html).toContain('href="mailto:legal@acme.com"');
  });

  it('drops a part without leaving an empty heading', () => {
    const html = render({ appName: 'Acme', variant: 'full', parts: { ai: false } });
    expect(html).not.toContain('id="ai-ethics"');
    expect(html).toContain('id="introduction"');
  });
});
