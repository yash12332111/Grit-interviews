# implementation_plan_nxtwave.md — Building the GRIT Interview Scheduling prototype in Google Antigravity

> Follows `architecture.md` **v3.2**. Builds the **prototype only**. The 2-page write-up is already drafted as a separate file (`GRIT_Interview_Scheduling_Writeup.docx`). This plan says **how and in what order**. Architecture says **what and why**.
> If the two ever disagree, `architecture.md` wins, and the assignment brief beats both.

---

## 0. Operating model

### 0.1 How to run each phase in Antigravity
1. One phase = one fresh agent conversation. A clean context avoids drift and wastes less quota.
2. Use **Planning mode**. Paste the phase prompt from this file. **Read the agent's plan before approving it.** Reject it if it touches files outside the phase or adds features.
3. When the agent finishes, run the **Validation gate** yourself. Do not trust the agent's "done".
4. When the gate passes, commit and push with the given message. Then start the next phase.
5. When a gate fails, start a fix conversation: "Phase N validation failed: <what you saw>. Fix only this, change nothing else." Don't move on with a failed gate.

### 0.2 Quota protection (the free Antigravity tier refreshes **weekly**)
- Prompts are scoped tightly on purpose. Don't merge phases to save time. Merged phases burn more quota when they fail.
- Push after every phase. Vercel deploys automatically from P2, so a live link exists early.
- If the quota runs out mid-build: the repo, the docs, and the remaining prompts are self-contained. Continue in another tool with the same prompts, or by hand. *Whether another tool's free tier fits is unverified, so check before relying on it.*

### 0.3 Suggested schedule (internal deadline 13 Nov, 23:00 IST)

| Window | Phases |
|---|---|
| 11 Nov evening | P0, P1 |
| 12 Nov | P2, P3, P4, P5 |
| 13 Nov morning | P6, P7, P8 |
| 13 Nov afternoon/evening | P9 (Loom, submit) |
| 14 Nov | Buffer only |

### 0.4 Workspace rule (paste once into Antigravity's workspace rules)
*The exact menu location for rules in Antigravity may differ by version. Look for Customizations → Rules → Workspace, or the equivalent.*

```
PROJECT RULES — GRIT Interview Scheduling (NxtWave assignment)
1. docs/architecture.md is the single source of truth. Read the relevant sections before planning.
2. Build ONLY what the current phase prompt asks. Do not add routes, tables, actions,
   libraries, features, settings pages, auth providers, analytics, or LLM calls that
   are not in docs/architecture.md.
3. All business rules live in src/domain (pure, no I/O). Server Actions in src/actions
   are the only write path. Pages never write to the database directly.
4. Every Server Action: zod-validate input → requireRole → single DB transaction →
   conditional state updates → return Result<T> using the error codes in architecture §12.
5. All times stored in UTC, displayed in Asia/Kolkata via src/lib/time.ts.
6. Every constant from architecture §8.3 lives in src/domain/config.ts. No magic numbers elsewhere.
7. Use only free, open-source libraries already listed in architecture §4.1.
   Ask before adding any other dependency.
8. Never commit secrets. .env.local is gitignored; .env.example has names only.
9. Do not start the next phase. End each task with: files changed, how to verify,
   and anything that deviated from the prompt.
```

---

## P0 — Decisions, accounts, repo skeleton (no agent needed)

**Goal**: remove every external blocker before agent work starts.

**You do:**
1. Confirm or override D-01 to D-05 (architecture §3.2). If you change none, the defaults stand.
2. Open both submission links (the one in the brief and `forms.gle/eJS6H7Gj1Cnihmsn9` from the email). Confirm that both show the same form with 3 link fields.
3. **GitHub**: create an empty repo named `grit-interviews`. Public or private both work, since Vercel connects to either.
4. **Vercel**: sign up on Hobby with GitHub. Don't import the repo yet. Check whether Hobby lets you set the Functions region (architecture §4.1, Regions):
   - If you can pick Mumbai or Singapore, note it.
   - If not, the functions run in Vercel's default US East region.
