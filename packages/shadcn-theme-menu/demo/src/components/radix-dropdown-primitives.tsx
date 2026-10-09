import * as React from 'react'
import * as RadixDropdown from '@radix-ui/react-dropdown-menu'

import { cn } from '@/lib/utils'

/**
 * A hand-rolled, Radix-based dropdown set used to demonstrate the `DropdownMenu`
 * injection prop on `ThemeDropdown`. It is deliberately styled differently from
 * the demo's own shadcn menu (wider, rounded, dashed separators) so that swapping
 * primitives is visible at a glance rather than a claim in the docs.
 *
 * The shape here — Root / Trigger / Content / Item / Label / Separator — is the
 * contract the package's switchers call into.
 */

const Content = React.forwardRef<
  React.ComponentRef<typeof RadixDropdown.Content>,
  React.ComponentPropsWithoutRef<typeof RadixDropdown.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <RadixDropdown.Portal>
    <RadixDropdown.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-56 overflow-hidden rounded-xl border-2 border-primary/40 bg-popover p-1.5',
        'text-popover-foreground shadow-xl',
        className,
      )}
      {...props}
    />
  </RadixDropdown.Portal>
))
Content.displayName = 'RadixDemoContent'

const Item = React.forwardRef<
  React.ComponentRef<typeof RadixDropdown.Item>,
  React.ComponentPropsWithoutRef<typeof RadixDropdown.Item>
>(({ className, ...props }, ref) => (
  <RadixDropdown.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none',
      'focus:bg-primary focus:text-primary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  />
))
Item.displayName = 'RadixDemoItem'

const Label = React.forwardRef<
  React.ComponentRef<typeof RadixDropdown.Label>,
  React.ComponentPropsWithoutRef<typeof RadixDropdown.Label>
>(({ className, ...props }, ref) => (
  <RadixDropdown.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary', className)}
    {...props}
  />
))
Label.displayName = 'RadixDemoLabel'

const Separator = React.forwardRef<
  React.ComponentRef<typeof RadixDropdown.Separator>,
  React.ComponentPropsWithoutRef<typeof RadixDropdown.Separator>
>(({ className, ...props }, ref) => (
  <RadixDropdown.Separator
    ref={ref}
    className={cn('-mx-1.5 my-1 border-t border-dashed border-primary/30', className)}
    {...props}
  />
))
Separator.displayName = 'RadixDemoSeparator'

export const radixDropdownPrimitives = {
  Root: RadixDropdown.Root,
  Trigger: RadixDropdown.Trigger,
  Content,
  Item,
  Label,
  Separator,
}
