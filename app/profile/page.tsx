'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<{
    full_name: string | null
    headline: string | null
    resume_text: string | null
    skills: string[]
    comp_min: number | null
    comp_max: number | null
    remote_pref: boolean
    role_pref: string[]
    id: string
  } | null>(null)
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

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({ id: user.id })
              .select()
              .single()

            if (insertError) {
              throw new Error(insertError.message)
            }

            if (newProfile) {
              setProfile(newProfile as typeof profile)
            }
          } else {
            throw new Error(profileError.message)
          }
        } else if (data) {
          setProfile(data as typeof profile)
          setSkillsInput(((data as Record<string, unknown>).skills as string[] ?? []).join(', '))
          setRolesInput(((data as Record<string, unknown>).role_pref as string[] ?? []).join(', '))
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
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const skills = skillsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        const role_pref = rolesInput
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean)

        const { error: updateError } = await supabase.from('profiles').upsert(
          {
            id: user.id,
            full_name: (
              document.getElementById('full_name') as HTMLInputElement
            )?.value,
            headline: (
              document.getElementById('headline') as HTMLInputElement
            )?.value,
            skills,
            role_pref,
            comp_min: profile?.comp_min ?? null,
            comp_max: profile?.comp_max ?? null,
            remote_pref: profile?.remote_pref ?? true,
            resume_text: profile?.resume_text ?? '',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        )

        if (updateError) {
          throw new Error(updateError.message)
        }

        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save profile')
      } finally {
        setSaving(false)
      }
    },
    [skillsInput, rolesInput, profile, router],
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
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-lg">Profile</h1>
          <div className="flex items-center gap-3">
            <Button variant="link" size="sm" asChild>
              <a href="/dashboard">Dashboard</a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-destructive hover:text-destructive"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                  Profile saved successfully
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  defaultValue={profile?.full_name || ''}
                  placeholder="Your name"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="headline">Professional Headline</Label>
                <Input
                  id="headline"
                  defaultValue={profile?.headline || ''}
                  placeholder="e.g. Senior Closer — 5 Years High-Ticket Sales"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="cold calling, objection handling, CRM, Sandler"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="roles">Target Roles (comma-separated)</Label>
                <Input
                  id="roles"
                  value={rolesInput}
                  onChange={(e) => setRolesInput(e.target.value)}
                  placeholder="closer, setter, sdr"
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Email Integration</CardTitle>
          </CardHeader>
          <CardContent>
            {gmailConnected ? (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                Gmail connected. You can send pitches directly from the dashboard.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Connect your Gmail to send AI-generated pitches directly from your own email account.
                </p>
                <Button
                  variant="default"
                  className="bg-destructive hover:bg-destructive/90 w-fit"
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
                >
                  Connect Gmail
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Resume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Label htmlFor="resume">Paste your resume text</Label>
              <textarea
                id="resume"
                defaultValue={profile?.resume_text || ''}
                onChange={(e) => {
                  setProfile((prev) =>
                    prev ? { ...prev, resume_text: e.target.value } : prev,
                  )
                }}
                className="flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Paste your resume or bio here. The AI uses this to tailor pitch generation and interview practice."
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