5. **Neon**: sign up on the Free plan and create the project in the **region matching step 4**:
   - US East if Vercel stays on its default.
   - The nearest Asia region if you could set Vercel to Mumbai or Singapore.

   Copy **both** the pooled and the direct (unpooled) connection strings. Confirm no card was requested.
6. Check in Neon's docs that the serverless **Pool** driver supports interactive transactions, and which connection string the app should use. Update architecture §4.1 if anything differs.
7. **Scaffold yourself** in a terminal. This saves agent quota, and it avoids create-next-app refusing to run in a folder that already has files:
   `npx create-next-app@latest grit-interviews --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
   Accept the defaults for any extra prompts.
8. Inside `grit-interviews`: create `docs/` and copy `architecture.md` and this plan into it. Create `.env.local` with two lines: `DATABASE_URL=` plus the pooled string, and `DATABASE_URL_UNPOOLED=` plus the direct string. Confirm `.gitignore` covers `.env*.local`.
9. Point the folder at your GitHub repo and push the scaffold:
   `git init && git add . && git commit -m "P0: scaffold" && git branch -M main && git remote add origin https://github.com/yash12332111/grit-interviews.git && git push -u origin main`
   Use the URL of the repo you created in step 3.
10. Open the folder in Antigravity and paste the workspace rule (§0.4).

**Validation gate:**
- [ ] Decisions recorded at the top of `docs/architecture.md` §3.2, or left as defaults
- [ ] The form link is confirmed
- [ ] Neon shows the Free plan, and both strings are saved in your password manager or notes
- [ ] Vercel shows the Hobby plan, with no card on file
- [ ] `npm run dev` shows the default Next.js page
- [ ] The scaffold is pushed to GitHub
- [ ] The Antigravity workspace has the rule and the docs folder

**Commit**: `P0: scaffold` (done in step 9).

---

## P1 — Domain core, schema, migrations, seed, tests

**Goal**: a correct state machine and database before any UI exists. (Architecture §6, §7, §8.3, §8.4.)

**Agent prompt (paste as is):**
```
Phase P1. Read docs/architecture.md §4.1, §5.3 (F4), §6, §7, §8.3, §8.4, §9 first.
The Next.js app is already scaffolded; do not re-scaffold. Do not touch docs/ or .env.local.

1. Install: drizzle-orm, @neondatabase/serverless, zod. Dev: drizzle-kit, vitest, tsx,
   dotenv. If the Neon Pool driver needs the "ws" package in Node, install it and
   configure it as Neon's docs describe.
2. Create .env.example with DATABASE_URL and DATABASE_URL_UNPOOLED (names only).
   drizzle.config.ts and scripts/seed.ts must load .env.local explicitly (dotenv with
   path ".env.local"). drizzle.config.ts uses DATABASE_URL_UNPOOLED.
3. src/domain: config.ts, states.ts, transitions.ts, rules.ts, derive.ts, messages.ts
   exactly per architecture §6 and §8.3. Pure functions only; `now` is always a parameter.
   deriveJourneyState must follow the precedence list in §6.1 exactly.
   rules.ts canBook must include the A-21 prerequisite check; add higherBadgesToLock.
   messages.ts: implement all 8 templates from §6.4 as functions returning
   {title, body, ctaLabel?, ctaHref?} with every value resolved from ctx. Write final,
   human, encouraging copy in Indian English; times formatted in IST; no placeholders.
4. src/db/schema.ts: every table, enum, partial unique index, check and index from §7.1,
   §7.3, §7.4 using Drizzle (including badges.bonus_miles, attempt status 'withdrawn',
   booking status 'cancelled_by_system'). src/db/client.ts: Neon Pool + Drizzle using DATABASE_URL.
5. src/db/seed.ts: export seed(db), idempotent, exactly per §8.4: fixed UUID constants
   for users/track/badges; T0 = now rounded down to :00/:30; booked and past slots
   first, then open slots skipping used (interviewer, start_at); every persona S1–S11
   with the listed timing; eligibilities granted 1–20 days ago; the listed seeded
   notifications; demo_meta.seeded_at = now; truncate with cascade before inserting.
   scripts/seed.ts: CLI wrapper.
6. src/db/freshness.ts: ensureFreshDemo(db) per F4 — one transaction, SELECT demo_meta
   FOR UPDATE, reseed only if seeded_at is older than DEMO_STALE_HOURS.
7. vitest.config.ts with the "@/" alias resolving to src/. package.json scripts:
   db:generate, db:migrate, db:seed, test.
8. tests/domain: transitions.test.ts (table-driven: every allowed transition passes,
   every other state/trigger pair rejects), rules.test.ts (window, cutoff, reschedule
   limit, cooldown, outcome-after-start, boundary at exactly start_at and not_before),
   derive.test.ts (all 9 journey states, including a failed student resolving to FAILED
   not NOT_ELIGIBLE, and a nullified award winning over everything; deriveTier),
   messages.test.ts (no template output contains "undefined", "null", "{", or "}").
   rules.test.ts must also cover: canBook rejects Specialist without an active Novice
   award; higherBadgesToLock returns Specialist when Novice is nullified.

Do not build any pages or actions. Stop after this and report.
```

