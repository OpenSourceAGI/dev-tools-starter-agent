import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Moon,
  Pause,
  Play,
  RefreshCw,
  Search,
  Sun,
  Timer,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** The object returned by GET /api/info — every field is a display string. */
type SystemInfo = Record<string, string>;

type Field = { key: string; emoji: string; label: string; list?: boolean };

// Grouped the same way as the desktop app (native/dist/index.html) so the two
// UIs read as one tool. `list` fields are space-separated and render as badges.
const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "System",
    fields: [
      { key: "user", emoji: "👤", label: "User" },
      { key: "hostname", emoji: "🏠", label: "Host" },
      { key: "os", emoji: "⚡", label: "OS" },
      { key: "kernel", emoji: "🔧", label: "Kernel" },
      { key: "device", emoji: "💻", label: "Device" },
      { key: "shell", emoji: "🐚", label: "Shell" },
      { key: "uptime", emoji: "⏱️", label: "Uptime" },
      { key: "users_logged_in", emoji: "🧑‍🤝‍🧑", label: "Logged in" },
    ],
  },
  {
    title: "Hardware",
    fields: [
      { key: "cpu", emoji: "📈", label: "CPU" },
      { key: "cpu_bench_info", emoji: "🏅", label: "CPU rank" },
      { key: "gpu", emoji: "🎮", label: "GPU" },
      { key: "gpu_bench_info", emoji: "🥇", label: "GPU rank" },
      { key: "load_average", emoji: "📊", label: "Load" },
      { key: "temperature", emoji: "🌡️", label: "Temp" },
      { key: "battery", emoji: "🔋", label: "Battery" },
      { key: "screen_resolution", emoji: "🖥️", label: "Display" },
    ],
  },
  {
    title: "Memory & storage",
    fields: [
      { key: "ram_used", emoji: "💾", label: "RAM" },
      { key: "memory_available", emoji: "🧠", label: "Available" },
      { key: "swap_used", emoji: "🔄", label: "Swap" },
      { key: "disk_used", emoji: "📁", label: "Disk used" },
      { key: "disk_size", emoji: "🗄️", label: "Disk size" },
      { key: "top_process", emoji: "🔝", label: "Top process" },
      { key: "mount_points", emoji: "📌", label: "Mounts", list: true },
    ],
  },
  {
    title: "Network",
    fields: [
      { key: "ip", emoji: "🌎", label: "Public IP" },
      { key: "iplocal", emoji: "🌐", label: "Local IP" },
      { key: "city", emoji: "📍", label: "Location" },
      { key: "isp", emoji: "👮", label: "ISP" },
      { key: "domain", emoji: "🔗", label: "Domain" },
      { key: "network_interfaces", emoji: "🔌", label: "Interfaces", list: true },
      { key: "ports", emoji: "🚪", label: "Open ports", list: true },
    ],
  },
  {
    title: "Software",
    fields: [
      { key: "pacman", emoji: "🚀", label: "Tools", list: true },
      { key: "containers", emoji: "📦", label: "Containers", list: true },
      { key: "services_running", emoji: "⚙️", label: "Services", list: true },
    ],
  },
];

const REFRESH_MS = 10_000;

function clean(value: string | undefined): string {
  return (value ?? "").replace(/%%/g, "%").trim();
}

/** "8/16GB" -> 50, "35%" -> 35; null when the string has no usable ratio. */
function percentOf(value: string): number | null {
  const pct = value.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return Math.min(100, Number(pct[1]));
  const ratio = value.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (ratio && Number(ratio[2]) > 0) return Math.min(100, (Number(ratio[1]) / Number(ratio[2])) * 100);
  return null;
}

function levelColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("about-system-theme");
      if (saved) return saved === "dark";
    } catch {
      // Storage can be unavailable; fall through to the OS preference.
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("about-system-theme", dark ? "dark" : "light");
    } catch {
      // Ignore: the theme just won't be remembered.
    }
  }, [dark]);

  return [dark, () => setDark((d) => !d)];
}

