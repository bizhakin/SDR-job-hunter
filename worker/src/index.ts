import * as greenhouse from './sources/greenhouse.js'
import * as lever from './sources/lever.js'
import * as remoteok from './sources/remoteok.js'
import * as wwr from './sources/wwr.js'
import { tagJobs } from './tagger.js'
import { filterNewJobs } from './deduper.js'
import { insertJobs } from './supabase.js'
import { embedNewJobs } from './embedder.js'
import type { JobPostInput } from './types.js'

interface SourceResult {
  source: string
  count: number
  error?: string
}

async function main(): Promise<void> {
  console.log('=== Closer Job Hunter — Aggregation Worker ===')
  console.log(`Started at: ${new Date().toISOString()}\n`)

  const sourceFetchers: { name: string; fetch: () => Promise<JobPostInput[]> }[] = [
    { name: 'Greenhouse', fetch: greenhouse.fetchJobs },
    { name: 'Lever', fetch: lever.fetchJobs },
    { name: 'RemoteOK', fetch: remoteok.fetchJobs },
    { name: 'We Work Remotely', fetch: wwr.fetchJobs },
  ]

  const sourceResults: SourceResult[] = []
  const allJobs: JobPostInput[] = []

  for (const source of sourceFetchers) {
    process.stdout.write(`[${source.name}] Fetching...`)
    try {
      const jobs = await source.fetch()
      allJobs.push(...jobs)
      sourceResults.push({ source: source.name, count: jobs.length })
      console.log(` ${jobs.length} jobs`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      sourceResults.push({ source: source.name, count: 0, error: message })
      console.error(` FAILED: ${message}`)
    }
  }

  console.log(`\nTotal raw jobs: ${allJobs.length}`)

  const totalFetched = allJobs.length
  const failedSources = sourceResults.filter((r) => r.error)
  if (failedSources.length > 0) {
    console.warn(
      `Failed sources: ${failedSources.map((r) => `${r.source} (${r.error})`).join(', ')}`,
    )
  }

  if (allJobs.length === 0) {
    console.log('No jobs fetched from any source. Exiting.')
    process.exit(failedSources.length === sourceFetchers.length ? 1 : 0)
  }

  console.log(`\nTagging ${allJobs.length} jobs...`)
  const tagged = tagJobs(allJobs)
  console.log(`Jobs matching sales keywords: ${tagged.length}`)
  console.log(`Discarded (no keyword match): ${allJobs.length - tagged.length}`)

  if (tagged.length === 0) {
    console.log('No matching jobs found. Exiting.')
    process.exit(0)
  }

  const roleTypeCounts: Record<string, number> = {}
  for (const job of tagged) {
    const key = job.role_type || 'unknown'
    roleTypeCounts[key] = (roleTypeCounts[key] || 0) + 1
  }
  console.log('By role type:', JSON.stringify(roleTypeCounts))

  console.log('\nDeduplicating...')
  const unique = await filterNewJobs(tagged)
  console.log(`New (not in DB): ${unique.length}`)
  console.log(`Duplicates skipped: ${tagged.length - unique.length}`)

  if (unique.length === 0) {
    console.log('No new jobs to insert. Exiting.')
    process.exit(0)
  }

  console.log(`\nInserting ${unique.length} jobs into Supabase...`)
  const inserted = await insertJobs(unique)
  console.log(`Successfully inserted: ${inserted}`)

  if (inserted > 0) {
    console.log('\nGenerating embeddings...')
    try {
      await embedNewJobs()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  Embedding step failed: ${msg}`)
    }
  }

  console.log(`\n=== Done at ${new Date().toISOString()} ===`)
  console.log(
    `Summary: ${totalFetched} fetched → ${tagged.length} tagged → ${unique.length} new → ${inserted} inserted`,
  )

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
