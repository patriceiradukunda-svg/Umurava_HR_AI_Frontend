'use client'
import { useEffect, useState, useCallback } from 'react'
import { applicantsAPI } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import {
  FileText, Clock, CheckCircle, XCircle, Star,
  Search, X, Eye, MapPin, Calendar, Briefcase,
  ChevronRight, RefreshCw, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

// ── Status config — zero AI mentions ────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string; description: string
  color: string; bg: string; border: string
  icon: any; step: number
}> = {
  pending: {
    label:       'Application Received',
    description: 'Your application has been received and is in the queue to be reviewed by the hiring team.',
    color:  'text-amber-600',
    bg:     'bg-amber-50',
    border: 'border-amber-200',
    icon:   Clock,
    step:   1,
  },
  screened: {
    label:       'Under Review',
    description: 'The hiring team is currently reviewing your qualifications and experience.',
    color:  'text-sky-600',
    bg:     'bg-sky-50',
    border: 'border-sky-200',
    icon:   FileText,
    step:   2,
  },
  shortlisted: {
    label:       'Shortlisted',
    description: 'Congratulations! You have been shortlisted for this position. The recruiter will contact you soon.',
    color:  'text-emerald-600',
    bg:     'bg-emerald-50',
    border: 'border-emerald-200',
    icon:   Star,
    step:   3,
  },
  rejected: {
    label:       'Not Selected',
    description: 'Thank you for your interest. The team has moved forward with other candidates for this role.',
    color:  'text-red-500',
    bg:     'bg-red-50',
    border: 'border-red-100',
    icon:   XCircle,
    step:   0,
  },
}

const STEPS = ['Received', 'Under Review', 'Shortlisted']

