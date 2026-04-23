'use client'
import { useEffect, useState, useCallback } from 'react'
import { jobsAPI, applicantsAPI } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import {
  Search, MapPin, Clock, Briefcase, X,
  Loader2, CheckCircle, Filter, ChevronDown,
  AlertTriangle, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

// ── Profile completion helper (mirrors profile page logic) ──────────────────
function getProfileCompletion(userId: string): number {
  try {
    const saved = localStorage.getItem(`umurava_profile_${userId}`)
    if (!saved) return 0
    const p = JSON.parse(saved)
    const checks = [
      !!p.firstName, !!p.lastName, !!p.email, !!p.phone,
      !!p.headline, !!p.bio, !!p.location, !!p.nationality,
      !!p.dateOfBirth, !!p.gender,
      p.skills?.length > 0, p.languages?.length > 0,
      p.experience?.length > 0, p.education?.length > 0,
      p.certifications?.length > 0, p.projects?.length > 0,
      !!p.availabilityStatus, !!p.availabilityType,
      !!p.expectedSalary,
      !!p.resumeUrl, !!p.coverLetterUrl,
      !!p.linkedIn, !!p.github,
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  } catch { return 0 }
}

// ── Status config ───────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  active:    'Accepting Applications',
  screening: 'Under Review',
  closed:    'Position Filled',
  draft:     'Coming Soon',
}

export default function ApplicantJobsPage() {
  const { user } = useAuth()

  // Data
  const [jobs, setJobs]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied]   = useState<Set<string>>(new Set())

  // Filters
  const [search,     setSearch]     = useState('')
  const [department, setDepartment] = useState('all')
  const [location,   setLocation]   = useState('all')
  const [jobType,    setJobType]    = useState('all')
  const [expFilter,  setExpFilter]  = useState('all')
  const [showFilter, setShowFilter] = useState(false)

  // Profile completion
  const [completion, setCompletion] = useState(0)

  useEffect(() => {
    if (user) setCompletion(getProfileCompletion(user.id))
  }, [user])

  // Load jobs from backend
  const loadJobs = useCallback(() => {
    setLoading(true)
    jobsAPI.list({
      status:     'active',
      search:     search     || undefined,
      department: department !== 'all' ? department : undefined,
      location:   location   !== 'all' ? location   : undefined,
    })
      .then(r => setJobs(r.data.data))
      .catch(() => toast.error('Failed to load positions'))
      .finally(() => setLoading(false))
  }, [search, department, location])

  useEffect(() => { loadJobs() }, [loadJobs])

  // Load already-applied jobs from backend
  useEffect(() => {
    if (!user) return
    applicantsAPI.list({ limit: 200 })
      .then(r => {
        const mine = r.data.data.filter((a: any) => a.talentProfile?.email === user.email)
        setApplied(new Set(mine.map((a: any) => a.jobId?._id || a.jobId)))
      })
      .catch(() => {})
  }, [user])

  // Client-side filters on top of backend results
  const filtered = jobs.filter(j => {
    if (jobType !== 'all' && j.type !== jobType) return false
    if (expFilter !== 'all') {
      const y = j.minimumExperienceYears || 0
      if (expFilter === '0-2' && y > 2)  return false
      if (expFilter === '3-5' && (y < 3 || y > 5)) return false
      if (expFilter === '6+'  && y < 6)  return false
    }
    return true
  })

  // Unique filter options from loaded jobs
  const departments = ['all', ...Array.from(new Set(jobs.map(j => j.department).filter(Boolean)))]
  const locations   = ['all', ...Array.from(new Set(jobs.map(j => j.location).filter(Boolean)))]

  // ── Apply handler ─────────────────────────────────────────────────────────
  const apply = async (job: any) => {
    if (!user) return

    // Block if profile < 80%
    if (completion < 80) {
      toast.error(`Complete your profile to at least 80% before applying. You are at ${completion}%.`, { duration: 5000 })
      return
    }

    setApplying(true)
    try {
      // Build talent profile from saved localStorage data
      const saved = localStorage.getItem(`umurava_profile_${user.id}`)
      const p = saved ? JSON.parse(saved) : {}

      await applicantsAPI.create({
        jobId:  job._id,
        source: 'umurava_platform',
        talentProfile: {
          firstName:  p.firstName  || user.firstName,
          lastName:   p.lastName   || user.lastName,
          email:      p.email      || user.email,
          headline:   p.headline   || `${user.firstName} ${user.lastName}`,
          bio:        p.bio        || '',
          location:   p.location   || 'Not specified',
          skills:     (p.skills || []).map((s: any) => ({
            name: s.name, level: s.level, yearsOfExperience: s.yearsOfExperience,
          })),
          languages:  p.languages  || [],
          experience: (p.experience || []).map((e: any) => ({
            company: e.company, role: e.role, startDate: e.startDate,
            endDate: e.isCurrent ? 'Present' : e.endDate,
            description: e.description,
            technologies: e.technologies ? e.technologies.split(',').map((t: string) => t.trim()) : [],
            isCurrent: e.isCurrent,
          })),
          education:  (p.education || []).map((e: any) => ({
            institution: e.institution, degree: e.degree,
            fieldOfStudy: e.fieldOfStudy,
            startYear: Number(e.startYear), endYear: Number(e.endYear),
          })),
          certifications: (p.certifications || []).map((c: any) => ({
            name: c.name, issuer: c.issuer, issueDate: c.issueDate,
          })),
          projects: (p.projects || []).map((pr: any) => ({
            name: pr.name, description: pr.description,
            technologies: pr.technologies ? pr.technologies.split(',').map((t: string) => t.trim()) : [],
            role: pr.role, link: pr.link, startDate: pr.startDate, endDate: pr.endDate,
          })),
          availability: {
            status:    p.availabilityStatus || 'Available',
            type:      p.availabilityType   || 'Full-time',
            startDate: p.availableFrom      || undefined,
          },
          socialLinks: {
            linkedin:  p.linkedIn   || undefined,
            github:    p.github     || undefined,
            portfolio: p.portfolio  || undefined,
          },
        },
      })

      setApplied(prev => new Set([...prev, job._id]))
      toast.success(`Successfully applied to ${job.title}!`)
      setSelected(null)
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Application failed'
      if (msg.includes('already exists')) {
        setApplied(prev => new Set([...prev, job._id]))
        toast.error('You have already applied to this position.')
      } else {
        toast.error(msg)
      }
    } finally {
      setApplying(false)
    }
  }

  const canApply = completion >= 80

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="text-center py-8">
        <h1 className="font-display text-4xl font-bold text-sky-950 mb-3">
          Find Your Next <span className="gradient-text">Opportunity</span>
        </h1>
        <p className="text-sky-500 text-lg">Browse open positions and apply today</p>
      </div>

      {/* ── Profile completion warning ────────────────────────────────────── */}
      {!canApply && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4 max-w-3xl mx-auto">
          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-800 font-semibold text-sm">Your profile is {completion}% complete</p>
            <p className="text-amber-600 text-xs mt-1">
              You need at least <strong>80%</strong> profile completion before applying to any position.
              Complete your profile to unlock applications.
            </p>
            <div className="mt-2 h-2 bg-amber-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>
          <Link href="/applicant/profile"
            className="flex items-center gap-1 text-amber-700 font-bold text-xs whitespace-nowrap hover:underline">
            Complete Profile <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* ── Search + Filter bar ───────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto space-y-3">
        {/* Search row */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 bg-white border-2 border-sky-200 focus-within:border-sky-400 rounded-2xl px-5 h-12 shadow-sky-sm">
            <Search className="w-5 h-5 text-sky-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by job title, skill or keyword…"
              className="flex-1 outline-none text-sky-900 placeholder-sky-300 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-sky-300 hover:text-sky-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`flex items-center gap-2 px-5 h-12 rounded-2xl border-2 font-semibold text-sm transition-all ${
              showFilter ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-sky-200 bg-white text-sky-500'
            }`}>
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilter ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter dropdowns */}
        {showFilter && (
          <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-card grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-1.5 block">Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value)}
                className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 h-9 text-sm text-sky-700 outline-none">
                {departments.map(d => (
                  <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-1.5 block">Location</label>
              <select value={location} onChange={e => setLocation(e.target.value)}
                className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 h-9 text-sm text-sky-700 outline-none">
                {locations.map(l => (
                  <option key={l} value={l}>{l === 'all' ? 'All Locations' : l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-1.5 block">Job Type</label>
              <select value={jobType} onChange={e => setJobType(e.target.value)}
                className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 h-9 text-sm text-sky-700 outline-none">
                <option value="all">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-1.5 block">Experience</label>
              <select value={expFilter} onChange={e => setExpFilter(e.target.value)}
                className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 h-9 text-sm text-sky-700 outline-none">
                <option value="all">Any Level</option>
                <option value="0-2">0–2 years</option>
                <option value="3-5">3–5 years</option>
                <option value="6+">6+ years</option>
              </select>
            </div>
            {/* Active filter chips */}
            {(department !== 'all' || location !== 'all' || jobType !== 'all' || expFilter !== 'all') && (
              <div className="col-span-2 sm:col-span-4 flex items-center gap-2 flex-wrap pt-1 border-t border-sky-50">
                <span className="text-sky-400 text-xs">Active:</span>
                {department !== 'all' && (
                  <button onClick={() => setDepartment('all')}
                    className="flex items-center gap-1 bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-sky-200">
                    {department} <X className="w-3 h-3" />
                  </button>
                )}
                {location !== 'all' && (
                  <button onClick={() => setLocation('all')}
                    className="flex items-center gap-1 bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-sky-200">
                    {location} <X className="w-3 h-3" />
                  </button>
                )}
                {jobType !== 'all' && (
                  <button onClick={() => setJobType('all')}
                    className="flex items-center gap-1 bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-sky-200">
                    {jobType} <X className="w-3 h-3" />
                  </button>
                )}
                {expFilter !== 'all' && (
                  <button onClick={() => setExpFilter('all')}
                    className="flex items-center gap-1 bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-sky-200">
                    {expFilter} yrs <X className="w-3 h-3" />
                  </button>
                )}
                <button onClick={() => { setDepartment('all'); setLocation('all'); setJobType('all'); setExpFilter('all') }}
                  className="text-red-400 text-xs font-semibold hover:text-red-600 ml-auto">
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}

        {/* Result count */}
        <div className="flex items-center justify-between text-sm text-sky-500 px-1">
          <span>
            <strong className="text-sky-700">{filtered.length}</strong> position{filtered.length !== 1 ? 's' : ''} found
          </span>
          {canApply && (
            <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5" /> Profile {completion}% — ready to apply
            </span>
          )}
        </div>
      </div>

      {/* ── Job grid ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-52 shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-card">
          <Briefcase className="w-12 h-12 text-sky-200 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-sky-900 mb-2">No positions found</h3>
          <p className="text-sky-400 mb-4">Try adjusting your filters or search terms.</p>
          <button onClick={() => { setSearch(''); setDepartment('all'); setLocation('all'); setJobType('all'); setExpFilter('all') }}
            className="btn-sky-outline text-sm">Clear filters</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(job => {
            const isApplied = applied.has(job._id)
            return (
              <div key={job._id}
                className="bg-white rounded-2xl p-6 shadow-card card-hover border border-sky-50 cursor-pointer flex flex-col"
                onClick={() => setSelected(job)}>

                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-sky-500" />
                  </div>
                  {isApplied ? (
                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Applied
                    </span>
                  ) : (
                    <span className="badge-active text-xs">{STATUS_LABELS[job.status] || job.status}</span>
                  )}
                </div>

                <h3 className="font-display font-bold text-sky-900 text-base mb-1 leading-tight">{job.title}</h3>
                <p className="text-sky-400 text-xs font-semibold uppercase tracking-wide mb-3">{job.department}</p>

                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="flex items-center gap-1 text-sky-500 text-xs">
                    <MapPin className="w-3 h-3 flex-shrink-0" />{job.location}
                  </span>
                  <span className="flex items-center gap-1 text-sky-500 text-xs">
                    <Clock className="w-3 h-3 flex-shrink-0" />{job.type}
                  </span>
                </div>

                <p className="text-sky-600 text-sm line-clamp-2 mb-4 flex-1">{job.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(job.requiredSkills || []).slice(0, 3).map((s: string) => (
                    <span key={s} className="badge-sky">{s}</span>
                  ))}
                  {(job.requiredSkills || []).length > 3 && (
                    <span className="badge-sky">+{job.requiredSkills.length - 3} more</span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-sky-400 text-xs">{job.minimumExperienceYears || 0}+ yrs experience</span>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      if (!canApply) {
                        toast.error(`Complete your profile to at least 80% before applying. Currently ${completion}%.`, { duration: 4000 })
                        return
                      }
                      if (!isApplied) apply(job)
                    }}
                    disabled={isApplied || applying}
                    className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                      isApplied
                        ? 'bg-emerald-100 text-emerald-600 cursor-default'
                        : !canApply
                        ? 'bg-sky-100 text-sky-400 cursor-not-allowed'
                        : 'btn-sky'
                    }`}>
                    {isApplied ? '✓ Applied' : !canApply ? `Profile ${completion}%` : 'Apply Now'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Job detail modal ───────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-sky-lg">
            <div className="sticky top-0 bg-white border-b border-sky-100 px-8 py-5 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="font-display text-xl font-bold text-sky-900">{selected.title}</h2>
                <p className="text-sky-400 text-sm">{selected.department} · {selected.location}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-sky-400 hover:text-sky-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className="badge-active">{STATUS_LABELS[selected.status] || selected.status}</span>
                <span className="badge-sky">{selected.type}</span>
                <span className="badge-sky">{selected.minimumExperienceYears || 0}+ years experience</span>
                <span className="badge-sky">{selected.department}</span>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-display font-bold text-sky-900 mb-3">About this Role</h3>
                <p className="text-sky-700 leading-relaxed text-sm">{selected.description}</p>
              </div>

              {/* Requirements */}
              {selected.requirements?.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Requirements</h3>
                  <ul className="space-y-2">
                    {selected.requirements.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sky-700 text-sm">
                        <span className="text-sky-400 flex-shrink-0 mt-1">•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Required Skills */}
              {selected.requiredSkills?.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.requiredSkills.map((s: string) => (
                      <span key={s} className="badge-sky">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Nice to have */}
              {selected.niceToHaveSkills?.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Nice to Have</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.niceToHaveSkills.map((s: string) => (
                      <span key={s} className="badge-pending">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Profile completion warning inside modal */}
              {!canApply && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-800 font-semibold text-sm">Profile {completion}% complete</p>
                    <p className="text-amber-600 text-xs mt-1">
                      You need at least 80% profile completion to apply.
                    </p>
                    <Link href="/applicant/profile" onClick={() => setSelected(null)}
                      className="text-amber-700 text-xs font-bold hover:underline mt-2 flex items-center gap-1">
                      Complete Profile Now <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="flex-1 btn-ghost-sky">
                  Close
                </button>
                <button
                  onClick={() => canApply && !applied.has(selected._id) && apply(selected)}
                  disabled={applying || applied.has(selected._id) || !canApply}
                  className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all ${
                    applied.has(selected._id)
                      ? 'bg-emerald-100 text-emerald-600 cursor-default'
                      : !canApply
                      ? 'bg-sky-100 text-sky-400 cursor-not-allowed'
                      : 'btn-sky'
                  }`}>
                  {applying && <Loader2 className="w-4 h-4 animate-spin" />}
                  {applied.has(selected._id)
                    ? '✓ Already Applied'
                    : !canApply
                    ? `Profile ${completion}% — Need 80%`
                    : 'Submit Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
