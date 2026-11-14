import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, MessageSquareTextIcon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BadgeShelf } from "@/components/student/BadgeShelf";
import { MessageBanner } from "@/components/student/MessageBanner";
import { StudentHomeView } from "@/components/student/StudentHomeView";
import { TierChip } from "@/components/student/TierChip";
import { deriveTier } from "@/domain/derive";
import { AwardStatus } from "@/domain/states";
import { FIXTURE_NOW, SCENARIOS, getShowcaseMessages, type HomeFixture } from "./fixtures";

function tierOf(f: HomeFixture) {
  return deriveTier(
    f.allJourneys.flatMap((j) =>
      j.award ? [{ status: j.award.status as AwardStatus, badge_id: j.badge.id }] : [],
    ),
  );
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  const after = label.startsWith("After");
  return (
    <div className="min-w-0 space-y-2">
      <p
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
          after ? "bg-grit text-white" : "bg-slate-200 text-slate-700",
        )}
      >
        {after ? <ArrowRightIcon className="size-3.5" aria-hidden="true" /> : null}
        {label}
      </p>
      <div className={cn("rounded-2xl border bg-background p-4 shadow-soft", after && "border-primary/30")}>
        {children}
      </div>
    </div>
  );
}

function SectionTitle({ n, id, children }: { n: number; id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-xl font-bold sm:text-2xl">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-grit text-sm font-bold text-white">{n}</span>
      {children}
    </h2>
  );
}

export default function ShowcasePage() {
  const messages = getShowcaseMessages();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-8">
      <div className="relative overflow-hidden rounded-3xl bg-grit p-6 text-white shadow-xl sm:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-spark/30 blur-3xl" />
        <div className="relative max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ring-white/25">
            <SparklesIcon className="size-3.5 text-spark" aria-hidden="true" />
            Showcase
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Before and after the interview</h1>
          <p className="text-sm text-white/85 sm:text-base">
            What a student sees before their result and after each outcome, plus the three most
            important messages. These screens use the same components as the live app, filled with
            fixed example data.
          </p>
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-brand shadow-sm hover:bg-white/90"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            Back to personas
          </Link>
        </div>
      </div>

      <section className="space-y-6" aria-labelledby="home-heading">
        <SectionTitle n={1} id="home-heading">
          Student home — before and after the interview result
        </SectionTitle>
        {SCENARIOS.map((s) => (
          <div key={s.key} className="space-y-3 rounded-3xl border bg-card/60 p-4 sm:p-6">
            <div>
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.caption}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Before: result pending", s.before],
                [`After: ${s.title}`, s.after],
              ].map(([label, fixture]) => (
                <Frame key={label as string} label={label as string}>
                  <StudentHomeView
                    firstName="Aarav"
                    journeys={(fixture as HomeFixture).journeys}
                    notification={(fixture as HomeFixture).notification}
                    now={FIXTURE_NOW}
                    headingAs="h3"
                  />
                </Frame>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-6" aria-labelledby="badges-heading">
        <SectionTitle n={2} id="badges-heading">
          Badges screen — before and after
        </SectionTitle>
        {SCENARIOS.map((s) => (
          <div key={s.key} className="space-y-3 rounded-3xl border bg-card/60 p-4 sm:p-6">
            <h3 className="text-lg font-bold">{s.title}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Before: result pending", s.before],
                [`After: ${s.title}`, s.after],
              ].map(([label, fixture]) => (
                <Frame key={label as string} label={label as string}>
                  <div className="space-y-3">
                    <TierChip tier={tierOf(fixture as HomeFixture)} />
                    <BadgeShelf journeys={(fixture as HomeFixture).allJourneys} />
                  </div>
                </Frame>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4" aria-labelledby="messages-heading">
        <SectionTitle n={3} id="messages-heading">
          The 3 most important student messages
        </SectionTitle>
        <div className="grid gap-4 lg:grid-cols-3">
          {(
            [
              ["Booking confirmed", messages.bookingConfirmed],
              ["Result: Passed", messages.resultPassed],
              ["Result: Retake later", messages.resultRetake],
            ] as const
          ).map(([caption, m]) => (
            <div key={caption} className="min-w-0 space-y-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                <MessageSquareTextIcon className="size-3.5" aria-hidden="true" />
                {caption}
              </p>
              <MessageBanner title={m.title} body={m.body} ctaLabel={m.ctaLabel} ctaHref={m.ctaHref} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
