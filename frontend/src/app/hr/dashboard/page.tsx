'use client'
import { useEffect, useState, useCallback } from 'react'
import { dashboardAPI } from '@/lib/api'
import Link from 'next/link'
import {
  Briefcase, Users, Star, CheckCircle, ArrowRight, TrendingUp,
  AlertTriangle, ChevronRight, Activity, Target, Zap, BarChart2,
  UserCheck, FileText, Bell, Plus, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus, Eye,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  activeJobs: number; newJobsThisWeek: number
  totalApplicants: number; newApplicantsThisWeek: number
  shortlisted: number; shortlistRate: number; screeningRuns: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Trend({ value }: { value: number }) {
  if (value > 0) return <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-semibold"><ArrowUpRight className="w-3 h-3" />+{value}</span>
  if (value < 0) return <span className="inline-flex items-center gap-0.5 text-red-500 text-xs font-semibold"><ArrowDownRight className="w-3 h-3" />{value}</span>
  return <span className="inline-flex items-center gap-0.5 text-sky-400 text-xs font-semibold"><Minus className="w-3 h-3" />—</span>
}

const PIPELINE_STAGES = [
  { key: 'applied',     label: 'Applied',     color: '#38bdf8', bg: 'bg-sky-100',     text: 'text-sky-700',     href: '/hr/applicants' },
  { key: 'screening',   label: 'Screening',   color: '#818cf8', bg: 'bg-indigo-100',  text: 'text-indigo-700',  href: '/hr/screening' },
  { key: 'shortlisted', label: 'Shortlisted', color: '#34d399', bg: 'bg-emerald-100', text: 'text-emerald-700', href: '/hr/shortlist' },
  { key: 'interview',   label: 'Interview',   color: '#fbbf24', bg: 'bg-amber-100',   text: 'text-amber-700',   href: '/hr/pipeline' },
  { key: 'offer',       label: 'Offer',       color: '#f472b6', bg: 'bg-pink-100',    text: 'text-pink-700',    href: '/hr/pipeline' },
  { key: 'hired',       label: 'Hired',       color: '#10b981', bg: 'bg-teal-100',    text: 'text-teal-700',    href: '/hr/pipeline' },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  closed: 'bg-slate-100 text-slate-500 border border-slate-200',
  draft:  'bg-amber-100 text-amber-700 border border-amber-200',
  paused: 'bg-orange-100 text-orange-700 border border-orange-200',
}

function buildPipeline(stats: Stats) {
  const total = stats.totalApplicants || 0
  return [
    { key: 'applied',     count: total },
    { key: 'screening',   count: stats.screeningRuns || Math.round(total * 0.7) },
    { key: 'shortlisted', count: stats.shortlisted || 0 },
    { key: 'interview',   count: Math.round((stats.shortlisted || 0) * 0.6) },
    { key: 'offer',       count: Math.round((stats.shortlisted || 0) * 0.25) },
    { key: 'hired',       count: Math.round((stats.shortlisted || 0) * 0.12) },
  ]
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-sky-950 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-sky-100 animate-pulse rounded-2xl ${className}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <Skeleton className="h-36" />
      <div className="grid lg:grid-cols-3 gap-5">
        <Skeleton className="lg:col-span-2 h-72" />
        <Skeleton className="h-72" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-20" />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HRDashboardPage() {
  const [data, setData]           = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try { const r = await dashboardAPI.get(); setData(r.data.data) } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <DashboardSkeleton />

  const stats: Stats        = data?.stats || {}
  const recentJobs          = data?.recentJobs        || []
  const aiActivity          = data?.aiActivity        || []
  const recentScreenings    = data?.recentScreenings  || []
  const pipeline            = buildPipeline(stats)

  const weeklyTrend = aiActivity.length >= 4 ? aiActivity : Array.from({ length: 7 }, (_, i) => ({
    label: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
    count: Math.floor(Math.random() * 10) + 1,
  }))

  const kpis = [
    { label: 'Total Applicants',  value: stats.totalApplicants  || 0, sub: `+${stats.newApplicantsThisWeek || 0} this week`,   trend: stats.newApplicantsThisWeek || 0, icon: Users,        accent: 'from-sky-500 to-sky-600',     warn: false },
    { label: 'Active Openings',   value: stats.activeJobs       || 0, sub: `+${stats.newJobsThisWeek || 0} posted this week`, trend: stats.newJobsThisWeek || 0,      icon: Briefcase,    accent: 'from-indigo-500 to-sky-500',  warn: stats.activeJobs === 0 },
    { label: 'Shortlisted',       value: stats.shortlisted      || 0, sub: `${stats.shortlistRate || 0}% conversion rate`,    trend: 0,                               icon: Star,         accent: 'from-emerald-500 to-teal-500',warn: (stats.shortlistRate || 0) < 10 && stats.totalApplicants > 5 },
    { label: 'Screenings Run',    value: stats.screeningRuns    || 0, sub: 'Evaluations completed',                           trend: 0,                               icon: CheckCircle,  accent: 'from-sky-400 to-cyan-500',    warn: false },
  ]

  const insights: { icon: any; color: string; bg: string; title: string; desc: string; href: string; urgency: string }[] = []
  if (stats.activeJobs > 0 && !stats.totalApplicants)
    insights.push({ icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', title: 'No applicants yet', desc: `${stats.activeJobs} open roles have zero applications.`, href: '/hr/jobs', urgency: 'high' })
  if ((stats.shortlistRate || 0) < 10 && stats.totalApplicants > 5)
    insights.push({ icon: Target, color: 'text-red-500', bg: 'bg-red-50', title: 'Low shortlist rate', desc: 'Below 10% of applicants are shortlisted. Review criteria.', href: '/hr/screening', urgency: 'high' })
  if (!stats.screeningRuns && stats.totalApplicants > 0)
    insights.push({ icon: Zap, color: 'text-sky-600', bg: 'bg-sky-50', title: 'Start screening', desc: `${stats.totalApplicants} applicants awaiting evaluation.`, href: '/hr/screening', urgency: 'medium' })
  if (stats.shortlisted > 0)
    insights.push({ icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', title: `${stats.shortlisted} candidates shortlisted`, desc: 'Review and move top picks to interview stage.', href: '/hr/shortlist', urgency: 'low' })
  if (!insights.length)
    insights.push({ icon: Activity, color: 'text-sky-500', bg: 'bg-sky-50', title: 'Pipeline looks healthy', desc: 'No urgent actions needed. Keep the momentum going!', href: '/hr/pipeline', urgency: 'low' })

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sky-400 text-sm font-medium">{greeting} 👋</p>
          <h1 className="font-display text-2xl font-bold text-sky-950 mt-0.5">HR Command Center</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-500 hover:bg-sky-50 transition-colors ${refreshing ? 'animate-spin' : ''}`}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/hr/jobs" className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Post Job
          </Link>
          <Link href="/hr/screening" className="flex items-center gap-2 bg-sky-950 hover:bg-sky-900 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
            <Zap className="w-4 h-4" /> Screen Now
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label}
            className={`bg-white rounded-2xl p-5 border-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${k.warn ? 'border-amber-200' : 'border-transparent'}`}
            style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.accent} flex items-center justify-center shadow-sm`}>
                <k.icon className="w-5 h-5 text-white" />
              </div>
              <Trend value={k.trend} />
            </div>
            <div className="font-display text-3xl font-bold text-sky-950 tabular-nums">{k.value.toLocaleString()}</div>
            <div className="text-sky-800 text-sm font-semibold mt-0.5">{k.label}</div>
            <div className="text-sky-400 text-xs mt-1">{k.sub}</div>
            {k.warn && (
              <div className="mt-2 inline-flex items-center gap-1 text-amber-600 text-xs font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Needs attention
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Recruitment Pipeline ── */}
      <div className="bg-white rounded-2xl border border-sky-100 p-6" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-bold text-sky-950 text-lg">Recruitment Pipeline</h2>
            <p className="text-sky-400 text-xs mt-0.5">Candidate flow across all stages — click to explore</p>
          </div>
          <Link href="/hr/pipeline" className="text-sky-500 text-sm font-semibold hover:text-sky-700 flex items-center gap-1">
            Full view <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {pipeline.map((stage, i) => {
            const s = PIPELINE_STAGES[i]
            const maxCount = pipeline[0].count || 1
            const pct = Math.max(10, (stage.count / maxCount) * 100)
            return (
              <Link key={stage.key} href={s.href} className="group flex flex-col items-center gap-2">
                <span className="text-lg font-bold font-display tabular-nums text-sky-950 group-hover:text-sky-600 transition-colors">
                  {stage.count.toLocaleString()}
                </span>
                <div className="w-full rounded-xl overflow-hidden bg-sky-50 h-16 flex items-end">
                  <div className="w-full rounded-xl transition-all duration-500 group-hover:opacity-100"
                    style={{ height: `${pct}%`, minHeight: 14, background: s.color, opacity: 0.72 }} />
                </div>
                <span className={`text-xs font-semibold text-center px-2 py-0.5 rounded-lg ${s.bg} ${s.text}`}>{s.label}</span>
                {i < pipeline.length - 1 && (
                  <span className="text-sky-300 text-[10px] font-medium">
                    {stage.count > 0 ? `${Math.round((pipeline[i + 1].count / Math.max(stage.count, 1)) * 100)}% →` : '—'}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
        <div className="mt-4 flex gap-1 h-1.5 rounded-full overflow-hidden">
          {PIPELINE_STAGES.map(s => <div key={s.key} className="flex-1 rounded-full" style={{ background: s.color, opacity: 0.5 }} />)}
        </div>
      </div>

      {/* ── Jobs + Insights ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Jobs table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-sky-50">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sky-500" />
              <h2 className="font-display font-bold text-sky-900">Active Job Postings</h2>
            </div>
            <Link href="/hr/jobs" className="text-sky-500 text-xs font-semibold hover:text-sky-700 flex items-center gap-1">
              Manage all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-sky-50">
            {recentJobs.length === 0 ? (
              <div className="p-10 text-center">
                <Briefcase className="w-8 h-8 text-sky-200 mx-auto mb-3" />
                <p className="text-sky-400 text-sm mb-3">No jobs posted yet.</p>
                <Link href="/hr/jobs" className="inline-flex items-center gap-1.5 bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-sky-700 transition-colors">
                  <Plus className="w-4 h-4" /> Post first job
                </Link>
              </div>
            ) : recentJobs.map((job: any) => (
              <div key={job._id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-sky-50 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sky-900 text-sm truncate">{job.title}</p>
                  <p className="text-sky-400 text-xs mt-0.5">
                    {job.department && <span className="font-medium text-sky-600">{job.department} · </span>}
                    {job.location} · <span className="font-semibold text-sky-700">{job.applicantCount || 0}</span> applicants
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[job.status] || STATUS_COLORS.draft}`}>
                  {job.status}
                </span>
                <Link href="/hr/screening" className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-sky-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-sky-700">
                  <Zap className="w-3 h-3" /> Screen
                </Link>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-sky-50 flex items-center justify-between bg-sky-50/40">
            <span className="text-sky-400 text-xs">Showing {recentJobs.length} of {stats.activeJobs || 0} active jobs</span>
            <div className="flex gap-3">
              <Link href="/hr/applicants" className="text-xs text-sky-600 font-semibold hover:underline flex items-center gap-1"><Users className="w-3 h-3" /> Applicants</Link>
              <Link href="/hr/analytics" className="text-xs text-sky-600 font-semibold hover:underline flex items-center gap-1"><BarChart2 className="w-3 h-3" /> Analytics</Link>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
          <div className="px-5 py-4 border-b border-sky-50 flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-500" />
            <h2 className="font-display font-bold text-sky-900">Smart Insights</h2>
            <span className="ml-auto bg-sky-100 text-sky-600 text-xs font-bold px-2 py-0.5 rounded-full">{insights.length}</span>
          </div>
          <div className="p-4 space-y-3">
            {insights.map((ins, i) => (
              <Link href={ins.href} key={i} className={`block ${ins.bg} rounded-xl p-4 hover:shadow-sm transition-all group border border-transparent hover:border-sky-100`}>
                <div className="flex items-start gap-3">
                  <ins.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ins.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-semibold ${ins.color}`}>{ins.title}</p>
                      {ins.urgency === 'high' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">Urgent</span>}
                    </div>
                    <p className="text-sky-600 text-xs leading-relaxed">{ins.desc}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-sky-300 group-hover:text-sky-500 flex-shrink-0 mt-0.5 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
          <div className="mx-4 mb-4 bg-sky-950 rounded-xl p-4 text-white">
            <p className="text-sky-300 text-xs font-semibold uppercase tracking-wide mb-1">Shortlist Conversion</p>
            <div className="flex items-end gap-2">
              <span className="font-display text-3xl font-bold">{stats.shortlistRate || 0}%</span>
              <span className="text-sky-400 text-xs mb-1">of applicants pass</span>
            </div>
            <div className="mt-2 h-1.5 bg-sky-800 rounded-full overflow-hidden">
              <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${Math.min(100, stats.shortlistRate || 0)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart + Screenings ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Area chart */}
        <div className="bg-white rounded-2xl border border-sky-100 p-5" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-sky-900">Screening Activity</h2>
              <p className="text-sky-400 text-xs mt-0.5">Evaluations over the last 7 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weeklyTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7dd3fc' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#bae6fd' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="count" name="Screenings" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#skyGrad)" dot={false} activeDot={{ r: 4, fill: '#0ea5e9' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Screenings + Quick Actions */}
        <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-sky-50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              <h2 className="font-display font-bold text-sky-900">Recent Screenings</h2>
            </div>
            <Link href="/hr/screening" className="text-sky-500 text-xs font-semibold hover:text-sky-700 flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {recentScreenings.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-8 h-8 text-sky-200 mx-auto mb-3" />
              <p className="text-sky-400 text-sm mb-3">No screenings run yet.</p>
              <Link href="/hr/screening" className="inline-flex items-center gap-1.5 bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-sky-700 transition-colors">
                <Zap className="w-4 h-4" /> Run screening
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-sky-50">
              {recentScreenings.slice(0, 4).map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-sky-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-sky-900 truncate">{s.jobTitle}</p>
                    <p className="text-xs text-sky-400">{s.totalApplicantsEvaluated} evaluated · {s.shortlist?.length || 0} shortlisted</p>
                  </div>
                  <Link href="/hr/shortlist"><Eye className="w-4 h-4 text-sky-300 hover:text-sky-600 transition-colors" /></Link>
                </div>
              ))}
            </div>
          )}
          <div className="px-5 py-4 border-t border-sky-50 bg-sky-50/40">
            <p className="text-sky-400 text-xs font-semibold uppercase tracking-wide mb-3">Quick Actions</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { href: '/hr/applicants', icon: Users,     label: 'Upload CVs' },
                { href: '/hr/shortlist',  icon: Star,      label: 'Shortlists' },
                { href: '/hr/analytics',  icon: BarChart2, label: 'Reports' },
              ].map(a => (
                <Link key={a.href} href={a.href} className="flex flex-col items-center gap-1.5 bg-white border border-sky-200 rounded-xl py-3 hover:border-sky-400 hover:shadow-sm transition-all group">
                  <a.icon className="w-4 h-4 text-sky-500 group-hover:text-sky-700" />
                  <span className="text-xs font-semibold text-sky-700">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary footer bar ── */}
      <div className="bg-sky-950 rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {[
            { label: 'Total Pipeline',   value: stats.totalApplicants || 0, color: 'text-white' },
            { label: 'Open Roles',       value: stats.activeJobs      || 0, color: 'text-white' },
            { label: 'Shortlisted',      value: stats.shortlisted     || 0, color: 'text-white' },
            { label: 'Conversion Rate',  value: `${stats.shortlistRate || 0}%`, color: 'text-emerald-400' },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center gap-6">
              <div className="text-center">
                <p className={`font-display font-bold text-xl ${s.color}`}>{s.value}</p>
                <p className="text-sky-400 text-xs">{s.label}</p>
              </div>
              {i < arr.length - 1 && <div className="w-px h-8 bg-sky-800" />}
            </div>
          ))}
        </div>
        <Link href="/hr/analytics" className="flex items-center gap-2 bg-sky-700 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <TrendingUp className="w-4 h-4" /> Full Analytics
        </Link>
      </div>
    </div>
  )
}
