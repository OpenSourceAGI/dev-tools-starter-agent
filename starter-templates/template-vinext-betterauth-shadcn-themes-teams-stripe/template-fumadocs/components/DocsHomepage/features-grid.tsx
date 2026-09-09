/**
 * @file features-grid.tsx
 * @description Grid component displaying the key features and benefits of GRAB, grouped by category.
 */
import Image from "next/image"
import {
  Zap,
  Database,
  RefreshCw,
  Bug,
  Shield,
  Clock,
  Layers,
  Infinity,
  Globe,
  HardDrive,
  RotateCcw,
  Boxes,
  Terminal,
  FileCode,
  Gauge,
  Repeat,
  Upload,
  Network,
  Play,
  FlaskConical,
  FileArchive,
  CodeXml,
  Blocks,
} from "lucide-react"

const featureCategories = [
  {
    category: "Requests & Responses",
    tagline: "Send anything, get back usable data",
    features: [
      {
        icon: Zap,
        title: "Auto-JSON Convert",
        description: "Pass parameters and get response or error in JSON, handling other data types automatically.",
      },
      {
        icon: FileArchive,
        title: "Auto-Unzip",
        description: "Automatically extracts ZIP responses into { data: { filename: content } }. Set unzip: false to disable.",
      },
      {
        icon: CodeXml,
        title: "DOM Parsing",
        description: 'Automatically parses HTML responses. Pass dom: "selector" for CSS extraction or dom: false to disable.',
      },
      {
        icon: Upload,
        title: "File Upload",
        description: "FormData support with base64 conversion option for JSON APIs.",
      },
      {
        icon: Network,
        title: "Request Hooks",
        description: "Global onRequest interceptor for auth headers and request modification.",
      },
    ],
  },
  {
    category: "Reliability & Control",
    tagline: "Never let a flaky network break the UI",
    features: [
      {
        icon: Clock,
        title: "Timeout & Retry",
        description: "Configurable timeout (default 30s) with retryAttempts for auto-retry on failure.",
      },
      {
        icon: RotateCcw,
        title: "Regrab On Error",
        description: "Auto-retry on timeout, window refocus, network change, or stale data.",
      },
      {
        icon: Shield,
        title: "Cancel Duplicates",
        description: "cancelOngoingIfNew or cancelNewIfOngoing prevents request cascading.",
      },
      {
        icon: Gauge,
        title: "Rate Limiting",
        description: "Built-in rate limiting prevents multi-click cascading responses.",
      },
    ],
  },
  {
    category: "Performance & Data Flow",
    tagline: "Fewer round trips, fresher data",
    features: [
      {
        icon: HardDrive,
        title: "Frontend Cache",
        description: "Set cache: true for instant repeat requests from browser memory.",
      },
      {
        icon: Infinity,
        title: "Infinite Scroll",
        description: "Built-in pagination that auto-loads and merges next page on scroll.",
      },
      {
        icon: Repeat,
        title: "Repeat & Poll",
        description: "Repeat request X times or poll every X seconds for live updates.",
      },
    ],
  },
  {
    category: "Framework Integration",
    tagline: "Drop into any app, typed end to end",
    features: [
      {
        icon: RefreshCw,
        title: "Reactive Loading",
        description: "Sets .isLoading=true on response object for React, Vue, Svelte — any framework works.",
      },
      {
        icon: Boxes,
        title: "Framework Agnostic",
        description: "Works anywhere — React, Vue, Svelte, vanilla JS. No lifecycle hooks needed.",
      },
      {
        icon: FileCode,
        title: "TypeScript Tooltips",
        description: "Full type inference with hover tooltips and autocomplete for options.",
      },
      {
        icon: Globe,
        title: "Instance Config",
        description: "Create separate instances with grab.instance() for different APIs.",
      },
    ],
  },
  {
    category: "Debugging & Testing",
    tagline: "See every request, fake the ones you need",
    features: [
      {
        icon: Bug,
        title: "Debug Logging",
        description: "Global log() prints colored JSON structure, response timing. Ctrl+I opens DevTools overlay.",
      },
      {
        icon: Database,
        title: "Mock Server",
        description: "Configure grab.mock for dev/testing. Supports conditional responses and delays.",
      },
      {
        icon: Layers,
        title: "Request History",
        description: "All requests stored in grab.log for debugging and analytics.",
      },
      {
        icon: FlaskConical,
        title: "Jest Testing",
        description: "Easy unit testing with mock setup and grab.log assertions.",
      },
      {
        icon: Terminal,
        title: "CLI Testing",
        description: "npm i -g grab-url for command line API testing with params and JSON payloads.",
      },
    ],
  },
  {
    category: "Server & Codegen",
    tagline: "Same tool outside the browser",
    features: [
      {
        icon: Play,
        title: "Proxy Support",
        description: "Node.js proxy support with HttpsProxyAgent for server-side requests.",
      },
      {
        icon: Blocks,
        title: "OpenAPI SDKs",
        description: "Generate a typed client or MCP server from any OpenAPI spec — every endpoint gets caching, retries and mocks.",
      },
    ],
  },
]

const featureCount = featureCategories.reduce((total, { features }) => total + features.length, 0)

/** Running card index per category, so the staggered entry animation flows across the whole grid. */
const animationOffsets = featureCategories.reduce<number[]>(
  (offsets, { features }, index) => [...offsets, offsets[index] + features.length],
  [0],
)

export function FeaturesGrid() {
  return (
    <section className="relative py-20 md:py-32 border-b border-border overflow-hidden">
      <div className="absolute inset-0 animated-grid-bg opacity-30" />

      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 mb-16">
          <div className="relative" style={{ animation: "float 6s ease-in-out infinite" }}>
            <Image
              src="https://i.imgur.com/RH80JGZ.png"
              alt="GRAB - Generate Request to API from Browser"
              width={200}
              height={200}
              className="drop-shadow-2xl"
            />
          </div>
          <div className="text-center md:text-left max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              GRAB is the FBEST Request Manager: Functionally Brilliant, Elegantly Simple Tool
            </h2>
            <p className="text-muted-foreground text-lg">
              {featureCount}+ features packed into 4KB. No bloat, no dependencies, just pure functionality.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-12">
          {featureCategories.map(({ category, tagline, features }, categoryIndex) => (
            <div key={category}>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-3 gap-y-1 mb-5">
                <h3 className="text-xl md:text-2xl font-bold text-foreground">{category}</h3>
                <p className="text-sm text-muted-foreground">{tagline}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {features.map((feature, featureIndex) => (
                  <div
                    key={feature.title}
                    className="animated-border-card group p-5 hover:bg-card/80 transition-all duration-300"
                    style={{ animationDelay: `${(animationOffsets[categoryIndex] + featureIndex) * 0.05}s` }}
                  >
                    <div className="relative z-10">
                      <feature.icon className="h-7 w-7 text-primary mb-3 group-hover:scale-110 transition-transform duration-300" />
                      <h4 className="font-semibold mb-1.5 text-foreground text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
