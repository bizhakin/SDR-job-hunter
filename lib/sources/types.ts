export interface JobPostInput {
  source: string
  source_url: string
  company: string | null
  title: string | null
  role_type: string | null
  comp_structure: string | null
  remote: boolean
  raw_text: string
  tags: string[]
  posted_at: string | null
}

export type SourceFetcher = () => Promise<JobPostInput[]>
