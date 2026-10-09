/**
 * @file edit-page-button.tsx
 * @description "Edit page" button for every docs page. The rich text editor is
 * heavy, so it is code-split: nothing beyond this button ships with the page,
 * and the overlay chunk is fetched on hover/focus and mounted on click.
 */
'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

const loadOverlay = () => import('./edit-page-overlay');

const EditPageOverlay = dynamic(loadOverlay, {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fd-background/80 backdrop-blur-sm">
      <Loader2 className="size-6 animate-spin text-fd-muted-foreground" />
    </div>
  ),
});

export interface EditPageButtonProps {
  /** The page's slug segments, as `page.slugs`. */
  slug: string[];
  title: string;
}

export function EditPageButton({ slug, title }: EditPageButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onMouseEnter={loadOverlay}
        onFocus={loadOverlay}
        onClick={() => setOpen(true)}
      >
        <Pencil />
        Edit page
      </Button>
      {open && <EditPageOverlay slug={slug.join('/')} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}