**Validation gate (run these yourself):**
- [ ] `npm run test` passes. Open `transitions.test.ts` and confirm it covers T2–T11, T13 and T15 plus the rejection matrix.
- [ ] `npm run db:generate` then `npm run db:migrate` apply cleanly to Neon. Tables are visible in the Neon console.
- [ ] `npm run db:seed` runs twice without error. In the Neon SQL editor, row counts are the same both times.
- [ ] **Constraint check in the Neon SQL editor**: try inserting a second `active` booking for a slot that already has one. It must fail. Do the same for a student who already has an active booking.
- [ ] Check the seed against §8.4 in the Neon SQL editor:
  - S4 and S5 have bookings with I1 1 and 2 hours ago, and S6 has one about 26 hours ago.
  - S3 has a booking with I1 about 8 hours ahead, and S2 has one 3 days out.
  - The user IDs are the same after a second seed run.
- [ ] Read `messages.ts` aloud. The three starred messages must sound human and be complete.

**Commit**: `P1: domain core, schema, migrations, seed, tests`

---

## P2 — App shell, personas, role guards, demo freshness, first deploy

**Goal**: three role areas reachable without sign-up, the demo self-heals, and a public link exists. (Architecture §5.1, §8.1 `/`, §8.2 `selectPersona`, `resetDemoData`, F4.)

**Agent prompt:**
```
Phase P2. Read docs/architecture.md §5, §8.1 (row "/"), §8.2, §9, §12.

1. Initialise shadcn/ui and add only: button, card, dialog, badge, tabs, sonner, select,
   input, textarea, table, skeleton.
2. src/lib/result.ts: Result<T> type and the error code union from §12.
   src/lib/time.ts: IST formatters (date, time, date+time, relative day label).
   src/lib/session.ts: persona cookie read/write; getActor(); requireRole(role) that
   throws a FORBIDDEN Result; if the cookie points to a missing user, clear it.
3. src/db/queries/personas.ts: list personas grouped by role with a LIVE state hint for
   each student (use deriveJourneyState; show the most relevant badge's state).
4. src/actions/persona.ts selectPersona; src/actions/demo.ts resetDemoData (calls seed).
5. src/app/layout.tsx calls ensureFreshDemo on every request (before rendering children).
   Mark every route that reads the DB or cookies as dynamic (no static prerender, no data
   cache) — only /showcase may be static.
   src/app/page.tsx: persona picker grouped as Students /
   Interviewers / Interview team, each persona one click; a "Reset demo data" button with
   a confirm; one line explaining how to explore; a link to /showcase (page can be a
   placeholder "Coming in P7" for now).
6. src/app/layout.tsx: DemoBanner on every page ("Demo mode — switch persona any time")
   with a persona switcher.
7. Role-guarded layouts for /student, /interviewer, /team: wrong or missing role →
   redirect to / with a toast. Each page is a placeholder heading for now.
8. Shared components: EmptyState, ErrorState (with Try again), LoadingSkeleton,
   ConfirmDialog. Add loading.tsx and error.tsx for each role segment using them.

No other features. Stop and report.
```

**You do after the agent:**
1. Push to GitHub. In Vercel, import the repo and add the environment variable `DATABASE_URL` (pooled). Deploy.

