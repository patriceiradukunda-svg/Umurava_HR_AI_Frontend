'use client'
import { useEffect, useState, useCallback } from 'react'
import { applicantsAPI, jobsAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  Search, Eye, Trash2, X, Loader2, Users, Filter,
  Plus, Download, ChevronDown, ChevronUp, ArrowUpDown,
  Calendar, Clock, Briefcase, MapPin, Star,
  AlertTriangle, UserPlus, SlidersHorizontal, RefreshCw,
  Linkedin, Github, Globe, GraduationCap, Award, Code2,
  Languages, CheckCircle, Minus, FileText, Building2,
  TrendingUp, BookOpen,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const SKILL_LEVELS   = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
const LANG_LEVELS    = ['Basic', 'Conversational', 'Fluent', 'Native']
const AVAIL_STATUSES = ['Immediately', 'In 2 weeks', 'In 1 month', 'In 3 months', 'Not available']
const AVAIL_TYPES    = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Hybrid']
const SORT_OPTIONS   = [
  { value: 'newest',     label: 'Recently Applied' },
  { value: 'oldest',     label: 'Oldest First' },
  { value: 'score_desc', label: 'Highest Score' },
  { value: 'score_asc',  label: 'Lowest Score' },
  { value: 'name',       label: 'Name A–Z' },
]
const STATUS_META: Record<string, { label: string; badge: string; dot: string }> = {
  pending:     { label: 'Pending',     badge: 'bg-amber-100 text-amber-700 border border-amber-200',       dot: 'bg-amber-400' },
  screened:    { label: 'Screened',    badge: 'bg-sky-100 text-sky-700 border border-sky-200',             dot: 'bg-sky-400' },
  shortlisted: { label: 'Shortlisted', badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  rejected:    { label: 'Rejected',    badge: 'bg-red-100 text-red-500 border border-red-200',             dot: 'bg-red-400' },
}
// "Added via" — no CSV upload row shown; just manual vs platform
const VIA_META: Record<string, { label: string; color: string; icon: string }> = {
  umurava_platform: { label: 'Self-Applied',  color: 'bg-sky-100 text-sky-700',     icon: '🌐' },
  csv_upload:       { label: 'CSV Import',    color: 'bg-indigo-100 text-indigo-700',icon: '📄' },
  pdf_upload:       { label: 'PDF Import',    color: 'bg-violet-100 text-violet-700',icon: '📋' },
  manual:           { label: 'HR Added',      color: 'bg-teal-100 text-teal-700',    icon: '✍️' },
}
const SHOW_MORE_STEP = 20   // how many more rows to show on each "Show More" click

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(d: string) {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function deadlineInfo(d: string) {
  if (!d) return null
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (diff < 0)   return { label: 'Expired',       color: 'text-red-500 bg-red-50 border-red-200' }
  if (diff === 0) return { label: 'Closes today',  color: 'text-red-500 bg-red-50 border-red-200' }
  if (diff <= 3)  return { label: `${diff}d left`, color: 'text-amber-600 bg-amber-50 border-amber-200' }
  return           { label: `${diff}d left`,        color: 'text-sky-600 bg-sky-50 border-sky-200' }
}
function scoreColor(s: number) {
  if (s >= 80) return '#10b981'
  if (s >= 60) return '#0ea5e9'
  if (s >= 40) return '#f59e0b'
  return '#ef4444'
}
function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename; a.click()
}

// ─── UI Components ────────────────────────────────────────────────────────────
function FL({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <label className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-1.5 block">
      {children}{req && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function SectionHead({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-sky-100 mb-5">
      <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-sky-600" />
      </div>
      <div>
        <p className="font-display font-bold text-sky-900 text-sm">{title}</p>
        {subtitle && <p className="text-sky-400 text-xs mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function ScoreRing({ score, size = 40 }: { score: number; size?: number }) {
  const r = size * 0.38; const c = 2 * Math.PI * r
  const col = scoreColor(score)
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={3} className="stroke-sky-100 fill-none" />
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={3} fill="none"
          stroke={col} strokeLinecap="round" strokeDasharray={`${(score/100)*c} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-sky-800"
        style={{ fontSize: size * 0.24 }}>{score}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HRApplicantsPage() {
  const [allApplicants, setAllApplicants] = useState<any[]>([])  // full list after filters/sort
  const [jobs, setJobs]       = useState<any[]>([])
  const [stats, setStats]     = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected]     = useState<any>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addBusy, setAddBusy]       = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showExport, setShowExport] = useState(false)
  const [visibleCount, setVisibleCount] = useState(SHOW_MORE_STEP)

  // Filters
  const [search, setSearch]       = useState('')
  const [jobFilter, setJobFilter] = useState('all')
  const [statusFilter, setStatus] = useState('all')
  const [viaFilter, setVia]       = useState('all')
  const [deptFilter, setDept]     = useState('all')
  const [sortBy, setSort]         = useState('newest')

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    defaultValues: {
      jobId: '', firstName: '', lastName: '', email: '', headline: '',
      bio: '', location: '',
      skills:   [{ name: '', level: 'Intermediate', yearsOfExperience: 1 }],
      experience: [{ company: '', role: '', startDate: '', endDate: '', description: '', technologies: '', isCurrent: false }],
      education:  [{ institution: '', degree: '', fieldOfStudy: '', startYear: new Date().getFullYear() - 4, endYear: new Date().getFullYear() }],
      certifications: [] as { name: string; issuer: string; issueDate: string }[],
      languages:  [{ name: '', proficiency: 'Fluent' }],
      projects:   [] as { name: string; description: string; technologies: string; role: string; link: string }[],
      availabilityStatus: 'Immediately', availabilityType: 'Full-time',
      linkedin: '', github: '', portfolio: '',
    }
  })
  const skillsArr = useFieldArray({ control, name: 'skills' })
  const expArr    = useFieldArray({ control, name: 'experience' })
  const eduArr    = useFieldArray({ control, name: 'education' })
  const certArr   = useFieldArray({ control, name: 'certifications' })
  const langArr   = useFieldArray({ control, name: 'languages' })
  const projArr   = useFieldArray({ control, name: 'projects' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, jRes, sRes] = await Promise.all([
        applicantsAPI.list({
          jobId:  jobFilter    !== 'all' ? jobFilter    : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          source: viaFilter    !== 'all' ? viaFilter    : undefined,
          search: search || undefined,
          limit: 500,  // load all, paginate client-side with "show more"
        }),
        jobsAPI.list(),
        applicantsAPI.stats(),
      ])

      let data: any[] = aRes.data.data || []

      // Department filter (client-side — join with jobs)
      const jobMap: Record<string, any> = {}
      const jList: any[] = jRes.data.data || []
      jList.forEach((j: any) => { jobMap[j._id] = j })

      if (deptFilter !== 'all') {
        data = data.filter(a => {
          const j = jobMap[a.jobId?._id || a.jobId]
          return j?.department === deptFilter
        })
      }

      // Sort
      if      (sortBy === 'newest')     data = [...data].sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
      else if (sortBy === 'oldest')     data = [...data].sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime())
      else if (sortBy === 'score_desc') data = [...data].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
      else if (sortBy === 'score_asc')  data = [...data].sort((a, b) => (a.aiScore || 0) - (b.aiScore || 0))
      else if (sortBy === 'name')       data = [...data].sort((a, b) => (a.talentProfile?.firstName || '').localeCompare(b.talentProfile?.firstName || ''))

      setAllApplicants(data)
      setVisibleCount(SHOW_MORE_STEP)  // reset on new filter
      setJobs(jList)
      setStats(sRes.data.data || {})
    } catch { toast.error('Failed to load applicants') }
    finally { setLoading(false) }
  }, [search, jobFilter, statusFilter, viaFilter, deptFilter, sortBy])

  useEffect(() => { load() }, [load])

  // The slice shown in the table
  const visibleApplicants = allApplicants.slice(0, visibleCount)
  const hasMore = visibleCount < allApplicants.length

  const updateStatus = async (id: string, status: string) => {
    try {
      await applicantsAPI.updateStatus(id, status)
      toast.success(`Status → ${status}`)
      load()
      if (selected?._id === id) setSelected((p: any) => ({ ...p, status }))
    } catch { toast.error('Failed to update status') }
  }

  const deleteApplicant = async (id: string) => {
    if (!confirm('Delete this applicant? This cannot be undone.')) return
    try { await applicantsAPI.delete(id); toast.success('Applicant deleted'); setSelected(null); load() }
    catch { toast.error('Failed to delete') }
  }

  const toggleRow = (id: string) => setExpandedRows(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const onAddSubmit = async (data: any) => {
    setAddBusy(true)
    try {
      const payload = {
        jobId: data.jobId,
        source: 'manual',
        talentProfile: {
          firstName: data.firstName,
          lastName:  data.lastName,
          email:     data.email,
          headline:  data.headline,
          bio:       data.bio,
          location:  data.location,
          skills: (data.skills || []).filter((s: any) => s.name).map((s: any) => ({
            name: s.name, level: s.level, yearsOfExperience: Number(s.yearsOfExperience) || 0,
          })),
          experience: (data.experience || []).filter((e: any) => e.company).map((e: any) => ({
            company: e.company, role: e.role,
            startDate: e.startDate, endDate: e.isCurrent ? 'Present' : e.endDate,
            description: e.description,
            technologies: e.technologies?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
            isCurrent: !!e.isCurrent,
          })),
          education: (data.education || []).filter((e: any) => e.institution).map((e: any) => ({
            institution: e.institution, degree: e.degree, fieldOfStudy: e.fieldOfStudy,
            startYear: Number(e.startYear), endYear: Number(e.endYear),
          })),
          certifications: (data.certifications || []).filter((c: any) => c.name).map((c: any) => ({
            name: c.name, issuer: c.issuer, issueDate: c.issueDate,
          })),
          languages: (data.languages || []).filter((l: any) => l.name).map((l: any) => ({
            name: l.name, proficiency: l.proficiency,
          })),
          projects: (data.projects || []).filter((p: any) => p.name).map((p: any) => ({
            name: p.name, description: p.description, role: p.role, link: p.link,
            technologies: p.technologies?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
            startDate: '', endDate: '',
          })),
          // availability: { status: data.availabilityStatus, type: data.availabilityType },
          availability: { status: data.status, type: data.type },
          socialLinks: {
            linkedin:  data.linkedin  || undefined,
            github:    data.github    || undefined,
            portfolio: data.portfolio || undefined,
          },
        },
      }
      await applicantsAPI.create(payload)
      toast.success('Applicant added successfully')
      setShowAddModal(false)
      reset()
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to add applicant')
    } finally { setAddBusy(false) }
  }

  const handleExport = () => {
    const jobMap: Record<string, any> = {}
    jobs.forEach(j => { jobMap[j._id] = j })
    const rows = allApplicants.map(a => {
      const p = a.talentProfile || {}
      const job = jobMap[a.jobId?._id || a.jobId]
      const dl = job?.applicationDeadline ? deadlineInfo(job.applicationDeadline) : null
      return {
        'First Name':  p.firstName,
        'Last Name':   p.lastName,
        Email:         p.email,
        Location:      p.location,
        Headline:      p.headline,
        Job:           job?.title || '—',
        Department:    job?.department || '—',
        'Job Posted':  job?.createdAt ? fmtDate(job.createdAt) : '—',
        'Applied On':  fmtDate(a.appliedAt),
        'Deadline':    job?.applicationDeadline ? fmtDate(job.applicationDeadline) : '—',
        'Deadline Status': dl?.label || '—',
        'Added Via':   VIA_META[a.source]?.label || a.source,
        'Status':      a.status,
        'AI Score':    a.aiScore ?? '—',
        Skills:        (p.skills || []).map((s: any) => s.name).join('; '),
        Experience:    (p.experience || []).map((e: any) => `${e.role} @ ${e.company}`).join('; '),
      }
    })
    exportCSV(rows, `applicants-${new Date().toISOString().split('T')[0]}.csv`)
    setShowExport(false)
    toast.success('Exported successfully')
  }

  const activeFilters = [jobFilter, statusFilter, viaFilter, deptFilter].filter(f => f !== 'all').length
  const activeJobs = jobs.filter(j => j.status === 'active')
  const uniqueDepts = [...new Set(jobs.map(j => j.department).filter(Boolean))]
  const jobMap: Record<string, any> = {}
  jobs.forEach(j => { jobMap[j._id] = j })

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-sky-950">Applicants</h1>
          <p className="text-sky-400 text-sm mt-1">
            <span className="font-semibold text-sky-700">{stats.total || 0}</span> total ·{' '}
            <span className="font-semibold text-amber-600">{stats.pending || 0}</span> pending ·{' '}
            <span className="font-semibold text-sky-600">{stats.screened || 0}</span> screened ·{' '}
            <span className="font-semibold text-emerald-600">{stats.shortlisted || 0}</span> shortlisted ·{' '}
            <span className="font-semibold text-red-400">{stats.rejected || 0}</span> rejected
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => load()} className="w-9 h-9 flex items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-500 hover:bg-sky-50 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          {/* Export */}
          <div className="relative">
            <button onClick={() => setShowExport(v => !v)}
              className="flex items-center gap-2 border border-sky-200 bg-white text-sky-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-sky-50 transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
            {showExport && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white border border-sky-100 rounded-2xl shadow-xl z-30 w-52 py-2">
                  <p className="text-sky-400 text-xs font-bold uppercase tracking-wide px-4 py-2">Export current view</p>
                  <button onClick={handleExport}
                    className="w-full text-left px-4 py-2.5 text-sm text-sky-700 hover:bg-sky-50 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-400" /> Applicants CSV ({allApplicants.length})
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={() => { reset(); setShowAddModal(true) }}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-5 py-2 rounded-xl transition-colors shadow-sm">
            <UserPlus className="w-4 h-4" /> Add Applicant
          </button>
        </div>
      </div>

      {/* ── Status stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending',     value: stats.pending     || 0, filter: 'pending',     color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-300' },
          { label: 'Screened',    value: stats.screened    || 0, filter: 'screened',    color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-300' },
          { label: 'Shortlisted', value: stats.shortlisted || 0, filter: 'shortlisted', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
          { label: 'Rejected',    value: stats.rejected    || 0, filter: 'rejected',    color: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-300' },
        ].map(s => (
          <button key={s.label} onClick={() => setStatus(statusFilter === s.filter ? 'all' : s.filter)}
            className={`${s.bg} border-2 ${statusFilter === s.filter ? s.border : 'border-transparent'} rounded-2xl p-4 text-left hover:shadow-sm transition-all`}>
            <p className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sky-500 text-xs font-semibold mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* ── Filters panel ── */}
      <div className="bg-white rounded-2xl border border-sky-100 p-4 space-y-3" style={{ boxShadow: '0 1px 4px rgba(14,165,233,0.06)' }}>
        {/* Primary row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-3 h-10 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email…" className="outline-none text-sm text-sky-800 placeholder-sky-300 bg-transparent flex-1" />
            {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-sky-300 hover:text-sky-600" /></button>}
          </div>
          {/* Sort */}
          <div className="flex items-center gap-2 bg-white border border-sky-200 rounded-xl px-3 h-10 min-w-[170px]">
            <ArrowUpDown className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <select value={sortBy} onChange={e => setSort(e.target.value)} className="outline-none text-sm text-sky-700 bg-transparent cursor-pointer flex-1">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {/* Filters toggle */}
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-semibold transition-all ${showFilters || activeFilters > 0 ? 'bg-sky-600 text-white border-sky-600' : 'bg-white border-sky-200 text-sky-600 hover:border-sky-400'}`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters {activeFilters > 0 && <span className="bg-white/30 text-xs px-1.5 py-0.5 rounded-full font-bold">{activeFilters}</span>}
          </button>
          {activeFilters > 0 && (
            <button onClick={() => { setStatus('all'); setJobFilter('all'); setVia('all'); setDept('all') }}
              className="text-xs text-sky-500 hover:text-sky-700 font-semibold underline">Clear all</button>
          )}
          <span className="ml-auto text-sky-400 text-xs font-medium">
            Showing <span className="font-semibold text-sky-600">{Math.min(visibleCount, allApplicants.length)}</span> of <span className="font-semibold text-sky-600">{allApplicants.length}</span>
          </span>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="pt-3 border-t border-sky-50 space-y-3">
            {/* Row 1: Status */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-sky-400 w-16 flex-shrink-0">Status</span>
              <div className="flex gap-1.5 flex-wrap">
                {['all','pending','screened','shortlisted','rejected'].map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition-all ${statusFilter === s ? 'bg-sky-600 text-white shadow-sm' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'}`}>
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>
            </div>
            {/* Row 2: Job + Department */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-sky-400 w-16 flex-shrink-0">Job</span>
              <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}
                className="text-xs border border-sky-200 rounded-lg px-3 py-1.5 text-sky-700 outline-none bg-white min-w-[180px] max-w-[260px]">
                <option value="all">All Jobs</option>
                {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
              </select>
              <span className="text-xs font-bold text-sky-400 flex-shrink-0">Dept</span>
              <select value={deptFilter} onChange={e => setDept(e.target.value)}
                className="text-xs border border-sky-200 rounded-lg px-3 py-1.5 text-sky-700 outline-none bg-white">
                <option value="all">All Departments</option>
                {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {/* Row 3: Added via */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-sky-400 w-16 flex-shrink-0">Added via</span>
              <div className="flex gap-1.5 flex-wrap">
                {[['all','All'], ['umurava_platform','Self-Applied'], ['manual','HR Added'], ['csv_upload','CSV Import'], ['pdf_upload','PDF Import']].map(([v, l]) => (
                  <button key={v} onClick={() => setVia(v)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${viaFilter === v ? 'bg-sky-600 text-white shadow-sm' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sky-100 bg-sky-50/70">
                {[
                  'Candidate', 'Applied For', 'Job Posted', 'Applied On', 'Score', 'Status', ''
                ].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-sky-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="px-5 py-3">
                      <div className="h-9 bg-sky-50 animate-pulse rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : allApplicants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-20 text-center">
                    <Users className="w-10 h-10 text-sky-200 mx-auto mb-3" />
                    <p className="text-sky-500 font-semibold">No applicants found</p>
                    <p className="text-sky-300 text-sm mt-1">
                      {activeFilters > 0 || search ? 'Try adjusting your filters or search.' : 'Add applicants manually or run a screening.'}
                    </p>
                    <button onClick={() => { reset(); setShowAddModal(true) }}
                      className="mt-4 inline-flex items-center gap-2 bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-sky-700 transition-colors">
                      <UserPlus className="w-4 h-4" /> Add First Applicant
                    </button>
                  </td>
                </tr>
              ) : (
                visibleApplicants.flatMap(a => {
                  const p   = a.talentProfile || {}
                  const job = jobMap[a.jobId?._id || a.jobId]
                  const sm  = STATUS_META[a.status] || STATUS_META.pending
                  const via = VIA_META[a.source]    || { label: a.source, color: 'bg-sky-100 text-sky-700', icon: '•' }
                  const dl  = job?.applicationDeadline ? deadlineInfo(job.applicationDeadline) : null
                  const isExpanded = expandedRows.has(a._id)

                  return [
                    // ── Main row ──
                    <tr key={a._id} className="hover:bg-sky-50/40 transition-colors group">
                      {/* Candidate */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                            {p.firstName?.[0]}{p.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-sky-900 text-sm whitespace-nowrap">{p.firstName} {p.lastName}</p>
                            <p className="text-sky-400 text-xs">{p.email}</p>
                            {p.location && (
                              <p className="text-sky-300 text-xs flex items-center gap-0.5 mt-0.5">
                                <MapPin className="w-2.5 h-2.5" />{p.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Applied For */}
                      <td className="px-5 py-3.5 max-w-[150px]">
                        <p className="text-sky-800 text-sm font-medium truncate">{job?.title || '—'}</p>
                        {job?.department && <p className="text-sky-400 text-xs">{job.department}</p>}
                      </td>
                      {/* Job Posted */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sky-500 text-xs">
                          <Briefcase className="w-3 h-3" />
                          {job?.createdAt ? timeAgo(job.createdAt) : '—'}
                        </div>
                        {job?.createdAt && <p className="text-sky-300 text-[11px] mt-0.5">{fmtDate(job.createdAt)}</p>}
                      </td>
                      {/* Applied On */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sky-700 text-xs font-medium">
                          <Calendar className="w-3 h-3" />
                          {timeAgo(a.appliedAt)}
                        </div>
                        <p className="text-sky-300 text-[11px] mt-0.5">{fmtDate(a.appliedAt)}</p>
                      </td>
                      {/* Deadline */}
                      {/* <td className="px-5 py-3.5 whitespace-nowrap">
                        {dl ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${dl.color}`}>{dl.label}</span>
                        ) : <span className="text-sky-200 text-xs">—</span>}
                      </td> */}
                      {/* Added Via */}
                      {/* <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${via.color}`}>
                          <span>{via.icon}</span>{via.label}
                        </span>
                      </td> */}
                      {/* Score */}
                      <td className="px-5 py-3.5">
                        {a.aiScore != null ? <ScoreRing score={a.aiScore} size={36} /> : <span className="text-sky-200 text-xs">—</span>}
                      </td>
                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <select value={a.status} onChange={e => updateStatus(a._id, e.target.value)}
                          className={`text-xs font-semibold border rounded-full px-2.5 py-1 cursor-pointer outline-none ${sm.badge} bg-transparent`}>
                          {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                        </select>
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelected(a)} title="View full profile"
                            className="text-sky-400 hover:text-sky-700 p-1.5 rounded-lg hover:bg-sky-50 transition-colors">
                            {/* <Eye className="w-4 h-4" /> */} View
                          </button>
                          <button onClick={() => toggleRow(a._id)} title={isExpanded ? 'Collapse' : 'Quick view'}
                            className="text-sky-400 hover:text-sky-700 p-1.5 rounded-lg hover:bg-sky-50 transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button onClick={() => deleteApplicant(a._id)} title="Delete"
                            className="text-red-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>,

                    // ── Expanded inline detail ──
                    isExpanded && (
                      <tr key={`${a._id}-exp`} className="bg-sky-50/20">
                        <td colSpan={9} className="px-6 pb-5 pt-1">
                          <div className="bg-white rounded-2xl border border-sky-100 p-5 grid md:grid-cols-3 gap-6">
                            {/* Col 1: Profile */}
                            <div>
                              <p className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-3">Profile</p>
                              {p.headline && <p className="text-sky-900 text-sm font-semibold mb-2 leading-snug">{p.headline}</p>}
                              {p.bio && <p className="text-sky-600 text-xs leading-relaxed mb-3">{p.bio}</p>}
                              <div className="space-y-1 text-xs text-sky-500">
                                {a.appliedAt   && <p className="flex items-center gap-1"><Calendar className="w-3 h-3" />Applied: {fmtDate(a.appliedAt)}</p>}
                                {job?.createdAt && <p className="flex items-center gap-1"><Briefcase className="w-3 h-3" />Job posted: {fmtDate(job.createdAt)}</p>}
                                {job?.applicationDeadline && <p className="flex items-center gap-1"><Clock className="w-3 h-3" />Deadline: {fmtDate(job.applicationDeadline)}</p>}
                              </div>
                              <div className="flex gap-2 mt-3">
                                {p.socialLinks?.linkedin  && <a href={p.socialLinks.linkedin}  target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 transition-colors"><Linkedin className="w-4 h-4" /></a>}
                                {p.socialLinks?.github    && <a href={p.socialLinks.github}    target="_blank" rel="noreferrer" className="text-sky-700 hover:text-sky-900 transition-colors"><Github className="w-4 h-4" /></a>}
                                {p.socialLinks?.portfolio && <a href={p.socialLinks.portfolio} target="_blank" rel="noreferrer" className="text-teal-600 hover:text-teal-800 transition-colors"><Globe className="w-4 h-4" /></a>}
                              </div>
                            </div>
                            {/* Col 2: Skills + Languages */}
                            <div>
                              <p className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-3">Skills</p>
                              <div className="flex flex-wrap gap-1.5">
                                {(p.skills || []).slice(0, 8).map((s: any) => (
                                  <span key={s.name} className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-medium">{s.name}</span>
                                ))}
                                {(p.skills || []).length > 8 && <span className="text-xs text-sky-400">+{p.skills.length - 8}</span>}
                              </div>
                              {(p.languages || []).length > 0 && (
                                <div className="mt-4">
                                  <p className="text-xs font-bold text-sky-400 mb-2">Languages</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {p.languages.map((l: any) => (
                                      <span key={l.name} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{l.name} · {l.proficiency}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(p.certifications || []).length > 0 && (
                                <div className="mt-4">
                                  <p className="text-xs font-bold text-sky-400 mb-2">Certifications</p>
                                  {p.certifications.slice(0, 2).map((c: any) => (
                                    <p key={c.name} className="text-xs text-sky-600"> {c.name}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Col 3: Experience + Actions */}
                            <div>
                              <p className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-3">Experience</p>
                              {(p.experience || []).slice(0, 2).map((e: any, i: number) => (
                                <div key={i} className="mb-3">
                                  <p className="text-sky-800 text-xs font-semibold">{e.role}</p>
                                  <p className="text-sky-500 text-xs">{e.company} · {e.startDate}–{e.isCurrent ? 'Present' : e.endDate}</p>
                                </div>
                              ))}
                              {(p.education || []).slice(0, 1).map((e: any, i: number) => (
                                <div key={i} className="mb-3">
                                  <p className="text-xs font-bold text-sky-400 mb-1">Education</p>
                                  <p className="text-sky-800 text-xs font-semibold">{e.degree}</p>
                                  <p className="text-sky-500 text-xs">{e.institution} · {e.endYear}</p>
                                </div>
                              ))}
                              <div className="flex gap-2 mt-4">
                                <button onClick={() => updateStatus(a._id, 'shortlisted')}
                                  className="flex-1 text-xs bg-emerald-600 text-white font-semibold py-2 rounded-xl hover:bg-emerald-700 transition-colors">
                                  Shortlist
                                </button>
                                <button onClick={() => updateStatus(a._id, 'rejected')}
                                  className="flex-1 text-xs bg-red-50 text-red-500 font-semibold py-2 rounded-xl hover:bg-red-100 transition-colors">
                                   Reject
                                </button>
                              </div>
                              <button onClick={() => setSelected(a)}
                                className="w-full mt-2 text-xs text-sky-500 font-semibold py-1.5 rounded-xl hover:bg-sky-50 transition-colors flex items-center justify-center gap-1">View
                                {/* <Eye className="w-3 h-3" /> Full Profile */}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  ].filter(Boolean)
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Show More / footer ── */}
        {!loading && allApplicants.length > 0 && (
          <div className="px-6 py-4 border-t border-sky-50 bg-sky-50/30 flex items-center justify-between gap-4">
            <p className="text-sky-400 text-xs">
              Showing <span className="font-semibold text-sky-600">{Math.min(visibleCount, allApplicants.length)}</span> of <span className="font-semibold text-sky-600">{allApplicants.length}</span> applicants
            </p>
            <div className="flex items-center gap-3">
              {hasMore && (
                <>
                  <select
                    onChange={e => setVisibleCount(Number(e.target.value))}
                    value={visibleCount}
                    className="text-xs border border-sky-200 rounded-lg px-2 py-1.5 text-sky-600 outline-none bg-white cursor-pointer"
                  >
                    {[20, 50, 100, 200].filter(n => n <= allApplicants.length || n === 20).map(n => (
                      <option key={n} value={n}>Show {n}</option>
                    ))}
                    <option value={allApplicants.length}>Show all ({allApplicants.length})</option>
                  </select>
                  <button onClick={() => setVisibleCount(v => Math.min(v + SHOW_MORE_STEP, allApplicants.length))}
                    className="flex items-center gap-2 text-xs font-semibold bg-sky-600 text-white px-4 py-1.5 rounded-xl hover:bg-sky-700 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" /> Show {Math.min(SHOW_MORE_STEP, allApplicants.length - visibleCount)} more
                  </button>
                </>
              )}
              {visibleCount > SHOW_MORE_STEP && (
                <button onClick={() => setVisibleCount(SHOW_MORE_STEP)}
                  className="text-xs text-sky-400 hover:text-sky-600 font-semibold underline">
                  Collapse
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Full Profile Modal ── */}
      {selected && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-sky-100 px-8 py-5 flex items-center justify-between rounded-t-3xl z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 text-white font-bold text-lg flex items-center justify-center flex-shrink-0">
                  {selected.talentProfile?.firstName?.[0]}{selected.talentProfile?.lastName?.[0]}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-sky-900">{selected.talentProfile?.firstName} {selected.talentProfile?.lastName}</h2>
                  <p className="text-sky-400 text-sm">{selected.talentProfile?.headline}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-sky-400 hover:text-sky-700 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-sky-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 space-y-6">
              {/* Score */}
              {selected.aiScore != null && (
                <div className="bg-sky-50 rounded-2xl p-5 border border-sky-100 flex items-center gap-5">
                  <ScoreRing score={selected.aiScore} size={56} />
                  <div>
                    <p className="font-bold text-sky-900">AI Match Score</p>
                    <p className="text-sky-500 text-sm">{selected.aiScore >= 80 ? 'Highly recommended' : selected.aiScore >= 60 ? 'Good match' : 'Needs review'}</p>
                  </div>
                  <div className="ml-auto">
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_META[selected.status]?.badge}`}>{STATUS_META[selected.status]?.label}</span>
                  </div>
                </div>
              )}
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Email',      selected.talentProfile?.email],
                  ['Location',   selected.talentProfile?.location],
                  ['Status',     STATUS_META[selected.status]?.label || selected.status],
                  // ['Added Via',  VIA_META[selected.source]?.label || selected.source],
                  ['Applied On', fmtDate(selected.appliedAt)],
                  ['Job Posted', jobMap[selected.jobId?._id || selected.jobId]?.createdAt ? fmtDate(jobMap[selected.jobId?._id || selected.jobId].createdAt) : '—'],
                  // ['Deadline',   jobMap[selected.jobId?._id || selected.jobId]?.applicationDeadline ? fmtDate(jobMap[selected.jobId?._id || selected.jobId].applicationDeadline) : '—'],
                  ['Availability', selected.talentProfile?.availability?.status],
                ].map(([l, v]) => (
                  <div key={l} className="bg-sky-50 rounded-xl p-3">
                    <p className="text-sky-400 text-xs font-bold uppercase tracking-wide">{l}</p>
                    <p className="text-sky-900 font-semibold mt-1 text-sm">{String(v)}</p>
                  </div>
                ))}
              </div>
              {/* Skills */}
              {(selected.talentProfile?.skills || []).length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.talentProfile.skills.map((s: any) => (
                      <span key={s.name} className="text-xs bg-sky-100 text-sky-700 border border-sky-200 px-3 py-1 rounded-full font-medium">
                        {s.name} · {s.level}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Experience */}
              {(selected.talentProfile?.experience || []).length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Work Experience</h3>
                  <div className="space-y-3">
                    {selected.talentProfile.experience.map((e: any, i: number) => (
                      <div key={i} className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                        <p className="font-bold text-sky-900 text-sm">{e.role} · {e.company}</p>
                        <p className="text-sky-500 text-xs mt-0.5">{e.startDate} – {e.isCurrent ? 'Present' : e.endDate}</p>
                        {e.description && <p className="text-sky-700 text-sm mt-2 leading-relaxed">{e.description}</p>}
                        {(e.technologies || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {e.technologies.map((t: string) => <span key={t} className="text-xs bg-sky-200 text-sky-700 px-2 py-0.5 rounded-full">{t}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Education */}
              {(selected.talentProfile?.education || []).length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Education</h3>
                  <div className="space-y-2">
                    {selected.talentProfile.education.map((e: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 bg-sky-50 rounded-xl p-3 border border-sky-100">
                        <GraduationCap className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sky-900 font-semibold text-sm">{e.degree} in {e.fieldOfStudy}</p>
                          <p className="text-sky-500 text-xs">{e.institution} · {e.startYear}–{e.endYear}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Certifications */}
              {(selected.talentProfile?.certifications || []).length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.talentProfile.certifications.map((c: any) => (
                      <span key={c.name} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-medium">
                        🏅 {c.name} · {c.issuer}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => updateStatus(selected._id, 'shortlisted')} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors">Shortlist</button>
                <button onClick={() => updateStatus(selected._id, 'rejected')} className="flex-1 bg-red-50 text-red-500 font-semibold px-4 py-2.5 rounded-xl hover:bg-red-100 transition-colors">✗ Reject</button>
                <button onClick={() => deleteApplicant(selected._id)} className="px-4 py-2.5 text-red-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Applicant Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-sky-100 px-8 py-5 flex items-center justify-between rounded-t-3xl z-10">
              <div>
                <h2 className="font-display text-xl font-bold text-sky-900">Add Applicant Manually</h2>
                <p className="text-sky-400 text-sm mt-0.5">Complete all sections for the best screening accuracy</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-sky-400 hover:text-sky-700 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-sky-50"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit(onAddSubmit)} className="p-8 space-y-8">

              {/* Job Selection */}
              <div>
                <SectionHead icon={Briefcase} title="Job Position" subtitle="Only active jobs are shown" />
                <FL req>Applying For</FL>
                <select {...register('jobId', { required: 'Please select a job' })} className="input-sky">
                  <option value="">Select active job…</option>
                  {activeJobs.map(j => <option key={j._id} value={j._id}>{j.title} — {j.department} · {j.location}</option>)}
                </select>
                {errors.jobId && <p className="text-red-400 text-xs mt-1">{String(errors.jobId.message)}</p>}
                {activeJobs.length === 0 && <p className="text-amber-500 text-xs mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />No active jobs. Post an active job first.</p>}
              </div>

              {/* Personal Info */}
              <div>
                <SectionHead icon={Users} title="Personal Information" subtitle="Contact and identity" />
                <div className="grid grid-cols-2 gap-4">
                  <div><FL req>First Name</FL><input {...register('firstName', { required: true })} placeholder="Jean" className="input-sky" /></div>
                  <div><FL req>Last Name</FL><input {...register('lastName', { required: true })} placeholder="Uwimana" className="input-sky" /></div>
                  <div><FL req>Email Address</FL><input {...register('email', { required: true })} type="email" placeholder="jean@example.com" className="input-sky" /></div>
                  <div><FL req>Location</FL><input {...register('location', { required: true })} placeholder="Kigali, Rwanda" className="input-sky" /></div>
                  <div className="col-span-2"><FL req>Professional Headline</FL><input {...register('headline', { required: true })} placeholder="Senior Full-Stack Engineer with 5+ years in fintech" className="input-sky" /></div>
                  <div className="col-span-2"><FL>Bio / Summary</FL><textarea {...register('bio')} rows={3} placeholder="Brief professional summary…" className="input-sky resize-none" /></div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <SectionHead icon={Code2} title="Skills" subtitle="Technical and soft skills — used directly in screening score" />
                <div className="space-y-2">
                  {skillsArr.fields.map((field, i) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">{i === 0 && <FL>Skill Name</FL>}<input {...register(`skills.${i}.name`)} placeholder="React.js" className="input-sky text-sm" /></div>
                      <div className="col-span-3">{i === 0 && <FL>Level</FL>}<select {...register(`skills.${i}.level`)} className="input-sky text-sm">{SKILL_LEVELS.map(l => <option key={l}>{l}</option>)}</select></div>
                      <div className="col-span-3">{i === 0 && <FL>Years</FL>}<input {...register(`skills.${i}.yearsOfExperience`)} type="number" min="0" max="30" placeholder="0" className="input-sky text-sm" /></div>
                      <div className={`col-span-1 flex justify-end ${i === 0 ? 'mt-6' : ''}`}>
                        {skillsArr.fields.length > 1 && <button type="button" onClick={() => skillsArr.remove(i)} className="text-red-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"><Minus className="w-4 h-4" /></button>}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => skillsArr.append({ name: '', level: 'Intermediate', yearsOfExperience: 1 })}
                    className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold hover:text-sky-800 mt-2">
                    <Plus className="w-3.5 h-3.5" /> Add Skill
                  </button>
                </div>
              </div>

              {/* Experience */}
              <div>
                <SectionHead icon={Briefcase} title="Work Experience" subtitle="Most recent first — most impactful for screening" />
                <div className="space-y-4">
                  {expArr.fields.map((field, i) => (
                    <div key={field.id} className="bg-sky-50/60 rounded-2xl p-4 border border-sky-100 relative">
                      {expArr.fields.length > 1 && (
                        <button type="button" onClick={() => expArr.remove(i)} className="absolute top-3 right-3 text-red-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50"><Minus className="w-3.5 h-3.5" /></button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div><FL>Role / Title</FL><input {...register(`experience.${i}.role`)} placeholder="Backend Engineer" className="input-sky text-sm" /></div>
                        <div><FL>Company</FL><input {...register(`experience.${i}.company`)} placeholder="Kigali Tech Ltd" className="input-sky text-sm" /></div>
                        <div><FL>Start Date</FL><input {...register(`experience.${i}.startDate`)} placeholder="Jan 2021" className="input-sky text-sm" /></div>
                        <div><FL>End Date</FL><input {...register(`experience.${i}.endDate`)} placeholder="Dec 2023 / Present" className="input-sky text-sm" /></div>
                        <div className="col-span-2"><FL>Key Achievements & Responsibilities</FL><textarea {...register(`experience.${i}.description`)} rows={2} placeholder="Led migration of monolith to microservices, reducing deployment time by 60%…" className="input-sky resize-none text-sm" /></div>
                        <div className="col-span-2"><FL>Technologies (comma-separated)</FL><input {...register(`experience.${i}.technologies`)} placeholder="Node.js, PostgreSQL, Docker, AWS" className="input-sky text-sm" /></div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => expArr.append({ company: '', role: '', startDate: '', endDate: '', description: '', technologies: '', isCurrent: false })}
                    className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold hover:text-sky-800">
                    <Plus className="w-3.5 h-3.5" /> Add Experience
                  </button>
                </div>
              </div>

              {/* Education */}
              <div>
                <SectionHead icon={GraduationCap} title="Education" />
                <div className="space-y-3">
                  {eduArr.fields.map((field, i) => (
                    <div key={field.id} className="grid grid-cols-2 gap-3 bg-sky-50/60 rounded-2xl p-4 border border-sky-100 relative">
                      {eduArr.fields.length > 1 && <button type="button" onClick={() => eduArr.remove(i)} className="absolute top-3 right-3 text-red-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50"><Minus className="w-3.5 h-3.5" /></button>}
                      <div><FL>Institution</FL><input {...register(`education.${i}.institution`)} placeholder="University of Rwanda" className="input-sky text-sm" /></div>
                      <div><FL>Degree</FL><input {...register(`education.${i}.degree`)} placeholder="Bachelor's / Master's" className="input-sky text-sm" /></div>
                      <div><FL>Field of Study</FL><input {...register(`education.${i}.fieldOfStudy`)} placeholder="Computer Science" className="input-sky text-sm" /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><FL>Start Year</FL><input {...register(`education.${i}.startYear`)} type="number" placeholder="2018" className="input-sky text-sm" /></div>
                        <div><FL>End Year</FL><input {...register(`education.${i}.endYear`)} type="number" placeholder="2022" className="input-sky text-sm" /></div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => eduArr.append({ institution: '', degree: '', fieldOfStudy: '', startYear: 2020, endYear: 2024 })}
                    className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold hover:text-sky-800">
                    <Plus className="w-3.5 h-3.5" /> Add Education
                  </button>
                </div>
              </div>

              {/* Certifications */}
              <div>
                <SectionHead icon={Award} title="Certifications" subtitle="Boosts screening score" />
                <div className="space-y-3">
                  {certArr.fields.map((field, i) => (
                    <div key={field.id} className="grid grid-cols-3 gap-3 items-end">
                      <div>{i === 0 && <FL>Certificate</FL>}<input {...register(`certifications.${i}.name`)} placeholder="AWS Solutions Architect" className="input-sky text-sm" /></div>
                      <div>{i === 0 && <FL>Issuer</FL>}<input {...register(`certifications.${i}.issuer`)} placeholder="Amazon" className="input-sky text-sm" /></div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">{i === 0 && <FL>Date</FL>}<input {...register(`certifications.${i}.issueDate`)} placeholder="Mar 2023" className="input-sky text-sm" /></div>
                        <button type="button" onClick={() => certArr.remove(i)} className="text-red-300 hover:text-red-500 p-1.5 mb-0.5 rounded-lg hover:bg-red-50"><Minus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => certArr.append({ name: '', issuer: '', issueDate: '' })}
                    className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold hover:text-sky-800">
                    <Plus className="w-3.5 h-3.5" /> Add Certification
                  </button>
                </div>
              </div>

              {/* Projects */}
              <div>
                <SectionHead icon={BookOpen} title="Notable Projects" subtitle="Optional — highlights practical experience" />
                <div className="space-y-4">
                  {projArr.fields.map((field, i) => (
                    <div key={field.id} className="bg-sky-50/60 rounded-2xl p-4 border border-sky-100 relative">
                      <button type="button" onClick={() => projArr.remove(i)} className="absolute top-3 right-3 text-red-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50"><Minus className="w-3.5 h-3.5" /></button>
                      <div className="grid grid-cols-2 gap-3">
                        <div><FL>Project Name</FL><input {...register(`projects.${i}.name`)} placeholder="E-Commerce Platform" className="input-sky text-sm" /></div>
                        <div><FL>Your Role</FL><input {...register(`projects.${i}.role`)} placeholder="Lead Developer" className="input-sky text-sm" /></div>
                        <div className="col-span-2"><FL>Description</FL><textarea {...register(`projects.${i}.description`)} rows={2} placeholder="What the project does and your contribution…" className="input-sky resize-none text-sm" /></div>
                        <div><FL>Technologies</FL><input {...register(`projects.${i}.technologies`)} placeholder="React, Node.js, MongoDB" className="input-sky text-sm" /></div>
                        <div><FL>Link (optional)</FL><input {...register(`projects.${i}.link`)} type="url" placeholder="https://github.com/…" className="input-sky text-sm" /></div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => projArr.append({ name: '', description: '', technologies: '', role: '', link: '' })}
                    className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold hover:text-sky-800">
                    <Plus className="w-3.5 h-3.5" /> Add Project
                  </button>
                </div>
              </div>

              {/* Languages */}
              <div>
                <SectionHead icon={Languages} title="Languages" />
                <div className="space-y-2">
                  {langArr.fields.map((field, i) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-6">{i === 0 && <FL>Language</FL>}<input {...register(`languages.${i}.name`)} placeholder="English" className="input-sky text-sm" /></div>
                      <div className="col-span-5">{i === 0 && <FL>Proficiency</FL>}<select {...register(`languages.${i}.proficiency`)} className="input-sky text-sm">{LANG_LEVELS.map(l => <option key={l}>{l}</option>)}</select></div>
                      <div className={`col-span-1 flex justify-end ${i === 0 ? 'mt-6' : ''}`}>
                        {langArr.fields.length > 1 && <button type="button" onClick={() => langArr.remove(i)} className="text-red-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"><Minus className="w-4 h-4" /></button>}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => langArr.append({ name: '', proficiency: 'Fluent' })}
                    className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold hover:text-sky-800">
                    <Plus className="w-3.5 h-3.5" /> Add Language
                  </button>
                </div>
              </div>

              {/* Availability & Links */}
              <div>
                <SectionHead icon={CheckCircle} title="Availability & Links" />
                <div className="grid grid-cols-2 gap-4">
                  <div><FL>Availability</FL><select {...register('availabilityStatus')} className="input-sky">{AVAIL_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                  <div><FL>Work Preference</FL><select {...register('availabilityType')} className="input-sky">{AVAIL_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><FL>LinkedIn</FL><input {...register('linkedin')} type="url" placeholder="https://linkedin.com/in/…" className="input-sky" /></div>
                  <div><FL>GitHub</FL><input {...register('github')} type="url" placeholder="https://github.com/…" className="input-sky" /></div>
                  <div className="col-span-2"><FL>Portfolio / Website</FL><input {...register('portfolio')} type="url" placeholder="https://yoursite.com" className="input-sky" /></div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2 border-t border-sky-50">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="border border-sky-200 text-sky-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-sky-50 transition-colors">Cancel</button>
                <button type="submit" disabled={addBusy}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60">
                  {addBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Applicant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
