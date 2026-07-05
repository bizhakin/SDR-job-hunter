import type { JobPostInput } from './types'
import { fetchJobs as fetchRemoteOk } from './remoteok'
import { fetchJobs as fetchWWR } from './wwr'
import { fetchJobs as fetchGreenhouse } from './greenhouse'
import { fetchJobs as fetchLever } from './lever'
import { fetchJobs as fetchRemotive } from './remotive'
import { fetchJobs as fetchIndeed } from './indeed'
import { fetchJobs as fetchUpwork } from './upwork'
import { tagJobs } from './tagger'
import { createClient } from '@supabase/supabase-js'

interface AggregationResult {
  source_counts: Record<string, number>
  tagged_count: number
  inserted: number
  skipped: number
  errors: string[]
}

export async function runAggregation(): Promise<AggregationResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      source_counts: {},
      tagged_count: 0,
      inserted: 0,
      skipped: 0,
      errors: ['Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)'],
    }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const errors: string[] = []
  const rawResults: JobPostInput[] = []

  const sources: [string, () => Promise<JobPostInput[]>][] = [
    ['remoteok', fetchRemoteOk],
    ['wwr', fetchWWR],
    ['greenhouse', fetchGreenhouse],
    ['lever', fetchLever],
    ['remotive', fetchRemotive],
    ['indeed', fetchIndeed],
    ['upwork', fetchUpwork],
  ]

  for (const [name, fetcher] of sources) {
    try {
      const jobs = await fetcher()
      rawResults.push(...jobs)
      console.log(`[Aggregator] ${name}: ${jobs.length} jobs fetched`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${name}: ${msg}`)
      console.error(`[Aggregator] ${name} failed: ${msg}`)
    }
  }

  const tagged = tagJobs(rawResults)
  const sourceCounts: Record<string, number> = {}
  for (const job of rawResults) {
    sourceCounts[job.source] = (sourceCounts[job.source] || 0) + 1
  }

  if (tagged.length === 0) {
    return {
      source_counts: sourceCounts,
      tagged_count: 0,
      inserted: 0,
      skipped: 0,
      errors: errors.length > 0 ? errors : ['No jobs matched sales keywords'],
    }
  }

  let existingUrls = new Set<string>()
  try {
    existingUrls = await fetchExistingUrls(supabase)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Aggregator] Dedupe fetch failed: ${msg}`)
  }

  const newJobs = tagged.filter(
    (job) => job.source_url && !existingUrls.has(job.source_url),
  )

  const skipped = tagged.length - newJobs.length

  if (newJobs.length === 0) {
    return {
      source_counts: sourceCounts,
      tagged_count: tagged.length,
      inserted: 0,
      skipped,
      errors,
    }
  }

  try {
    const { error } = await supabase.from('job_posts').upsert(newJobs, {
      onConflict: 'source_url',
      ignoreDuplicates: true,
    })

    if (error) {
      errors.push(`Insert failed: ${error.message}`)
      return {
        source_counts: sourceCounts,
        tagged_count: tagged.length,
        inserted: 0,
        skipped,
        errors,
      }
    }

    return {
      source_counts: sourceCounts,
      tagged_count: tagged.length,
      inserted: newJobs.length,
      skipped,
      errors: errors.length > 0 ? errors : [],
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Insert error: ${msg}`)
    return {
      source_counts: sourceCounts,
      tagged_count: tagged.length,
      inserted: 0,
      skipped,
      errors,
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchExistingUrls(supabase: any): Promise<Set<string>> {
  const urls = new Set<string>()
  let offset = 0
  const limit = 1000

  while (true) {
    const { data, error } = await supabase
      .from('job_posts')
      .select('source_url')
      .not('source_url', 'is', null)
      .range(offset, offset + limit - 1)

    if (error) throw new Error(`Failed to fetch existing URLs: ${error.message}`)

    const rows = data as { source_url: string | null }[] | null
    if (!rows || rows.length === 0) break

    for (const row of rows) {
      if (row.source_url) urls.add(row.source_url)
    }

    offset += limit
  }

  return urls
}
