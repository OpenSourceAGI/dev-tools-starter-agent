"use client";

import React = require("react");

const { useState, useCallback, useRef, useEffect } = React;
type ReactNode = React.ReactNode;
type CSSProperties = React.CSSProperties;

export type Theme = "light" | "dark";

export interface AppBarProps {
  logo?: ReactNode;
  appName?: string;
  onSearch?: (query: string) => void;
  userAvatar?: ReactNode;
  userName?: string;
}

export interface ThemeToggleProps {
  variant?: "default" | "appbar" | "icon";
  appBarProps?: AppBarProps;
  defaultTheme?: Theme;
  barHeight?: number;
  buttonSize?: number;
  duration?: number;
  onThemeChange?: (theme: Theme) => void;
  children?: ReactNode;
}

const TOKENS: Record<Theme, Record<string, string>> = {
  light: {
    pageBg:    "#f3ede1",
    pageText:  "#1a1a1a",
    barBg:     "#1a1a1a",
    barText:   "#ffffff",
    barBorder: "rgba(255,255,255,0.07)",
    btnBg:     "#f3ede1",
    btnText:   "#1a1a1a",
    btnRing:   "rgba(255,255,255,0.15)",
    inputBg:   "rgba(255,255,255,0.1)",
    inputText: "#ffffff",
  },
  dark: {
    pageBg:    "#0e0e0e",
    pageText:  "#dfd8c6",
    barBg:     "#dfd8c6",
    barText:   "#1a1a1a",
    barBorder: "rgba(0,0,0,0.10)",
    btnBg:     "#0e0e0e",
    btnText:   "#dfd8c6",
    btnRing:   "rgba(0,0,0,0.25)",
    inputBg:   "rgba(0,0,0,0.08)",
    inputText: "#1a1a1a",
  },
};

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="1"     x2="12" y2="3"     />
      <line x1="12" y1="21"    x2="12" y2="23"    />
      <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"  />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"     y1="12"    x2="3"     y2="12"    />
      <line x1="21"    y1="12"    x2="23"    y2="12"    />
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

type CurtainPhase = "idle" | "falling" | "rising";

const EASING = "cubic-bezier(0.76, 0, 0.24, 1)";

