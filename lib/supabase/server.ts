import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}. Set it in .env.local`)
  }
  return value
}

export async function getServiceSupabase() {
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY')

  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      async getAll() {
        const cookieStore = await cookies()
        return cookieStore.getAll()
      },
      async setAll(cookiesList) {
        const cookieStore = await cookies()
        for (const { name, value, options } of cookiesList) {
          cookieStore.set(name, value, options)
        }
      },
    },
  })
}

export async function getAuthenticatedSupabase() {
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async getAll() {
        const cookieStore = await cookies()
        return cookieStore.getAll()
      },
      async setAll(cookiesList) {
        const cookieStore = await cookies()
        for (const { name, value, options } of cookiesList) {
          cookieStore.set(name, value, options)
        }
      },
    },
  })
}
