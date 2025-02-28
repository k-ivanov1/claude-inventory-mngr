import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Redirect based on authentication status
  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }

  // This won't be reached due to the redirects above
  return null
}
