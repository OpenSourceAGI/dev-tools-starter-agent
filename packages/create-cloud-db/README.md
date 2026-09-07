# create-cloud-db

[NPM](https://www.npmjs.com/package/create-cloud-db)

`create-cloud-db` is a small CLI that creates a Turso database and manages the `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` values in your local `.env` file.

It is designed for quick local setup so you can be ready to connect from Node, frameworks, or serverless environments with minimal manual configuration.

## Installation

You must first login to turso with:

```bash
bun i -g turso
turso auth login

# or
bun x turso auth login
```

Then run:

```bash
# will ask for name
npm create cloud-db

# or
npx create-cloud-db

# or
npx create-cloud-db [myapp-db]

```

Or install globally:

```bash
npm install -g create-cloud-db
create-cloud-db myapp-db
```

## What it does

When you run the command, the CLI:

1. Ensures you are logged into Turso via `turso auth login`.  
2. Creates a Turso database if it does not already exist.  
3. Generates a database URL and an auth token via the Turso CLI.  
4. Overwrites (not appends) the `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` entries in your local `.env` file.  

After running, your `.env` file will contain something like:

```env
TURSO_DATABASE_URL=libsql://your-db-name.region.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

## Add to package.json

```json
    "db:create": "create-cloud-db",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
```

## Environment file behavior

- The CLI reads your existing `.env` file if present.  
- It updates or inserts `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` keys.  
- The `.env` file is rewritten, so old placeholder values are removed and replaced with valid values.

### Example with Drizzle

```ts
// drizzle.config.ts

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'turso',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || 'file:./localdb.sqlite',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

## 📝 License

MIT License - Star this repo so it can grow features! 🌟

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
