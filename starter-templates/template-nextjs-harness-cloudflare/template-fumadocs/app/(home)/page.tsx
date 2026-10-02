/**
 * @file page.tsx
 * @description Home page component for the documentation site.
 */
import { HeroSection } from "@/components/DocsHomepage/hero-section"
import { FeaturesGrid } from "@/components/DocsHomepage/features-grid"
import { CodeExample } from "@/components/DocsHomepage/code-example"
import { ComparisonTable } from "@/components/DocsHomepage/comparison-table"
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
      <ComparisonTable />
      <Footer />
    </main>
  )
}
