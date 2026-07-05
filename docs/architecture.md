# Closer/Setter Job Hunting App — Architecture

## What the app actually needs to do

Based on the playbook in that video (find hiring signals fast, apply at volume with AI, track follow-up), the app has four real jobs:

1. **Surface hiring signals** wherever they show up — most closer/setter/SDR roles for high-ticket remote sales *aren't* on LinkedIn/Indeed in a clean, filterable way. They're on niche remote boards, company career pages (via Greenhouse/Lever/Workable), and scattered across Instagram/X posts from coaches and agency owners.
2. **Tailor a pitch instantly** for each lead — resume tweak, cold DM/email script, or "why me" blurb generated per posting.
3. **Get the application out fast** — ideally one click, without getting the user's accounts banned.
4. **Track everything** — applied / replied / interview / offer, with follow-up reminders, so nothing dies in a DM thread.

---

## Build tool: use OpenCode as the primary driver

Quick comparison, current as of mid-2026:

**Google AI Studio (Build mode)** — browser-based, zero setup, vibe-codes full-stack web apps and native Android apps, one-click deploy to Cloud Run, Firebase integration, exports to ZIP/GitHub/Antigravity. It's genuinely good now, but it's optimized for apps centered on Gemini API calls and fairly contained scope (its own docs still frame the sweet spot as "personal utilities" and AI-powered experiences). It doesn't have a native concept of scheduled background workers, scrapers, or multi-source data pipelines — you'd be fighting the tool for the hardest part of this app.

**OpenCode** — open-source terminal coding agent, model-agnostic (Claude, Gemini, GPT, local models), full read/write access to a real repo, plan/build agent modes, git-backed undo, MCP support. It's built for exactly this: a multi-service app with a database, a scheduled scraper/aggregator, an AI layer, and a real deployment target.

**Recommendation:** prototype the AI-heavy pieces (pitch generator prompts, job-matching logic, UI look) in AI Studio if you want to see something on screen in 10 minutes — then export and do the real build in OpenCode, where you can wire up the database, the aggregation cron job, and auth properly. The hard, valuable part of this app is the data pipeline, not the chat UI, and that's OpenCode's strength.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + Tailwind | fast, deploys to Vercel free tier |
| Auth + DB | Supabase (Postgres) | auth, storage, pgvector for embeddings, cron via Edge Functions |
| AI | Claude or Gemini API | pitch generation, job-fit scoring, interview prep |
| Embeddings | Voyage/Gemini/OpenAI embeddings + pgvector | semantic match between user profile and job posts |
| Aggregation worker | Node/Python cron job (Supabase Edge Function or small Railway/Fly.io service) | pulls from job APIs on a schedule |
| Email send | Resend/Postmark, or Gmail API (user's own account) | outreach + digest notifications |
| Hosting | Vercel (frontend) + Supabase (data) + Railway (worker) | cheap, standard, easy for an agent to scaffold |

---

## System flow

```
[Job Sources] --> [Aggregator Worker, runs hourly] --> [Postgres: raw_jobs table]
                                                              |
                                                    [Dedupe + tag: role type, comp, remote]
                                                              |
                                                   [Embed + score vs. user profile]
                                                              |
                              [User feed: ranked matches] <--+--> [Manual "add a lead" (paste IG/X post, DM screenshot)]
                                                              |
                                                   [AI Pitch Generator: resume tweak + DM/email draft]
                                                              |
                                            [User reviews + sends, one click where compliant]
                                                              |
                                                 [Application Tracker: status + follow-up reminders]
```

---

## Core data model

- `users` — profile, comp expectations, skills, resume text, LinkedIn/portfolio links
- `job_posts` — source, url, company, role_type (closer/setter/SDR/BDR), comp_structure, remote, raw_text, posted_at
- `job_matches` — user_id, job_id, match_score, status (new/dismissed/saved)
- `applications` — user_id, job_id, pitch_text sent, channel (email/DM/form), status, next_follow_up_at
- `leads_manual` — user-submitted (pasted IG/X/Discord post text) for postings the scraper can't reach
- `interview_sessions` — practice Q&A logs, objections drilled, notes

---

## Feature modules

**1. Aggregation engine** — pull from sources that are actually safe/legal to query:
- RemoteOK API, We Work Remotely RSS (public feeds)
- Wellfound/AngelList listings
- Greenhouse, Lever, Workable — most companies expose a **public** job board API for their own postings (e.g. `boards-api.greenhouse.io/v1/boards/{company}/jobs`) — no scraping needed, this is the biggest reliable well of "closer/setter/SDR" roles at scale
- Filter/tag with a keyword taxonomy: "closer," "setter," "appointment setter," "SDR," "BDR," "high ticket," "remote sales," "commission only"

**2. Manual/crowdsourced lead capture** — for the Instagram/X/Discord posts the video talks about. Scraping social platforms directly is fragile and ToS-risky, so instead: a simple "paste this post" or browser-extension-later capture flow. The user (or a community) feeds these in, AI structures them into the same `job_posts` schema.

**3. AI matching** — embed the user's profile once, embed each job post, rank by cosine similarity + rule-based boosts (comp match, remote, role type).

**4. AI pitch/resume tailoring** — per job, generate: a 2-3 line tailored resume summary, a short cold DM/email script, and (nice-to-have) a 30-second video pitch script.

**5. Application tracker** — kanban-style: New → Applied → Replied → Interview → Offer/Rejected, with automatic follow-up reminders (e.g., "no reply in 4 days → nudge draft ready").

**6. Interview prep** — since these roles are evaluated heavily on live objection-handling, a roleplay mode where the AI plays a skeptical buyer and scores the user's responses.

---

## The compliance point worth building around

The video's "100+ applications in minutes" works because a human is still doing the sending — AI just kills the time cost of writing each pitch. Fully automated bot-submission (auto-filling LinkedIn Easy Apply, mass-DMing Instagram) generally violates those platforms' Terms of Service and risks the user's own account getting flagged or banned — there's no compliant public API for third parties to do this on the user's behalf. Architect for **AI drafts, human sends**: instant, tailored content generation + one-click copy/send from the user's own logged-in session or their own email (via Gmail API, which *is* compliant since they're using their own account). This keeps the 10x speed gain without the account-ban risk.

---

## MVP roadmap

**Phase 1** — Manual job list + AI pitch generator + tracker. No scraping yet. Prove the AI pitch quality is actually good.
**Phase 2** — Aggregation worker pulling Greenhouse/Lever/Workable + RemoteOK/WWR, keyword-tagged, ranked feed.
**Phase 3** — Manual lead capture for social posts, follow-up reminder engine, email send via Gmail API.
**Phase 4** — Interview roleplay module, browser extension for one-click lead capture.

---

## Getting started with OpenCode

```
curl -fsSL https://opencode.ai/install | bash
opencode -c ~/projects/closer-job-hunter
```

First prompt to give it (Plan mode first — Tab to toggle before Build):

> Scaffold a Next.js + Supabase app called "closer-job-hunter." Set up Supabase auth, a Postgres schema for users/job_posts/job_matches/applications/leads_manual (see schema below), and a basic dashboard page listing job matches. Use Tailwind for styling.

Paste the data model above as the schema reference, and build Phase 1 first before touching the aggregation worker.
