import { createClient } from '@supabase/supabase-js'
import { envConfig } from './config.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = ReturnType<typeof createClient<any, any>>

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (client) return client
  client = createClient(envConfig.supabaseUrl, envConfig.serviceRoleKey, {
    auth: { persistSession: false },
  })
  return client
}

interface EmbeddingJob {
  id: string
  source_url: string | null
  title: string | null
  raw_text: string | null
  company: string | null
}

async function callGeminiEmbedding(text: string): Promise<number[]> {
  const keys: string[] = []
  const primary = process.env.GEMINI_API_KEY
  if (primary) keys.push(primary)
  const fallback = process.env.GEMINI_API_KEY_FALLBACK
  if (fallback) keys.push(fallback)

  if (keys.length === 0) {
    throw new Error('Missing GEMINI_API_KEY')
  }

  let lastError: Error | null = null

  for (const key of keys) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${key}`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        }),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new Error(`Gemini API error (${response.status}): ${body}`)
      }

      const data = await response.json() as {
        embedding: { values: number[] }
      }

      if (!data.embedding?.values) {
        throw new Error('Empty embedding returned')
      }

      return data.embedding.values
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`  Embedding key failed: ${lastError.message}`)
    }
  }

  throw new Error(`All embedding keys failed: ${lastError?.message}`)
}

export async function embedNewJobs(): Promise<void> {
  const supabase = getClient()

  const { data: unembedded, error: fetchError } = await supabase
    .from('job_posts')
    .select('id, source_url, title, raw_text, company')
    .is('embedding', null)
    .limit(50)

  if (fetchError) {
    throw new Error(`Failed to fetch unembedded jobs: ${fetchError.message}`)
  }

  if (!unembedded || (unembedded as EmbeddingJob[]).length === 0) {
    console.log('  No unembedded jobs found.')
    return
  }

  const jobs = unembedded as EmbeddingJob[]
  console.log(`  Embedding ${jobs.length} jobs...`)

  let successCount = 0
  let failCount = 0

  for (const job of jobs) {
    const textToEmbed = [
      job.title,
      job.company,
      job.raw_text,
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
      .slice(0, 8000)

    if (!textToEmbed) {
      failCount++
      continue
    }

    try {
      const embedding = await callGeminiEmbedding(textToEmbed)

      const { error: updateError } = await supabase
        .from('job_posts')
        .update({ embedding })
        .eq('id', job.id)

      if (updateError) {
        console.error(`  Failed to update job ${job.id}: ${updateError.message}`)
        failCount++
      } else {
        successCount++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  Failed to embed job ${job.id}: ${msg}`)
      failCount++
    }

    await new Promise((r) => setTimeout(r, 200))
  }

  console.log(`  Embedded: ${successCount}, Failed: ${failCount}`)
}
