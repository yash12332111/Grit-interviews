// src/db/freshness.ts
// Freshness enforcement per architecture §5.3 F4.
// Acquires a row lock on demo_meta using SELECT ... FOR UPDATE within a transaction.
// If seeded_at is older than DEMO_STALE_HOURS, re-seeds.

import { sql } from "drizzle-orm";
import type { AppDatabase } from "./client";
import { DEMO_STALE_HOURS } from "../domain/config";
import { seed } from "./seed";

export async function ensureFreshDemo(db: AppDatabase): Promise<boolean> {
  const staleThresholdMs = DEMO_STALE_HOURS * 60 * 60 * 1000;
  let reseeded = false;

  await db.transaction(async (tx) => {
    // 1. Lock demo_meta row (id = 1)
    const result = await tx.execute(
      sql`SELECT seeded_at FROM demo_meta WHERE id = 1 FOR UPDATE`
    );

    const rows = result.rows as Array<{ seeded_at: string | Date }>;

    if (!rows || rows.length === 0) {
      // Not yet seeded: seed now
      await seed(tx as unknown as AppDatabase);
      reseeded = true;
      return;
    }

    const seededAt = new Date(rows[0].seeded_at);
    const ageMs = Date.now() - seededAt.getTime();

    if (ageMs > staleThresholdMs) {
      await seed(tx as unknown as AppDatabase);
      reseeded = true;
    }
  });

  return reseeded;
}

