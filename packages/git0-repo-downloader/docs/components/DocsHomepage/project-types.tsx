/**
 * @file project-types.tsx
 * @description Supported project types, supported IDEs and the post-download workflow.
 */
import { Package, Layers, FileCode, Settings, Play, Download, Search, Code } from "lucide-react"

const projectTypes = [
  { name: "Node.js", file: "package.json", install: "bun install (fallback to npm)", icon: Package },
  { name: "Docker", file: "Dockerfile, docker-compose.yml", install: "docker-compose up -d", icon: Layers },
  { name: "Python", file: "requirements.txt, setup.py", install: "Virtual env + pip install", icon: FileCode },
  { name: "Rust", file: "Cargo.toml", install: "cargo build", icon: Settings },
  { name: "Go", file: "go.mod", install: "go mod tidy", icon: Play },
]

const supportedIDEs = [
  { name: "Cursor", command: "cursor" },
  { name: "Windsurf", command: "windsurf" },
  { name: "VS Code", command: "code" },
  { name: "Code Server", command: "code-server" },
  { name: "Neovim", command: "nvim" },
]

const workflowSteps = [
  { step: "1", title: "Repository Downloaded", desc: "To your current directory", icon: Download },
  { step: "2", title: "Project Type Detected", desc: "Automatically identified", icon: Search },
  { step: "3", title: "Dependencies Installed", desc: "Based on project type", icon: Package },
  { step: "4", title: "IDE Launched", desc: "Opens in preferred editor", icon: Code },
  { step: "5", title: "Dev Server Started", desc: "For Node.js projects", icon: Play },
]

export function ProjectTypes() {
  return (
    <section id="workflow" className="py-20 md:py-32 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Supported <span className="text-primary">Project Types</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            git0 detects the project and runs the right installer for it.
          </p>
        </div>

        <div className="max-w-4xl mx-auto overflow-x-auto mb-16">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 font-semibold text-foreground">Project Type</th>
                <th className="text-left py-4 px-4 font-semibold text-foreground">Detection</th>
                <th className="text-left py-4 px-4 font-semibold text-foreground">Installation</th>
              </tr>
            </thead>
            <tbody>
              {projectTypes.map((type, rowIndex) => (
                <tr key={type.name} className={`border-b border-border ${rowIndex % 2 === 0 ? "bg-card/50" : ""}`}>
                  <td className="py-4 px-4 font-semibold text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <type.icon className="h-5 w-5 text-primary" />
                      {type.name}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-muted-foreground"><code className="text-sm">{type.file}</code></td>
                  <td className="py-4 px-4 text-muted-foreground"><code className="text-sm">{type.install}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mb-8">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">Supported IDEs</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {supportedIDEs.map((ide) => (
              <div key={ide.name} className="bg-card border border-border rounded-lg px-4 py-2">
                <span className="font-semibold text-foreground">{ide.name}</span>{" "}
                <code className="text-xs text-primary">{ide.command}</code>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-16 mb-10">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">What Happens After Download</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 max-w-5xl mx-auto">
          {workflowSteps.map((step) => (
            <div key={step.step} className="text-center group">
              <div className="relative mb-4 w-16 h-16 mx-auto">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-card border border-border rounded-full flex items-center justify-center text-sm font-bold text-foreground">
                  {step.step}
                </div>
              </div>
              <h4 className="font-semibold mb-1 text-foreground">{step.title}</h4>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-card border border-border rounded-xl p-6 max-w-2xl mx-auto">
            <p className="text-muted-foreground mb-4">
              <strong className="text-primary">Conflict Resolution:</strong> If a directory with the same name exists,
              git0 automatically appends a number
            </p>
            <code className="text-sm bg-secondary px-4 py-2 rounded">react-app → react-app-2 → react-app-3</code>
          </div>
        </div>
      </div>
    </section>
  )
}
