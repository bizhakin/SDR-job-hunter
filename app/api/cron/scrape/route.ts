import { NextResponse, type NextRequest } from 'next/server'
import { runAggregation } from '@/lib/sources/aggregator'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expected = process.env.CRON_SECRET

    if (expected && authHeader !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await runAggregation()

    console.log(
      `[Cron] Scrape complete: ${result.inserted} inserted, ${result.skipped} skipped, ${result.tagged_count} tagged from sources:`,
      result.source_counts,
    )

    if (result.errors.length > 0) {
      console.warn('[Cron] Errors:', result.errors)
    }

    const status = result.errors.length > 0 && result.inserted === 0 ? 500 : 200

    return NextResponse.json(result, { status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[Cron] Fatal error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
