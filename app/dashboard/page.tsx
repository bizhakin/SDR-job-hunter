import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { DashboardClient } from './client'
import type { JobPost, Profile } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let jobs: unknown[] = []
  let profile: unknown = null
  let matches: Record<string, number> = {}
  let followUps: unknown[] = []
  let error: string | null = null

  try {
    const supabase = await getAuthenticatedSupabase()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      error = 'You must be signed in to view this page.'
    } else {
      const [jobsResult, profileResult, matchesResult, followUpsResult] =
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

      if (Object.keys(matches).length > 0) {
        jobs = (jobsResult.data ?? []).sort((a: JobPost, b: JobPost) => {
          const scoreA = matches[a.id] ?? 0
          const scoreB = matches[b.id] ?? 0
          return scoreB - scoreA
        })
      } else {
        jobs = jobsResult.data ?? []
      }

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
      error={error}
    />
  )
}
