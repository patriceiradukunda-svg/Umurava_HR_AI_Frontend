'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  BrainCircuit, LayoutDashboard, Briefcase, Users, Bot,
  Star, GitBranch, BarChart3, Settings, LogOut, Bell, Search,
} from 'lucide-react'

const navItems = [
  { href: '/hr/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/hr/jobs',       icon: Briefcase,        label: 'Job Postings' },
  { href: '/hr/applicants', icon: Users,            label: 'Applicants' },
  { href: '/hr/screening',  icon: Bot,              label: 'AI Screening' },
  { href: '/hr/shortlist',  icon: Star,             label: 'Shortlists' },
  { href: '/hr/pipeline',   icon: GitBranch,        label: 'Pipeline' },
  { href: '/hr/analytics',  icon: BarChart3,        label: 'Analytics' },
  { href: '/hr/settings',   icon: Settings,         label: 'Settings' },
]

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isHR } = useAuth()
  const router  = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!user || !isHR)) router.push('/auth/hr')
  }, [user, loading, isHR, router])

  if (loading || !user) return (
    <div className="min-h-screen bg-sky-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  return (
    <div className="flex h-screen bg-sky-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-sky-950 flex flex-col flex-shrink-0 relative overflow-hidden">
        {/* Decorative glows */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-sky-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative p-6 border-b border-sky-800/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-gradient flex items-center justify-center shadow-sky-sm flex-shrink-0">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-display text-white font-bold text-base leading-none">Umurava</span>
            <span className="block text-sky-400 text-[10px] tracking-widest uppercase mt-0.5">TalentAI · HR</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 relative overflow-y-auto">
          <p className="text-sky-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">Main</p>
          {navItems.slice(0, 5).map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative
                  ${active
                    ? 'bg-sky-500/20 text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-sky-400 before:rounded-full'
                    : 'text-sky-400 hover:text-white hover:bg-sky-800/40'
                  }`}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}

          <p className="text-sky-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-2 mt-5">Analytics</p>
          {navItems.slice(5, 7).map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative
                  ${active ? 'bg-sky-500/20 text-white' : 'text-sky-400 hover:text-white hover:bg-sky-800/40'}`}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}

          <p className="text-sky-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-2 mt-5">Config</p>
          {navItems.slice(7).map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative
                  ${active ? 'bg-sky-500/20 text-white' : 'text-sky-400 hover:text-white hover:bg-sky-800/40'}`}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User card */}
        <div className="relative p-4 border-t border-sky-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sky-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user.firstName} {user.lastName}</p>
              <p className="text-sky-400 text-xs capitalize">{user.role}</p>
            </div>
            <button onClick={() => { logout(); router.push('/auth/hr') }}
              className="text-sky-500 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-sky-100 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1">
            <h1 className="font-display font-bold text-sky-900 text-lg capitalize">
              {pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-3 h-9">
              <Search className="w-4 h-4 text-sky-400" />
              <input placeholder="Search…" className="bg-transparent text-sm text-sky-800 placeholder-sky-300 outline-none w-44" />
            </div>
            <button className="w-9 h-9 border border-sky-200 rounded-xl flex items-center justify-center hover:bg-sky-50 text-sky-500 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full border border-white" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
