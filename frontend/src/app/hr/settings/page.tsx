'use client'
import { useEffect, useState } from 'react'
import { settingsAPI } from '@/lib/api'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Loader2, Bot, Building2 } from 'lucide-react'

export default function HRSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [savingAI, setSavingAI]   = useState(false)
  const [savingOrg, setSavingOrg] = useState(false)

  const aiForm  = useForm()
  const orgForm = useForm()

  useEffect(() => {
    settingsAPI.get().then(r => {
      const s = r.data.data
      aiForm.reset({
        model: s.ai?.model || 'gemini-1.5-pro',
        maxCandidatesPerBatch: s.ai?.maxCandidatesPerBatch || 50,
        defaultShortlistSize:  s.ai?.defaultShortlistSize  || 10,
        temperature:           s.ai?.temperature           || 0.2,
      })
      orgForm.reset({
        name:            s.organization?.name            || 'Umurava',
        adminEmail:      s.organization?.adminEmail      || '',
        defaultLocation: s.organization?.defaultLocation || 'Kigali, Rwanda',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const saveAI = async (data: any) => {
    setSavingAI(true)
    try {
      await settingsAPI.updateAI({ ...data, maxCandidatesPerBatch: Number(data.maxCandidatesPerBatch), defaultShortlistSize: Number(data.defaultShortlistSize), temperature: Number(data.temperature) })
      toast.success('AI settings saved')
    } catch { toast.error('Failed to save') }
    finally { setSavingAI(false) }
  }

  const saveOrg = async (data: any) => {
    setSavingOrg(true)
    try {
      await settingsAPI.updateOrg(data)
      toast.success('Organization settings saved')
    } catch { toast.error('Failed to save') }
    finally { setSavingOrg(false) }
  }

  if (loading) return (
    <div className="grid lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_,i) => <div key={i} className="bg-white rounded-2xl h-96 shimmer" />)}
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-sky-950">Settings</h1>
        <p className="text-sky-400 text-sm mt-1">Configure AI and organization preferences</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* AI Config */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-sky-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-gradient flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sky-900">AI Configuration</h2>
              <p className="text-sky-400 text-xs">Gemini API settings</p>
            </div>
          </div>
          <form onSubmit={aiForm.handleSubmit(saveAI)} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">AI Model</label>
              <select {...aiForm.register('model')} className="input-sky">
                <option value="gemini-1.5-pro">gemini-1.5-pro (Recommended)</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash (Faster)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash (Latest)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Max Candidates per Batch</label>
              <input {...aiForm.register('maxCandidatesPerBatch')} type="number" min="1" max="100" className="input-sky" />
            </div>
            <div>
              <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Default Shortlist Size</label>
              <select {...aiForm.register('defaultShortlistSize')} className="input-sky">
                <option value="10">Top 10</option>
                <option value="20">Top 20</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Temperature (0 = deterministic)</label>
              <input {...aiForm.register('temperature')} type="number" min="0" max="1" step="0.1" className="input-sky" />
            </div>
            <button type="submit" disabled={savingAI} className="w-full btn-sky flex items-center justify-center gap-2">
              {savingAI && <Loader2 className="w-4 h-4 animate-spin" />}
              Save AI Settings
            </button>
          </form>
        </div>

        {/* Org Config */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-sky-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sky-900">Organization</h2>
              <p className="text-sky-400 text-xs">Company information</p>
            </div>
          </div>
          <form onSubmit={orgForm.handleSubmit(saveOrg)} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Organization Name</label>
              <input {...orgForm.register('name')} placeholder="Umurava" className="input-sky" />
            </div>
            <div>
              <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Admin Email</label>
              <input {...orgForm.register('adminEmail')} type="email" placeholder="admin@company.com" className="input-sky" />
            </div>
            <div>
              <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Default Location</label>
              <input {...orgForm.register('defaultLocation')} placeholder="Kigali, Rwanda" className="input-sky" />
            </div>
            <button type="submit" disabled={savingOrg} className="w-full btn-sky flex items-center justify-center gap-2">
              {savingOrg && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Organization
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
