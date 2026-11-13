import Link from "next/link";
import { getActor } from "@/lib/session";
import { listPersonas } from "@/db/queries/personas";
import { PersonaSwitcher, type SwitcherGroup } from "./PersonaSwitcher";

/** Sits above every page: states that this is a demo and lets you switch persona (HC-7). */
export async function DemoBanner() {
  const [actor, groups] = await Promise.all([getActor(), listPersonas()]);

  const switcherGroups: SwitcherGroup[] = [
    { label: "Students", personas: groups.students },
    { label: "Interviewers", personas: groups.interviewers },
    { label: "Interview team", personas: groups.teamAdmins },
  ];

  return (
    <header className="border-b border-amber-200 bg-amber-50 text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/" className="font-semibold hover:underline">
            GRIT Interviews
          </Link>
          <span>Demo mode — switch persona any time</span>
        </div>
        <PersonaSwitcher currentId={actor?.id ?? null} groups={switcherGroups} />
      </div>
    </header>
  );
}
