import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient()
    
    // Log any potential errors during session exchange
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      // Optionally redirect to login page with an error
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
    }
  }

  // Ensure absolute URL is used for redirect
  const dashboardUrl = new URL('/dashboard', process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin)
  
  return NextResponse.redirect(dashboardUrl)
}

// Ensure this route can handle the authentication callback
export const dynamic = 'force-dynamic'
