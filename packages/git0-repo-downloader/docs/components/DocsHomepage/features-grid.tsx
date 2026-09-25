/**
 * @file features-grid.tsx
 * @description Grid of git0's core features, each with an example command.
 */
import Image from "next/image"
import { Search, Download, Package, Zap, Code, Shield } from "lucide-react"

const coreFeatures = [
  {
    icon: Search,
    title: "Search GitHub Repositories",
    description: "Search repositories by name with intelligent fuzzy matching and instant results",
    example: "git0 react starter",
  },
  {
    icon: Download,
    title: "Direct Repository Download",
    description: "Download from GitHub URLs or owner/repo shortcuts. Skip the manual git clone dance",
    example: "git0 facebook/react",
  },
  {
    icon: Package,
    title: "Git Release Package Manager",
    description: "Instantly download latest release binaries for your system or all platforms",
    example: "gg user/repo",
  },
  {
    icon: Zap,
    title: "Automatic Dependency Installation",
    description: "Smart detection and installation of dependencies for multiple project types",
    example: "Auto-detects package.json, requirements.txt, Cargo.toml",
  },
  {
    icon: Code,
    title: "Smart IDE Integration",
    description: "Automatically opens projects in Cursor, Windsurf, VS Code, or your preferred editor",
    example: "Opens in cursor, windsurf, code, nvim",
  },
  {
    icon: Shield,
    title: "Conflict Resolution",
    description: "Handles directory naming conflicts automatically with smart numbering",
    example: "react → react-2 → react-3",
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="relative py-20 md:py-32 border-b border-border overflow-hidden">
      <div className="absolute inset-0 animated-grid-bg opacity-30" />

      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 mb-16">
          <div className="relative" style={{ animation: "float 6s ease-in-out infinite" }}>
            <Image
              src="https://i.imgur.com/857meew.png"
              alt="git0 logo"
              width={160}
              height={160}
              className="drop-shadow-2xl"
            />
          </div>
          <div className="text-center md:text-left max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The Proper Protocol to Download a Git Repo
            </h2>
            <p className="text-muted-foreground text-lg">
              Skip the manual &quot;git clone, cd, install&quot; dance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreFeatures.map((feature, index) => (
            <div
              key={feature.title}
              className="animated-border-card group p-6 hover:bg-card/80 transition-all duration-300"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="relative z-10">
                <feature.icon className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-semibold mb-2 text-foreground text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{feature.description}</p>
                <code className="text-xs text-primary bg-secondary px-2 py-1 rounded font-mono">{feature.example}</code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
