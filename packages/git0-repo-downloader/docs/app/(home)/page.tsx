/**
 * @file page.tsx
 * @description git0 landing page.
 */
import { HeroSection } from "@/components/DocsHomepage/hero-section"
import { FeaturesGrid } from "@/components/DocsHomepage/features-grid"
import { CodeExample } from "@/components/DocsHomepage/code-example"
import { ProjectTypes } from "@/components/DocsHomepage/project-types"
import { Footer } from "@/components/DocsHomepage/footer"
import { Inter } from "next/font/google"
import "./docs-home.css"

const inter = Inter({
  subsets: ['latin'],
});

export default function Home() {
  return (
    <main className={`${inter.className} min-h-screen bg-background`}>
      <HeroSection />
      <FeaturesGrid />
      <CodeExample />
      <ProjectTypes />
      <Footer />
    </main>
  )
}
