'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { JobCard } from '@/components/job-card'
import { PitchModal } from '@/components/pitch-modal'
import { Nav } from '@/components/nav'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { JobPost, Profile, Application } from '@/lib/types/database'

interface DashboardClientProps {
  jobs: JobPost[]
  profile: Profile | null
  matches: Record<string, number>
  followUps: Application[]
  savedJobIds: string[]
  error: string | null
  totalCount: number
}

type SortKey = 'date' | 'match' | 'company'
type RoleFilter = 'all' | 'closer' | 'setter' | 'sdr' | 'bdr'
type DateFilter = 'any' | 'today' | '3days' | 'week' | '2weeks' | 'month'
type CompFilter = 'any' | 'under50' | '50to80' | '80to120' | '120to150' | 'over150'

const ROLE_OPTIONS: { label: string; value: RoleFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Closer', value: 'closer' },
  { label: 'Setter', value: 'setter' },
  { label: 'SDR', value: 'sdr' },
  { label: 'BDR', value: 'bdr' },
]

const INDUSTRY_OPTIONS = [
  'coaching', 'consulting', 'b2b', 'bizop', 'amazon',
  'real-estate', 'fintech', 'health', 'saas', 'home-services',
  'agency', 'education', 'ecommerce', 'marketing', 'insurance',
  'recruiting', 'tech',
] as const

const DATE_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: 'Any time', value: 'any' },
  { label: 'Today', value: 'today' },
  { label: '3 days', value: '3days' },
  { label: 'Week', value: 'week' },
  { label: '2 weeks', value: '2weeks' },
  { label: 'Month', value: 'month' },
]

const COMP_OPTIONS: { label: string; value: CompFilter }[] = [
  { label: 'Any', value: 'any' },
  { label: 'Under $50k', value: 'under50' },
  { label: '$50k-$80k', value: '50to80' },
  { label: '$80k-$120k', value: '80to120' },
  { label: '$120k-$150k', value: '120to150' },
  { label: '$150k+', value: 'over150' },
]

function parseCompValue(val: string): number {
  return parseInt(val.replace(/[kK]/g, '000').replace(/,/g, ''), 10) || 0
}

function extractCompMinMax(comp: string | null): { min: number | null; max: number | null } {
  if (!comp) return { min: null, max: null }
  const range = comp.match(/\$(\d[\d,]*[kK]?)\s*-\s*\$(\d[\d,]*[kK]?)/)
  if (range) {
    const min = parseCompValue(range[1])
    const max = parseCompValue(range[2])
    return { min: isNaN(min) ? null : min, max: isNaN(max) ? null : max }
  }
  const single = comp.match(/\$(\d[\d,]*[kK]?)/)
  if (single) {
    const val = parseCompValue(single[1])
    return { min: isNaN(val) ? null : val, max: isNaN(val) ? null : val }
  }
  if (/commission only|100%\s*commission|uncapped/i.test(comp)) {
    return { min: 100000, max: 300000 }
  }
  return { min: null, max: null }
}

function dateFilterFn(postedAt: string | null, range: DateFilter): boolean {
  if (range === 'any' || !postedAt) return true
  const now = Date.now()
  const date = new Date(postedAt).getTime()
  if (isNaN(date)) return true
  const diffMs = now - date
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  switch (range) {
    case 'today': return diffDays < 1
    case '3days': return diffDays < 3
    case 'week': return diffDays < 7
    case '2weeks': return diffDays < 14
    case 'month': return diffDays < 30
    default: return true
  }
}

function compFilterFn(comp: string | null, filter: CompFilter): boolean {
  if (filter === 'any') return true
  const { min, max } = extractCompMinMax(comp)
  const mid = min && max ? (min + max) / 2 : min || max
  if (mid === null) return false
  switch (filter) {
    case 'under50': return mid < 50000
    case '50to80': return mid >= 50000 && mid <= 80000
    case '80to120': return mid > 80000 && mid <= 120000
    case '120to150': return mid > 120000 && mid <= 150000
    case 'over150': return mid > 150000
    default: return true
  }
}

