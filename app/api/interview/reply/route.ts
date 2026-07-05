import { NextResponse, type NextRequest } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/server'
import { chatWithFallback } from '@/lib/ai/client'
import { buildInterviewSystemPrompt } from '@/lib/prompts/interview'

interface TranscriptEntry {
  role: 'hiring_manager' | 'candidate'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message } = body as { sessionId?: string; message?: string }

    if (!sessionId || !message?.trim()) {
      return NextResponse.json(
        { error: 'sessionId and message are required' },
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

    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      )
    }

    const transcript = (session.transcript as TranscriptEntry[]) || []
    const updatedTranscript = [
      ...transcript,
      { role: 'candidate' as const, content: message.trim() },
    ]

    const { data: profile } = await supabase
      .from('profiles')
      .select('role_pref, resume_text')
      .eq('id', user.id)
      .single()

    const roleType = (profile?.role_pref as string[])?.[0] || 'closer'
    const experienceLevel = profile?.resume_text
      ? profile.resume_text.length > 200
        ? 'experienced'
        : 'entry-to-mid'
      : 'entry-level'

    const systemPrompt = buildInterviewSystemPrompt({
      roleType,
      experienceLevel,
    })

    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...updatedTranscript.map((t) => ({
        role: (t.role === 'candidate' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: t.content,
      })),
    ]

    const aiResponse = await chatWithFallback(chatMessages)

    const finalTranscript = [
      ...updatedTranscript,
      { role: 'hiring_manager' as const, content: aiResponse },
    ]

    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({
        transcript: JSON.parse(JSON.stringify(finalTranscript)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update session: ${updateError.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      message: aiResponse,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
