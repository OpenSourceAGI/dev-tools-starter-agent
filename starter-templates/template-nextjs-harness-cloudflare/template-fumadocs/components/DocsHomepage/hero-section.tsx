/**
 * @file hero-section.tsx
 * @description Hero section component for the documentation landing page.
 */
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Github, BookOpen, Check } from "lucide-react"
import { useState } from "react"
import Image from "next/image"

export function HeroSection() {
  const [copied, setCopied] = useState(false)

  const copyCommand = () => {
    navigator.clipboard.writeText("npm i grab-url")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 animated-grid-bg" />
      <div className="absolute inset-0 grid-glow" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

      <div className="container mx-auto px-4  relative">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* <div className="mb-8 relative" style={{ animation: "float 6s ease-in-out infinite" }}>
            <Image
              src="https://i.imgur.com/RH80JGZ.png"
              alt="GRAB - Generate Request to API from Browser"
              width={200}
              height={200}
              className="drop-shadow-2xl"
            />
          </div> */}

          <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/30 text-primary">
            v1.0 — Zero Dependencies, 4KB
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance mb-4">
            Why <span className="line-through text-muted-foreground">fetch</span> when you can just
          </h1>
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <span className="shimmer-text">GRAB</span>
            <span className="text-primary">?</span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground mb-2 font-mono">
            Generate Request {"{"}to: <span className="text-primary">API</span> from:{" "}
            <span className="text-foreground">Browser</span>
            {"}"}
          </p>


          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mb-6 text-pretty">
            Functionally Brilliant, Elegantly Simple. One function, no dependencies, minimalist syntax with more
            features than alternatives.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <a href="https://npmjs.org/package/grab-url" target="_blank" rel="noreferrer">
              <img alt="NPM Version" src="https://img.shields.io/npm/v/grab-url" />
            </a>
            <a href="https://github.com/vtempest/GRAB-URL/discussions" target="_blank" rel="noreferrer">
              <img alt="GitHub Discussions" src="https://img.shields.io/github/discussions/vtempest/GRAB-URL" />
            </a>
            <a href="https://github.blog/developer-skills/github/beginners-guide-to-github-creating-a-pull-request/" target="_blank" rel="noreferrer">
              <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
            </a>
          </div>


          <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
            <Button onClick={() => window.location.href = "/docs"} size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <BookOpen className="h-4 w-4" />
              Documentation
            </Button>

            <div
              onClick={copyCommand}
              className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2.5 cursor-pointer hover:border-primary/50 transition-colors group"
            >
              <code className="font-mono text-sm text-foreground">npm i grab-url</code>
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </div>

            <Button onClick={() => window.location.href = "https://github.com/vtempest/grab-url"} variant="outline" size="lg" className="gap-2 bg-transparent">
              <Github className="h-4 w-4" />
              GitHub
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
