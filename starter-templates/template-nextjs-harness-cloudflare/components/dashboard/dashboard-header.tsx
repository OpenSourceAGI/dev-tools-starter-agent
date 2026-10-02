"use client"

import { Bell, Menu, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeDropdown } from "@/components/theme/theme-dropdown"
import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function DashboardHeader() {
    return (
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
            <div className="flex items-center gap-4">
                {/* Mobile Menu via Sheet - user requested */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="lg:hidden">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                                    <Activity className="h-4 w-4 text-primary-foreground" />
                                </div>
                                <span className="text-lg font-semibold">PrimoAgent</span>
                            </Link>
                        </div>
                        <nav className="flex flex-col gap-1 p-4">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2 text-sm font-medium"
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/dashboard?tab=analytics"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground"
                            >
                                Analysis
                            </Link>
                            <Link
                                href="/dashboard/agents"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground"
                            >
                                Agents
                            </Link>
                            <Link
                                href="/dashboard/reports"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground"
                            >
                                Reports
                            </Link>
                        </nav>
                    </SheetContent>
                </Sheet>

                {/* Integrating SidebarTrigger for Desktop/Tablet if needed, or stick to user request. 
            User provided code didn't have SidebarTrigger but layout expects it for collapsibility.
            I will add SidebarTrigger hidden on mobile to avoid double menu triggers if this header lives inside SidebarInset.
        */}
                <SidebarTrigger className="hidden lg:flex" />
            </div>

            <div className="flex items-center gap-3">
                <Select defaultValue="paper">
                    <SelectTrigger className="w-[120px] h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="paper">📝 Paper</SelectItem>
                        <SelectItem value="live">🔴 Live</SelectItem>
                    </SelectContent>
                </Select>

                <ThemeDropdown />

                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                </Button>

                <Avatar className="h-8 w-8 border border-border">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">TT</AvatarFallback>
                </Avatar>
            </div>
        </header>
    )
}
