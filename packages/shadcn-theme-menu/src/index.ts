// Theme Components
export { ThemeProvider } from './theme-provider';
export { ThemeToggle } from './theme-toggle';
export { ThemeDropdown, themeNames, themeColors, formatThemeName } from './theme-dropdown';
export { themeDisplayNames } from './themes';
export { default as CinematicThemeSwitcher } from './cinematic-theme-switcher';
export { SidebarUserMenu } from './sidebar-user-menu';
export { FontSwitcher, FontMenuItems, useFontSwitcher, groupFonts } from './font-switcher';
export { RandomThemeButton, RandomizeMenuItems, useRandomizeTheme } from './random-theme-button';

// Framework-agnostic helpers
export {
  COLOR_THEME_STORAGE_KEY,
  COLOR_THEME_CHANGE_EVENT,
  applyColorTheme,
  setColorTheme,
  getStoredColorTheme,
  themeInitScript,
} from './color-theme';
export {
  THEME_FONT_ID,
  FONT_STORAGE_KEY,
  FONT_CHANGE_EVENT,
  FONT_INIT_STYLE_ID,
  fontOptions,
  getFontOption,
  googleFontsUrl,
  loadGoogleFont,
  loadFont,
  applyFont,
  setFont,
  getStoredFont,
  restoreFont,
  getThemeFonts,
  primaryFamily,
} from './fonts';
export {
  RANDOMIZE_STORAGE_KEY,
  RANDOMIZE_SESSION_KEY,
  RANDOMIZE_CHANGE_EVENT,
  RANDOMIZE_INTERVALS,
  randomizeModes,
  getRandomizeSettings,
  setRandomizeSettings,
  setRandomizeMode,
  pickRandomTheme,
  randomizeColorTheme,
  isRandomizeDue,
  applyRandomizeSchedule,
  startRandomizeSchedule,
} from './randomize';

// Types
export type { ThemeProviderProps } from 'next-themes';
export type { FontOption, FontCategory } from './fonts';
export type { FontSwitcherProps } from './font-switcher';
export type { RandomThemeButtonProps } from './random-theme-button';
export type { RandomizeMode, RandomizeSettings } from './randomize';
