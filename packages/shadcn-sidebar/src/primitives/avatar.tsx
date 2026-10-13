/**
 * @fileoverview A dependency-free avatar: the image when it loads, the
 * name's initial when there is none or it fails.
 *
 * @module primitives/avatar
 */

import { useState } from "react"

import { cn, initialOf } from "../lib/utils"

export function Avatar({
  image,
  name,
  className,
}: {
  image?: string | null
  name: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(image) && !failed

  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-xs font-medium",
        className,
      )}
    >
      {showImage ? (
        <img src={image ?? undefined} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden>{initialOf(name)}</span>
      )}
    </span>
  )
}
