import { createBrowserClient } from '@supabase/ssr'

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}. Set it in .env.local`)
  }
  return value
}

let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (client) return client

  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return client
}
