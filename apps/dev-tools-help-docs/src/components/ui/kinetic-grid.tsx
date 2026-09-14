"use client";

import { useEffect, useRef, useCallback, useState, ReactNode } from "react";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  born: number;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Palette {
  bg: string;
  dot: string;
  lineBase: RGBA;
  lineActive: RGBA;
  nodeBase: RGBA;
  nodeActive: RGBA;
  glow: string;
  ripple: string;
}

/**
 * `fullscreen` — the original standalone treatment: the canvas is fixed to the
 * viewport and the wrapper fills at least one screen.
 * `section` — the canvas is absolutely positioned inside the wrapper and sized
 * from it, so the grid can sit behind a hero without hijacking the page.
 */
export type KineticGridVariant = "fullscreen" | "section";

/**
 * `default` — blue-on-charcoal. `monochrome` — white-on-black.
 * `auto` — follows the `dark` class on <html>, so the grid stays legible on
 * light-themed pages (dark lines on the page background).
 */
export type KineticGridColor = "default" | "monochrome" | "auto";

// ─── Constants ────────────────────────────────────────────────────────────────

const CELL_SIZE = 55; // Desktop-ish size. Will dictate cols/rows
const INFLUENCE_RADIUS = 260;
const MAX_WARP = 24;
const DOT_SPACING = 28;
const LERP_SPEED = 0.08;
const MAX_RIPPLES = 12;

const NODE_BASE_RADIUS = 1.8;
const NODE_ACTIVE_RADIUS = 3.2;

const PALETTES: Record<"dark" | "light" | "monochrome", Palette> = {
  dark: {
    bg: "#161618",
    dot: "rgba(255,255,255,0.05)",
    lineBase: { r: 255, g: 255, b: 255, a: 0.13 },
    lineActive: { r: 74, g: 158, b: 255, a: 0.9 },
    nodeBase: { r: 255, g: 255, b: 255, a: 0.2 },
    nodeActive: { r: 74, g: 158, b: 255, a: 1.0 },
    glow: "74,158,255",
    ripple: "100,180,255",
  },
  light: {
    bg: "#ffffff",
    dot: "rgba(0,0,0,0.05)",
    lineBase: { r: 15, g: 23, b: 42, a: 0.1 },
    lineActive: { r: 37, g: 99, b: 235, a: 0.85 },
    nodeBase: { r: 15, g: 23, b: 42, a: 0.18 },
    nodeActive: { r: 37, g: 99, b: 235, a: 1.0 },
    glow: "37,99,235",
    ripple: "37,99,235",
  },
  monochrome: {
    bg: "#000000",
    dot: "rgba(255,255,255,0.05)",
    lineBase: { r: 255, g: 255, b: 255, a: 0.13 },
    lineActive: { r: 255, g: 255, b: 255, a: 0.9 },
    nodeBase: { r: 255, g: 255, b: 255, a: 0.2 },
    nodeActive: { r: 255, g: 255, b: 255, a: 1.0 },
    glow: "255,255,255",
    ripple: "255,255,255",
  },
};

const WRAPPER_BG: Record<keyof typeof PALETTES, string> = {
  dark: "bg-[#161618]",
  light: "bg-white",
  monochrome: "bg-[#000000]",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpColor(base: RGBA, active: RGBA, t: number): string {
  const r = Math.round(lerpN(base.r, active.r, t));
  const g = Math.round(lerpN(base.g, active.g, t));
  const b = Math.round(lerpN(base.b, active.b, t));
  const a = lerpN(base.a, active.a, t);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

/** Tracks the `dark` class on <html>, used by the `auto` color mode. */
function useIsDarkTheme(enabled: boolean) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const root = document.documentElement;
    const read = () => setIsDark(root.classList.contains("dark"));

    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [enabled]);

  return isDark;
}

