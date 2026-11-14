import {
  BanIcon,
  CalendarCheckIcon,
  CalendarPlusIcon,
  CalendarXIcon,
  ClockIcon,
  HourglassIcon,
  LockIcon,
  TrophyIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";
import { JOURNEY_STATE_LABEL, JourneyState } from "@/domain/states";
import { cn } from "@/lib/utils";

/** One colour + icon per journey state, shared by every screen. Presentation only. */
export const STATE_TONE: Record<
  JourneyState,
  { icon: LucideIcon; badge: string; rail: string; soft: string; iconWrap: string }
> = {
  [JourneyState.NOT_ELIGIBLE]: {
    icon: LockIcon,
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    rail: "bg-slate-300",
    soft: "bg-slate-50",
    iconWrap: "bg-slate-100 text-slate-500",
  },
  [JourneyState.READY_TO_BOOK]: {
    icon: CalendarPlusIcon,
    badge: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    rail: "bg-indigo-500",
    soft: "bg-indigo-50/60",
    iconWrap: "bg-indigo-100 text-indigo-600",
  },
  [JourneyState.RETAKE_COOLDOWN]: {
    icon: HourglassIcon,
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
    rail: "bg-violet-500",
    soft: "bg-violet-50/60",
    iconWrap: "bg-violet-100 text-violet-600",
  },
  [JourneyState.BOOKED]: {
    icon: CalendarCheckIcon,
    badge: "bg-sky-50 text-sky-700 ring-sky-200",
    rail: "bg-sky-500",
    soft: "bg-sky-50/60",
    iconWrap: "bg-sky-100 text-sky-600",
  },
  [JourneyState.AWAITING_RESULT]: {
    icon: ClockIcon,
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    rail: "bg-amber-500",
    soft: "bg-amber-50/60",
    iconWrap: "bg-amber-100 text-amber-600",
  },
  [JourneyState.RESCHEDULE_REQUIRED]: {
    icon: CalendarXIcon,
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
    rail: "bg-orange-500",
    soft: "bg-orange-50/60",
    iconWrap: "bg-orange-100 text-orange-600",
  },
  [JourneyState.PASSED]: {
    icon: TrophyIcon,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rail: "bg-emerald-500",
    soft: "bg-emerald-50/60",
    iconWrap: "bg-emerald-100 text-emerald-600",
  },
  [JourneyState.FAILED]: {
    icon: XCircleIcon,
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    rail: "bg-rose-500",
    soft: "bg-rose-50/60",
    iconWrap: "bg-rose-100 text-rose-600",
  },
  [JourneyState.BADGE_NULLIFIED]: {
    icon: BanIcon,
    badge: "bg-rose-50 text-rose-800 ring-rose-300",
    rail: "bg-rose-700",
    soft: "bg-rose-50/60",
    iconWrap: "bg-rose-100 text-rose-700",
  },
};

/** Small coloured pill: icon + the state's name. */
export function StateBadge({
  state,
  label,
  className,
}: {
  state: JourneyState;
  /** Overrides the text (e.g. "Ready to book · Novice"); defaults to the state's name. */
  label?: string;
  className?: string;
}) {
  const tone = STATE_TONE[state];
  const Icon = tone.icon;
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        tone.badge,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label ?? JOURNEY_STATE_LABEL[state]}
    </span>
  );
}
