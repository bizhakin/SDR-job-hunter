import { NextResponse, type NextRequest } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, table, recordId } = body as {
      text?: string
      table?: string
      recordId?: string
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 },
      )
    }

    if (!table || !recordId) {
      return NextResponse.json(
        { error: 'table and recordId are required' },
        { status: 400 },
      )
    }

    if (table !== 'profiles' && table !== 'job_posts') {
      return NextResponse.json(
        { error: 'table must be profiles or job_posts' },
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

    if (table === 'profiles' && recordId !== user.id) {
      return NextResponse.json(
        { error: 'You can only update your own profile embedding' },
        { status: 403 },
      )
    }

    const embedding = await generateEmbedding(text.trim().slice(0, 8000))

    const { error: updateError } = await supabase
      .from(table)
      .update({ embedding })
      .eq('id', recordId)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to store embedding: ${updateError.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      dimensions: embedding.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
