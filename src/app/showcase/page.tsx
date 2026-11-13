import Link from "next/link";
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
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="rounded-xl border bg-background p-4">{children}</div>
    </div>
  );
}

export default function ShowcasePage() {
  const messages = getShowcaseMessages();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Before and after the interview</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          What a student sees before their result and after each outcome, plus the three most
          important messages. These screens use the same components as the live app, filled with
          fixed example data.
        </p>
        <Link href="/" className="inline-block text-sm font-medium underline underline-offset-4">
          Back to personas
        </Link>
      </div>

      <section className="space-y-6" aria-labelledby="home-heading">
        <h2 id="home-heading" className="text-xl font-semibold">
          Student home — before and after the interview result
        </h2>
        {SCENARIOS.map((s) => (
          <div key={s.key} className="space-y-2">
            <h3 className="text-base font-semibold">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.caption}</p>
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
        <h2 id="badges-heading" className="text-xl font-semibold">
          Badges screen — before and after
        </h2>
        {SCENARIOS.map((s) => (
          <div key={s.key} className="space-y-2">
            <h3 className="text-base font-semibold">{s.title}</h3>
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
        <h2 id="messages-heading" className="text-xl font-semibold">
          The 3 most important student messages
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {(
            [
              ["Booking confirmed", messages.bookingConfirmed],
              ["Result: Passed", messages.resultPassed],
              ["Result: Retake later", messages.resultRetake],
            ] as const
          ).map(([caption, m]) => (
            <div key={caption} className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
