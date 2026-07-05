'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthMode = 'signin' | 'signup'

interface AuthFormProps {
  redirectTo?: string
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

export function AuthForm({ redirectTo }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()

  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {}
    if (!email.trim()) {
      errs.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Invalid email format'
    }
    if (!password) {
      errs.password = 'Password is required'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }
    return errs
  }, [email, password])

  const handleEmailAuth = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      const validationErrors = validate()
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors)
        return
      }

      setLoading(true)

      try {
        const supabase = getSupabaseClient()
        let result

        if (mode === 'signup') {
          result = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          })
        } else {
          result = await supabase.auth.signInWithPassword({
            email,
            password,
          })
        }

        if (result.error) {
          setErrors({ general: result.error.message })
          return
        }

        if (mode === 'signup') {
          setErrors({
            general:
              'Check your email for the confirmation link, then sign in.',
          })
          setMode('signin')
          return
        }

        router.push(redirectTo || '/dashboard')
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred'
        setErrors({ general: message })
      } finally {
        setLoading(false)
      }
    },
    [email, password, mode, redirectTo, router, validate],
  )

  const handleGoogleAuth = useCallback(async () => {
    setGoogleLoading(true)
    setErrors({})

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo || '/dashboard'}`,
        },
      })

      if (error) {
        setErrors({ general: error.message })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setErrors({ general: message })
    } finally {
      setGoogleLoading(false)
    }
  }, [redirectTo])

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))
    setErrors({})
  }, [])

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader className="text-center">
        <CardTitle>
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          {errors.general && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {errors.general}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={loading}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? 'Please wait...'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
          </Button>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">
                or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleAuth}
            disabled={googleLoading}
            className="w-full"
          >
            {googleLoading ? 'Please wait...' : 'Google'}
          </Button>

          <Button
            type="button"
            variant="link"
            onClick={toggleMode}
            className="text-sm"
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
