import type { JobPostInput } from './types'
import { stripHtml } from './utils'

interface LeverPosting {
  id: string
  text: string
  headline: string
  description: string
  lists: { text: string; content: string }[]
  categories: {
    location: string
    commitment: string | null
    team: string | null
  }
  createdAt: number
  hostUrl: string
}

const leverBoards = [
  'intercom',
  'figma',
  'carta',
  'cultureamp',
  'pagerduty',
  'grammarly',
  'mercari',
  'starburst',
  'workiva',
  'huntress',
  'automattic',
  'databricks',
  'confluent',
  'hashicorp',
  'elastic',
]

async function fetchBoard(company: string): Promise<JobPostInput[]> {
  const url = `https://api.lever.co/v0/postings/${company}?mode=json`

  const response = await fetch(url, {
    headers: { 'User-Agent': 'CloserJobHunter/1.0' },
  })

  if (!response.ok) {
    if (response.status === 404) return []
    throw new Error(`Lever API error (${company}): ${response.status}`)
  }

  const postings = (await response.json()) as LeverPosting[]

  if (!Array.isArray(postings)) return []

  return postings.map((posting): JobPostInput => {
    const rawText = stripHtml(posting.description)

    const location = posting.categories?.location ?? ''
    const isRemote =
      /remote|anywhere|home|virtual|united states/i.test(location) || !location

    const compField = posting.lists?.find((l) =>
      /comp|salary|pay|commission|base|ote/i.test(l.text),
    )

    const team = posting.categories?.team ?? null

    return {
      source: 'lever',
      source_url: posting.hostUrl,
      company,
      title: posting.headline || 'Untitled',
      role_type: null,
      comp_structure: compField?.content ?? null,
      remote: isRemote,
      raw_text: rawText,
      tags: team ? [team] : [],
      posted_at: posting.createdAt
        ? new Date(posting.createdAt).toISOString()
        : null,
    }
  })
}

export async function fetchJobs(): Promise<JobPostInput[]> {
  const results: JobPostInput[] = []
  const errors: { company: string; error: string }[] = []

  for (const company of leverBoards) {
    try {
      const jobs = await fetchBoard(company)
      results.push(...jobs)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push({ company, error: message })
    }
    await new Promise((r) => setTimeout(r, 200))
  }

  if (errors.length > 0) {
    console.warn(
      `[Lever] ${errors.length} board(s) failed out of ${leverBoards.length}: ${errors.map((e) => e.company).join(', ')}`,
    )
  }

  return results
}
