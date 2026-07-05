import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { DashboardClient } from './client'
import type { JobPost, Profile } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let jobs: unknown[] = []
  let profile: unknown = null
  let matches: Record<string, number> = {}
  let followUps: unknown[] = []
  let savedJobIds: string[] = []
  let error: string | null = null
  let totalCount = 0

  try {
    const supabase = await getAuthenticatedSupabase()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      error = 'You must be signed in to view this page.'
    } else {
      const [jobsResult, profileResult, matchesResult, savedResult, followUpsResult, countResult] =
        await Promise.all([
          supabase
            .from('job_posts')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single(),
          supabase
            .from('job_matches')
            .select('job_id, match_score')
            .eq('user_id', user.id),
          supabase
            .from('job_matches')
            .select('job_id')
            .eq('user_id', user.id)
            .eq('status', 'saved'),
          supabase
            .from('applications')
            .select('*')
            .eq('user_id', user.id)
            .not('next_follow_up_at', 'is', null)
            .lte(
              'next_follow_up_at',
              `${new Date().toISOString().split('T')[0]}T23:59:59.999Z`,
            )
            .neq('status', 'rejected')
            .neq('status', 'offer')
            .order('next_follow_up_at', { ascending: true }),
          supabase
            .from('job_posts')
            .select('*', { count: 'exact', head: true }),
        ])

      if (jobsResult.error) {
        throw new Error(jobsResult.error.message)
      }

      const matchRows = matchesResult.data as { job_id: string; match_score: number }[] | null
      if (matchRows) {
        for (const row of matchRows) {
          matches[row.job_id] = row.match_score
        }
      }

      const savedRows = savedResult.data as { job_id: string }[] | null
      if (savedRows) {
        savedJobIds = savedRows.map((r) => r.job_id)
      }

      if (Object.keys(matches).length > 0) {
        jobs = (jobsResult.data ?? []).sort((a: JobPost, b: JobPost) => {
          const scoreA = matches[a.id] ?? 0
          const scoreB = matches[b.id] ?? 0
          return scoreB - scoreA
        })
      } else {
        jobs = jobsResult.data ?? []
      }

      totalCount = countResult.count ?? jobs.length
      profile = profileResult.data ?? null
      followUps = followUpsResult.data ?? []
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load dashboard'
  }

  return (
    <DashboardClient
      jobs={jobs as JobPost[]}
      profile={profile as Profile | null}
      matches={matches}
      followUps={followUps as import('@/lib/types/database').Application[]}
      savedJobIds={savedJobIds}
      error={error}
      totalCount={totalCount}
    />
  )
}
