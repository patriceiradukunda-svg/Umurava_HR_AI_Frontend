'use client'
import { useEffect, useState, useCallback } from 'react'
import { applicantsAPI, jobsAPI } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import {
  FileText, Clock, CheckCircle, XCircle, Star,
  Search, Filter, X, ChevronDown, Eye, MapPin,
  Calendar, Briefcase, ChevronRight, RefreshCw,
} from 'lucide-react'
import Link from 'next/link'

// ── Status configuration — no AI mention ────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string; description: string; color: string
  bg: string; border: string; icon: any; step: number
}> = {
  pending: {
    label:       'Application Received',
    description: 'Your application has been received and is waiting to be reviewed by the hiring team.',
    color:       'text-amber-600',
    bg:          'bg-amber-50',
    border:      'border-amber-200',
    icon:        Clock,
    step:        1,
  },
  screened: {
    label:       'Under Review',
    description: 'Your application is currently being reviewed by the hiring team.',
    color:       'text-sky-600',
    bg:          'bg-sky-50',
    border:      'border-sky-200',
    icon:        FileText,
    step:        2,
  },
  shortlisted: {
    label:       'Shortlisted',
    description: 'Congratulations! You have been shortlisted. The recruiter will contact you soon for next steps.',
    color:       'text-emerald-600',
    bg:          'bg-emerald-50',
    border:      'border-emerald-200',
    icon:        Star,
    step:        3,
  },
  rejected: {
    label:       'Not Selected',
    description: 'Thank you for applying. The team has moved forward with other candidates for this role.',
    color:       'text-red-500',
    bg:          'bg-red-50',
    border:      'border-red-100',
    icon:        XCircle,
    step:        0,
  },
}

// ── Application progress steps ───────────────────────────────────────────────
const STEPS = ['Received', 'Under Review', 'Shortlisted']

