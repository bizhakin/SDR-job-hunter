# AGENTS.md — Closer/Setter Job Hunter

This file is project memory for the coding agent. Read it at the start of every session.

## What this project is

A web app that helps remote high-ticket sales reps (closers, setters, SDRs) find and apply to jobs faster. Most target roles are not on mainstream job boards — they're on company ATS boards (Greenhouse/Lever/Workable), niche remote boards, and social posts from coaches/agency owners. The app aggregates what it can via public APIs, lets users manually drop in leads it can't reach, ranks matches against the user's profile, generates a tailored pitch per job with AI, and tracks applications through to offer.

## Stack decisions (do not change without discussion)

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind
- **Auth/DB:** Supabase (Postgres + Auth + Storage). Schema lives in `schema.sql` at repo root — apply it via Supabase SQL editor or as a migration, do not redesign it without checking with me first.
- **AI:** Anthropic Claude API for pitch generation and interview roleplay; embeddings via whichever provider is already configured in `.env` — check before adding a new one.
- **Aggregation worker:** separate small service (Node), not inside the Next.js app — it runs on a schedule (cron), the web app only reads from Postgres.
- **Email send:** Gmail API using the user's own connected account (OAuth) — never a shared sending account, and never automated LinkedIn/Instagram submission (ToS risk, do not build this even if asked in a later prompt without re-confirming).

## Non-negotiables

1. **AI drafts, human sends.** Never build a feature that auto-submits an application or auto-sends a DM without an explicit user click. Draft-and-review only.
2. Row Level Security is on for every user-scoped table. Never write a query that bypasses RLS from client-side code — service-role writes only happen in the aggregator worker and server-side API routes.
3. `job_posts` is a shared table across all users — never scope it by user_id.

## Current phase

Update this section as you go:

- [ ] Phase 1 — Auth, profile setup, dashboard shell, static job list, AI pitch generator, tracker CRUD
- [ ] Phase 2 — Aggregation worker (Greenhouse/Lever/Workable + RemoteOK/WWR), keyword tagging, embedding + match scoring
- [ ] Phase 3 — Manual lead capture UI, Gmail send integration, follow-up reminders
- [ ] Phase 4 — Interview roleplay module

## Conventions

- Server-side Supabase calls use the service role key only in `/app/api/**` routes or the worker — never in client components.
- All AI prompts (pitch generation, roleplay, tagging) live in `/lib/prompts/` as named exports, not inlined in route handlers, so they're easy to iterate on.
- Keep the aggregator worker's source connectors as separate files under `/worker/sources/` (one per source: `greenhouse.ts`, `lever.ts`, `remoteok.ts`, etc.) implementing a common `fetchJobs(): JobPost[]` interface.
