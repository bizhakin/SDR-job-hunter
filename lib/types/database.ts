export interface Profile {
  id: string
  full_name: string | null
  headline: string | null
  resume_text: string | null
  skills: string[]
  comp_min: number | null
  comp_max: number | null
  remote_pref: boolean
  role_pref: string[]
  embedding: number[] | null
  created_at: string
  updated_at: string
}

export interface JobPost {
  id: string
  source: string
  source_url: string | null
  company: string | null
  title: string | null
  role_type: string | null
  comp_structure: string | null
  remote: boolean
  raw_text: string | null
  tags: string[]
  posted_at: string | null
  embedding: number[] | null
  created_at: string
}

export interface JobMatch {
  id: string
  user_id: string
  job_id: string
  match_score: number | null
  status: 'new' | 'saved' | 'dismissed'
  created_at: string
}

export interface Application {
  id: string
  user_id: string
  job_id: string
  pitch_text: string | null
  channel: string | null
  status: 'drafted' | 'applied' | 'replied' | 'interview' | 'offer' | 'rejected'
  applied_at: string | null
  next_follow_up_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LeadManual {
  id: string
  user_id: string
  source_platform: string | null
  raw_text: string
  parsed_job_id: string | null
  created_at: string
}

export interface InterviewSession {
  id: string
  user_id: string
  job_id: string | null
  transcript: unknown
  score: number | null
  objections_drilled: string[]
  created_at: string
}
