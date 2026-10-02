export * from './category'
export * from './tags'

export const APP_NAME = process?.env?.NEXT_PUBLIC_APP_NAME || "App Dashboard";
export const APP_EMAIL = process?.env?.NEXT_PUBLIC_APP_EMAIL;
export const NEXT_PUBLIC_BASE_URL = process?.env?.NEXT_PUBLIC_BASE_URL;
export const LAST_REVISED_DATE = process?.env?.NEXT_PUBLIC_LAST_REVISED_DATE || "2025-12-16";
export const DOCS_TITLE = APP_NAME + " Docs";
export const APP_DESCRIPTION = process?.env?.NEXT_PUBLIC_APP_DESCRIPTION || "AI multi-agent stock & event markets system with next-day price predictions and comprehensive trading insights";
