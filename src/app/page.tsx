import Link from "next/link";
import { listPersonas, type Persona } from "@/db/queries/personas";
import { JourneyState } from "@/domain/states";
import { PersonaButton } from "@/components/shared/PersonaButton";
import { ResetDemoButton } from "@/components/shared/ResetDemoButton";
import { NoticeToast } from "@/components/shared/NoticeToast";

type Tone = "neutral" | "good" | "warn" | "bad" | "info";

const HINT_TONE: Record<JourneyState, Tone> = {
  [JourneyState.NOT_ELIGIBLE]: "neutral",
  [JourneyState.READY_TO_BOOK]: "info",
  [JourneyState.RETAKE_COOLDOWN]: "warn",
  [JourneyState.BOOKED]: "info",
  [JourneyState.AWAITING_RESULT]: "warn",
  [JourneyState.RESCHEDULE_REQUIRED]: "warn",
  [JourneyState.PASSED]: "good",
  [JourneyState.FAILED]: "bad",
  [JourneyState.BADGE_NULLIFIED]: "bad",
};

function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ notice }, groups] = await Promise.all([searchParams, listPersonas()]);

  const student = (p: Persona) => (
    <PersonaButton
      key={p.id}
      id={p.id}
      name={p.name}
      hint={p.hint}
      tone={p.hintState ? HINT_TONE[p.hintState] : "neutral"}
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <NoticeToast notice={typeof notice === "string" ? notice : undefined} />

      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          GRIT interview scheduling
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          How to explore: pick a student to book or see a result, an interviewer to set
          availability and record outcomes, or the interview team to see who has booked.
          The tags on each student show where they are right now, and you can switch
          persona any time from the bar at the top.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ResetDemoButton />
          <Link
            href="/showcase"
            className="text-sm font-medium underline underline-offset-4 hover:text-foreground/80"
          >
            See before/after screens and key messages
          </Link>
        </div>
      </div>

      <Section title="Students" blurb="Book an interview, reschedule, or see a result.">
        {groups.students.map(student)}
      </Section>

      <Section title="Interviewers" blurb="Set availability, run the daily schedule, record outcomes.">
        {groups.interviewers.map((p) => (
          <PersonaButton key={p.id} id={p.id} name={p.name} description="Availability and schedule" />
        ))}
      </Section>

      <Section title="Interview team" blurb="See who has booked and who hasn't; flag malpractice.">
        {groups.teamAdmins.map((p) => (
          <PersonaButton key={p.id} id={p.id} name={p.name} description="Booking tracker" />
        ))}
      </Section>
    </div>
  );
}
