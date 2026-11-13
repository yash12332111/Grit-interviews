import Link from "next/link";
import { getActor } from "@/lib/session";
import {
  BOOKED_STATES,
  NOT_BOOKED_STATES,
  getTrackerRows,
} from "@/db/queries/team";
import { JOURNEY_STATE_LABEL } from "@/db/queries/personas";
import { JourneyState, UserRole } from "@/domain/states";
import { EmptyState } from "@/components/shared/EmptyState";
import { TrackerTable } from "@/components/team/TrackerTable";
import { cn } from "@/lib/utils";

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
        "rounded-full border px-3 py-1 text-sm transition",
        active ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground/40",
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
}: {
  label: string;
  count: number;
  hint: string;
  active: boolean;
  to: string;
}) {
  return (
    <Link
      href={to}
      aria-current={active ? "true" : undefined}
      className={cn(
        "block rounded-xl border bg-card p-4 transition hover:border-foreground/40",
        active && "border-foreground ring-2 ring-foreground/20",
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tabular-nums">{count}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
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
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Interview team tracker</h1>
        <p className="text-sm text-muted-foreground">
          Who has booked their badge interview and who hasn&apos;t. Click a tile to filter the list.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Tile
          label="Booked"
          count={bookedCount}
          hint="Booked + awaiting result"
          active={filters.group === "booked"}
          to={href({ ...filters, group: filters.group === "booked" ? undefined : "booked" })}
        />
        <Tile
          label="Not booked"
          count={notBookedCount}
          hint="Ready to book + reschedule required + retake cooldown"
          active={filters.group === "not_booked"}
          to={href({ ...filters, group: filters.group === "not_booked" ? undefined : "not_booked" })}
        />
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Students who already hold a badge (or had one revoked) are listed below but counted in neither tile.
      </p>

      <div className="space-y-3">
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
