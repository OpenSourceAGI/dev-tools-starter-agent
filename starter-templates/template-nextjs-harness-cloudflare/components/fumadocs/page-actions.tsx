'use client'

import * as React from 'react'
import { Copy, Eye, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface LLMCopyButtonProps {
  markdownUrl: string
}

export function LLMCopyButton({ markdownUrl }: LLMCopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    try {
      const response = await fetch(markdownUrl)
      const text = await response.text()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <Button
      variant='ghost'
      size='icon'
      className='size-8'
      onClick={handleCopy}
      title='Copy markdown for LLM'
    >
      <Copy className='size-4' />
      {copied && (
        <span className='sr-only'>Copied!</span>
      )}
    </Button>
  )
}

interface ViewOptionsProps {
  markdownUrl: string
  githubUrl?: string
}

export function ViewOptions({ markdownUrl, githubUrl }: ViewOptionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='size-8'>
          <Eye className='size-4' />
          <span className='sr-only'>View options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem asChild>
          <a href={markdownUrl} target='_blank' rel='noopener noreferrer'>
            View Markdown
          </a>
        </DropdownMenuItem>
        {githubUrl && (
          <DropdownMenuItem asChild>
            <a href={githubUrl} target='_blank' rel='noopener noreferrer'>
              <Github className='mr-2 size-4' />
              View on GitHub
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
