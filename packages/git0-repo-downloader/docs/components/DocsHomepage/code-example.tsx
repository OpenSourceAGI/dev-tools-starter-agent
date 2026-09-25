/**
 * @file code-example.tsx
 * @description Interactive component displaying git0 usage examples.
 */
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import 'highlight.js/styles/github-dark.css'

// Register languages
hljs.registerLanguage('bash', bash)

const codeExamples = {
  search: `# Search for repositories by name
g react starter

# g and git0 both work
git0 react starter`,
  download: `# Direct download from GitHub URL
g https://github.com/facebook/react

# Download using owner/repo shorthand
git0 facebook/react

# Use git0 without installing (only node needed)
npx git0 facebook/react`,
  paths: `# Download only one folder — paste the GitHub link as you copied it
g https://github.com/facebook/react/tree/main/packages/react-dom

# ...or one file
g https://github.com/debate/debate-ai.com/blob/master/.continue/agents/new-config.yaml

# Same thing, without a URL
git0 facebook/react/packages/react-dom
git0 facebook/react --path=packages/react-dom`,
  history: `# A specific branch, tag or commit
git0 facebook/react --branch=v18.2.0

# With the full .git history attached after the download
git0 facebook/react --history

# History only — no working files at all
git0 facebook/react --history-only --mirror`,
  releases: `# Download the latest release for your system
gg user/repo`,
}

type TabKey = keyof typeof codeExamples

const tabLabels: Record<TabKey, string> = {
  search: "Search",
  download: "Download",
  paths: "Partial Paths",
  history: "History",
  releases: "Releases",
}

export function CodeExample() {
  const [activeTab, setActiveTab] = useState<TabKey>("search")
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLElement>(null)

  const copyCode = () => {
    navigator.clipboard.writeText(codeExamples[activeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (codeRef.current) {
      // Remove previous highlighting before applying new highlighting
      delete codeRef.current.dataset.highlighted
      hljs.highlightElement(codeRef.current)
    }
  }, [activeTab])

  return (
    <section className="py-20 md:py-32 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Usage <span className="text-primary">Examples</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            One command to find a repo, download exactly what you need, install it and open it in your editor.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 overflow-x-auto">
              <div className="flex gap-1">
                {(Object.keys(codeExamples) as TabKey[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${activeTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                  >
                    {tabLabels[tab]}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={copyCode} className="gap-2 ml-2 flex-shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre className="p-6 overflow-x-auto text-sm max-h-[400px] overflow-y-auto">
              <code ref={codeRef} className={`font-mono language-bash`} style={{ fontFamily: 'var(--font-mono)' }}>{codeExamples[activeTab]}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