/** True when the visitor asked for reduced motion — we then render one still frame. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(query.matches);

    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  return reduced;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KineticGrid({
  children,
  className,
  globalColor = "default",
  variant = "fullscreen",
  fill = true,
}: {
  children?: ReactNode;
  className?: string;
  globalColor?: KineticGridColor;
  /** Where the canvas lives: pinned to the viewport, or inside the wrapper. */
  variant?: KineticGridVariant;
  /** Paint the palette background. Turn off to let the page background show through. */
  fill?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const targetMouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const ripplesRef = useRef<Ripple[]>([]);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const isDark = useIsDarkTheme(globalColor === "auto");
  const prefersReducedMotion = usePrefersReducedMotion();

  const paletteKey =
    globalColor === "monochrome"
      ? "monochrome"
      : globalColor === "auto" && !isDark
        ? "light"
        : "dark";
  const palette = PALETTES[paletteKey];

  // ── Warp ────────────────────────────────────────────────────────────────────

  const getWarpedPoint = useCallback(
    (
      gx: number,
      gy: number,
      col: number,
      row: number,
      mouse: Point,
      ripples: Ripple[],
      cols: number,
      rows: number,
    ): { pt: Point; proximity: number } => {
      // Edge pin — smoothly locks boundary rows/cols in place
      const edgeMargin = 1.5;
      const colPin = Math.min(
        col / edgeMargin,
        (cols - 1 - col) / edgeMargin,
        1,
      );
      const rowPin = Math.min(
        row / edgeMargin,
        (rows - 1 - row) / edgeMargin,
        1,
      );
      const pinFactor = colPin * colPin * rowPin * rowPin;

      const dx = gx - mouse.x;
      const dy = gy - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor;

      // Ripple displacement
      let rx = 0,
        ry = 0;
      for (const r of ripples) {
        const rdx = gx - r.x;
        const rdy = gy - r.y;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        const waveWidth = 55;
        const diff = rdist - r.radius;
        if (Math.abs(diff) < waveWidth) {
          const strength =
            (1 - Math.abs(diff) / waveWidth) * r.opacity * 18 * pinFactor;
          const angle = Math.atan2(rdy, rdx);
          const sign = diff < 0 ? -1 : 1;
          rx += Math.cos(angle) * strength * sign * -1;
          ry += Math.sin(angle) * strength * sign * -1;
        }
      }

      // Cursor warp with bell falloff
      if (dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0) {
        const t = dist / INFLUENCE_RADIUS;
        const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
        const warpAmt = eased * MAX_WARP * pinFactor;
        const angle = Math.atan2(dy, dx);
        return {
          pt: {
            x: gx - Math.cos(angle) * warpAmt + rx,
            y: gy - Math.sin(angle) * warpAmt + ry,
          },
          proximity,
        };
      }

      return { pt: { x: gx + rx, y: gy + ry }, proximity };
    },
    [],
  );

  // ── Draw ────────────────────────────────────────────────────────────────────

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w: W, h: H } = sizeRef.current;
      if (W === 0 || H === 0) return;

      const mouse = mouseRef.current;
      const ripples = ripplesRef.current;
      const theme = palette;

      ctx.clearRect(0, 0, W, H);

      // Background
      if (fill) {
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, W, H);
      }

      // Static background dot texture
      ctx.fillStyle = theme.dot;
      for (let x = DOT_SPACING / 2; x < W; x += DOT_SPACING) {
        for (let y = DOT_SPACING / 2; y < H; y += DOT_SPACING) {
          ctx.beginPath();
          ctx.arc(x, y, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Update ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        const age = (now - r.born) / 1000;
        // Radius is clamped so a stale `born` can never produce a negative arc
        r.radius = Math.max(0, age * 400);
        r.opacity = Math.max(0, 1 - age * 1.2);
        if (r.opacity <= 0) ripples.splice(i, 1);
      }

      // ── Build warped grid ─────────────────────────────────────────────────
      const cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1;
      const rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1;
      const cellW = W / (cols - 1);
      const cellH = H / (rows - 1);

      const pts: Point[][] = [];
      const prox: number[][] = [];

      for (let row = 0; row < rows; row++) {
        pts[row] = [];
        prox[row] = [];
        for (let col = 0; col < cols; col++) {
          const { pt, proximity } = getWarpedPoint(
            col * cellW,
            row * cellH,
            col,
            row,
            mouse,
            ripples,
            cols,
            rows,
          );
          pts[row][col] = pt;
          prox[row][col] = proximity;
        }
      }

      // ── Grid lines ────────────────────────────────────────────────────────
      const drawSeg = (p1: Point, p2: Point, pr1: number, pr2: number) => {
        const avg = (pr1 + pr2) / 2;
        const t = avg * avg * (3 - 2 * avg); // smoothstep
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = lerpColor(theme.lineBase, theme.lineActive, t);
        ctx.lineWidth = lerpN(0.8, 1.5, t);
        ctx.stroke();
      };

      ctx.lineCap = "butt";

      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols - 1; col++)
          drawSeg(
            pts[row][col],
            pts[row][col + 1],
            prox[row][col],
            prox[row][col + 1],
          );

      for (let col = 0; col < cols; col++)
        for (let row = 0; row < rows - 1; row++)
          drawSeg(
            pts[row][col],
            pts[row + 1][col],
            prox[row][col],
            prox[row + 1][col],
          );

      // ── Intersection nodes ────────────────────────────────────────────────
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const p = pts[row][col];
          const pr = prox[row][col];
          const t = pr * pr * (3 - 2 * pr); // smoothstep
          const r = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);

          // Outer glow ring for active nodes
          if (t > 0.3) {
            const glowR = r + lerpN(0, 6, (t - 0.3) / 0.7);
            const grd = ctx.createRadialGradient(
              p.x,
              p.y,
              r * 0.5,
              p.x,
              p.y,
              glowR,
            );
            grd.addColorStop(0, `rgba(${theme.glow},${(t * 0.3).toFixed(3)})`);
            grd.addColorStop(1, `rgba(${theme.glow},0)`);
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
          }

          // Node fill
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = lerpColor(theme.nodeBase, theme.nodeActive, t);
          ctx.fill();
        }
      }

      // ── Ripple rings ──────────────────────────────────────────────────────
      for (const r of ripples) {
        const safeRadius = Math.max(0, r.radius);
        ctx.beginPath();
        ctx.arc(r.x, r.y, safeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${theme.ripple},${(r.opacity * 0.28).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    },
    [fill, getWarpedPoint, palette],
  );

  // ── Animation loop ──────────────────────────────────────────────────────────

  const animate = useCallback(
    (now: number) => {
      const m = mouseRef.current;
      const t = targetMouseRef.current;

      m.x = lerpN(m.x, t.x, LERP_SPEED);
      m.y = lerpN(m.y, t.y, LERP_SPEED);

      draw(now);
      rafRef.current = requestAnimationFrame(animate);
    },
    [draw],
  );

  // ── Sizing ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w =
        variant === "fullscreen" ? window.innerWidth : container.clientWidth;
      const h =
        variant === "fullscreen" ? window.innerHeight : container.clientHeight;
      if (w === 0 || h === 0) return;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      // Draw in CSS pixels; the backing store stays crisp on HiDPI screens
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      sizeRef.current = { w, h };
    };

    setSize();

    if (variant === "fullscreen") {
      window.addEventListener("resize", setSize);
      return () => window.removeEventListener("resize", setSize);
    }

    const observer = new ResizeObserver(setSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [variant]);

  // ── Interaction + animation ─────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reduced motion: one still frame, no pointer tracking, no ripples.
    if (prefersReducedMotion) {
      mouseRef.current = { x: -9999, y: -9999 };
      targetMouseRef.current = { x: -9999, y: -9999 };
      ripplesRef.current = [];
      const id = requestAnimationFrame((now) => draw(now));
      return () => cancelAnimationFrame(id);
    }

    const toLocal = (e: MouseEvent): Point => {
      if (variant === "fullscreen") return { x: e.clientX, y: e.clientY };
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMouseMove = (e: MouseEvent) => {
      targetMouseRef.current = toLocal(e);
    };

    const onMouseLeave = () => {
      targetMouseRef.current = { x: -9999, y: -9999 };
    };

    const onClick = (e: MouseEvent) => {
      const { x, y } = toLocal(e);
      const ripples = ripplesRef.current;
      if (ripples.length >= MAX_RIPPLES) ripples.shift();
      ripples.push({ x, y, radius: 0, opacity: 1, born: performance.now() });
    };

    // `section` keeps its listeners local so the grid only reacts to its own area
    const target: Window | HTMLElement =
      variant === "fullscreen" ? window : container;

    target.addEventListener("mousemove", onMouseMove as EventListener);
    target.addEventListener("mouseleave", onMouseLeave as EventListener);
    target.addEventListener("click", onClick as EventListener);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      target.removeEventListener("mousemove", onMouseMove as EventListener);
      target.removeEventListener("mouseleave", onMouseLeave as EventListener);
      target.removeEventListener("click", onClick as EventListener);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate, draw, prefersReducedMotion, variant]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden",
        variant === "fullscreen" && "min-h-screen",
        // `auto` resolves only on the client, so it never emits a class that
        // could differ between the server and the first client render.
        fill && globalColor !== "auto" && WRAPPER_BG[paletteKey],
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          "w-full h-full z-0 pointer-events-none",
          variant === "fullscreen" ? "fixed inset-0" : "absolute inset-0",
        )}
      />

      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}
