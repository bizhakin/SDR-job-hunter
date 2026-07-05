import type { JobPostInput } from './types'
import { stripHtml } from './utils'

interface RemotiveJob {
  id: number
  url: string
  title: string
  company_name: string
  category: string
  tags: string[]
  job_type: string
  publication_date: string
  candidate_required_location: string
  salary: string
  description: string
}

const REMOTIVE_API = 'https://remotive.com/api/remote-jobs'

export async function fetchJobs(): Promise<JobPostInput[]> {
  const allJobs: JobPostInput[] = []

  for (let page = 1; page <= 5; page++) {
    try {
      const url = `${REMOTIVE_API}?limit=100&page=${page}`
      const response = await fetch(url, {
        headers: { 'User-Agent': 'CloserJobHunter/1.0' },
      })

      if (!response.ok) {
        console.warn(`[Remotive] page ${page} failed: ${response.status}`)
        break
      }

      const data = (await response.json()) as {
        'job-count': number
        jobs: RemotiveJob[]
      }

      if (!data.jobs || data.jobs.length === 0) break

      const salesCategories = new Set([
        'sales',
        'business-development',
        'customer-success',
        'marketing',
      ])

      for (const job of data.jobs) {
        const category = (job.category || '').toLowerCase().replace(/\s+/g, '-')
        const title = (job.title || '').toLowerCase()
        const tags = (job.tags || []).map((t) => t.toLowerCase())

        const isSalesRelated =
          salesCategories.has(category) ||
          salesCategories.has(job.category?.toLowerCase() || '') ||
          /sales|closer|setter|sdr|bdr|account|business development/i.test(title) ||
          tags.some(
            (t) =>
              /sales|closer|setter|sdr|bdr/i.test(t),
          )

        if (!isSalesRelated) continue

        const location = (job.candidate_required_location || '').toLowerCase()
        const isRemote =
          /remote|anywhere|worldwide|home|virtual/i.test(location)

        allJobs.push({
          source: 'remotive',
          source_url: job.url,
          company: job.company_name || null,
          title: job.title || null,
          role_type: null,
          comp_structure: job.salary || null,
          remote: isRemote,
          raw_text: stripHtml(job.description || ''),
          tags: job.tags || [],
          posted_at: job.publication_date
            ? new Date(job.publication_date).toISOString()
            : null,
        })
      }

      if (data.jobs.length < 100) break
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[Remotive] page ${page} error: ${message}`)
      break
    }
  }

  return allJobs
}
