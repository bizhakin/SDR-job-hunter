# Prompts for OpenCode

Order matters — don't skip ahead to Phase 2 before Phase 1 actually runs. Put `AGENTS.md` and `schema.sql` in the repo root before you start; OpenCode will read `AGENTS.md` automatically for context.

For each prompt: hit **Tab** first to switch to **Plan mode**, let it show you the plan, then Tab back to **Build mode** to execute. Don't skip Plan mode on the first prompt of each phase — it's your one chance to catch a bad architectural call before it writes files.

---

## Phase 1 — Skeleton, auth, dashboard, AI pitch generator

```
Read AGENTS.md and schema.sql in this repo root first.

Scaffold a Next.js (App Router, TypeScript, Tailwind) app called
closer-job-hunter. Set up Supabase auth (email + Google login) and apply
schema.sql to a new Supabase project (walk me through creating the project
and pasting the connection keys into .env.local — don't invent fake keys).

Build:
1. A signup/login flow using Supabase Auth.
2. A profile setup page that writes to the `profiles` table (resume text,
   skills, comp range, role preference, remote preference).
3. A dashboard page that lists rows from `job_posts` (seed the table with
   5-10 fake rows for now so the UI has something to render) as cards
   showing company, title, role_type, comp_structure.
4. On each job card, a "Generate pitch" button that calls a server route
   at /api/pitch which sends the job's raw_text plus the user's profile to
   the Claude API and returns a short tailored resume blurb + a cold
   outreach message. Store the prompt template in /lib/prompts/pitch.ts,
   not inline in the route handler.
5. A basic applications tracker page reading/writing the `applications`
   table with status columns: drafted, applied, replied, interview,
   offer, rejected.

Keep it functional over pretty for now. Use the service role key only in
server-side API routes, never client-side.
```

---

## Phase 2 — Aggregation worker

```
Read AGENTS.md for context on the aggregation worker requirements.

Create a separate worker service in /worker (Node, TypeScript) that:

1. Has one file per source under /worker/sources/, each implementing a
   shared `fetchJobs(): Promise<JobPostInput[]>` interface:
   - greenhouse.ts — query the public Greenhouse job board API for a
     configurable list of company board tokens
   - lever.ts — same, for Lever's public postings API
   - remoteok.ts — RemoteOK's public API
   - wwr.ts — We Work Remotely's public RSS feed
2. A tagging step that filters/labels results using a keyword list
   (closer, setter, appointment setter, SDR, BDR, high ticket, remote
   sales, commission) and sets role_type accordingly. Discard anything
   that doesn't match.
3. A dedupe step against `job_posts.source_url` before inserting.
4. An entry point that runs all sources, tags, dedupes, and upserts into
   Supabase using the service role key (read it from env, don't hardcode).
5. A README in /worker explaining how to run it on a schedule (cron via
   Railway or a GitHub Action) — set it up for hourly runs.

Don't touch the Next.js app in this pass — worker only reads/writes
Postgres directly.
```

---

## Phase 3 — Matching, manual leads, email send

```
Read AGENTS.md before starting.

1. Add an embedding step to the worker (or a new /api/embed route): embed
   each new job_post's raw_text and store it in the `embedding` column.
   Embed each user's profile (resume_text + skills) the same way whenever
   their profile changes.
2. Build a match-scoring job (can run in the worker or as a Supabase
   Edge Function) that computes cosine similarity between each user's
   profile embedding and unmatched job_posts, writing rows into
   job_matches with a match_score. Re-rank the dashboard feed by this
   score instead of showing raw job_posts.
3. Add a "Add a lead" page where the user can paste text from an
   Instagram/X/Discord post. Send it to Claude to extract company, likely
   role_type, comp_structure if mentioned, and store it in job_posts
   (source = 'manual') plus a row in leads_manual referencing it.
4. Add Gmail API OAuth so a user can connect their own Gmail account, and
   wire the "Generate pitch" flow to offer a "Send via Gmail" button that
   sends from *their* connected account — never a shared sending account,
   and always show a preview before sending.
5. Add a daily cron (Supabase Edge Function) that checks applications
   with next_follow_up_at <= now() and status not in (offer, rejected),
   and surfaces them in a "Needs follow-up" section on the dashboard.
```

---

## Phase 4 — Interview roleplay

```
Read AGENTS.md before starting.

Build an interview practice page: pick a job_post, and start a roleplay
session where Claude plays a skeptical prospect on a sales call relevant
to that company's offer. Score the user's responses against common
objection-handling patterns (price, timing, trust, "let me think about
it"), log the transcript and score into interview_sessions, and show a
summary at the end with 2-3 concrete things to improve.
```
