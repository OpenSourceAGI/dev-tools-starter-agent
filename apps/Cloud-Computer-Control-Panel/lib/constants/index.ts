export const APP_NAME = process?.env?.NEXT_PUBLIC_APP_NAME || "CCCP"
export const APP_TITLE = `${APP_NAME} - Cloud Computer Control Panel`
export const APP_EMAIL = process?.env?.NEXT_PUBLIC_APP_EMAIL
export const APP_DESCRIPTION =
  process?.env?.NEXT_PUBLIC_APP_DESCRIPTION ||
  "Open-source cloud infrastructure management with automated Dokploy deployment"

/** Left undefined when unset so better-auth infers the origin from the
 *  incoming request (server) or from window.location (browser). Hardcoding a
 *  default here would make the CSRF origin check reject every deployment that
 *  is not on localhost:3000. */
export const NEXT_PUBLIC_BASE_URL =
  process?.env?.NEXT_PUBLIC_APP_URL || process?.env?.NEXT_PUBLIC_BASE_URL || undefined

export const LAST_REVISED_DATE = process?.env?.NEXT_PUBLIC_LAST_REVISED || "2026-09-08"

/** Sentinel passed from the browser instead of a real key: the server looks the
 *  signed-in user's credentials up in the database. */
export const DB_CREDENTIALS = "db"
/** Sentinel meaning "use the AWS credentials in the server's environment". */
export const ENV_CREDENTIALS = "env"

export const DEFAULT_AWS_REGION = process?.env?.NEXT_PUBLIC_AWS_REGION || "us-east-1"
