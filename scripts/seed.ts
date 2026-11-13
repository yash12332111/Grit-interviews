import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { pool, db } from "../src/db/client";
import { seed } from "../src/db/seed";

async function main() {
  console.log("Starting database seed...");
  try {
    await seed(db);
    console.log("✅ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
