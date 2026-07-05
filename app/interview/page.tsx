'use client'

import { Suspense, useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { InterviewChat } from '@/components/interview-chat'

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
      <header className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-lg">Interview Practice</h1>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Dashboard
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
            >
              Sign out
            </button>
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
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mb-6 text-sm text-red-700 dark:text-red-300 max-w-md w-full">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-4 max-w-sm w-full">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Role type</label>
                  <select
                    value={roleType}
                    onChange={(e) => setRoleType(e.target.value)}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleStart}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Starting...' : 'Start Interview'}
                </button>
              </div>
            </div>
          ) : scoreResult ? (
            <div className="flex flex-col gap-6 py-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-1">Score: {scoreResult.score}/100</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
                  <div
                    key={label}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4"
                  >
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
                    <p className="text-lg font-semibold">{value}/25</p>
                    <div className="mt-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className="h-1.5 rounded-full bg-blue-600 transition-all"
                        style={{ width: `${(value / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
                <h3 className="font-semibold text-sm mb-2">Strengths</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">{scoreResult.strengths}</p>
              </div>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
                <h3 className="font-semibold text-sm mb-2">Areas to improve</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">{scoreResult.weaknesses}</p>
              </div>

              {scoreResult.objections_drilled.length > 0 && (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
                  <h3 className="font-semibold text-sm mb-2">Objections drilled</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {scoreResult.objections_drilled.map((obj) => (
                      <span
                        key={obj}
                        className="rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs px-2 py-0.5"
                      >
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleNewSession}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 text-sm transition-colors"
              >
                Practice again
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="border-b border-zinc-200 dark:border-zinc-700 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-zinc-400 uppercase tracking-wide font-medium">
                  Live Session — {roleType} interview
                </span>
              </div>
              <InterviewChat
                sessionId={sessionId}
                initialMessages={messages}
                onScore={handleScore}
                onError={handleError}
              />
            </div>
          )}
        </div>

        <aside className="hidden lg:flex flex-col w-72 shrink-0">
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
            Past sessions
          </h3>
          {pastSessions.length === 0 ? (
            <p className="text-sm text-zinc-400">No past sessions yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pastSessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3"
                >
                  <p className="text-sm font-medium">
                    {s.score !== null ? `${s.score}/100` : 'Not scored'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
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
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InterviewContent />
    </Suspense>
  )
}
