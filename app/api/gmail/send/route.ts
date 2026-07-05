import { NextResponse, type NextRequest } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/server'
import { refreshAccessToken } from '@/lib/gmail/auth'
import { sendEmail } from '@/lib/gmail/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, pitchText } = body as {
      to?: string
      subject?: string
      pitchText?: string
    }

    if (!to || !subject || !pitchText) {
      return NextResponse.json(
        { error: 'to, subject, and pitchText are required' },
        { status: 400 },
      )
    }

    const supabase = await getServiceSupabase()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const { data: token, error: tokenError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .single()

    if (tokenError || !token) {
      return NextResponse.json(
        { error: 'Gmail not connected. Connect your Gmail in the Profile page first.' },
        { status: 400 },
      )
    }

    let accessToken = token.access_token

    if (
      token.expires_at &&
      new Date(token.expires_at).getTime() < Date.now() + 60000
    ) {
      try {
        const refreshed = await refreshAccessToken(token.refresh_token)
        accessToken = refreshed.access_token

        await supabase
          .from('user_tokens')
          .update({
            access_token: refreshed.access_token,
            expires_at: new Date(
              Date.now() + refreshed.expires_in * 1000,
            ).toISOString(),
          })
          .eq('id', token.id)
      } catch (refreshErr) {
        const msg = refreshErr instanceof Error ? refreshErr.message : 'Token refresh failed'
        return NextResponse.json({ error: msg }, { status: 401 })
      }
    }

    await sendEmail(accessToken, to, subject, pitchText)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
