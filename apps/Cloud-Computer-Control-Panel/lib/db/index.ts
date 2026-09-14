import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"
import * as relations from "./relations"

type DbInstance = ReturnType<typeof drizzle>
let _db: DbInstance | null = null

/** Local file by default so `npm run dev` works with no configuration;
 *  point DATABASE_URL at libSQL/Turso for a hosted database. */
export const DATABASE_URL =
  process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:./data/cccp.db"

function getDb(): DbInstance {
  if (!_db) {
    const client = createClient({
      url: DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
    })
    _db = drizzle(client, { schema: { ...schema, ...relations } })
  }
  return _db
}

// Lazy proxy — createClient is not called until first db access (safe for CF Workers module init)
export const db = new Proxy({} as DbInstance, {
  get(_, prop) {
    return (getDb() as any)[prop]
  },
})
