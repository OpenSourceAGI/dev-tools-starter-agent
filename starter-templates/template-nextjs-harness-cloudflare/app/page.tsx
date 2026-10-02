"use client"

import Link from "next/link"
import { ArrowRight, Palette, Moon, Shield, CreditCard, BarChart3, Smartphone, BookOpen, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container mx-auto flex max-w-[64rem] flex-col items-center gap-4 text-center">
            <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
              Build your next idea even faster.
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Beautifully designed components built with Radix UI and Tailwind CSS. Accessible. Customizable. Open
              Source.
            </p>
            <div className="space-x-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-11 px-8">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline" size="lg" className="h-11 px-8 bg-transparent">
                  Documentation
                </Button>
              </Link>
            </div>
          </div>
        </section>
        <section
          id="features"
          className="container mx-auto space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24"
        >
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">Features</h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              This template comes with everything you need to start your next project.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <Card>
              <CardHeader>
                <Palette className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>Stunning UI</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Premium interface built with Tailwind CSS and Shadcn UI component library. Every element is carefully
                  crafted with attention to spacing, typography, and visual hierarchy for a professional, polished
                  appearance.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Moon className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>50+ Colorful Themes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Choose from over 50 beautiful pre-designed color themes including light, dark, and vibrant variants.
                  Powered by next-themes with instant switching, automatic system preference detection, and persistent
                  user selections. Each theme is carefully crafted for optimal contrast and accessibility.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>Secure Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Enterprise-grade authentication powered by better-auth with support for social login providers
                  (Google, GitHub) and Sign-In With Ethereum (SIWE). Includes session management, CSRF protection, and
                  secure token handling out of the box.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CreditCard className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>Stripe Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Full-featured payment processing with Stripe integration. Handle subscriptions, one-time payments,
                  invoicing, and customer management. Includes pre-built billing UI, webhook handlers, and subscription
                  tier management.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <BarChart3 className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>Interactive Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Comprehensive analytics dashboard with beautiful chart visualizations using Recharts. Display key
                  metrics, revenue trends, user activity, and custom KPIs with responsive, interactive graphs that look
                  great on any device.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Smartphone className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>Fully Responsive</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Mobile-first responsive design that adapts beautifully to any screen size. Optimized layouts for
                  phones, tablets, and desktops with touch-friendly interfaces and efficient use of screen real estate
                  at every breakpoint.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <BookOpen className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>Documentation Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Integrated documentation system powered by fumadocs with full-text search, syntax highlighting, and
                  MDX support. Perfect for API docs, guides, and knowledge bases with automatic navigation generation
                  and versioning support.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Cpu className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>AI Ready</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Pre-configured infrastructure for AI integration with easy LLM provider setup in settings. Connect to
                  OpenAI, Anthropic, or other AI services with built-in API key management, rate limiting, and usage
                  tracking.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
        <section id="cta" className="border-t">
          <div className="container mx-auto flex flex-col items-center gap-4 py-24 text-center md:py-32">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">Ready to get started?</h2>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Start building your next project today with our free template.
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="h-11 px-8">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
