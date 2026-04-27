'use client'
import { useEffect, useState, useCallback } from 'react'
import { screeningAPI, jobsAPI, applicantsAPI } from '@/lib/api'
import {
  Trophy, Download, Filter, Mail, CheckCircle, XCircle,
  ChevronUp, ChevronDown, Eye, X, Send, Briefcase,
  AlertTriangle, Star, Users, Award, RefreshCw,
  FileText, UserCheck, Clock, Search, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

// Types
type SortKey = 'rank' | 'name' | 'matchScore' | 'skillsMatch' | 'experienceMatch' | 'location'
type SortDir = 'asc' | 'desc'
type EmailType = 'shortlisted' | 'interview' | 'written_test' | 'hired' | 'rejected'

// Helpers
function scoreColor(s: number) {
  if (s >= 80) return '#10b981'
  if (s >= 60) return '#0ea5e9'
  if (s >= 40) return '#f59e0b'
  return '#ef4444'
}

function ScorePill({ score }: { score: number }) {
  const color = scoreColor(score)
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: color + '18', color }}>
      {score}
    </span>
  )
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-sky-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold text-sky-600 w-7">{value}</span>
    </div>
  )
}

function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return
  const h = Object.keys(rows[0])
  const csv = [h.join(','), ...rows.map(r => h.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename
  a.click()
}

const EMAIL_TEMPLATES: Record<EmailType, {
  label: string; icon: any; color: string
  subject: string; body: (name: string, job: string) => string
}> = {
  shortlisted: {
    label: 'Shortlisted', icon: Star, color: 'text-emerald-600',
    subject: "Congratulations — You've Been Shortlisted!",
    body: (name, job) =>
      `Dear ${name},\n\nCongratulations! We are pleased to inform you that you have been shortlisted for the position of ${job}.\n\nOur team was impressed with your profile and we would like to move forward with your application.\n\nWe will be in touch shortly with next steps.\n\nBest regards,\nHR Team`,
  },
  interview: {
    label: 'Interview Invite', icon: UserCheck, color: 'text-sky-600',
    subject: 'Interview Invitation — Next Step in Your Application',
    body: (name, job) =>
      `Dear ${name},\n\nWe are pleased to invite you for an interview for the position of ${job}.\n\nPlease reply to this email to confirm your availability and we will schedule a suitable time.\n\nBest regards,\nHR Team`,
  },
  written_test: {
    label: 'Written Test', icon: FileText, color: 'text-indigo-600',
    subject: 'Written Assessment Invitation',
    body: (name, job) =>
      `Dear ${name},\n\nAs part of the selection process for ${job}, we would like to invite you to complete a written assessment.\n\nDetails and instructions will be sent to you shortly.\n\nBest regards,\nHR Team`,
  },
  hired: {
    label: 'Offer / Hired', icon: Award, color: 'text-amber-600',
    subject: 'Job Offer — Congratulations!',
    body: (name, job) =>
      `Dear ${name},\n\nWe are delighted to offer you the position of ${job}.\n\nPlease find the formal offer letter attached. Kindly review and confirm your acceptance by responding to this email.\n\nWelcome to the team!\n\nBest regards,\nHR Team`,
  },
  rejected: {
    label: 'Not Selected', icon: XCircle, color: 'text-slate-500',
    subject: 'Update on Your Application',
    body: (name, job) =>
      `Dear ${name},\n\nThank you for your interest in the ${job} position and for the time you invested in our selection process.\n\nAfter careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\nWe appreciate your effort and encourage you to apply for future opportunities.\n\nBest regards,\nHR Team`,
  },
}

// Main Page
export default function HRShortlistPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [selectedJob, setSelectedJob] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Filters & sort
  const [statusFilter, setStatusFilter] = useState<'all' | 'shortlisted' | 'not_shortlisted'>('all')
  const [minScore, setMinScore] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [search, setSearch] = useState('')

  // Modals
  const [detailCand, setDetailCand] = useState<any>(null)
  const [emailCand, setEmailCand] = useState<any>(null)
  const [emailType, setEmailType] = useState<EmailType>('shortlisted')
  const [emailBody, setEmailBody] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [sending, setSending] = useState(false)
  const [sentEmails, setSentEmails] = useState<Record<string, EmailType[]>>({})

  // Load screening result for a given job
  const loadResult = useCallback(async (jobId: string) => {
    if (!jobId) return
    setLoading(true)
    setResult(null)
    setFetchError('')
    try {
      const r = await screeningAPI.latest(jobId)
      const data = r.data?.data ?? r.data
      if (!data) {
        setFetchError('No completed screening found for this job.')
      } else {
        setResult(data)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load screening result.'
      if (err?.response?.status === 404) {
        setResult(null)
        setFetchError('')
      } else {
        setFetchError(msg)
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const jobsRes = await jobsAPI.list()
        const allJobs: any[] = jobsRes.data?.data ?? []
        if (!cancelled) setJobs(allJobs)

        let autoJobId = ''
        try {
          const srRes = await screeningAPI.list({ status: 'completed' })
          const srList: any[] = srRes.data?.data ?? []
          if (srList.length > 0) {
            const first = srList[0]
            autoJobId = String(
              typeof first.jobId === 'object' && first.jobId !== null
                ? (first.jobId._id ?? first.jobId)
                : first.jobId
            )
          }
        } catch { /* no completed screenings yet */ }

        if (!autoJobId && allJobs.length > 0) autoJobId = String(allJobs[0]._id)

        if (!cancelled && autoJobId) {
          setSelectedJob(autoJobId)
          await loadResult(autoJobId)
        }
      } catch {
        if (!cancelled) toast.error('Failed to load jobs.')
      } finally {
        if (!cancelled) setPageReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [loadResult])

  // Job selector change
  const handleJobChange = (jobId: string) => {
    setSelectedJob(jobId)
    setStatusFilter('all')
    setMinScore(0)
    setSearch('')
    if (jobId) loadResult(jobId)
    else { setResult(null); setFetchError('') }
  }

  // Flatten candidates
  const rawCandidates: any[] = (() => {
    if (!result) return []
    const all = result.allCandidates
    if (Array.isArray(all) && all.length > 0) return all
    const sl = result.shortlist
    if (Array.isArray(sl) && sl.length > 0) return sl
    return []
  })()

  // Sort toggle
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // Filter + sort
  const filtered = rawCandidates
    .filter(c => {
      if (statusFilter === 'shortlisted' && c.isShortlisted === false) return false
      if (statusFilter === 'not_shortlisted' && c.isShortlisted !== false) return false
      if (c.matchScore < minScore) return false
      if (search) {
        const q = search.toLowerCase()
        const haystack = `${c.firstName ?? ''} ${c.lastName ?? ''} ${c.email ?? ''} ${c.location ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      let va: any, vb: any
      switch (sortKey) {
        case 'rank': va = a.rank ?? 999; vb = b.rank ?? 999; break
        case 'name': va = `${a.firstName}${a.lastName}`.toLowerCase(); vb = `${b.firstName}${b.lastName}`.toLowerCase(); break
        case 'matchScore': va = a.matchScore ?? 0; vb = b.matchScore ?? 0; break
        case 'skillsMatch': va = a.scoreBreakdown?.skillsMatch ?? 0; vb = b.scoreBreakdown?.skillsMatch ?? 0; break
        case 'experienceMatch': va = a.scoreBreakdown?.experienceMatch ?? 0; vb = b.scoreBreakdown?.experienceMatch ?? 0; break
        case 'location': va = a.location ?? ''; vb = b.location ?? ''; break
        default: va = 0; vb = 0
      }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

  const shortlistedCount = rawCandidates.filter(c => c.isShortlisted !== false).length
  const notShortlistedCount = rawCandidates.filter(c => c.isShortlisted === false).length

  // Email helpers
  const openEmail = (c: any) => {
    const defaultType: EmailType = c.isShortlisted !== false ? 'shortlisted' : 'rejected'
    setEmailCand(c)
    setEmailType(defaultType)
    setEmailSubject(EMAIL_TEMPLATES[defaultType].subject)
    setEmailBody(EMAIL_TEMPLATES[defaultType].body(
      `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
      result?.jobTitle ?? ''
    ))
  }

  const changeEmailType = (type: EmailType) => {
    if (!emailCand) return
    setEmailType(type)
    setEmailSubject(EMAIL_TEMPLATES[type].subject)
    setEmailBody(EMAIL_TEMPLATES[type].body(
      `${emailCand.firstName ?? ''} ${emailCand.lastName ?? ''}`.trim(),
      result?.jobTitle ?? ''
    ))
  }

  const sendEmail = async () => {
    if (!emailCand) return
    setSending(true)
    try {
      const statusMap: Record<EmailType, string> = {
        shortlisted: 'shortlisted', interview: 'shortlisted',
        written_test: 'shortlisted', hired: 'hired', rejected: 'rejected',
      }
      const applicantId = emailCand.applicantId || emailCand._id
      await applicantsAPI.updateStatus(applicantId, statusMap[emailType])
      setSentEmails(prev => ({
        ...prev,
        [applicantId]: [...(prev[applicantId] || []), emailType],
      }))
      toast.success(`${EMAIL_TEMPLATES[emailType].label} notification sent to ${emailCand.firstName}!`)
      setEmailCand(null)
    } catch {
      toast.error('Failed to send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    if (!result?._id) return
    setDeleting(true)
    try {
      await screeningAPI.deleteScreening(result._id)
      setResult(null)
      setSelectedJob('')
      setShowDeleteConfirm(false)
      toast.success('Screening result deleted. Job is available for re-screening.')
    } catch {
      toast.error('Failed to delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = () => {
    const rows = filtered.map(c => ({
      Rank: c.rank ?? '—',
      Name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
      Email: c.email ?? '—',
      Location: c.location ?? '—',
      'Overall Score': c.matchScore,
      'Skills Match': c.scoreBreakdown?.skillsMatch ?? '—',
      'Experience Match': c.scoreBreakdown?.experienceMatch ?? '—',
      'Education Match': c.scoreBreakdown?.educationMatch ?? '—',
      'Project Relevance': c.scoreBreakdown?.projectRelevance ?? '—',
      Shortlisted: c.isShortlisted !== false ? 'Yes' : 'No',
      Recommendation: c.recommendation ?? '—',
    }))
    exportCSV(rows, `shortlist-${(result?.jobTitle ?? 'export').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`)
  }

  // Sort header
  const SortTh = ({ label, colKey, className = '' }: { label: string; colKey: SortKey; className?: string }) => (
    <th onClick={() => toggleSort(colKey)}
      className={`px-4 py-3 text-left text-xs font-bold text-sky-500 uppercase
                  tracking-wide cursor-pointer hover:text-sky-700 select-none
                  whitespace-nowrap ${className}`}>
      <span className="flex items-center gap-1">
        {label}
        {sortKey === colKey
          ? sortDir === 'asc'
            ? <ChevronUp className="w-3 h-3 text-sky-500" />
            : <ChevronDown className="w-3 h-3 text-sky-500" />
          : <ChevronDown className="w-3 h-3 text-sky-200" />}
      </span>
    </th>
  )

  return (
    <div className="space-y-5 max-w-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-sky-900">
            Shortlists & Results
          </h1>
          <p className="text-sky-400 text-sm mt-0.5">
            AI-ranked candidates — click a row to view details, use mail icon to notify
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => selectedJob && loadResult(selectedJob)}
            disabled={loading || !selectedJob}
            className="w-10 h-10 flex items-center justify-center border-2 border-sky-100
                       bg-white text-sky-500 rounded-xl hover:bg-sky-50 transition-colors
                       disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {result && (
            <>
              <button onClick={handleExport}
                className="flex items-center gap-2 border-2 border-sky-100 bg-white text-sky-600
                           text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-sky-50
                           transition-colors min-h-[44px]">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 border-2 border-red-200 bg-white text-red-500
                           text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors min-h-[44px]">
                <Trash2 className="w-4 h-4" /> Delete Result
              </button>
            </>
          )}
          <Link href="/hr/screening"
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white
                       text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors min-h-[44px]">
            Run New Screening
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border-2 border-sky-100 p-4
                      shadow-[0_2px_16px_rgba(14,165,233,0.08)]">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-sky-400 flex-shrink-0" />

          <select
            value={selectedJob}
            onChange={e => handleJobChange(e.target.value)}
            className="border-2 border-sky-200 rounded-xl px-3 h-10 text-sm text-sky-700
                       outline-none bg-sky-50 focus:border-sky-400 transition-colors
                       min-w-[200px] flex-1 max-w-xs"
          >
            <option value="">Select a job…</option>
            {jobs.map(j => (
              <option key={String(j._id)} value={String(j._id)}>
                {j.title} — {j.department}
              </option>
            ))}
          </select>

          {result && (
            <div className="flex items-center gap-1 bg-sky-50 border-2 border-sky-100 rounded-xl p-1">
              {[
                { key: 'all', label: `All (${rawCandidates.length})` },
                { key: 'shortlisted', label: `✓ (${shortlistedCount})` },
                { key: 'not_shortlisted', label: `✗ (${notShortlistedCount})` },
              ].map(opt => (
                <button key={opt.key} onClick={() => setStatusFilter(opt.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                              whitespace-nowrap min-h-[36px] ${
                    statusFilter === opt.key
                      ? 'bg-white text-sky-700 shadow-sm'
                      : 'text-sky-500 hover:text-sky-700'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-sky-500 font-semibold whitespace-nowrap">Min score:</span>
              <input type="range" min={0} max={100} step={5} value={minScore}
                onChange={e => setMinScore(Number(e.target.value))}
                className="w-20 accent-sky-500" />
              <span className="text-xs font-bold text-sky-600 w-6">{minScore}</span>
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 border-2 border-sky-200 rounded-xl px-3 h-10
                            bg-white focus-within:border-sky-400 transition-colors">
              <Search className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
              <input type="text" placeholder="Search name, email…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="text-sm text-sky-700 outline-none bg-transparent w-36
                           placeholder-sky-300" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="text-sky-300 hover:text-sky-600 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* States */}
      {!pageReady && (
        <div className="bg-white rounded-2xl border-2 border-sky-100 p-16 text-center">
          <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent
                          rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sky-400 text-sm">Loading latest screening results…</p>
        </div>
      )}

      {pageReady && loading && (
        <div className="bg-white rounded-2xl border-2 border-sky-100 p-12 text-center">
          <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent
                          rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sky-400 text-sm">Loading screening result…</p>
        </div>
      )}

      {pageReady && !loading && !selectedJob && (
        <div className="bg-white rounded-2xl border-2 border-sky-100 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-7 h-7 text-sky-400" />
          </div>
          <h3 className="font-display text-lg font-bold text-sky-900 mb-2">Select a job above</h3>
          <p className="text-sky-400 text-sm">Choose a job position to view its screened candidates.</p>
        </div>
      )}

      {pageReady && !loading && fetchError && (
        <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Could not load screening result</p>
            <p className="text-red-500 text-xs mt-1">{fetchError}</p>
            <button onClick={() => selectedJob && loadResult(selectedJob)}
              className="mt-3 text-xs font-semibold text-red-600 underline hover:text-red-800">
              Try again
            </button>
          </div>
        </div>
      )}

      {pageReady && !loading && !fetchError && selectedJob && !result && (
        <div className="bg-white rounded-2xl border-2 border-sky-100 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-sky-400" />
          </div>
          <h3 className="font-display text-lg font-bold text-sky-900 mb-2">No screening run yet</h3>
          <p className="text-sky-400 text-sm mb-5">
            Run an AI screening for this job to see ranked candidates here.
          </p>
          <Link href="/hr/screening"
            className="inline-flex items-center gap-2 bg-sky-500 text-white font-semibold
                       px-5 py-2.5 rounded-xl hover:bg-sky-600 transition-colors">
            Go to Screening
          </Link>
        </div>
      )}

      {/* Results */}
      {pageReady && !loading && result && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Job', value: result.jobTitle ?? '—', icon: Briefcase, color: 'bg-sky-100 text-sky-700' },
              { label: 'Evaluated', value: result.totalApplicantsEvaluated ?? rawCandidates.length, icon: Users, color: 'bg-sky-100 text-sky-700' },
              { label: 'Shortlisted', value: shortlistedCount, icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700' },
              { label: 'Top Score', value: result.shortlist?.[0]?.matchScore ?? (rawCandidates[0]?.matchScore ?? '—'), icon: Award, color: 'bg-amber-100 text-amber-700' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-3 flex items-center gap-3`}>
                <s.icon className="w-5 h-5 flex-shrink-0 opacity-70" />
                <div className="min-w-0">
                  <p className="font-display font-bold text-base leading-tight truncate">{s.value}</p>
                  <p className="text-[11px] font-semibold opacity-70 uppercase tracking-wide">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Count + legend */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sky-400 text-sm">
              Showing <span className="font-bold text-sky-700">{filtered.length}</span> of{' '}
              {rawCandidates.length} candidates
            </p>
            <div className="flex items-center gap-3 text-xs text-sky-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300 inline-block" />
                Shortlisted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-50 border border-red-200 inline-block" />
                Not selected
              </span>
            </div>
          </div>

          {/* TABLE */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-sky-100 p-12 text-center">
              <p className="text-sky-400 text-sm">No candidates match the current filters.</p>
              <button onClick={() => { setStatusFilter('all'); setMinScore(0); setSearch('') }}
                className="mt-3 text-xs text-sky-500 underline font-semibold">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-sky-100 overflow-hidden
                            shadow-[0_2px_16px_rgba(14,165,233,0.08)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-sky-50 border-b-2 border-sky-100">
                      <SortTh label="#" colKey="rank" className="w-12 text-center" />
                      <SortTh label="Candidate" colKey="name" />
                      <SortTh label="Score" colKey="matchScore" className="w-20" />
                      <SortTh label="Skills" colKey="skillsMatch" className="w-28 hidden sm:table-cell" />
                      <SortTh label="Experience" colKey="experienceMatch" className="w-28 hidden md:table-cell" />
                      <SortTh label="Location" colKey="location" className="w-32 hidden lg:table-cell" />
                      <th className="px-4 py-3 text-left text-xs font-bold text-sky-500 uppercase tracking-wide w-32">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-sky-500 uppercase tracking-wide w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, idx) => {
                      const isShort = c.isShortlisted !== false
                      const applicantId = String(c.applicantId ?? c._id ?? '')
                      const sentList = sentEmails[applicantId] || []
                      return (
                        <tr key={applicantId || idx}
                          onClick={() => setDetailCand(c)}
                          className={`border-b border-sky-50 transition-colors cursor-pointer
                            ${isShort
                              ? 'bg-emerald-50/60 hover:bg-emerald-100/60'
                              : 'bg-red-50/40 hover:bg-red-50/80'
                            }`}>
                          {/* Rank */}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center
                                             w-7 h-7 rounded-full text-xs font-bold border-2 ${
                              c.rank === 1 ? 'bg-amber-100 border-amber-300 text-amber-700' :
                              c.rank === 2 ? 'bg-slate-100 border-slate-300 text-slate-600' :
                              c.rank === 3 ? 'bg-orange-100 border-orange-300 text-orange-600' :
                              isShort ? 'bg-emerald-100 border-emerald-300 text-emerald-700' :
                              'bg-red-100 border-red-200 text-red-500'
                            }`}>
                              {c.rank ?? (idx + 1)}
                            </span>
                          </td>

                          {/* Candidate */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                                              text-white font-bold text-sm flex-shrink-0 shadow-sm
                                              ${isShort
                                                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                                                : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                                {(c.firstName?.[0] ?? '?')}{(c.lastName?.[0] ?? '')}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sky-900 text-sm truncate max-w-[160px]">
                                  {c.firstName} {c.lastName}
                                </p>
                                <p className="text-sky-400 text-xs truncate max-w-[160px]">
                                  {c.email ?? c.headline ?? '—'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Overall score */}
                          <td className="px-4 py-3">
                            <ScorePill score={c.matchScore ?? 0} />
                          </td>

                          {/* Skills */}
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <MiniBar value={c.scoreBreakdown?.skillsMatch ?? 0} color="#0ea5e9" />
                          </td>

                          {/* Experience */}
                          <td className="px-4 py-3 hidden md:table-cell">
                            <MiniBar value={c.scoreBreakdown?.experienceMatch ?? 0} color="#6366f1" />
                          </td>

                          {/* Location */}
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs text-sky-500 truncate max-w-[120px] block">
                              {c.location ?? '—'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            {isShort ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold
                                               bg-emerald-100 text-emerald-700 border border-emerald-300
                                               px-2.5 py-1 rounded-full whitespace-nowrap">
                                <CheckCircle className="w-3 h-3" /> Shortlisted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold
                                               bg-red-100 text-red-600 border border-red-200
                                               px-2.5 py-1 rounded-full whitespace-nowrap">
                                <XCircle className="w-3 h-3" /> Not Selected
                              </span>
                            )}
                            {sentList.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {sentList.map(t => (
                                  <span key={t} className="text-[10px] bg-sky-100 text-sky-600
                                                           px-1.5 py-0.5 rounded-full font-semibold">
                                    ✉ {EMAIL_TEMPLATES[t].label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => setDetailCand(c)} title="View details"
                                className="w-8 h-8 flex items-center justify-center rounded-lg
                                           bg-sky-100 text-sky-600 hover:bg-sky-200 transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => openEmail(c)} title="Send notification"
                                className={`w-8 h-8 flex items-center justify-center rounded-lg
                                            transition-colors ${
                                  isShort
                                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}>
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-5 py-3 bg-sky-50/50 border-t border-sky-100
                              flex items-center justify-between flex-wrap gap-2">
                <span className="text-sky-400 text-xs">
                  {shortlistedCount} shortlisted · {notShortlistedCount} not selected · {rawCandidates.length} total
                </span>
                <span className="text-sky-400 text-xs">
                  Sorted by: <span className="font-semibold text-sky-600">{sortKey}</span> ({sortDir})
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* DETAIL MODAL */}
      {detailCand && (
        <div className="fixed inset-0 bg-sky-900/50 backdrop-blur-sm z-50
                        flex items-center justify-center p-4"
          onClick={() => setDetailCand(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh]
                          overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>

            <div className="sticky top-0 bg-white border-b border-sky-100 px-6 py-4
                            flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center
                                text-white font-bold text-base flex-shrink-0
                                ${detailCand.isShortlisted !== false
                                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                                  : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                  {detailCand.firstName?.[0]}{detailCand.lastName?.[0]}
                </div>
                <div>
                  <h2 className="font-display font-bold text-sky-900 text-lg">
                    {detailCand.firstName} {detailCand.lastName}
                  </h2>
                  <p className="text-sky-400 text-xs">
                    Rank #{detailCand.rank ?? '—'} · Score {detailCand.matchScore}/100
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setDetailCand(null); openEmail(detailCand) }}
                  className="flex items-center gap-1.5 bg-sky-500 text-white text-xs
                             font-semibold px-3 py-2 rounded-lg hover:bg-sky-600
                             transition-colors min-h-[36px]">
                  <Mail className="w-3.5 h-3.5" /> Notify
                </button>
                <button onClick={() => setDetailCand(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl
                             text-sky-400 hover:bg-sky-50 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

           {/* Rest of modal content - status, score breakdown, etc. */}
            <div className="p-6 space-y-5">
              {/* Status */}
              <div className={`flex items-start gap-3 p-4 rounded-xl border-2 ${
                detailCand.isShortlisted !== false
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'}`}>
                {detailCand.isShortlisted !== false
                  ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className={`font-bold text-sm ${
                    detailCand.isShortlisted !== false ? 'text-emerald-700' : 'text-red-600'}`}>
                    {detailCand.isShortlisted !== false
                      ? 'Shortlisted for this role'
                      : 'Not selected for this role'}
                  </p>
                  {detailCand.shortlistedReason && (
                    <p className="text-xs text-sky-600 mt-1 leading-relaxed">
                      {detailCand.shortlistedReason}
                    </p>
                  )}
                </div>
              </div>

              {/* Score breakdown */}
              {Object.keys(detailCand.scoreBreakdown ?? {}).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-3">
                    Score Breakdown
                  </p>
                  {Object.entries(detailCand.scoreBreakdown).map(([k, v]: any) => (
                    <div key={k} className="flex items-center gap-3 mb-2">
                      <span className="text-sky-600 text-xs capitalize w-36 flex-shrink-0">
                        {k.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div className="flex-1 h-2 bg-sky-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width:`${v}%`, background: scoreColor(v) }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right"
                        style={{ color: scoreColor(v) }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Strengths & Gaps */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-wide mb-2">
                    Strengths
                  </p>
                  {(detailCand.strengths ?? []).map((s: string, i: number) => (
                    <p key={i} className="text-emerald-800 text-xs mb-1 flex gap-1 leading-relaxed">
                      <span className="flex-shrink-0">✓</span>{s}
                    </p>
                  ))}
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-amber-600 text-[10px] font-bold uppercase tracking-wide mb-2">
                    Gaps
                  </p>
                  {(detailCand.gaps ?? []).map((g: string, i: number) => (
                    <p key={i} className="text-amber-800 text-xs mb-1 flex gap-1 leading-relaxed">
                      <span className="flex-shrink-0">⚠</span>{g}
                    </p>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              {detailCand.recommendation && (
                <div className="bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl p-4">
                  <p className="text-sky-100 text-[10px] font-bold uppercase tracking-wide mb-1">
                    Recommendation
                  </p>
                  <p className="text-white text-sm leading-relaxed">{detailCand.recommendation}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EMAIL MODAL */}
      {emailCand && (
        <div className="fixed inset-0 bg-sky-900/50 backdrop-blur-sm z-50
                        flex items-center justify-center p-4"
          onClick={() => setEmailCand(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-4
                            flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold">Notify Applicant</p>
                  <p className="text-sky-100 text-xs">
                    {emailCand.firstName} {emailCand.lastName}
                  </p>
                </div>
              </div>
              <button onClick={() => setEmailCand(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl
                           text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Type selector */}
              <div>
                <p className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-2">
                  Notification Type
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.entries(EMAIL_TEMPLATES) as [EmailType, any][]).map(([type, tmpl]) => (
                    <button key={type} onClick={() => changeEmailType(type)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2
                                  transition-all text-xs font-semibold min-h-[64px] ${
                        emailType === type
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-sky-100 text-sky-400 hover:border-sky-300 hover:text-sky-600'
                      }`}>
                      <tmpl.icon className={`w-4 h-4 ${emailType === type ? tmpl.color : ''}`} />
                      <span className="text-center leading-tight text-[10px]">{tmpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-1 block">
                  Subject
                </label>
                <input type="text" value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full border-2 border-sky-200 rounded-xl px-3 py-2.5 text-sm
                             text-sky-800 outline-none focus:border-sky-400 transition-colors" />
              </div>

              {/* Body */}
              <div>
                <label className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-1 block">
                  Message
                </label>
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}
                  rows={7}
                  className="w-full border-2 border-sky-200 rounded-xl px-3 py-2.5 text-sm
                             text-sky-800 outline-none focus:border-sky-400 transition-colors resize-none" />
              </div>

              <p className="text-[11px] text-sky-400 flex items-start gap-1.5">
                <Clock className="w-3 h-3 flex-shrink-0 mt-0.5" />
                Sending this updates the applicant's status in the system and the result
                appears on their application page.
              </p>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setEmailCand(null)}
                  className="flex-1 border-2 border-sky-200 text-sky-600 font-semibold
                             py-3 rounded-xl hover:bg-sky-50 transition-colors min-h-[48px]">
                  Cancel
                </button>
                <button onClick={sendEmail} disabled={sending}
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-semibold
                             py-3 rounded-xl transition-colors min-h-[48px]
                             flex items-center justify-center gap-2 disabled:opacity-60">
                  {sending
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent
                                        rounded-full animate-spin" /> Sending…</>
                    : <><Send className="w-4 h-4" /> Send Notification</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-sky-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold">Delete Screening Result</p>
                <p className="text-red-100 text-xs">This action cannot be undone</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 rounded-xl p-4 border-2 border-red-100">
                <p className="text-red-700 font-semibold text-sm mb-1">
                  Are you sure you want to delete the screening for:
                </p>
                <p className="text-red-900 font-bold text-base">{result?.jobTitle}</p>
              </div>

              <ul className="space-y-2">
                {[
                  'All candidate scores and rankings will be removed',
                  'All applicants will be reset to pending status',
                  'The job will reappear in the screening page',
                  'You can run a fresh screening with new settings',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sky-600 text-xs">
                    <span className="text-sky-400 flex-shrink-0 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 border-2 border-sky-200 text-sky-600 font-semibold
                             py-3 rounded-xl hover:bg-sky-50 transition-colors min-h-[48px]
                             disabled:opacity-50">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold
                             py-3 rounded-xl transition-colors min-h-[48px]
                             flex items-center justify-center gap-2 disabled:opacity-60">
                  {deleting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deleting…</>
                    : <><Trash2 className="w-4 h-4" /> Yes, Delete It</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
