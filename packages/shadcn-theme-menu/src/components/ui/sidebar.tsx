import * as React from "react"
import { cn } from "../../lib/utils"

export function SidebarMenu({ children, className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("flex flex-col gap-1", className)} {...props}>{children}</ul>
}

export function SidebarMenuItem({ children, className, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("", className)} {...props}>{children}</li>
}

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "default" | "lg" | "sm"
  asChild?: boolean
}

export function SidebarMenuButton({ children, className, size = "default", asChild, ...props }: SidebarMenuButtonProps) {
  const sizeClass = size === "lg" ? "h-12 text-sm" : size === "sm" ? "h-7 text-xs" : "h-8 text-sm"
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      className: cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent", sizeClass, className),
      ...props,
    })
  }
  return (
    <button className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent", sizeClass, className)} {...props}>
      {children}
    </button>
  )
}
