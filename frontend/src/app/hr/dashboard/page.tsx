'use client'
import { useEffect, useState, useCallback } from 'react'
import { dashboardAPI, analyticsAPI, jobsAPI } from '@/lib/api'
import Link from 'next/link'
import {
  Briefcase, Users, Star, CheckCircle, ArrowRight, AlertTriangle,
  ChevronRight, Activity, Target, Zap, BarChart2, UserCheck,
  FileText, Plus, RefreshCw, ArrowUpRight, ArrowDownRight,
  Minus, Eye, X, Download, Filter, GitBranch, Trophy, Award,
  Clock, Calendar, Lightbulb, TrendingUp,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  activeJobs: number; newJobsThisWeek: number
  totalApplicants: number; newApplicantsThisWeek: number
  shortlisted: number; shortlistRate: number; screeningRuns: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SCORE_COLORS = ['#ef4444','#f59e0b','#38bdf8','#0284c7','#10b981','#6366f1']
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  closed: 'bg-slate-100 text-slate-500 border border-slate-200',
  draft:  'bg-amber-100 text-amber-700 border border-amber-200',
}
const QUICK_RANGES = [
  { label: 'Today',    days: '1'  },
  { label: '7 days',   days: '7'  },
  { label: '30 days',  days: '30' },
  { label: '90 days',  days: '90' },
  { label: 'All time', days: ''   },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Trend({ value }: { value: number }) {
  if (value > 0) return <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-semibold"><ArrowUpRight className="w-3 h-3" />+{value}</span>
  if (value < 0) return <span className="inline-flex items-center gap-0.5 text-red-500 text-xs font-semibold"><ArrowDownRight className="w-3 h-3" />{value}</span>
  return <span className="inline-flex items-center gap-0.5 text-sky-400 text-xs font-semibold"><Minus className="w-3 h-3" />—</span>
}

function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = size * 0.38; const c = 2 * Math.PI * r
  const col = score >= 80 ? '#10b981' : score >= 60 ? '#0ea5e9' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={3} className="stroke-sky-100 fill-none" />
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={3} fill="none"
          stroke={col} strokeLinecap="round" strokeDasharray={`${(score/100)*c} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-sky-800"
        style={{ fontSize: size * 0.22 }}>{score}</span>
    </div>
  )
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border-2 border-sky-100 text-sky-900 text-xs rounded-xl px-3 py-2 shadow-lg">
      <p className="font-semibold mb-1 text-sky-500">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || '#0ea5e9' }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-sky-100 animate-pulse rounded-2xl ${className}`} />
}

