'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function LeadsPage() {
  const router = useRouter()
  const [rawText, setRawText] = useState('')
  const [sourcePlatform, setSourcePlatform] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<Record<string, unknown> | null>(null)
  const [draftFields, setDraftFields] = useState<Record<string, unknown>>({})

  const handleExtract = useCallback(async () => {
    if (!rawText.trim()) {
      setError('Paste a post or message first')
      return
    }

    setExtracting(true)
    setError(null)
    setExtracted(null)

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

      const response = await fetch('/api/extract-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          sourcePlatform: sourcePlatform || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Extraction failed')
      }

      setExtracted(data.extracted)
      setDraftFields(data.draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed')
    } finally {
      setExtracting(false)
    }
  }, [rawText, sourcePlatform, router])

  const handleFieldChange = useCallback(
    (field: string, value: string | boolean) => {
      setDraftFields((prev) => ({ ...prev, [field]: value }))
    },
    [],
  )

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)

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

      const response = await fetch('/api/extract-lead', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadManualRawText: rawText,
          sourcePlatform: sourcePlatform || null,
          jobPost: draftFields,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Save failed')
      }

      setRawText('')
      setSourcePlatform('')
      setExtracted(null)
      setDraftFields({})
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [rawText, sourcePlatform, draftFields, router])

  const handleSignOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch {
      // silent
    }
  }, [router])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-lg">Add a Lead</h1>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Dashboard
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
        <h2 className="text-xl font-semibold mb-2">Paste a lead</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Paste an Instagram post, X tweet, Discord message, or any text mentioning a job
          opening. AI will extract the details.
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300 mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="source" className="text-sm font-medium">
              Source platform (optional)
            </label>
            <select
              id="source"
              value={sourcePlatform}
              onChange={(e) => setSourcePlatform(e.target.value)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select platform...</option>
              <option value="instagram">Instagram</option>
              <option value="x">X / Twitter</option>
              <option value="discord">Discord</option>
              <option value="linkedin">LinkedIn</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="rawText" className="text-sm font-medium">
              Post text
            </label>
            <textarea
              id="rawText"
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste the full post text here..."
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting || !rawText.trim()}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {extracting ? 'Extracting...' : 'Extract with AI'}
          </button>

          {extracted && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 flex flex-col gap-3 mt-2">
              <h3 className="font-semibold text-sm">Extracted Details</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-500">Company</label>
                  <input
                    type="text"
                    value={(draftFields.company as string) || ''}
                    onChange={(e) => handleFieldChange('company', e.target.value)}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-500">Title</label>
                  <input
                    type="text"
                    value={(draftFields.title as string) || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-500">Role type</label>
                  <select
                    value={(draftFields.role_type as string) || ''}
                    onChange={(e) => handleFieldChange('role_type', e.target.value)}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
                  >
                    <option value="">Auto-detected</option>
                    <option value="closer">Closer</option>
                    <option value="setter">Setter</option>
                    <option value="sdr">SDR</option>
                    <option value="bdr">BDR</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-500">Compensation</label>
                  <input
                    type="text"
                    value={(draftFields.comp_structure as string) || ''}
                    onChange={(e) => handleFieldChange('comp_structure', e.target.value)}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="remote"
                  type="checkbox"
                  checked={draftFields.remote === true}
                  onChange={(e) => handleFieldChange('remote', e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
                <label htmlFor="remote" className="text-sm">Remote</label>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save to Job Board'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
