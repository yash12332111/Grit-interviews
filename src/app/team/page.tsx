import Link from "next/link";
import { getActor } from "@/lib/session";
import {
  BOOKED_STATES,
  NOT_BOOKED_STATES,
  getTrackerRows,
} from "@/db/queries/team";
import { JOURNEY_STATE_LABEL, JourneyState, UserRole } from "@/domain/states";
import { EmptyState } from "@/components/shared/EmptyState";
import { TrackerTable } from "@/components/team/TrackerTable";
import { cn } from "@/lib/utils";
import { CalendarCheckIcon, CalendarClockIcon, LayoutDashboardIcon, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

type Query = { [key: string]: string | string[] | undefined };
type Filters = { group?: "booked" | "not_booked"; badge?: string; state?: string };

const STATE_VALUES = Object.values(JourneyState) as string[];

function pick(query: Query, key: string): string | undefined {
  const v = query[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Builds a /team URL from the given filters, dropping empty ones. */
function href(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.group) params.set("group", filters.group);
  if (filters.badge) params.set("badge", filters.badge);
  if (filters.state) params.set("state", filters.state);
  const qs = params.toString();
  return qs ? `/team?${qs}` : "/team";
}

function Chip({ active, to, children }: { active: boolean; to: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-sm font-medium transition",
        active ? "border-transparent bg-primary text-primary-foreground shadow-sm" : "bg-card hover:border-primary/40 hover:text-primary",
      )}
    >
      {children}
    </Link>
  );
}

function Tile({
  label,
  count,
  hint,
  active,
  to,
  icon: Icon,
  tone,
}: {
  label: string;
  count: number;
  hint: string;
  active: boolean;
  to: string;
  icon: LucideIcon;
  tone: "sky" | "orange";
}) {
  return (
    <Link
      href={to}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg",
        active && "border-primary ring-2 ring-primary/25",
      )}
    >
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-4xl font-extrabold tabular-nums", tone === "sky" ? "text-sky-600" : "text-orange-600")}>
        {count}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-4 top-4 grid size-11 place-items-center rounded-xl",
          tone === "sky" ? "bg-sky-100 text-sky-600" : "bg-orange-100 text-orange-600",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="mt-3 block text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
        {active ? "Showing these · click to clear" : "Click to filter"}
      </span>
    </Link>
  );
}

export default async function TeamPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  // The layout redirects other roles; this just narrows the type.
  const actor = await getActor();
  if (!actor || actor.role !== UserRole.TEAM_ADMIN) return null;

  const { rows } = await getTrackerRows();

  const groupRaw = pick(query, "group");
  const stateRaw = pick(query, "state");
  const filters: Filters = {
    group: groupRaw === "booked" || groupRaw === "not_booked" ? groupRaw : undefined,
    badge: rows.some((r) => r.badgeLevel === pick(query, "badge")) ? pick(query, "badge") : undefined,
    state: stateRaw && STATE_VALUES.includes(stateRaw) ? stateRaw : undefined,
  };

  // Tiles reflect the badge filter; the group and state filters narrow the table.
  const byBadge = filters.badge ? rows.filter((r) => r.badgeLevel === filters.badge) : rows;
  const bookedCount = byBadge.filter((r) => BOOKED_STATES.includes(r.state)).length;
  const notBookedCount = byBadge.filter((r) => NOT_BOOKED_STATES.includes(r.state)).length;

  const visible = byBadge.filter((r) => {
    if (filters.group === "booked" && !BOOKED_STATES.includes(r.state)) return false;
    if (filters.group === "not_booked" && !NOT_BOOKED_STATES.includes(r.state)) return false;
    if (filters.state && r.state !== filters.state) return false;
    return true;
  });

  const badgeChips = [
    ...new Map(rows.map((r) => [r.badgeLevel, { label: r.badgeLabel, rank: r.badgeRank }])).entries(),
  ].sort((a, b) => a[1].rank - b[1].rank);
  const stateChips = STATE_VALUES.filter((s) => byBadge.some((r) => r.state === s));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        icon={LayoutDashboardIcon}
        title="Interview team tracker"
        description="Who has booked their badge interview and who hasn't. Click a tile to filter the list."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Tile
          label="Booked"
          count={bookedCount}
          hint="Booked + awaiting result"
          icon={CalendarCheckIcon}
          tone="sky"
          active={filters.group === "booked"}
          to={href({ ...filters, group: filters.group === "booked" ? undefined : "booked" })}
        />
        <Tile
          label="Not booked"
          count={notBookedCount}
          hint="Ready to book + reschedule required + retake cooldown"
          icon={CalendarClockIcon}
          tone="orange"
          active={filters.group === "not_booked"}
          to={href({ ...filters, group: filters.group === "not_booked" ? undefined : "not_booked" })}
        />
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Students who already hold a badge (or had one revoked) are listed below but counted in neither tile.
      </p>

      <div className="space-y-3 rounded-2xl border bg-card/70 p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 text-sm font-medium">Badge</span>
          <Chip active={!filters.badge} to={href({ ...filters, badge: undefined })}>
            All
          </Chip>
          {badgeChips.map(([level, { label }]) => (
            <Chip key={level} active={filters.badge === level} to={href({ ...filters, badge: level })}>
              {label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 text-sm font-medium">State</span>
          <Chip active={!filters.state} to={href({ ...filters, state: undefined })}>
            All
          </Chip>
          {stateChips.map((s) => (
            <Chip key={s} active={filters.state === s} to={href({ ...filters, state: s })}>
              {JOURNEY_STATE_LABEL[s as JourneyState]}
            </Chip>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing {visible.length} of {byBadge.length} journeys
        {filters.group || filters.state || filters.badge ? (
          <>
            {" · "}
            <Link href="/team" className="font-medium underline underline-offset-4">
              Clear filters
            </Link>
          </>
        ) : null}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title="No journeys match these filters"
          description="Try clearing a filter to see everyone again."
        />
      ) : (
        <TrackerTable rows={visible} />
      )}
    </div>
  );
}
