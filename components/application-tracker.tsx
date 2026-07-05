'use client'

import { useState, useCallback } from 'react'
import type { Application } from '@/lib/types/database'

const STATUS_LABELS: Record<string, string> = {
  drafted: 'Drafted',
  applied: 'Applied',
  replied: 'Replied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

const STATUS_ORDER = ['drafted', 'applied', 'replied', 'interview', 'offer', 'rejected']

interface ApplicationTrackerProps {
  applications: Application[]
  onUpdateStatus: (id: string, status: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSetFollowUp: (id: string, date: string) => Promise<void>
  error: string | null
}

export function ApplicationTracker({
  applications,
  onUpdateStatus,
  onDelete,
  onSetFollowUp,
  error,
}: ApplicationTrackerProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [followUpDate, setFollowUpDate] = useState<string>('')
  const [followUpAppId, setFollowUpAppId] = useState<string | null>(null)

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      setUpdatingId(id)
      try {
        await onUpdateStatus(id, newStatus)
      } finally {
        setUpdatingId(null)
      }
    },
    [onUpdateStatus],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setUpdatingId(id)
      try {
        await onDelete(id)
      } finally {
        setUpdatingId(null)
      }
    },
    [onDelete],
  )

  const getNextStatuses = (currentStatus: string) => {
    const idx = STATUS_ORDER.indexOf(currentStatus)
    if (idx === -1 || idx >= STATUS_ORDER.length - 1) return []
    return STATUS_ORDER.slice(idx + 1)
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
        <p className="text-lg font-medium">No applications yet</p>
        <p className="text-sm mt-1">
          Generate a pitch from the dashboard and save it to start tracking.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {applications.map((app) => {
        const nextStatuses = getNextStatuses(app.status)
        const isUpdating = updatingId === app.id

        return (
          <div
            key={app.id}
            className={`rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 flex flex-col gap-3 ${isUpdating ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  app.status === 'rejected'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : app.status === 'offer'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : app.status === 'interview'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : app.status === 'replied'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : app.status === 'applied'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {STATUS_LABELS[app.status] || app.status}
              </span>

              <button
                type="button"
                onClick={() => handleDelete(app.id)}
                disabled={isUpdating}
                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-50"
              >
                Remove
              </button>
            </div>

            {app.pitch_text && (
              <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-3">
                {app.pitch_text}
              </p>
            )}

            {app.channel && (
              <p className="text-xs text-zinc-400">
                Channel: {app.channel}
              </p>
            )}

            {followUpAppId === app.id ? (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs w-40"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!followUpDate) return
                    setUpdatingId(app.id)
                    try {
                      await onSetFollowUp(app.id, followUpDate)
                      setFollowUpAppId(null)
                      setFollowUpDate('')
                    } finally {
                      setUpdatingId(null)
                    }
                  }}
                  disabled={!followUpDate || isUpdating}
                  className="rounded-md bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800 text-xs font-medium px-2 py-1 text-blue-700 dark:text-blue-300 transition-colors disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpAppId(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {app.next_follow_up_at && (
                  <p className="text-xs text-zinc-400">
                    Follow up:{' '}
                    {new Date(app.next_follow_up_at).toLocaleDateString()}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFollowUpAppId(app.id)
                    setFollowUpDate(
                      app.next_follow_up_at
                        ? new Date(app.next_follow_up_at)
                            .toISOString()
                            .split('T')[0]
                        : '',
                    )
                  }}
                  className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                >
                  {app.next_follow_up_at ? 'Edit' : 'Set follow-up'}
                </button>
              </div>
            )}

            {nextStatuses.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {nextStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusChange(app.id, status)}
                    disabled={isUpdating}
                    className="rounded-md bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-xs font-medium px-2.5 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Move to {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
