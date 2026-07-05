import { NextResponse, type NextRequest } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/server'
import { generateWithFallback } from '@/lib/ai/client'
import { buildScorePrompt } from '@/lib/prompts/interview'

interface TranscriptEntry {
  role: 'hiring_manager' | 'candidate'
  content: string
}

interface ScoreResult {
  score: number
  breakdown: {
    objection_handling: number
    structure: number
    closing_ability: number
    composure: number
  }
  strengths: string
  weaknesses: string
  objections_drilled: string[]
}

function parseScoreJson(raw: string): ScoreResult | null {
  try {
    return JSON.parse(raw) as ScoreResult
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as ScoreResult
      } catch {
        return null
      }
    }
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body as { sessionId?: string }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
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

    if (transcript.length < 2) {
      return NextResponse.json(
        { error: 'Not enough conversation to score. Continue the interview first.' },
        { status: 400 },
      )
    }

    const { system, user: userPrompt } = buildScorePrompt(transcript)

    const scoreRaw = await generateWithFallback(system, userPrompt)

    const parsed = parseScoreJson(scoreRaw)

    if (!parsed) {
      return NextResponse.json(
        { error: 'Failed to parse score from AI response' },
        { status: 500 },
      )
    }

    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({
        score: parsed.score,
        objections_drilled: parsed.objections_drilled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to save score: ${updateError.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      score: parsed.score,
      breakdown: parsed.breakdown,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      objections_drilled: parsed.objections_drilled,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
