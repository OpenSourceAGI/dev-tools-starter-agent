"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
    Activity,
    Menu,
    X,
    Users,
    GitBranch,
    LogIn,
    Target,
    Radio,
    TrendingUp,
    Sparkles,
    Calendar,
} from "lucide-react"
import { useState } from "react"
import { ThemeDropdown } from "@/components/theme/theme-dropdown"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Acme Inc"; // Fallback if env is missing


export function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const navLinkClasses = "flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted-foreground transition-all hover:font-medium hover:text-foreground hover:bg-accent hover:text-accent-foreground hover:rounded-md px-2 py-1 -mx-2 -my-1"
    const mobileNavLinkClasses = "flex items-center gap-2 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground hover:rounded-md px-2 py-1 -mx-2 -my-1"

    return (
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/75 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2">
                    {/* Replaced Image with Icon if image is missing, or keep Image if user has it. user provided code uses Image /apple-touch-icon.png. I'll stick to their code but add fallback if needed or just use it. */}
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden">
                        {/* Note: User code uses /apple-touch-icon.png. If it doesn't exist, Next/Image might complain or show broken. 
                 Safe fallback: Use Lucide icon if image fails? No, user explicitly asked for this code.
                 I will use their code but wrap Image in a way that respects the user request. 
                 Actually, I'll check if public/apple-touch-icon.png exists. If not, I might want to use a placeholder or the code as is.
             */}
                        <Image
                            src="/apple-touch-icon.png"
                            alt="Logo"
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                                // Fallback to icon? difficult in SSR/Hydration safe way without state. 
                                // I'll stick to the code provided.
                            }}
                        />
                    </div>
                    <span className="text-xl font-semibold text-foreground">{APP_NAME}</span>
                </Link>

                <nav className="hidden items-center gap-6 md:flex">
                    <Link
                        href="#features"
                        className={navLinkClasses}
                    >
                        <Users className="h-4 w-4" />
                        Features
                    </Link>
                    <Link
                        href="#solutions"
                        className={navLinkClasses}
                    >
                        <Sparkles className="h-4 w-4" />
                        Solutions
                    </Link>
                    <Link
                        href="#pricing"
                        className={navLinkClasses}
                    >
                        <TrendingUp className="h-4 w-4" />
                        Pricing
                    </Link>

                    <Link
                        href="#about"
                        className={navLinkClasses}
                    >
                        <Target className="h-4 w-4" />
                        About
                    </Link>

                    <Link
                        href="/docs"
                        className={navLinkClasses}
                    >
                        <Sparkles className="h-4 w-4" />
                        Docs
                    </Link>
                </nav>

                <div className="hidden items-center gap-3 md:flex">
                    <ThemeDropdown />

                    <Link href="/login" rel="noopener noreferrer">
                        <button className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
                            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-green-600 dark:bg-green-700 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl space-x-2">
                                <LogIn className="h-5 w-5" />
                                <span>Login</span>
                            </span>
                        </button>
                    </Link>
                </div>

                <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
                </button>
            </div>

            {mobileMenuOpen && (
                <div className="border-t border-border bg-background px-4 py-4 md:hidden">
                    <nav className="flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-2">
                            <span className="text-sm font-medium">Theme</span>
                            <ThemeDropdown />
                        </div>

                        <Link
                            href="#features"
                            className={navLinkClasses}
                        >
                            <Users className="h-4 w-4" />
                            Features
                        </Link>

                        <Link
                            href="#solutions"
                            className={navLinkClasses}
                        >
                            <Sparkles className="h-4 w-4" />
                            Solutions
                        </Link>

                        <Link
                            href="#pricing"
                            className={navLinkClasses}
                        >
                            <TrendingUp className="h-4 w-4" />
                            Pricing
                        </Link>

                        <Link
                            href="#about"
                            className={navLinkClasses}
                        >
                            <Target className="h-4 w-4" />
                            About
                        </Link>

                        <Link
                            href="/docs"
                            className={navLinkClasses}
                        >
                            <Sparkles className="h-4 w-4" />
                            Docs
                        </Link>

                        <div className="pt-4">
                            <Link href="/login" className="block">
                                <button className="relative inline-flex h-12 w-full overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
                                    <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                                    <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-green-600 dark:bg-green-700 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl space-x-2">
                                        <LogIn className="h-5 w-5" />
                                        <span>Login</span>
                                    </span>
                                </button>
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    )
}
