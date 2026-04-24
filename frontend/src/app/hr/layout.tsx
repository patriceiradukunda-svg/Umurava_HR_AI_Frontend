'use client'
import {
  BrainCircuit, LayoutDashboard, Briefcase, Users,
  Bot, Star, LogOut, Bell, Search, Menu, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { href: '/hr/dashboard',  icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/hr/jobs',       icon: Briefcase,        label: 'Job Postings' },
  { href: '/hr/applicants', icon: Users,            label: 'Applicants'   },
  { href: '/hr/screening',  icon: Bot,              label: 'AI Screening' },
  { href: '/hr/shortlist',  icon: Star,             label: 'Shortlists'   },
]

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isHR } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false) // single drawer for ALL screen sizes

  useEffect(() => {
    if (!loading && (!user || !isHR)) router.push('/auth/hr')
  }, [user, loading, isHR, router])

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (loading || !user) return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const initials  = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  const pageTitle = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'

  return (
    <div className="min-h-screen bg-sky-50">

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-sky-900/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Drawer sidebar (all screen sizes) ────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 h-dvh z-50 w-64 flex flex-col
        bg-white border-r-2 border-sky-100
        shadow-[4px_0_32px_rgba(14,165,233,0.12)]
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Brand + close button */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sky-100 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600
                          flex items-center justify-center shadow-sm flex-shrink-0">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sky-900 text-base leading-tight">Umurava</p>
            <p className="text-sky-400 text-[10px] tracking-widest uppercase font-semibold">Talent · HR</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                       text-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={`
                  flex items-center gap-3 px-3 rounded-xl
                  transition-all duration-150 min-h-[48px]
                  ${active
                    ? 'bg-sky-100 text-sky-700 font-semibold'
                    : 'text-sky-500 hover:bg-sky-50 hover:text-sky-700 font-medium'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-sky-600' : 'text-sky-400'}`} />
                <span className="text-sm flex-1 whitespace-nowrap">{label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-sky-100 p-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-sky-600
                            flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sky-900 text-sm font-semibold truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sky-400 text-xs capitalize">{user.role}</p>
            </div>
            <button
              onClick={() => { logout(); router.push('/auth/hr') }}
              title="Logout"
              className="text-sky-400 hover:text-red-400 hover:bg-red-50
                         w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-col min-h-screen pb-16 md:pb-0">

        {/* Topbar */}
        <header className="
          sticky top-0 z-30
          bg-white border-b-2 border-sky-100
          shadow-[0_2px_12px_rgba(14,165,233,0.07)]
          flex items-center gap-3
          px-4 h-14 sm:px-5 sm:h-16
          flex-shrink-0
        ">
          {/* ☰ Hamburger — on ALL screen sizes */}
          <button
            onClick={() => setOpen(v => !v)}
            aria-label="Open navigation"
            className="w-10 h-10 flex items-center justify-center
                       rounded-xl text-sky-500 hover:bg-sky-50 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className="font-display font-bold text-sky-900 capitalize
                         text-base sm:text-lg flex-1 truncate">
            {pageTitle}
          </h1>

          {/* Search — tablet+ */}
          <div className="hidden sm:flex items-center gap-2 bg-sky-50 border-2 border-sky-100
                          rounded-xl px-3 h-10 focus-within:border-sky-300 transition-colors">
            <Search className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <input
              placeholder="Search…"
              className="bg-transparent text-sm text-sky-800 placeholder-sky-300
                         outline-none w-36 md:w-44"
            />
          </div>
          {/* Search — mobile icon */}
          <button className="sm:hidden w-10 h-10 flex items-center justify-center
                             rounded-xl text-sky-500 hover:bg-sky-50 transition-colors">
            <Search className="w-5 h-5" />
          </button>

          {/* Bell */}
          <button className="relative w-10 h-10 border-2 border-sky-100 rounded-xl
                             flex items-center justify-center hover:bg-sky-50 text-sky-500 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full border-2 border-white" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>

      {/* ── Bottom nav — mobile only ──────────────────────────────────────── */}
      <nav className="
        fixed bottom-0 left-0 right-0 z-30
        flex md:hidden
        bg-white border-t-2 border-sky-100
        shadow-[0_-4px_20px_rgba(14,165,233,0.10)]
        pb-[env(safe-area-inset-bottom)]
      ">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0.5
                min-h-[56px] text-[10px] font-bold tracking-wide uppercase
                transition-colors relative
                ${active ? 'text-sky-600' : 'text-sky-300'}
              `}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-sky-500' : 'text-sky-300'}`} />
              <span className="leading-none">{label.split(' ')[0]}</span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-sky-500" />
              )}
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
