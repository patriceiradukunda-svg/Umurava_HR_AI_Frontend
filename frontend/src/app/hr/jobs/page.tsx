'use client'
import { useEffect, useState, useCallback } from 'react'
import { jobsAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import {
  Plus, Search, Pencil, Trash2, Zap, X, Loader2, Briefcase,
  MapPin, Clock, Users, Calendar, ChevronDown, Filter,
  GraduationCap, DollarSign, Star, ArrowUpDown, Building2,
  CheckCircle, AlertCircle, PauseCircle, FileText, SlidersHorizontal,
  TrendingUp, Eye, Copy,
} from 'lucide-react'
import Link from 'next/link'

const DEPARTMENTS = ['Engineering', 'Design', 'Data & Analytics', 'Product', 'Marketing', 'Operations', 'Finance', 'HR & People', 'Sales', 'Legal', 'Customer Success']
const JOB_TYPES   = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Remote']
const EDU_LEVELS  = ["High School", "Associate's", "Bachelor's", "Master's", "PhD", "No Requirement"]
const SORT_OPTIONS = [
  { value: 'newest',     label: 'Recently Posted' },
  { value: 'oldest',     label: 'Oldest First' },
  { value: 'applicants', label: 'Most Applicants' },
  { value: 'title',      label: 'Title A–Z' },
]
const STATUS_STYLES: Record<string, { badge: string; icon: any; dot: string }> = {
  active:    { badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: CheckCircle, dot: 'bg-emerald-400' },
  draft:     { badge: 'bg-amber-100 text-amber-700 border border-amber-200',       icon: FileText,    dot: 'bg-amber-400' },
  screening: { badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200',    icon: Zap,         dot: 'bg-indigo-400' },
  closed:    { badge: 'bg-slate-100 text-slate-500 border border-slate-200',       icon: PauseCircle, dot: 'bg-slate-400' },
}
const SALARY_CURRENCIES = ['USD', 'RWF', 'EUR', 'GBP', 'KES', 'UGX']

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7)  return `${d} days ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}
function formatDeadline(date: string) {
  if (!date) return null
  const d   = new Date(date)
  const now = new Date()
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000)
  if (diff < 0)   return { label: 'Expired',      color: 'text-red-500' }
  if (diff === 0) return { label: 'Closes today',  color: 'text-red-500' }
  if (diff <= 3)  return { label: `${diff}d left`, color: 'text-amber-600' }
  if (diff <= 7)  return { label: `${diff}d left`, color: 'text-amber-500' }
  return { label: `${diff}d left`, color: 'text-sky-500' }
}
function fmtSalary(job: any) {
  if (!job.salaryMin && !job.salaryMax) return null
  const cur = job.salaryCurrency || 'USD'
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)
  if (job.salaryMin && job.salaryMax) return `${cur} ${fmt(job.salaryMin)}–${fmt(job.salaryMax)}`
  if (job.salaryMin) return `${cur} ${fmt(job.salaryMin)}+`
  return `Up to ${cur} ${fmt(job.salaryMax)}`
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mb-3 flex items-center gap-2">
      <span className="flex-1 h-px bg-sky-100" />
      {children}
      <span className="flex-1 h-px bg-sky-100" />
    </p>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-1.5 flex items-center gap-1 block">
        {label}{required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-sky-400 text-[11px] mt-1">{hint}</p>}
    </div>
  )
}

function JobCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-sky-50 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-sky-100 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-sky-100 rounded w-3/4" />
          <div className="h-3 bg-sky-50 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-sky-50 rounded" />
        <div className="h-3 bg-sky-50 rounded w-5/6" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-sky-100 rounded-full" />
        <div className="h-6 w-20 bg-sky-100 rounded-full" />
      </div>
    </div>
  )
}

export default function HRJobsPage() {
  const [jobs, setJobs]             = useState<any[]>([])
  const [stats, setStats]           = useState<any>({})
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<any>(null)
  const [busy, setBusy]             = useState(false)
  const [previewJob, setPreviewJob] = useState<any>(null)

  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState('all')
  const [deptFilter, setDept]         = useState('all')
  const [typeFilter, setType]         = useState('all')
  const [sortBy, setSort]             = useState('newest')
  const [showFilters, setShowFilters] = useState(false)

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      title: '', department: '', location: '', type: 'Full-time',
      description: '', requirements: '', requiredSkills: '',
      niceToHaveSkills: '', minimumExperienceYears: 0,
      educationLevel: "Bachelor's", shortlistSize: 10,
      status: 'draft', screeningNotes: '',
      salaryMin: '', salaryMax: '', salaryCurrency: 'USD',
      applicationDeadline: '', responsibilities: '',
    }
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [jRes, sRes] = await Promise.all([
        jobsAPI.list({
          search:     search     || undefined,
          status:     statusFilter !== 'all' ? statusFilter : undefined,
          department: deptFilter  !== 'all' ? deptFilter   : undefined,
        }),
        jobsAPI.stats(),
      ])
      let data = jRes.data.data as any[]

      if (sortBy === 'newest')          data = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      else if (sortBy === 'oldest')     data = [...data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      else if (sortBy === 'applicants') data = [...data].sort((a, b) => (b.applicantCount || 0) - (a.applicantCount || 0))
      else if (sortBy === 'title')      data = [...data].sort((a, b) => a.title.localeCompare(b.title))

      if (typeFilter !== 'all') data = data.filter(j => j.type === typeFilter)

      setJobs(data)
      setStats(sRes.data.data || {})
    } catch { toast.error('Failed to load jobs') }
    finally { setLoading(false) }
  }, [search, statusFilter, deptFilter, typeFilter, sortBy])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); reset(); setShowModal(true) }

  const openEdit = (job: any) => {
    setEditing(job)
    const fields: Record<string, any> = {
      title: job.title, department: job.department, location: job.location,
      type: job.type, description: job.description,
      requirements:     (job.requirements     || []).join('\n'),
      requiredSkills:   (job.requiredSkills   || []).join(', '),
      niceToHaveSkills: (job.niceToHaveSkills || []).join(', '),
      minimumExperienceYears: job.minimumExperienceYears,
      educationLevel: job.educationLevel,
      shortlistSize: job.shortlistSize,
      status: job.status,
      screeningNotes: job.screeningNotes || '',
      salaryMin: job.salaryMin || '',
      salaryMax: job.salaryMax || '',
      salaryCurrency: job.salaryCurrency || 'USD',
      applicationDeadline: job.applicationDeadline ? job.applicationDeadline.substring(0, 10) : '',
      responsibilities: job.responsibilities || '',
    }
    Object.entries(fields).forEach(([k, v]) => setValue(k as any, v))
    setShowModal(true)
  }

  const duplicateJob = async (job: any) => {
    try {
      await jobsAPI.create({ ...job, title: `${job.title} (Copy)`, status: 'draft', applicantCount: 0 })
      toast.success('Job duplicated as draft')
      load()
    } catch { toast.error('Failed to duplicate') }
  }

  const onSubmit = async (data: any) => {
    setBusy(true)
    try {
      const payload = {
        ...data,
        requirements:     data.requirements?.split('\n').map((s: string) => s.trim()).filter(Boolean) || [],
        requiredSkills:   data.requiredSkills?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
        niceToHaveSkills: data.niceToHaveSkills?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
        minimumExperienceYears: Number(data.minimumExperienceYears) || 0,
        shortlistSize: Number(data.shortlistSize) || 10,
        salaryMin: data.salaryMin ? Number(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? Number(data.salaryMax) : undefined,
        applicationDeadline: data.applicationDeadline || undefined,
      }
      if (editing) {
        await jobsAPI.update(editing._id, payload)
        toast.success('Job updated successfully')
      } else {
        await jobsAPI.create(payload)
        toast.success('Job posted successfully')
      }
      setShowModal(false)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save job')
    } finally { setBusy(false) }
  }

  const deleteJob = async (id: string) => {
    if (!confirm('Delete this job and all its applicants? This cannot be undone.')) return
    try { await jobsAPI.delete(id); toast.success('Job deleted'); load() }
    catch { toast.error('Failed to delete') }
  }

  const changeStatus = async (id: string, status: string) => {
    try { await jobsAPI.updateStatus(id, status); toast.success(`Status updated to ${status}`); load() }
    catch { toast.error('Failed to update status') }
  }

  const uniqueDepts   = [...new Set(jobs.map(j => j.department).filter(Boolean))]
  const uniqueTypes   = [...new Set(jobs.map(j => j.type).filter(Boolean))]
  const activeFilters = [statusFilter, deptFilter, typeFilter].filter(f => f !== 'all').length

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className=" text-2xl font-bold text-sky-950">Job Postings</h1>
          {/* <p className="text-sky-400 text-sm mt-1">
            <span className="font-semibold text-sky-600">{stats.active || 0} </span> active ·{' '}
            <span className="font-semibold text-amber-600">{stats.draft || 0} </span> draft ·{' '}
            <span className="font-semibold text-indigo-600">{stats.screening || 0} </span> screening ·{' '}
            <span className="font-semibold text-slate-400">{stats.closed || 0} </span> closed
          </p> */}
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Post New Job
        </button>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Jobs',   value: stats.total     || 0, color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'Active',       value: stats.active    || 0, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'In Screening', value: stats.screening || 0, color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
          { label: 'Drafts',       value: stats.draft     || 0, color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
        ].map(s => (
          <button key={s.label}
            onClick={() => setStatus(s.label === 'Total Jobs' ? 'all' : s.label.toLowerCase().replace('in ', ''))}
            className={`${s.bg} border ${s.border} rounded-2xl p-4 text-left hover:shadow-sm transition-all`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sky-500 text-xs font-medium ml-2 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* ── Filters row ── */}
      <div className="bg-white rounded-2xl border border-sky-100 p-4 space-y-3" style={{ boxShadow: '0 1px 4px rgba(14,165,233,0.06)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-3 h-10 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search job title…"
              className="outline-none text-sm text-sky-800 placeholder-sky-300 bg-transparent flex-1" />
            {search && (
              <button onClick={() => setSearch('')} className="text-sky-300 hover:text-sky-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-white border border-sky-200 rounded-xl px-3 h-10">
            <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
            <select value={sortBy} onChange={e => setSort(e.target.value)}
              className="outline-none text-sm text-sky-700 bg-transparent pr-1 cursor-pointer">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-semibold transition-all ${
              showFilters || activeFilters > 0
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white border-sky-200 text-sky-600 hover:border-sky-400'
            }`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters {activeFilters > 0 && (
              <span className="bg-white/30 text-xs px-1.5 py-0.5 rounded-full font-bold">{activeFilters}</span>
            )}
          </button>

          {activeFilters > 0 && (
            <button onClick={() => { setStatus('all'); setDept('all'); setType('all') }}
              className="text-xs text-sky-500 hover:text-sky-700 font-semibold underline">
              Clear filters
            </button>
          )}

          <span className="ml-auto text-sky-400 text-xs font-medium">
            {jobs.length} result{jobs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-sky-50">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs text-sky-500 font-semibold">Filter by:</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {['all', 'active', 'draft', 'screening', 'closed'].map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all capitalize ${
                    statusFilter === s ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                  }`}>
                  {s === 'all' ? 'All Status' : s}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-sky-100" />
            <select value={deptFilter} onChange={e => setDept(e.target.value)}
              className="text-xs border border-sky-200 rounded-lg px-3 py-1.5 text-sky-700 outline-none bg-white">
              <option value="all">All Departments</option>
              {(uniqueDepts.length > 0 ? uniqueDepts : DEPARTMENTS).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setType(e.target.value)}
              className="text-xs border border-sky-200 rounded-lg px-3 py-1.5 text-sky-700 outline-none bg-white">
              <option value="all">All Types</option>
              {(uniqueTypes.length > 0 ? uniqueTypes : JOB_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Jobs Grid ── */}
      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-sky-50"
          style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.08)' }}>
          <Briefcase className="w-12 h-12 text-sky-200 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-sky-900 mb-2">
            {activeFilters > 0 || search ? 'No jobs match your filters' : 'No job postings yet'}
          </h3>
          <p className="text-sky-400 mb-6 text-sm">
            {activeFilters > 0 || search
              ? 'Try adjusting your search or filters.'
              : 'Create your first job posting to start attracting candidates.'}
          </p>
          {!(activeFilters > 0 || search) && (
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-sky-700 transition-colors">
              <Plus className="w-4 h-4" /> Post First Job
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map(job => {
            const ss = STATUS_STYLES[job.status] || STATUS_STYLES.draft
            const deadline = job.applicationDeadline ? formatDeadline(job.applicationDeadline) : null
            const salary = fmtSalary(job)
            return (
              <div key={job._id}
                className="bg-white rounded-2xl border border-sky-50 hover:border-sky-200 hover:shadow-md transition-all duration-200 flex flex-col group"
                style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.07)' }}>

                {/* Card body */}
                <div className="p-5 flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>

                    {/* Title + status + View/Copy on same line */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${ss.badge}`}>
                          <ss.icon className="w-3 h-3" />{job.status}
                        </span>
                        {deadline && <span className={`text-xs font-semibold ${deadline.color}`}>{deadline.label}</span>}
                        <div className="ml-auto flex items-center gap-1">
                          <button onClick={() => setPreviewJob(job)}
                            className="flex items-center gap-1 text-sky-500 hover:text-sky-700 text-[11px] font-semibold px-2 py-0.5 rounded-lg hover:bg-sky-50 border border-sky-100 hover:border-sky-300 transition-colors">
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button onClick={() => duplicateJob(job)}
                            className="flex items-center gap-1 text-sky-400 hover:text-sky-600 text-[11px] font-semibold px-2 py-0.5 rounded-lg hover:bg-sky-50 border border-sky-100 hover:border-sky-300 transition-colors">
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                      </div>
                      <h3 className=" font-bold text-sky-900 text-base leading-tight truncate">{job.title}</h3>
                    </div>

                    {/* Applicant count */}
                    <div className="flex-shrink-0 text-right">
                      <div className=" text-xl font-bold text-sky-500">{job.applicantCount || 0}</div>
                      <div className="text-sky-300 text-[10px] font-medium">applicants</div>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                    <span className="flex items-center gap-1 text-sky-500 text-xs"><Building2 className="w-3 h-3" />{job.department}</span>
                    <span className="flex items-center gap-1 text-sky-500 text-xs"><MapPin className="w-3 h-3" />{job.location}</span>
                    <span className="flex items-center gap-1 text-sky-500 text-xs"><Clock className="w-3 h-3" />{job.type}</span>
                    {job.minimumExperienceYears > 0 && (
                      <span className="flex items-center gap-1 text-sky-500 text-xs"><TrendingUp className="w-3 h-3" />{job.minimumExperienceYears}+ yrs</span>
                    )}
                  </div>

                  {/* Salary + Education */}
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    {salary && (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <DollarSign className="w-3 h-3" />{salary}
                      </span>
                    )}
                    {job.educationLevel && job.educationLevel !== 'No Requirement' && (
                      <span className="flex items-center gap-1 text-indigo-600 text-xs font-semibold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                        <GraduationCap className="w-3 h-3" />{job.educationLevel}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sky-600 text-xs leading-relaxed line-clamp-2 mb-3">{job.description}</p>

                  {/* Skills */}
                  {(job.requiredSkills || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(job.requiredSkills || []).slice(0, 3).map((s: string) => (
                        <span key={s} className="text-xs bg-sky-50 text-sky-600 border border-sky-200 px-2 py-0.5 rounded-full font-medium">{s}</span>
                      ))}
                      {(job.requiredSkills || []).length > 3 && (
                        <span className="text-xs bg-sky-50 text-sky-400 border border-sky-100 px-2 py-0.5 rounded-full">+{job.requiredSkills.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-center gap-3 text-[11px] text-sky-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Posted {timeAgo(job.createdAt)}</span>
                    {job.applicationDeadline && (
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />Closes on {new Date(job.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card footer */}
                <div className="border-t border-sky-50 px-5 py-3 flex items-center gap-2 bg-sky-50/30 rounded-b-2xl">
                  <Link href="/hr/screening"
                    className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    <Zap className="w-3 h-3" /> Screen
                  </Link>
                  <button onClick={() => openEdit(job)}
                    className="flex items-center gap-1.5 bg-white border border-sky-200 text-sky-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:border-sky-400 hover:bg-sky-50 transition-colors">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <select value={job.status} onChange={e => changeStatus(job._id, e.target.value)}
                      className="text-xs border border-sky-200 rounded-lg px-2 py-1.5 text-sky-600 outline-none bg-white cursor-pointer hover:border-sky-400">
                      {['active', 'draft', 'screening', 'closed'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button onClick={() => deleteJob(job._id)}
                      className="text-red-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* ── Job Preview Modal ── */}
      {previewJob && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-sky-100 px-8 py-5 flex items-center justify-between rounded-t-3xl z-10">
              <div>
                <h2 className="font-display text-xl font-bold text-sky-900">{previewJob.title}</h2>
                <p className="text-sky-400 text-sm">{previewJob.department} · {previewJob.location}</p>
              </div>
              <button onClick={() => setPreviewJob(null)}
                className="text-sky-400 hover:text-sky-700 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-sky-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: Clock,         label: previewJob.type },
                  { icon: MapPin,        label: previewJob.location },
                  { icon: TrendingUp,    label: `${previewJob.minimumExperienceYears || 0}+ years exp.` },
                  { icon: GraduationCap, label: previewJob.educationLevel || "Bachelor's" },
                ].map(m => (
                  <span key={m.label} className="flex items-center gap-1.5 bg-sky-50 text-sky-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-sky-200">
                    <m.icon className="w-3.5 h-3.5" />{m.label}
                  </span>
                ))}
                {fmtSalary(previewJob) && (
                  <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-200">
                    <DollarSign className="w-3.5 h-3.5" />{fmtSalary(previewJob)}
                  </span>
                )}
              </div>
              {previewJob.description && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-2">About the Role</h3>
                  <p className="text-sky-700 text-sm leading-relaxed">{previewJob.description}</p>
                </div>
              )}
              {previewJob.responsibilities && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-2">Responsibilities</h3>
                  <p className="text-sky-700 text-sm leading-relaxed whitespace-pre-line">{previewJob.responsibilities}</p>
                </div>
              )}
              {(previewJob.requirements || []).length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-2">Requirements</h3>
                  <ul className="space-y-1">
                    {previewJob.requirements.map((r: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sky-700 text-sm">
                        <CheckCircle className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(previewJob.requiredSkills || []).length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {previewJob.requiredSkills.map((s: string) => (
                      <span key={s} className="bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {(previewJob.niceToHaveSkills || []).length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-2">Nice to Have</h3>
                  <div className="flex flex-wrap gap-2">
                    {previewJob.niceToHaveSkills.map((s: string) => (
                      <span key={s} className="bg-sky-50 text-sky-500 text-xs font-medium px-3 py-1 rounded-full border border-sky-200">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setPreviewJob(null); openEdit(previewJob) }}
                  className="flex-1 flex items-center justify-center gap-2 bg-sky-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-sky-700 transition-colors">
                  <Pencil className="w-4 h-4" /> Edit Job
                </button>
                <Link href="/hr/screening"
                  className="flex-1 flex items-center justify-center gap-2 bg-sky-950 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-sky-900 transition-colors">
                  <Zap className="w-4 h-4" /> Screen Applicants
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-sky-100 px-8 py-5 flex items-center justify-between rounded-t-3xl z-10">
              <div>
                <h2 className="font-display text-xl font-bold text-sky-900">
                  {editing ? 'Edit Job Posting' : 'Create New Job Posting'}
                </h2>
                <p className="text-sky-400 text-sm mt-0.5">
                  {editing ? 'Update the details below' : 'Fill in the details to publish a new role'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="text-sky-400 hover:text-sky-700 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-sky-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-7">

              {/* Section 1: Basic Info */}
              <div className="space-y-4">
                <SectionLabel>Basic Information</SectionLabel>
                <Field label="Job Title" required>
                  <input {...register('title', { required: true })} placeholder="e.g. Senior Backend Engineer" className="input-sky" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Department" required>
                    <select {...register('department', { required: true })} className="input-sky">
                      <option value="">Select department…</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </Field>
                  <Field label="Employment Type">
                    <select {...register('type')} className="input-sky">
                      {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Location" required>
                    <input {...register('location', { required: true })} placeholder="e.g. Kigali, Rwanda / Remote" className="input-sky" />
                  </Field>
                  <Field label="Status">
                    <select {...register('status')} className="input-sky">
                      {['draft', 'active', 'screening', 'closed'].map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              {/* Section 2: Compensation & Timeline */}
              <div className="space-y-4">
                <SectionLabel>Compensation & Timeline</SectionLabel>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Currency">
                    <select {...register('salaryCurrency')} className="input-sky">
                      {SALARY_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Salary Min" hint="Leave blank to hide salary">
                    <input {...register('salaryMin')} type="number" min="0" placeholder="e.g. 60000" className="input-sky" />
                  </Field>
                  <Field label="Salary Max">
                    <input {...register('salaryMax')} type="number" min="0" placeholder="e.g. 90000" className="input-sky" />
                  </Field>
                </div>
                <Field label="Application Deadline" hint="Applicants will see how many days are left">
                  <input {...register('applicationDeadline')} type="date" className="input-sky"
                    min={new Date().toISOString().split('T')[0]} />
                </Field>
              </div>

              {/* Section 3: Role Details */}
              <div className="space-y-4">
                <SectionLabel>Role Details</SectionLabel>
                <Field label="Job Description" required>
                  <textarea {...register('description', { required: true })} rows={4}
                    placeholder="Describe the role, team context, and what success looks like…"
                    className="input-sky resize-none" />
                </Field>
                <Field label="Key Responsibilities" hint="One responsibility per line">
                  <textarea {...register('responsibilities')} rows={4}
                    placeholder={"Lead backend architecture decisions\nMentor junior engineers\nCollaborate with product on roadmap"}
                    className="input-sky resize-none font-mono text-xs" />
                </Field>
                <Field label="Requirements" hint="One requirement per line — used for candidate evaluation">
                  <textarea {...register('requirements')} rows={3}
                    placeholder={"5+ years of Node.js experience\nExperience with distributed systems\nStrong communication skills"}
                    className="input-sky resize-none font-mono text-xs" />
                </Field>
              </div>

              {/* Section 4: Qualifications */}
              <div className="space-y-4">
                <SectionLabel>Qualifications & Skills</SectionLabel>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Min. Experience (years)">
                    <input {...register('minimumExperienceYears')} type="number" min="0" max="30" placeholder="e.g. 3" className="input-sky" />
                  </Field>
                  <Field label="Education Level">
                    <select {...register('educationLevel')} className="input-sky">
                      {EDU_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Required Skills" hint="Comma-separated — used by screening engine to score candidates">
                  <input {...register('requiredSkills')} placeholder="Node.js, TypeScript, MongoDB, REST APIs" className="input-sky" />
                </Field>
                <Field label="Nice-to-Have Skills" hint="Comma-separated — bonus points in screening">
                  <input {...register('niceToHaveSkills')} placeholder="Redis, AWS, Docker, GraphQL" className="input-sky" />
                </Field>
              </div>

              {/* Section 5: Screening Config */}
              <div className="space-y-4">
                <SectionLabel>Screening Configuration</SectionLabel>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Shortlist Size" hint="How many top candidates to shortlist">
                    <select {...register('shortlistSize')} className="input-sky">
                      <option value={5}>Top 5</option>
                      <option value={10}>Top 10</option>
                      <option value={20}>Top 20</option>
                    </select>
                  </Field>
                </div>
                <Field label="Screening Notes" hint="Internal notes to guide the screening engine (not shown to candidates)">
                  <textarea {...register('screeningNotes')} rows={2}
                    placeholder="Prioritize candidates with fintech experience. Prefer remote-first experience."
                    className="input-sky resize-none text-sm" />
                </Field>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-sky-50">
                <button type="button" onClick={() => setShowModal(false)}
                  className="border border-sky-200 text-sky-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-sky-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={busy}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'Save Changes' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
