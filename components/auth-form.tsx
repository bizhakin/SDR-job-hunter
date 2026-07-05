'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'

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
    <div className="w-full max-w-sm mx-auto">
      <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-center">
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </h2>

        {errors.general && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
            {errors.general}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder="you@example.com"
            disabled={loading}
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.email}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder="At least 6 characters"
            disabled={loading}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          {errors.password && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? 'Please wait...'
            : mode === 'signin'
              ? 'Sign In'
              : 'Create Account'}
        </button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-300 dark:border-zinc-600" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500">
              or continue with
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={googleLoading}
          className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-medium py-2 px-4 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? 'Please wait...' : 'Google'}
        </button>

        <button
          type="button"
          onClick={toggleMode}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline text-center"
        >
          {mode === 'signin'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
