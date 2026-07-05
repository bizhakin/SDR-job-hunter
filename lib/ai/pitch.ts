import { generateWithFallback } from './client'
import type { JobPost, Profile } from '@/lib/types/database'

export function buildPitchPrompt(job: JobPost, profile: Profile): { system: string; user: string } {
  const system = `You are a senior high-ticket sales closer helping a sales professional tailor their pitch for a specific job application. Your task is to generate two things:

1. A tailored resume blurb (2-3 sentences) that highlights the candidate's most relevant experience for THIS specific role.
2. A cold outreach message (email or DM, 3-4 paragraphs) that the candidate can send to the hiring manager or team lead.

Rules:
- Keep the resume blurb factual and based ONLY on the candidate's provided profile. Do not invent experience.
- The cold message should demonstrate understanding of the company's offering and the specific role.
- Tone: confident, professional, direct. Avoid buzzwords and fluff.
- Output format: Start with "---RESUME BLURB---" then the blurb, then "---OUTREACH MESSAGE---" then the message.
- The outreach message MUST be something a real human would send — specific, personal, and not generic.`

  const user = `## Candidate Profile
${[
  `Full Name: ${profile.full_name || 'Not provided'}`,
  `Headline: ${profile.headline || 'Not provided'}`,
  `Skills: ${profile.skills?.length ? profile.skills.join(', ') : 'Not provided'}`,
  `Comp Range: ${profile.comp_min ? `$${profile.comp_min.toLocaleString()}` : 'Not specified'} - ${profile.comp_max ? `$${profile.comp_max.toLocaleString()}` : 'Not specified'}`,
  `Remote Preference: ${profile.remote_pref ? 'Yes' : 'No'}`,
  `Target Roles: ${profile.role_pref?.length ? profile.role_pref.join(', ') : 'Not specified'}`,
  `Resume: ${profile.resume_text || 'Not provided'}`,
].join('\n')}

## Job Posting
${[
  `Company: ${job.company || 'Not provided'}`,
  `Title: ${job.title || 'Not provided'}`,
  `Role Type: ${job.role_type || 'Not specified'}`,
  `Compensation: ${job.comp_structure || 'Not specified'}`,
  `Remote: ${job.remote ? 'Yes' : 'No'}`,
  `Description: ${job.raw_text || 'Not provided'}`,
  `Tags: ${job.tags?.length ? job.tags.join(', ') : 'None'}`,
].join('\n')}`

  return { system, user }
}

export async function generatePitch(job: JobPost, profile: Profile): Promise<string> {
  const { system, user } = buildPitchPrompt(job, profile)

  try {
    return await generateWithFallback(system, user)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to generate pitch: ${message}`)
  }
}
