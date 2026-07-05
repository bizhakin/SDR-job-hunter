'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface NavProps {
  actions?: React.ReactNode
}

export function Nav({ actions }: NavProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const handleSignOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch {
    }
  }, [router])

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <a href="/dashboard" className="font-semibold text-lg tracking-tight">
          Closer Job Hunter
        </a>

        <div className="flex items-center gap-2 sm:hidden">
          {actions}
          <button
            onClick={() => setOpen(!open)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
            aria-label="Toggle menu"
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span
                className={`block h-px w-full bg-foreground transition-all duration-300 ${open ? 'rotate-45 translate-y-[7px]' : ''}`}
              />
              <span
                className={`block h-px w-full bg-foreground transition-all duration-300 ${open ? 'opacity-0' : ''}`}
              />
              <span
                className={`block h-px w-full bg-foreground transition-all duration-300 ${open ? '-rotate-45 -translate-y-[7px]' : ''}`}
              />
            </div>
          </button>
        </div>

        <nav className="hidden sm:flex items-center gap-1">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/applications">Applications</NavLink>
          <NavLink href="/leads">Add a lead</NavLink>
          <NavLink href="/profile">Profile</NavLink>
          <div className="ml-2">{actions}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-destructive hover:text-destructive"
          >
            Sign out
          </Button>
        </nav>
      </div>

      {open && (
        <div className="sm:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl animate-slide-down">
          <div className="px-4 py-3 space-y-1">
            <MobileNavLink href="/dashboard" active={pathname === '/dashboard'}>
              Dashboard
            </MobileNavLink>
            <MobileNavLink href="/applications" active={pathname === '/applications'}>
              Applications
            </MobileNavLink>
            <MobileNavLink href="/leads" active={pathname === '/leads'}>
              Add a lead
            </MobileNavLink>
            <MobileNavLink href="/profile" active={pathname === '/profile'}>
              Profile
            </MobileNavLink>
          </div>
          <div className="px-4 pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-destructive hover:text-destructive w-full justify-start"
            >
              Sign out
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
    >
      {children}
    </a>
  )
}

function MobileNavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <a
      href={href}
      className={`block px-3 py-2.5 text-sm rounded-md transition-colors ${
        active
          ? 'bg-accent text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      {children}
    </a>
  )
}
