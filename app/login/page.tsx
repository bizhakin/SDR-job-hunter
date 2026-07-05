import { AuthForm } from '@/components/auth-form'

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AuthForm redirectTo={params.redirect || '/dashboard'} />
    </div>
  )
}
