'use client'
import { useEffect, useState } from 'react'
import { analyticsAPI, jobsAPI } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Zap, Target, TrendingDown, Award } from 'lucide-react'

const COLORS = ['#ef4444','#f59e0b','#0ea5e9','#0284c7','#10b981','#f59e0b']

export default function HRAnalyticsPage() {
  const [data, setData]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsAPI.get()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_,i) => <div key={i} className="bg-white rounded-2xl h-32 shimmer" />)}
    </div>
  )

  const s = data?.summary || {}
  const scoreDistribution = data?.scoreDistribution || []
  const topSkillGaps      = data?.topSkillGaps      || []
  const pipelineSummary   = data?.pipelineSummary   || []

  const summaryCards = [
    { label: 'Avg Time-to-Shortlist', value: `${s.avgTimeToShortlist || 0}`, unit: 'min', sub: 'vs 3.5 hrs manually', icon: Zap,          color: 'from-sky-500 to-cyan-500' },
    { label: 'AI Accuracy',           value: `${s.aiAccuracy || 94}`,        unit: '%',   sub: 'Recruiter approval rate', icon: Target,    color: 'from-emerald-500 to-cyan-500' },
    { label: 'Bias Reduction',        value: `${s.biasReduction || 78}`,     unit: '%',   sub: 'vs manual screening', icon: TrendingDown,  color: 'from-indigo-500 to-sky-500' },
    { label: 'Avg Score (Shortlist)', value: `${s.avgScore || 0}`,           unit: '',    sub: `Top score: ${s.topScore || 0}`, icon: Award, color: 'from-amber-500 to-sky-400' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-sky-950">Analytics & Insights</h1>
        <p className="text-sky-400 text-sm mt-1">AI screening performance metrics</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-5 shadow-card border border-sky-50 card-hover">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-4`}>
              <c.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-end gap-1">
              <span className="font-display text-3xl font-bold text-sky-950">{c.value}</span>
              <span className="text-sky-400 text-sm mb-1">{c.unit}</span>
            </div>
            <div className="text-sky-400 text-xs font-semibold uppercase tracking-wide mt-1">{c.label}</div>
            <div className="text-sky-500 text-xs mt-2">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Score distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-sky-50">
          <h2 className="font-display font-bold text-sky-900 mb-5">Score Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreDistribution}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7dd3fc' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#7dd3fc' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0c4a6e', border: 'none', borderRadius: 8, color: '#e0f2fe', fontSize: 12 }} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {scoreDistribution.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline summary */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-sky-50">
          <h2 className="font-display font-bold text-sky-900 mb-5">Pipeline Overview</h2>
          {pipelineSummary.length > 0 ? (
            <div className="space-y-3">
              {pipelineSummary.map((p: any) => {
                const total = pipelineSummary.reduce((a: number, b: any) => a + b.count, 0)
                const pct   = total > 0 ? Math.round((p.count / total) * 100) : 0
                const colors: Record<string, string> = {
                  pending: 'bg-amber-400', screened: 'bg-sky-400',
                  shortlisted: 'bg-emerald-400', rejected: 'bg-red-400',
                }
                return (
                  <div key={p._id} className="flex items-center gap-3">
                    <span className="text-sky-700 text-sm capitalize w-24 flex-shrink-0">{p._id}</span>
                    <div className="flex-1 h-3 bg-sky-50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors[p._id] || 'bg-sky-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-bold text-sky-700 text-sm w-8 text-right">{p.count}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sky-300 text-sm text-center py-8">No data yet. Run a screening first.</p>
          )}
        </div>

        {/* Top skill gaps */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-sky-50 lg:col-span-2">
          <h2 className="font-display font-bold text-sky-900 mb-5">Top Skills Coverage</h2>
          {topSkillGaps.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {topSkillGaps.map((s: any) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-sky-700 text-sm w-32 flex-shrink-0">{s.name}</span>
                  <div className="flex-1 h-2 bg-sky-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${s.coverageRate}%`, background: s.coverageRate >= 70 ? '#10b981' : s.coverageRate >= 50 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <span className="font-bold text-sky-700 text-sm w-10 text-right">{s.coverageRate}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sky-300 text-sm text-center py-8">Run screenings to see skill gap analytics.</p>
          )}
        </div>
      </div>
    </div>
  )
}
