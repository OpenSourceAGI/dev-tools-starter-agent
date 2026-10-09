import * as React from 'react'
import { cn } from '@/lib/utils'

interface APIPageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function APIPage({ className, children, ...props }: APIPageProps) {
  return (
    <div
      className={cn('api-page rounded-lg border bg-card p-6', className)}
      {...props}
    >
      {children}
    </div>
  )
}
