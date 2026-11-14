import Link from "next/link";
import { deriveTier } from "@/domain/derive";
import { AwardStatus } from "@/domain/states";
import type { JourneyView, NotificationView } from "@/db/queries/student";
import { JourneyCard } from "./JourneyCard";
import { MessageBanner } from "./MessageBanner";
import { TierChip } from "./TierChip";

type StudentHomeViewProps = {
  firstName: string;
  journeys: JourneyView[];
  notification: NotificationView | null;
  now: Date;
  /** Live app only: lets the banner be dismissed. Fixtures leave this off. */
  dismissable?: boolean;
  /** Show the link to the badge shelf (live app). */
  showShelfLink?: boolean;
  /** Heading level for the greeting: h1 on the live page, h3 inside showcase frames. */
  headingAs?: "h1" | "h3";
};

/** The student home. Rendered by /student (live data) and /showcase (fixtures). */
export function StudentHomeView({
  firstName,
  journeys,
  notification,
  now,
  dismissable = false,
  showShelfLink = false,
  headingAs: Heading = "h1",
}: StudentHomeViewProps) {
  const tier = deriveTier(
    journeys.flatMap((j) =>
      j.award ? [{ status: j.award.status as AwardStatus, badge_id: j.badge.id }] : [],
    ),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Heading className="text-3xl font-extrabold tracking-tight">
            Hi <span className="text-grit">{firstName}</span>
          </Heading>
          <p className="text-sm text-muted-foreground">Your GRIT badge interviews at a glance.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <TierChip tier={tier} />
          {showShelfLink ? (
            <Link
              href="/student/badges"
              className="text-sm font-medium underline underline-offset-4"
            >
              View badge shelf
            </Link>
          ) : null}
        </div>
      </div>

      {notification ? (
        <MessageBanner
          notificationId={dismissable ? notification.id : undefined}
          title={notification.title}
          body={notification.body}
          ctaLabel={notification.ctaLabel}
          ctaHref={notification.ctaHref}
        />
      ) : null}

      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your badge journeys
        </h2>
        {journeys.map((journey, i) => {
          const later = journeys[i + 1];
          return (
            <JourneyCard
              key={journey.badge.id}
              journey={journey}
              now={now}
              next={later ? { label: later.badge.label, state: later.state } : null}
            />
          );
        })}
      </div>
    </div>
  );
}
