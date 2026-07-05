export function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('Missing environment variable: OPENROUTER_API_KEY. Set it in Vercel env vars.')
  }

  return {
    apiKey,
    baseUrl: 'https://openrouter.ai/api/v1',
    primaryModel: 'google/gemini-2.0-flash-001',
    fallbackModel: 'grok/grok-2-latest',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  }
}

export function getEmbeddingConfig() {
  return { dimension: 768 }
}
