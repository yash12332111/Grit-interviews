"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const NOTICES: Record<string, string> = {
  "wrong-role": "That area is for a different persona. Pick one below to continue.",
  "pick-persona": "Pick a persona below to continue.",
};

/** Turns `/?notice=...` (set by the role guards) into a toast, then cleans the URL. */
export function NoticeToast({ notice }: { notice?: string }) {
  const router = useRouter();
  const shown = useRef(false);

  useEffect(() => {
    if (!notice || shown.current) return;
    const message = NOTICES[notice];
    if (!message) return;
    shown.current = true;
    toast.info(message);
    router.replace("/", { scroll: false });
  }, [notice, router]);

  return null;
}
