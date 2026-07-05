import { AuthForm } from '@/components/auth-form'

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="glow w-[500px] h-[500px] -top-40 -left-40 bg-primary/10 dark:bg-primary/15" />
        <div className="glow w-[400px] h-[400px] -bottom-40 -right-40 bg-purple-500/10 dark:bg-purple-500/15" />
      </div>
      <AuthForm redirectTo={params.redirect || '/dashboard'} />
    </div>
  )
}
