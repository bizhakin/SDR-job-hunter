import * as cheerio from 'cheerio'
import Parser from 'rss-parser'
import type { JobPostInput } from '../types.js'

interface WWRItem {
  title?: string
  link?: string
  'content:encoded'?: string
  content?: string
  creator?: string
  category?: string
  pubDate?: string
}

const RSS_URL = 'https://weworkremotely.com/remote-jobs.rss'

export async function fetchJobs(): Promise<JobPostInput[]> {
  const parser = new Parser<Record<string, unknown>, WWRItem>({
    customFields: {
      item: ['content:encoded', 'creator', 'category'],
    },
  })

  const feed = await parser.parseURL(RSS_URL)

  if (!feed.items || !Array.isArray(feed.items)) {
    return []
  }

  return feed.items.map((item): JobPostInput => {
    const rawHtml = item['content:encoded'] || item.content || ''
    const $ = cheerio.load(rawHtml)
    const rawText = $.text().replace(/\s+/g, ' ').trim()

    const title = item.title ?? ''
    const isRemote = true

    return {
      source: 'wwr',
      source_url: item.link ?? '',
      company: item.creator || extractCompanyFromTitle(title) || null,
      title: title || null,
      role_type: null,
      comp_structure: null,
      remote: isRemote,
      raw_text: rawText || title,
      tags: item.category ? [item.category] : [],
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
