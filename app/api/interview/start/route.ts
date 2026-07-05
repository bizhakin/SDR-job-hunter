import { NextResponse, type NextRequest } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/server'
import { chatWithFallback } from '@/lib/ai/client'
import { buildInterviewSystemPrompt } from '@/lib/prompts/interview'
import type { Profile } from '@/lib/types/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, roleType } = body as { jobId?: string; roleType?: string }

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Complete your profile first before starting an interview practice.' },
        { status: 400 },
      )
    }

    const profileData = profile as Profile
    let company: string | undefined
    let jobTitle: string | undefined

    if (jobId) {
      const { data: job } = await supabase
        .from('job_posts')
        .select('company, title')
        .eq('id', jobId)
        .single()

      if (job) {
        company = job.company ?? undefined
        jobTitle = job.title ?? undefined
      }
    }

    const resolvedRoleType = roleType || profileData.role_pref?.[0] || 'closer'
    const experienceLevel = profileData.resume_text
      ? profileData.resume_text.length > 200
        ? 'experienced'
        : 'entry-to-mid'
      : 'entry-level'

    const systemPrompt = buildInterviewSystemPrompt({
      roleType: resolvedRoleType,
      company,
      jobTitle,
      experienceLevel,
    })

    const aiMessages = [
      { role: 'system' as const, content: systemPrompt },
      {
        role: 'user' as const,
        content: `I'm ready for the interview. Ask me your first question for the ${resolvedRoleType} role${company ? ` at ${company}` : ''}.`,
      },
    ]

    const firstResponse = await chatWithFallback(aiMessages)

    const transcript = [
      { role: 'hiring_manager', content: firstResponse },
    ]

    const { data: session, error: insertError } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: user.id,
        job_id: jobId || null,
        transcript: JSON.parse(JSON.stringify(transcript)),
        objections_drilled: [],
      })
      .select('id')
      .single()

    if (insertError || !session) {
      return NextResponse.json(
        { error: `Failed to create session: ${insertError?.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      sessionId: session.id,
      message: firstResponse,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
