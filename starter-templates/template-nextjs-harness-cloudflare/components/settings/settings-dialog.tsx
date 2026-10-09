"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
  Brain,
  Database,
  ExternalLink,
  Eye,
  CreditCard,
  EyeOff,
  Key,
  Monitor,
  Moon,
  Palette,
  Save,
  Sun,
  TrendingUp,
  Users,
  Copy,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { TeamsManager } from "@/components/settings/teams-manager"
import { PremiumUpgrade } from "@/components/settings/premium-upgrade"

const LLM_PROVIDERS = [
  {
    name: "XAI",
    models: "Grok, Grok Vision",
    docs: "https://docs.x.ai/docs#models",
    keys: "https://console.x.ai/",
    field: "xaiApiKey",
  },
  {
    name: "Groq",
    models: "Llama, DeepSeek, Gemini, Mistral",
    docs: "https://console.groq.com/docs/overview",
    keys: "https://console.groq.com/keys",
    field: "groqApiKey",
  },
  {
    name: "Ollama",
    models: "llama, mistral, mixtral, vicuna, gemma, qwen, deepseek",
    docs: "https://ollama.com/docs",
    keys: "https://ollama.com/settings/keys",
    field: "ollamaEndpoint",
    isEndpoint: true,
  },
  {
    name: "OpenAI",
    models: "o1, o1-mini, o4, gpt-4, gpt-4-turbo, gpt-4-omni",
    docs: "https://platform.openai.com/docs/overview",
    keys: "https://platform.openai.com/api-keys",
    field: "openaiApiKey",
  },
  {
    name: "Anthropic",
    models: "Claude Sonnet, Claude Opus, Claude Haiku",
    docs: "https://docs.anthropic.com/en/docs/welcome",
    keys: "https://console.anthropic.com/settings/keys",
    field: "anthropicApiKey",
  },
  {
    name: "TogetherAI",
    models: "Llama, Mistral, Mixtral, Qwen, Gemma, WizardLM",
    docs: "https://docs.together.ai/docs/quickstart",
    keys: "https://api.together.xyz/settings/api-keys",
    field: "togetheraiApiKey",
  },
  {
    name: "Perplexity",
    models: "Sonar, Sonar Deep Research",
    docs: "https://docs.perplexity.ai/models/model-cards",
    keys: "https://www.perplexity.ai/account/api/keys",
    field: "perplexityApiKey",
  },
  {
    name: "Cloudflare",
    models: "Llama, Gemma, Mistral, Phi, Qwen, DeepSeek",
    docs: "https://developers.cloudflare.com/workers-ai/",
    keys: "https://dash.cloudflare.com/profile/api-tokens",
    field: "cloudflareApiKey",
  },
  {
    name: "Google",
    models: "Gemini",
    docs: "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models",
    keys: "https://cloud.google.com/vertex-ai/generative-ai/docs/start/express-mode/overview#api-keys",
    field: "googleApiKey",
  },
]



const themeNames = [
  "modern-minimal",
  "pink-lemonade",
  "twitter",
  "mocha-mousse",
  "bubblegum",
  "amethyst-haze",
  "notebook",
  "doom-64",
  "catppuccin",
  "graphite",
  "perpetuity",
  "kodama-grove",
  "cosmic-night",
  "tangerine",
  "quantum-rose",
  "nature",
  "bold-tech",
  "elegant-luxury",
  "amber-minimal",
  "supabase",
  "neo-brutalism",
  "solar-dusk",
  "claymorphism",
  "cyberpunk",
  "pastel-dreams"
]

const themeColors: Record<string, { primary: string; secondary: string }> = {
  "modern-minimal": { primary: "#3b82f6", secondary: "#f3f4f6" },
  "pink-lemonade": { primary: "#a84370", secondary: "#f1c4e6" },
  "twitter": { primary: "#1e9df1", secondary: "#0f1419" },
  "mocha-mousse": { primary: "#A37764", secondary: "#BAAB92" },
  "bubblegum": { primary: "#d04f99", secondary: "#8acfd1" },
  "amethyst-haze": { primary: "#8a79ab", secondary: "#dfd9ec" },
  "notebook": { primary: "#606060", secondary: "#dedede" },
  "doom-64": { primary: "#b71c1c", secondary: "#556b2f" },
  "catppuccin": { primary: "#8839ef", secondary: "#ccd0da" },
  "graphite": { primary: "#606060", secondary: "#e0e0e0" },
  "perpetuity": { primary: "#06858e", secondary: "#d9eaea" },
  "kodama-grove": { primary: "#8d9d4f", secondary: "#decea0" },
  "cosmic-night": { primary: "#6e56cf", secondary: "#e4dfff" },
  "tangerine": { primary: "#e05d38", secondary: "#f3f4f6" },
  "quantum-rose": { primary: "#e6067a", secondary: "#ffd6ff" },
  "nature": { primary: "#2e7d32", secondary: "#e8f5e9" },
  "bold-tech": { primary: "#8b5cf6", secondary: "#f3f0ff" },
  "elegant-luxury": { primary: "#9b2c2c", secondary: "#fdf2d6" },
  "amber-minimal": { primary: "#f59e0b", secondary: "#f3f4f6" },
  "supabase": { primary: "#72e3ad", secondary: "#fdfdfd" },
  "neo-brutalism": { primary: "#ff3333", secondary: "#ffff00" },
  "solar-dusk": { primary: "#B45309", secondary: "#E4C090" },
  "claymorphism": { primary: "#6366f1", secondary: "#d6d3d1" },
  "cyberpunk": { primary: "#ff00c8", secondary: "#f0f0ff" },
  "pastel-dreams": { primary: "#a78bfa", secondary: "#e9d8fd" }
}

