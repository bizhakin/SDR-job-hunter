import { NextResponse, type NextRequest } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/server'
import { generateWithFallback } from '@/lib/ai/client'
import {
  buildExtractLeadPrompt,
  parseExtractedJson,
} from '@/lib/prompts/extract-lead'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, sourcePlatform } = body as {
      text?: string
      sourcePlatform?: string
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'text is required' },
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

    const { system, user: userPrompt } = buildExtractLeadPrompt(text)
    const aiResponse = await generateWithFallback(system, userPrompt)

    const parsed = parseExtractedJson(aiResponse)

    if (!parsed) {
      return NextResponse.json(
        { error: 'Failed to parse AI response as structured data' },
        { status: 500 },
      )
    }

    const jobPost = {
      source: 'manual',
      company: (parsed.company as string) || null,
      title: (parsed.title as string) || null,
      role_type: (parsed.role_type as string) || null,
      comp_structure: (parsed.comp_structure as string) || null,
      remote: parsed.remote === true,
      raw_text: text,
      tags: (parsed.role_type ? [parsed.role_type as string] : []) as string[],
    }

    return NextResponse.json({
      extracted: parsed,
      draft: jobPost,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { leadManualRawText, sourcePlatform, jobPost } = body as {
      leadManualRawText?: string
      sourcePlatform?: string
      jobPost?: Record<string, unknown>
    }

    if (!jobPost || !leadManualRawText) {
      return NextResponse.json(
        { error: 'jobPost and leadManualRawText are required' },
        { status: 400 },
      )
    }

    const { data: insertedJob, error: jobError } = await supabase
      .from('job_posts')
      .insert(jobPost)
      .select()
      .single()

    if (jobError) {
      return NextResponse.json(
        { error: `Failed to save job: ${jobError.message}` },
        { status: 500 },
      )
    }

    const { error: leadError } = await supabase.from('leads_manual').insert({
      user_id: user.id,
      source_platform: sourcePlatform || null,
      raw_text: leadManualRawText,
      parsed_job_id: insertedJob.id,
    })

    if (leadError) {
      return NextResponse.json(
        { error: `Failed to save lead: ${leadError.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, job: insertedJob })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
