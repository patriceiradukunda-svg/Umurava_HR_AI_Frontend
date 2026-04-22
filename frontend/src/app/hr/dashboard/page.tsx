'use client'
import { useEffect, useState } from 'react'
import { dashboardAPI, jobsAPI } from '@/lib/api'
import Link from 'next/link'
import { Briefcase, Users, Star, Bot, ArrowRight, TrendingUp, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function HRDashboardPage() {
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.get()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />

  const stats = data?.stats || {}
  const recentJobs  = data?.recentJobs  || []
  const aiActivity  = data?.aiActivity  || []

  const cards = [
    { label: 'Active Jobs',       value: stats.activeJobs       || 0, sub: `+${stats.newJobsThisWeek || 0} this week`,     icon: Briefcase, color: 'from-sky-500 to-sky-600' },
    { label: 'Total Applicants',  value: stats.totalApplicants  || 0, sub: `+${stats.newApplicantsThisWeek || 0} this week`, icon: Users,     color: 'from-cyan-500 to-sky-500' },
    { label: 'Shortlisted',       value: stats.shortlisted      || 0, sub: `${stats.shortlistRate || 0}% shortlist rate`,   icon: Star,      color: 'from-emerald-500 to-cyan-500' },
    { label: 'AI Screenings Run', value: stats.screeningRuns    || 0, sub: '94% accuracy rate',                            icon: Bot,       color: 'from-indigo-500 to-sky-500' },
  ]

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-5 shadow-card card-hover border border-sky-50">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-4`}>
              <c.icon className="w-5 h-5 text-white" />
            </div>
            <div className="font-display text-3xl font-bold text-sky-950">{c.value.toLocaleString()}</div>
            <div className="text-sky-400 text-xs font-semibold uppercase tracking-wide mt-1">{c.label}</div>
            <div className="text-emerald-500 text-xs font-semibold mt-2">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent jobs */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-sky-50">
            <h2 className="font-display font-bold text-sky-900 text-lg">Recent Jobs</h2>
            <Link href="/hr/jobs" className="text-sky-500 text-sm font-semibold hover:text-sky-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-sky-50">
            {recentJobs.length === 0 ? (
              <div className="p-8 text-center text-sky-300">No jobs yet. <Link href="/hr/jobs" className="text-sky-500 font-semibold">Create one →</Link></div>
            ) : recentJobs.map((job: any) => (
              <div key={job._id} className="flex items-center gap-4 px-6 py-4 hover:bg-sky-50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sky-900 truncate">{job.title}</p>
                  <p className="text-sky-400 text-xs">{job.location} · {job.applicantCount || 0} applicants</p>
                </div>
                <span className={`badge-${job.status}`}>{job.status}</span>
                <Link href="/hr/screening" className="btn-sky text-xs py-1.5 px-3">Screen</Link>
              </div>
            ))}
          </div>
        </div>

        {/* AI Activity chart + quick actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-card border border-sky-50 p-5">
            <h2 className="font-display font-bold text-sky-900 mb-4 text-base">AI Activity · 7 days</h2>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={aiActivity}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7dd3fc' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#0c4a6e', border: 'none', borderRadius: 8, color: '#e0f2fe', fontSize: 12 }} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-sky-50 p-5">
            <h2 className="font-display font-bold text-sky-900 mb-4 text-base">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/hr/jobs" className="flex items-center gap-3 w-full btn-sky text-sm justify-center">
                <Briefcase className="w-4 h-4" /> Post New Job
              </Link>
              <Link href="/hr/screening" className="flex items-center gap-3 w-full bg-sky-950 hover:bg-sky-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors justify-center">
                <Bot className="w-4 h-4" /> Run AI Screening
              </Link>
              <Link href="/hr/applicants" className="flex items-center gap-3 w-full btn-sky-outline text-sm justify-center">
                <Users className="w-4 h-4" /> Upload Applicants
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 h-32 shimmer" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl h-64 shimmer" />
        <div className="space-y-4">
          <div className="bg-white rounded-2xl h-36 shimmer" />
          <div className="bg-white rounded-2xl h-36 shimmer" />
        </div>
      </div>
    </div>
  )
}
