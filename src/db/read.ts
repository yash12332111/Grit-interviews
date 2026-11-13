// src/db/read.ts
// Reads retry ONCE on a connection error (architecture §12 DB_UNAVAILABLE).
// Writes are never auto-retried: repeating a half-done mutation is unsafe.

import { isConnectionError } from "@/lib/result";

const RETRY_DELAY_MS = 400;

/** Wraps a read-only query function so a failed connection is retried once. */
export function withReadRetry<A extends unknown[], R>(
  read: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await read(...args);
    } catch (err) {
      if (!isConnectionError(err)) throw err;
      console.warn("[db] connection error on a read, retrying once:", err);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return await read(...args);
    }
  };
}