export default function MyApplicationsPage() {
  const { user } = useAuth()

  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [selected, setSelected]         = useState<any>(null)

  // Filters
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy,       setSortBy]       = useState('newest')
  const [showFilter,   setShowFilter]   = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const r = await applicantsAPI.list({ limit: 200 })
      // Filter to only this user's applications by email
      const mine = r.data.data.filter((a: any) =>
        a.talentProfile?.email === user.email
      )
      setApplications(mine)
    } catch {
      if (!silent) toast.error('Failed to load applications')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Filtering + sorting ───────────────────────────────────────────────────
  const filtered = applications
    .filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const title = (a.jobId?.title || '').toLowerCase()
        const dept  = (a.jobId?.department || '').toLowerCase()
        if (!title.includes(q) && !dept.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      if (sortBy === 'oldest') return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '')
      return 0
    })

  // ── Status counts for filter tabs ─────────────────────────────────────────
  const counts = {
    all:         applications.length,
    pending:     applications.filter(a => a.status === 'pending').length,
    screened:    applications.filter(a => a.status === 'screened').length,
    shortlisted: applications.filter(a => a.status === 'shortlisted').length,
    rejected:    applications.filter(a => a.status === 'rejected').length,
  }

  if (loading) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="h-8 w-48 shimmer rounded-xl" />
      <div className="h-12 shimmer rounded-2xl" />
      {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-32 shimmer" />)}
    </div>
  )

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-sky-950">My Applications</h1>
          <p className="text-sky-400 text-sm mt-1">
            {applications.length} application{applications.length !== 1 ? 's' : ''} submitted
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 btn-ghost-sky text-sm">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Status tab filters ────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          ['all',         'All',          counts.all],
          ['pending',     'Received',     counts.pending],
          ['screened',    'Under Review', counts.screened],
          ['shortlisted', 'Shortlisted',  counts.shortlisted],
          ['rejected',    'Not Selected', counts.rejected],
        ] as [string, string, number][]).map(([val, label, count]) => (
          <button key={val} onClick={() => setStatusFilter(val)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              statusFilter === val
                ? 'bg-sky-600 text-white shadow-sky-sm'
                : 'bg-white border border-sky-200 text-sky-600 hover:bg-sky-50'
            }`}>
            {label}
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              statusFilter === val ? 'bg-white/25 text-white' : 'bg-sky-100 text-sky-600'
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {/* ── Search + sort ─────────────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white border border-sky-200 rounded-xl px-4 h-10">
          <Search className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by job title or department…"
            className="flex-1 outline-none text-sm text-sky-800 placeholder-sky-300" />
          {search && (
            <button onClick={() => setSearch('')} className="text-sky-300 hover:text-sky-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="bg-white border border-sky-200 rounded-xl px-4 h-10 text-sm text-sky-700 outline-none">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="status">By status</option>
        </select>
      </div>

      {/* ── Applications list ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-card border border-sky-50">
          <FileText className="w-12 h-12 text-sky-200 mx-auto mb-4" />
          {applications.length === 0 ? (
            <>
              <h3 className="font-display text-xl font-bold text-sky-900 mb-2">No applications yet</h3>
              <p className="text-sky-400 mb-6">Browse open positions and submit your application to get started.</p>
              <Link href="/applicant/jobs" className="btn-sky inline-flex items-center gap-2">
                Browse Positions <ChevronRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <h3 className="font-display text-xl font-bold text-sky-900 mb-2">No results</h3>
              <p className="text-sky-400 mb-4">No applications match your current filters.</p>
              <button onClick={() => { setSearch(''); setStatusFilter('all') }} className="btn-sky-outline text-sm">
                Clear filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => {
            const cfg  = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending
            const Icon = cfg.icon
            const isRejected    = app.status === 'rejected'
            const isShortlisted = app.status === 'shortlisted'
            const job = app.jobId || {}

            return (
              <div key={app._id}
                className={`bg-white rounded-2xl shadow-card border overflow-hidden transition-all card-hover ${cfg.border}`}>

                {/* Top color bar for shortlisted */}
                {isShortlisted && (
                  <div className="h-1 bg-emerald-500" />
                )}

                <div className="p-6">
                  {/* Main row */}
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-2xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${cfg.color}`} />
                    </div>

                    {/* Job info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-sky-900 text-base">
                        {job.title || 'Position'}
                      </h3>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {job.department && (
                          <span className="flex items-center gap-1 text-sky-400 text-xs">
                            <Briefcase className="w-3 h-3" />{job.department}
                          </span>
                        )}
                        {job.location && (
                          <span className="flex items-center gap-1 text-sky-400 text-xs">
                            <MapPin className="w-3 h-3" />{job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-sky-400 text-xs">
                          <Calendar className="w-3 h-3" />
                          Applied {new Date(app.appliedAt).toLocaleDateString('en-US', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Progress steps — only for non-rejected */}
                  {!isRejected && (
                    <div className="mt-5">
                      <div className="flex items-center">
                        {STEPS.map((step, i) => {
                          const stepNum = i + 1
                          const done    = cfg.step >= stepNum
                          const active  = cfg.step === stepNum
                          return (
                            <div key={step} className="flex items-center flex-1">
                              <div className="flex flex-col items-center">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                                  done
                                    ? 'bg-sky-600 border-sky-600 text-white'
                                    : 'bg-white border-sky-200 text-sky-300'
                                }`}>
                                  {done ? <CheckCircle className="w-3.5 h-3.5" /> : stepNum}
                                </div>
                                <span className={`text-xs mt-1 font-medium ${done ? 'text-sky-600' : 'text-sky-300'}`}>
                                  {step}
                                </span>
                              </div>
                              {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full ${
                                  cfg.step > stepNum ? 'bg-sky-600' : 'bg-sky-100'
                                }`} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Status message */}
                  <div className={`mt-4 rounded-xl p-3 border ${cfg.bg} ${cfg.border}`}>
                    <p className={`text-sm ${cfg.color} ${isShortlisted ? 'font-semibold' : ''}`}>
                      {isShortlisted && '🎉 '}
                      {cfg.description}
                    </p>
                  </div>

                  {/* View detail button */}
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => setSelected(app)}
                      className="flex items-center gap-1.5 text-sky-500 hover:text-sky-700 text-xs font-semibold transition-colors">
                      <Eye className="w-3.5 h-3.5" /> View Application Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Detail modal ──────────────────────────────────────────────────── */}
      {selected && (() => {
        const cfg  = STATUS_CONFIG[selected.status] || STATUS_CONFIG.pending
        const Icon = cfg.icon
        const job  = selected.jobId || {}
        return (
          <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-sky-lg">
              <div className="sticky top-0 bg-white border-b border-sky-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                <h2 className="font-display text-lg font-bold text-sky-900">Application Details</h2>
                <button onClick={() => setSelected(null)} className="text-sky-400 hover:text-sky-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Status hero */}
                <div className={`rounded-2xl p-5 border ${cfg.bg} ${cfg.border} flex items-center gap-4`}>
                  <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${cfg.color}`} />
                  </div>
                  <div>
                    <p className={`font-bold text-base ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-sky-600 text-xs mt-0.5">{cfg.description}</p>
                  </div>
                </div>

                {/* Job details */}
                <div className="space-y-3">
                  <h3 className="font-display font-bold text-sky-900 text-sm uppercase tracking-wide">Position</h3>
                  {[
                    ['Job Title',    job.title      || '—'],
                    ['Department',   job.department || '—'],
                    ['Location',     job.location   || '—'],
                    ['Type',         job.type       || '—'],
                    ['Applied On',   new Date(selected.appliedAt).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
                    ['Source',       selected.source?.replace(/_/g, ' ') || '—'],
                    ['Application Status', cfg.label],
                  ].map(([l, v]) => (
                    <div key={l} className="flex items-start justify-between gap-4 py-2 border-b border-sky-50 last:border-0">
                      <span className="text-sky-400 text-sm">{l}</span>
                      <span className="text-sky-900 text-sm font-semibold text-right capitalize">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Skills submitted */}
                {selected.talentProfile?.skills?.length > 0 && (
                  <div>
                    <h3 className="font-display font-bold text-sky-900 text-sm uppercase tracking-wide mb-3">Skills Submitted</h3>
                    <div className="flex flex-wrap gap-2">
                      {selected.talentProfile.skills.map((s: any) => (
                        <span key={s.name} className="badge-sky">{s.name} · {s.level}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* What happens next */}
                {selected.status !== 'rejected' && (
                  <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
                    <p className="text-sky-700 text-sm font-semibold mb-2">What happens next?</p>
                    <ul className="space-y-1.5">
                      {[
                        selected.status === 'pending'     && 'Your application is in the queue to be reviewed.',
                        selected.status === 'screened'    && 'The hiring team is reviewing your qualifications.',
                        selected.status === 'shortlisted' && 'You have been shortlisted! Expect a call or email from the recruiter within 2–5 business days.',
                      ].filter(Boolean).map((msg, i) => (
                        <li key={i} className="flex items-start gap-2 text-sky-600 text-xs">
                          <span className="text-sky-400 mt-0.5">→</span> {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button onClick={() => setSelected(null)} className="w-full btn-sky">Close</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
