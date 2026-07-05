'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { JobCard } from '@/components/job-card'
import { PitchModal } from '@/components/pitch-modal'
import type { JobPost, Profile, Application } from '@/lib/types/database'

interface DashboardClientProps {
  jobs: JobPost[]
  profile: Profile | null
  matches: Record<string, number>
  error: string | null
}

export function DashboardClient({ jobs, profile, matches, error }: DashboardClientProps) {
  const router = useRouter()
  const [pitchJob, setPitchJob] = useState<JobPost | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [pitchError, setPitchError] = useState<string | null>(null)
  const [scoring, setScoring] = useState(false)
  const [followUps, setFollowUps] = useState<Application[]>([])

  const handleScoreMatches = useCallback(async () => {
    setScoring(true)
    setPitchError(null)
    try {
      const response = await fetch('/api/score-matches', {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Scoring failed')
      }
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scoring failed'
      setPitchError(message)
    } finally {
      setScoring(false)
    }
  }, [router])

  const handleSignOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      router.push('/login')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed'
      setPitchError(message)
    }
  }, [router])

  const generatePitchRef = useRef<string | null>(null)

  const handleGeneratePitch = useCallback(
    async (job: JobPost) => {
      setPitchJob(job)
      setModalOpen(true)
      setPitchError(null)

      try {
        const supabase = getSupabaseClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          throw new Error('You must be signed in to generate a pitch')
        }

        const response = await fetch('/api/pitch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: job.id }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate pitch')
        }

        generatePitchRef.current = data.pitch
        setPitchError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Pitch generation failed'
        setPitchError(message)
        setModalOpen(false)
      }
    },
    [],
  )

  const handleSavePitch = useCallback(
    async (pitchText: string) => {
      if (!pitchJob) return

      const supabase = getSupabaseClient()
      const { error: saveError } = await supabase.from('applications').insert({
        job_id: pitchJob.id,
        pitch_text: pitchText,
        status: 'drafted',
      })

      if (saveError) {
        throw new Error(saveError.message)
      }

      router.refresh()
    },
    [pitchJob, router],
  )

  useEffect(() => {
    async function loadFollowUps() {
      try {
        const supabase = getSupabaseClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', user.id)
          .not('next_follow_up_at', 'is', null)
          .lte('next_follow_up_at', `${today}T23:59:59.999Z`)
          .neq('status', 'rejected')
          .neq('status', 'offer')
          .order('next_follow_up_at', { ascending: true })

        if (data) setFollowUps(data as Application[])
      } catch {
        // silent — non-critical section
      }
    }

    loadFollowUps()
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
    setPitchJob(null)
    generatePitchRef.current = null
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-lg">Closer Job Hunter</h1>
          <div className="flex items-center gap-3">
            <a
              href="/profile"
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Profile
            </a>
            <a
              href="/applications"
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Applications
            </a>
            <a
              href="/leads"
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Add a lead
            </a>
            <button
              type="button"
              onClick={handleScoreMatches}
              disabled={scoring}
              className="text-sm text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              {scoring ? 'Scoring...' : 'Score matches'}
            </button>
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

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {followUps.length > 0 && (
          <div className="mb-6 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
            <div className="p-4 border-b border-orange-200 dark:border-orange-800">
              <h3 className="font-semibold text-sm text-orange-700 dark:text-orange-300">
                Follow-ups due
              </h3>
            </div>
            <div className="divide-y divide-orange-200 dark:divide-orange-800">
              {followUps.map((app) => (
                <div
                  key={app.id}
                  className="p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      {app.pitch_text
                        ? app.pitch_text.slice(0, 60) + '...'
                        : 'Application'}
                    </p>
                    <p className="text-xs text-orange-500 dark:text-orange-400">
                      Follow up by:{' '}
                      {app.next_follow_up_at
                        ? new Date(
                            app.next_follow_up_at,
                          ).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <a
                    href="/applications"
                    className="text-xs font-medium text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xl font-semibold mb-6">Job Board</h2>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-6 text-sm text-red-700 dark:text-red-300">
            {error}
            {error.includes('Missing environment variable') && (
              <p className="mt-2 text-xs">
                Set up your{' '}
                <code className="bg-red-100 dark:bg-red-800 rounded px-1">
                  .env.local
                </code>{' '}
                file with Supabase credentials.
              </p>
            )}
          </div>
        )}

        {!profile && !error && (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 mb-6 text-sm text-yellow-700 dark:text-yellow-300">
            Complete your{' '}
            <a
              href="/profile"
              className="underline font-medium hover:text-yellow-800 dark:hover:text-yellow-200"
            >
              profile
            </a>{' '}
            to get better AI-generated pitches.
          </div>
        )}

        {Object.keys(matches).length > 0 && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 mb-6 text-sm text-green-700 dark:text-green-300">
            Jobs ranked by match score. Click "Score matches" to re-score.
          </div>
        )}

        {pitchError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-6 text-sm text-red-700 dark:text-red-300">
            {pitchError}
          </div>
        )}

        {jobs.length === 0 && !error ? (
          <div className="text-center py-16 text-zinc-500 dark:text-zinc-400">
            <p className="text-lg font-medium">No jobs found</p>
            <p className="text-sm mt-1">
              Jobs will appear here once the aggregation worker starts pulling listings.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                matchScore={matches[job.id]}
                onGeneratePitch={handleGeneratePitch}
              />
            ))}
          </div>
        )}

        <PitchModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          jobTitle={pitchJob?.title || ''}
          company={pitchJob?.company || ''}
          onSave={handleSavePitch}
        />
      </main>
    </div>
  )
}
