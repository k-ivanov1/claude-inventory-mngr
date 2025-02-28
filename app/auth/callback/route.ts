// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to the dashboard instead of the origin
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
