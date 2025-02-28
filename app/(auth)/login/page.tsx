import { LoginForm } from '@/components/auth/login-form'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <>
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
          Tea Inventory Dashboard
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Sign in with your @muave.co.uk email
        </p>
      </div>
      <LoginForm />
    </>
  )
}
