'use client'
import { useEffect, useState } from 'react'
import { analyticsAPI, jobsAPI } from '@/lib/api'
import { GitBranch } from 'lucide-react'

export default function HRPipelinePage() {
  const [jobs, setJobs]           = useState<any[]>([])
  const [selectedJob, setSelectedJob] = useState('')
  const [pipeline, setPipeline]   = useState<any>(null)
  const [loading, setLoading]     = useState(false)

  useEffect(() => { jobsAPI.list().then(r => setJobs(r.data.data)).catch(() => {}) }, [])

  useEffect(() => {
    if (!selectedJob) return
    setLoading(true)
    analyticsAPI.pipeline(selectedJob)
      .then(r => setPipeline(r.data.data))
      .catch(() => setPipeline(null))
      .finally(() => setLoading(false))
  }, [selectedJob])

  const columns = [
    { key: 'applied',     label: 'Applied',     color: 'bg-sky-50 text-sky-600',      border: 'border-sky-400' },
    { key: 'screened',    label: 'AI Screened',  color: 'bg-cyan-50 text-cyan-700',    border: 'border-cyan-400' },
    { key: 'shortlisted', label: 'Shortlisted',  color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-400' },
    { key: 'rejected',    label: 'Not Selected', color: 'bg-red-50 text-red-600',      border: 'border-red-300' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-sky-950">Hiring Pipeline</h1>
          <p className="text-sky-400 text-sm mt-1">Visual candidate flow per job</p>
        </div>
        <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
          className="bg-white border border-sky-200 rounded-xl px-4 h-10 text-sm text-sky-700 outline-none min-w-[240px]">
          <option value="">Select a job…</option>
          {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
        </select>
      </div>

      {!selectedJob && (
        <div className="bg-white rounded-2xl p-16 text-center shadow-card border border-sky-50">
          <GitBranch className="w-12 h-12 text-sky-200 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-sky-900 mb-2">Select a job</h3>
          <p className="text-sky-400">Choose a job above to view its hiring pipeline.</p>
        </div>
      )}

      {selectedJob && !loading && pipeline && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(col => {
            const colData = pipeline[col.key] || { candidates: [], count: 0 }
            return (
              <div key={col.key} className="min-w-[220px] flex-shrink-0">
                <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${col.color} border-b-2 ${col.border}`}>
                  <span className="text-xs font-bold uppercase tracking-wide">{col.label}</span>
                  <span className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-xs font-bold">{colData.count}</span>
                </div>
                <div className="bg-sky-50/50 rounded-b-xl p-2 space-y-2 min-h-[200px]">
                  {colData.candidates.map((c: any, i: number) => {
                    const p = c.talentProfile || c
                    return (
                      <div key={i} className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${col.border} cursor-pointer hover:shadow-card transition-all`}>
                        <p className="font-semibold text-sky-900 text-sm">{p.firstName} {p.lastName}</p>
                        <p className="text-sky-400 text-xs mt-0.5">{p.location || c.location || '—'}</p>
                        {c.aiScore != null && (
                          <p className="text-sky-500 text-xs font-bold mt-1.5">🤖 Score: {c.aiScore}/100</p>
                        )}
                      </div>
                    )
                  })}
                  {colData.count > colData.candidates.length && (
                    <div className="bg-white/50 rounded-xl p-3 text-center">
                      <p className="text-sky-400 text-xs">+{colData.count - colData.candidates.length} more</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
