'use client'
import { useEffect, useState, useRef } from 'react'
import { applicantsAPI, jobsAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { Search, Upload, Eye, Trash2, X, Loader2, Users, FileText, Filter } from 'lucide-react'

export default function HRApplicantsPage() {
  const [applicants, setApplicants] = useState<any[]>([])
  const [jobs, setJobs]             = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [jobFilter, setJobFilter]   = useState('all')
  const [statusFilter, setStatus]   = useState('all')
  const [sourceFilter, setSource]   = useState('all')
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<any>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadJobId, setUploadJobId] = useState('')
  const [uploading, setUploading]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [aRes, jRes] = await Promise.all([
        applicantsAPI.list({
          jobId:  jobFilter !== 'all'    ? jobFilter    : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          source: sourceFilter !== 'all' ? sourceFilter : undefined,
          search: search || undefined,
          limit: 100,
        }),
        jobsAPI.list(),
      ])
      setApplicants(aRes.data.data)
      setJobs(jRes.data.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [jobFilter, statusFilter, sourceFilter, search])

  const handleUpload = async () => {
    const files = fileRef.current?.files
    if (!files || files.length === 0) { toast.error('Select at least one file'); return }
    if (!uploadJobId) { toast.error('Select a job first'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('jobId', uploadJobId)
      Array.from(files).forEach(f => fd.append('files', f))
      const r = await applicantsAPI.upload(fd)
      toast.success(r.data.message)
      setShowUpload(false)
      load()
    } catch (e: any) { toast.error(e.response?.data?.message || 'Upload failed') }
    finally { setUploading(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await applicantsAPI.updateStatus(id, status)
      toast.success(`Status → ${status}`)
      load()
      if (selected?._id === id) setSelected((p: any) => ({ ...p, status }))
    } catch { toast.error('Failed') }
  }

  const deleteApplicant = async (id: string) => {
    if (!confirm('Delete this applicant?')) return
    try {
      await applicantsAPI.delete(id)
      toast.success('Deleted')
      setSelected(null)
      load()
    } catch { toast.error('Failed') }
  }

  const statusColor = (s: string) => ({
    pending: 'badge-pending', screened: 'badge-screening',
    shortlisted: 'badge-shortlisted', rejected: 'badge-rejected',
  }[s] || 'badge-sky')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-sky-950">Applicants</h1>
          <p className="text-sky-400 text-sm mt-1">{applicants.length} loaded</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-sky flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload CSV / PDF
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-sky-200 rounded-xl px-4 h-10">
          <Search className="w-4 h-4 text-sky-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email…" className="outline-none text-sm text-sky-800 placeholder-sky-300 w-44" />
        </div>
        {[
          { value: jobFilter, onChange: setJobFilter, options: [['all','All Jobs'], ...jobs.map((j: any) => [j._id, j.title])], },
          { value: statusFilter, onChange: setStatus, options: [['all','All Statuses'],['pending','Pending'],['screened','Screened'],['shortlisted','Shortlisted'],['rejected','Rejected']], },
          { value: sourceFilter, onChange: setSource, options: [['all','All Sources'],['umurava_platform','Umurava'],['csv_upload','CSV'],['pdf_upload','PDF'],['manual','Manual']], },
        ].map((f, i) => (
          <select key={i} value={f.value} onChange={e => f.onChange(e.target.value)}
            className="bg-white border border-sky-200 rounded-xl px-4 h-10 text-sm text-sky-700 outline-none max-w-[180px]">
            {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sky-50 bg-sky-50/50">
                {['Candidate','Applied For','Source','AI Score','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-bold text-sky-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {loading ? [...Array(6)].map((_,i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-8 shimmer rounded-lg" /></td></tr>
              )) : applicants.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center">
                  <Users className="w-10 h-10 text-sky-200 mx-auto mb-3" />
                  <p className="text-sky-400">No applicants found</p>
                </td></tr>
              ) : applicants.map(a => {
                const p = a.talentProfile
                const initials = `${p?.firstName?.[0] || '?'}${p?.lastName?.[0] || '?'}`
                const job = jobs.find(j => j._id === a.jobId?.toString() || j._id === a.jobId)
                return (
                  <tr key={a._id} className="hover:bg-sky-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-gradient text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-sky-900 text-sm">{p?.firstName} {p?.lastName}</p>
                          <p className="text-sky-400 text-xs">{p?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-sky-700">{job?.title || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="badge-sky capitalize">{a.source?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-5 py-4">
                      {a.aiScore != null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-sky-100 rounded-full overflow-hidden w-16">
                            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${a.aiScore}%` }} />
                          </div>
                          <span className="font-display font-bold text-sky-600 text-sm">{a.aiScore}</span>
                        </div>
                      ) : <span className="text-sky-300 text-xs">Not screened</span>}
                    </td>
                    <td className="px-5 py-4">
                      <select value={a.status} onChange={e => updateStatus(a._id, e.target.value)}
                        className={`text-xs font-bold border-0 outline-none rounded-full px-2 py-1 cursor-pointer ${statusColor(a.status)}`}>
                        {['pending','screened','shortlisted','rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelected(a)} className="text-sky-500 hover:text-sky-700 p-1">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteApplicant(a._id)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-sky-lg">
            <div className="sticky top-0 bg-white border-b border-sky-100 px-8 py-5 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-gradient text-white font-bold text-lg flex items-center justify-center">
                  {selected.talentProfile?.firstName?.[0]}{selected.talentProfile?.lastName?.[0]}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-sky-900">
                    {selected.talentProfile?.firstName} {selected.talentProfile?.lastName}
                  </h2>
                  <p className="text-sky-400 text-sm">{selected.talentProfile?.headline}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-sky-400 hover:text-sky-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              {/* AI Score */}
              {selected.aiScore != null && (
                <div className="bg-sky-50 rounded-2xl p-5 border border-sky-100">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-sky-400 flex items-center justify-center">
                      <span className="font-display font-bold text-sky-600 text-xl">{selected.aiScore}</span>
                    </div>
                    <div>
                      <p className="font-bold text-sky-900">AI Match Score</p>
                      <p className="text-sky-500 text-sm">{selected.aiScore >= 80 ? 'Highly recommended' : selected.aiScore >= 60 ? 'Conditionally recommended' : 'Not recommended'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Email',    selected.talentProfile?.email],
                  ['Location', selected.talentProfile?.location],
                  ['Status',   selected.status],
                  ['Source',   selected.source?.replace('_', ' ')],
                  ['Availability', selected.talentProfile?.availability?.status],
                  ['Type',     selected.talentProfile?.availability?.type],
                ].map(([l, v]) => (
                  <div key={l} className="bg-sky-50 rounded-xl p-3">
                    <p className="text-sky-400 text-xs font-bold uppercase tracking-wide">{l}</p>
                    <p className="text-sky-900 font-semibold mt-1 capitalize">{v || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Skills */}
              {selected.talentProfile?.skills?.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.talentProfile.skills.map((s: any) => (
                      <span key={s.name} className="badge-sky">{s.name} · {s.level}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {selected.talentProfile?.experience?.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sky-900 mb-3">Experience</h3>
                  <div className="space-y-3">
                    {selected.talentProfile.experience.map((e: any, i: number) => (
                      <div key={i} className="bg-sky-50 rounded-xl p-4">
                        <p className="font-bold text-sky-900">{e.role} · {e.company}</p>
                        <p className="text-sky-500 text-xs">{e.startDate} – {e.endDate}</p>
                        <p className="text-sky-700 text-sm mt-2">{e.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => updateStatus(selected._id, 'shortlisted')} className="btn-sky flex-1">✓ Shortlist</button>
                <button onClick={() => updateStatus(selected._id, 'rejected')} className="flex-1 bg-red-50 text-red-500 font-semibold px-4 py-2.5 rounded-xl hover:bg-red-100 transition-colors">✗ Reject</button>
                <button onClick={() => deleteApplicant(selected._id)} className="px-4 py-2.5 text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-sky-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-sky-900">Upload Applicants</h2>
              <button onClick={() => setShowUpload(false)} className="text-sky-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Job Position</label>
                <select value={uploadJobId} onChange={e => setUploadJobId(e.target.value)} className="input-sky">
                  <option value="">Select a job…</option>
                  {jobs.filter(j => j.status === 'active').map((j: any) => (
                    <option key={j._id} value={j._id}>{j.title}</option>
                  ))}
                </select>
              </div>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-sky-200 rounded-2xl p-10 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors">
                <FileText className="w-10 h-10 text-sky-300 mx-auto mb-3" />
                <p className="font-semibold text-sky-700">Drop files or click to browse</p>
                <p className="text-sky-400 text-sm mt-1">CSV, Excel, PDF resumes</p>
                <div className="flex gap-2 justify-center mt-3">
                  {['CSV','XLSX','PDF'].map(f => <span key={f} className="badge-sky">{f}</span>)}
                </div>
                <input ref={fileRef} type="file" multiple accept=".csv,.xlsx,.xls,.pdf" className="hidden" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowUpload(false)} className="flex-1 btn-ghost-sky">Cancel</button>
                <button onClick={handleUpload} disabled={uploading} className="flex-1 btn-sky flex items-center justify-center gap-2">
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Upload & Process
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
