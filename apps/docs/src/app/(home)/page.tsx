"use client"

import React = require("react")

const { useState, useMemo } = React
type ElementType = React.ElementType
import { categories } from "./packages-data"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { WebGLShader } from "@/components/ui/web-gl-shader"
import KineticGrid from "@/components/ui/kinetic-grid"
import {
  Search,
  Terminal,
  Package,
  Cloud,
  LayoutTemplate,
  ExternalLink,
  Copy,
  Check,
  AppWindow,
  Github,
  BookOpen,
  ArrowRight,
  FileText,
  Server,
  Code,
  Cpu,
  Wand2,
  Database,
  Rocket,
  GitBranch,
  Globe,
  HardDrive,
  Smartphone,
  Palette,
  Image,
  Zap,
  Shield,
  MonitorSmartphone,
  Layers,
  Sparkles,
  X,
} from "lucide-react"
import { SparklesCore } from "@/components/ui/sparkles"

const iconMap: Record<string, ElementType> = {
  FileText, Server, Code, Cpu, Wand2, Database, Rocket, GitBranch,
  Globe, HardDrive, Smartphone, Palette, Image, Zap, Shield,
  MonitorSmartphone, Layers, BookOpen, Cloud,
}

const categoryIconMap: Record<string, ElementType> = {
  app: AppWindow,
  terminal: Terminal,
  package: Package,
  cloud: Cloud,
  template: LayoutTemplate,
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-foreground/10 transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="size-3 text-teal" />
      ) : (
        <Copy className="size-3 text-muted-foreground" />
      )}
    </button>
  )
}

function PackageIcon({ iconName, color }: { iconName: string; color: string }) {
  const Icon = iconMap[iconName]
  if (!Icon) return null

  const colorClasses: Record<string, string> = {
    brand: "bg-brand/10 text-brand border-brand/20",
    teal: "bg-teal/10 text-teal border-teal/20",
    ember: "bg-ember/10 text-ember border-ember/20",
  }

  return (
    <div className={`flex items-center justify-center size-10 rounded-lg border ${colorClasses[color] ?? colorClasses.brand}`}>
      <Icon className="size-5" />
    </div>
  )
}

