# Closer Job Hunter — Aggregation Worker

Standalone Node.js service that fetches sales job listings from public APIs, filters by sales keywords, deduplicates, and inserts into Supabase.

## Setup

```bash
cd worker

# Copy env template and fill in your Supabase credentials
cp .env.example .env

# Install dependencies (using pnpm)
npx pnpm install
```

## Run manually

```bash
npx tsx src/index.ts
```

## Run on a schedule

### Option A: GitHub Action (recommended)

Create `.github/workflows/aggregate-jobs.yml` in the repo root:

```yaml
name: Aggregate Jobs
on:
  schedule:
    - cron: '0 * * * *'   # every hour
  workflow_dispatch:       # manual trigger

jobs:
  aggregate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx pnpm install
        working-directory: worker
      - run: npx tsx src/index.ts
        working-directory: worker
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

Set the two secrets in your GitHub repo settings.

### Option B: Railway cron job

1. Create a new Railway service from this repo
2. Set root directory to `worker`
3. Start command: `npx tsx src/index.ts`
4. Add a cron trigger via Railway's cron feature for hourly runs

### Option C: Local cron (crontab)

```bash
# Run every hour
echo "0 * * * * cd /path/to/closer-job-hunter/worker && npx tsx src/index.ts >> /var/log/closer-worker.log 2>&1" | crontab -
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |

## How it works

1. Fetches jobs from 4 sources: Greenhouse, Lever, RemoteOK, We Work Remotely
2. Tags jobs with role_type (closer/setter/sdr/bdr/other) by keyword matching
3. Discards jobs that don't match any sales keywords
4. Deduplicates against existing `job_posts.source_url` in Supabase
5. Upserts new jobs into the `job_posts` table

## Configuring company boards

Edit `src/config.ts` to add or remove company board names for Greenhouse and Lever queries.