function StatCard({
  icon: Icon,
  title,
  value,
  detail,
  pct,
}: {
  icon: typeof Cpu;
  title: string;
  value: string;
  detail?: string;
  pct?: number | null;
}) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-5">
        <CardDescription>{title}</CardDescription>
        <Icon className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent className="space-y-2 px-5">
        <div className="truncate text-2xl font-semibold tabular-nums">{value || "—"}</div>
        {pct != null && <Progress value={pct} indicatorClassName={levelColor(pct)} />}
        {detail && <p className="text-muted-foreground truncate text-xs">{detail}</p>}
      </CardContent>
    </Card>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={`g${i}`} className="h-64 rounded-xl sm:col-span-2" />
      ))}
    </div>
  );
}

export default function App() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(true);
  const [query, setQuery] = useState("");
  const [dark, toggleDark] = useDarkMode();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("./api/info", { cache: "no-store" });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setInfo(await res.json());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [live, load]);

  const groups = useMemo(() => {
    if (!info) return [];
    const q = query.trim().toLowerCase();
    return GROUPS.map((group) => ({
      ...group,
      fields: group.fields.filter((f) => {
        const value = clean(info[f.key]);
        if (!value) return false;
        if (!q) return true;
        return `${f.label} ${f.key} ${value}`.toLowerCase().includes(q);
      }),
    })).filter((g) => g.fields.length > 0);
  }, [info, query]);

  const title = info ? [clean(info.user), clean(info.hostname)].filter(Boolean).join("@") : "About System";
  const ram = clean(info?.ram_used);
  const disk = clean(info?.disk_used);
  const load1 = clean(info?.load_average).split(/\s+/)[0] ?? "";

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-3xl font-bold tracking-tight">{title || "About System"}</h1>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            {info?.os && <Badge variant="secondary">{clean(info.os)}</Badge>}
            {info?.platform && <Badge variant="outline">{info.platform}</Badge>}
            {info?.timestamp && <span>Updated {new Date(info.timestamp).toLocaleTimeString()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              className="pl-8"
              aria-label="Filter fields"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLive((l) => !l)}
            title={live ? "Pause auto-refresh" : `Auto-refresh every ${REFRESH_MS / 1000}s`}
            aria-label={live ? "Pause auto-refresh" : "Resume auto-refresh"}
          >
            {live ? <Pause /> : <Play />}
          </Button>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh now">
            <RefreshCw className={cn(loading && "animate-spin")} />
          </Button>
          <Button variant="outline" size="icon" onClick={toggleDark} aria-label="Toggle dark mode">
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>

      {error && (
        <Card className="border-destructive/50 mb-6">
          <CardHeader>
            <CardTitle className="text-destructive">Couldn't read system information</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!info && !error ? (
        <LoadingGrid />
      ) : info ? (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={MemoryStick}
              title="Memory"
              value={ram}
              detail={clean(info.memory_available)}
              pct={percentOf(ram)}
            />
            <StatCard
              icon={HardDrive}
              title="Disk"
              value={disk}
              detail={clean(info.disk_size)}
              pct={percentOf(disk)}
            />
            <StatCard
              icon={Activity}
              title="Load average"
              value={load1}
              detail={clean(info.load_average) ? `1 · 5 · 15 min: ${clean(info.load_average)}` : undefined}
            />
            <StatCard icon={Timer} title="Uptime" value={clean(info.uptime)} detail={clean(info.top_process)} />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <Card key={group.title}>
                <CardHeader>
                  <CardTitle>{group.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y">
                    {group.fields.map((f) => {
                      const value = clean(info[f.key]);
                      return (
                        <div
                          key={f.key}
                          className="grid grid-cols-[7rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)] items-start gap-3 py-2 text-sm first:pt-0 last:pb-0"
                        >
                          <dt className="text-muted-foreground flex items-center gap-2">
                            <span aria-hidden>{f.emoji}</span>
                            {f.label}
                          </dt>
                          <dd className="min-w-0 break-words font-medium">
                            {f.list ? (
                              <div className="flex flex-wrap gap-1">
                                {value.split(/\s+/).map((item, i) => (
                                  <Badge
                                    key={`${item}-${i}`}
                                    variant="secondary"
                                    className="max-w-full font-mono break-all whitespace-normal"
                                  >
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              value
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </CardContent>
              </Card>
            ))}
            {groups.length === 0 && (
              <p className="text-muted-foreground col-span-full py-12 text-center">
                No fields match “{query}”.
              </p>
            )}
          </section>
        </>
      ) : null}

      <footer className="text-muted-foreground mt-10 text-center text-xs">
        Served by <code className="font-mono">about-system web</code>
      </footer>
    </div>
  );
}
