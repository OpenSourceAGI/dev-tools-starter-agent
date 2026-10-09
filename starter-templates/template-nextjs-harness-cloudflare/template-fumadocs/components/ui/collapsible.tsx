/**
 * @file collapsible.tsx
 * @description Collapsible component for hiding/showing content, built with Radix UI.
 */
// @ts-nocheck - Radix UI types incompatible with React 19 children prop
'use client';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import React, { forwardRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const Collapsible = CollapsiblePrimitive.Root as any;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger as any;

const CollapsibleContent = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ children, ...props }, ref) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <CollapsiblePrimitive.CollapsibleContent
      ref={ref}
      {...props}
      className={cn(
        'overflow-hidden',
        mounted &&
        'data-[state=closed]:animate-fd-collapsible-up data-[state=open]:animate-fd-collapsible-down',
        props.className,
      )}
    >
      {children}
    </CollapsiblePrimitive.CollapsibleContent>
  );
});

CollapsibleContent.displayName =
  CollapsiblePrimitive.CollapsibleContent.displayName;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
