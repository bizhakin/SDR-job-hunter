'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { ApplicationTracker } from '@/components/application-tracker'
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

  const handleSignOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed')
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-lg">Applications</h1>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/profile"
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Profile
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <h2 className="text-xl font-semibold mb-6">Application Tracker</h2>

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
