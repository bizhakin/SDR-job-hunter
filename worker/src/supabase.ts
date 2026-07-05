import { createClient } from '@supabase/supabase-js'
import { envConfig } from './config.js'
import type { JobPostInput } from './types.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = ReturnType<typeof createClient<any, any>>

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (client) return client
  client = createClient(envConfig.supabaseUrl, envConfig.serviceRoleKey, {
    auth: { persistSession: false },
  })
  return client
}

interface SourceUrlRow {
  source_url: string | null
}

export async function fetchExistingUrls(): Promise<Set<string>> {
  const supabase = getClient()
  const urls = new Set<string>()
  let offset = 0
  const limit = 1000

  while (true) {
    const { data, error } = await supabase
      .from('job_posts')
      .select('source_url')
      .not('source_url', 'is', null)
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to fetch existing URLs: ${error.message}`)
    }

    const rows = data as SourceUrlRow[] | null

    if (!rows || rows.length === 0) break

    for (const row of rows) {
      if (row.source_url) urls.add(row.source_url)
    }

    offset += limit
  }

  return urls
}

export async function insertJobs(jobs: JobPostInput[]): Promise<number> {
  if (jobs.length === 0) return 0

  const supabase = getClient()

  const { error } = await supabase.from('job_posts').upsert(jobs, {
    onConflict: 'source_url',
    ignoreDuplicates: true,
  })

  if (error) {
    throw new Error(`Failed to insert jobs: ${error.message}`)
  }

  return jobs.length
}
