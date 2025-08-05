import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Debug Supabase configuration
console.log('🔧 Supabase Configuration Debug:')
console.log('🔧 URL exists:', !!supabaseUrl)
console.log('🔧 URL length:', supabaseUrl?.length || 0)
console.log('🔧 Anon key exists:', !!supabaseAnonKey)
console.log('🔧 Anon key length:', supabaseAnonKey?.length || 0)
console.log('🔧 URL starts with https:', supabaseUrl?.startsWith('https://'))
console.log('🔧 Anon key starts with eyJ:', supabaseAnonKey?.startsWith('eyJ'))

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client for server-side operations (bypasses RLS)
// Only create this on the server side to avoid client-side errors
export const supabaseAdmin = typeof window === 'undefined' 
  ? createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null

export const createSupabaseClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 