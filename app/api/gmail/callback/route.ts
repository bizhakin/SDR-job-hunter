import { NextResponse, type NextRequest } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/gmail/auth'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')

  if (!code) {
    return NextResponse.redirect(
      new URL('/profile?error=No authorization code received', origin),
    )
  }

  try {
    let userId: string
    try {
      const parsed = JSON.parse(stateParam || '{}') as { userId?: string }
      userId = parsed.userId || ''
    } catch {
      userId = ''
    }

    const tokens = await exchangeCodeForTokens(code)

    if (userId) {
      const supabase = await getServiceSupabase()

      const { error: upsertError } = await supabase.from('user_tokens').upsert(
        {
          user_id: userId,
          provider: 'gmail',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || '',
          expires_at: new Date(
            Date.now() + tokens.expires_in * 1000,
          ).toISOString(),
        },
        { onConflict: 'user_id,provider' },
      )

      if (upsertError) {
        console.error('Failed to store token:', upsertError.message)
      }
    }

    return NextResponse.redirect(new URL('/profile?gmail=connected', origin))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth failed'
    return NextResponse.redirect(
      new URL(`/profile?error=${encodeURIComponent(message)}`, origin),
    )
  }
}
