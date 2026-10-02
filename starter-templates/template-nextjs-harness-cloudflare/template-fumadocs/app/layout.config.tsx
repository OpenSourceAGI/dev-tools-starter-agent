/**
 * @file layout.config.tsx
 * @description Configuration for the documentation layout, including navigation and links.
 */
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { BookOpen, Link2 } from 'lucide-react';
import { docsConfig } from '@/lib/fumadocs/customize-docs';
import { ThemeDropdown } from '@/components/fumadocs/layout/theme-dropdown';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="inline-flex items-center gap-2">
        { docsConfig.favicon ? <img src={docsConfig.favicon} alt="Logo" /> : <Link2 />}
        {docsConfig.title}
      </span>
    ),
  },
  links: [
    {
      label: 'Docs',
      icon: <BookOpen />,
      text: 'Docs',
      url: '/docs',
    },
    {
      type: 'custom' as const,
      children: <ThemeDropdown />,
    },
  ],
  githubUrl: 'https://github.com/vtempest/grab-url',
};
