import type { ReactNode } from "react";
import { connection } from "next/server";
import { db } from "@/db/client";
import { ensureFreshDemo } from "@/db/freshness";

/**
 * Architecture F4 / HC-8: runs on every request from the root layout and
 * re-seeds the demo when it is older than DEMO_STALE_HOURS. Children render
 * only after the check has finished, so no page ever shows stale data.
 *
 * `connection()` keeps this out of build-time prerendering (it talks to the DB).
 */
export async function FreshDemoGate({ children }: { children: ReactNode }) {
  await connection();
  try {
    await ensureFreshDemo(db);
  } catch (err) {
    // Don't take the whole app down if the check itself fails (e.g. a brief
    // DB outage): log it and let the page's own queries surface the error.
    console.error("[freshness] ensureFreshDemo failed:", err);
  }
  return <>{children}</>;
}
