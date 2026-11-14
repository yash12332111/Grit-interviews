"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { selectPersona } from "@/actions/persona";
import type { JourneyState } from "@/domain/states";
import { StateBadge } from "./StateBadge";
import { cn } from "@/lib/utils";

type PersonaButtonProps = {
  id: string;
  name: string;
  /** Live state hint, e.g. "Ready to book · Novice". */
  hint?: string | null;
  hintState?: JourneyState | null;
  /** Fallback description for personas with no live state (interviewers, team). */
  description?: string;
  role: "student" | "interviewer" | "team_admin";
};

const AVATAR: Record<PersonaButtonProps["role"], string> = {
  student: "bg-indigo-100 text-indigo-700",
  interviewer: "bg-violet-100 text-violet-700",
  team_admin: "bg-orange-100 text-orange-700",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PersonaButton({ id, name, hint, hintState, description, role }: PersonaButtonProps) {
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
        "group relative flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-soft transition",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:cursor-wait disabled:opacity-60",
      )}
    >
      {/* Initials come from CSS so the button's text still starts with the name. */}
      <span
        aria-hidden="true"
        data-initials={initials(name)}
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold before:content-[attr(data-initials)]",
          AVATAR[role],
        )}
      />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="block truncate text-sm font-semibold">{pending ? "Opening…" : name}</span>
        {hint && hintState ? (
          <StateBadge state={hintState} label={hint} />
        ) : description ? (
          <span className="block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
      {pending ? (
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : (
        <ArrowRightIcon
          className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
