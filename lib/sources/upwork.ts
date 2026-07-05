import type { JobPostInput } from './types'
import { parseRSS, stripHtml } from './utils'

const QUERIES = [
  'sales+closer',
  'high+ticket',
  'lead+generation',
  'cold+calling',
  'appointment+setter',
  'business+development',
  'sales+consultant',
  'commission+only',
  'sales+development',
  'b2b+sales',
  'coaching+sales',
  'real+estate+sales',
  'amazon+fba',
  'insurance+sales',
]

export async function fetchJobs(): Promise<JobPostInput[]> {
  const seen = new Set<string>()
  const results: JobPostInput[] = []

  for (const query of QUERIES) {
    try {
      const url = `https://www.upwork.com/ab/feed/jobs/rss?q=${encodeURIComponent(query)}&sort=recency&paging=0`

      const items = await parseRSS(url)

      for (const item of items) {
        if (seen.has(item.link)) continue
        seen.add(item.link)

        const title = stripHtml(item.title)
        const rawText = stripHtml(
          item.content || item.title,
        )

        const company = item.creator || null

        results.push({
          source: 'upwork',
          source_url: item.link,
          company,
          title,
          role_type: null,
          comp_structure: extractComp(item.title, rawText),
          remote: true,
          raw_text: rawText,
          tags: ['employment:1099'],
          posted_at: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : null,
        })
      }

      await new Promise((r) => setTimeout(r, 300))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[Upwork] query "${query}" failed: ${msg}`)
    }
  }

  return results
}

function extractComp(title: string, rawText: string): string | null {
  const text = `${title} ${rawText}`
  const patterns = [
    /Budget:\s*\$[\d,]+(?:\s*-\s*\$[\d,]+)?/gi,
    /(?:\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:base|salary|commission|OTE|per year|annual|monthly|hour|hr))?)/gi,
    /(\d{2,3}%\s*commission)/gi,
    /(uncapped\s*commission)/gi,
    /(commission\s*only)/gi,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[0].trim()
  }
  return null
}
