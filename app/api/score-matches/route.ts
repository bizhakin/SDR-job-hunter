import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/server'
import { scoreMatchesForUser } from '@/lib/matching'

export async function POST() {
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

    const matchCount = await scoreMatchesForUser(user.id)

    return NextResponse.json({
      success: true,
      matches: matchCount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
