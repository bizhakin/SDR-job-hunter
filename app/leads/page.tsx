'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Nav } from '@/components/nav'

export default function LeadsPage() {
  const router = useRouter()
  const [rawText, setRawText] = useState('')
  const [source, setSource] = useState('instagram')
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const handleExtract = useCallback(async () => {
    if (!rawText.trim()) return

    setExtracting(true)
    setError(null)
    setResult(null)

    try {
      const supabase = getSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/extract-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawText.trim(),
          sourcePlatform: source,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Extraction failed')
      }

      setResult(data)
      setRawText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract lead')
    } finally {
      setExtracting(false)
    }
  }, [rawText, source, router])

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="glow w-[350px] h-[350px] top-0 right-0 bg-cyan-500/5 dark:bg-cyan-500/10" />
        <div className="glow w-[400px] h-[400px] -bottom-40 -left-20 bg-primary/5 dark:bg-primary/10" />
      </div>

      <Nav />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 relative">
        <p className="text-sm text-muted-foreground mb-8 animate-enter">
          Paste a social media post from Instagram, X, Discord, or anywhere else
          that mentions a job opening. The AI will extract the details and add it to the job board.
        </p>

        <Card className="animate-enter">
          <CardHeader>
            <CardTitle>Extract from post</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {result && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 animate-fade-in">
                <h3 className="font-semibold text-sm mb-2 text-emerald-700 dark:text-emerald-300">
                  Extracted
                </h3>
                <pre className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Source platform</Label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="instagram">Instagram</option>
                <option value="x">X (Twitter)</option>
                <option value="discord">Discord</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Post content</Label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the full post text here..."
                className="flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <Button
              onClick={handleExtract}
              disabled={!rawText.trim() || extracting}
            >
              {extracting ? 'Extracting...' : 'Extract Lead'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
