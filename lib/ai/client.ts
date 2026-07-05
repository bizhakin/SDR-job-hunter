import { openRouterConfig } from './config'

interface OpenRouterChoice {
  message: {
    content: string
  }
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[]
  error?: {
    message: string
  }
}

async function callModel(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(`${openRouterConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openRouterConfig.apiKey}`,
      'HTTP-Referer': openRouterConfig.siteUrl,
      'X-Title': 'Closer Job Hunter',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    let errorBody = ''
    try {
      errorBody = await response.text()
    } catch {
      errorBody = 'Unable to read error body'
    }
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`)
  }

  const data: OpenRouterResponse = await response.json()

  if (data.error) {
    throw new Error(`OpenRouter model error: ${data.error.message}`)
  }

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('OpenRouter returned empty response')
  }

  return data.choices[0].message.content
}

export async function generateWithFallback(systemPrompt: string, userPrompt: string): Promise<string> {
  let lastError: Error | null = null

  const models = [openRouterConfig.primaryModel, openRouterConfig.fallbackModel]

  for (const model of models) {
    try {
      return await callModel(model, systemPrompt, userPrompt)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`Model ${model} failed:`, lastError.message)
    }
  }

  throw new Error(`All AI models failed. Last error: ${lastError?.message}`)
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callModelChat(model: string, messages: ChatMessage[]): Promise<string> {
  const response = await fetch(`${openRouterConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openRouterConfig.apiKey}`,
      'HTTP-Referer': openRouterConfig.siteUrl,
      'X-Title': 'Closer Job Hunter',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    let errorBody = ''
    try {
      errorBody = await response.text()
    } catch {
      errorBody = 'Unable to read error body'
    }
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`)
  }

  const data: OpenRouterResponse = await response.json()

  if (data.error) {
    throw new Error(`OpenRouter model error: ${data.error.message}`)
  }

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('OpenRouter returned empty response')
  }

  return data.choices[0].message.content
}

export async function chatWithFallback(messages: ChatMessage[]): Promise<string> {
  let lastError: Error | null = null

  const models = [openRouterConfig.primaryModel, openRouterConfig.fallbackModel]

  for (const model of models) {
    try {
      return await callModelChat(model, messages)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`Model ${model} failed:`, lastError.message)
    }
  }

  throw new Error(`All AI models failed. Last error: ${lastError?.message}`)
}
