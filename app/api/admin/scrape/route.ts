import { NextResponse } from 'next/server'
import { runAggregation } from '@/lib/sources/aggregator'

export async function POST() {
  try {
    const result = await runAggregation()

    const status = result.errors.length > 0 && result.inserted === 0 ? 500 : 200

    return NextResponse.json(result, { status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
