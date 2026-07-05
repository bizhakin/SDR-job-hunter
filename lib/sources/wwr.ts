import type { JobPostInput } from './types'
import { parseRSS, stripHtml } from './utils'

const RSS_URL = 'https://weworkremotely.com/remote-jobs.rss'

export async function fetchJobs(): Promise<JobPostInput[]> {
  const items = await parseRSS(RSS_URL)

  return items.map((item): JobPostInput => {
    const rawText = stripHtml(item.content || item.title)
    const isRemote = true

    return {
      source: 'wwr',
      source_url: item.link || '',
      company: item.creator || extractCompanyFromTitle(item.title) || null,
      title: item.title || null,
      role_type: null,
      comp_structure: null,
      remote: isRemote,
      raw_text: rawText || item.title,
      tags: item.categories,
      posted_at: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : null,
    }
  })
}

function extractCompanyFromTitle(title: string): string | null {
  const match = title.match(/^(.*?)\s+(is|are)\s+(hiring|looking)/i)
  if (match) return match[1].trim()

  const match2 = title.match(/^(.*?)\s+-\s+/)
  if (match2) return match2[1].trim()

  return null
}
