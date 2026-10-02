import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"
import * as relations from "./relations"

type DbInstance = ReturnType<typeof drizzle>;
let _db: DbInstance | null = null;

function getDb(): DbInstance {
  if (!_db) {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:./local.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    _db = drizzle(client, { schema: { ...schema, ...relations } });
  }
  return _db;
}

// Lazy proxy — createClient is not called until first db access (safe for CF Workers module init)
export const db = new Proxy({} as DbInstance, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