function PackageCard({
  pkg,
  color,
  index,
  isTemplate = false,
}: {
  pkg: { name: string; description: string; commands: string[]; path: string; icon: string }
  color: string
  index: number
  isTemplate?: boolean
}) {
  const borderHover: Record<string, string> = {
    brand: "hover:border-brand/40",
    teal: "hover:border-teal/40",
    ember: "hover:border-ember/40",
  }

  const gradientBorder: Record<string, string> = {
    brand: "from-transparent via-brand/20 to-transparent",
    teal: "from-transparent via-teal/20 to-transparent",
    ember: "from-transparent via-ember/20 to-transparent",
  }

  return (
    <div
      className={`group relative rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 ${isTemplate ? "template-glow" : "card-glow"} ${borderHover[color] ?? ""} animate-fade-up hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_12px_rgba(255,255,255,0.03)] hover:-translate-y-0.5 will-change-transform`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Dot pattern overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:4px_4px]" />
      </div>

      {/* Gradient border overlay */}
      <div className={`absolute inset-0 -z-10 rounded-xl p-px bg-gradient-to-br ${gradientBorder[color] ?? gradientBorder.brand} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

      <div className="relative p-5">
        <div className="flex items-start gap-3">
          <PackageIcon iconName={pkg.icon} color={color} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate text-sm">{pkg.name}</h3>
              <a
                href={`https://github.com/OpenSourceAGI/starter-app-dev-tools/tree/main/${pkg.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary shrink-0"
                aria-label="View on GitHub"
              >
                <ExternalLink className="size-3.5 text-muted-foreground" />
              </a>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {pkg.description}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pkg.commands.map((cmd, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 rounded-md bg-secondary/70 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors duration-200 group-hover:bg-secondary"
            >
              <span className="text-foreground/60">$</span>
              <span className="truncate max-w-[180px]">{cmd}</span>
              <CopyButton text={cmd} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CategorySection({
  category,
  searchQuery,
}: {
  category: (typeof categories)[0]
  searchQuery: string
}) {
  const filteredPackages = useMemo(() => {
    if (!searchQuery) return category.packages
    const query = searchQuery.toLowerCase()
    return category.packages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(query) ||
        pkg.description.toLowerCase().includes(query)
    )
  }, [category.packages, searchQuery])

  if (filteredPackages.length === 0) return null

  const CatIcon = categoryIconMap[category.iconKey] ?? Package

  const accentClasses: Record<string, string> = {
    brand: "bg-brand/10 text-brand border-brand/20",
    teal: "bg-teal/10 text-teal border-teal/20",
    ember: "bg-ember/10 text-ember border-ember/20",
  }

  const badgeColor: Record<string, string> = {
    brand: "bg-brand/15 text-brand border-brand/25 hover:bg-brand/20",
    teal: "bg-teal/15 text-teal border-teal/25 hover:bg-teal/20",
    ember: "bg-ember/15 text-ember border-ember/25 hover:bg-ember/20",
  }

  return (
    <section className="mb-14">
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`flex items-center justify-center size-10 rounded-lg border ${accentClasses[category.color] ?? accentClasses.brand}`}
        >
          <CatIcon className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{category.name}</h2>
          <p className="text-sm text-muted-foreground">{category.description}</p>
        </div>
        <Badge
          variant="outline"
          className={`ml-auto ${badgeColor[category.color] ?? ""}`}
        >
          {filteredPackages.length}
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPackages.map((pkg, idx) => (
          <PackageCard
            key={pkg.name}
            pkg={pkg}
            color={category.color}
            index={idx}
          />
        ))}
      </div>
    </section>
  )
}

function StarterTemplatesSection({ searchQuery }: { searchQuery: string }) {
  const templateCategory = categories.find((c) => c.iconKey === "template")
  if (!templateCategory) return null

  const filteredPackages = useMemo(() => {
    if (!searchQuery) return templateCategory.packages
    const query = searchQuery.toLowerCase()
    return templateCategory.packages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(query) ||
        pkg.description.toLowerCase().includes(query)
    )
  }, [templateCategory.packages, searchQuery])

  if (filteredPackages.length === 0 && searchQuery) return null

  const allTemplates = filteredPackages
  const nextTemplates = filteredPackages.filter(
    (p) => p.name.toLowerCase().includes("next")
  )
  const svelteTemplates = filteredPackages.filter(
    (p) => p.name.toLowerCase().includes("svelte")
  )
  const docsTemplates = filteredPackages.filter(
    (p) =>
      p.name.toLowerCase().includes("fumadocs") ||
      p.name.toLowerCase().includes("docusaurus")
  )

  return (
    <section className="relative mt-16 mb-14">
      {/* Colored divider line */}
      <div className="absolute inset-x-0 -top-8 h-px bg-gradient-to-r from-transparent via-teal/40 to-transparent" />

      <div className="rounded-2xl border border-teal/20 bg-teal/[0.03] p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center size-10 rounded-lg border bg-teal/10 text-teal border-teal/20">
            <LayoutTemplate className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Starter Templates
            </h2>
            <p className="text-sm text-muted-foreground">
              Production-ready templates to jumpstart your projects
            </p>
          </div>
          <Badge
            variant="outline"
            className="ml-auto bg-teal/15 text-teal border-teal/25"
          >
            {allTemplates.length}
          </Badge>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6 bg-secondary/50">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="nextjs">Next.js</TabsTrigger>
            <TabsTrigger value="svelte">SvelteKit</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allTemplates.map((pkg, idx) => (
                <PackageCard
                  key={pkg.name}
                  pkg={pkg}
                  color="teal"
                  index={idx}
                  isTemplate
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="nextjs">
            {nextTemplates.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {nextTemplates.map((pkg, idx) => (
                  <PackageCard
                    key={pkg.name}
                    pkg={pkg}
                    color="teal"
                    index={idx}
                    isTemplate
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No Next.js templates match your search.
              </p>
            )}
          </TabsContent>

          <TabsContent value="svelte">
            {svelteTemplates.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {svelteTemplates.map((pkg, idx) => (
                  <PackageCard
                    key={pkg.name}
                    pkg={pkg}
                    color="teal"
                    index={idx}
                    isTemplate
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No SvelteKit templates match your search.
              </p>
            )}
          </TabsContent>

          <TabsContent value="docs">
            {docsTemplates.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {docsTemplates.map((pkg, idx) => (
                  <PackageCard
                    key={pkg.name}
                    pkg={pkg}
                    color="teal"
                    index={idx}
                    isTemplate
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No documentation templates match your search.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

export default function DocsHomepage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const totalPackages = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.packages.length, 0)
  }, [])

  const filteredCount = useMemo(() => {
    if (!searchQuery && !activeFilter) return totalPackages
    const query = searchQuery.toLowerCase()
    return categories.reduce((sum, cat) => {
      if (activeFilter && cat.name !== activeFilter) return sum
      return (
        sum +
        cat.packages.filter(
          (pkg) =>
            pkg.name.toLowerCase().includes(query) ||
            pkg.description.toLowerCase().includes(query)
        ).length
      )
    }, 0)
  }, [searchQuery, activeFilter, totalPackages])

  const nonTemplateCategories = categories.filter(
    (c) => c.iconKey !== "template"
  )
  const displayCategories = activeFilter
    ? nonTemplateCategories.filter((c) => c.name === activeFilter)
    : nonTemplateCategories

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="font-bold text-foreground">DevTools</span>
          </div>
          <nav className="flex items-center gap-5">
            <a
              href="https://starterdocs.vtempest.workers.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Demo
            </a>
            <a
              href="https://starterdocs.js.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Docs
            </a>
            <a
              href="https://github.com/OpenSourceAGI/starter-app-dev-tools"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Github className="size-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        {/* WebGL Shader Background */}
        <WebGLShader className="absolute inset-0 opacity-60" />

        {/* Kinetic grid: warps toward the cursor and ripples on click. It wraps the
            hero content so pointer events bubble to it, and `fill={false}` keeps the
            shader visible underneath. */}
        <KineticGrid
          variant="section"
          globalColor="auto"
          fill={false}
          className="relative z-[1]"
        >
          {/* Animated background overlays */}
          <div className="absolute top-1/4 -left-32 size-96 rounded-full bg-brand/8 blur-[100px] orb-1 pointer-events-none" />
          <div className="absolute bottom-1/4 -right-32 size-96 rounded-full bg-teal/8 blur-[100px] orb-2 pointer-events-none" />

          {/* Gradient edge fade */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
            <div className="text-center">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 mb-6">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-brand" />
                </span>
                <span className="text-sm font-medium text-brand">
                  {totalPackages} packages available
                </span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-7xl text-balance hero-glow">
                Developer Tools
              </h1>
            
              {/* Sparkles effect under title */}
              <div className="w-full max-w-xl mx-auto h-20 relative mt-2">
                {/* Gradients */}
                <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-brand to-transparent h-[2px] w-3/4 blur-sm" />
                <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-brand to-transparent h-px w-3/4" />
                <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-teal to-transparent h-[5px] w-1/4 blur-sm" />
                <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-teal to-transparent h-px w-1/4" />

                {/* Core sparkles component */}
                <SparklesCore
                  background="transparent"
                  minSize={0.4}
                  maxSize={1}
                  particleDensity={1200}
                  className="w-full h-full"
                  particleColor="#FFFFFF"
                />

                {/* Radial Gradient to prevent sharp edges */}
                <div className="absolute inset-0 w-full h-full [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]" style={{ backgroundColor: 'var(--background)' }}></div>
              </div>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
                Comprehensive docs for CLI tools, libraries, apps, and
                production-ready starter templates. Jumpstart your development.
              </p>

              {/* Stats row */}
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                {categories.map((cat) => {
                  const CatIcon = categoryIconMap[cat.iconKey] ?? Package
                  const colorBg: Record<string, string> = {
                    brand: "border-brand/30 bg-brand/10 text-brand",
                    teal: "border-teal/30 bg-teal/10 text-teal",
                    ember: "border-ember/30 bg-ember/10 text-ember",
                  }
                  return (
                    <div
                      key={cat.name}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 ${colorBg[cat.color] ?? colorBg.brand}`}
                    >
                      <CatIcon className="size-4" />
                      <span className="text-sm font-medium">
                        {cat.packages.length} {cat.name}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* CTA */}
              <div className="mt-8 flex justify-center gap-3">
                <a
                  href="https://github.com/OpenSourceAGI/starter-app-dev-tools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                  Get Started
                  <ArrowRight className="size-4" />
                </a>
                <a
                  href="https://starterdocs.js.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Read Docs
                </a>
              </div>
            </div>
          </div>
        </KineticGrid>
      </section>

      {/* Search + Category Filter */}
      <section className="sticky top-14 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search packages, tools, templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border focus:bg-background"
              />
              {searchQuery && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {filteredCount} results
                </span>
              )}
            </div>

            {/* Category badges filter */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveFilter(null)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  activeFilter === null
                    ? "border-foreground/30 bg-foreground/10 text-foreground"
                    : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-foreground/20"
                }`}
              >
                All
              </button>
              {nonTemplateCategories.map((cat) => {
                const isActive = activeFilter === cat.name
                const CatIcon = categoryIconMap[cat.iconKey] ?? Package
                const activeColor: Record<string, string> = {
                  brand: "border-brand/40 bg-brand/15 text-brand",
                  teal: "border-teal/40 bg-teal/15 text-teal",
                  ember: "border-ember/40 bg-ember/15 text-ember",
                }
                return (
                  <button
                    key={cat.name}
                    onClick={() =>
                      setActiveFilter(isActive ? null : cat.name)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      isActive
                        ? activeColor[cat.color] ?? ""
                        : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-foreground/20"
                    }`}
                  >
                    <CatIcon className="size-3" />
                    {cat.name}
                  </button>
                )
              })}
              {activeFilter && (
                <button
                  onClick={() => setActiveFilter(null)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear filter"
                >
                  <X className="size-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {displayCategories.map((category) => (
          <CategorySection
            key={category.name}
            category={category}
            searchQuery={searchQuery}
          />
        ))}

        {/* Starter Templates - separate colored section with tabs */}
        {!activeFilter && (
          <StarterTemplatesSection searchQuery={searchQuery} />
        )}

        {searchQuery && filteredCount === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-secondary mb-4">
              <Search className="size-5 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              No packages found matching &quot;{searchQuery}&quot;
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-2 text-sm text-brand hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-brand text-brand-foreground">
                <Sparkles className="size-3" />
              </div>
              <p className="text-sm text-muted-foreground">
                Built with Next.js, Tailwind CSS, and shadcn/ui
              </p>
            </div>
            <div className="flex items-center gap-5">
              <a
                href="https://discord.gg/SJdBqBz3tV"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Discord
              </a>
              <a
                href="https://github.com/OpenSourceAGI/starter-app-dev-tools/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Discussions
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
