/**
 * @file footer.tsx
 * @description Footer component for the git0 landing page.
 */
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Github, BookOpen, MessageCircle, GitBranch } from "lucide-react"

export function Footer() {
  return (
    <footer className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-balance">
            Download Git Repo on <span className="text-primary">Step Zero</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Skip the manual &quot;git clone, cd, install&quot; dance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/docs">
              <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <BookOpen className="h-4 w-4" />
                Read the Docs
              </Button>
            </Link>
            <Link href="https://github.com/OpenSourceAGI/dev-tools-starter-agent" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg" className="gap-2 bg-transparent">
                <Github className="h-4 w-4" />
                Star on GitHub
              </Button>
            </Link>
            <Link href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg" className="gap-2 bg-transparent">
                <GitBranch className="h-4 w-4" />
                Discussions
              </Button>
            </Link>
            <Link href="https://discord.gg/SJdBqBz3tV" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg" className="gap-2 bg-transparent">
                <MessageCircle className="h-4 w-4" />
                Discord
              </Button>
            </Link>
          </div>

          <div className="border-t border-border pt-8">
            <p className="text-muted-foreground text-sm">🌟 Star this repo so it will grow and get updates!</p>
            <p className="text-muted-foreground text-sm mt-2">
              MIT License — Made by <a href="https://github.com/vtempest" className="text-primary hover:underline">vtempest</a> with ❤️ for the developer community
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
