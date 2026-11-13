"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db, type AppDatabase } from "@/db/client";
import { seed } from "@/db/seed";
import { ok, toFailure, type Result } from "@/lib/result";

/**
 * "Reset demo data" (architecture F4). Open to anyone: the demo needs no
 * login (HC-7). Seeded users keep their fixed UUIDs, so persona cookies stay
 * valid across a reset.
 */
export async function resetDemoData(): Promise<Result<null>> {
  try {
    await db.transaction(async (tx) => {
      // Same lock the freshness check takes, so a reset and an automatic
      // re-seed can't run at the same time.
      await tx.execute(sql`SELECT seeded_at FROM demo_meta WHERE id = 1 FOR UPDATE`);
      await seed(tx as unknown as AppDatabase);
    });
    revalidatePath("/", "layout");
    return ok(null);
  } catch (err) {
    return toFailure(err);
  }
}
