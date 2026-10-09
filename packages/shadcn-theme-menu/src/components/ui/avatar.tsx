import * as React from "react"
import { cn } from "../../lib/utils"

export function Avatar({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props}>
      {children}
    </div>
  )
}

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string
}

export function AvatarImage({ src, alt, className, ...props }: AvatarImageProps) {
  const [error, setError] = React.useState(false)
  if (!src || error) return null
  return (
    <img
      src={src}
      alt={alt}
      className={cn("aspect-square h-full w-full object-cover", className)}
      onError={() => setError(true)}
      {...props}
    />
  )
}

export function AvatarFallback({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted text-xs font-medium", className)} {...props}>
      {children}
    </div>
  )
}
