import { NextResponse, type NextRequest } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/server'
import { generatePitch } from '@/lib/ai/pitch'
import type { JobPost, Profile } from '@/lib/types/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId } = body as { jobId?: string }

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
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

    const [jobResult, profileResult] = await Promise.all([
      supabase.from('job_posts').select('*').eq('id', jobId).single(),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    if (jobResult.error) {
      return NextResponse.json(
        { error: `Job not found: ${jobResult.error.message}` },
        { status: 404 },
      )
    }

    if (profileResult.error) {
      return NextResponse.json(
        { error: `Profile not found. Complete your profile first: ${profileResult.error.message}` },
        { status: 400 },
      )
    }

    const job = jobResult.data as JobPost
    const profile = profileResult.data as Profile

    if (!profile.resume_text?.trim()) {
      return NextResponse.json(
        { error: 'Profile resume text is empty. Add your resume in the profile page first.' },
        { status: 400 },
      )
    }

    const pitch = await generatePitch(job, profile)

    return NextResponse.json({ pitch })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
