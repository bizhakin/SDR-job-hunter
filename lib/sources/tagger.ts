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

const employmentKeywords = [
  '1099',
  'independent contractor',
  'contract position',
  'contract role',
  'freelance',
  'freelancer',
  'w-9',
  'w9',
  'commission only',
  '100% commission',
  'uncapped commission',
  'contract-to-hire',
  'project based',
  'self employed',
  'self-employed',
  'contractor',
]

function detectEmploymentType(
  title: string | null,
  rawText: string,
  source: string,
): string[] {
  if (source === 'upwork') return ['employment:1099']

  const searchText = [title ?? '', rawText].join(' ').toLowerCase()
  const types: string[] = []

  for (const kw of employmentKeywords) {
    if (searchText.includes(kw.toLowerCase())) {
      types.push('employment:1099')
      break
    }
  }

  return types
}

const industryTaxonomy: Record<string, string[]> = {
  'coaching': [
    'coaching', 'coach', 'life coach', 'business coach', 'sales coach',
    'coaching program', 'coaching business', 'high-ticket coaching',
    'high ticket coach', 'mentor', 'mentorship', 'dfy', 'dwy',
    'done for you', 'done with you', 'high ticket program',
  ],
  'consulting': [
    'consulting', 'consultant', 'management consulting', 'strategy consultant',
    'sales consultant', 'business consulting',
  ],
  'b2b': [
    'b2b', 'business to business', 'b2b sales', 'b2b saas',
  ],
  'bizop': [
    'bizop', 'business opportunity', 'business ownership', 'partner program',
    'biz opp', 'opportunity', 'own your own business', 'side hustle',
    'passive income', 'work from home opportunity', 'make money from home',
    'home based business',
  ],
  'amazon': [
    'amazon', 'fba', 'amazon fba', 'amazon seller', 'ecommerce amazon',
    'amazon ppc', 'amazon wholesale', 'private label amazon',
  ],
  'trading': [
    'trading', 'trader', 'trading coach', 'forex', 'crypto',
    'stock trading', 'day trading', 'options trading', 'investing',
    'trading mentor',
  ],
  'real-estate': [
    'real estate', 'realtor', 'property', 'mortgage', 'real estate agent',
    'real estate investor', 'property management', 'wholesaling',
    'real estate wholesaling',
  ],
  'fintech': [
    'fintech', 'financial services', 'finance', 'financial', 'banking',
    'investment', 'wealth management',
  ],
  'health': [
    'health', 'medical', 'wellness', 'healthcare', 'health coach',
    'medicare', 'health insurance', 'fitness', 'nutrition',
  ],
  'saas': [
    'saas', 'software as a service', 'b2b saas', 'saas sales',
  ],
  'home-services': [
    'home services', 'home improvement', 'construction', 'remodeling',
    'hvac', 'roofing', 'solar', 'pest control', 'cleaning service',
  ],
  'agency': [
    'agency', 'marketing agency', 'digital agency', 'media agency',
    'ad agency', 'creative agency', 'recruiting agency',
  ],
  'education': [
    'education', 'edtech', 'training', 'online education', 'course',
    'learning', 'e-learning', 'online course', 'digital course',
  ],
  'ecommerce': [
    'ecommerce', 'e-commerce', 'shopify', 'dropshipping', 'online store',
    'print on demand',
  ],
  'marketing': [
    'marketing', 'digital marketing', 'marketing agency', 'media buying',
    'facebook ads', 'google ads', 'ppc', 'affiliate marketing',
    'social media marketing', 'email marketing',
  ],
  'legal': [
    'legal', 'law firm', 'attorney', 'lawyer', 'legal services',
    'paralegal',
  ],
  'insurance': [
    'insurance', 'life insurance', 'health insurance', 'medicare',
    'auto insurance', 'insurance agent',
  ],
  'logistics': [
    'logistics', 'supply chain', 'freight', 'shipping', 'transportation',
    'trucking', 'dispatch',
  ],
  'hospitality': [
    'hospitality', 'hotel', 'travel', 'tourism', 'restaurant',
  ],
  'tech': [
    'software', 'technology', 'tech', 'startup', 'engineering',
    'developer', 'devops', 'it',
  ],
  'recruiting': [
    'recruiting', 'recruitment', 'staffing', 'talent acquisition',
    'headhunter', 'hr', 'hiring manager',
  ],
}

export function classifyIndustries(
  title: string | null,
  rawText: string,
): string[] {
  const searchText = [title ?? '', rawText].join(' ').toLowerCase()
  const found: string[] = []

  for (const [industry, keywords] of Object.entries(industryTaxonomy)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        found.push(industry)
        break
      }
    }
  }

  return found
}

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
    const industries = classifyIndustries(job.title, job.raw_text)
    const employmentTypes = detectEmploymentType(job.title, job.raw_text, job.source)

    const hasRole = !!classification.role_type
    const hasIndustry = industries.length > 0
    const hasEmployment = employmentTypes.length > 0

    if (!hasRole && !hasIndustry && !hasEmployment) continue

    const comp =
      job.comp_structure ?? extractCompensation(job.raw_text) ?? null

    const industryTags = industries.map((ind) => `industry:${ind}`)

    tagged.push({
      ...job,
      role_type: classification.role_type,
      tags: [...new Set([...job.tags, ...classification.matchedTags, ...industryTags, ...employmentTypes])],
      comp_structure: comp,
    })
  }

  return tagged
}
