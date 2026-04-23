'use client'
import { useEffect, useState, useCallback } from 'react'
import { jobsAPI, screeningAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import {
  Play, CheckCircle, Clock, Loader2, ChevronRight, ChevronUp,
  ChevronDown, Briefcase, Users, Star, SlidersHorizontal,
  AlertCircle, RotateCcw, TrendingUp, MapPin, Hash,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Step definitions (no Gemini/AI branding) ────────────────────────────────
const STEPS = [
  { key: 'parse',   label: 'Job Requirements Parsed',    sub: 'Extracting criteria and scoring weights' },
  { key: 'load',    label: 'Candidate Profiles Loaded',  sub: 'All profiles ready for evaluation' },
  { key: 'eval',    label: 'Deep Profile Evaluation',    sub: 'Analysing qualifications, skills and experience' },
  { key: 'score',   label: 'Weighted Scoring Applied',   sub: 'Computing match scores across all dimensions' },
  { key: 'explain', label: 'Insights Generated',         sub: 'Strengths, gaps and recommendations per candidate' },
  { key: 'done',    label: 'Shortlist Ready',            sub: 'Top candidates identified and ranked' },
]

const DEFAULT_WEIGHTS = {
  skillsMatch:       40,
  experienceMatch:   30,
  educationMatch:    15,
  projectRelevance:  10,
  availabilityBonus: 5,
}

const WEIGHT_META: Record<string, { label: string; desc: string; color: string }> = {
  skillsMatch:       { label: 'Skills Match',      desc: 'Coverage and depth of required skills',       color: 'bg-sky-500' },
  experienceMatch:   { label: 'Experience',         desc: 'Years of experience and role relevance',      color: 'bg-indigo-500' },
  educationMatch:    { label: 'Education',          desc: 'Degree level and field of study alignment',   color: 'bg-violet-500' },
  projectRelevance:  { label: 'Project Relevance',  desc: 'Portfolio projects that match this role',     color: 'bg-teal-500' },
  availabilityBonus: { label: 'Availability',       desc: 'How soon the candidate can start',            color: 'bg-emerald-500' },
}

// ─── Number input with +/- arrows ────────────────────────────────────────────
function SpinInput({
  value, onChange, min = 1, max = 999, label, sublabel,
}: {
  value: number; onChange: (n: number) => void
  min?: number; max?: number; label?: string; sublabel?: string
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs font-bold text-sky-600 uppercase tracking-wide">{label}</span>}
      <div className="flex items-center h-11 border-2 border-sky-200 rounded-xl overflow-hidden focus-within:border-sky-500 transition-colors bg-white">
        <button type="button"
          onClick={() => onChange(clamp(value - 1))}
          className="w-10 h-full flex items-center justify-center text-sky-400 hover:text-sky-700 hover:bg-sky-50 transition-colors flex-shrink-0 text-lg font-bold">
          −
        </button>
        <input
          type="number" min={min} max={max} value={value}
          onChange={e => onChange(clamp(parseInt(e.target.value) || min))}
          className="flex-1 h-full text-center font-display font-bold text-sky-900 text-lg outline-none bg-transparent"
        />
        <button type="button"
          onClick={() => onChange(clamp(value + 1))}
          className="w-10 h-full flex items-center justify-center text-sky-400 hover:text-sky-700 hover:bg-sky-50 transition-colors flex-shrink-0 text-lg font-bold">
          +
        </button>
      </div>
      {sublabel && <span className="text-sky-400 text-xs">{sublabel}</span>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HRScreeningPage() {
  const [jobs, setJobs]               = useState<any[]>([])
  const [selectedJob, setSelectedJob] = useState('')
  const [shortlistSize, setSize]      = useState(10)
  const [weights, setWeights]         = useState({ ...DEFAULT_WEIGHTS })
  const [showWeights, setShowWeights] = useState(false)
  const [running, setRunning]         = useState(false)
  const [screeningId, setScreeningId] = useState('')
  const [currentStep, setCurrentStep] = useState(-1)
  const [done, setDone]               = useState(false)
  const [shortlistCount, setShortlistCount] = useState(0)
  const [totalEvaluated, setTotalEvaluated] = useState(0)
  const [hasInsights, setHasInsights] = useState(false)
  const [errMsg, setErrMsg]           = useState('')
  const router = useRouter()

  useEffect(() => {
    // Load active + closed jobs (not draft)
    Promise.all([
      jobsAPI.list({ status: 'active' }),
      jobsAPI.list({ status: 'closed' }),
    ]).then(([a, c]) => {
      setJobs([...(a.data.data || []), ...(c.data.data || [])])
    }).catch(() => {})
  }, [])

  const job = jobs.find(j => j._id === selectedJob)

  const weightTotal = Object.values(weights).reduce((a, b) => a + b, 0)
  const weightsValid = weightTotal > 0

  const resetWeights = () => setWeights({ ...DEFAULT_WEIGHTS })

  const setWeight = (key: keyof typeof weights, val: number) => {
    setWeights(w => ({ ...w, [key]: Math.min(100, Math.max(0, val)) }))
  }

  const runScreening = async () => {
    if (!selectedJob) { toast.error('Please select a job first'); return }
    if (!job?.applicantCount) { toast.error('This job has no applicants yet'); return }

    setRunning(true); setDone(false); setCurrentStep(0); setErrMsg('')

    try {
      const r = await screeningAPI.run({ jobId: selectedJob, shortlistSize, weights })
      const sid = r.data.screeningId
      setScreeningId(sid)

      // Animate steps — longer intervals for large batches
      const stepMs = Math.max(2000, Math.ceil((job?.applicantCount || 0) / 15) * 1500)
      let step = 0
      const stepInterval = setInterval(() => {
        step = Math.min(step + 1, STEPS.length - 2)
        setCurrentStep(step)
      }, stepMs)

      // Poll status every 4 seconds
      const poll = setInterval(async () => {
        try {
          const s = await screeningAPI.pollStatus(sid)
          if (s.data.status === 'completed') {
            clearInterval(poll); clearInterval(stepInterval)
            setCurrentStep(STEPS.length - 1)
            setDone(true); setRunning(false)
            setShortlistCount(s.data.shortlistCount || 0)
            setTotalEvaluated(s.data.totalEvaluated || 0)
            setHasInsights(s.data.hasInsights || false)
            toast.success(`Screening complete — ${s.data.shortlistCount} candidates shortlisted!`)
          } else if (s.data.status === 'failed') {
            clearInterval(poll); clearInterval(stepInterval)
            setRunning(false); setCurrentStep(-1)
            setErrMsg(s.data.errorMessage || 'Screening failed. Please try again.')
            toast.error('Screening failed')
          }
        } catch {
          clearInterval(poll); clearInterval(stepInterval)
          setRunning(false)
        }
      }, 4000)

    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to start screening')
      setRunning(false); setCurrentStep(-1)
    }
  }

  const STATUS_STYLES: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    closed: 'bg-slate-100 text-slate-500 border border-slate-200',
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-sky-950">Candidate Screening</h1>
        <p className="text-sky-400 text-sm mt-1">Configure and launch intelligent candidate evaluation</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── Left config panel ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Step 1 — Select Job */}
          <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.07)' }}>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-sky-50">
              <div className="w-7 h-7 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <h2 className="font-display font-bold text-sky-900">Select Job Position</h2>
                <p className="text-sky-400 text-xs">Active and closed positions are available</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Job cards */}
              {jobs.length === 0 ? (
                <p className="text-sky-300 text-sm text-center py-4">No jobs found. Post a job first.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {jobs.map(j => (
                    <button key={j._id} onClick={() => setSelectedJob(j._id)}
                      className={`w-full text-left rounded-xl p-4 border-2 transition-all ${
                        selectedJob === j._id
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-sky-100 hover:border-sky-300 bg-white'
                      }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[j.status] || 'bg-sky-100 text-sky-700'}`}>
                              {j.status}
                            </span>
                            <span className="text-sky-400 text-xs">{j.department}</span>
                            {/* ID badge to avoid name conflicts */}
                            <span className="text-sky-300 text-[10px] font-mono bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded">
                              #{j._id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                          <p className="font-display font-bold text-sky-900 text-sm leading-snug">{j.title}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-sky-400 text-xs"><MapPin className="w-3 h-3" />{j.location}</span>
                            <span className="flex items-center gap-1 text-sky-400 text-xs"><Briefcase className="w-3 h-3" />{j.type}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="font-display text-xl font-bold text-sky-500">{j.applicantCount || 0}</div>
                          <div className="text-sky-300 text-[10px]">applicants</div>
                        </div>
                      </div>
                      {/* Required skills preview */}
                      {(j.requiredSkills || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {j.requiredSkills.slice(0, 4).map((s: string) => (
                            <span key={s} className="text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                          {j.requiredSkills.length > 4 && <span className="text-xs text-sky-400">+{j.requiredSkills.length - 4}</span>}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Step 2 — Shortlist Size */}
          <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.07)' }}>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-sky-50">
              <div className="w-7 h-7 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <h2 className="font-display font-bold text-sky-900">Shortlist Settings</h2>
                <p className="text-sky-400 text-xs">How many top candidates to select</p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-6 flex-wrap">
                <SpinInput
                  value={shortlistSize}
                  onChange={setSize}
                  min={1}
                  max={job?.applicantCount || 999}
                  label="Shortlist Size"
                  sublabel={`Top ${shortlistSize} candidate${shortlistSize !== 1 ? 's' : ''} will be selected`}
                />
                {/* Quick presets */}
                <div className="flex-1">
                  <p className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-2">Quick select</p>
                  <div className="flex gap-2 flex-wrap">
                    {[5, 10, 15, 20, 30].map(n => (
                      <button key={n} onClick={() => setSize(n)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                          shortlistSize === n
                            ? 'border-sky-500 bg-sky-50 text-sky-700'
                            : 'border-sky-100 text-sky-400 hover:border-sky-300 hover:text-sky-600'
                        }`}>
                        Top {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 — Scoring Weights */}
          <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(14,165,233,0.07)' }}>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-sky-50">
              <div className="w-7 h-7 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</div>
              <div className="flex-1">
                <h2 className="font-display font-bold text-sky-900">Scoring Weights</h2>
                <p className="text-sky-400 text-xs">Customise evaluation priorities for this role</p>
              </div>
              {/* Weight total indicator */}
              <div className={`flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full ${
                weightTotal === 100 ? 'bg-emerald-100 text-emerald-700' :
                weightTotal > 100   ? 'bg-red-100 text-red-600' :
                                      'bg-amber-100 text-amber-700'
              }`}>
                Total: {weightTotal}
              </div>
            </div>

            <div className="p-5">
              {/* Default weight visual summary */}
              <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-4">
                {Object.entries(weights).map(([k, v]) => (
                  <div key={k} title={`${WEIGHT_META[k]?.label}: ${v}`}
                    className={`${WEIGHT_META[k]?.color} transition-all`}
                    style={{ flex: v }} />
                ))}
              </div>

              {/* Default display (when closed) */}
              {!showWeights && (
                <div className="space-y-2 mb-4">
                  {Object.entries(weights).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="text-sky-700 text-sm w-36 flex-shrink-0">{WEIGHT_META[k]?.label}</span>
                      <div className="flex-1 h-2 bg-sky-50 rounded-full overflow-hidden">
                        <div className={`h-full ${WEIGHT_META[k]?.color} rounded-full transition-all`} style={{ width: `${v}%` }} />
                      </div>
                      <span className="font-bold text-sky-600 text-sm w-10 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expanded adjust panel */}
              {showWeights && (
                <div className="space-y-4 mb-4 bg-sky-50 rounded-xl p-4 border border-sky-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-sky-500 uppercase tracking-wide">Adjust each weight (0–100)</p>
                    <button onClick={resetWeights}
                      className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-700 font-semibold">
                      <RotateCcw className="w-3 h-3" /> Reset defaults
                    </button>
                  </div>
                  {Object.entries(weights).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-sky-800 text-sm font-semibold">{WEIGHT_META[k]?.label}</p>
                          <p className="text-sky-400 text-xs">{WEIGHT_META[k]?.desc}</p>
                        </div>
                      </div>
                      <SpinInput
                        value={v}
                        onChange={val => setWeight(k as keyof typeof weights, val)}
                        min={0}
                        max={100}
                      />
                    </div>
                  ))}
                  {weightTotal !== 100 && (
                    <div className={`flex items-center gap-2 text-xs font-semibold p-2 rounded-lg ${
                      weightTotal > 100 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Weights total {weightTotal}. They will be normalised automatically during scoring.
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => setShowWeights(v => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-800 transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
                {showWeights ? 'Hide' : 'Adjust'} Scoring Weights
                {showWeights ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Step 4 — Run */}
          <button
            onClick={runScreening}
            disabled={running || !selectedJob || !job?.applicantCount}
            className={`w-full flex items-center justify-center gap-3 font-bold py-4 rounded-2xl text-base transition-all shadow-sm ${
              running || !selectedJob || !job?.applicantCount
                ? 'bg-sky-200 text-sky-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 text-white active:scale-[0.99]'
            }`}>
            {running
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Screening in Progress…</>
              : <><Play className="w-5 h-5" /> Run Screening</>}
          </button>

          {!selectedJob && (
            <p className="text-center text-sky-400 text-sm">← Select a job above to get started</p>
          )}
          {selectedJob && !job?.applicantCount && (
            <p className="text-center text-amber-500 text-sm">This job has no applicants yet. <Link href="/hr/applicants" className="underline font-semibold">Add applicants →</Link></p>
          )}
        </div>

        {/* ── Right: AI Engine panel ── */}
        <div className="lg:col-span-2">
          <div className="bg-sky-950 rounded-2xl p-6 sticky top-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-sky-700 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-sky-200" />
              </div>
              <div>
                <h2 className="font-display font-bold text-white text-lg">Evaluation Engine</h2>
                <p className="text-sky-500 text-xs">Intelligent candidate assessment</p>
              </div>
            </div>

            {/* Job summary */}
            {job && (
              <div className="mt-4 bg-sky-900/60 rounded-xl p-3 border border-sky-800 mb-5">
                <p className="text-sky-300 text-xs font-bold uppercase tracking-wide mb-1">Selected Job</p>
                <p className="text-white font-semibold text-sm">{job.title}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-sky-400 text-xs flex items-center gap-1"><Users className="w-3 h-3" />{job.applicantCount || 0} candidates</span>
                  <span className="text-sky-400 text-xs flex items-center gap-1"><Star className="w-3 h-3" />Top {shortlistSize}</span>
                  <span className="text-sky-400 text-xs flex items-center gap-1"><Hash className="w-3 h-3" />{job._id.slice(-6).toUpperCase()}</span>
                </div>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-2 mb-5">
              {STEPS.map((step, i) => {
                const isDone    = done ? true : i < currentStep
                const isActive  = i === currentStep && running && !done
                const isPending = !isDone && !isActive

                return (
                  <div key={step.key}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                      isDone   ? 'bg-emerald-500/15' :
                      isActive ? 'bg-sky-500/20 ring-1 ring-sky-500/30' :
                      'bg-white/5'
                    }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isDone   ? 'bg-emerald-500' :
                      isActive ? 'bg-sky-500' :
                      'bg-white/10'
                    }`}>
                      {isDone   ? <CheckCircle className="w-4 h-4 text-white" /> :
                       isActive ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> :
                                  <Clock className="w-3.5 h-3.5 text-sky-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isDone || isActive ? 'text-white' : 'text-sky-600'}`}>
                        {step.label}
                      </p>
                      <p className="text-sky-500 text-xs">{step.sub}</p>
                    </div>
                    {/* Shortlist Ready is clickable when done */}
                    {step.key === 'done' && isDone && (
                      <Link href="/hr/shortlist" className="flex-shrink-0">
                        <ChevronRight className="w-4 h-4 text-emerald-400 hover:text-white transition-colors" />
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Error state */}
            {errMsg && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-4">
                <p className="text-red-300 text-xs font-semibold">{errMsg}</p>
              </div>
            )}

            {/* Done state */}
            {done && (
              <div className="space-y-3">
                <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-4">
                  <p className="text-emerald-300 font-bold text-sm mb-1">✓ Screening Complete</p>
                  <p className="text-emerald-400 text-xs">{shortlistCount} candidates shortlisted from {totalEvaluated} evaluated</p>
                  {hasInsights && <p className="text-emerald-400 text-xs mt-1">Skills gap analysis and recommendations ready</p>}
                </div>
                <Link href="/hr/shortlist"
                  className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold py-3 rounded-xl transition-colors">
                  View Shortlist & Insights <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Progress hint while running */}
            {running && job && (
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-sky-400 text-xs">
                  Evaluating {job.applicantCount} candidate{job.applicantCount !== 1 ? 's' : ''}
                  {job.applicantCount > 15 && ` in batches of 15`} — this may take a few minutes
                </p>
              </div>
            )}

            {/* Idle state info */}
            {!running && !done && currentStep === -1 && (
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-sky-400 text-xs font-bold uppercase tracking-wide mb-2">What happens next</p>
                <ul className="space-y-1.5">
                  {[
                    'Every applicant is evaluated individually',
                    'Scores weighted by your custom priorities',
                    'Strengths and skill gaps identified per candidate',
                    'Pool-wide insights generated for HR strategy',
                    'Top candidates ranked and shortlisted',
                  ].map(t => (
                    <li key={t} className="text-sky-500 text-xs flex items-start gap-2">
                      <span className="text-sky-600 flex-shrink-0 mt-0.5">•</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
