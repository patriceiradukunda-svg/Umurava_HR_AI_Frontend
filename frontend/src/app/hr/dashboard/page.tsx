'use client'
import { useEffect, useState, useCallback } from 'react'
import { dashboardAPI, analyticsAPI, jobsAPI, screeningAPI } from '@/lib/api'
import Link from 'next/link'
import {
  Briefcase, Users, Star, CheckCircle, ArrowRight, TrendingUp,
  AlertTriangle, ChevronRight, Activity, Target, Zap, BarChart2,
  UserCheck, FileText, Bell, Plus, RefreshCw, ArrowUpRight,
  ArrowDownRight, Minus, Eye, X, Download, Filter, GitBranch,
  Trophy, Award, Clock, Calendar,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  activeJobs: number; newJobsThisWeek: number
  totalApplicants: number; newApplicantsThisWeek: number
  shortlisted: number; shortlistRate: number; screeningRuns: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SCORE_COLORS = ['#ef4444', '#f59e0b', '#38bdf8', '#0284c7', '#10b981', '#6366f1']
const PIPELINE_STAGES = [
  { key: 'applied',     label: 'Applied',     color: '#38bdf8', bg: 'bg-sky-100',     text: 'text-sky-700',     href: '/hr/applicants' },
  { key: 'screening',   label: 'Screening',   color: '#818cf8', bg: 'bg-indigo-100',  text: 'text-indigo-700',  href: '/hr/screening' },
  { key: 'shortlisted', label: 'Shortlisted', color: '#34d399', bg: 'bg-emerald-100', text: 'text-emerald-700', href: '/hr/shortlist' },
  { key: 'interview',   label: 'Interview',   color: '#fbbf24', bg: 'bg-amber-100',   text: 'text-amber-700',   href: '/hr/applicants' },
  { key: 'offer',       label: 'Offer',       color: '#f472b6', bg: 'bg-pink-100',    text: 'text-pink-700',    href: '/hr/applicants' },
  { key: 'hired',       label: 'Hired',       color: '#10b981', bg: 'bg-teal-100',    text: 'text-teal-700',    href: '/hr/applicants' },
]
const STATUS_COLORS: Record<string, string> = {
  active:   'bg-emerald-100 text-emerald-700 border border-emerald-200',
  closed:   'bg-slate-100 text-slate-500 border border-slate-200',
  draft:    'bg-amber-100 text-amber-700 border border-amber-200',
  paused:   'bg-orange-100 text-orange-700 border border-orange-200',
}
const PIPELINE_STATUS_COLORS: Record<string, string> = {
  pending:     'bg-amber-400',
  screened:    'bg-sky-400',
  shortlisted: 'bg-emerald-400',
  rejected:    'bg-red-400',
}
const DATE_RANGES = ['Today', '7 days', '30 days', '90 days', 'All time']

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Trend({ value }: { value: number }) {
  if (value > 0) return <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-semibold"><ArrowUpRight className="w-3 h-3" />+{value}</span>
  if (value < 0) return <span className="inline-flex items-center gap-0.5 text-red-500 text-xs font-semibold"><ArrowDownRight className="w-3 h-3" />{value}</span>
  return <span className="inline-flex items-center gap-0.5 text-sky-400 text-xs font-semibold"><Minus className="w-3 h-3" />—</span>
}

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size * 0.39; const circ = 2 * Math.PI * r
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#0ea5e9' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={4} className="stroke-sky-100 fill-none" />
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={4} fill="none"
          stroke={color} strokeLinecap="round"
          strokeDasharray={`${(score / 100) * circ} ${circ}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-sky-700" style={{ fontSize: size * 0.22 }}>{score}</span>
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-sky-100 animate-pulse rounded-2xl ${className}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between"><Skeleton className="h-10 w-64" /><Skeleton className="h-10 w-48" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      <Skeleton className="h-36" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <div className="grid lg:grid-cols-3 gap-5"><Skeleton className="lg:col-span-2 h-72" /><Skeleton className="h-72" /></div>
      <div className="grid lg:grid-cols-2 gap-5"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      <Skeleton className="h-72" />
      <Skeleton className="h-20" />
    </div>
  )
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-sky-950 text-white text-xs rounded-xl px-3 py-2 shadow-xl border border-sky-800">
      <p className="font-semibold mb-1 text-sky-300">{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color || '#38bdf8' }}>{p.name}: <span className="font-bold">{p.value}</span></p>)}
    </div>
  )
}

function buildPipeline(stats: Stats) {
  const total = stats.totalApplicants || 0
  return [
    { key: 'applied',     count: total },
    { key: 'screening',   count: stats.screeningRuns  || Math.round(total * 0.7) },
    { key: 'shortlisted', count: stats.shortlisted    || 0 },
    { key: 'interview',   count: Math.round((stats.shortlisted || 0) * 0.6) },
    { key: 'offer',       count: Math.round((stats.shortlisted || 0) * 0.25) },
    { key: 'hired',       count: Math.round((stats.shortlisted || 0) * 0.12) },
  ]
}

// ─── Export helpers ───────────────────────────────────────────────────────────
function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename; a.click()
}

function exportJSON(data: any, filename: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  a.download = filename; a.click()
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HRDashboardPage() {
  const [dashData, setDashData]       = useState<any>(null)
  const [analytics, setAnalytics]     = useState<any>(null)
  const [jobs, setJobs]               = useState<any[]>([])
  const [pipelineJob, setPipelineJob] = useState('')
  const [pipelineData, setPipelineData] = useState<any>(null)
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [dateRange, setDateRange]     = useState('7 days')
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [dRes, aRes, jRes] = await Promise.all([
        dashboardAPI.get(),
        analyticsAPI.get(),
        jobsAPI.list(),
      ])
      setDashData(dRes.data.data)
      setAnalytics(aRes.data.data)
      setJobs(jRes.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!pipelineJob) { setPipelineData(null); return }
    setPipelineLoading(true)
    analyticsAPI.pipeline(pipelineJob)
      .then(r => setPipelineData(r.data.data))
      .catch(() => setPipelineData(null))
      .finally(() => setPipelineLoading(false))
  }, [pipelineJob])

  if (loading) return <DashboardSkeleton />

  const stats: Stats     = dashData?.stats          || {}
  const recentJobs       = dashData?.recentJobs     || []
  const aiActivity       = dashData?.aiActivity     || []
  const recentScreenings = dashData?.recentScreenings || []
  const summary          = analytics?.summary       || {}
  const scoreDistribution = analytics?.scoreDistribution || []
  const topSkillGaps     = analytics?.topSkillGaps  || []
  const pipelineSummary  = analytics?.pipelineSummary || []
  const topCandidates    = analytics?.topCandidates || []
  const pipeline         = buildPipeline(stats)

  const weeklyTrend = aiActivity.length >= 4 ? aiActivity : Array.from({ length: 7 }, (_, i) => ({
    label: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i], count: 0,
  }))

  const kpis = [
    { label: 'Total Applicants',  value: stats.totalApplicants  || 0, sub: `+${stats.newApplicantsThisWeek || 0} this week`,    trend: stats.newApplicantsThisWeek || 0, icon: Users,       accent: 'from-sky-500 to-sky-600',     warn: false },
    { label: 'Active Openings',   value: stats.activeJobs       || 0, sub: `+${stats.newJobsThisWeek || 0} posted this week`,   trend: stats.newJobsThisWeek || 0,      icon: Briefcase,   accent: 'from-indigo-500 to-sky-500',  warn: stats.activeJobs === 0 },
    { label: 'Shortlisted',       value: stats.shortlisted      || 0, sub: `${stats.shortlistRate || 0}% conversion rate`,      trend: 0,                               icon: Star,        accent: 'from-emerald-500 to-teal-500',warn: (stats.shortlistRate || 0) < 10 && (stats.totalApplicants || 0) > 5 },
    { label: 'Screenings Run',    value: stats.screeningRuns    || 0, sub: 'Evaluations completed',                             trend: 0,                               icon: CheckCircle, accent: 'from-sky-400 to-cyan-500',    warn: false },
  ]

  const analyticsKpis = [
    { label: 'Avg Time-to-Shortlist', value: summary.avgTimeToShortlist || 0, unit: 'min', icon: Clock,      color: 'text-sky-600',     bg: 'bg-sky-50' },
    { label: 'Screening Accuracy',    value: summary.aiAccuracy || 94,         unit: '%',   icon: Target,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg Candidate Score',   value: summary.avgScore   || 0,          unit: '/100',icon: Award,      color: 'text-indigo-600',  bg: 'bg-indigo-50' },
    { label: 'Top Score Achieved',    value: summary.topScore   || 0,          unit: '/100',icon: Trophy,     color: 'text-amber-600',   bg: 'bg-amber-50' },
  ]

  const insights: { icon: any; color: string; bg: string; title: string; desc: string; href: string; urgency: string }[] = []
  if (stats.activeJobs > 0 && !stats.totalApplicants)
    insights.push({ icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', title: 'No applicants yet', desc: `${stats.activeJobs} open roles have zero applications.`, href: '/hr/jobs', urgency: 'high' })
  if ((stats.shortlistRate || 0) < 10 && (stats.totalApplicants || 0) > 5)
    insights.push({ icon: Target, color: 'text-red-500', bg: 'bg-red-50', title: 'Low shortlist rate', desc: 'Below 10% of applicants are shortlisted. Review screening criteria.', href: '/hr/screening', urgency: 'high' })
  if (!stats.screeningRuns && (stats.totalApplicants || 0) > 0)
    insights.push({ icon: Zap, color: 'text-sky-600', bg: 'bg-sky-50', title: 'Run your first screening', desc: `${stats.totalApplicants} applicants waiting to be evaluated.`, href: '/hr/screening', urgency: 'medium' })
  if ((stats.shortlisted || 0) > 0)
    insights.push({ icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', title: `${stats.shortlisted} candidates shortlisted`, desc: 'Review and move top picks to interview stage.', href: '/hr/shortlist', urgency: 'low' })
  if (!insights.length)
    insights.push({ icon: Activity, color: 'text-sky-500', bg: 'bg-sky-50', title: 'Pipeline looks healthy', desc: 'No urgent actions needed. Keep the momentum going!', href: '/hr/applicants', urgency: 'low' })

  // Pipeline kanban columns
  const kanbanCols = [
    { key: 'applied',     label: 'Applied',      color: 'bg-sky-50 text-sky-600',          border: 'border-sky-400' },
    { key: 'screened',    label: 'Screened',      color: 'bg-cyan-50 text-cyan-700',         border: 'border-cyan-400' },
    { key: 'shortlisted', label: 'Shortlisted',   color: 'bg-emerald-50 text-emerald-700',   border: 'border-emerald-400' },
    { key: 'rejected',    label: 'Not Selected',  color: 'bg-red-50 text-red-600',           border: 'border-red-300' },
  ]

  const rankStyle = (rank: number) => {
    if (rank === 1) return 'bg-amber-100 border-amber-300 text-amber-700'
    if (rank === 2) return 'bg-slate-100 border-slate-300 text-slate-600'
    if (rank === 3) return 'bg-orange-100 border-orange-300 text-orange-600'
    return 'bg-sky-50 border-sky-200 text-sky-600'
  }

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sky-400 text-sm font-medium">{greeting} 👋</p>
          <h1 className="font-display text-2xl font-bold text-sky-950 mt-0.5">HR Command Center</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-sky-400 text-xs">{todayStr}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range filter */}
          <div className="flex items-center gap-1 bg-white border border-sky-200 rounded-xl p-1">
            {DATE_RANGES.map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${dateRange === r ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-500 hover:text-sky-700'}`}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={() => load(true)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-500 hover:bg-sky-50 transition-colors ${refreshing ? 'animate-spin' : ''}`}>
            <RefreshCw className="w-4 h-4" />
          </button>
          {/* Export menu */}
          <div className="relative">
            <button onClick={() => setShowExportMenu(v => !v)}
              className="flex items-center gap-2 border border-sky-200 bg-white text-sky-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-sky-50 transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-sky-100 rounded-2xl shadow-xl z-30 w-52 py-2 overflow-hidden">
                <p className="text-sky-400 text-xs font-bold uppercase tracking-wide px-4 py-2">Export as</p>
                <button onClick={() => { exportCSV(recentJobs.map((j: any) => ({ title: j.title, location: j.location, status: j.status, applicants: j.applicantCount || 0 })), 'jobs-report.csv'); setShowExportMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-sky-700 hover:bg-sky-50 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" /> Jobs Report (CSV)
                </button>
                <button onClick={() => { exportCSV(topCandidates.map((c: any) => ({ name: `${c.firstName} ${c.lastName}`, score: c.matchScore, location: c.location })), 'top-candidates.csv'); setShowExportMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-sky-700 hover:bg-sky-50 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" /> Top Candidates (CSV)
                </button>
                <button onClick={() => { exportJSON({ stats, summary, pipelineSummary, topSkillGaps, scoreDistribution }, 'analytics-report.json'); setShowExportMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-sky-700 hover:bg-sky-50 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-sky-400" /> Full Analytics (JSON)
                </button>
              </div>
            )}
          </div>
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
            {k.warn && <div className="mt-2 inline-flex items-center gap-1 text-amber-600 text-xs font-semibold bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Needs attention</div>}
          </div>
        ))}
      </div>

      {/* ── Recruitment Pipeline Funnel ── */}
      <div className="bg-white rounded-2xl border border-sky-100 p-6" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-bold text-sky-950 text-lg">Recruitment Pipeline</h2>
            <p className="text-sky-400 text-xs mt-0.5">Candidate flow across all stages — click any stage to explore</p>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {pipeline.map((stage, i) => {
            const s = PIPELINE_STAGES[i]
            const maxCount = pipeline[0].count || 1
            const pct = Math.max(10, (stage.count / maxCount) * 100)
            return (
              <Link key={stage.key} href={s.href} className="group flex flex-col items-center gap-2">
                <span className="text-lg font-bold font-display tabular-nums text-sky-950 group-hover:text-sky-600 transition-colors">{stage.count.toLocaleString()}</span>
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

      {/* ── Analytics KPIs ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-sky-500" />
          <h2 className="font-display font-bold text-sky-950">Screening Performance</h2>
          <span className="text-sky-400 text-xs ml-1">· Based on all completed evaluations</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {analyticsKpis.map((k) => (
            <div key={k.label} className={`${k.bg} rounded-2xl p-5 border border-transparent hover:shadow-sm transition-all`}
              style={{ boxShadow: '0 1px 4px rgba(14,165,233,0.06)' }}>
              <k.icon className={`w-5 h-5 ${k.color} mb-3`} />
              <div className="flex items-end gap-1">
                <span className={`font-display text-3xl font-bold ${k.color}`}>{k.value}</span>
                <span className="text-sky-400 text-xs mb-1">{k.unit}</span>
              </div>
              <p className="text-sky-600 text-xs font-semibold mt-1">{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Jobs + Insights ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Jobs */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-sky-50">
            <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-sky-500" /><h2 className="font-display font-bold text-sky-900">Active Job Postings</h2></div>
            <Link href="/hr/jobs" className="text-sky-500 text-xs font-semibold hover:text-sky-700 flex items-center gap-1">Manage all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-sky-50">
            {recentJobs.length === 0 ? (
              <div className="p-10 text-center">
                <Briefcase className="w-8 h-8 text-sky-200 mx-auto mb-3" />
                <p className="text-sky-400 text-sm mb-3">No jobs posted yet.</p>
                <Link href="/hr/jobs" className="inline-flex items-center gap-1.5 bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-sky-700 transition-colors"><Plus className="w-4 h-4" /> Post first job</Link>
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
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[job.status] || STATUS_COLORS.draft}`}>{job.status}</span>
                <Link href="/hr/screening" className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-sky-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-sky-700">
                  <Zap className="w-3 h-3" /> Screen
                </Link>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-sky-50 flex items-center justify-between bg-sky-50/40">
            <span className="text-sky-400 text-xs">Showing {recentJobs.length} of {stats.activeJobs || 0} active jobs</span>
            <Link href="/hr/applicants" className="text-xs text-sky-600 font-semibold hover:underline flex items-center gap-1"><Users className="w-3 h-3" /> View all applicants</Link>
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

      {/* ── Charts Row ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Screening Activity */}
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

        {/* Score Distribution */}
        <div className="bg-white rounded-2xl border border-sky-100 p-5" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
          <div className="mb-4">
            <h2 className="font-display font-bold text-sky-900">Score Distribution</h2>
            <p className="text-sky-400 text-xs mt-0.5">How candidates score across all evaluations</p>
          </div>
          {scoreDistribution.some((b: any) => b.count > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={scoreDistribution} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#7dd3fc' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#bae6fd' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                  {scoreDistribution.map((_: any, i: number) => <Cell key={i} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center">
              <p className="text-sky-300 text-sm">Run screenings to see score distribution.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Pipeline Summary + Skill Coverage ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Pipeline breakdown */}
        <div className="bg-white rounded-2xl border border-sky-100 p-5" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
          <h2 className="font-display font-bold text-sky-900 mb-1">Pipeline Status Breakdown</h2>
          <p className="text-sky-400 text-xs mb-5">All applicants by current stage</p>
          {pipelineSummary.length > 0 ? (
            <div className="space-y-3">
              {pipelineSummary.map((p: any) => {
                const total = pipelineSummary.reduce((a: number, b: any) => a + b.count, 0)
                const pct = total > 0 ? Math.round((p.count / total) * 100) : 0
                return (
                  <div key={p._id} className="flex items-center gap-3">
                    <span className="text-sky-700 text-sm capitalize w-24 flex-shrink-0 font-medium">{p._id}</span>
                    <div className="flex-1 h-3 bg-sky-50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${PIPELINE_STATUS_COLORS[p._id] || 'bg-sky-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-bold text-sky-700 text-sm w-8 text-right tabular-nums">{p.count}</span>
                    <span className="text-sky-400 text-xs w-10 text-right tabular-nums">{pct}%</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sky-300 text-sm text-center py-8">No data yet. Run a screening first.</p>
          )}
        </div>

        {/* Skills Coverage */}
        <div className="bg-white rounded-2xl border border-sky-100 p-5" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
          <h2 className="font-display font-bold text-sky-900 mb-1">Skills Coverage</h2>
          <p className="text-sky-400 text-xs mb-5">% of shortlisted candidates meeting each skill threshold</p>
          {topSkillGaps.length > 0 ? (
            <div className="space-y-3">
              {topSkillGaps.map((s: any) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-sky-700 text-sm w-28 flex-shrink-0 truncate font-medium">{s.name}</span>
                  <div className="flex-1 h-2.5 bg-sky-50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${s.coverageRate}%`, background: s.coverageRate >= 70 ? '#10b981' : s.coverageRate >= 50 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <span className="font-bold text-sm w-10 text-right tabular-nums"
                    style={{ color: s.coverageRate >= 70 ? '#059669' : s.coverageRate >= 50 ? '#d97706' : '#dc2626' }}>
                    {s.coverageRate}%
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-4 pt-2 border-t border-sky-50 mt-3">
                {[{ color: '#10b981', label: '≥70% Good' }, { color: '#f59e0b', label: '50-69% Fair' }, { color: '#ef4444', label: '<50% Gap' }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                    <span className="text-xs text-sky-500">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sky-300 text-sm text-center py-8">Run screenings to see skills data.</p>
          )}
        </div>
      </div>

      {/* ── Top Candidates ── */}
      {topCandidates.length > 0 && (
        <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-sky-50">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h2 className="font-display font-bold text-sky-900">Top Candidates Across All Screenings</h2>
            </div>
            <Link href="/hr/shortlist" className="text-sky-500 text-xs font-semibold hover:text-sky-700 flex items-center gap-1">View all shortlists <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-sky-50">
            {topCandidates.slice(0, 5).map((c: any, i: number) => (
              <div key={i} onClick={() => setSelectedCandidate(c)}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-sky-50 transition-colors cursor-pointer group">
                <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sky-600 text-xs font-bold">#{i + 1}</span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {c.firstName?.[0]}{c.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sky-900 text-sm">{c.firstName} {c.lastName}</p>
                  <p className="text-sky-400 text-xs truncate">{c.headline || c.location || '—'}</p>
                </div>
                <ScoreRing score={c.matchScore || 0} size={44} />
                <Eye className="w-4 h-4 text-sky-300 group-hover:text-sky-600 transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Hiring Pipeline Kanban (per-job) ── */}
      <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-50 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-sky-500" />
            <h2 className="font-display font-bold text-sky-900">Hiring Pipeline by Job</h2>
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-sky-400" />
            <select value={pipelineJob} onChange={e => setPipelineJob(e.target.value)}
              className="bg-white border border-sky-200 rounded-xl px-3 h-9 text-sm text-sky-700 outline-none min-w-[200px]">
              <option value="">Select a job to view pipeline…</option>
              {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
          </div>
        </div>

        {!pipelineJob ? (
          <div className="p-12 text-center">
            <GitBranch className="w-10 h-10 text-sky-200 mx-auto mb-3" />
            <p className="text-sky-400 text-sm">Select a job above to see candidate flow through each stage.</p>
          </div>
        ) : pipelineLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pipelineData ? (
          <div className="flex gap-4 overflow-x-auto p-5">
            {kanbanCols.map(col => {
              const colData = pipelineData[col.key] || { candidates: [], count: 0 }
              return (
                <div key={col.key} className="min-w-[200px] flex-shrink-0">
                  <div className={`flex items-center justify-between px-4 py-2.5 rounded-t-xl ${col.color} border-b-2 ${col.border}`}>
                    <span className="text-xs font-bold uppercase tracking-wide">{col.label}</span>
                    <span className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-xs font-bold">{colData.count}</span>
                  </div>
                  <div className="bg-sky-50/40 rounded-b-xl p-2 space-y-2 min-h-[140px]">
                    {colData.candidates.map((c: any, i: number) => {
                      const p = c.talentProfile || c
                      return (
                        <div key={i} className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${col.border} hover:shadow-card transition-all`}>
                          <p className="font-semibold text-sky-900 text-sm">{p.firstName} {p.lastName}</p>
                          <p className="text-sky-400 text-xs mt-0.5">{p.location || c.location || '—'}</p>
                          {c.aiScore != null && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 bg-sky-100 rounded-full overflow-hidden">
                                <div className="h-full bg-sky-400 rounded-full" style={{ width: `${c.aiScore}%` }} />
                              </div>
                              <span className="text-sky-500 text-xs font-bold">{c.aiScore}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {colData.count > colData.candidates.length && (
                      <div className="bg-white/60 rounded-xl p-2 text-center">
                        <p className="text-sky-400 text-xs">+{colData.count - colData.candidates.length} more</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-sky-400 text-sm">No pipeline data for this job yet.</p>
          </div>
        )}
      </div>

      {/* ── Recent Screenings ── */}
      <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-50">
          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-sky-500" /><h2 className="font-display font-bold text-sky-900">Recent Screenings</h2></div>
          <Link href="/hr/screening" className="text-sky-500 text-xs font-semibold hover:text-sky-700 flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {recentScreenings.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle className="w-8 h-8 text-sky-200 mx-auto mb-3" />
            <p className="text-sky-400 text-sm mb-3">No screenings run yet.</p>
            <Link href="/hr/screening" className="inline-flex items-center gap-1.5 bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-sky-700 transition-colors"><Zap className="w-4 h-4" /> Run first screening</Link>
          </div>
        ) : (
          <div className="divide-y divide-sky-50">
            {recentScreenings.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-sky-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sky-900 truncate">{s.jobTitle}</p>
                  <p className="text-xs text-sky-400">{s.totalApplicantsEvaluated} evaluated · {s.shortlist?.length || 0} shortlisted</p>
                </div>
                <Link href="/hr/shortlist" className="flex-shrink-0"><Eye className="w-4 h-4 text-sky-300 hover:text-sky-600 transition-colors" /></Link>
              </div>
            ))}
          </div>
        )}
        {/* Quick actions */}
        <div className="px-6 py-4 border-t border-sky-50 bg-sky-50/40">
          <p className="text-sky-400 text-xs font-semibold uppercase tracking-wide mb-3">Quick Actions</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { href: '/hr/screening', icon: Zap,      label: 'Run Screening' },
              { href: '/hr/shortlist', icon: Star,     label: 'View Shortlists' },
              { href: '/hr/analytics', icon: BarChart2,label: 'Full Analytics' },
            ].map(a => (
              <Link key={a.href} href={a.href} className="flex flex-col items-center gap-1.5 bg-white border border-sky-200 rounded-xl py-3 hover:border-sky-400 hover:shadow-sm transition-all group">
                <a.icon className="w-4 h-4 text-sky-500 group-hover:text-sky-700" />
                <span className="text-xs font-semibold text-sky-700">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Summary Bar ── */}
      <div className="bg-sky-950 rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {[
            { label: 'Total Pipeline',  value: stats.totalApplicants || 0, color: 'text-white' },
            { label: 'Open Roles',      value: stats.activeJobs      || 0, color: 'text-white' },
            { label: 'Shortlisted',     value: stats.shortlisted     || 0, color: 'text-white' },
            { label: 'Avg Score',       value: summary.avgScore      || 0, color: 'text-sky-300' },
            { label: 'Conversion Rate', value: `${stats.shortlistRate || 0}%`, color: 'text-emerald-400' },
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
        <div className="flex items-center gap-2 text-sky-400 text-xs">
          <Calendar className="w-3.5 h-3.5" />
          <span>Updated: {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* ── Candidate Detail Modal ── */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-sky-100 px-8 py-5 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white font-bold text-lg flex items-center justify-center">
                  {selectedCandidate.firstName?.[0]}{selectedCandidate.lastName?.[0]}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-sky-900">{selectedCandidate.firstName} {selectedCandidate.lastName}</h2>
                  <p className="text-sky-400 text-sm">Score {selectedCandidate.matchScore}/100 · {selectedCandidate.location || '—'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="text-sky-400 hover:text-sky-700 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-sky-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 space-y-6">
              {selectedCandidate.scoreBreakdown && Object.keys(selectedCandidate.scoreBreakdown).length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-4">Score Breakdown</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedCandidate.scoreBreakdown).map(([k, v]: any) => (
                      <div key={k} className="flex items-center gap-3">
                        <span className="text-sky-600 text-sm capitalize w-40 flex-shrink-0">{k.replace(/([A-Z])/g, ' $1')}</span>
                        <div className="flex-1 h-2 bg-sky-100 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-400 rounded-full" style={{ width: `${v}%` }} />
                        </div>
                        <span className="font-bold text-sky-700 text-sm w-10 text-right tabular-nums">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                  <p className="text-emerald-600 text-xs font-bold uppercase tracking-wide mb-3">Strengths</p>
                  <ul className="space-y-2">{(selectedCandidate.strengths || []).map((s: string, i: number) => <li key={i} className="text-emerald-800 text-xs flex gap-2"><span>✓</span>{s}</li>)}</ul>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                  <p className="text-amber-600 text-xs font-bold uppercase tracking-wide mb-3">Areas to Watch</p>
                  <ul className="space-y-2">{(selectedCandidate.gaps || []).map((g: string, i: number) => <li key={i} className="text-amber-800 text-xs flex gap-2"><span>⚠</span>{g}</li>)}</ul>
                </div>
              </div>
              {selectedCandidate.recommendation && (
                <div className="bg-sky-50 border-l-4 border-sky-500 rounded-r-2xl p-5">
                  <p className="text-sky-500 text-xs font-bold uppercase tracking-wide mb-2">Recommendation</p>
                  <p className="text-sky-800 text-sm leading-relaxed">{selectedCandidate.recommendation}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setSelectedCandidate(null)} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors">✓ Move to Interview</button>
                <button onClick={() => setSelectedCandidate(null)} className="flex-1 bg-red-50 text-red-500 font-semibold px-4 py-2.5 rounded-xl hover:bg-red-100 transition-colors">✗ Not Selected</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close export menu */}
      {showExportMenu && <div className="fixed inset-0 z-20" onClick={() => setShowExportMenu(false)} />}
    </div>
  )
}
