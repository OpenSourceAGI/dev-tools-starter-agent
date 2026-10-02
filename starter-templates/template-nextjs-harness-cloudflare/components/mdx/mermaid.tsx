'use client'

import React, { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

interface MermaidProps {
  chart: string
}

export function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
      })
      mermaid.contentLoaded()
    }
  }, [chart])

  return (
    <div className='mermaid' ref={ref}>
      {chart}
    </div>
  )
}
