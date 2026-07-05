'use client'

import { useState, useCallback } from 'react'
import type { JobPost } from '@/lib/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface JobCardProps {
  job: JobPost
  matchScore?: number
  index?: number
  onGeneratePitch: (job: JobPost) => void
}

export function JobCard({ job, matchScore, index = 0, onGeneratePitch }: JobCardProps) {
  const [pitching, setPitching] = useState(false)

  const handlePitch = useCallback(() => {
    setPitching(true)
    onGeneratePitch(job)
  }, [job, onGeneratePitch])

  const roleTypeBadge = job.role_type
    ? job.role_type.charAt(0).toUpperCase() + job.role_type.slice(1)
    : null

  return (
    <Card
      className="flex flex-col animate-enter"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base truncate">
                {job.title || 'Untitled Position'}
              </h3>
              {matchScore !== undefined && (
                <Badge variant="secondary" className="shrink-0">
                  {(matchScore * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {job.company || 'Unknown Company'}
            </p>
          </div>
          {roleTypeBadge && (
            <Badge variant="outline" className="shrink-0">
              {roleTypeBadge}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {job.remote && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Remote
            </span>
          )}
          {job.comp_structure && <span>{job.comp_structure}</span>}
          {job.source && <span>via {job.source}</span>}
        </div>

        {job.tags && job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <Button
            onClick={handlePitch}
            disabled={pitching}
            size="sm"
            className="flex-1"
          >
            {pitching ? 'Generating...' : 'Generate Pitch'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
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
