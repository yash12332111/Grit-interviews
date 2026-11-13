import { Pool, neonConfig } from "@neondatabase/serverless";
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
  throw new Error("DATABASE_URL is not set in environment variables");
}

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
export type AppDatabase = typeof db;
