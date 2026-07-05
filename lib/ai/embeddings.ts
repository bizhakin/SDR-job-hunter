const EMBEDDING_MODEL = 'text-embedding-004'

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[]
  }
}

async function callGemini(apiKey: string, text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Gemini API error (${response.status}): ${body}`)
  }

  const data: GeminiEmbeddingResponse = await response.json()

  if (!data.embedding?.values) {
    throw new Error('Gemini returned empty embedding')
  }

  return data.embedding.values
}

function getApiKeys(): string[] {
  const keys: string[] = []
  const primary = process.env.GEMINI_API_KEY
  if (primary) keys.push(primary)
  const fallback = process.env.GEMINI_API_KEY_FALLBACK
  if (fallback) keys.push(fallback)
  if (keys.length === 0) {
    throw new Error(
      'Missing GEMINI_API_KEY. Set it in .env.local',
    )
  }
  return keys
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text.trim()) {
    throw new Error('Cannot embed empty text')
  }

  const keys = getApiKeys()
  let lastError: Error | null = null

  for (const key of keys) {
    try {
      return await callGemini(key, text)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn('Gemini embedding failed:', lastError.message)
    }
  }

  throw new Error(
    `All Gemini API keys failed. Last error: ${lastError?.message}`,
  )
}
