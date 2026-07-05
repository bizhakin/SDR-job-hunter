import type { JobPostInput } from './types'
import { parseRSS, stripHtml } from './utils'

const QUERIES = [
  'sales+1099',
  'independent+contractor+sales',
  'commission+only',
  'high+ticket+closer',
  'business+opportunity',
  'amazon+fba',
  'trading+coach',
  'coaching+sales',
  'appointment+setter+commission',
  '1099+closer',
  'remote+sales+contract',
  'bizop',
  'dfy+high+ticket',
]

const COMPANY_BLACKLIST = [
  'amazon.com', 'google', 'meta', 'microsoft', 'apple',
  'deloitte', 'accenture', 'kpmg', 'pwc', 'ey',
  'jpmorgan', 'goldman', 'citi', 'wells fargo',
]

function isBlacklisted(company: string): boolean {
  const lower = company.toLowerCase()
  return COMPANY_BLACKLIST.some((b) => lower.includes(b))
}

export async function fetchJobs(): Promise<JobPostInput[]> {
  const seen = new Set<string>()
  const results: JobPostInput[] = []

  for (const query of QUERIES) {
    try {
      const url = `https://www.indeed.com/rss?q=${query}&l=remote`
      const items = await parseRSS(url)

      for (const item of items) {
        if (seen.has(item.link)) continue
        seen.add(item.link)

        const title = stripHtml(item.title)
        const rawText = stripHtml(
          item.content || item.title,
        )

        const company = item.creator || extractCompany(item.title) || null

        if (company && isBlacklisted(company)) continue

        results.push({
          source: 'indeed',
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

      await new Promise((r) => setTimeout(r, 500))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[Indeed] query "${query}" failed: ${msg}`)
    }
  }

  return results
}

function extractCompany(title: string): string | null {
  const match = title.match(/^(.*?)\s+-\s+/)
  if (match) return match[1].trim()

  const match2 = title.match(/^(.*?)\s+(is|are)\s+(hiring|looking)/i)
  if (match2) return match2[1].trim()

  return null
}

function extractComp(title: string, rawText: string): string | null {
  const text = `${title} ${rawText}`
  const patterns = [
    /(?:\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:base|salary|commission|OTE|per year|annual|monthly|hour))?)/gi,
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
