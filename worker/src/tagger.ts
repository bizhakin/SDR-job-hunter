import { keywordTaxonomy } from './config.js'
import type { JobPostInput } from './types.js'

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function textContainsKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase())
}

function classifyJob(title: string | null, rawText: string): {
  role_type: string | null
  tags: string[]
} {
  const searchText = [title ?? '', rawText].join(' ').toLowerCase()
  const matchedTags: string[] = []

  for (const [roleType, keywords] of Object.entries(keywordTaxonomy)) {
    for (const keyword of keywords) {
      if (textContainsKeyword(searchText, keyword)) {
        matchedTags.push(keyword)
      }
    }
  }

  if (matchedTags.length === 0) {
    return { role_type: null, tags: [] }
  }

  const roleTypePriority: (keyof typeof keywordTaxonomy)[] = [
    'closer',
    'setter',
    'sdr',
    'bdr',
    'other',
  ]

  for (const roleType of roleTypePriority) {
    if (matchedTags.some((tag) => keywordTaxonomy[roleType].includes(tag))) {
      return { role_type: roleType, tags: matchedTags }
    }
  }

  return { role_type: 'other', tags: matchedTags }
}

function extractCompensation(text: string): string | null {
  const patterns = [
    /(?:\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:base|salary|commission|O|O|per year|annual|monthly|hour))?)/gi,
    /(\d{2,3}%\s*commission)/gi,
    /(uncapped\s*commission)/gi,
    /(commission\s*only)/gi,
    /(100%\s*commission)/gi,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[0].trim()
    }
  }

  return null
}

export function tagJobs(jobs: JobPostInput[]): JobPostInput[] {
  const tagged: JobPostInput[] = []

  for (const job of jobs) {
    const classification = classifyJob(job.title, job.raw_text)

    if (!classification.role_type) continue

    const comp =
      job.comp_structure ?? extractCompensation(job.raw_text) ?? null

    tagged.push({
      ...job,
      role_type: classification.role_type,
      tags: [...new Set([...job.tags, ...classification.tags])],
      comp_structure: comp,
    })
  }

  return tagged
}
