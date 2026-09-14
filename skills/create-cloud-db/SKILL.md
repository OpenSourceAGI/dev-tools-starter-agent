---
name: create-cloud-db
description: Guide to create-cloud-db (packages/create-cloud-db), the CLI that creates a Turso database and writes TURSO_DATABASE_URL and TURSO_AUTH_TOKEN into .env — the turso auth login prerequisite, naming the database, how the .env file is rewritten, and wiring the result into Drizzle. Use when working with create-cloud-db or troubleshooting it — "not logged in" errors, a database that already exists, .env values that get overwritten or ignored, or Drizzle failing to connect with the generated credentials.
---

# Working With create-cloud-db

The CLI in `packages/create-cloud-db`, published as **`create-cloud-db`**. It is a thin, deliberate wrapper around the Turso CLI: create the database, mint a token, write both values into `.env`. It does not manage schemas, migrations, or multiple environments.

## Setup

The Turso CLI must exist and be logged in **before** you run it — the tool shells out to it:

```bash
bun i -g turso && turso auth login    # or: bun x turso auth login
```

Then:

```bash
npm create cloud-db          # prompts for a name
npx create-cloud-db myapp-db # or pass one
```

## What it does, in order

1. Confirms you're authenticated with Turso.
2. Creates the database if it doesn't already exist.
3. Generates the database URL and an auth token via the Turso CLI.
4. **Overwrites** `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env` — updating them in place if present, appending if not. Other keys in the file are preserved.

Result:

```env
TURSO_DATABASE_URL=libsql://your-db-name.region.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9…
```

## Recipes

**Wire it into scripts** so teammates get the same setup path:

```json
"db:create": "create-cloud-db",
"db:generate": "drizzle-kit generate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

**Drizzle config** — dialect `turso`, with a local SQLite fallback so the project still runs before anyone has created a cloud database:

```ts
export default defineConfig({
  dialect: "turso",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || "file:./localdb.sqlite",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| "not logged in" / auth error | `turso auth login` hasn't been run in this shell, or the session expired. The CLI won't log you in for you. |
| `turso: command not found` | Install it globally (`bun i -g turso`) or run the tool where `bun x turso` resolves. |
| Database already exists | Reuse it — pass the same name and the CLI regenerates a token against the existing database rather than failing outright. Pick a new name if you wanted a fresh one. |
| My hand-edited `TURSO_*` values disappeared | Expected: those two keys are rewritten every run, which is how stale placeholders get cleaned up. Keep custom values under different key names. |
| App still can't connect after a successful run | The process didn't reload `.env` (restart the dev server), or the framework needs the vars prefixed/registered (Next.js server-only vars, Cloudflare `wrangler secret put` for deploys). Local `.env` is not uploaded anywhere. |
| Token works locally, fails in production | `.env` is local-only. Add both values to your host's secret store (Cloudflare secrets, Vercel env vars) separately. |
| Wrong region / latency | Region is chosen by the Turso CLI at creation time; recreate with the Turso CLI directly if you need a specific one. |
| Need a second database for staging | Run the CLI with a different name, then copy the printed values into the target environment yourself — the tool only manages the single pair of keys in `.env`. |
