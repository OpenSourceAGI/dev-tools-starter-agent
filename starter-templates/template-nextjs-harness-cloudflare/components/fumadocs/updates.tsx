import * as React from 'react'
import { cn } from '@/lib/utils'

interface UpdatesProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface UpdateProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: string
  children: React.ReactNode
}

export function Updates({ className, children, ...props }: UpdatesProps) {
  return (
    <div
      className={cn(
        'my-6 space-y-4 rounded-lg border bg-card p-6 text-card-foreground',
        className
      )}
      {...props}
    >
      <h3 className='mb-4 font-semibold text-lg'>Updates</h3>
      {children}
    </div>
  )
}

export function Update({ date, className, children, ...props }: UpdateProps) {
  return (
    <div
      className={cn('border-l-2 border-primary pl-4', className)}
      {...props}
    >
      {date && (
        <time className='mb-1 block text-muted-foreground text-sm'>{date}</time>
      )}
      <div className='prose prose-sm dark:prose-invert'>{children}</div>
    </div>
  )
}
