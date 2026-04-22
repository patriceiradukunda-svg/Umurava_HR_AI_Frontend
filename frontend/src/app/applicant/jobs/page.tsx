'use client'
import { useEffect, useState } from 'react'
import { jobsAPI, applicantsAPI } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { Search, MapPin, Clock, Briefcase, X, Loader2, CheckCircle } from 'lucide-react'

export default function ApplicantJobsPage() {
  const [jobs, setJobs]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied]   = useState<Set<string>>(new Set())
  const { user } = useAuth()

  useEffect(() => {
    jobsAPI.list({ status: 'active', search: search || undefined })
      .then(r => setJobs(r.data.data))
      .catch(() => toast.error('Failed to load jobs'))
      .finally(() => setLoading(false))
  }, [search])

  const apply = async (job: any) => {
    if (!user) return
    setApplying(true)
    try {
      await applicantsAPI.create({
        jobId: job._id,
        source: 'umurava_platform',
        talentProfile: {
          firstName: user.firstName,
          lastName:  user.lastName,
          email:     user.email,
          headline:  `${user.firstName} ${user.lastName} – Applicant`,
          location:  'Not specified',
          skills:    [],
          experience: [],
          education:  [],
          projects:   [],
          availability: { status: 'Available', type: 'Full-time' },
        },
      })
      setApplied(prev => new Set([...prev, job._id]))
      toast.success(`Applied to ${job.title}! 🎉`)
      setSelected(null)
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Application failed'
      if (msg.includes('already exists')) {
        setApplied(prev => new Set([...prev, job._id]))
        toast.error('You have already applied to this position')
      } else {
        toast.error(msg)
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="font-display text-4xl font-bold text-sky-950 mb-3">
          Find Your Next <span className="gradient-text">Opportunity</span>
        </h1>
        <p className="text-sky-500 text-lg">Browse open positions and apply with one click</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 max-w-2xl mx-auto">
        <div className="flex-1 flex items-center gap-3 bg-white border-2 border-sky-200 focus-within:border-sky-400 rounded-2xl px-5 h-14 shadow-sky-sm">
          <Search className="w-5 h-5 text-sky-400 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs, skills, departments…"
            className="flex-1 outline-none text-sky-900 placeholder-sky-300 text-base" />
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-center gap-6 text-sm text-sky-500">
        <span><strong className="text-sky-700">{jobs.length}</strong> open positions</span>
        <span>·</span>
        <span>AI-powered matching</span>
        <span>·</span>
        <span>Instant application</span>
      </div>

      {/* Job grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_,i) => <div key={i} className="bg-white rounded-2xl h-52 shimmer" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-card">
          <Briefcase className="w-12 h-12 text-sky-200 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-sky-900 mb-2">No jobs found</h3>
          <p className="text-sky-400">Try different search terms or check back later.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map(job => {
            const isApplied = applied.has(job._id)
            return (
              <div key={job._id}
                className="bg-white rounded-2xl p-6 shadow-card card-hover border border-sky-50 cursor-pointer"
                onClick={() => setSelected(job)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-6 h-6 text-sky-500" />
                  </div>
                  {isApplied && (
                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                      <CheckCircle className="w-3.5 h-3.5" /> Applied
                    </span>
                  )}
                </div>

                <h3 className="font-display font-bold text-sky-900 text-lg mb-1">{job.title}</h3>
                <p className="text-sky-400 text-xs font-semibold uppercase tracking-wide mb-3">{job.department}</p>

                <div className="flex items-center gap-3 mb-4">
                  <span className="flex items-center gap-1 text-sky-500 text-xs"><MapPin className="w-3 h-3" />{job.location}</span>
                  <span className="flex items-center gap-1 text-sky-500 text-xs"><Clock className="w-3 h-3" />{job.type}</span>
                </div>

                <p className="text-sky-600 text-sm line-clamp-2 mb-4">{job.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(job.requiredSkills || []).slice(0, 3).map((s: string) => (
                    <span key={s} className="badge-sky">{s}</span>
                  ))}
                  {(job.requiredSkills || []).length > 3 && (
                    <span className="badge-sky">+{job.requiredSkills.length - 3}</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sky-400 text-xs">{job.minimumExperienceYears}+ yrs exp</span>
                  <button
                    onClick={e => { e.stopPropagation(); !isApplied && apply(job) }}
                    disabled={isApplied || applying}
                    className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                      isApplied
                        ? 'bg-emerald-100 text-emerald-600 cursor-default'
                        : 'btn-sky'
                    }`}>
                    {isApplied ? '✓ Applied' : 'Apply Now'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Job detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-sky-lg">
            <div className="sticky top-0 bg-white border-b border-sky-100 px-8 py-5 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="font-display text-xl font-bold text-sky-900">{selected.title}</h2>
                <p className="text-sky-400 text-sm">{selected.department} · {selected.location}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-sky-400 hover:text-sky-700"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex flex-wrap gap-3">
                <span className="badge-active">{selected.status}</span>
                <span className="badge-sky">{selected.type}</span>
                <span className="badge-sky">{selected.minimumExperienceYears}+ years exp</span>
                <span className="badge-sky">Top {selected.shortlistSize} shortlisted</span>
              </div>

              <div>
                <h3 className="font-display font-bold text-sky-900 mb-3">Job Description</h3>
                <p className="text-sky-700 leading-relaxed text-sm">{selected.description}</p>
              </div>

              {selected.requiredSkills?.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.requiredSkills.map((s: string) => <span key={s} className="badge-sky">{s}</span>)}
                  </div>
                </div>
              )}

              {selected.niceToHaveSkills?.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Nice to Have</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.niceToHaveSkills.map((s: string) => <span key={s} className="badge-pending">{s}</span>)}
                  </div>
                </div>
              )}

              {selected.requirements?.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Requirements</h3>
                  <ul className="space-y-2">
                    {selected.requirements.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sky-700 text-sm">
                        <span className="text-sky-400 flex-shrink-0 mt-0.5">•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
                <p className="text-sky-600 text-sm font-semibold mb-1">🤖 AI-Powered Screening</p>
                <p className="text-sky-500 text-xs">Applications are evaluated by Gemini AI. Top {selected.shortlistSize} candidates will be shortlisted based on skills, experience, education, and project relevance.</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="flex-1 btn-ghost-sky">Cancel</button>
                <button
                  onClick={() => apply(selected)}
                  disabled={applying || applied.has(selected._id)}
                  className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all ${
                    applied.has(selected._id) ? 'bg-emerald-100 text-emerald-600 cursor-default' : 'btn-sky'
                  }`}>
                  {applying && <Loader2 className="w-4 h-4 animate-spin" />}
                  {applied.has(selected._id) ? '✓ Applied!' : 'Apply Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
