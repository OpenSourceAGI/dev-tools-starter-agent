/**
 * @file layout.tsx
 * @description Layout component for documentation pages.
 * The search bar lives at the top of the sidebar instead of the navbar.
 */
import { source } from '@/lib/fumadocs/source';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';
import {
  NoNavbarSearch,
  SearchTrigger,
  SidebarSearch,
} from '@/components/fumadocs/layout/sidebar-search';

export default function RootDocsLayout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      {...baseOptions}
      slots={{ searchTrigger: { sm: SearchTrigger, full: NoNavbarSearch } }}
      sidebar={{ banner: <SidebarSearch /> }}
    >
      {children}
    </DocsLayout>
  );
}
