'use client'
import { useEffect, useState } from 'react'
import { jobsAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { Plus, Search, Pencil, Trash2, Bot, X, Loader2, Briefcase, MapPin, Clock } from 'lucide-react'
import Link from 'next/link'

export default function HRJobsPage() {
  const [jobs, setJobs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [busy, setBusy]           = useState(false)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { register, handleSubmit, reset, setValue } = useForm()

  const load = async () => {
    setLoading(true)
    try {
      const r = await jobsAPI.list({ search: search || undefined, status: statusFilter !== 'all' ? statusFilter : undefined })
      setJobs(r.data.data)
    } catch { toast.error('Failed to load jobs') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, statusFilter])

  const openCreate = () => { setEditing(null); reset(); setShowModal(true) }
  const openEdit   = (job: any) => {
    setEditing(job)
    setValue('title',       job.title)
    setValue('department',  job.department)
    setValue('location',    job.location)
    setValue('type',        job.type)
    setValue('description', job.description)
    setValue('requiredSkills',   (job.requiredSkills || []).join(', '))
    setValue('niceToHaveSkills', (job.niceToHaveSkills || []).join(', '))
    setValue('minimumExperienceYears', job.minimumExperienceYears)
    setValue('shortlistSize', job.shortlistSize)
    setValue('status',      job.status)
    setShowModal(true)
  }

  const onSubmit = async (data: any) => {
    setBusy(true)
    try {
      const payload = {
        ...data,
        requiredSkills:   data.requiredSkills?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
        niceToHaveSkills: data.niceToHaveSkills?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
        minimumExperienceYears: Number(data.minimumExperienceYears) || 0,
        shortlistSize: Number(data.shortlistSize) || 10,
      }
      if (editing) {
        await jobsAPI.update(editing._id, payload)
        toast.success('Job updated')
      } else {
        await jobsAPI.create(payload)
        toast.success('Job created')
      }
      setShowModal(false)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed')
    } finally { setBusy(false) }
  }

  const deleteJob = async (id: string) => {
    if (!confirm('Delete this job and all its applicants?')) return
    try {
      await jobsAPI.delete(id)
      toast.success('Job deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  const changeStatus = async (id: string, status: string) => {
    try {
      await jobsAPI.updateStatus(id, status)
      toast.success(`Status → ${status}`)
      load()
    } catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-sky-950">Job Postings</h1>
          <p className="text-sky-400 text-sm mt-1">{jobs.length} total positions</p>
        </div>
        <button onClick={openCreate} className="btn-sky flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Job
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-sky-200 rounded-xl px-4 h-10">
          <Search className="w-4 h-4 text-sky-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs…" className="outline-none text-sm text-sky-800 placeholder-sky-300 w-44" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-sky-200 rounded-xl px-4 h-10 text-sm text-sky-700 outline-none">
          {['all','active','draft','screening','closed'].map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Jobs grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_,i) => <div key={i} className="bg-white rounded-2xl h-48 shimmer" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-card">
          <Briefcase className="w-12 h-12 text-sky-200 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-sky-900 mb-2">No jobs found</h3>
          <p className="text-sky-400 mb-6">Create your first job posting to start screening candidates.</p>
          <button onClick={openCreate} className="btn-sky">Create Job</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {jobs.map(job => (
            <div key={job._id} className="bg-white rounded-2xl p-6 shadow-card card-hover border border-sky-50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge-${job.status}`}>{job.status}</span>
                    <span className="text-sky-300 text-xs">{job.department}</span>
                  </div>
                  <h3 className="font-display font-bold text-sky-900 text-lg truncate">{job.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-sky-400 text-xs"><MapPin className="w-3 h-3" />{job.location}</span>
                    <span className="flex items-center gap-1 text-sky-400 text-xs"><Clock className="w-3 h-3" />{job.type}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="font-display text-2xl font-bold text-sky-500">{job.applicantCount || 0}</div>
                  <div className="text-sky-300 text-xs">applicants</div>
                </div>
              </div>

              <p className="text-sky-600 text-sm line-clamp-2 mb-4">{job.description}</p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {(job.requiredSkills || []).slice(0, 4).map((s: string) => (
                  <span key={s} className="badge-sky">{s}</span>
                ))}
                {(job.requiredSkills || []).length > 4 && (
                  <span className="badge-sky">+{job.requiredSkills.length - 4}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link href="/hr/screening" className="flex items-center gap-1.5 bg-sky-950 hover:bg-sky-900 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
                  <Bot className="w-3.5 h-3.5" /> Screen
                </Link>
                <button onClick={() => openEdit(job)} className="flex items-center gap-1.5 btn-ghost-sky text-xs py-2">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <select value={job.status} onChange={e => changeStatus(job._id, e.target.value)}
                  className="ml-auto text-xs border border-sky-200 rounded-lg px-2 py-1.5 text-sky-600 outline-none bg-white">
                  {['active','draft','screening','closed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => deleteJob(job._id)} className="text-red-400 hover:text-red-600 p-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-sky-lg">
            <div className="sticky top-0 bg-white border-b border-sky-100 px-8 py-5 flex items-center justify-between rounded-t-3xl">
              <h2 className="font-display text-xl font-bold text-sky-900">
                {editing ? 'Edit Job' : 'Post New Job'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-sky-400 hover:text-sky-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Job Title *</label>
                  <input {...register('title', { required: true })} placeholder="e.g. Senior Backend Engineer" className="input-sky" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Department *</label>
                  <select {...register('department', { required: true })} className="input-sky">
                    <option value="">Select…</option>
                    {['Engineering','Design','Data','Product','Marketing','Operations'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Type</label>
                  <select {...register('type')} className="input-sky">
                    {['Full-time','Part-time','Contract','Remote'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Location *</label>
                  <input {...register('location', { required: true })} placeholder="e.g. Kigali / Remote" className="input-sky" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Min. Experience (yrs)</label>
                  <input {...register('minimumExperienceYears')} type="number" min="0" placeholder="3" className="input-sky" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Description *</label>
                  <textarea {...register('description', { required: true })} rows={4} placeholder="Describe the role…" className="input-sky resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Required Skills (comma separated)</label>
                  <input {...register('requiredSkills')} placeholder="Node.js, TypeScript, MongoDB" className="input-sky" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Nice-to-Have Skills</label>
                  <input {...register('niceToHaveSkills')} placeholder="Redis, AWS, Docker" className="input-sky" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Shortlist Size</label>
                  <select {...register('shortlistSize')} className="input-sky">
                    <option value="10">Top 10</option>
                    <option value="20">Top 20</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Status</label>
                  <select {...register('status')} className="input-sky">
                    {['draft','active','screening','closed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost-sky">Cancel</button>
                <button type="submit" disabled={busy} className="btn-sky flex items-center gap-2">
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
