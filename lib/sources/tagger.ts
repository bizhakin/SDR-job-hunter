import type { JobPostInput } from './types'

const keywordTaxonomy: Record<string, string[]> = {
  closer: [
    'closer',
    'high ticket closer',
    'sales closer',
    'closing specialist',
    'remote closer',
    'senior closer',
  ],
  setter: [
    'setter',
    'appointment setter',
    'meeting setter',
    'appointment scheduler',
    'scheduling specialist',
    'lead setter',
  ],
  sdr: [
    'sdr',
    'sales development representative',
    'sales development rep',
    'sdr manager',
    'senior sdr',
  ],
  bdr: [
    'bdr',
    'business development representative',
    'business development rep',
    'bdr manager',
    'senior bdr',
    'business development manager',
  ],
  other: [
    'high ticket',
    'remote sales',
    'sales representative',
    'account executive',
    'ae',
    'sales consultant',
    'sales specialist',
    'inside sales',
    'commission only',
    '100% commission',
    'uncapped commission',
    'sales development',
  ],
}

const roleTypePriority: (keyof typeof keywordTaxonomy)[] = [
  'closer',
  'setter',
  'sdr',
  'bdr',
  'other',
]

function classifyJob(
  title: string | null,
  rawText: string,
): { role_type: string | null; matchedTags: string[] } {
  const searchText = [title ?? '', rawText].join(' ').toLowerCase()
  const matchedTags: string[] = []

  for (const keywords of Object.values(keywordTaxonomy)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        matchedTags.push(keyword)
      }
    }
  }

  if (matchedTags.length === 0) {
    return { role_type: null, matchedTags: [] }
  }

  for (const roleType of roleTypePriority) {
    if (
      matchedTags.some((tag) => keywordTaxonomy[roleType].includes(tag))
    ) {
      return { role_type: roleType, matchedTags }
    }
  }

  return { role_type: 'other', matchedTags }
}

function extractCompensation(text: string): string | null {
  const patterns = [
    /(?:\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:base|salary|commission|OTE|per year|annual|monthly|hour))?)/gi,
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
      tags: [...new Set([...job.tags, ...classification.matchedTags])],
      comp_structure: comp,
    })
  }

  return tagged
}
