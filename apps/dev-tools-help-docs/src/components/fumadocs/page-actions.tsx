'use client'
import { cva } from 'class-variance-authority'
import { buttonVariants } from 'fumadocs-ui/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'fumadocs-ui/components/ui/popover'
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button'
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLinkIcon,
  MessageCircleIcon,
} from 'lucide-react'
import React = require('react')

const { useMemo, useState } = React
import { cn } from '@/lib/cn'

const cache = new Map<string, string>()

export function LLMCopyButton({
  /**
   * A URL to fetch the raw Markdown/MDX content of page
   */
  markdownUrl,
}: {
  markdownUrl: string
}) {
  const [isLoading, setLoading] = useState(false)
  const [checked, onClick] = useCopyButton(async () => {
    const cached = cache.get(markdownUrl)
    if (cached) return navigator.clipboard.writeText(cached)

    setLoading(true)

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': fetch(markdownUrl).then(async (res) => {
            const content = await res.text()
            cache.set(markdownUrl, content)

            return content
          }),
        }),
      ])
    } finally {
      setLoading(false)
    }
  })

  return (
    <button
      type='button'
      disabled={isLoading}
      className={cn(
        buttonVariants({
          color: 'secondary',
          size: 'sm',
          className: 'gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground',
        })
      )}
      onClick={onClick}
    >
      {checked ? <Check /> : <Copy />}
      Copy Markdown
    </button>
  )
}

const optionVariants = cva(
  'text-sm p-2 rounded-lg inline-flex items-center gap-2 hover:text-fd-accent-foreground hover:bg-fd-accent [&_svg]:size-4'
)

export function ViewOptions({
  markdownUrl,
  githubUrl,
}: {
  markdownUrl: string
  githubUrl: string
}) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({
            color: 'secondary',
            size: 'sm',
            className: 'gap-1.5 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground',
          })
        )}
      >
        View
        <ChevronDown />
      </PopoverTrigger>
      <PopoverContent className='flex flex-col p-1 w-44'>
        <a
          href={markdownUrl}
          target='_blank'
          rel='noopener noreferrer'
          className={optionVariants()}
        >
          <ExternalLinkIcon />
          Raw Markdown
        </a>
        <a
          href={githubUrl}
          target='_blank'
          rel='noopener noreferrer'
          className={optionVariants()}
        >
          <ExternalLinkIcon />
          Open on GitHub
        </a>
      </PopoverContent>
    </Popover>
  )
}
