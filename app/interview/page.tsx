'use client'

import { Suspense, useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { InterviewChat } from '@/components/interview-chat'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ChatMessage {
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

const ROLE_OPTIONS = [
  { value: 'closer', label: 'Closer' },
  { value: 'setter', label: 'Setter' },
  { value: 'sdr', label: 'SDR' },
  { value: 'bdr', label: 'BDR' },
]

function InterviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')

  const [roleType, setRoleType] = useState('closer')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [pastSessions, setPastSessions] = useState<
    { id: string; score: number | null; created_at: string }[]
  >([])

  useEffect(() => {
    loadPastSessions()
  }, [])

  async function loadPastSessions() {
    try {
      const supabase = getSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('interview_sessions')
        .select('id, score, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) setPastSessions(data)
    } catch {
      // non-critical
    }
  }

  const handleStart = useCallback(async () => {
    setLoading(true)
    setError(null)
    setScoreResult(null)

    try {
      const supabase = getSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: jobId || undefined,
          roleType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start interview')
      }

      setSessionId(data.sessionId)
      setMessages([{ role: 'hiring_manager', content: data.message }])
      loadPastSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start')
    } finally {
      setLoading(false)
    }
  }, [jobId, roleType, router])

  const handleScore = useCallback((result: ScoreResult) => {
    setScoreResult(result)
    loadPastSessions()
  }, [])

  const handleError = useCallback((msg: string) => {
    setError(msg)
  }, [])

  const handleNewSession = useCallback(() => {
    setSessionId(null)
    setMessages([])
    setScoreResult(null)
    setError(null)
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch {
      // silent
    }
  }, [router])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-lg">Interview Practice</h1>
          <div className="flex items-center gap-3">
            <Button variant="link" size="sm" asChild>
              <a href="/dashboard">Dashboard</a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-destructive hover:text-destructive"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex gap-8">
        <div className="flex-1 flex flex-col">
          {!sessionId ? (
            <div className="flex flex-col items-center justify-center py-16">
              <h2 className="text-xl font-semibold mb-6">
                {jobId ? 'Practice for this role' : 'Start a practice interview'}
              </h2>

              {error && (
                <Card className="mb-6 border-destructive/50 w-full max-w-sm">
                  <CardContent className="p-4 text-sm text-destructive">
                    {error}
                  </CardContent>
                </Card>
              )}

              <Card className="w-full max-w-sm">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Role type</label>
                    <select
                      value={roleType}
                      onChange={(e) => setRoleType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button onClick={handleStart} disabled={loading}>
                    {loading ? 'Starting...' : 'Start Interview'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : scoreResult ? (
            <div className="flex flex-col gap-6 py-8 max-w-lg mx-auto">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-1">
                  Score: {scoreResult.score}/100
                </h2>
                <p className="text-sm text-muted-foreground">
                  {scoreResult.score >= 80
                    ? 'Excellent — ready for real interviews'
                    : scoreResult.score >= 60
                      ? 'Good — keep practicing the rough spots'
                      : 'Needs work — focus on the weak areas below'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ['Objection Handling', scoreResult.breakdown.objection_handling],
                    ['Structure', scoreResult.breakdown.structure],
                    ['Closing Ability', scoreResult.breakdown.closing_ability],
                    ['Composure', scoreResult.breakdown.composure],
                  ] as const
                ).map(([label, value]) => (
                  <Card key={label}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className="text-lg font-semibold">{value}/25</p>
                      <div className="mt-1 h-1.5 rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{ width: `${(value / 25) * 100}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Strengths</h3>
                  <p className="text-sm text-muted-foreground">{scoreResult.strengths}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Areas to improve</h3>
                  <p className="text-sm text-muted-foreground">{scoreResult.weaknesses}</p>
                </CardContent>
              </Card>

              {scoreResult.objections_drilled.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-2">Objections drilled</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {scoreResult.objections_drilled.map((obj) => (
                        <Badge key={obj} variant="secondary">
                          {obj}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button onClick={handleNewSession}>
                Practice again
              </Button>
            </div>
          ) : (
            <Card className="flex-1 flex flex-col">
              <div className="border-b px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Live Session — {roleType} interview
                </span>
              </div>
              <InterviewChat
                sessionId={sessionId}
                initialMessages={messages}
                onScore={handleScore}
                onError={handleError}
              />
            </Card>
          )}
        </div>

        <aside className="hidden lg:flex flex-col w-64 shrink-0">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Past sessions
          </h3>
          {pastSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No past sessions yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pastSessions.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">
                      {s.score !== null ? `${s.score}/100` : 'Not scored'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

export default function InterviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InterviewContent />
    </Suspense>
  )
}
