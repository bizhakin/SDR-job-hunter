import { NextResponse, type NextRequest } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/server'

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

    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ applications: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const { job_id, pitch_text, channel, status, notes } = body as {
      job_id?: string
      pitch_text?: string
      channel?: string
      status?: string
      notes?: string
    }

    if (!job_id) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 },
      )
    }

    if (!pitch_text) {
      return NextResponse.json(
        { error: 'pitch_text is required' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        job_id,
        pitch_text,
        channel: channel || null,
        status: status || 'drafted',
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ application: data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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
    const { id, status, notes, channel, next_follow_up_at } = body as {
      id?: string
      status?: string
      notes?: string
      channel?: string
      next_follow_up_at?: string
    }

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 },
      )
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status) updates.status = status
    if (notes !== undefined) updates.notes = notes
    if (channel) updates.channel = channel
    if (next_follow_up_at) updates.next_follow_up_at = next_follow_up_at

    const { data, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ application: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 },
      )
    }

    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