export default function MyApplicationsPage() {
  const { user } = useAuth()

  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [selected, setSelected]         = useState<any>(null)
  const [error, setError]               = useState('')

  // Filters
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy,       setSortBy]       = useState('newest')

  // ── Fetch from backend — filter by user email ─────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError('')

    try {
      // Fetch all applicants and filter by the logged-in user's email
      // This ensures data persists across refreshes since it comes from DB
      const r = await applicantsAPI.list({ limit: 500 })
      const all = r.data.data || []

      // Match by email from talentProfile
      const mine = all.filter((a: any) =>
        a.talentProfile?.email?.toLowerCase() === user.email?.toLowerCase()
      )

      setApplications(mine)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load applications'
      if (!silent) setError(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  // Load on mount and whenever user changes
  useEffect(() => {
    load()
  }, [load])

  // ── Filtering + sorting ───────────────────────────────────────────────────
  const filtered = applications
    .filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (search) {
        const q     = search.toLowerCase()
        const title = (a.jobId?.title       || '').toLowerCase()
        const dept  = (a.jobId?.department  || '').toLowerCase()
        const loc   = (a.jobId?.location    || '').toLowerCase()
        if (!title.includes(q) && !dept.includes(q) && !loc.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      if (sortBy === 'oldest') return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '')
      return 0
    })

  // ── Status counts ─────────────────────────────────────────────────────────
  const counts = {
    all:         applications.length,
    pending:     applications.filter(a => a.status === 'pending').length,
    screened:    applications.filter(a => a.status === 'screened').length,
    shortlisted: applications.filter(a => a.status === 'shortlisted').length,
    rejected:    applications.filter(a => a.status === 'rejected').length,
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="h-8 w-56 shimmer rounded-xl" />
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-9 w-28 shimmer rounded-xl" />)}
      </div>
      {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-40 shimmer" />)}
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
          className="flex items-center gap-2 btn-ghost-sky text-sm border border-sky-200 px-4 py-2 rounded-xl">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={() => load()} className="ml-auto text-red-600 text-xs font-bold hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* ── Status tab filters ────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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

      {/* ── Search + Sort ─────────────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white border border-sky-200 rounded-xl px-4 h-10 shadow-sm">
          <Search className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by job title, department or location…"
            className="flex-1 outline-none text-sm text-sky-800 placeholder-sky-300"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-sky-300 hover:text-sky-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="bg-white border border-sky-200 rounded-xl px-4 h-10 text-sm text-sky-700 outline-none shadow-sm">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="status">By status</option>
        </select>
      </div>

      {/* ── Empty states ──────────────────────────────────────────────────── */}
      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-card border border-sky-50">
          <FileText className="w-14 h-14 text-sky-200 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-sky-900 mb-2">No applications yet</h3>
          <p className="text-sky-400 mb-6 max-w-sm mx-auto">
            Browse open positions and submit your application to get started.
          </p>
          <Link href="/applicant/jobs"
            className="btn-sky inline-flex items-center gap-2">
            Browse Positions <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-card border border-sky-50">
          <Search className="w-10 h-10 text-sky-200 mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-sky-900 mb-2">No results found</h3>
          <p className="text-sky-400 text-sm mb-4">No applications match your current filters.</p>
          <button
            onClick={() => { setSearch(''); setStatusFilter('all') }}
            className="btn-sky-outline text-sm">
            Clear filters
          </button>
        </div>
      ) : (

        /* ── Application cards ──────────────────────────────────────────── */
        <div className="space-y-4">
          {filtered.map(app => {
            const cfg  = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending
            const Icon = cfg.icon
            const job  = app.jobId || {}

            return (
              <div key={app._id}
                className={`bg-white rounded-2xl shadow-card border overflow-hidden transition-all ${cfg.border}`}>

                {/* Top accent bar for shortlisted */}
                {app.status === 'shortlisted' && (
                  <div className="h-1.5 bg-emerald-500" />
                )}

                <div className="p-6">
                  {/* ── Main info row ── */}
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Status icon */}
                    <div className={`w-12 h-12 rounded-2xl ${cfg.bg} flex items-center justify-center flex-shrink-0 border ${cfg.border}`}>
                      <Icon className={`w-6 h-6 ${cfg.color}`} />
                    </div>

                    {/* Job details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-sky-900 text-base leading-tight">
                        {job.title || 'Position'}
                      </h3>
                      <div className="flex flex-wrap gap-3 mt-1.5">
                        {job.department && (
                          <span className="flex items-center gap-1 text-sky-400 text-xs">
                            <Briefcase className="w-3 h-3 flex-shrink-0" />
                            {job.department}
                          </span>
                        )}
                        {job.location && (
                          <span className="flex items-center gap-1 text-sky-400 text-xs">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-sky-400 text-xs">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          Applied {new Date(app.appliedAt).toLocaleDateString('en-US', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="flex-shrink-0 text-right">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      {job.type && (
                        <p className="text-sky-300 text-xs mt-1">{job.type}</p>
                      )}
                    </div>
                  </div>

                  {/* ── Progress tracker (not shown for rejected) ── */}
                  {app.status !== 'rejected' && (
                    <div className="mt-5 px-1">
                      <div className="flex items-start">
                        {STEPS.map((step, i) => {
                          const stepNum = i + 1
                          const done    = cfg.step >= stepNum
                          return (
                            <div key={step} className="flex items-center flex-1">
                              <div className="flex flex-col items-center flex-shrink-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                  done
                                    ? 'bg-sky-600 border-sky-600 text-white'
                                    : 'bg-white border-sky-200 text-sky-300'
                                }`}>
                                  {done
                                    ? <CheckCircle className="w-4 h-4" />
                                    : <span className="text-xs font-bold">{stepNum}</span>
                                  }
                                </div>
                                <span className={`text-xs mt-1.5 font-semibold text-center leading-tight max-w-[64px] ${
                                  done ? 'text-sky-700' : 'text-sky-300'
                                }`}>
                                  {step}
                                </span>
                              </div>
                              {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all ${
                                  cfg.step > stepNum ? 'bg-sky-600' : 'bg-sky-100'
                                }`} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Status message ── */}
                  <div className={`mt-4 rounded-xl p-3.5 border ${cfg.bg} ${cfg.border}`}>
                    <p className={`text-sm leading-relaxed ${cfg.color} ${app.status === 'shortlisted' ? 'font-semibold' : ''}`}>
                      {app.status === 'shortlisted' && '🎉 '}
                      {cfg.description}
                    </p>
                  </div>

                  {/* ── Footer row ── */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {job.type && <span className="badge-sky">{job.type}</span>}
                      {job.minimumExperienceYears != null && (
                        <span className="badge-sky">{job.minimumExperienceYears}+ yrs exp</span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelected(app)}
                      className="flex items-center gap-1.5 text-sky-500 hover:text-sky-700 text-xs font-semibold transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                      View Details
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

              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-sky-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                <h2 className="font-display text-lg font-bold text-sky-900">Application Details</h2>
                <button onClick={() => setSelected(null)} className="text-sky-400 hover:text-sky-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">

                {/* Status hero */}
                <div className={`rounded-2xl p-5 border ${cfg.bg} ${cfg.border} flex items-center gap-4`}>
                  <div className="w-12 h-12 rounded-2xl bg-white border border-sky-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Icon className={`w-6 h-6 ${cfg.color}`} />
                  </div>
                  <div>
                    <p className={`font-bold text-base ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-sky-600 text-xs mt-0.5 leading-relaxed">{cfg.description}</p>
                  </div>
                </div>

                {/* Application info */}
                <div>
                  <h3 className="font-display font-bold text-sky-900 text-sm uppercase tracking-wide mb-3">
                    Application Info
                  </h3>
                  <div className="space-y-0 divide-y divide-sky-50 border border-sky-100 rounded-2xl overflow-hidden">
                    {[
                      ['Job Title',      job.title      || '—'],
                      ['Department',     job.department || '—'],
                      ['Location',       job.location   || '—'],
                      ['Employment Type',job.type       || '—'],
                      ['Applied On',     new Date(selected.appliedAt).toLocaleDateString('en-US', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      })],
                      ['Application ID', selected._id?.slice(-8)?.toUpperCase() || '—'],
                      ['Current Status', cfg.label],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between px-4 py-3 bg-white">
                        <span className="text-sky-400 text-sm">{label}</span>
                        <span className="text-sky-900 text-sm font-semibold text-right max-w-[55%] capitalize">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills submitted */}
                {selected.talentProfile?.skills?.length > 0 && (
                  <div>
                    <h3 className="font-display font-bold text-sky-900 text-sm uppercase tracking-wide mb-3">
                      Skills Submitted
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selected.talentProfile.skills.map((s: any, i: number) => (
                        <span key={i} className="badge-sky">{s.name} · {s.level}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* What happens next */}
                {selected.status !== 'rejected' && (
                  <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
                    <p className="text-sky-700 text-sm font-semibold mb-2">What happens next?</p>
                    <ul className="space-y-2">
                      {selected.status === 'pending' && (
                        <>
                          <li className="flex items-start gap-2 text-sky-600 text-xs">
                            <span className="text-sky-400 mt-0.5 flex-shrink-0">→</span>
                            Your application is in the queue awaiting review by the hiring team.
                          </li>
                          <li className="flex items-start gap-2 text-sky-600 text-xs">
                            <span className="text-sky-400 mt-0.5 flex-shrink-0">→</span>
                            Make sure your profile is fully complete to improve your chances.
                          </li>
                        </>
                      )}
                      {selected.status === 'screened' && (
                        <li className="flex items-start gap-2 text-sky-600 text-xs">
                          <span className="text-sky-400 mt-0.5 flex-shrink-0">→</span>
                          The hiring team is reviewing your profile. This typically takes 2–5 business days.
                        </li>
                      )}
                      {selected.status === 'shortlisted' && (
                        <li className="flex items-start gap-2 text-emerald-600 text-xs font-semibold">
                          <span className="flex-shrink-0">🎉</span>
                          You have been shortlisted! Expect a call or email from the recruiter within 2–5 business days.
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setSelected(null)} className="flex-1 btn-ghost-sky border border-sky-200">
                    Close
                  </button>
                  <Link href="/applicant/jobs" onClick={() => setSelected(null)}
                    className="flex-1 btn-sky text-center flex items-center justify-center gap-2">
                    Browse More Jobs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
