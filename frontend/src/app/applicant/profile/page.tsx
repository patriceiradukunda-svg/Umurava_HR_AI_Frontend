'use client'
import { useAuth } from '@/context/AuthContext'
import { User, Mail, Shield } from 'lucide-react'

export default function ApplicantProfilePage() {
  const { user } = useAuth()
  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-sky-950">My Profile</h1>
        <p className="text-sky-400 text-sm mt-1">Your account information</p>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-card border border-sky-50">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-3xl bg-sky-gradient text-white font-bold text-3xl flex items-center justify-center shadow-sky-md">
            {initials}
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-sky-900">{user.firstName} {user.lastName}</h2>
            <p className="text-sky-400 text-sm mt-1 capitalize">{user.role}</p>
            <span className="badge-sky mt-2 inline-block">Job Seeker</span>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { icon: User,   label: 'Full Name', value: `${user.firstName} ${user.lastName}` },
            { icon: Mail,   label: 'Email',     value: user.email },
            { icon: Shield, label: 'Role',      value: user.role },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-4 p-4 bg-sky-50 rounded-xl border border-sky-100">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <p className="text-sky-400 text-xs font-bold uppercase tracking-wide">{item.label}</p>
                <p className="text-sky-900 font-semibold mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-sky-50 rounded-xl border border-sky-100">
          <p className="text-sky-600 text-sm font-semibold mb-1">💡 Tip: Complete your profile</p>
          <p className="text-sky-500 text-xs leading-relaxed">
            To improve your AI match score, ask your HR team to add your full talent profile
            (skills, experience, education, projects) to the system.
          </p>
        </div>
      </div>
    </div>
  )
}