const sections = [
  { id: "general", label: "General", icon: Key },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "api-keys", label: "API Keys", icon: Database },
  { id: "teams", label: "Teams", icon: Users },
]

export function SettingsDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("general")
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [colorTheme, setColorTheme] = useState("modern-minimal")
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)

  // Debounced autosave
  useEffect(() => {
    if (loading || !open) return;

    const timeoutId = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [settings]);


  useEffect(() => {
    const saved = localStorage.getItem("color-theme")
    if (saved && themeNames.includes(saved)) {
      setColorTheme(saved)
    }
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setColorTheme(newTheme)
    localStorage.setItem("color-theme", newTheme)
    document.cookie = `color-theme=${newTheme}; path=/; max-age=31536000`
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
    document.documentElement.classList.add(`theme-${newTheme}`)
    setPreviewTheme(null)
    toast.success(`Theme changed to ${newTheme}`)
  }

  const handleThemePreview = (themeName: string) => {
    setPreviewTheme(themeName)
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
    document.documentElement.classList.add(`theme-${themeName}`)
  }

  const handlePreviewEnd = () => {
    if (previewTheme) {
      themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
      document.documentElement.classList.add(`theme-${colorTheme}`)
      setPreviewTheme(null)
    }
  }

  const formatThemeName = (name: string) => {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  useEffect(() => {
    setMounted(true)
    if (open) {
      fetchSettings()
    }
  }, [open])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/user/settings")
      if (response.ok) {
        const data = await response.json()
        setSettings(data || {})
        setApiKey(data?.apiKey || "")
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        // toast.success("Settings saved") // Silent save 
      } else {
        toast.error("Failed to save settings")
      }
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }))
  }

  const toggleShowKey = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey)
    toast.success("API key copied to clipboard")
  }

  const regenerateApiKey = async () => {
    setRegenerating(true)
    try {
      const response = await fetch("/api/user/api-key/regenerate", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setApiKey(data.apiKey)
        toast.success("API key regenerated successfully")
      } else {
        toast.error("Failed to regenerate API key")
      }
    } catch (error) {
      console.error("Failed to regenerate API key:", error)
      toast.error("Failed to regenerate API key")
    } finally {
      setRegenerating(false)
    }
  }



  const handleTabClick = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const renderGeneralSection = () => (
    <section id="general" className="space-y-4">
      <h2 className="text-lg font-semibold">General</h2>
      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Choose your preferred color scheme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setTheme("light")}
              className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent ${theme === "light" ? "border-primary" : "border-muted"
                }`}
            >
              <Sun className="h-8 w-8" />
              <span className="font-medium">Light</span>
              {theme === "light" && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent ${theme === "dark" ? "border-primary" : "border-muted"
                }`}
            >
              <Moon className="h-8 w-8" />
              <span className="font-medium">Dark</span>
              {theme === "dark" && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>

            <button
              onClick={() => setTheme("system")}
              className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent ${theme === "system" ? "border-primary" : "border-muted"
                }`}
            >
              <Monitor className="h-8 w-8" />
              <span className="font-medium">System</span>
              {theme === "system" && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="colorTheme">Color Theme</Label>
            <DropdownMenu onOpenChange={(open) => !open && handlePreviewEnd()}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ backgroundColor: themeColors[colorTheme]?.primary }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ backgroundColor: themeColors[colorTheme]?.secondary }}
                      />
                    </div>
                    <span>{formatThemeName(colorTheme)}</span>
                  </div>
                  <Palette className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[400px] max-h-[400px] overflow-y-auto">
                {themeNames.map((themeName) => {
                  const colors = themeColors[themeName];
                  return (
                    <DropdownMenuItem
                      key={themeName}
                      onClick={() => handleThemeChange(themeName)}
                      onMouseEnter={() => handleThemePreview(themeName)}
                      onMouseLeave={handlePreviewEnd}
                      className={`cursor-pointer ${colorTheme === themeName ? "bg-accent" : ""
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <div
                              className="w-3 h-3 rounded-full border border-black/10"
                              style={{ backgroundColor: colors.primary }}
                            />
                            <div
                              className="w-3 h-3 rounded-full border border-black/10"
                              style={{ backgroundColor: colors.secondary }}
                            />
                          </div>
                          <span>{formatThemeName(themeName)}</span>
                        </div>
                        {colorTheme === themeName && (
                          <span className="text-xs">✓</span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="text-sm text-muted-foreground">
              Select a color palette for the application. Hover to preview.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            {theme === "system"
              ? "Your theme will match your system preferences"
              : `Currently using ${theme} mode`}
          </p>
        </CardContent>
      </Card>
    </section>
  )

  const renderBillingSection = () => (
    <section id="billing" className="space-y-4">
      <h2 className="text-lg font-semibold">Billing</h2>
      <PremiumUpgrade />
    </section>
  )

  const renderApiKeysSection = () => (
    <section id="api-keys" className="space-y-4">
      <h2 className="text-lg font-semibold">API Keys</h2>
      {/* API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>
            Use this key as Bearer to authenticate requests to the API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Your API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey || "No API key generated yet"}
                  readOnly
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyApiKey}
                disabled={!apiKey}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={regenerateApiKey}
                disabled={regenerating}
              >
                {regenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
            <h4 className="font-medium mb-2">
              <a target="_blank" href="/api">API Documentation</a>
            </h4>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LLM API Keys</CardTitle>
          <CardDescription>
            Configure your API keys for various LLM providers. These will be used for AI-powered analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 w-[15%]">Provider</th>
                  <th className="text-left py-2 w-[30%]">API Key</th>
                  <th className="text-left py-2 w-[25%]">Models</th>
                  <th className="text-left py-2 w-[15%]">Links</th>
                </tr>
              </thead>
              <tbody>
                {LLM_PROVIDERS.map((provider) => (
                  <tr key={provider.name} className="border-b hover:bg-muted/50">
                    <td className="py-3 font-medium align-middle">{provider.name}</td>
                    <td className="py-3 align-middle pr-4">
                      <div className="relative">
                        <Input
                          id={provider.field}
                          type={showKeys[provider.field] ? "text" : "password"}
                          placeholder={provider.isEndpoint ? "http://localhost:11434" : "sk-..."}
                          value={settings[provider.field] || ""}
                          onChange={(e) => updateField(provider.field, e.target.value)}
                          className="h-9"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(provider.field)}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          {showKeys[provider.field] ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground text-xs align-middle">
                      {provider.models}
                    </td>
                    <td className="py-3 align-middle">
                      <div className="flex flex-col gap-1">
                        <a
                          href={provider.docs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                        >
                          Docs <ExternalLink className="h-3 w-3" />
                        </a>
                        <a
                          href={provider.keys}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                        >
                          Get Key <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preferred Provider */}
          <div className="pt-4 border-t">
            <Label htmlFor="preferredProvider">Preferred LLM Provider</Label>
            <select
              id="preferredProvider"
              className="w-full mt-2 p-2 border rounded-md bg-background"
              value={settings.preferredProvider || "groq"}
              onChange={(e) => updateField("preferredProvider", e.target.value)}
            >
              {LLM_PROVIDERS.map((provider) => (
                <option key={provider.field} value={provider.field.replace("ApiKey", "").replace("Endpoint", "")}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>
    </section>
  )


  const renderTeamsSection = () => (
    <section id="teams" className="space-y-4">
      <h2 className="text-lg font-semibold">Teams</h2>
      <TeamsManager />
    </section>
  )



  if (loading || !mounted) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || <Button size="sm">Settings</Button>}
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Loading settings...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">Loading...</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm">Settings</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Customize your settings here.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs row (no TabsContent) */}
        <div className="px-6 border-b">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start h-auto bg-transparent border-0 p-0">
              {sections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  onClick={(e) => {
                    e.preventDefault()
                    handleTabClick(section.id)
                  }}
                  className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Scrollable dialog body with all sections */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
          {renderGeneralSection()}
          {renderBillingSection()}
          {renderApiKeysSection()}
          {renderTeamsSection()}
        </div>

        {/* Saving indicator */}
        {saving && (
          <div className="px-6 py-2 border-t text-sm text-muted-foreground">
            Saving...
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
