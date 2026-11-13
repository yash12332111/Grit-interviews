# GRIT Interview Scheduling

A working prototype for scheduling GRIT badge interviews, built for the NxtWave AI Product Engineer Round 1 assignment.

**Live:** see submission

Three roles share one app, and no sign-up is needed (a persona picker stands in for login):

- **Students** book, reschedule or cancel a badge interview from their dashboard, and see the result afterwards.
- **Interviewers** open availability slots, run a daily schedule, and record Pass, Fail or Retake later.
- **The interview team** sees which eligible students have booked and which haven't, and can nullify a badge if malpractice is flagged later.

`/showcase` shows the before/after screens for each result and the three most important student messages, using the same components as the live app.

## Personas and what each demonstrates

Open the app, pick a persona, and use the switcher at the top to change at any time. The data resets itself when it is more than 6 hours old, and **Reset demo data** on the landing page restores it on demand.

| Persona | Starting state | What to try |
|---|---|---|
| Aarav Patel (S1) | Ready to book (Novice) | Book an interview |
| Diya Reddy (S2) | Booked, 3 days out, with Rahul | Reschedule (twice, then the limit) and cancel |
| Rohan Gupta (S3) | Booked, inside the 12-hour cutoff | Reschedule and cancel are blocked, with the cutoff time shown |
| Meera Nair (S4) | Awaiting result (1 hour ago, with Priya) | Record **Pass** as Priya |
| Kabir Joshi (S5) | Awaiting result (2 hours ago, with Priya) | Record **Retake later** as Priya |
| Tanvi Shah (S6) | Awaiting result (about 26 hours ago, with Priya) | Record **Fail**; shows the overdue marker |
| Siddharth Rao (S7) | Reschedule required (interviewer withdrew the slot) | Rebook; the reschedule count stays unchanged |
| Ishaan Verma (S8) | Retake cooldown (attempt 2 opens in 5 days) | Cooldown view, no Book button |
| Riya Kapoor (S9) | Novice passed, Specialist ready to book | Multi-badge view; flag her Novice as the team to see Specialist lock again |
| Aditya Kulkarni (S10) | Novice badge nullified | Nullified view |
| Pooja Iyer (S11) | Novice failed, eligibility revoked | Failed view |
| Priya Sharma (I1) | Interviewer | Daily schedule with the three results above, outcome recording |
| Rahul Verma (I2) | Interviewer | Availability; withdraw Diya's booked slot with a reason |
| Ananya Sen (I3) | Interviewer | Add a slot outside the seeded hours (for example 19:00) |
| Vikram Malhotra | Interview team | Booked / not booked tracker; flag malpractice |

## Stack

Next.js (App Router) and TypeScript, Tailwind CSS with shadcn/ui, Neon Postgres through the serverless WebSocket pool, Drizzle ORM, zod, Vitest, hosted on Vercel. Everything runs on free tiers.

Business rules live in `src/domain` (pure, no I/O). Server Actions in `src/actions` are the only write path, and database constraints (partial unique indexes and checks) are the last line of defence. The design is documented in `docs/architecture.md`.

## Run locally

1. Install dependencies: `npm install`
2. Create `.env.local` with the two Neon connection strings (see `.env.example`):
   - `DATABASE_URL`: the pooled string, used by the app
   - `DATABASE_URL_UNPOOLED`: the direct string, used by migrations
3. Apply the schema and load the demo data:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. Start the app: `npm run dev`, then open http://localhost:3000

If `DATABASE_URL` is missing, the app stops at startup with a message saying where to set it.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build (type-checks and lints) |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the domain tests (state machine, rules, derivation, messages) |
| `npm run db:generate` | Generate a SQL migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the database |
| `npm run db:seed` | Reset the database to the demo scenario |

Do not commit `.env.local`; only `.env.example` (names, no values) belongs in the repository.