**Validation gate:**
- [ ] Locally and on the Vercel URL: from `/`, each persona reaches its role area in one click.
- [ ] As a student, typing `/team` in the address bar redirects to `/`.
- [ ] In the Neon SQL editor, set `demo_meta.seeded_at = now() - interval '7 hours'`. Reload any page (for example `/student`) while logged in as a persona. `seeded_at` is now current, and you are still logged in as the same persona.
- [ ] Reset demo data works, and the hints match the §8.4 seed.
- [ ] In a private window, the Vercel URL opens without any login.

**Commit**: `P2: shell, personas, guards, demo freshness, first deploy`

---

## P3 — Interviewer availability (R-02)

**Goal**: interviewers create and manage slots. (Architecture §8.1 `/interviewer/availability`, §8.2 `addSlots`, `withdrawSlot`, T5, P3 AC/EC.)

**Agent prompt:**
```
Phase P3. Read docs/architecture.md §6.2 (T5), §8.1, §8.2, §10 P3, §12.

1. src/db/queries/interviewer.ts: slots for the actor for a given week, each with
   derived booked/open/withdrawn status and the booked student's name if any.
2. src/actions/availability.ts:
   - addSlots({date, from, to}): zod-validate (future, from < to, both aligned to
     SLOT_MINUTES, same IST day); generate aligned slots; insert skipping existing
     (interviewer_id, start_at); return {created, skipped}.
   - withdrawSlot({slotId, reason?}) per architecture F5: only own slots; reject if
     started (SLOT_STARTED); the slot ALWAYS becomes withdrawn; if it has an active
     booking, reason is required and the same transaction also sets booking →
     cancelled_by_interviewer, attempt → reschedule_required (conditional update), and
     inserts an INTERVIEWER_CANCELLED notification for the student.
3. /interviewer/availability: WeekGrid (7 days from today, IST) showing slots coloured
   by status with student name on booked ones; "Add availability" form (date, from, to)
   with result toast "Added N slots, skipped M already existing"; withdraw button per
   slot with ConfirmDialog (reason textarea required when booked).
4. Disable submit buttons while pending. Revalidate affected paths.

Nothing else. Stop and report.
```

