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
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !isHR)) router.push('/auth/hr')
  }, [user, loading, isHR, router])

  // Close drawer when route changes
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  if (loading || !user) return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const initials   = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  const pageTitle  = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'

  return (
    <div className="min-h-screen bg-sky-50">

      {/* ═══════════════════════════════════════════════════════════════
          SIDEBAR — hidden on mobile, icon-rail on tablet, full on desktop
         ═══════════════════════════════════════════════════════════════ */}

      {/* Mobile backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-sky-900/30 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-dvh z-50 flex flex-col
        bg-white border-r-2 border-sky-100
        shadow-[2px_0_24px_rgba(14,165,233,0.08)]
        transition-all duration-300 overflow-hidden

        /* mobile: full-width drawer, slides in/out */
        w-60
        ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}

        /* tablet md: always visible, icon-only rail */
        md:translate-x-0 md:w-[72px]

        /* desktop lg: full sidebar */
        lg:w-60
      `}>

        {/* ── Brand ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sky-100 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600
                          flex items-center justify-center shadow-sm flex-shrink-0">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div className="md:hidden lg:block">
            <p className="font-display font-bold text-sky-900 text-base leading-tight">Umurava</p>
            <p className="text-sky-400 text-[10px] tracking-widest uppercase font-semibold">Talent · HR</p>
          </div>
        </div>

        {/* ── Nav ──────────────────────────────────────────────────── */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`
                  flex items-center gap-3 rounded-xl
                  transition-all duration-150 min-h-[48px]
                  px-3
                  /* tablet: center icon */
                  md:justify-center md:px-0 lg:justify-start lg:px-3
                  ${active
                    ? 'bg-sky-100 text-sky-700 font-semibold'
                    : 'text-sky-500 hover:bg-sky-50 hover:text-sky-700 font-medium'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-sky-600' : 'text-sky-400'}`} />
                <span className="text-sm md:hidden lg:block">{label}</span>
                {/* Active pill — desktop only */}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500 md:hidden lg:block" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── User ─────────────────────────────────────────────────── */}
        <div className="border-t border-sky-100 p-3 flex-shrink-0">
          <div className="flex items-center gap-3 md:justify-center lg:justify-start">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-sky-600
                            flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            {/* Name — hidden on tablet, visible on desktop & mobile drawer */}
            <div className="flex-1 min-w-0 md:hidden lg:block">
              <p className="text-sky-900 text-sm font-semibold truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sky-400 text-xs capitalize">{user.role}</p>
            </div>
            {/* Logout */}
            <button
              onClick={() => { logout(); router.push('/auth/hr') }}
              title="Logout"
              className="text-sky-400 hover:text-red-400 transition-colors
                         w-9 h-9 flex items-center justify-center rounded-lg
                         hover:bg-red-50 md:hidden lg:flex"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          {/* Tablet-only: logout below avatar */}
          <button
            onClick={() => { logout(); router.push('/auth/hr') }}
            title="Logout"
            className="hidden md:flex lg:hidden w-full mt-2 items-center justify-center
                       text-sky-400 hover:text-red-400 hover:bg-red-50
                       rounded-xl h-9 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT
         ═══════════════════════════════════════════════════════════════ */}
      <div className="
        flex flex-col min-h-screen
        /* shift right on tablet */
        md:ml-[72px]
        /* shift right on desktop */
        lg:ml-60
        /* space for bottom nav on mobile */
        pb-16 md:pb-0
      ">

        {/* ── Topbar ───────────────────────────────────────────────── */}
        <header className="
          sticky top-0 z-30
          bg-white border-b-2 border-sky-100
          shadow-[0_2px_12px_rgba(14,165,233,0.07)]
          flex items-center gap-3
          px-4 h-14 sm:px-5 sm:h-16
          flex-shrink-0
        ">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden w-10 h-10 flex items-center justify-center
                       rounded-xl text-sky-500 hover:bg-sky-50 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <h1 className="font-display font-bold text-sky-900 capitalize
                         text-base sm:text-lg flex-1 truncate">
            {pageTitle}
          </h1>

          {/* Search — grows on tablet+, icon-only on mobile */}
          <div className="hidden sm:flex items-center gap-2 bg-sky-50 border-2 border-sky-100
                          rounded-xl px-3 h-10 focus-within:border-sky-300 transition-colors">
            <Search className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <input
              placeholder="Search…"
              className="bg-transparent text-sm text-sky-800 placeholder-sky-300
                         outline-none w-36 md:w-44"
            />
          </div>
          {/* Mobile: just the search icon */}
          <button className="sm:hidden w-10 h-10 flex items-center justify-center
                             rounded-xl text-sky-500 hover:bg-sky-50 transition-colors">
            <Search className="w-5 h-5" />
          </button>

          {/* Bell */}
          <button className="relative w-10 h-10 border-2 border-sky-100 rounded-xl
                             flex items-center justify-center
                             hover:bg-sky-50 text-sky-500 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full
                             border-2 border-white" />
          </button>
        </header>

        {/* ── Page content ─────────────────────────────────────────── */}
        <main className="flex-1 px-4 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BOTTOM NAV — mobile only
         ═══════════════════════════════════════════════════════════════ */}
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
            <Link
              key={href}
              href={href}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0.5
                min-h-[56px] text-[10px] font-bold tracking-wide uppercase
                transition-colors
                ${active ? 'text-sky-600' : 'text-sky-300'}
              `}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-sky-500' : 'text-sky-300'}`} />
              <span className="leading-none mt-0.5 hidden xs:block">{label.split(' ')[0]}</span>
              {active && (
                <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-sky-500" />
              )}
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
