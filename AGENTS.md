<!-- PROJECT RULES — GRIT Interview Scheduling (NxtWave assignment) -->
<!--
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
-->

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
