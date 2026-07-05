'use client'

import { useState, useCallback } from 'react'
import type { JobPost } from '@/lib/types/database'

interface JobCardProps {
  job: JobPost
  matchScore?: number
  onGeneratePitch: (job: JobPost) => void
}

export function JobCard({ job, matchScore, onGeneratePitch }: JobCardProps) {
  const [pitching, setPitching] = useState(false)

  const handlePitch = useCallback(() => {
    setPitching(true)
    onGeneratePitch(job)
  }, [job, onGeneratePitch])

  const roleTypeBadge = job.role_type
    ? job.role_type.charAt(0).toUpperCase() + job.role_type.slice(1)
    : null

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">
              {job.title || 'Untitled Position'}
            </h3>
            {matchScore !== undefined && (
              <span className="shrink-0 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium px-2 py-0.5">
                {(matchScore * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {job.company || 'Unknown Company'}
          </p>
        </div>
        {roleTypeBadge && (
          <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5">
            {roleTypeBadge}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        {job.remote && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Remote
          </span>
        )}
        {job.comp_structure && <span>{job.comp_structure}</span>}
        {job.source && <span>via {job.source}</span>}
      </div>

      {job.tags && job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={handlePitch}
          disabled={pitching}
          className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pitching ? 'Generating...' : 'Generate Pitch'}
        </button>
        <a
          href={`/interview?jobId=${job.id}`}
          className="rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm font-medium py-2 px-3 transition-colors text-zinc-700 dark:text-zinc-300"
        >
          Practice
        </a>
      </div>
    </div>
  )
}
