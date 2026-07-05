export function stripHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeText(text: string | null): string {
  if (!text) return ''
  return stripHtml(text)
}

export interface RSSItem {
  title: string
  link: string
  content: string
  pubDate: string
  creator: string
  categories: string[]
}

export async function parseRSS(url: string): Promise<RSSItem[]> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'CloserJobHunter/1.0' },
  })

  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status}`)
  }

  const xml = await response.text()
  const items: RSSItem[] = []

  const itemRegex = /<item>[\s\S]*?<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[0]

    const extract = (tag: string): string => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
      const m = block.match(regex)
      return m ? m[1].trim() : ''
    }

    const cdataExtract = (tag: string): string => {
      const regex = new RegExp(
        `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`,
        'i',
      )
      const m = block.match(regex)
      if (m) return m[1].trim()
      return extract(tag)
    }

    const title = stripHtml(extract('title'))
    const link = extract('link')
    const content = cdataExtract('content:encoded') || extract('description')
    const pubDate = extract('pubDate')
    const creator = stripHtml(extract('dc:creator') || extract('creator'))

    const categories: string[] = []
    const catRegex = /<category[^>]*>([\s\S]*?)<\/category>/gi
    let catMatch: RegExpExecArray | null
    while ((catMatch = catRegex.exec(block)) !== null) {
      categories.push(stripHtml(catMatch[1]))
    }

    items.push({ title, link, content, pubDate, creator, categories })
  }

  return items
}
