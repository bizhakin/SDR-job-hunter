import * as cheerio from 'cheerio'
import { greenhouseBoards } from '../config.js'
import type { JobPostInput } from '../types.js'

interface GreenhouseJob {
  id: number
  title: string
  absolute_url: string
  location?: { name?: string }
  metadata?: { name: string; value: string; type: string }[] | null
  content: string
  updated_at: string
}

async function fetchBoard(company: string): Promise<JobPostInput[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`

  const response = await fetch(url, {
    headers: { 'User-Agent': 'CloserJobHunter/0.1' },
  })

  if (!response.ok) {
    if (response.status === 404) {
      return []
    }
    throw new Error(
      `Greenhouse API error (${company}): ${response.status} ${response.statusText}`,
    )
  }

  const data = (await response.json()) as { jobs: GreenhouseJob[] }

  if (!data.jobs || !Array.isArray(data.jobs)) {
    return []
  }

  return data.jobs.map((job): JobPostInput => {
    const $ = cheerio.load(job.content)
    const rawText = $.text().replace(/\s+/g, ' ').trim()

    const locationName = job.location?.name ?? ''
    const isRemote = /remote|anywhere|home|virtual/i.test(locationName)

    const compField = job.metadata?.find(
      (m) =>
        /comp|salary|pay|commission|base|ote/i.test(m.name) &&
        m.type === 'compensation',
    )
    const compStructure = compField?.value ?? null

    return {
      source: 'greenhouse',
      source_url: job.absolute_url,
      company: company,
      title: job.title,
      role_type: null,
      comp_structure: compStructure,
      remote: isRemote || locationName === '',
      raw_text: rawText,
      tags: [],
      posted_at: job.updated_at ? new Date(job.updated_at).toISOString() : null,
    }
  })
}

export async function fetchJobs(): Promise<JobPostInput[]> {
  const results: JobPostInput[] = []
  const errors: { company: string; error: string }[] = []

  for (const company of greenhouseBoards) {
    try {
      const jobs = await fetchBoard(company)
      results.push(...jobs)
      if (jobs.length > 0) {
        console.log(`  [Greenhouse] ${company}: ${jobs.length} jobs`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push({ company, error: message })
      console.error(`  [Greenhouse] ${company} failed: ${message}`)
    }

    await new Promise((r) => setTimeout(r, 200))
  }

  if (errors.length > 0) {
    console.warn(
      `  [Greenhouse] ${errors.length} board(s) failed out of ${greenhouseBoards.length}`,
    )
  }

  return results
}
