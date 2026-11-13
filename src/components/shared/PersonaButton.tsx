"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { selectPersona } from "@/actions/persona";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PersonaButtonProps = {
  id: string;
  name: string;
  /** Live state hint, e.g. "Ready to book · Novice". */
  hint?: string | null;
  /** Fallback description for personas with no live state (interviewers, team). */
  description?: string;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
};

const TONE: Record<NonNullable<PersonaButtonProps["tone"]>, string> = {
  neutral: "bg-muted text-muted-foreground",
  good: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-900",
  bad: "bg-rose-100 text-rose-800",
  info: "bg-sky-100 text-sky-800",
};

export function PersonaButton({ id, name, hint, description, tone = "neutral" }: PersonaButtonProps) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await selectPersona(id);
      // On success the action redirects; we only get here on failure.
      if (result && !result.ok) toast.error(result.error.message);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={cn(
        "flex w-full flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left shadow-xs transition",
        "hover:border-foreground/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:cursor-wait disabled:opacity-60",
      )}
    >
      <span className="text-sm font-medium">{pending ? "Opening…" : name}</span>
      {hint ? (
        <Badge variant="secondary" className={cn("font-normal", TONE[tone])}>
          {hint}
        </Badge>
      ) : description ? (
        <span className="text-xs text-muted-foreground">{description}</span>
      ) : null}
    </button>
  );
}
