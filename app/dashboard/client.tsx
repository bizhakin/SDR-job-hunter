'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { JobCard } from '@/components/job-card'
import { PitchModal } from '@/components/pitch-modal'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { JobPost, Profile, Application } from '@/lib/types/database'

interface DashboardClientProps {
  jobs: JobPost[]
  profile: Profile | null
  matches: Record<string, number>
  followUps: Application[]
  error: string | null
}

export function DashboardClient({
  jobs,
  profile,
  matches,
  followUps,
  error,
}: DashboardClientProps) {
  const router = useRouter()
  const [pitchJob, setPitchJob] = useState<JobPost | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [pitchError, setPitchError] = useState<string | null>(null)
  const [scoring, setScoring] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

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

  const handleRefreshJobs = useCallback(async () => {
    setRefreshing(true)
    setPitchError(null)
    try {
      const response = await fetch('/api/admin/scrape', {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Refresh failed')
      }
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh jobs'
      setPitchError(message)
    } finally {
      setRefreshing(false)
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
        ;(window as unknown as Record<string, string | null>).__pitchText = data.pitch
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

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
    setPitchJob(null)
    generatePitchRef.current = null
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-lg">Closer Job Hunter</h1>
          <div className="flex items-center gap-3">
            <Button variant="link" size="sm" asChild>
              <a href="/profile">Profile</a>
            </Button>
            <Button variant="link" size="sm" asChild>
              <a href="/applications">Applications</a>
            </Button>
            <Button variant="link" size="sm" asChild>
              <a href="/leads">Add a lead</a>
            </Button>
            <Button
              variant="link"
              size="sm"
              onClick={handleScoreMatches}
              disabled={scoring}
            >
              {scoring ? 'Scoring...' : 'Score matches'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshJobs}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh jobs'}
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

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {error && (
          <Card className="mb-6 border-destructive/50">
            <CardContent className="p-4 text-sm text-destructive">
              {error}
              {error.includes('Missing environment variable') && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Set up your{' '}
                  <code className="bg-muted rounded px-1">
                    .env.local
                  </code>{' '}
                  file with Supabase credentials.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {!profile && !error && (
          <Card className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-900/10">
            <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-300">
              Complete your{' '}
              <a
                href="/profile"
                className="underline font-medium"
              >
                profile
              </a>{' '}
              to get better AI-generated pitches.
            </CardContent>
          </Card>
        )}

        {Object.keys(matches).length > 0 && (
          <Card className="mb-6 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/10">
            <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-300">
              Jobs ranked by match score. Click "Score matches" to re-score.
            </CardContent>
          </Card>
        )}

        {followUps.length > 0 && (
          <Card className="mb-6 border-orange-500/50 bg-orange-50 dark:bg-orange-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-orange-700 dark:text-orange-300">
                Follow-ups due
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {followUps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300 truncate">
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
                  <Button variant="link" size="sm" asChild>
                    <a href="/applications">View</a>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {pitchError && (
          <Card className="mb-6 border-destructive/50">
            <CardContent className="p-4 text-sm text-destructive">
              {pitchError}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Job Board</h2>
          {jobs.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {jobs.length} jobs
            </p>
          )}
        </div>

        {jobs.length === 0 && !error ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No jobs found</p>
            <p className="text-sm mt-1 mb-4">
              Click "Refresh jobs" to pull the latest listings.
            </p>
            <Button onClick={handleRefreshJobs} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : 'Refresh jobs'}
            </Button>
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
