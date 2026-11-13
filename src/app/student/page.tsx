import { getActor } from "@/lib/session";
import { getStudentHome } from "@/db/queries/student";
import { UserRole } from "@/domain/states";
import { JourneyCard } from "@/components/student/JourneyCard";
import { MessageBanner } from "@/components/student/MessageBanner";

export default async function StudentHomePage() {
  // The layout redirects other roles; this just narrows the type.
  const actor = await getActor();
  if (!actor || actor.role !== UserRole.STUDENT) return null;

  const { now, journeys, notification } = await getStudentHome(actor.id);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Hi {actor.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Your GRIT badge interviews at a glance.</p>
      </div>

      {notification ? (
        <MessageBanner
          notificationId={notification.id}
          title={notification.title}
          body={notification.body}
          ctaLabel={notification.ctaLabel}
          ctaHref={notification.ctaHref}
        />
      ) : null}

      <div className="space-y-4">
        {journeys.map((journey) => (
          <JourneyCard key={journey.badge.id} journey={journey} now={now} />
        ))}
      </div>
    </div>
  );
}
