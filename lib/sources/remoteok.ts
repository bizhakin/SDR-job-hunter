import type { JobPostInput } from './types'
import { stripHtml } from './utils'

interface RemoteOkJob {
  id: string
  slug: string
  company: string
  position: string
  description: string
  date: string
  tags: string[]
  url: string
}

export async function fetchJobs(): Promise<JobPostInput[]> {
  const response = await fetch('https://remoteok.com/api', {
    headers: { 'User-Agent': 'CloserJobHunter/1.0' },
  })

  if (!response.ok) {
    throw new Error(`RemoteOK API error: ${response.status}`)
  }

  const data = (await response.json()) as (RemoteOkJob | Record<string, never>)[]

  if (!Array.isArray(data)) return []

  const jobs = data.slice(1) as RemoteOkJob[]

  return jobs.map((job): JobPostInput => ({
    source: 'remoteok',
    source_url: job.url || `https://remoteok.com/remote-jobs/${job.slug}`,
    company: job.company || null,
    title: job.position || null,
    role_type: null,
    comp_structure: null,
    remote: true,
    raw_text: stripHtml(job.description || ''),
    tags: job.tags || [],
    posted_at: job.date ? new Date(job.date).toISOString() : null,
  }))
}