**Validation gate:**
- [ ] As I2: add 15:00–17:00 tomorrow → 4 slots are created. Add the same range again → "0 added, 4 skipped".
- [ ] Invalid inputs (a past date, 17:00 → 15:00, 15:10) each show a specific inline error.
- [ ] Withdraw an open slot → it disappears from the grid as open.
- [ ] As **I2** (S2's interviewer), withdraw S2's booked slot with a reason. In the Neon SQL editor, S2's attempt is `reschedule_required`, the slot is `withdrawn`, and a notification row exists. As S1, the withdrawn time no longer appears in the booking picker. Then Reset demo data.
- [ ] Withdraw an earlier-today slot → `SLOT_STARTED` message.

**Commit**: `P3: interviewer availability`

---

## P4 — Student home (pre-result) and booking, reschedule, cancel (R-01, R-04)

**Goal**: an eligible student books from the dashboard, and changes or cancels. (Architecture F1, T2–T4, T6, §8.1 `/student` and `/student/book/[attemptId]`, P4 AC/EC.)

**Agent prompt:**
```
Phase P4. Read docs/architecture.md §5.3 F1, §6.1, §6.2 (T2,T3,T4,T6), §8.1, §8.2, §10 P4, §12.

1. src/db/queries/student.ts: all journeys for the actor (one per badge: eligibility,
   open/latest attempt, active booking with slot and interviewer, award) → map each
   through deriveJourneyState. Latest unread notification.
   src/db/queries/slots.ts: distinct open start times in the booking window
   (BOOK_MIN_LEAD_HOURS..BOOK_MAX_DAYS), grouped by IST date.
2. src/actions/booking.ts:
   - bookSlot({attemptId, startAt}) exactly per F1: one transaction, lock attempt
     (SELECT ... FOR UPDATE), guards from src/domain/rules.ts, insert booking on the
     first open slot at that time, on unique violation try next slot at that time,
     else SLOT_TAKEN; meeting_url per architecture A-17; attempt → booked;
     BOOKING_CONFIRMED notification. Handles T2 and T6 (T6 does not touch
     reschedule_count).
   - rescheduleBooking({bookingId, startAt}) per architecture F1b: ONE transaction,
     guards cutoff + limit, FIRST set the old booking → cancelled_by_student, THEN insert
     the new booking (so the one-active-booking-per-student index is never violated),
     reschedule_count + 1, BOOKING_RESCHEDULED. If no slot is open at the new time the
     whole transaction rolls back and the original booking stands.
   - cancelBooking({bookingId}): guard cutoff; booking → cancelled_by_student;
     attempt → awaiting_booking; BOOKING_CANCELLED.
   Map Postgres unique violations to SLOT_TAKEN / ALREADY_BOOKED.
3. /student home (card rule per architecture §8.1: one card per badge with an
   eligibility, attempt or award, else one NOT_ELIGIBLE card for the first badge):
   MessageBanner (latest unread notification, dismiss via
   src/actions/messages.ts dismissMessage), JourneyCard per badge for these states:
   NOT_ELIGIBLE, READY_TO_BOOK (Book CTA), RETAKE_COOLDOWN (date bookable from, no CTA),
   BOOKED (IST date/time, interviewer first name, join link, Reschedule and Cancel with
   ConfirmDialog; if inside cutoff show disabled buttons with the cutoff time),
   RESCHEDULE_REQUIRED (reason + Rebook CTA), AWAITING_RESULT ("Result pending").
   Leave PASSED/FAILED/BADGE_NULLIFIED as a simple text placeholder (P7 finishes them).
4. /student/book/[attemptId]: date strip (only dates with open times), time chips,
   confirm dialog showing date/time IST and badge; ?mode=reschedule&bookingId=... reuses
   it for reschedule. Empty state when no times. On SLOT_TAKEN: toast + refresh times.
   On success redirect to /student.
5. Disable buttons while pending; revalidate /student, /interviewer/schedule, /team.

Nothing else. Stop and report.
```

**Validation gate:**
- [ ] S1: Book → only times ≥ 24 hours ahead are shown. Confirm → home shows BOOKED with IST time and join link, and the **Booking confirmed** banner appears.
- [ ] **Race test**: as I3, add 19:00–19:30 two days from today. Seeded hours end at 18:00, so only I3 has that time. Open two browsers as S1 and S7, select that time in both, and confirm both. Exactly one succeeds, and the other sees "slot just taken" with a refreshed list.
- [ ] S2: reschedule twice → the third attempt shows the limit message. Cancel → READY_TO_BOOK. On a fresh reset, start a reschedule for S2, take the target time with another student in a second window first, then confirm S2's reschedule. S2 gets "slot just taken" and keeps the original booking.
- [ ] S3: Cancel/Reschedule are disabled with the cutoff time shown.
- [ ] S7: rebook works, and in the Neon SQL editor `reschedule_count` is unchanged.
- [ ] S8: the cooldown date is shown and there is no Book button.
- [ ] Changing the URL to another student's attemptId → not found.
- [ ] Reset demo data.

**Commit**: `P4: student booking, reschedule, cancel`

---

## P5 — Interviewer daily schedule and outcome recording (R-03)

**Goal**: the interviewer runs the day and records Pass, Fail, or Retake later. (Architecture F2, §6.3, T8–T10, P5 AC/EC.)

**Agent prompt:**
```
Phase P5. Read docs/architecture.md §5.3 F2, §6.2 (T8–T10), §6.3, §8.1, §8.2, §10 P5, §12.

1. src/db/queries/interviewer.ts: add (a) bookings for the actor on a given IST date
   (active, completed, no_show_student) with student name, badge, time, meeting_url,
   derived state and recorded outcome if any; (b) "awaiting your outcome": the actor's
   ACTIVE bookings whose start_at has passed, on ANY date, with an overdue flag
   (now - start_at > OUTCOME_OVERDUE_HOURS).
2. src/actions/outcome.ts recordOutcome({bookingId, outcome: 'pass'|'fail'|'retake_later',
   reason?: 'no_show', notes?}): own booking only (FORBIDDEN otherwise); guard
   now ≥ start_at and booking active; ONE transaction applying exactly the §6.3 row for
   the outcome (conditional update attempt WHERE status='booked'; 0 rows →
   INVALID_TRANSITION); insert the matching RESULT_* notification. notes max 1000 chars.
3. /interviewer/schedule: top section "Awaiting your outcome" (list (b), overdue badge,
   hidden when empty); below it the day picker (default today IST, prev/next day), ScheduleList
   sorted by time showing time, student, badge, join link, state. For active bookings
   whose start has passed: "Record outcome" (OutcomeDialog: three options, notes, then
   a confirm step that states the consequence in one sentence) and "Student didn't join"
   (confirm → retake_later with reason no_show). Before start: buttons disabled with
   "Opens at <time>". Recorded: show the outcome as read-only. Empty state for a day
   with no interviews.
4. Revalidate /interviewer/schedule, /student, /student/badges, /team.

Nothing else. Stop and report.
```

**Validation gate:**
- [ ] As I1: "Awaiting your outcome" lists S4, S5, and S6, with S6 marked **overdue**. In the day list, go to S3's booking date: S3's booking shows disabled buttons with "Opens at …".
- [ ] Record **Pass** for S4. In the Neon SQL editor: attempt `passed`, booking `completed`, an award row `active`, a `RESULT_PASSED` notification.
- [ ] Record **Retake later** for S5. A new attempt (`attempt_no` 2, `awaiting_booking`) exists, with `not_before` 7 days out.
- [ ] Record **Fail** for S6. The eligibility row has `revoked_at` set.
- [ ] Double-click Record on a fresh reset → only one outcome is saved, and the second click shows "already updated".
- [ ] As I2, the schedule doesn't show I1's bookings.
- [ ] Switch to S4, S5, and S6 → each home shows a state change (placeholder text is fine until P7).
- [ ] Reset demo data.

**Commit**: `P5: daily schedule and outcome recording`

---

## P6 — Interview team tracker and malpractice flag (R-05, R-06)

**Goal**: the team sees who has booked and who hasn't, and can nullify a passed badge. (Architecture F3, T13, §8.1 `/team`, P6 AC/EC.)

**Agent prompt:**
```
Phase P6. Read docs/architecture.md §5.3 F3, §6.2 (T13), §8.1, §8.2, §10 P6, §12.

1. src/db/queries/team.ts: one row per (student, badge) where the student has an active
   eligibility OR an award (active or nullified) for that badge — architecture §8.1. Columns: student, badge,
   journey state (derived), slot time if booked, interviewer, days since eligible,
   outcomeOverdue (AWAITING_RESULT and now - start_at > OUTCOME_OVERDUE_HOURS),
   badgeAwardId if passed.
2. /team: two summary tiles — Booked (BOOKED + AWAITING_RESULT) and Not booked
   (READY_TO_BOOK + RESCHEDULE_REQUIRED + RETAKE_COOLDOWN) — each clickable to filter;
   rows with an award are listed but counted in neither tile;
   filters by badge and by journey state; TrackerTable with the columns above,
   default sort "Not booked first, then days since eligible desc"; an "Outcome overdue"
   badge where applicable. Counts must equal filtered row counts.
3. src/actions/team.ts flagMalpractice({badgeAwardId, reason}): team_admin only; reason
   required; ONE transaction per architecture F3: conditional update award WHERE
   status='active' → nullified with nullified_at, nullified_by, nullification_reason
   (0 rows → INVALID_TRANSITION); cascade T15 for higher badges in the same track
   (revoke eligibility with reason prerequisite_nullified, open attempt → withdrawn,
   active booking → cancelled_by_system); insert BADGE_NULLIFIED notification. FlagDialog row action shown
   only on PASSED rows.
4. Revalidate /team, /student, /student/badges.

Nothing else. No student detail page, no timeline. Stop and report.
```

**Validation gate:**
- [ ] The tracker shows every seeded journey with active eligibility, plus S9 (passed) and S10 (nullified). S11 (failed) is absent. The tile counts equal the filtered row counts: Booked 5 (S2–S6) and Not booked 4.
- [ ] S6 shows the **Outcome overdue** marker.
- [ ] The Not booked filter shows S1, S7, S8, and S9 (Specialist).
- [ ] Flag S9 (Novice) with an empty reason → blocked. With a reason → the row becomes BADGE_NULLIFIED, and in the Neon SQL editor the award shows `nullified_by` and the reason.
- [ ] S9's Specialist row disappears from the tracker (eligibility revoked with `prerequisite_nullified`). The Not booked tile drops from 4 to 3. As S9, the Specialist badge shows as locked.
- [ ] No flag action appears on non-passed rows.
- [ ] Reset demo data.

**Commit**: `P6: team tracker and malpractice flag`

---

## P7 — Result surfaces, before/after, messages showcase (R-04, R-11, R-12)

**Goal**: the result visibly changes the student's screens, and the before/after and the 3 messages are explicit in the prototype. (Architecture §6.4, §8.1 `/student`, `/student/badges`, `/showcase`, P7 AC/EC.)

**Agent prompt:**
```
Phase P7. Read docs/architecture.md §3.2 (D-02), §6.1, §6.4, §8.1, §8.3 (deriveTier), §10 P7.

1. JourneyCard: finish the post-result variants — PASSED (badge earned, date,
   "+<bonus_miles> bonus miles" from the badges table, next badge hint if the student
   has another journey), RETAKE_COOLDOWN after a retake (show that
   the last attempt was "Retake later", the date booking reopens, interviewer notes if
   any), FAILED (what happened and that re-qualifying through skill contests re-opens
   booking), BADGE_NULLIFIED (badge revoked, reason shown neutrally).
2. TierChip on /student using deriveTier: "Pre-Qualiflyer" vs "Qualiflyer".
3. /student/badges: BadgeShelf with one tile per badge in the track — earned, nullified
   (struck through with label), in progress (current journey state), locked.
4. /showcase (public, no persona needed), using the SAME components with fixture data
   built in-file:
   Section A "Student home — before and after the interview result": a "Before" column
   (AWAITING_RESULT) next to "After" for each of Pass, Retake later, Fail, Nullified.
   Section B "Badges screen — before and after": same pattern.
   Section C "The 3 most important student messages": render BOOKING_CONFIRMED,
   RESULT_PASSED, RESULT_RETAKE through the real MessageBanner using messages.ts with
   fixed fixture context.
   Short one-line captions only. Link back to /.
5. tests/domain/messages.test.ts: add a test that the three showcase messages equal the
   template output for the same context (guarantees "exactly as they appear").
6. Mobile check: no horizontal scroll at 360px width on /student, /student/badges,
   /showcase.

No other pages. Stop and report.
```

**Validation gate:**
- [ ] Live flow: as I1, record Pass for S4 → as S4, the home shows the Passed card with **+150 bonus miles**, the tier chip says **Qualiflyer**, the badges shelf shows Novice earned, and the **Passed** banner appears.
- [ ] As I1, record Retake later for S5 → as S5, the home shows the cooldown with the reopen date, and the **Retake later** banner appears.
- [ ] Flag S4 in `/team` → as S4, the badge shows nullified and the chip is back to **Pre-Qualiflyer**.
- [ ] `/showcase` in a private window shows all three sections. Compare the message text against the live banners: they must be identical.
- [ ] `npm run test` passes.
- [ ] Browser devtools at 360 px width: no layout breaks.
- [ ] Reset demo data.

**Commit**: `P7: result surfaces, before/after showcase, messages`

---

## P8 — Production hardening and full walkthrough

**Goal**: a public link that is stable whenever NxtWave opens it.

**Agent prompt:**
```
Phase P8. Read docs/architecture.md §10 P8, §12, §14.

1. Audit every Server Action against §12: zod, requireRole, single transaction,
   conditional updates, Postgres error mapping, no raw errors to UI. Fix gaps only.
2. Make reads retry once on connection errors (DB_UNAVAILABLE); never retry writes.
3. Fail fast with a clear server log if DATABASE_URL is missing.
4. README.md: what this is, live URL placeholder line "Live: see submission",
   personas and what each demonstrates (from §8.4), how to run locally, scripts.
5. Run `npm run build` and fix all type and lint errors without disabling checks.

No new features. Stop and report with a list of everything changed.
```

**You do:**
1. Push and wait for Vercel to deploy. There is one Neon database for both local and production, so migrations and seed are already applied. Click **Reset demo data** on the production URL to start clean.
   - **After you submit**, never run `db:seed` or local resets with your own walkthroughs in mind. The database is shared with whatever evaluators see. The app self-heals every 6 hours anyway.
2. Run the **full walkthrough on the production URL in a private window**:
   - Landing → **I2** adds slots → **S1** books → **I1** records Pass for S4, Retake for S5, Fail for S6 → each student's home and badges change → `/team` counts update → flag S4 → nullified → `/showcase` → Reset demo data.
3. Leave the app idle for at least 10 minutes, then open it. The first load may be slow but must not error.

**Validation gate:**
- [ ] The walkthrough passes end to end on production.
- [ ] The cold load works.
- [ ] Search the GitHub repo for `postgresql://` and get no results.
- [ ] `npm run build` passes locally.

**Commit**: `P8: hardening, README`

---

## P9 — Loom and submission

### P9.1 Sync and share the write-up (no agent work)
- [ ] If any phase changed a state, transition, table or key field from the architecture, update `GRIT_Interview_Scheduling_Writeup.docx` to match.
- [ ] Upload it to Google Drive and set sharing to "Anyone with the link → Viewer".
- [ ] Open the link in a logged-out window and confirm it shows 2 pages. If Google's conversion spills onto page 3, share the .docx itself (Drive previews it) or a PDF export instead.

### P9.2 Loom (≤ 5:00, free plan hard cap)
Warm up the production app first (open it once). Then record from this outline:

| Time | Beat |
|---|---|
| 0:00–0:30 | The problem in one line. Who the three actors are. The one thing I designed around: **every state has an owner and a trigger, and invariants live in the database.** |
| 0:30–1:15 | The states table from the write-up: happy path, then retake, fail, interviewer withdrawal, and post-pass nullification with the higher badge locking again |
| 1:15–2:00 | Student S1 books. Show "slot just taken" handling in one sentence. The booking-confirmed message. |
| 2:00–2:45 | Interviewer I1: daily schedule → record Pass for S4 and Retake for S5 |
| 2:45–3:30 | S4 home before/after (tier chip flips), then `/showcase` for the full before/after set and the 3 messages |
| 3:30–4:00 | Team tracker: booked vs not booked, flag malpractice on S4 |
| 4:00–4:30 | Data model in 30 seconds: why bookings are separate from attempts, and the partial unique indexes. The trade-offs: persona login and no LLM, because the brief doesn't ask for one. |

- Play it in a logged-out window to confirm it is viewable.

### P9.3 Submit (target 13 Nov)
- [ ] Form: Name, Phone, Email, **Assignment Link 1** (the Google Doc), **Prototype Link** (Vercel production URL, root `/`), **Loom link**
- [ ] Screenshot the confirmation page
- [ ] Do not redeploy breaking changes after submitting. If you must change anything, verify the production walkthrough again.

---

## Final QA checklist (run before P9.3)

**Brief coverage**
- [ ] #1 to #3: the separate write-up matches what was built (states, transitions, tables, key fields) and is still 2 pages
- [ ] #4 Prototype: student booking screen, interviewer daily schedule with outcome recording, availability, and the team booked/not-booked view all work
- [ ] #5 The 3 messages are visible in the prototype, identical in-flow and on `/showcase`
- [ ] #6 Before/after for student home and badges is in the prototype, both live and on `/showcase`
- [ ] The malpractice nullification state is reachable and visible
- [ ] The Loom is ≤ 5:00 and covers the thought process

**Scope discipline**
- [ ] No inbox page, no timeline page, no auth provider, no LLM calls, no extra routes beyond architecture §8.1
- [ ] Only free services in use: GitHub, Neon Free, Vercel Hobby, Google Drive, Loom Starter. No card on any account.
- [ ] The write-up has no sections beyond #1 to #3

**Links**
- [ ] All three links open in a logged-out or private window
- [ ] Submitted on or before 13 Nov
