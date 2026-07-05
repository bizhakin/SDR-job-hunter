function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}. Set it in .env.local`)
  }
  return value
}

export const openRouterConfig = {
  apiKey: getEnvVar('OPENROUTER_API_KEY'),
  baseUrl: 'https://openrouter.ai/api/v1',
  primaryModel: 'google/gemini-2.0-flash-001',
  fallbackModel: 'grok/grok-2-latest',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
}

export const embeddingConfig = {
  dimension: 768,
}
