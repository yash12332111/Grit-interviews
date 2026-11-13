import { Pool, neonConfig, type PoolClient } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config({ path: ".env.local" });

// Configure WebSocket constructor for Node.js environments
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  const message =
    "DATABASE_URL is not set. Locally, add it to .env.local; on Vercel, add it under " +
    "Settings > Environment Variables (use the pooled Neon connection string), then redeploy.";
  console.error(`[db] FATAL: ${message}`);
  throw new Error(message);
}

export const pool = new Pool({ connectionString });

// Neon or the network can close a connection at any time. The driver reports
// that as an 'error' event, and with no listener Node turns it into an uncaught
// exception that destabilises the server. Two places need a listener:
//  - the pool, for connections that are idle, and
//  - each client, for connections that are checked out (for example between two
//    statements of a transaction), where the pool is not listening.
// We only log: the query or transaction that was running rejects on its own and
// is mapped to DB_UNAVAILABLE, and the pool opens a fresh connection next time.
const describe = (err: Error & { code?: string }) =>
  `${err.message || "unknown error"}${err.code ? ` (${err.code})` : ""}`;

pool.on("error", (err: Error) => {
  console.error(`[db] idle connection error, the pool will reconnect: ${describe(err)}`);
});
pool.on("connect", (client: PoolClient) => {
  client.on("error", (err: Error) => {
    console.error(`[db] connection error on a checked-out client: ${describe(err)}`);
  });
});
export const db = drizzle({ client: pool, schema });
export type AppDatabase = typeof db;
