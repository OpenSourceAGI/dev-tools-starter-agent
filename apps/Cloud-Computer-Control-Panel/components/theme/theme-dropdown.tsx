'use client'

import { ThemeDropdown as PkgThemeDropdown } from 'shadcn-theme-menu'

export function ThemeDropdown() {
  return (
    <PkgThemeDropdown
      onColorThemeChange={(theme) => {
        document.cookie = `color-theme=${theme}; path=/; max-age=31536000`
      }}
    />
  )
}
