import { fetchExistingUrls } from './supabase.js'
import type { JobPostInput } from './types.js'

export async function filterNewJobs(jobs: JobPostInput[]): Promise<JobPostInput[]> {
  if (jobs.length === 0) return []

  let existingUrls: Set<string>
  try {
    existingUrls = await fetchExistingUrls()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Failed to fetch existing URLs, proceeding without dedupe:', message)
    return jobs
  }

  if (existingUrls.size === 0) return jobs

  return jobs.filter((job) => !existingUrls.has(job.source_url))
}
