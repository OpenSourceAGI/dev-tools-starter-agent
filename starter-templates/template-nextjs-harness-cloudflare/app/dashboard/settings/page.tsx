"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ExternalLink, Eye, EyeOff, Save, Moon, Sun, Monitor, Copy, RefreshCw, Key, Palette, Brain, TrendingUp, Database, Users } from "lucide-react";
import { TeamsManager } from "@/components/settings/teams-manager";
import { PremiumUpgrade } from "@/components/settings/premium-upgrade";
import { ThirdPartySyncTab } from "@/components/dashboard/third-party-sync-tab";


const LLM_PROVIDERS = [
  {
    name: "XAI",
    models: "Grok, Grok Vision",
    docs: "https://docs.x.ai/docs#models",
    keys: "https://console.x.ai/",
    valuation: "$80B",
    revenue: "$100M",
    cost: "$15.00",
    field: "xaiApiKey",
  },
  {
    name: "Groq",
    models: "Llama, DeepSeek, Gemini, Mistral",
    docs: "https://console.groq.com/docs/overview",
    keys: "https://console.groq.com/keys",
    valuation: "$2.8B",
    revenue: "-",
    cost: "$0.79",
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
    valuation: "$18B",
    revenue: "$20M",
    cost: "$15.00",
    field: "perplexityApiKey",
  },
  {
    name: "Cloudflare",
    models: "Llama, Gemma, Mistral, Phi, Qwen, DeepSeek",
    docs: "https://developers.cloudflare.com/workers-ai/",
    keys: "https://dash.cloudflare.com/profile/api-tokens",
    valuation: "$62.3B",
    revenue: "$1.67B",
    cost: "$2.25",
    field: "cloudflareApiKey",
  },
  {
    name: "Google",
    models: "Gemini",
    docs: "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models",
    keys: "https://cloud.google.com/vertex-ai/generative-ai/docs/start/express-mode/overview#api-keys",
    valuation: "-",
    revenue: "~$400M",
    cost: "$10.00",
    field: "googleApiKey",
  },
];

const BROKERS = [
  {
    name: "Alpaca",
    fields: ["alpacaApiKey", "alpacaApiSecret", "alpacaPaper"],
    docs: "https://alpaca.markets/docs/",
    keys: "https://app.alpaca.markets/paper/dashboard/overview",
  },
  {
    name: "Webull",
    fields: ["webullUsername", "webullPassword", "webullDeviceId"],
    docs: "https://www.webull.com/api",
    keys: "https://app.webull.com/",
  },
  {
    name: "Robinhood",
    fields: ["robinhoodUsername", "robinhoodPassword"],
    docs: "https://robinhood.com/us/en/support/",
    keys: "https://robinhood.com/account",
  },
  {
    name: "Interactive Brokers",
    fields: ["ibkrUsername", "ibkrPassword"],
    docs: "https://www.interactivebrokers.com/api/",
    keys: "https://www.interactivebrokers.com/",
  }
];

const DATA_PROVIDERS = [
  {
    name: "Alpha Vantage",
    field: "alphaVantageApiKey",
    docs: "https://www.alphavantage.co/documentation/",
    keys: "https://www.alphavantage.co/support/#api-key",
  },
  {
    name: "Finnhub",
    field: "finnhubApiKey",
    docs: "https://finnhub.io/docs/api",
    keys: "https://finnhub.io/dashboard",
  },
  {
    name: "Polygon.io",
    field: "polygonApiKey",
    docs: "https://polygon.io/docs",
    keys: "https://polygon.io/dashboard/api-keys",
  },
];

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
];

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
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [colorTheme, setColorTheme] = useState("modern-minimal");
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("color-theme");
    if (saved && themeNames.includes(saved)) {
      setColorTheme(saved);
      themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`));
      document.documentElement.classList.add(`theme-${saved}`);
    } else {
      document.documentElement.classList.add(`theme-modern-minimal`);
    }
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setColorTheme(newTheme);
    localStorage.setItem("color-theme", newTheme);
    document.cookie = `color-theme=${newTheme}; path=/; max-age=31536000`; // 1 year
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`));
    document.documentElement.classList.add(`theme-${newTheme}`);
    setPreviewTheme(null);
    toast.success(`Theme changed to ${newTheme}`);
  };

  const handleThemePreview = (themeName: string) => {
    setPreviewTheme(themeName);
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`));
    document.documentElement.classList.add(`theme-${themeName}`);
  };

  const handlePreviewEnd = () => {
    if (previewTheme) {
      themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`));
      document.documentElement.classList.add(`theme-${colorTheme}`);
      setPreviewTheme(null);
    }
  };

  const formatThemeName = (name: string) => {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/user/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data || {});
        setApiKey(data?.apiKey || "");
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Settings saved successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  const toggleShowKey = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success("API key copied to clipboard");
  };

  const regenerateApiKey = async () => {
    setRegenerating(true);
    try {
      const response = await fetch("/api/user/api-key/regenerate", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setApiKey(data.apiKey);
        toast.success("API key regenerated successfully");
      } else {
        toast.error("Failed to regenerate API key");
      }
    } catch (error) {
      console.error("Failed to regenerate API key:", error);
      toast.error("Failed to regenerate API key");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading || !mounted) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your API keys and preferences</p>
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="llm" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">LLM</span>
          </TabsTrigger>
          <TabsTrigger value="brokers" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Brokers</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Sync</span>
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Teams</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          <PremiumUpgrade />

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
                <h4 className="font-medium mb-2"><a target="_blank" href="/api">API Documentation</a></h4>
              </div>
            </CardContent>
          </Card>

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
        </TabsContent>

        {/* LLM Providers Tab */}
        <TabsContent value="llm" className="space-y-6 mt-6">
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
        </TabsContent>


        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-6 mt-6">
          <TeamsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
