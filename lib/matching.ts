import { getServiceSupabase } from '@/lib/supabase/server'

export async function scoreMatchesForUser(userId: string): Promise<number> {
  const supabase = await getServiceSupabase()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('embedding')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    throw new Error(`Profile not found: ${profileError?.message}`)
  }

  if (!profile.embedding) {
    throw new Error(
      'Profile has no embedding. Save your profile with resume text first.',
    )
  }

  const { data: unmatchJobs, error: jobsError } = await supabase
    .from('job_posts')
    .select('id, embedding')
    .not('embedding', 'is', null)

  if (jobsError) {
    throw new Error(`Failed to fetch jobs: ${jobsError.message}`)
  }

  if (!unmatchJobs || unmatchJobs.length === 0) {
    return 0
  }

  const userEmbedding = profile.embedding as number[]

  const matches: { user_id: string; job_id: string; match_score: number }[] = []

  for (const job of unmatchJobs) {
    const jobEmbedding = job.embedding as number[]
    if (!jobEmbedding) continue

    const score = cosineSimilarity(userEmbedding, jobEmbedding)
    if (score > 0) {
      matches.push({
        user_id: userId,
        job_id: job.id,
        match_score: score,
      })
    }
  }

  if (matches.length === 0) return 0

  const { error: upsertError } = await supabase
    .from('job_matches')
    .upsert(matches, {
      onConflict: 'user_id,job_id',
      ignoreDuplicates: false,
    })

  if (upsertError) {
    throw new Error(`Failed to save matches: ${upsertError.message}`)
  }

  return matches.length
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  if (magnitude === 0) return 0

  return dotProduct / magnitude
}
