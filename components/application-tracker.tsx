'use client'

import { useState, useCallback } from 'react'
import type { Application } from '@/lib/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const STATUS_LABELS: Record<string, string> = {
  drafted: 'Drafted',
  applied: 'Applied',
  replied: 'Replied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

const STATUS_ORDER = ['drafted', 'applied', 'replied', 'interview', 'offer', 'rejected']

const STATUS_COLORS: Record<string, string> = {
  drafted: 'bg-muted text-muted-foreground',
  applied: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  replied: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  interview: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  offer: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-destructive/10 text-destructive',
}

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
      <div className="text-center py-16 text-muted-foreground">
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
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {applications.map((app) => {
        const nextStatuses = getNextStatuses(app.status)
        const isUpdating = updatingId === app.id

        return (
          <Card
            key={app.id}
            className={`${isUpdating ? 'opacity-60' : ''}`}
          >
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className={STATUS_COLORS[app.status] || ''}
                >
                  {STATUS_LABELS[app.status] || app.status}
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(app.id)}
                  disabled={isUpdating}
                  className="text-destructive hover:text-destructive h-auto px-2 py-0 text-xs"
                >
                  Remove
                </Button>
              </div>

              {app.pitch_text && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {app.pitch_text}
                </p>
              )}

              {app.channel && (
                <p className="text-xs text-muted-foreground">
                  Channel: {app.channel}
                </p>
              )}

              {followUpAppId === app.id ? (
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-40 h-8 text-xs"
                  />
                  <Button
                    size="sm"
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
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFollowUpAppId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {app.next_follow_up_at && (
                    <p className="text-xs text-muted-foreground">
                      Follow up:{' '}
                      {new Date(app.next_follow_up_at).toLocaleDateString()}
                    </p>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto px-0 py-0 text-xs"
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
                  >
                    {app.next_follow_up_at ? 'Edit' : 'Set follow-up'}
                  </Button>
                </div>
              )}

              {nextStatuses.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {nextStatuses.map((status) => (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(app.id, status)}
                      disabled={isUpdating}
                    >
                      Move to {STATUS_LABELS[status]}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
