'use client'
import { useEffect, useState } from 'react'
import { applicantsAPI } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { FileText, Clock, CheckCircle, XCircle, Star } from 'lucide-react'

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    applicantsAPI.list({ limit: 100 })
      .then(r => {
        // Filter to only current user's applications
        const mine = r.data.data.filter((a: any) =>
          a.talentProfile?.email === user.email
        )
        setApplications(mine)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending:     { icon: Clock,        color: 'text-amber-500',   label: 'Under Review' },
    screened:    { icon: FileText,     color: 'text-sky-500',     label: 'AI Screened' },
    shortlisted: { icon: Star,         color: 'text-emerald-500', label: 'Shortlisted!' },
    rejected:    { icon: XCircle,      color: 'text-red-400',     label: 'Not Selected' },
  }

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_,i) => <div key={i} className="bg-white rounded-2xl h-28 shimmer" />)}
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-sky-950">My Applications</h1>
        <p className="text-sky-400 text-sm mt-1">{applications.length} application{applications.length !== 1 ? 's' : ''} submitted</p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-card border border-sky-50">
          <FileText className="w-12 h-12 text-sky-200 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-sky-900 mb-2">No applications yet</h3>
          <p className="text-sky-400 mb-6">Browse open positions and apply to get started.</p>
          <a href="/applicant/jobs" className="btn-sky inline-flex">Browse Jobs →</a>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => {
            const cfg = statusConfig[app.status] || statusConfig.pending
            const Icon = cfg.icon
            return (
              <div key={app._id} className="bg-white rounded-2xl p-6 shadow-card border border-sky-50 card-hover">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-6 h-6 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-sky-900">{app.jobId?.title || 'Position'}</h3>
                    <p className="text-sky-400 text-sm">Applied {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                    {app.aiScore != null && (
                      <p className="text-sky-400 text-xs mt-1">AI Score: <strong className="text-sky-600">{app.aiScore}</strong>/100</p>
                    )}
                  </div>
                </div>

                {app.status === 'shortlisted' && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <p className="text-sm font-semibold">
                        Congratulations! You have been shortlisted. The recruiter will contact you soon.
                      </p>
                    </div>
                  </div>
                )}

                {app.status === 'rejected' && (
                  <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-red-500 text-sm">
                      Thank you for applying. The team has moved forward with other candidates for this role.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
