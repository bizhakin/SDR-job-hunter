'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { ApplicationTracker } from '@/components/application-tracker'
import { Nav } from '@/components/nav'
import type { Application } from '@/lib/types/database'

export default function ApplicationsPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadApplications() {
      try {
        const supabase = getSupabaseClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push('/login')
          return
        }

        const { data, error: appError } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (appError) {
          throw new Error(appError.message)
        }

        setApplications(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load applications')
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [router])

  const handleUpdateStatus = useCallback(
    async (id: string, status: string) => {
      setError(null)
      try {
        const supabase = getSupabaseClient()
        const { error: updateError } = await supabase
          .from('applications')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        setApplications((prev) =>
          prev.map((app) =>
            app.id === id ? { ...app, status: status as Application['status'] } : app,
          ),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status')
      }
    },
    [],
  )

  const handleDelete = useCallback(async (id: string) => {
    setError(null)
    try {
      const supabase = getSupabaseClient()
      const { error: deleteError } = await supabase
        .from('applications')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      setApplications((prev) => prev.filter((app) => app.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete application')
    }
  }, [])

  const handleSetFollowUp = useCallback(async (id: string, date: string) => {
    setError(null)
    try {
      const supabase = getSupabaseClient()
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          next_follow_up_at: new Date(date).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setApplications((prev) =>
        prev.map((app) =>
          app.id === id
            ? {
                ...app,
                next_follow_up_at: new Date(date).toISOString(),
              }
            : app,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set follow-up')
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="glow w-[400px] h-[400px] -top-20 -right-20 bg-primary/5 dark:bg-primary/10" />
        <div className="glow w-[300px] h-[300px] bottom-0 left-0 bg-purple-500/5 dark:bg-purple-500/10" />
      </div>

      <Nav />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 relative">
        <h2 className="text-2xl font-semibold tracking-tight mb-8">Application Tracker</h2>

        <ApplicationTracker
          applications={applications}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDelete}
          onSetFollowUp={handleSetFollowUp}
          error={error}
        />
      </main>
    </div>
  )
}
