'use client'

import { useState, useCallback } from 'react'
import type { JobPost } from '@/lib/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase/client'

interface JobCardProps {
  job: JobPost
  matchScore?: number
  index?: number
  onGeneratePitch: (job: JobPost) => void
  isSaved?: boolean
}

function displayText(text: string | null): string {
  if (!text) return ''
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function relativeDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  const now = new Date()
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Just now'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

function parseOTE(comp: string | null): { display: string | null; tier: 'high' | 'mid' | 'low' | null } {
  if (!comp) return { display: null, tier: null }

  const rangeMatch = comp.match(/\$(\d[\d,]*[kK]?)\s*-\s*\$(\d[\d,]*[kK]?)/)
  if (rangeMatch) {
    const upper = rangeMatch[2].replace(/[kK]/g, '000').replace(/,/g, '')
    const lower = rangeMatch[1].replace(/[kK]/g, '000').replace(/,/g, '')
    const numUpper = parseInt(upper, 10)
    if (!isNaN(numUpper)) {
      const display = `$${rangeMatch[1]}-${rangeMatch[2]}`
      return {
        display,
        tier: numUpper >= 150000 ? 'high' : numUpper >= 80000 ? 'mid' : 'low',
      }
    }
  }

  const singleMatch = comp.match(/\$(\d[\d,]*[kK]?)/)
  if (singleMatch) {
    const val = parseInt(singleMatch[1].replace(/[kK]/g, '000').replace(/,/g, ''), 10)
    if (!isNaN(val)) {
      return {
        display: comp.length > 30 ? comp.slice(0, 30) + '...' : comp,
        tier: val >= 150000 ? 'high' : val >= 80000 ? 'mid' : 'low',
      }
    }
  }

  const noDollar = /(commission only|100%\s*commission|uncapped)/i.test(comp)
  if (noDollar) {
    return { display: comp.length > 25 ? comp.slice(0, 25) + '...' : comp, tier: 'high' }
  }

  return { display: comp.length > 30 ? comp.slice(0, 30) + '...' : comp, tier: null }
}

const tierColors: Record<string, string> = {
  high: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  mid: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  low: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
}

export function JobCard({
  job,
  matchScore,
  index = 0,
  onGeneratePitch,
  isSaved = false,
}: JobCardProps) {
  const [pitching, setPitching] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [saved, setSaved] = useState(isSaved)
  const [saving, setSaving] = useState(false)

  const cleanRawText = displayText(job.raw_text)
  const dateLabel = relativeDate(job.posted_at)
  const ote = parseOTE(job.comp_structure)
  const hasRawText = cleanRawText.length > 0
  const previewText = hasRawText
    ? cleanRawText.slice(0, 200) + (cleanRawText.length > 200 ? '...' : '')
    : null

  const handlePitch = useCallback(() => {
    setPitching(true)
    onGeneratePitch(job)
  }, [job, onGeneratePitch])

  const handleToggleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (saved) {
        await supabase
          .from('job_matches')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', job.id)
        setSaved(false)
      } else {
        await supabase
          .from('job_matches')
          .upsert(
            {
              user_id: user.id,
              job_id: job.id,
              status: 'saved',
            },
            { onConflict: 'user_id,job_id' },
          )
        setSaved(true)
      }
    } catch {
    } finally {
      setSaving(false)
    }
  }, [saved, saving, job.id])

  const roleTypeBadge = job.role_type
    ? job.role_type.charAt(0).toUpperCase() + job.role_type.slice(1)
    : null

  const isFresh = dateLabel
    ? ['Today', 'Yesterday', '1d ago', '2d ago', '3d ago', '4d ago', '5d ago', '6d ago'].includes(dateLabel)
    : false

  return (
    <Card
      className="flex flex-col animate-enter"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0 gap-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base truncate">
                {job.title || 'Untitled Position'}
              </h3>
              {matchScore !== undefined && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {(matchScore * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {job.company || 'Unknown Company'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {roleTypeBadge && (
              <Badge variant="outline" className="shrink-0 text-xs">
                {roleTypeBadge}
              </Badge>
            )}
            <button
              onClick={handleToggleSave}
              disabled={saving}
              className={`p-1 rounded-md transition-colors hover:bg-muted ${
                saved ? 'text-red-500' : 'text-muted-foreground'
              }`}
              title={saved ? 'Unsave' : 'Save'}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={saved ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {dateLabel && (
            <span className={`flex items-center gap-1 ${isFresh ? 'text-emerald-500' : ''}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isFresh ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
              {dateLabel}
            </span>
          )}
          {job.remote && (
            <span className="flex items-center gap-1">
              Remote
            </span>
          )}
          {ote.display && (
            <Badge
              variant="outline"
              className={`text-xs px-1.5 py-0 ${tierColors[ote.tier || ''] || ''}`}
            >
              {ote.display}
            </Badge>
          )}
          {job.source && (
            <a
              href={job.source_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline truncate max-w-[120px]"
            >
              {job.source} &rarr;
            </a>
          )}
        </div>

        {previewText && (
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p className={expanded ? '' : 'line-clamp-2'}>
              {expanded ? cleanRawText : previewText}
            </p>
            {cleanRawText.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-primary hover:underline mt-1 text-[11px]"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {job.tags && job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.tags.slice(0, 6).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {job.tags.length > 6 && (
              <span className="text-[10px] text-muted-foreground self-center">
                +{job.tags.length - 6}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <Button
            onClick={handlePitch}
            disabled={pitching}
            size="sm"
            className="flex-1 text-xs"
          >
            {pitching ? 'Generating...' : 'Generate Pitch'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-xs"
          >
            <a href={`/interview?jobId=${job.id}`}>
              Practice
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