function Section({ title, icon: Icon, badge, children, defaultOpen = true }: {
  title: string; icon: any; badge?: string | number; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl border-2 border-sky-100 overflow-hidden shadow-[0_2px_16px_rgba(14,165,233,0.08)]">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-sky-50 transition-colors border-b border-sky-100">
        <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-sky-600" />
        </div>
        <span className="font-display font-bold text-sky-900 flex-1 text-left">{title}</span>
        {badge !== undefined && (
          <span className="bg-sky-100 text-sky-600 text-xs font-bold px-2.5 py-1 rounded-full">{badge}</span>
        )}
        {open
          ? <ChevronUp className="w-4 h-4 text-sky-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-sky-400 flex-shrink-0" />}
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HRDashboardPage() {
  const [dashData,   setDashData]   = useState<any>(null)
  const [analytics,  setAnalytics]  = useState<any>(null)
  const [jobs,       setJobs]       = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)

  // ── Single source of truth for date range ──────────────────────────────────
  const [activeRange, setActiveRange] = useState('7 days')
  const [activeDays,  setActiveDays]  = useState('7')   // synced with range
  const [customFrom,  setCustomFrom]  = useState('')
  const [customTo,    setCustomTo]    = useState('')
  const [showCustom,  setShowCustom]  = useState(false)

  // ── Analytics filters (job/dept only — days comes from activeDays) ─────────
  const [aJobFilter,  setAJobFilter]  = useState('all')
  const [aDeptFilter, setADeptFilter] = useState('all')

  // ── Pipeline ───────────────────────────────────────────────────────────────
  const [pipelineJob,     setPipelineJob]     = useState('')
  const [pipelineData,    setPipelineData]    = useState<any>(null)
  const [pipelineLoading, setPipelineLoading] = useState(false)

  const now       = new Date()
  const hour      = now.getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayStr  = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  // ── Fetch dashboard stats ──────────────────────────────────────────────────
  const fetchDash = useCallback(async (days: string, from?: string, to?: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const params: Record<string, string> = {}
      if (from && to) { params.from = from; params.to = to }
      else if (days)  { params.days = days }

      const [dRes, jRes] = await Promise.all([
        dashboardAPI.get(params),
        jobsAPI.list(),
      ])
      setDashData(dRes.data.data)
      setJobs(jRes.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  // ── Fetch analytics ────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async (days: string, jobId: string, dept: string) => {
    try {
      const params: Record<string, string> = {}
      if (jobId !== 'all') params.jobId      = jobId
      if (dept  !== 'all') params.department = dept
      if (days)            params.days       = days
      const r = await analyticsAPI.get(params)
      setAnalytics(r.data.data)
    } catch {}
  }, [])

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDash(activeDays)
    fetchAnalytics(activeDays, aJobFilter, aDeptFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Quick range pill click ─────────────────────────────────────────────────
  const selectRange = (label: string, days: string) => {
    setActiveRange(label)
    setActiveDays(days)
    setCustomFrom('')
    setCustomTo('')
    setShowCustom(false)
    fetchDash(days, undefined, undefined, true)
    fetchAnalytics(days, aJobFilter, aDeptFilter)
  }

  // ── Custom range apply ─────────────────────────────────────────────────────
  const applyCustomRange = () => {
    if (!customFrom || !customTo) return
    setActiveRange('Custom')
    setActiveDays('')
    setShowCustom(false)
    fetchDash('', customFrom, customTo, true)
    fetchAnalytics('', aJobFilter, aDeptFilter)
  }

  // ── Analytics filter apply ─────────────────────────────────────────────────
  const applyAnalyticsFilters = () => {
    fetchAnalytics(activeDays, aJobFilter, aDeptFilter)
  }

  // ── Pipeline ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pipelineJob) { setPipelineData(null); return }
    setPipelineLoading(true)
    analyticsAPI.pipeline(pipelineJob)
      .then(r => setPipelineData(r.data.data))
      .catch(() => setPipelineData(null))
      .finally(() => setPipelineLoading(false))
  }, [pipelineJob])

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-6">
      <div className="flex justify-between"><Skeleton className="h-12 w-64" /><Skeleton className="h-10 w-80" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      <Skeleton className="h-36" /><Skeleton className="h-72" /><Skeleton className="h-72" />
    </div>
  )

  // ── Data ───────────────────────────────────────────────────────────────────
  const stats              = (dashData?.stats             || {}) as Stats
  const recentJobs         = dashData?.recentJobs         || []
  const aiActivity         = dashData?.aiActivity         || []
  const recentScreenings   = dashData?.recentScreenings   || []
  const summary            = analytics?.summary           || {}
  const scoreDistribution  = analytics?.scoreDistribution || []
  const topSkillGaps       = analytics?.topSkillGaps      || []
  const skillGapInsights   = analytics?.skillGapInsights  || []
  const marketRecs         = analytics?.marketRecommendations || []
  const hiringRecs         = analytics?.hiringRecommendations || []
  const topCandidates      = analytics?.topCandidates     || []
  const trendData          = analytics?.trendData         || []

  const uniqueDepts = [...new Set(jobs.map((j: any) => j.department).filter(Boolean))]

  const kanbanCols = [
    { key:'applied',     label:'Applied',      color:'bg-sky-50 text-sky-600',        border:'border-sky-400'    },
    { key:'screened',    label:'Screened',      color:'bg-cyan-50 text-cyan-700',       border:'border-cyan-400'   },
    { key:'shortlisted', label:'Shortlisted',   color:'bg-emerald-50 text-emerald-700', border:'border-emerald-400'},
    { key:'rejected',    label:'Not Selected',  color:'bg-red-50 text-red-600',         border:'border-red-300'    },
  ]

  const exportDashboard = () => {
    const rows = recentJobs.map((j: any) => ({
      Title: j.title, Department: j.department, Location: j.location,
      Status: j.status, Applicants: j.applicantCount || 0,
    }))
    const h   = Object.keys(rows[0] || {})
    const csv = [h.join(','), ...rows.map((r: any) => h.map((k: string) => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
    const a   = document.createElement('a')
    a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `dashboard-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    setShowExport(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 w-full">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sky-400 text-sm font-medium">{greeting} 👋</p>
          <h1 className="font-display text-2xl font-bold text-sky-900 mt-0.5">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-sky-400 text-xs">{todayStr}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Quick range pills */}
          <div className="flex items-center gap-1 bg-white border-2 border-sky-100 rounded-xl p-1 h-10">
            {QUICK_RANGES.map(r => (
              <button key={r.label}
                onClick={() => selectRange(r.label, r.days)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap min-h-[32px] ${
                  activeRange === r.label
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-sky-500 hover:text-sky-700 hover:bg-sky-50'
                }`}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Custom date — separated by a gap */}
          <div className="relative">
            <button onClick={() => setShowCustom(v => !v)}
              className={`h-10 flex items-center gap-2 px-3 border-2 rounded-xl text-xs font-semibold transition-all ${
                activeRange === 'Custom'
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'bg-white border-sky-100 text-sky-600 hover:border-sky-300'
              }`}>
              <Calendar className="w-3.5 h-3.5" />
              {activeRange === 'Custom' && customFrom ? `${customFrom} → ${customTo}` : 'Custom'}
            </button>
            {showCustom && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowCustom(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white border-2 border-sky-100 rounded-2xl shadow-xl z-30 p-4 w-72">
                  <p className="text-sky-500 text-xs font-bold uppercase tracking-wide mb-3">Custom date range</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-sky-500 font-semibold mb-1 block">From</label>
                      <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                        className="input-sky text-sm" max={customTo || undefined} />
                    </div>
                    <div>
                      <label className="text-xs text-sky-500 font-semibold mb-1 block">To</label>
                      <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                        className="input-sky text-sm" min={customFrom || undefined} />
                    </div>
                    <button onClick={applyCustomRange} disabled={!customFrom || !customTo}
                      className="w-full bg-sky-500 text-white text-sm font-semibold py-2.5 rounded-xl
                                 hover:bg-sky-600 transition-colors disabled:opacity-40 min-h-[44px]">
                      Apply Range
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Gap between Custom and Refresh */}
          <div className="w-2" />

          {/* Refresh */}
          <button
            onClick={() => {
              fetchDash(activeDays, customFrom || undefined, customTo || undefined, true)
              fetchAnalytics(activeDays, aJobFilter, aDeptFilter)
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl
                        border-2 border-sky-100 bg-white text-sky-500
                        hover:bg-sky-50 transition-colors ${refreshing ? 'animate-spin' : ''}`}>
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Export */}
          <div className="relative">
            <button onClick={() => setShowExport(v => !v)}
              className="h-10 flex items-center gap-2 border-2 border-sky-100 bg-white
                         text-sky-600 text-sm font-semibold px-4 rounded-xl hover:bg-sky-50 transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
            {showExport && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white border-2 border-sky-100 rounded-2xl shadow-xl z-30 w-52 py-2">
                  <button onClick={exportDashboard}
                    className="w-full text-left px-4 py-2.5 text-sm text-sky-700 hover:bg-sky-50 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-400" /> Jobs Report (CSV)
                  </button>
                  <button onClick={() => {
                    const d = JSON.stringify({ stats, summary }, null, 2)
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(new Blob([d], { type: 'application/json' }))
                    a.download = 'dashboard.json'; a.click(); setShowExport(false)
                  }} className="w-full text-left px-4 py-2.5 text-sm text-sky-700 hover:bg-sky-50 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-sky-400" /> Full Report (JSON)
                  </button>
                </div>
              </>
            )}
          </div>

          <Link href="/hr/jobs"
            className="h-10 flex items-center gap-2 bg-sky-500 hover:bg-sky-600
                       text-white text-sm font-semibold px-4 rounded-xl transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Post Job
          </Link>

          <Link href="/hr/screening"
            className="h-10 flex items-center gap-2 bg-sky-900 hover:bg-sky-800
                       text-white text-sm font-semibold px-4 rounded-xl transition-colors shadow-sm">
            <Zap className="w-4 h-4" /> Screen Now
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Applicants', value: stats.totalApplicants || 0,  sub:`+${stats.newApplicantsThisWeek||0} this period`, trend: stats.newApplicantsThisWeek || 0, icon: Users,        accent:'from-sky-400 to-sky-600',      warn: false },
          { label:'Active Openings',  value: stats.activeJobs || 0,        sub:`+${stats.newJobsThisWeek||0} posted`,            trend: stats.newJobsThisWeek || 0,        icon: Briefcase,    accent:'from-indigo-400 to-sky-500',   warn: stats.activeJobs === 0 },
          { label:'Shortlisted',      value: stats.shortlisted || 0,       sub:`${stats.shortlistRate||0}% conversion`,          trend: 0,                                  icon: Star,         accent:'from-emerald-400 to-teal-500', warn: (stats.shortlistRate||0) < 10 && (stats.totalApplicants||0) > 5 },
          { label:'Screenings Run',   value: stats.screeningRuns || 0,     sub:'Evaluations completed',                          trend: 0,                                  icon: CheckCircle,  accent:'from-sky-400 to-cyan-500',     warn: false },
        ].map(k => (
          <div key={k.label}
            className={`bg-white rounded-2xl p-5 border-2 transition-all hover:shadow-md hover:-translate-y-0.5
                        ${k.warn ? 'border-amber-200' : 'border-sky-100'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.accent} flex items-center justify-center shadow-sm`}>
                <k.icon className="w-5 h-5 text-white" />
              </div>
              {/* <Trend value={k.trend} /> */}
            </div>
            <div className="text-3xl font-bold text-sky-900 tabular-nums">{k.value.toLocaleString()}</div>
            <div className="text-sky-800 text-sm font-semibold mt-0.5">{k.label}</div>
            {/* <div className="text-sky-400 text-xs mt-1">{k.sub}</div> */}
            {/* {k.warn && (
              <div className="mt-2 inline-flex items-center gap-1 text-amber-600 text-xs font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Needs attention
              </div>
            )} */}
          </div>
        ))}
      </div>

      {/* ── Screening Performance ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label:'Avg Candidate Score', value: summary.avgScore || 0, unit:'/100', icon: Award,  color:'text-indigo-600', bg:'bg-indigo-50 border-indigo-100' },
          { label:'Top Score Achieved',  value: summary.topScore || 0, unit:'/100', icon: Trophy, color:'text-amber-600',  bg:'bg-amber-50 border-amber-100'   },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-5 border-2 transition-all hover:shadow-sm`}>
            <k.icon className={`w-5 h-5 ${k.color} mb-3`} />
            <div className="flex items-end gap-1">
              <span className={`text-3xl font-bold ${k.color}`}>{k.value}</span>
              <span className="text-sky-400 text-xs mb-1">{k.unit}</span>
            </div>
            <p className="text-sky-600 text-xs font-semibold mt-1">{k.label}</p>
            <p className="text-sky-400 text-[10px] mt-0.5">{activeRange}</p>
          </div>
        ))}
      </div>

      {/* ── Active Job Postings (full width, beautiful) ────────────────────── */}
      <Section title="Active Job Postings" icon={Briefcase} badge={stats.activeJobs || 0} defaultOpen>
        {recentJobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-7 h-7 text-sky-400" />
            </div>
            <p className="text-sky-400 text-sm mb-4">No jobs posted yet.</p>
            <Link href="/hr/jobs"
              className="inline-flex items-center gap-2 bg-sky-500 text-white text-sm font-semibold
                         px-5 py-2.5 rounded-xl hover:bg-sky-600 transition-colors">
              <Plus className="w-4 h-4" /> Post your first job
            </Link>
          </div>
        ) : (
          <>
            {/* Grid of job cards */}
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {recentJobs.map((job: any) => (
                <div key={job._id}
                  className="group flex flex-col gap-3 p-4 rounded-xl border-2 border-sky-100
                             hover:border-sky-300 hover:shadow-sm bg-sky-50/40 transition-all">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600
                                    flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Briefcase className="w-4 h-4 text-white" />
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${STATUS_COLORS[job.status] || STATUS_COLORS.draft}`}>
                      {job.status}
                    </span>
                  </div>

                  {/* Title + dept */}
                  <div>
                    <p className="font-display font-bold text-sky-900 text-sm leading-snug">{job.title}</p>
                    <p className="text-sky-400 text-xs mt-0.5">{job.department} · {job.location}</p>
                  </div>

                  {/* Applicants bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sky-500 text-xs font-medium">Applicants</span>
                      <span className="font-display font-bold text-sky-600 text-sm">{job.applicantCount || 0}</span>
                    </div>
                    <div className="h-1.5 bg-sky-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-400 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((job.applicantCount || 0) / 30) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link href="/hr/screening"
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold
                                 bg-sky-500 text-white py-2 rounded-lg hover:bg-sky-600 transition-colors min-h-[36px]">
                      <Zap className="w-3 h-3" /> Screen
                    </Link>
                    <Link href={`/hr/applicants?jobId=${job._id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold
                                 bg-white border-2 border-sky-200 text-sky-600 py-2 rounded-lg
                                 hover:border-sky-400 transition-colors min-h-[36px]">
                      <Eye className="w-3 h-3" /> View
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-sky-100 flex items-center justify-between bg-sky-50/30">
              <span className="text-sky-400 text-xs">{recentJobs.length} of {stats.activeJobs || 0} jobs shown</span>
              <Link href="/hr/jobs"
                className="text-xs text-sky-600 font-semibold hover:underline flex items-center gap-1">
                Manage all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </>
        )}
      </Section>

      {/* ── Skills Gap & Recommendations ──────────────────────────────────── */}
      <Section title="Skills Gap Analysis & Recommendations" icon={AlertTriangle} badge={topSkillGaps.length} defaultOpen>
        {/* Filter bar — job and dept only, NO days filter */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-sky-100 flex-wrap bg-sky-50/40">
          <Filter className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <select value={aJobFilter} onChange={e => setAJobFilter(e.target.value)}
            className="text-xs border-2 border-sky-100 rounded-lg px-3 py-2 text-sky-700 outline-none bg-white min-w-[160px] min-h-[36px]">
            <option value="all">All Jobs</option>
            {jobs.map((j: any) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </select>
          <select value={aDeptFilter} onChange={e => setADeptFilter(e.target.value)}
            className="text-xs border-2 border-sky-100 rounded-lg px-3 py-2 text-sky-700 outline-none bg-white min-h-[36px]">
            <option value="all">All Departments</option>
            {uniqueDepts.map((d: any) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={applyAnalyticsFilters}
            className="text-xs bg-sky-500 text-white font-semibold px-4 py-2 rounded-lg
                       hover:bg-sky-600 transition-colors min-h-[36px]">
            Apply
          </button>
        </div>

        <div className="p-5 grid lg:grid-cols-2 gap-6">
          {/* Skill gap bars */}
          <div>
            <p className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-4">
              Skills Coverage in Shortlisted Pool
            </p>
            {topSkillGaps.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sky-300 text-sm">Run screenings to see skills data.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topSkillGaps.map((s: any) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-sky-700 text-sm w-28 flex-shrink-0 truncate font-medium">{s.name}</span>
                    <div className="flex-1 h-2.5 bg-sky-50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width:`${s.coverageRate}%`, background: s.coverageRate >= 70 ? '#10b981' : s.coverageRate >= 50 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <span className="font-bold text-sm w-10 text-right tabular-nums"
                      style={{ color: s.coverageRate >= 70 ? '#059669' : s.coverageRate >= 50 ? '#d97706' : '#dc2626' }}>
                      {s.coverageRate}%
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-4 pt-2 border-t border-sky-100 mt-2">
                  {[
                    { color:'#10b981', label:'≥70% Good'  },
                    { color:'#f59e0b', label:'50–69% Fair' },
                    { color:'#ef4444', label:'<50% Gap'   },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                      <span className="text-xs text-sky-400">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Recommendations */}
          <div>
            <p className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-4">Recommended Actions</p>
            {marketRecs.length === 0 && hiringRecs.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sky-300 text-sm">Run screenings to generate recommendations.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...hiringRecs, ...marketRecs].slice(0, 5).map((r: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                    <div className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 text-[10px] font-bold
                                    flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-indigo-800 text-xs leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detailed gap analysis */}
        {skillGapInsights.length > 0 && (
          <div className="px-5 pb-5">
            <p className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-3">Detailed Gap Analysis</p>
            <div className="grid md:grid-cols-2 gap-3">
              {skillGapInsights.slice(0, 6).map((g: any, i: number) => (
                <div key={i} className={`rounded-xl p-4 border-2 ${
                  g.severity === 'critical' ? 'bg-red-50 border-red-200'   :
                  g.severity === 'moderate' ? 'bg-amber-50 border-amber-200' :
                                              'bg-sky-50 border-sky-200'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-semibold text-sky-900 text-sm">{g.skill}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${
                      g.severity === 'critical' ? 'bg-red-100 text-red-600'     :
                      g.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                                                  'bg-sky-100 text-sky-600'
                    }`}>{g.severity}</span>
                  </div>
                  <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{
                      width: `${g.coverage}%`,
                      background: g.severity === 'critical' ? '#ef4444' : g.severity === 'moderate' ? '#f59e0b' : '#0ea5e9',
                    }} />
                  </div>
                  <p className="text-sky-600 text-xs leading-relaxed flex items-start gap-1.5">
                    <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5 text-sky-400" />
                    {g.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ── Score Distribution & Trend ────────────────────────────────────── */}
      <Section title="Score Distribution & Applicant Trend" icon={TrendingUp} defaultOpen={false}>
        <div className="p-5 grid lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-3">Candidate Score Buckets</p>
            {scoreDistribution.some((b: any) => b.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scoreDistribution} margin={{ top:4, right:4, left:-24, bottom:0 }}>
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:'#7dd3fc' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#bae6fd' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="count" name="Candidates" radius={[4,4,0,0]}>
                    {scoreDistribution.map((_: any, i: number) => <Cell key={i} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sky-300 text-sm">Run screenings to see distribution.</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-3">Applicant Trend</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData.length ? trendData : aiActivity} margin={{ top:4, right:4, left:-24, bottom:0 }}>
                <defs>
                  <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize:10, fill:'#7dd3fc' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'#bae6fd' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="count" name="Applicants"
                  stroke="#0ea5e9" strokeWidth={2.5} fill="url(#skyG)"
                  dot={false} activeDot={{ r:4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      {/* ── Top Candidates ────────────────────────────────────────────────── */}
      {topCandidates.length > 0 && (
        <Section title="Top Candidates Across All Screenings" icon={Trophy} badge={topCandidates.length} defaultOpen={false}>
          <div className="divide-y divide-sky-50">
            {topCandidates.slice(0, 5).map((c: any, i: number) => (
              <div key={i} onClick={() => setSelectedCandidate(c)}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-sky-50 transition-colors cursor-pointer group">
                <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 text-xs font-bold flex items-center justify-center flex-shrink-0">#{i+1}</span>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {c.firstName?.[0]}{c.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sky-900 text-sm">{c.firstName} {c.lastName}</p>
                  <p className="text-sky-400 text-xs truncate">{c.headline || c.location || '—'}</p>
                </div>
                <ScoreRing score={c.matchScore || 0} size={40} />
                <Eye className="w-4 h-4 text-sky-300 group-hover:text-sky-600 transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-sky-100 bg-sky-50/30">
            <Link href="/hr/shortlist" className="text-xs text-sky-600 font-semibold hover:underline flex items-center gap-1">
              View full shortlists <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Section>
      )}

      {/* ── Hiring Pipeline ───────────────────────────────────────────────── */}
      <Section title="Hiring Pipeline by Job" icon={GitBranch} defaultOpen={false}>
        <div className="flex items-center gap-3 px-5 py-3 border-b border-sky-100 bg-sky-50/40">
          <Filter className="w-3.5 h-3.5 text-sky-400" />
          <select value={pipelineJob} onChange={e => setPipelineJob(e.target.value)}
            className="text-sm border-2 border-sky-100 rounded-xl px-3 py-2 text-sky-700 outline-none bg-white flex-1 max-w-xs min-h-[40px]">
            <option value="">Select a job…</option>
            {jobs.map((j: any) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </select>
        </div>
        {!pipelineJob ? (
          <div className="p-10 text-center"><p className="text-sky-400 text-sm">Select a job to see candidate pipeline.</p></div>
        ) : pipelineLoading ? (
          <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : pipelineData ? (
          <div className="flex gap-4 overflow-x-auto p-5">
            {kanbanCols.map(col => {
              const colData = pipelineData[col.key] || { candidates:[], count:0 }
              return (
                <div key={col.key} className="min-w-[190px] flex-shrink-0">
                  <div className={`flex items-center justify-between px-4 py-2.5 rounded-t-xl ${col.color} border-b-2 ${col.border}`}>
                    <span className="text-xs font-bold uppercase tracking-wide">{col.label}</span>
                    <span className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-xs font-bold">{colData.count}</span>
                  </div>
                  <div className="bg-sky-50/40 rounded-b-xl p-2 space-y-2 min-h-[120px]">
                    {colData.candidates.map((c: any, i: number) => {
                      const p = c.talentProfile || c
                      return (
                        <div key={i} className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${col.border}`}>
                          <p className="font-semibold text-sky-900 text-sm">{p.firstName} {p.lastName}</p>
                          {c.aiScore != null && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 bg-sky-100 rounded-full overflow-hidden">
                                <div className="h-full bg-sky-400 rounded-full" style={{ width:`${c.aiScore}%` }} />
                              </div>
                              <span className="text-sky-500 text-xs font-bold">{c.aiScore}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {colData.count > colData.candidates.length && (
                      <p className="text-sky-400 text-xs text-center py-1">+{colData.count - colData.candidates.length} more</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-10 text-center"><p className="text-sky-400 text-sm">No pipeline data yet.</p></div>
        )}
      </Section>

      {/* ── Recent Screenings ─────────────────────────────────────────────── */}
      <Section title="Recent Screenings" icon={FileText} badge={recentScreenings.length} defaultOpen={false}>
        {recentScreenings.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sky-400 text-sm mb-3">No screenings yet.</p>
            <Link href="/hr/screening"
              className="inline-flex items-center gap-1.5 bg-sky-500 text-white text-sm font-semibold
                         px-4 py-2.5 rounded-xl hover:bg-sky-600 transition-colors">
              <Zap className="w-4 h-4" /> Run first screening
            </Link>
          </div>
        ) : (
          <>
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
                  <Link href="/hr/shortlist"><Eye className="w-4 h-4 text-sky-300 hover:text-sky-600 transition-colors" /></Link>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-sky-100 bg-sky-50/30 flex gap-4">
              <Link href="/hr/screening" className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold hover:text-sky-800"><Zap className="w-3.5 h-3.5" />Run Screening</Link>
              <Link href="/hr/shortlist" className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold hover:text-sky-800"><Star className="w-3.5 h-3.5" />View Shortlists</Link>
            </div>
          </>
        )}
      </Section>

      {/* ── Summary bar ───────────────────────────────────────────────────── */}
      <div className="bg-sky-900 rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          {[
            { label:'Total Pipeline', value: stats.totalApplicants || 0,       color:'text-white' },
            { label:'Open Roles',     value: stats.activeJobs || 0,             color:'text-white' },
            { label:'Shortlisted',    value: stats.shortlisted || 0,            color:'text-white' },
            { label:'Avg Score',      value: summary.avgScore || 0,             color:'text-sky-300' },
            // { label:'Conversion',     value:`${stats.shortlistRate || 0}%`,     color:'text-emerald-400' },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center gap-6">
              <div className="text-center">
                <p className={`font-display font-bold text-xl ${s.color}`}>{s.value}</p>
                <p className="text-sky-400 text-xs">{s.label}</p>
              </div>
              {i < arr.length - 1 && <div className="w-px h-8 bg-sky-700" />}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sky-400 text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>Updated: {now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}</span>
        </div>
      </div>

      {/* ── Candidate modal ───────────────────────────────────────────────── */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-sky-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-sky-100 px-8 py-5 flex items-center justify-between rounded-t-3xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white font-bold text-lg flex items-center justify-center">
                  {selectedCandidate.firstName?.[0]}{selectedCandidate.lastName?.[0]}
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-sky-900">{selectedCandidate.firstName} {selectedCandidate.lastName}</h2>
                  <p className="text-sky-400 text-sm">Score {selectedCandidate.matchScore}/100</p>
                </div>
              </div>
              <button onClick={() => setSelectedCandidate(null)}
                className="text-sky-400 hover:text-sky-700 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-sky-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-5">
              {selectedCandidate.scoreBreakdown && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Score Breakdown</h3>
                  {Object.entries(selectedCandidate.scoreBreakdown).map(([k, v]: any) => (
                    <div key={k} className="flex items-center gap-3 mb-2">
                      <span className="text-sky-600 text-sm capitalize w-36 flex-shrink-0">{k.replace(/([A-Z])/g,' $1')}</span>
                      <div className="flex-1 h-2 bg-sky-100 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-400 rounded-full" style={{ width:`${v}%` }} />
                      </div>
                      <span className="font-bold text-sky-700 text-sm w-8 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                  <p className="text-emerald-600 text-xs font-bold uppercase tracking-wide mb-2">Strengths</p>
                  <ul className="space-y-1">{(selectedCandidate.strengths || []).map((s: string, i: number) => <li key={i} className="text-emerald-800 text-xs flex gap-2"><span>✓</span>{s}</li>)}</ul>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                  <p className="text-amber-600 text-xs font-bold uppercase tracking-wide mb-2">Areas to Watch</p>
                  <ul className="space-y-1">{(selectedCandidate.gaps || []).map((g: string, i: number) => <li key={i} className="text-amber-800 text-xs flex gap-2"><span>⚠</span>{g}</li>)}</ul>
                </div>
              </div>
              {selectedCandidate.recommendation && (
                <div className="bg-sky-50 border-l-4 border-sky-500 rounded-r-2xl p-4">
                  <p className="text-sky-500 text-xs font-bold uppercase tracking-wide mb-1">Recommendation</p>
                  <p className="text-sky-800 text-sm leading-relaxed">{selectedCandidate.recommendation}</p>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setSelectedCandidate(null)}
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors min-h-[44px]">
                  ✓ Move to Interview
                </button>
                <button onClick={() => setSelectedCandidate(null)}
                  className="flex-1 bg-red-50 text-red-500 font-semibold px-4 py-2.5 rounded-xl hover:bg-red-100 transition-colors min-h-[44px]">
                  ✗ Not Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
