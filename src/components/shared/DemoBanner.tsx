import Link from "next/link";
import { SparklesIcon } from "lucide-react";
import { getActor } from "@/lib/session";
import { listPersonas } from "@/db/queries/personas";
import { UserRole } from "@/domain/states";
import { PersonaSwitcher, type SwitcherGroup } from "./PersonaSwitcher";
import { HeaderNav, type NavItem } from "./HeaderNav";

const NAV: Record<UserRole, NavItem[]> = {
  [UserRole.STUDENT]: [
    { href: "/student", label: "Home" },
    { href: "/student/badges", label: "Badges" },
  ],
  [UserRole.INTERVIEWER]: [
    { href: "/interviewer/schedule", label: "Daily schedule" },
    { href: "/interviewer/availability", label: "Availability" },
  ],
  [UserRole.TEAM_ADMIN]: [{ href: "/team", label: "Tracker" }],
};

/**
 * App header on every page: brand, role navigation, and the demo persona
 * switcher ("Demo mode — switch persona any time", HC-7).
 */
export async function DemoBanner() {
  const [actor, groups] = await Promise.all([getActor(), listPersonas()]);

  const switcherGroups: SwitcherGroup[] = [
    { label: "Students", personas: groups.students },
    { label: "Interviewers", personas: groups.interviewers },
    { label: "Interview team", personas: groups.teamAdmins },
  ];

  return (
    <header className="bg-grit text-white shadow-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5" aria-label="GRIT Interviews home">
          <span className="grid size-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <SparklesIcon className="size-5 text-spark" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-extrabold tracking-wide">GRIT</span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
              Interviews
            </span>
          </span>
        </Link>

        <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
          <HeaderNav items={actor ? NAV[actor.role] : []} />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="hidden rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/85 ring-1 ring-white/20 md:inline">
            Demo mode — switch persona any time
          </span>
          <span className="rounded-full bg-spark px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-900 md:hidden">
            Demo
          </span>
          <PersonaSwitcher currentId={actor?.id ?? null} groups={switcherGroups} />
        </div>
      </div>
    </header>
  );
}
