'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/database'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Partial<Profile>>({
    full_name: '',
    headline: '',
    resume_text: '',
    skills: [],
    comp_min: null,
    comp_max: null,
    remote_pref: true,
    role_pref: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [skillsInput, setSkillsInput] = useState('')
  const [rolesInput, setRolesInput] = useState('')
  const [gmailConnected, setGmailConnected] = useState(false)

  useEffect(() => {
    async function loadProfile() {
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

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          throw new Error(profileError.message)
        }

        if (data) {
          setProfile(data)
          setSkillsInput((data.skills ?? []).join(', '))
          setRolesInput((data.role_pref ?? []).join(', '))
        }

        const { data: gmailToken } = await supabase
          .from('user_tokens')
          .select('id')
          .eq('user_id', user.id)
          .eq('provider', 'gmail')
          .single()

        if (gmailToken) {
          setGmailConnected(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setSaving(true)
      setError(null)
      setSuccess(false)

      try {
        const supabase = getSupabaseClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          throw new Error('You must be signed in')
        }

        const skills = skillsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        const role_pref = rolesInput
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean)

        const profileData = {
          id: user.id,
          full_name: profile.full_name ?? null,
          headline: profile.headline ?? null,
          resume_text: profile.resume_text ?? null,
          skills,
          comp_min: profile.comp_min ?? null,
          comp_max: profile.comp_max ?? null,
          remote_pref: profile.remote_pref ?? true,
          role_pref,
        }

        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(profileData)

        if (upsertError) {
          throw new Error(upsertError.message)
        }

        const embedText = [
          profile.headline,
          profile.resume_text,
          ...skills,
        ]
          .filter(Boolean)
          .join(' ')
          .trim()
          .slice(0, 8000)

        if (embedText) {
          try {
            const embedResponse = await fetch('/api/embed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: embedText,
                table: 'profiles',
                recordId: user.id,
              }),
            })

            if (!embedResponse.ok) {
              const embedData = await embedResponse.json()
              console.warn('Embedding failed:', embedData.error)
            }
          } catch (embedErr) {
            console.warn('Embedding error:', embedErr)
          }
        }

        setSuccess(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save profile')
      } finally {
        setSaving(false)
      }
    },
    [profile, skillsInput, rolesInput, router],
  )

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
          <h1 className="font-semibold text-lg">Profile</h1>
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
        <h2 className="text-xl font-semibold mb-6">
          {profile.id ? 'Edit Profile' : 'Create Profile'}
        </h2>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300 mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300 mb-4">
            Profile saved successfully.
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="full_name" className="text-sm font-medium">
              Full Name
            </label>
            <input
              id="full_name"
              type="text"
              value={profile.full_name || ''}
              onChange={(e) =>
                setProfile((p) => ({ ...p, full_name: e.target.value }))
              }
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="headline" className="text-sm font-medium">
              Headline
            </label>
            <input
              id="headline"
              type="text"
              value={profile.headline || ''}
              onChange={(e) =>
                setProfile((p) => ({ ...p, headline: e.target.value }))
              }
              placeholder="e.g. Senior Closer at ABC Corp"
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="skills" className="text-sm font-medium">
              Skills (comma-separated)
            </label>
            <input
              id="skills"
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g. Cold calling, Objection handling, CRM"
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="role_pref" className="text-sm font-medium">
              Target Roles (comma-separated)
            </label>
            <input
              id="role_pref"
              type="text"
              value={rolesInput}
              onChange={(e) => setRolesInput(e.target.value)}
              placeholder="e.g. closer, setter, sdr"
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="comp_min" className="text-sm font-medium">
                Min Compensation ($)
              </label>
              <input
                id="comp_min"
                type="number"
                value={profile.comp_min ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    comp_min: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="comp_max" className="text-sm font-medium">
                Max Compensation ($)
              </label>
              <input
                id="comp_max"
                type="number"
                value={profile.comp_max ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    comp_max: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="remote_pref"
              type="checkbox"
              checked={profile.remote_pref ?? true}
              onChange={(e) =>
                setProfile((p) => ({ ...p, remote_pref: e.target.checked }))
              }
              className="rounded border-zinc-300 dark:border-zinc-600"
            />
            <label htmlFor="remote_pref" className="text-sm font-medium">
              Prefer remote positions
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="resume_text" className="text-sm font-medium">
              Resume / Bio
            </label>
            <textarea
              id="resume_text"
              rows={6}
              value={profile.resume_text || ''}
              onChange={(e) =>
                setProfile((p) => ({ ...p, resume_text: e.target.value }))
              }
              placeholder="Paste your resume, bio, or a summary of your sales experience..."
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
          {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </form>

              <div className="mt-8 border-t border-zinc-200 dark:border-zinc-700 pt-6">
                <h3 className="font-semibold text-base mb-3">Email Integration</h3>
                {gmailConnected ? (
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300">
                    Gmail connected. You can send pitches directly from the dashboard.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Connect your Gmail to send AI-generated pitches directly from your own email account.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/gmail/auth')
                          const data = await response.json()
                          if (data.url) {
                            window.location.href = data.url
                          } else {
                            setError(data.error || 'Failed to get auth URL')
                          }
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to connect Gmail')
                        }
                      }}
                      className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 text-sm transition-colors w-fit"
                    >
                      Connect Gmail
                    </button>
                  </div>
                )}
              </div>
      </main>
    </div>
  )
}