export function DashboardClient({
  jobs,
  profile,
  matches,
  followUps,
  savedJobIds: initialSavedIds,
  error,
  totalCount,
}: DashboardClientProps) {
  const router = useRouter()
  const savedSet = useMemo(() => new Set(initialSavedIds), [initialSavedIds])

  const [pitchJob, setPitchJob] = useState<JobPost | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [pitchError, setPitchError] = useState<string | null>(null)
  const [scoring, setScoring] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('date')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [industryFilter, setIndustryFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateFilter>('any')
  const [compFilter, setCompFilter] = useState<CompFilter>('any')
  const [locationSearch, setLocationSearch] = useState('')
  const [onlyRemote, setOnlyRemote] = useState(false)
  const [onlySaved, setOnlySaved] = useState(false)

  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50
  const savedJobIds = savedSet

  const handleScoreMatches = useCallback(async () => {
    setScoring(true)
    setPitchError(null)
    try {
      const response = await fetch('/api/score-matches', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Scoring failed')
      router.refresh()
    } catch (err) {
      setPitchError(err instanceof Error ? err.message : 'Scoring failed')
    } finally {
      setScoring(false)
    }
  }, [router])

  const handleRefreshJobs = useCallback(async () => {
    setRefreshing(true)
    setPitchError(null)
    try {
      const response = await fetch('/api/admin/scrape', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Refresh failed')
      router.refresh()
    } catch (err) {
      setPitchError(err instanceof Error ? err.message : 'Failed to refresh jobs')
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
      setPitchError(err instanceof Error ? err.message : 'Sign out failed')
    }
  }, [router])

  const generatePitchRef = useRef<string | null>(null)

  const handleGeneratePitch = useCallback(async (job: JobPost) => {
    setPitchJob(job)
    setModalOpen(true)
    setPitchError(null)
    try {
      const supabase = getSupabaseClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('You must be signed in to generate a pitch')
      const response = await fetch('/api/pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate pitch')
      generatePitchRef.current = data.pitch
      ;(window as unknown as Record<string, string | null>).__pitchText = data.pitch
      setPitchError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pitch generation failed'
      setPitchError(message)
      setModalOpen(false)
    }
  }, [])

  const handleSavePitch = useCallback(async (pitchText: string) => {
    if (!pitchJob) return
    const supabase = getSupabaseClient()
    const { error: saveError } = await supabase.from('applications').insert({
      job_id: pitchJob.id, pitch_text: pitchText, status: 'drafted',
    })
    if (saveError) throw new Error(saveError.message)
    router.refresh()
  }, [pitchJob, router])

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
    setPitchJob(null)
    generatePitchRef.current = null
  }, [])

  const toggleIndustry = useCallback((ind: string) => {
    setIndustryFilter((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind],
    )
    setPage(0)
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setRoleFilter('all')
    setIndustryFilter([])
    setDateRange('any')
    setCompFilter('any')
    setLocationSearch('')
    setOnlyRemote(false)
    setOnlySaved(false)
    setSort('date')
    setPage(0)
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (roleFilter !== 'all') count++
    if (industryFilter.length > 0) count++
    if (dateRange !== 'any') count++
    if (compFilter !== 'any') count++
    if (onlyRemote) count++
    if (onlySaved) count++
    if (search) count++
    if (locationSearch) count++
    return count
  }, [roleFilter, industryFilter, dateRange, compFilter, onlyRemote, onlySaved, search, locationSearch])

  const filteredAndSorted = useMemo(() => {
    let result = [...jobs]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (job) =>
          (job.title || '').toLowerCase().includes(q) ||
          (job.company || '').toLowerCase().includes(q) ||
          (job.raw_text || '').toLowerCase().includes(q),
      )
    }

    if (roleFilter !== 'all') {
      result = result.filter((job) => job.role_type === roleFilter)
    }

    if (industryFilter.length > 0) {
      result = result.filter((job) => {
        const jobIndustries = (job.tags || [])
          .filter((t) => t.startsWith('industry:'))
          .map((t) => t.replace('industry:', ''))
        return industryFilter.some((ind) => jobIndustries.includes(ind))
      })
    }

    if (dateRange !== 'any') {
      result = result.filter((job) => dateFilterFn(job.posted_at, dateRange))
    }

    if (compFilter !== 'any') {
      result = result.filter((job) => compFilterFn(job.comp_structure, compFilter))
    }

    if (locationSearch) {
      const q = locationSearch.toLowerCase()
      result = result.filter(
        (job) =>
          (job.raw_text || '').toLowerCase().includes(q) ||
          (job.title || '').toLowerCase().includes(q),
      )
    }

    if (onlyRemote) {
      result = result.filter((job) => job.remote)
    }

    if (onlySaved) {
      result = result.filter((job) => savedJobIds.has(job.id))
    }

    result.sort((a, b) => {
      switch (sort) {
        case 'match': {
          const scoreA = matches[a.id] ?? 0
          const scoreB = matches[b.id] ?? 0
          return scoreB - scoreA
        }
        case 'company':
          return (a.company || '').localeCompare(b.company || '')
        case 'date':
        default: {
          const dateA = a.posted_at ? new Date(a.posted_at).getTime() : 0
          const dateB = b.posted_at ? new Date(b.posted_at).getTime() : 0
          return dateB - dateA
        }
      }
    })

    return result
  }, [jobs, search, sort, roleFilter, industryFilter, dateRange, compFilter, locationSearch, onlyRemote, onlySaved, matches, savedJobIds])

  const paginatedJobs = filteredAndSorted.slice(0, (page + 1) * PAGE_SIZE)
  const hasMore = paginatedJobs.length < filteredAndSorted.length

  const actionButtons = (
    <>
      <Button variant="ghost" size="sm" onClick={handleScoreMatches} disabled={scoring} className="text-xs">
        {scoring ? 'Scoring...' : 'Score'}
      </Button>
      <Button variant="outline" size="sm" onClick={handleRefreshJobs} disabled={refreshing} className="text-xs">
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </Button>
    </>
  )

  const filterChip = (
    label: string,
    active: boolean,
    onClick: () => void,
    color?: string,
  ) => (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0',
        active
          ? color
            ? `bg-${color}-500/20 text-${color}-600 dark:text-${color}-400 border border-${color}-500/30`
            : 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
      )}
    >
      {label}
    </button>
  )

  const nicheScroll = (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {INDUSTRY_OPTIONS.map((ind) => (
        <button
          key={ind}
          onClick={() => toggleIndustry(ind)}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0',
            industryFilter.includes(ind)
              ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted/80',
          )}
        >
          {ind.replace('-', ' ')}
        </button>
      ))}
    </div>
  )

  const filterPanel = (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {ROLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setRoleFilter(opt.value); setPage(0) }}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              roleFilter === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {opt.label}
          </button>
        ))}

        <button
          onClick={() => { setOnlyRemote(!onlyRemote); setPage(0) }}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors',
            onlyRemote
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          Remote
        </button>

        <button
          onClick={() => { setOnlySaved(!onlySaved); setPage(0) }}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors',
            onlySaved
              ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          Saved
        </button>

        <Select value={dateRange} onValueChange={(v) => { setDateRange(v as DateFilter); setPage(0) }}>
          <SelectTrigger className="h-7 text-xs w-auto gap-1 px-2 border-0 bg-muted text-muted-foreground hover:bg-muted/80">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            {DATE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={compFilter} onValueChange={(v) => { setCompFilter(v as CompFilter); setPage(0) }}>
          <SelectTrigger className="h-7 text-xs w-auto gap-1 px-2 border-0 bg-muted text-muted-foreground hover:bg-muted/80">
            <SelectValue placeholder="Comp" />
          </SelectTrigger>
          <SelectContent>
            {COMP_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground underline shrink-0"
          >
            Clear ({activeFilterCount})
          </button>
        )}

        <button
          onClick={() => setFilterOpen(true)}
          className="sm:hidden flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </button>
      </div>

      <div className="hidden sm:block">
        {nicheScroll}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="glow w-[400px] h-[400px] -top-20 -left-20 bg-primary/5 dark:bg-primary/10" />
        <div className="glow w-[300px] h-[300px] top-1/3 right-0 bg-purple-500/5 dark:bg-purple-500/10" />
        <div className="glow w-[500px] h-[500px] -bottom-40 left-1/3 bg-cyan-500/5 dark:bg-cyan-500/8" />
      </div>

      <Nav actions={actionButtons} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 relative overflow-x-hidden">
        {error && (
          <Card className="mb-8 border-destructive/30">
            <CardContent className="p-4 text-sm text-destructive">
              {error}
              {error.includes('Missing environment variable') && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Set up your <code className="bg-muted rounded px-1">.env.local</code> file with Supabase credentials.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {!profile && !error && (
          <Card className="mb-8 border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 animate-fade-in">
            <CardContent className="p-4 text-sm text-amber-600 dark:text-amber-400">
              Complete your{' '}
              <a href="/profile" className="underline font-medium">profile</a>{' '}
              to get better AI-generated pitches.
            </CardContent>
          </Card>
        )}

        {Object.keys(matches).length > 0 && (
          <Card className="mb-8 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 animate-fade-in">
            <CardContent className="p-4 text-sm text-emerald-600 dark:text-emerald-400">
              Jobs ranked by match score. Click &quot;Score matches&quot; to re-score.
            </CardContent>
          </Card>
        )}

        {followUps.length > 0 && (
          <Card className="mb-8 border-orange-500/20 bg-orange-500/5 dark:bg-orange-500/10 animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-orange-600 dark:text-orange-400">Follow-ups due</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {followUps.map((app) => (
                <div key={app.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400 truncate">
                      {app.pitch_text ? app.pitch_text.slice(0, 60) + '...' : 'Application'}
                    </p>
                    <p className="text-xs text-orange-500 dark:text-orange-500">
                      Follow up by: {app.next_follow_up_at ? new Date(app.next_follow_up_at).toLocaleDateString() : 'N/A'}
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
          <Card className="mb-8 border-destructive/30 animate-fade-in">
            <CardContent className="p-4 text-sm text-destructive">{pitchError}</CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <Input
              placeholder="Search jobs, companies, keywords..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={sort} onValueChange={(v) => { setSort(v as SortKey); setPage(0) }}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Newest</SelectItem>
              <SelectItem value="match">Match Score</SelectItem>
              <SelectItem value="company">Company A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4">{filterPanel}</div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Job Board</h2>
          <p className="text-sm text-muted-foreground">
            Showing {paginatedJobs.length} of {filteredAndSorted.length}
          </p>
        </div>

        {filteredAndSorted.length === 0 && !error ? (
          <div className="text-center py-24 text-muted-foreground animate-fade-in">
            <div className="text-5xl mb-4 opacity-20">/</div>
            <p className="text-lg font-medium">
              {activeFilterCount > 0 ? 'No matching jobs' : 'No jobs found'}
            </p>
            <p className="text-sm mt-2 mb-6 max-w-xs mx-auto">
              {activeFilterCount > 0
                ? 'Try adjusting your search or filters.'
                : 'Set your Supabase environment variables in Vercel, then click below to fetch the job board.'}
            </p>
            {activeFilterCount === 0 && (
              <Button onClick={handleRefreshJobs} disabled={refreshing}>
                {refreshing ? 'Refreshing...' : 'Fetch job board'}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedJobs.map((job, i) => (
                <JobCard
                  key={job.id}
                  job={job}
                  matchScore={matches[job.id]}
                  index={i}
                  onGeneratePitch={handleGeneratePitch}
                  isSaved={savedJobIds.has(job.id)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={() => setPage((p) => p + 1)} className="text-sm">
                  Load more ({filteredAndSorted.length - paginatedJobs.length} remaining)
                </Button>
              </div>
            )}
          </>
        )}

        <PitchModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          jobTitle={pitchJob?.title || ''}
          company={pitchJob?.company || ''}
          onSave={handleSavePitch}
        />
      </main>

      {filterOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFilterOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-background border-t rounded-t-2xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-base">Filters</h3>
              <button onClick={() => setFilterOpen(false)} className="text-muted-foreground p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Role Type</p>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRoleFilter(opt.value)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                        roleFilter === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Industry / Niche</p>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <button
                      key={ind}
                      onClick={() => toggleIndustry(ind)}
                      className={cn(
                        'px-3 py-2 rounded-full text-sm font-medium transition-colors',
                        industryFilter.includes(ind)
                          ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {ind.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Date Posted</p>
                <div className="flex flex-wrap gap-2">
                  {DATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDateRange(opt.value)}
                      className={cn(
                        'px-3 py-2 rounded-full text-sm font-medium transition-colors',
                        dateRange === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Compensation</p>
                <div className="flex flex-wrap gap-2">
                  {COMP_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCompFilter(opt.value)}
                      className={cn(
                        'px-3 py-2 rounded-full text-sm font-medium transition-colors',
                        compFilter === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Location</p>
                <Input
                  placeholder="e.g. New York, US, remote..."
                  value={locationSearch}
                  onChange={(e) => { setLocationSearch(e.target.value); setPage(0) }}
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Other</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setOnlyRemote(!onlyRemote); setPage(0) }}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                      onlyRemote
                        ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    Remote only
                  </button>
                  <button
                    onClick={() => { setOnlySaved(!onlySaved); setPage(0) }}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                      onlySaved
                        ? 'bg-red-500/20 text-red-600 border border-red-500/30'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    Saved only
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={handleClearFilters}>
                  Clear all{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </Button>
                <Button className="flex-1" onClick={() => setFilterOpen(false)}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
