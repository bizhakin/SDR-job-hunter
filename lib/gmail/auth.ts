function getClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID
  if (!id) throw new Error('Missing GOOGLE_CLIENT_ID in .env.local')
  return id
}

function getClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET
  if (!secret) throw new Error('Missing GOOGLE_CLIENT_SECRET in .env.local')
  return secret
}

function getRedirectUri(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
    'http://localhost:3000/api/gmail/callback'
  )
}

const SCOPES = ['https://www.googleapis.com/auth/gmail.send']

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string | null
  expires_in: number
}> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Token exchange failed (${response.status}): ${body}`)
  }

  const data = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    expires_in: data.expires_in,
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Token refresh failed (${response.status}): ${body}`)
  }

  const data = (await response.json()) as {
    access_token: string
    expires_in: number
  }

  return data
}
