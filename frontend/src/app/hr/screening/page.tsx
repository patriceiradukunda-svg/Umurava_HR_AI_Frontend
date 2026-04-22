'use client'
import { useEffect, useState } from 'react'
import { jobsAPI, screeningAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { Bot, Play, CheckCircle, Clock, Loader2, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

const STEPS = [
  { key: 'parse',   label: 'Job Requirements Parsed',     sub: 'Extracting criteria from job description' },
  { key: 'load',    label: 'Applicants Loaded',           sub: 'Profiles ready for evaluation' },
  { key: 'eval',    label: 'Multi-Candidate Evaluation',  sub: 'Gemini AI analysing all profiles' },
  { key: 'score',   label: 'Scoring & Ranking',           sub: 'Weighted criteria applied' },
  { key: 'explain', label: 'Generating Explanations',     sub: 'Natural language reasoning per candidate' },
  { key: 'done',    label: 'Shortlist Ready',             sub: 'Top candidates identified' },
]

export default function HRScreeningPage() {
  const [jobs, setJobs]         = useState<any[]>([])
  const [selectedJob, setSelectedJob] = useState('')
  const [shortlistSize, setSize]= useState(10)
  const [weights, setWeights]   = useState({ skillsMatch: 40, experienceMatch: 30, educationMatch: 15, projectRelevance: 10, availabilityBonus: 5 })
  const [running, setRunning]   = useState(false)
  const [screeningId, setScreeningId] = useState('')
  const [currentStep, setCurrentStep] = useState(-1)
  const [done, setDone]         = useState(false)
  const router = useRouter()

  useEffect(() => {
    jobsAPI.list({ status: 'active' }).then(r => setJobs(r.data.data)).catch(() => {})
  }, [])

  const job = jobs.find(j => j._id === selectedJob)

  const runScreening = async () => {
    if (!selectedJob) { toast.error('Select a job first'); return }
    setRunning(true); setDone(false); setCurrentStep(0)

    try {
      const r = await screeningAPI.run({ jobId: selectedJob, shortlistSize, weights })
      const sid = r.data.screeningId
      setScreeningId(sid)

      // Animate steps while polling
      let step = 0
      const stepInterval = setInterval(() => {
        step++
        if (step < STEPS.length - 1) setCurrentStep(step)
      }, 1800)

      // Poll status
      const poll = setInterval(async () => {
        try {
          const s = await screeningAPI.pollStatus(sid)
          if (s.data.status === 'completed') {
            clearInterval(poll)
            clearInterval(stepInterval)
            setCurrentStep(STEPS.length - 1)
            setDone(true)
            setRunning(false)
            toast.success(`Screening complete! ${s.data.shortlistCount} candidates shortlisted.`)
          } else if (s.data.status === 'failed') {
            clearInterval(poll)
            clearInterval(stepInterval)
            setRunning(false)
            toast.error('Screening failed: ' + (s.data.errorMessage || 'Unknown error'))
          }
        } catch { clearInterval(poll); clearInterval(stepInterval); setRunning(false) }
      }, 3000)

    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to start screening')
      setRunning(false)
      setCurrentStep(-1)
    }
  }

  const weightKeys = Object.keys(weights) as (keyof typeof weights)[]
  const weightLabels: Record<string, string> = {
    skillsMatch: 'Skills Match', experienceMatch: 'Experience',
    educationMatch: 'Education', projectRelevance: 'Project Relevance', availabilityBonus: 'Availability',
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-sky-950">AI Screening</h1>
        <p className="text-sky-400 text-sm mt-1">Configure and launch Gemini AI screening</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Step 1 - Job */}
          <div className="bg-white rounded-2xl p-6 shadow-card border border-sky-50">
            <h2 className="font-display font-bold text-sky-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-600 text-xs font-bold flex items-center justify-center">1</span>
              Select Job
            </h2>
            <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} className="input-sky mb-4">
              <option value="">Choose a job position…</option>
              {jobs.map(j => (
                <option key={j._id} value={j._id}>{j.title} · {j.location} ({j.applicantCount || 0} applicants)</option>
              ))}
            </select>
            {job && (
              <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                <p className="text-xs font-bold text-sky-500 uppercase tracking-wide mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredSkills?.map((s: string) => <span key={s} className="badge-sky">{s}</span>)}
                </div>
                <p className="text-sky-600 text-xs mt-3">{job.applicantCount || 0} applicants · Min {job.minimumExperienceYears || 0} yrs exp</p>
              </div>
            )}
          </div>

          {/* Step 2 - Shortlist size */}
          <div className="bg-white rounded-2xl p-6 shadow-card border border-sky-50">
            <h2 className="font-display font-bold text-sky-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-600 text-xs font-bold flex items-center justify-center">2</span>
              Shortlist Settings
            </h2>
            <div>
              <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-2 block">Shortlist Size</label>
              <div className="flex gap-3">
                {[10, 20].map(n => (
                  <button key={n} onClick={() => setSize(n)}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                      shortlistSize === n ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-sky-200 text-sky-400 hover:border-sky-300'
                    }`}>
                    Top {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3 - Weights */}
          <div className="bg-white rounded-2xl p-6 shadow-card border border-sky-50">
            <h2 className="font-display font-bold text-sky-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-600 text-xs font-bold flex items-center justify-center">3</span>
              Scoring Weights
            </h2>
            <div className="space-y-4">
              {weightKeys.map(k => (
                <div key={k} className="flex items-center gap-4">
                  <span className="text-sky-700 text-sm font-medium w-36 flex-shrink-0">{weightLabels[k]}</span>
                  <div className="flex-1 h-2 bg-sky-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${weights[k]}%` }} />
                  </div>
                  <span className="font-display font-bold text-sky-600 text-sm w-10 text-right">{weights[k]}%</span>
                </div>
              ))}
              <p className="text-sky-300 text-xs">Weights are pre-configured per Umurava&apos;s evaluation rubric.</p>
            </div>

            <button onClick={runScreening} disabled={running || !selectedJob}
              className="w-full mt-6 flex items-center justify-center gap-3 bg-sky-950 hover:bg-sky-900 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all text-base">
              {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
              {running ? 'Screening in Progress…' : '🤖 Run AI Screening with Gemini'}
            </button>
          </div>
        </div>

        {/* AI Progress panel */}
        <div className="lg:col-span-2">
          <div className="bg-sky-950 rounded-2xl p-6 sticky top-6">
            <div className="flex items-center gap-3 mb-2">
              <Bot className="w-6 h-6 text-sky-400" />
              <h2 className="font-display font-bold text-white text-lg">Gemini AI Engine</h2>
            </div>
            <p className="text-sky-400 text-xs mb-6">Powered by Google Gemini API</p>

            <div className="space-y-3">
              {STEPS.map((step, i) => {
                const isDone    = i < currentStep || (done && i === currentStep)
                const isActive  = i === currentStep && running && !done
                const isPending = i > currentStep

                return (
                  <div key={step.key}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isDone   ? 'bg-emerald-500/15' :
                      isActive ? 'bg-sky-500/25' :
                      'bg-white/5'
                    }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                      isDone   ? 'bg-emerald-500' :
                      isActive ? 'bg-sky-500 animate-pulse' :
                      'bg-white/10'
                    }`}>
                      {isDone ? <CheckCircle className="w-4 h-4 text-white" /> :
                       isActive ? <Loader2 className="w-3 h-3 text-white animate-spin" /> :
                       <Clock className="w-3 h-3 text-sky-500" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isDone || isActive ? 'text-white' : 'text-sky-500'}`}>
                        {step.label}
                      </p>
                      <p className="text-sky-500 text-xs">{step.sub}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {done && (
              <button onClick={() => router.push('/hr/shortlist')}
                className="w-full mt-6 btn-sky flex items-center justify-center gap-2">
                View Shortlist <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <div className="mt-6 p-4 bg-white/5 rounded-xl">
              <p className="text-sky-400 text-[10px] font-bold uppercase tracking-wide mb-2">Prompt Strategy</p>
              <p className="text-sky-300 text-xs leading-relaxed">
                Multi-candidate batch evaluation with weighted scoring rubric and chain-of-thought reasoning per candidate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
