import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/gmail/auth'

export async function GET() {
  try {
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

    const state = JSON.stringify({ userId: user.id })
    const url = getAuthUrl(state)

    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