export function ThemeToggle({
  variant      = "default",
  appBarProps,
  defaultTheme = "light",
  barHeight: explicitBarHeight,
  buttonSize   = 36,
  duration     = 550,
  onThemeChange,
  children,
}: ThemeToggleProps) {
  const isAppBar = variant === "appbar";
  const isIcon   = variant === "icon";
  const barHeight = explicitBarHeight ?? (isAppBar ? 60 : 44);

  const [theme, setTheme]     = useState<Theme>(defaultTheme);
  const [phase, setPhase]     = useState<CurtainPhase>("idle");
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const curtainColorRef       = useRef<string>("");
  const t                     = TOKENS[theme];

  // Sync with global Tailwind dark class on mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark && theme !== "dark") setTheme("dark");
      else if (!isDark && theme !== "light") setTheme("light");
    }
  }, []);

  const toggle = useCallback(() => {
    if (phase !== "idle") return;
    const next: Theme = theme === "light" ? "dark" : "light";
    curtainColorRef.current = TOKENS[next].pageBg;
    setPhase("falling");

    setTimeout(() => {
      setTheme(next);
      onThemeChange?.(next);

      if (typeof document !== "undefined") {
        if (next === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }

      setPhase("rising");
      setTimeout(() => setPhase("idle"), duration + 60);
    }, duration);
  }, [phase, theme, duration, onThemeChange]);

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    paddingTop: barHeight,
    background: t.pageBg,
    color: t.pageText,
    transition: "background 0.3s ease, color 0.3s ease",
  };

  const barStyle: CSSProperties = {
    position: "fixed",
    top: 0, left: 0, right: 0,
    height: barHeight,
    background: t.barBg,
    color: t.barText,
    borderBottom: `1px solid ${t.barBorder}`,
    overflow: "visible",
    zIndex: 9998,
    transition: "background 0.3s ease, border-color 0.3s ease, color 0.3s ease",
    display: isAppBar ? "flex" : "block",
    alignItems: "center",
    justifyContent: "space-between",
    padding: isAppBar ? "0 24px" : "0",
    fontFamily: "system-ui, -apple-system, sans-serif",
  };

  const btnScale = pressed ? 0.96 : hovered ? 1.1 : 1;
  const btnStyle: CSSProperties = {
    position: isAppBar || isIcon ? "relative" : "absolute",
    bottom: isAppBar || isIcon ? "auto" : -(buttonSize / 2),
    left: isAppBar || isIcon ? "auto" : "50%",
    transform: isAppBar || isIcon ? `scale(${btnScale})` : `translateX(-50%) scale(${btnScale})`,
    width: buttonSize,
    height: buttonSize,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: t.btnBg,
    color: t.btnText,
    boxShadow: `0 0 0 1.5px ${t.btnRing}`,
    zIndex: 9999,
    outline: "none",
    transition: "background 0.3s ease, color 0.3s ease, transform 0.15s ease, box-shadow 0.3s ease",
    marginLeft: isAppBar ? "16px" : "0",
    flexShrink: 0,
  };

  const curtainStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: curtainColorRef.current,
    transformOrigin: "top",
    transform: phase === "falling" ? "scaleY(1)" : "scaleY(0)",
    transition: phase !== "idle" ? `transform ${duration}ms ${EASING}` : "none",
    zIndex: 9997,
    pointerEvents: "none",
  };

  const appBarSectionStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  if (isIcon) {
    return (
      <>
        <div aria-hidden="true" style={curtainStyle} />
        <button
          style={btnStyle}
          onClick={toggle}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { setHovered(false); setPressed(false); }}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          aria-pressed={theme === "dark"}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
      </>
    );
  }

  return (
    <div style={pageStyle}>
      <div aria-hidden="true" style={curtainStyle} />

      <div style={barStyle}>
        {isAppBar && (
          <div style={{ ...appBarSectionStyle, flex: 1 }}>
            {appBarProps?.logo && (
              <div style={{ display: "flex", alignItems: "center" }}>
                {appBarProps.logo}
              </div>
            )}
            {appBarProps?.appName && (
              <span style={{ fontWeight: 600, fontSize: "1.1rem", letterSpacing: "-0.01em" }}>
                {appBarProps.appName}
              </span>
            )}
          </div>
        )}

        {isAppBar && appBarProps?.onSearch && (
          <div style={{ ...appBarSectionStyle, flex: 1, justifyContent: "center" }}>
            <div style={{ position: "relative", width: "100%", maxWidth: "320px", display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: "12px", display: "flex", opacity: 0.6 }}>
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search..."
                onChange={(e) => appBarProps.onSearch?.(e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 16px 0 36px",
                  borderRadius: "18px",
                  border: "none",
                  outline: "none",
                  background: t.inputBg,
                  color: t.inputText,
                  fontSize: "0.9rem",
                  transition: "background 0.3s ease, color 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        {isAppBar && (
          <div style={{ ...appBarSectionStyle, flex: 1, justifyContent: "flex-end" }}>
            {appBarProps?.userName && (
              <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                {appBarProps.userName}
              </span>
            )}
            {appBarProps?.userAvatar !== undefined ? (
              appBarProps.userAvatar
            ) : (
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: t.inputBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: t.inputText,
              }}>
                <UserIcon />
              </div>
            )}
            <button
              style={btnStyle}
              onClick={toggle}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => { setHovered(false); setPressed(false); }}
              onMouseDown={() => setPressed(true)}
              onMouseUp={() => setPressed(false)}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              aria-pressed={theme === "dark"}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        )}

        {!isAppBar && (
          <button
            style={btnStyle}
            onClick={toggle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            aria-pressed={theme === "dark"}
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        )}
      </div>

      {children}
    </div>
  );
}
