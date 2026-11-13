import { getActor } from "@/lib/session";
import { getStudentHome } from "@/db/queries/student";
import { UserRole } from "@/domain/states";
import { StudentHomeView } from "@/components/student/StudentHomeView";

export default async function StudentHomePage() {
  // The layout redirects other roles; this just narrows the type.
  const actor = await getActor();
  if (!actor || actor.role !== UserRole.STUDENT) return null;

  const { now, journeys, notification } = await getStudentHome(actor.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <StudentHomeView
        firstName={actor.name.split(" ")[0]}
        journeys={journeys}
        notification={notification}
        now={now}
        dismissable
        showShelfLink
      />
    </div>
  );
}
