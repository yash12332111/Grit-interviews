# architecture.md — GRIT Interview Scheduling (NxtWave AI Product Engineer, Round 1)

> Technical blueprint for building the assignment in Google Antigravity.
> It defines **what** to build and **why**. Build steps live in `implementation_plan_nxtwave.md`.
> **Version 3.2** (review passes against the brief, the NxtWave emails, the submission form, and the GRIT reference sites the brief links). Change logs are in §0.
> **Scope of this document: the working prototype (brief #4–#6) only.** The 2-page write-up (brief #1–#3) is already drafted as a separate file, `GRIT_Interview_Scheduling_Writeup.docx`, and is not built by the agent.

---

## 0. Change log: v1 → v2 (review findings)

| # | Finding in v1 | Type | Fix in v2 | Brief anchor |
|---|---|---|---|---|
| 1 | The write-up was planned to also hold the 3 messages, the prototype link, and a persona guide. The brief puts messages under **Working Prototype** (#5), and the write-up is only #1–#3 within 2 pages. | Deviation | The write-up holds **only** States, Edge cases and questions, and Data model. The messages live in the prototype (in-flow plus `/showcase`). | "Write up of (2 pages max) 1. States 2. Edge cases… 3. Data model" |
| 2 | **The demo went stale.** The seed was relative to *seed time*. If evaluators open it days later, "today's" interviews are in the past and open slots run out. | Gap (critical) | Demo freshness added: a `demo_meta.seeded_at` timestamp, an automatic re-seed when stale, and a reset on the landing page (§8.4). | "A working prototype" |
| 3 | An evaluator could book a slot but never record its outcome, because booking requires 24 hours of lead time and outcomes require the slot to have started. The full loop was not demoable. | Gap | The seed now has **3 interviews awaiting result for one interviewer today** (one per outcome), plus bookings in a cancellable window. | "interviewer's daily schedule with outcome recording" |
| 4 | The `/student/notifications` inbox page is not asked for. | Unnecessary | Removed. Messages appear as a home-screen banner plus an action toast. | Brief #5 |
| 5 | The `/team/students/[id]` timeline page and the `attempt_events` table are not asked for. Their audit facts already exist on the attempt, booking, and award rows. | Unnecessary | Both removed. Malpractice flagging moves to a row action in the tracker. | Brief: team "sees which eligible students have booked and which haven't" |
| 6 | The interviewer no-show action (T14) is an edge case, not a required flow. | Unnecessary in build | Kept as a **documented** transition in the write-up and not built. | Brief #2 "the cases you would handle" |
| 7 | v1 let both interviewers and team admins record outcomes, which is two paths for one job. | Over-scope | Only the **interviewer** records outcomes (A-08). The team admin views, flags malpractice, and resets. | Brief: "interviewer's daily schedule with outcome recording" |
| 8 | Persona hints on the landing page were static, so they went wrong after evaluators changed states. | Bug | Hints are derived live. | n/a |
| 9 | The meeting URL format was left open, which is ambiguous for the coding agent. | Ambiguity | Fixed format specified (A-17). | n/a |
| 10 | Neon pooled vs direct connection string was unspecified. | Ambiguity | Both specified, to be verified at setup (§4.1). | n/a |
| 11 | `markNotificationsRead` was tied to the removed inbox. | Consistency | Replaced by `dismissMessage`. | n/a |

Everything else in v1 was checked and kept: the state machine, invariants, the free stack, the error contract, and the before/after approach.

### v2 → v3 (final challenge review)

| # | Finding in v2 | Type | Fix in v3 |
|---|---|---|---|
| 12 | Withdrawing a **booked** slot cancelled the booking but left the slot `open`, so it reappeared for other students. | Bug | Every withdrawal sets the slot to `withdrawn` (§5.3 F5, P3). |
| 13 | `deriveJourneyState` was ambiguous. A failed student matched both `FAILED` and `NOT_ELIGIBLE`. | Bug | An explicit precedence order was added (§6.1). |
| 14 | Re-seeding created new random user IDs, so every evaluator's persona cookie broke after each reset. | Bug | Seeded users and reference data use **fixed UUIDs** (§8.4). |
| 15 | Seed timing broke near midnight IST: three bookings for I1 could land on the same `start_at` and violate a unique key, and "later today" could be impossible. | Bug | Seed times are defined relative to *now*, not "today" (§8.4). |
| 16 | Within the 24-hour stale window, seeded states drifted (for example, S3's booking passed its start). | Gap | `DEMO_STALE_HOURS` is reduced to 6, and seed offsets are chosen to stay valid for 6 hours. |
| 17 | Freshness ran only on `/`, so deep links with an old cookie skipped it. Concurrent re-seeds were not locked. | Gap | `ensureFreshDemo` runs from the **root layout** and locks `demo_meta` with `FOR UPDATE` (F4). |
| 18 | The interviewer schedule showed only the selected day, so an interview from yesterday with no outcome could never be recorded. The "outcome overdue" marker could not be demoed. | Gap | An **"Awaiting your outcome"** section on the schedule lists the interviewer's past active bookings from any day. S6 is seeded about 26 hours ago, so it is overdue (§8.1, §8.4). |
| 19 | Rescheduling inserted a new active booking while the old one was still active, which breaks the one-active-booking-per-student unique index. | Bug | The order is fixed: cancel the old booking, then insert the new one, in one transaction. Any failure rolls back and the original booking is kept (§5.3 F1b). |
| 20 | Next.js could statically prerender pages that read the database, so it would serve stale data and skip freshness. | Bug | All routes that read the database are rendered dynamically (§4.1). |
| 21 | Vercel functions and Neon in different regions means every query crosses continents. | Performance | The regions are co-located (§4.1, P0). |
| 22 | Which badges get a card on the student home was undefined, and so was where `NOT_ELIGIBLE` is visible. | Ambiguity | Rule defined (§8.1). Locked badges show on `/student/badges`. |
| 23 | The seed created no notifications, so live banners were empty until an action ran. | Gap | Each seeded state gets its matching latest notification (§8.4). |
| 24 | The tracker's row set differed between architecture and plan (active eligibility only vs. plus awards). | Inconsistency | Unified definition (§8.1, P6). |
| 25 | The student count in the seed text did not match the persona table. | Inconsistency | Corrected to 11. |

### v3 → v3.1 (GRIT reference sites, which the brief invites us to use)

| # | Finding from grit.niatindia.com and its linked Tracks & Badges sheet | Type | Fix |
|---|---|---|---|
| 26 | **Badges are sequential with no skipping.** Novice must be earned before Specialist. v3 left a higher-badge journey open after a lower badge was nullified. | Bug against GRIT rules | Nullification now cascades: higher-badge eligibility in the same track is revoked, and any open attempt and active booking for it are closed. Booking also requires the previous badge to be active, as a defensive check. New transition T15. |
| 27 | **Passing awards bonus miles** (Novice 150, Specialist 250). The interview is mandatory to earn them. | Gap for brief #6 | `badges.bonus_miles` added. The Pass card, badge shelf and Passed message show the bonus. No miles totals are computed. |
| 28 | The AI Robotics track uses "Project + Interview". | Scope clarity | A-20: we schedule only the interview part. |
| 29 | The site also lists a separate "final interview round" for trip selection. | Scope clarity | A-19: this feature covers badge interviews only. |
| 30 | Eligibility also depends on attendance and code-of-conduct adherence. | Confirms A-01 | A-01 wording extended. |
| 31 | Expert, Master and Grand Master are locked program-wide. | Confirms design | Seed keeps Novice and Specialist only. |

### v3.1 → v3.2

| # | Change | Fix |
|---|---|---|
| 32 | The write-up (brief #1–#3) is drafted separately as `GRIT_Interview_Scheduling_Writeup.docx`. | Removed from build scope. P9 is now Loom and submission only. mermaid.live is dropped (the write-up uses tables, which the brief allows). This document stays the **source** for the write-up: if the build changes a state, transition, table or key field, update the write-up to match. |

---

## 1. Source of truth

### 1.1 Inputs (in priority order)
1. **Assignment brief** (`AI Product Engineer - Round 1 Assignment`). This is the ultimate authority.
2. NxtWave email, 11 Nov 2026. It gives the deadline "14th November 2026 (before the end of the day)" and a submission link `forms.gle/eJS6H7Gj1Cnihmsn9`.
3. The submission form linked in the brief. It has three link fields: **Assignment Link 1 (Anyone can View Access)**, **Prototype Link**, and **Loom Recording Link (Project Explanation)**.
4. GRIT public site (grit.niatindia.com, How GRIT Works, and the linked **Tracks & Badges** sheet), referenced by the brief:
   - Track → Badge (Novice → Grand Master) → Skills/Levels → interview.
   - "Qualiflyers" are students with at least one track badge. "Pre-Qualiflyers" are registered but have no badge.

### 1.2 Required deliverables (verbatim structure of the brief)

| Brief # | Deliverable | Lives in |
|---|---|---|
| 1 | States and what moves each one to the next (table or diagram) | Write-up (separate file, already drafted) |
| 2 | Edge cases you would handle, plus questions and assumptions | Write-up (separate file, already drafted) |
| 3 | Data model: tables, key fields, schema | Write-up (separate file, already drafted) |
| 4 | Working prototype: student booking screen, interviewer daily schedule with outcome recording, and other needed screens | Prototype |
| 5 | The 3 most important student messages, exactly as they appear | Prototype |
| 6 | Before/after screens for the student home and other screens the result affects, built into the prototype | Prototype |
| — | Loom explaining the project and the thought process | Loom |

### 1.3 Hard constraints

| ID | Constraint | Source |
|---|---|---|
| HC-1 | Write-up ≤ 2 pages, anyone-can-view link | Brief + form |
| HC-2 | Prototype built with an AI vibe coding tool (Antigravity), and it must work | Brief |
| HC-3 | Before/after built into the prototype | Brief |
| HC-4 | The 3 messages appear in the prototype exactly as written | Brief |
| HC-5 | Loom recorded and linked | Brief + form |
| HC-6 | Internal submit target is **13 Nov 2026**. The brief says "before 14 Nov" and the email says "14th… before the end of the day", so we take the stricter reading. | Brief + email |
| HC-7 | The prototype opens without sign-up. The form has a link field and no credentials field. | Inferred from form |
| HC-8 | The prototype stays demoable whenever it is opened, including days after submission | Inferred from HC-2 and the evaluation timing |

### 1.4 Likely evaluation lens (inferred; no rubric was given)
- Complete, correct states, including non-happy paths and post-pass nullification.
- Edge-case reasoning with explicit assumptions.
- A data model that backs the states, with invariants enforced in the database.
- Every required flow works for all three roles.
- Quality of the message copy.
- Scope discipline.

---

## 2. Requirement traceability

| ID | Requirement | Component(s) | Phase |
|---|---|---|---|
| R-01 | Eligible students book a slot from their dashboard | `/student` journey card → `/student/book/[attemptId]`, `bookSlot` | P4 |
| R-02 | Interviewers set and manage availability | `/interviewer/availability`, `addSlots`, `withdrawSlot` | P3 |
| R-03 | Outcome recorded: pass, fail, or retake later | `/interviewer/schedule`, `OutcomeDialog`, `recordOutcome` | P5 |
| R-04 | Students see status and result on their dashboard | `JourneyCard`, `deriveJourneyState`, `MessageBanner` | P4, P7 |
| R-05 | The team sees eligible students who have booked and who haven't | `/team` tracker | P6 |
| R-06 | A badge is nullified if malpractice is flagged later (from the brief's Context) | `flagMalpractice`, `badge_awards.status`, state `BADGE_NULLIFIED` | P6, P7 |
| R-07 | Write-up: states and transitions | Separate write-up file, sourced from §6 | Done (keep in sync) |
| R-08 | Write-up: edge cases, questions, assumptions | Separate write-up file, sourced from §3, §6.5 | Done (keep in sync) |
| R-09 | Write-up: data model | Separate write-up file, sourced from §7 | Done (keep in sync) |
| R-10 | Working prototype screens | All routes in §8.1 | P2–P8 |
| R-11 | 3 student messages, exactly as shown | `domain/messages.ts`, `MessageBanner`, `/showcase` | P7 |
| R-12 | Before/after for home and affected screens, in the prototype | Live screens plus `/showcase` | P7 |
| R-13 | Loom | Script and recording | P9 |
| R-14 | Submit 3 links via the form | Checklist | P9 |

Components **not** named in the brief, each kept for a stated reason:
- The persona switcher, for HC-7.
- Demo freshness and reset, for HC-8.
- `/showcase`, which makes R-11 and R-12 visible without running every flow.

---

## 3. Assumptions and decisions

### 3.1 Assumptions (stated in the write-up)

| ID | Assumption |
|---|---|
| A-01 | Eligibility is produced upstream: skill levels cleared through GRIT contests, plus NIAT's own criteria (attendance, code of conduct). This feature consumes an `eligibilities` record and does not model skills. |
| A-02 | One journey per *(student, badge)*. A student may have journeys for several badges over the season. |
| A-03 | At most **one active booking per student** at a time, across all badges. |
| A-04 | Slots are **pooled**. The student picks a time, and the system assigns the first free interviewer at that time. |
| A-05 | Slot length is **30 minutes** *(illustrative)*, aligned to :00 and :30. |
| A-06 | The booking window runs from **24 hours to 14 days ahead** *(illustrative)*. |
| A-07 | Reschedule or cancel is allowed until **12 hours before** the slot *(illustrative)*, with at most **2 reschedules per attempt** *(illustrative)*. |
| A-08 | Interviewers are members of the interview team. **The interviewer records the outcome** of their own interviews. A **team admin** monitors the tracker and flags malpractice. |
| A-09 | **Retake later** means close but not yet. The student rebooks the same badge after a **7-day cooldown** *(illustrative)* without re-clearing skills. A new attempt is created. |
| A-10 | **Fail** means not ready. Eligibility for that badge is revoked, and the student re-qualifies upstream. (D-01) |
| A-11 | A student no-show is recorded by the interviewer as **Retake later** with reason `no_show`. |
| A-12 | Malpractice is flagged **after a Pass** by a team admin, with a mandatory reason. It nullifies the badge, which is terminal for that badge here. Appeals are out of scope. |
| A-13 | Times are stored in UTC and shown in **IST (Asia/Kolkata)**. |
| A-14 | Demo access uses a **persona switcher** and no real login. |
| A-15 | Messages are **in-app** (dashboard banner plus action toast). The copy is written so it would also work in other channels. |
| A-16 | No runtime LLM feature. The brief requests none. |
| A-17 | Each booking gets the meeting link `https://meet.jit.si/GRIT-<first 8 chars of booking id>`. It is displayed only. The prototype does not launch or verify calls. *Whether Jitsi's public server requires sign-in to join is unverified and doesn't affect the demo.* |
| A-18 | No cap on retakes (listed as an open question). |
| A-19 | This feature covers **badge interviews** only. The separate "final interview round" for trip selection listed on the GRIT site is out of scope. |
| A-20 | For tracks with "Project + Interview" (AI Robotics Mastery), we schedule the interview part only. Project evaluation is upstream. |
| A-21 | **Badges are sequential within a track** (GRIT rule). Booking level *n* requires an active award at level *n − 1*. Nullifying a badge revokes eligibility for every higher badge in that track. |
| A-22 | Bonus miles per badge come from GRIT's Tracks & Badges sheet (Novice 150, Specialist 250). They are shown on Pass, never summed into a total. Whether a nullification removes the miles is an open question. |

### 3.2 Decisions (defaults apply unless Yash overrides them in P0)

| ID | Decision | Default |
|---|---|---|
| D-01 | Fail semantics | Revoke eligibility (A-10) |
| D-02 | The 3 most important messages | **Booking confirmed**, **Result: Passed**, **Result: Retake later** |
| D-03 | Persona switcher acceptable | Yes |
| D-04 | No runtime LLM | Confirmed |
| D-05 | Write-up format | Drafted as a Word file, shared from Google Drive with anyone-with-the-link view access |

---

## 4. Technology stack (free only)

### 4.1 Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript, latest stable version pinned at init | One deployable unit for UI and server logic via Server Actions |
| UI | Tailwind CSS + shadcn/ui (Button, Card, Dialog, Badge, Tabs, Sonner toast, Select, Input, Textarea, Table) | Free and open source. Components are copied into the repo. |
| DB | Neon Postgres, Free plan | Real constraints. It doesn't pause projects for inactivity, unlike Supabase Free, which pauses after a week of low activity. |
| Driver | `@neondatabase/serverless` **Pool (WebSocket)**, needed for interactive transactions | Booking needs a row lock inside a transaction |
| Connection strings | App runtime: the **pooled** string. Migrations and seed CLI: the **direct** string. | *Verify in Neon's docs at P0 which string each one needs.* |
| ORM | Drizzle ORM + drizzle-kit | Schema-as-code with partial unique indexes and checks. It must match the data model in the write-up. |
| Validation | zod | Every action input |
| Time | Native `Intl.DateTimeFormat` with `Asia/Kolkata` | No extra dependency |
| Tests | Vitest (domain layer only) | The highest-value logic, cheap to test |
| Scripts | `tsx`, `dotenv` | Run seed and migrations locally |
| Hosting | Vercel Hobby | Free, with native Next.js support |
| Rendering | Every route that reads the DB or cookies is **dynamic** (no static prerender or data cache). `/showcase` uses fixtures only. | Stale pages would show wrong states and skip the freshness check |
| Regions | **Co-locate** Neon and Vercel functions. Default: both in US East (Vercel's default function region and Neon's AWS US East). If Vercel Hobby lets you set the function region to Mumbai or Singapore, use Neon's nearest Asia region instead. *Whether Hobby allows region changes is unverified; check at P0.* | Several queries run per request, so the DB round-trip latency multiplies |
| Repo | GitHub (free) | Vercel deploys from it |
| Write-up hosting | The drafted .docx is uploaded to Google Drive and shared as anyone-with-the-link can view | Free, gives the public link the form asks for |
| Video | Loom Starter (free) | Required by the form |

### 4.2 Free-tier ledger (checked Nov 2026; re-check at signup)

| Service | Relevant limits | Risk | Mitigation |
|---|---|---|---|
| Neon Free | $0. 1 GB storage per project, 100 CU-hours per project per month. No overage billing. Hitting a limit blocks operations, never deletes data. | A cold start on the first query after idle (third-party reports put it at a few seconds) | Loading skeletons. Warm the app before recording the Loom. |
| Vercel Hobby | 1M function invocations and 4 CPU-hours of active CPU per month. **Personal, non-commercial use only.** | Whether an assignment prototype counts as personal use is our reading, not a ruling | Usage is negligible. If needed, fall back to Netlify or Cloudflare Pages *(unverified)*. |
| Loom Starter | **5 minutes per recording**, 25 videos, 720p | The recording gets cut off | Script to about 4:30 |
| Antigravity (free) | Basic **weekly** agent quota, with unpublished numbers | **Highest delivery risk.** It can lock you out for days. | Small scoped prompts, commit after every phase, deploy from P2 |

No paid dependency. No payment method required anywhere.

---

## 5. System architecture

### 5.1 Components and layers

```
Browser
  Landing (persona picker, demo freshness) | Student | Interviewer | Team | /showcase
        │ Server Action calls                     ▲ Server Component renders
Next.js on Vercel
  Role-guarded route layouts (persona cookie)
  Server Components → src/db/queries/*        (read only)
  Server Actions    → src/actions/*           (the only write path)
      validate (zod) → requireRole → BEGIN → lock + guard (src/domain) →
      write state + notification → COMMIT → revalidatePath → Result<T>
  Domain layer (pure): states, transitions, rules, derive, messages, config
        │ Neon serverless Pool (WebSocket)
Neon Postgres
  Tables + partial unique indexes + checks = last line of defence
```

### 5.2 Responsibilities

| Layer | Owns | Must not |
|---|---|---|
| Domain (`src/domain`) | Enums, the transition table, guards, `deriveJourneyState`, `deriveTier`, message templates, config | Do I/O, read cookies, or render |
| Actions (`src/actions`) | Validation, authorization, transactions, notifications, revalidation | Hold business rules inline |
| Queries (`src/db/queries`) | All reads | Write |
| DB constraints | Race-proof invariants (§7.3) | n/a |
| UI | Render derived state, call actions, map error codes to copy | Compute rules |

### 5.3 Key flows

**F1 Book (R-01).**
1. The picker lists distinct open start times in the window. A time is open if a non-withdrawn slot exists with no active booking.
2. The student confirms a time. `bookSlot({attemptId, startAt})` runs.
3. Transaction:
   - Lock the attempt.
   - Guard: the actor owns it, its status is `awaiting_booking` or `reschedule_required`, `not_before ≤ now`, eligibility is active, there is no other active booking, and the time is inside the window.
   - Insert a booking on the first open slot at that time. On a unique violation, try the next slot at that time. If none remain, return `SLOT_TAKEN`.
   - Set the attempt to `booked` and insert the `BOOKING_CONFIRMED` notification.
4. Commit, revalidate, redirect to `/student`. The banner shows the message.

**F2 Record outcome (R-03).**
1. Each booking in the schedule has an outcome control, enabled when `now ≥ start_at` and the booking is active.
2. The dialog asks for the outcome and optional notes, then shows a confirmation summary.
3. A transaction applies the §6.3 side effects and inserts the result notification.

**F3 Flag malpractice (R-06).** A tracker row action on a passed student opens a dialog requiring a reason. One transaction:
1. Sets the award to `nullified` with who, when, and why.
2. **Cascade (A-21, T15).** For every higher badge in the same track, it revokes the active eligibility (`revoke_reason = 'prerequisite_nullified'`), sets any open attempt to `withdrawn`, and sets any active booking to `cancelled_by_system`.
3. Inserts the `BADGE_NULLIFIED` notification. Its text states that the higher badges are locked again.

**F1b Reschedule.** In one transaction:
1. Lock the attempt and run the guards (cutoff, limit).
2. Set the old booking to `cancelled_by_student`.
3. Insert the new booking on an open slot at the new time.
4. Increment `reschedule_count`.

If no slot is open at the new time, everything rolls back and the original booking stands.

**F4 Demo freshness (HC-8).** The root layout calls `ensureFreshDemo()` on every request:
- In a transaction, it locks `demo_meta` (`SELECT … FOR UPDATE`).
- If `seeded_at` is older than **6 hours** *(illustrative)*, it re-seeds.
- Because the row is locked, concurrent visitors queue instead of double-seeding.

A **"Reset demo data"** button on `/` re-seeds on demand. Fixed seed UUIDs keep persona cookies valid across re-seeds.

**F5 Withdraw slot.** The slot always becomes `withdrawn`. If it had an active booking, the same transaction also:
- sets the booking to `cancelled_by_interviewer`,
- sets the attempt to `reschedule_required`,
- inserts an `INTERVIEWER_CANCELLED` notification.

---

## 6. State machine

### 6.1 Journey states (one journey per student and badge; derived on read)

| State | Meaning | Derived from |
|---|---|---|
| `NOT_ELIGIBLE` | Required skills not all cleared | No active eligibility and no open attempt |
| `READY_TO_BOOK` | Eligible, nothing booked | Open attempt `awaiting_booking`, `not_before ≤ now` |
| `RETAKE_COOLDOWN` | Retake granted, booking not yet open | Open attempt `awaiting_booking`, `not_before > now` |
| `BOOKED` | Interview scheduled | Attempt `booked`, `now < start_at` |
| `AWAITING_RESULT` | Interview time reached, no outcome yet | Attempt `booked`, `now ≥ start_at` |
| `RESCHEDULE_REQUIRED` | The interviewer withdrew the booked slot | Attempt `reschedule_required` |
| `PASSED` | Badge earned | Latest attempt `passed`, award `active` |
| `FAILED` | Not cleared; must re-qualify | Latest attempt `failed`, no newer active eligibility |
| `BADGE_NULLIFIED` | Badge revoked for malpractice | Award `nullified` |

Time-derived states need no scheduler or cron job.

**Derivation precedence.** Evaluate per (student, badge) in this order; the first match wins:
1. An award with `nullified` → `BADGE_NULLIFIED`
2. An award with `active` → `PASSED`
3. An open attempt → `RESCHEDULE_REQUIRED` / `BOOKED` / `AWAITING_RESULT` / `RETAKE_COOLDOWN` / `READY_TO_BOOK`, by its status and time
4. The latest attempt is `failed` → `FAILED`
5. Otherwise → `NOT_ELIGIBLE`

### 6.2 Transitions

| # | From → To | Trigger | Actor | Guard | Built? |
|---|---|---|---|---|---|
| T1 | NOT_ELIGIBLE → READY_TO_BOOK | Eligibility granted (creates attempt 1) | Upstream | No active eligibility exists | Seed only |
| T2 | READY_TO_BOOK → BOOKED | Book | Student | Window, one active booking, slot open | ✅ |
| T3 | BOOKED → BOOKED | Reschedule | Student | Before cutoff, `reschedule_count < 2` | ✅ |
| T4 | BOOKED → READY_TO_BOOK | Cancel | Student | Before cutoff | ✅ |
| T5 | BOOKED → RESCHEDULE_REQUIRED | Interviewer withdraws a booked slot, with a reason | Interviewer | Slot not started | ✅ |
| T6 | RESCHEDULE_REQUIRED → BOOKED | Rebook (doesn't count as a reschedule) | Student | As T2 | ✅ |
| T7 | BOOKED → AWAITING_RESULT | Start time passes | Time | n/a | ✅ (derived) |
| T8 | AWAITING_RESULT → PASSED | Outcome Pass | Interviewer (own booking) | Booking active, `now ≥ start_at` | ✅ |
| T9 | AWAITING_RESULT → FAILED | Outcome Fail | Interviewer | As T8 | ✅ |
| T10 | AWAITING_RESULT → RETAKE_COOLDOWN | Outcome Retake later, including no-show | Interviewer | As T8 | ✅ |
| T11 | RETAKE_COOLDOWN → READY_TO_BOOK | Cooldown ends | Time | n/a | ✅ (derived) |
| T12 | FAILED → READY_TO_BOOK | Eligibility re-granted (new attempt) | Upstream | n/a | Documented |
| T13 | PASSED → BADGE_NULLIFIED | Malpractice flagged, with a reason | Team admin | Award active | ✅ |
| T14 | AWAITING_RESULT → RESCHEDULE_REQUIRED | Interviewer no-show | Team admin | No outcome yet | Documented |
| T15 | Any open-attempt state of a **higher** badge → NOT_ELIGIBLE | The prerequisite badge was nullified (T13 cascade, same transaction) | System | A-21 | ✅ |

Any other (state, trigger) pair is rejected with `INVALID_TRANSITION`. The table is exported from `src/domain/transitions.ts`.

### 6.3 Outcome side effects (atomic)

| Outcome | Attempt | Booking | Eligibility | Award | New attempt | Notification |
|---|---|---|---|---|---|---|
| Pass | `passed` | `completed` | unchanged | insert `active` (UI shows `badges.bonus_miles`) | — | `RESULT_PASSED` |
| Fail | `failed` | `completed` | `revoked_at = now`, `interview_failed` | — | — | `RESULT_FAILED` |
| Retake later | `retake_later` | `completed` or `no_show_student` | unchanged | — | `awaiting_booking`, `attempt_no + 1`, `not_before = now + 7d` | `RESULT_RETAKE` |

### 6.4 Message templates

| Key | Trigger | Top-3 (D-02) |
|---|---|---|
| `BOOKING_CONFIRMED` | T2, T6 | ★ |
| `BOOKING_RESCHEDULED` | T3 | |
| `BOOKING_CANCELLED` | T4 | |
| `INTERVIEWER_CANCELLED` | T5 | |
| `RESULT_PASSED` | T8 | ★ |
| `RESULT_FAILED` | T9 | |
| `RESULT_RETAKE` | T10 | ★ |
| `BADGE_NULLIFIED` | T13 | |

Each template is a pure function `(ctx) → {title, body, ctaLabel?, ctaHref?}` with every value resolved and no placeholders. The three starred messages render identically in-flow and on `/showcase`.

### 6.5 Edge cases for the write-up (handled by policy even if not built)
- Interviewer no-show (T14).
- Student no-show (A-11).
- Outcome entered wrongly: a confirm step prevents it, and correction is an open question.
- Retake cap (A-18).
- Malpractice discovered before an outcome: the interviewer records Fail, with the reason in notes.
- A booking surge near the GRIT December badge deadline, which interviewers can absorb by adding slots.
- Eligibility revoked while a booking is active: the booking is cancelled and the student is notified. This is policy only and not built.

---

## 7. Data model

### 7.1 Tables

```
users
  id uuid PK | name text | email text UNIQUE
  role enum('student','interviewer','team_admin') | created_at timestamptz

tracks
  id uuid PK | name text UNIQUE

badges
  id uuid PK | track_id → tracks
  level enum('novice','specialist','expert','master','grand_master')
  level_rank smallint | bonus_miles smallint   -- from GRIT Tracks & Badges sheet
  UNIQUE(track_id, level)

eligibilities
  id uuid PK | student_id → users | badge_id → badges
  granted_at timestamptz | revoked_at timestamptz NULL
  revoke_reason text NULL   -- 'interview_failed' | 'prerequisite_nullified'
  PARTIAL UNIQUE(student_id, badge_id) WHERE revoked_at IS NULL

interview_attempts
  id uuid PK | student_id → users | badge_id → badges | eligibility_id → eligibilities
  attempt_no smallint
  status enum('awaiting_booking','booked','reschedule_required',
              'passed','failed','retake_later','withdrawn')   -- withdrawn = closed by T15 cascade
  not_before timestamptz | reschedule_count smallint DEFAULT 0
  outcome_reason text NULL | outcome_notes text NULL
  outcome_recorded_by → users NULL | outcome_recorded_at timestamptz NULL
  created_at, updated_at
  UNIQUE(student_id, badge_id, attempt_no)
  PARTIAL UNIQUE(student_id, badge_id)
     WHERE status IN ('awaiting_booking','booked','reschedule_required')
  CHECK (status NOT IN ('passed','failed','retake_later')
         OR outcome_recorded_at IS NOT NULL)

availability_slots
  id uuid PK | interviewer_id → users
  start_at timestamptz | end_at timestamptz
  status enum('open','withdrawn') DEFAULT 'open' | created_at
  UNIQUE(interviewer_id, start_at) | CHECK(end_at > start_at)

bookings
  id uuid PK | attempt_id → interview_attempts | slot_id → availability_slots
  student_id → users | interviewer_id → users        -- denormalised for constraints and queries
  status enum('active','completed','cancelled_by_student',
              'cancelled_by_interviewer','cancelled_by_system','no_show_student')
  meeting_url text | cancel_reason text NULL | created_at | ended_at NULL
  PARTIAL UNIQUE(slot_id)    WHERE status = 'active'
  PARTIAL UNIQUE(student_id) WHERE status = 'active'

badge_awards
  id uuid PK | student_id → users | badge_id → badges | attempt_id UNIQUE → interview_attempts
  awarded_at | status enum('active','nullified') DEFAULT 'active'
  nullified_at NULL | nullified_by → users NULL | nullification_reason NULL
  PARTIAL UNIQUE(student_id, badge_id) WHERE status = 'active'
  CHECK (status = 'active' OR (nullified_at IS NOT NULL AND nullification_reason IS NOT NULL))

notifications
  id uuid PK | user_id → users | attempt_id → interview_attempts NULL
  template_key text | title text | body text | cta_label NULL | cta_href NULL
  created_at | read_at NULL           -- snapshot of the text at creation time

demo_meta                            -- infrastructure only; NOT in the write-up
  id smallint PK (always 1) | seeded_at timestamptz
```

### 7.2 Design notes
- `bookings` is separate from `interview_attempts` so reschedule and cancellation history is kept, and the double-booking constraint sits on the booking itself.
- Whether a slot is booked is **derived** from an active booking, not stored on the slot. This avoids two sources of truth.
- Audit facts sit on the rows themselves: `outcome_recorded_by`, `nullified_by`, `cancel_reason`, and timestamps. No separate event log is needed for this scope.

### 7.3 Invariants

| Invariant | Enforced by |
|---|---|
| One active booking per slot | Partial unique on `bookings(slot_id)` |
| One active booking per student | Partial unique on `bookings(student_id)` plus a guard for a friendly error |
| One open attempt per student and badge | Partial unique |
| No overlapping interviewer slots | Unique `(interviewer_id, start_at)` plus fixed, aligned 30-minute slots |
| Outcome only after the start, only once | Guard plus a conditional update (`WHERE status='booked'`) |
| Passed, failed and retake_later attempts carry outcome metadata (withdrawn attempts do not) | Check |
| Only active awards can be nullified | Check plus a conditional update |

### 7.4 Indexes
- `availability_slots(start_at) WHERE status='open'`
- `bookings(interviewer_id, status)`
- `interview_attempts(status, badge_id)`
- `notifications(user_id, created_at DESC)`

---

## 8. Components

### 8.1 Routes

| Route | Role | Content | R-IDs |
|---|---|---|---|
| `/` | Public | Persona picker grouped by role, with **live** state hints. A "Reset demo data" button. A short "how to explore" line. A link to `/showcase`. Runs the freshness check. | HC-7, HC-8 |
| `/student` | Student | **Home**: message banner (latest unread, dismissible), tier chip, and one `JourneyCard` per badge **that has an eligibility, attempt, or award** (sorted by track, then level), showing the state, slot (IST), join link, Reschedule/Cancel/Book CTAs, and the result. If the student has none, show one `NOT_ELIGIBLE` card for the track's first badge. | R-01, R-04, R-12 |
| `/student/book/[attemptId]` | Student | **Booking screen**: date strip, open times, confirm dialog. Also used for reschedule and rebook (`?mode=reschedule`). | R-01 |
| `/student/badges` | Student | Badge shelf with **every** seeded badge in the track: earned (with "+N bonus miles"), nullified, in progress, locked (`NOT_ELIGIBLE`) | R-04, R-12 |
| `/interviewer/availability` | Interviewer | Week view, add a range, withdraw a slot (with a reason if booked) | R-02 |
| `/interviewer/schedule` | Interviewer | **Daily schedule**, in two parts:<br>• **"Awaiting your outcome"** at the top: this interviewer's active bookings whose start has passed, from any day, with an overdue marker.<br>• **The selected day** (default today, IST): bookings with student, badge, time, join link, and state.<br>Both parts offer **Record outcome** and **Student didn't join**. | R-03 |
| `/team` | Team admin | Tracker with one row per (student, badge) where the student has an **active eligibility or an award**.<br>• Tiles: **Booked** (BOOKED + AWAITING_RESULT) and **Not booked** (READY_TO_BOOK + RESCHEDULE_REQUIRED + RETAKE_COOLDOWN). Rows with an award are listed but counted in neither tile.<br>• Filters by badge and state, days since eligible, and an "outcome overdue" marker.<br>• **Flag malpractice** row action on PASSED rows. | R-05, R-06 |
| `/showcase` | Public | Before/after: Student Home and Badges for Pass, Retake, Fail, and Nullified, side by side, using the same components with fixture data. **The 3 messages** rendered in the real banner component. | R-11, R-12 |

### 8.2 Server Actions

| Action | Actor | Transition |
|---|---|---|
| `selectPersona(userId)` | Anyone | — |
| `resetDemoData()` | Anyone (landing page) | Re-seed |
| `addSlots({date, from, to})` | Interviewer | — |
| `withdrawSlot({slotId, reason?})` | Interviewer | T5 if booked |
| `bookSlot({attemptId, startAt})` | Student | T2, T6 |
| `rescheduleBooking({bookingId, startAt})` | Student | T3 |
| `cancelBooking({bookingId})` | Student | T4 |
| `recordOutcome({bookingId, outcome, reason?, notes?})` | Interviewer | T8–T10 |
| `flagMalpractice({badgeAwardId, reason})` | Team admin | T13 |
| `dismissMessage({notificationId})` | Student | — |

The freshness check (F4) is a server function called by the root layout, not a user action.

### 8.3 Domain modules

| File | Content |
|---|---|
| `config.ts` | `SLOT_MINUTES=30`, `BOOK_MIN_LEAD_HOURS=24`, `BOOK_MAX_DAYS=14`, `CHANGE_CUTOFF_HOURS=12`, `MAX_RESCHEDULES=2`, `RETAKE_COOLDOWN_DAYS=7`, `OUTCOME_OVERDUE_HOURS=24`, `DEMO_STALE_HOURS=6`, `TZ='Asia/Kolkata'`. **All illustrative.** |
| `states.ts` | Enums |
| `transitions.ts` | The §6.2 table, `canTransition()` |
| `rules.ts` | `canBook` (includes the A-21 prerequisite check), `canReschedule`, `canCancel`, `canRecordOutcome`, `canFlag`, `canWithdraw`, `higherBadgesToLock` (T15) |
| `derive.ts` | `deriveJourneyState(records, now)`, `deriveTier(awards)` → `'PRE_QUALIFLYER' \| 'QUALIFLYER'` |
| `messages.ts` | The §6.4 templates |

### 8.4 Seed (time-relative to the moment of seeding; re-run by F4)

- **Fixed UUIDs** for every user, the track, and the badges, so persona cookies survive re-seeds.
- **Reference data**: 1 track (AI Product Mastery) with Novice (`bonus_miles` 150) and Specialist (`bonus_miles` 250), from GRIT's Tracks & Badges sheet. Expert and above are locked program-wide by NIAT, so they are not seeded. Interviewers I1–I3, one team admin.
- `T0` = seed time, rounded **down** to the nearest :00/:30.
- **Booked and past slots are created first.** Open slots are then generated for each interviewer for the next 7 IST days, in working hours *(illustrative: 10:00–13:00 and 15:00–18:00)*, skipping any `(interviewer, start_at)` already used.

Students (11, every state covered; all offsets stay valid for at least the 6-hour stale window):

| Persona | Journey state at seed | Booking / timing | Why |
|---|---|---|---|
| S1 | READY_TO_BOOK (Novice) | — | Book flow |
| S2 | BOOKED | With I2, at T0 + 3 days, 11:00 IST | Reschedule and cancel (outside the cutoff) |
| S3 | BOOKED | With **I1**, at T0 + 8h (inside the 12-hour cutoff) | Shows the cutoff block; "Opens at" on I1's schedule |
| S4 | AWAITING_RESULT | With **I1**, at T0 − 1h | Record **Pass** live |
| S5 | AWAITING_RESULT | With **I1**, at T0 − 2h | Record **Retake later** live |
| S6 | AWAITING_RESULT | With **I1**, at T0 − 26h (overdue) | Record **Fail** live; overdue marker |
| S7 | RESCHEDULE_REQUIRED | The previous booking is `cancelled_by_interviewer` | Rebook flow |
| S8 | RETAKE_COOLDOWN | Attempt 1 is `retake_later`; attempt 2 has `not_before` = T0 + 5 days | Cooldown view |
| S9 | PASSED (Novice) + READY_TO_BOOK (Specialist) | — | Multi-badge view, flag target |
| S10 | BADGE_NULLIFIED (Novice) | — | Nullified view |
| S11 | FAILED (Novice) | Eligibility revoked | Failed view |

- `eligibilities.granted_at` varies between 1 and 20 days ago, so "days since eligible" is meaningful.
- **Notifications**: each student whose state has a matching template gets that notification as their latest unread one: S2 BOOKING_CONFIRMED, S7 INTERVIEWER_CANCELLED, S8 RESULT_RETAKE, S9 RESULT_PASSED, S10 BADGE_NULLIFIED, S11 RESULT_FAILED.
- `demo_meta.seeded_at = now`. The seed is idempotent (truncate with cascade, then insert).
- The seed bypasses the guards on purpose to create past and edge states, but it must satisfy every DB constraint.

---

## 9. Project structure

```
grit-interviews/
├─ README.md                 # live link, personas, local run
├─ .env.example              # DATABASE_URL, DATABASE_URL_UNPOOLED
├─ drizzle.config.ts  next.config.ts  package.json  vitest.config.ts
├─ docs/  architecture.md  implementation_plan_nxtwave.md
├─ drizzle/                  # generated SQL migrations (committed)
├─ scripts/  seed.ts         # CLI wrapper around src/db/seed.ts
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx          # demo banner + persona switcher
│  │  ├─ page.tsx            # persona picker, freshness check, reset
│  │  ├─ showcase/page.tsx
│  │  ├─ student/  layout.tsx  page.tsx  book/[attemptId]/page.tsx  badges/page.tsx
│  │  ├─ interviewer/  layout.tsx  availability/page.tsx  schedule/page.tsx
│  │  └─ team/  layout.tsx  page.tsx
│  ├─ actions/  persona.ts demo.ts availability.ts booking.ts outcome.ts team.ts messages.ts
│  ├─ domain/   config.ts states.ts transitions.ts rules.ts derive.ts messages.ts
│  ├─ db/       schema.ts client.ts seed.ts freshness.ts
│  │  └─ queries/ student.ts interviewer.ts team.ts slots.ts personas.ts
│  ├─ lib/      session.ts result.ts time.ts
│  └─ components/
│     ├─ ui/              # shadcn
│     ├─ student/  JourneyCard SlotPicker BadgeShelf TierChip MessageBanner
│     ├─ interviewer/  WeekGrid ScheduleList OutcomeDialog
│     ├─ team/  TrackerTable FlagDialog
│     └─ shared/  EmptyState ErrorState LoadingSkeleton ConfirmDialog DemoBanner
└─ tests/domain/  transitions.test.ts rules.test.ts derive.test.ts messages.test.ts
```

---

## 10. Phases (objective · scope · depends · AC · EC)

### P0 — Decisions and accounts
- **Scope**: sign off D-01–D-05. Set up GitHub, Neon, and Vercel on free plans. Confirm which submission link to use.
- **Depends**: nothing.
- **AC**: decisions recorded. The Neon and Vercel dashboards show Free/Hobby with no card. Both connection strings are saved. The form shows 3 link fields.
- **EC**: Neon asks for a card → stop and reassess. The two form links lead to different forms → ask the NxtWave TA.

### P1 — Domain core, schema, seed
- **Scope**: `domain/*`, `db/schema.ts`, migrations, `db/seed.ts`, `db/freshness.ts`, Vitest.
- **Depends**: P0.
- **AC**:
  1. Each of T2–T11, T13 and T15 has a passing test, and a table-driven test rejects every unlisted pair.
  2. `deriveJourneyState` returns all 9 states, with exact boundary behavior at `start_at` and `not_before` using `>=`.
  3. Migrations apply to an empty database. A duplicate active booking per slot, and one per student, both fail at the database level.
  4. The seed produces the §8.4 table. Running it twice gives the same shape.
- **EC**: seeding at any time of day, including just after midnight IST, must satisfy every constraint, because offsets are relative to T0, not calendar days. Neon unreachable → fail loudly, with no partial migration.

### P2 — Shell, personas, guards, freshness
- **Scope**: `/` with live hints, reset, and the freshness check. Root layout with the demo banner and switcher. `lib/session.ts`. Role-guarded layouts. Shared state components.
- **Depends**: P1.
- **AC**: one click from `/` to each role home. Cross-role URLs redirect to `/`. Reset restores the seed. Setting `seeded_at` back 7 hours and loading any page triggers a re-seed. The persona cookie stays valid after a reset.
- **EC**: a cookie pointing to a deleted user (after a reset) → clear it and redirect. A forged role cookie on an action → `FORBIDDEN` (demo-grade, A-14). Two visitors hitting the app while stale → exactly one re-seed, with no error (`FOR UPDATE` lock on `demo_meta`).

### P3 — Interviewer availability (R-02)
- **Depends**: P2.
- **AC**: adding a range creates aligned 30-minute slots. Overlaps are skipped and reported. Withdrawing an open slot hides it from students. Withdrawing a booked slot requires a reason, moves that student to RESCHEDULE_REQUIRED, sends `INTERVIEWER_CANCELLED`, and the slot does **not** reappear for any student (F5).
- **EC**: a past range, `from ≥ to`, unaligned times, or an empty range → validation error. Withdrawing after the start → `SLOT_STARTED`. A double-click is idempotent.

### P4 — Student booking, reschedule, cancel (R-01, R-04 pre-result)
- **Depends**: P3.
- **AC**:
  1. S1 sees only in-window times, books one, and the home screen shows BOOKED with the IST time, join link, and the `BOOKING_CONFIRMED` banner.
  2. Two sessions racing for the last slot at a time → exactly one succeeds. The other gets `SLOT_TAKEN` and a refreshed list.
  3. S2 can reschedule (the count increments; blocked after 2) and cancel.
  4. S3's cancel is blocked by the cutoff, with the cutoff time shown.
  5. S7 rebooks without the count changing.
  6. S8 sees the cooldown date and no book button.
- **EC**: no open times → empty state, not a dead end. Eligibility revoked mid-flow → `NOT_ELIGIBLE`. Someone else's `attemptId` → `NOT_FOUND`. The back button after booking shows server state. The student already has an active booking for another badge → `ALREADY_BOOKED` with a link. A reschedule to a time that has just been taken → the transaction rolls back and the original booking is kept (F1b).

### P5 — Daily schedule and outcome recording (R-03)
- **Depends**: P4. It can be tested from the seed alone.
- **AC**:
  1. The schedule defaults to today in IST and lists only I1's bookings for I1. "Awaiting your outcome" lists S4, S5, and S6, with S6 marked overdue.
  2. Record is disabled before the start.
  3. Recording Pass, Retake, and Fail for S4–S6 produces exactly the §6.3 effects, visible on each student's home and badges.
  4. "Student didn't join" records Retake with `no_show`.
  5. A recorded outcome becomes read-only.
- **EC**: a double submit → the second returns `INVALID_TRANSITION`. Another interviewer's booking → `FORBIDDEN`. An empty day → empty state. Notes over 1000 characters *(illustrative)* → validation error.

### P6 — Team tracker and malpractice (R-05, R-06)
- **Depends**: P5.
- **AC**:
  1. The rows match the §8.1 `/team` definition: active eligibility or an award.
  2. The **Not booked** count is READY_TO_BOOK + RESCHEDULE_REQUIRED + RETAKE_COOLDOWN, and the **Booked** count is BOOKED + AWAITING_RESULT. Counts equal the filtered row counts.
  3. Filters work, days since eligible shows, and the overdue marker appears on S6.
  4. Flagging S9's Novice requires a reason and nullifies it. S9's home and badges reflect this, and the tier chip reverts to Pre-Qualiflyer. **S9's Specialist journey becomes NOT_ELIGIBLE (T15)**, and the Not booked count drops by one.
- **EC**: flagging a non-passed or already-nullified award → `INVALID_TRANSITION` (the button is hidden anyway). Empty reason → validation error.

### P7 — Result surfaces, messages, showcase (R-04, R-11, R-12)
- **Depends**: P6.
- **AC**:
  1. Distinct after-variants for Pass, Retake, Fail, and Nullified on the home and badges screens. The Pass variant shows the badge's bonus miles.
  2. The tier chip flips on the first active badge and flips back on nullification.
  3. `/showcase` renders the before/after pairs using the **same components** as the live app.
  4. The 3 messages on `/showcase` are byte-identical to the in-flow banners (a test compares template output).
  5. The banner dismisses.
- **EC**: a multi-badge student → one card per badge, ordered by level. A notification for data that was later reset → it still renders, because the text was snapshotted. A 360-pixel-wide viewport → no layout break.

### P8 — Deploy and harden
- **Depends**: P2–P7.
- **AC**:
  1. The production URL opens in a private window with no login.
  2. The full scripted walkthrough passes on production.
  3. A cold load after more than 10 minutes idle works.
  4. No secrets in the repo.
- **EC**: a cold start → skeleton, then content. A query error → ErrorState with "Try again". A missing environment variable → fails fast with a clear log.

### P9 — Loom and submission (R-13, R-14)
- **Depends**: P8.
- **AC**: if the build deviated from §6 or §7, the separate write-up has been updated to match. The write-up link (Google Drive, anyone with the link can view) opens logged out and still shows 2 pages. The Loom is ≤ 5:00 and plays logged out. All 3 links are submitted by 13 Nov, with a screenshot of the confirmation.
- **EC**: Google's conversion of the .docx pushes it onto page 3 → share the .docx itself (Drive previews it) or a PDF export instead. The Loom gets cut → re-record from the script.

---

## 11. Dependencies

```
P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9
            (P5 testable from seed)
```

Deploy from P2 onwards, and commit at the end of every phase (Antigravity quota protection).

---

## 12. Error contract

| Code | When | UX |
|---|---|---|
| `VALIDATION` | zod failure | Inline field message |
| `FORBIDDEN` | Wrong role or not the owner | Toast, redirect to own home |
| `NOT_FOUND` | Missing or foreign id | Toast, back |
| `INVALID_TRANSITION` | Not allowed from the current state, including duplicates | "This has already been updated", then refresh |
| `SLOT_TAKEN` | Lost a booking race | Toast, refresh times |
| `ALREADY_BOOKED` | A-03 | Link to the existing booking |
| `CUTOFF_PASSED` | Inside the change cutoff | Show the cutoff time in IST |
| `RESCHEDULE_LIMIT` | Limit reached | Explain |
| `COOLDOWN_ACTIVE` | Before `not_before` | Show the date |
| `NOT_ELIGIBLE` | No active eligibility | Explain |
| `SLOT_STARTED` | Withdraw or change after the start | Explain |
| `DB_UNAVAILABLE` | Connection or timeout | ErrorState with "Try again". Reads retry once. **Writes are never auto-retried.** |
| `UNKNOWN` | Anything else | Generic message. The details go to the server log. |

Rules:
1. Every mutation is one transaction.
2. State changes use conditional updates. Zero rows affected → `INVALID_TRANSITION`.
3. Postgres unique violations map to specific codes. Raw DB errors are never shown.
4. Buttons are disabled while pending.
5. Affected routes are revalidated after every success.

Not applicable, so not designed for: uploads and file formats, external API failures, LLM responses, and auth-provider failures.

---

## 13. Out of scope

Real authentication, email/SMS/WhatsApp delivery, video integration, calendar sync, modelling skills and contests, miles and leaderboard computation (only the tier chip is shown), appeals, outcome correction, a retake cap, multiple timezones, pagination, analytics, admin screens for interviewers or badges, background jobs, any runtime LLM, a notification inbox, an attempt timeline or audit log screen, the interviewer no-show action (documented only), and internationalization.

---

## 14. Final cross-check

| Check | Result |
|---|---|
| Brief #1–#6 and the Loom each map to a component and a phase | ✅ §1.2, §2 |
| Write-up covers brief #1–#3 only, and is a separate file outside the build | ✅ (v2 fix 1, v3.2) |
| Messages and before/after live in the prototype | ✅ HC-3, HC-4 |
| Malpractice nullification covered | ✅ R-06 |
| Every flow can be demoed whenever the prototype is opened | ✅ (v2 fixes 2 and 3) |
| No component without an R-ID or HC justification | ✅ |
| Every phase has separate AC and EC | ✅ |
| One write path, invariants in the DB, no stored derived state | ✅ |
| Free only, no payment method | ✅ §4 |
| The seed is valid at any time of day and for the whole stale window | ✅ (v3 fixes 15, 16) |
| Consistent with GRIT's published rules (sequential badges, bonus miles, locked levels) | ✅ (v3.1) |
| Every state can be reached in the live demo (T1 and T12 are upstream only) | ✅ §8.4 |
| Items still to verify at P0/P1: Neon pooled/direct usage, Pool driver transaction support, Vercel Hobby region setting, Vercel non-commercial interpretation, Jitsi join behavior | ⚠️ |
