'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { BrainCircuit, Briefcase, FileText, User, LogOut, Bell } from 'lucide-react'

const navItems = [
  { href: '/applicant/jobs',            icon: Briefcase, label: 'Browse Jobs' },
  { href: '/applicant/my-applications', icon: FileText,  label: 'My Applications' },
  { href: '/applicant/profile',         icon: User,      label: 'My Profile' },
]

export default function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isApplicant } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!user || !isApplicant)) router.push('/auth/applicant')
  }, [user, loading, isApplicant, router])

  if (loading || !user) return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  return (
    <div className="min-h-screen bg-sky-50">
      {/* Top navbar */}
      <header className="bg-white border-b border-sky-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
          <Link href="/applicant/jobs" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-sky-gradient flex items-center justify-center shadow-sky-sm">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-bold text-sky-900 text-base leading-none">Umurava</span>
              <span className="block text-sky-400 text-[10px] tracking-widest uppercase">Africa</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1 flex-1">
            {navItems.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    active ? 'bg-sky-50 text-sky-700' : 'text-sky-400 hover:text-sky-700 hover:bg-sky-50'
                  }`}>
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:block">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* <button className="w-9 h-9 border border-sky-200 rounded-xl flex items-center justify-center hover:bg-sky-50 text-sky-400">
              <Bell className="w-4 h-4" />
            </button> */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-sky-gradient text-white text-xs font-bold flex items-center justify-center">
                {initials}
              </div>
              <span className="hidden sm:block text-sky-800 text-sm font-semibold">{user.firstName}</span>
            </div>
            <button onClick={() => { logout(); router.push('/auth/applicant') }}
              className="text-sky-400 hover:text-red-400 transition-colors p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
