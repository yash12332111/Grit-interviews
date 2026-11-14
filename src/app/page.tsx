import Link from "next/link";
import {
  CalendarClockIcon,
  ClipboardCheckIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  MousePointerClickIcon,
  RepeatIcon,
  SparklesIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { listPersonas } from "@/db/queries/personas";
import { PersonaButton } from "@/components/shared/PersonaButton";
import { ResetDemoButton } from "@/components/shared/ResetDemoButton";
import { NoticeToast } from "@/components/shared/NoticeToast";

function Section({
  icon: Icon,
  title,
  blurb,
  children,
}: {
  icon: LucideIcon;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{blurb}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: MousePointerClickIcon, title: "Pick a persona", text: "No sign-up. Each card is a student, interviewer or team member." },
  { icon: CalendarClockIcon, title: "Play the journey", text: "Book a slot, record an outcome, or track who has booked." },
  { icon: RepeatIcon, title: "Switch any time", text: "Use the switcher in the header to see the other side." },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ notice }, groups] = await Promise.all([searchParams, listPersonas()]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8">
      <NoticeToast notice={typeof notice === "string" ? notice : undefined} />

      <div className="relative overflow-hidden rounded-3xl bg-grit p-6 text-white shadow-xl sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-spark/30 blur-3xl"
        />
        <div className="relative max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ring-white/25">
            <SparklesIcon className="size-3.5 text-spark" aria-hidden="true" />
            GRIT badge interviews
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            GRIT interview scheduling
          </h1>
          <p className="max-w-2xl text-sm text-white/85 sm:text-base">
            How to explore: pick a student to book or see a result, an interviewer to set
            availability and record outcomes, or the interview team to see who has booked.
            The tags on each student show where they are right now, and you can switch
            persona any time from the bar at the top.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <ResetDemoButton />
            <Link
              href="/showcase"
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-left text-sm font-semibold text-brand shadow-sm transition hover:bg-white/90"
            >
              See before/after screens and key messages
            </Link>
          </div>
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3 rounded-2xl border bg-card/80 p-4 shadow-soft">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-spark/15 text-sm font-bold text-orange-700">
              {i + 1}
            </span>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <step.icon className="size-4 text-primary" aria-hidden="true" />
                {step.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <Section icon={GraduationCapIcon} title="Students" blurb="Book an interview, reschedule, or see a result.">
        {groups.students.map((p) => (
          <PersonaButton key={p.id} id={p.id} name={p.name} role="student" hint={p.hint} hintState={p.hintState} />
        ))}
      </Section>

      <Section icon={ClipboardCheckIcon} title="Interviewers" blurb="Set availability, run the daily schedule, record outcomes.">
        {groups.interviewers.map((p) => (
          <PersonaButton key={p.id} id={p.id} name={p.name} role="interviewer" description="Availability and schedule" />
        ))}
      </Section>

      <Section icon={UsersIcon} title="Interview team" blurb="See who has booked and who hasn't; flag malpractice.">
        {groups.teamAdmins.map((p) => (
          <PersonaButton key={p.id} id={p.id} name={p.name} role="team_admin" description="Booking tracker" />
        ))}
      </Section>

      <p className="flex items-center justify-center gap-1.5 pb-4 text-xs text-muted-foreground">
        <LayoutDashboardIcon className="size-3.5" aria-hidden="true" />
        Demo data refreshes itself every 6 hours, or reset it any time above.
      </p>
    </div>
  );
}
