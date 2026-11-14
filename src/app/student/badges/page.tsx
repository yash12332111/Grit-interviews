import Link from "next/link";
import { getActor } from "@/lib/session";
import { getStudentHome } from "@/db/queries/student";
import { deriveTier } from "@/domain/derive";
import { AwardStatus, UserRole } from "@/domain/states";
import { BadgeShelf } from "@/components/student/BadgeShelf";
import { TierChip } from "@/components/student/TierChip";
import { AwardIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

export default async function BadgesPage() {
  // The layout redirects other roles; this just narrows the type.
  const actor = await getActor();
  if (!actor || actor.role !== UserRole.STUDENT) return null;

  const { allJourneys } = await getStudentHome(actor.id);
  const tier = deriveTier(
    allJourneys.flatMap((j) =>
      j.award ? [{ status: j.award.status as AwardStatus, badge_id: j.badge.id }] : [],
    ),
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <PageHeader
        icon={AwardIcon}
        title="Your badges"
        description="Every badge in your track, from earned to locked."
        actions={<TierChip tier={tier} />}
      />
      <BadgeShelf journeys={allJourneys} />
      <Link href="/student" className="inline-block text-sm font-medium underline underline-offset-4">
        Back to home
      </Link>
    </div>
  );
}
