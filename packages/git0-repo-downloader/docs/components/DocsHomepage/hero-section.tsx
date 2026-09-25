/**
 * @file hero-section.tsx
 * @description Hero section for the git0 landing page: tagline, preview media and install commands.
 */
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Github, BookOpen, Check, Sparkles } from "lucide-react"
import { useState } from "react"

const installCommands = {
  bun: "bun install -g git0",
  npm: "npm install -g git0",
  npx: "npx git0 react starter",
}

type InstallTab = keyof typeof installCommands

export function HeroSection() {
  const [activeTab, setActiveTab] = useState<InstallTab>("bun")
  const [copied, setCopied] = useState(false)

  const copyCommand = () => {
    navigator.clipboard.writeText(installCommands[activeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="installation" className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 animated-grid-bg" />
      <div className="absolute inset-0 grid-glow" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

      <div className="container mx-auto px-4 pt-12 relative">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/30 text-primary gap-2">
            <Sparkles className="h-4 w-4" />
            Download Git Repo on Step Zero
          </Badge>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <span className="shimmer-text">git0</span>
          </h1>

          <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mb-6 text-pretty">
            CLI tool to search GitHub repositories, download source &amp; releases, and instantly set up projects with{" "}
            <span className="text-primary font-semibold">automatic dependency installation and editor opening</span>
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <a href="https://www.npmjs.com/package/git0" target="_blank" rel="noreferrer">
              <img alt="NPM Version" src="https://img.shields.io/npm/v/git0.svg" />
            </a>
            <a href="https://www.npmjs.com/package/git0" target="_blank" rel="noreferrer">
              <img alt="NPM Monthly Downloads" src="https://img.shields.io/npm/dm/git0.svg" />
            </a>
            <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions" target="_blank" rel="noreferrer">
              <img alt="GitHub Discussions" src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" />
            </a>
            <a href="https://github.blog/developer-skills/github/beginners-guide-to-github-creating-a-pull-request/" target="_blank" rel="noreferrer">
              <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
            </a>
          </div>

          <div className="flex flex-col items-center gap-3 mb-8 w-full max-w-xl">
            <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
              {(Object.keys(installCommands) as InstallTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
            <div
              onClick={copyCommand}
              className="flex w-full items-center justify-between gap-3 bg-card border border-border rounded-lg px-4 py-3 cursor-pointer hover:border-primary/50 transition-colors group"
            >
              <code className="font-mono text-base text-foreground">{installCommands[activeTab]}</code>
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
            <Button onClick={() => window.location.href = "/docs"} size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <BookOpen className="h-4 w-4" />
              Documentation
            </Button>
            <Button onClick={() => window.location.href = "https://github.com/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/git0-repo-downloader"} variant="outline" size="lg" className="gap-2 bg-transparent">
              <Github className="h-4 w-4" />
              GitHub
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-12">
            <img src="https://i.imgur.com/Io3ukRC.gif" alt="git0 live preview" className="w-full rounded-xl border border-border" />
            <img src="https://i.imgur.com/6l9esbL.png" alt="git0 preview" className="w-full rounded-xl border border-border" />
          </div>
        </div>
      </div>
    </section>
  )
}
