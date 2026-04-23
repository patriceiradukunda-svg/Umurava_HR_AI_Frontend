'use client'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BrainCircuit, Users, Building2, ArrowRight, CheckCircle, Zap, Shield } from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'applicant') router.push('/applicant/jobs')
      else router.push('/hr/dashboard')
    }
  }, [user, loading, router])

  if (loading) return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-gradient flex items-center justify-center shadow-sky-sm">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-800 text-sky-900 text-lg leading-none">Umurava</span>
              <span className="block text-xs text-sky-400 font-semibold tracking-widest uppercase">TalentAI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/applicant" className="btn-ghost-sky text-sm">Job Seekers</Link>
            <Link href="/auth/hr" className="btn-sky text-sm">HR Portal →</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-mesh opacity-60" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-sky-200 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-sky-300 rounded-full blur-3xl opacity-20" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-sky-100 border border-sky-200 rounded-full px-4 py-2 mb-8">
            <Zap className="w-4 h-4 text-sky-500" />
            <span className="text-sky-700 text-sm font-semibold">Powered by Umurava Talent Platform</span>
          </div>

          <h1 className="font-display font-800 text-5xl md:text-7xl text-sky-950 leading-tight mb-6">
            Hire Smarter with
            <span className="gradient-text block">Confidence</span>
          </h1>

          <p className="text-sky-700 text-xl leading-relaxed mb-12 max-w-2xl mx-auto">
            Umurava Talent helps you screen, evaluate, and shortlist candidates efficiently so your recruiters can focus on what matters most - 
            meaningful human conversations and selecting the right talent.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/hr" className="btn-sky text-base flex items-center gap-2 justify-center">
              <Building2 className="w-5 h-5" />
              I&apos;m a Recruiter
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/applicant" className="btn-sky-outline text-base flex items-center gap-2 justify-center">
              <Users className="w-5 h-5" />
              I&apos;m Looking for Work
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 bg-sky-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-4xl font-bold text-white text-center mb-4">
            Everything you need to hire faster
          </h2>
          <p className="text-sky-300 text-center mb-16 text-lg">
            From job posting to shortlist in minutes, not days.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BrainCircuit,
                title: 'Gemini AI Screening',
                desc: 'Multi-candidate batch evaluation with weighted scoring across skills, experience, education and more.',
                color: 'text-sky-400',
                bg: 'bg-sky-900',
              },
              {
                icon: Zap,
                title: 'Instant Shortlists',
                desc: 'Screen 100+ candidates in under 5 minutes. Get ranked Top 10 or Top 20 with full AI reasoning.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-900/30',
              },
              {
                icon: Shield,
                title: 'Explainable AI',
                desc: 'Every decision comes with strengths, gaps, and a clear recommendation. No black boxes.',
                color: 'text-amber-400',
                bg: 'bg-amber-900/20',
              },
            ].map((f) => (
              <div key={f.title} className={`${f.bg} rounded-2xl p-8 border border-sky-800`}>
                <div className={`${f.color} mb-4`}><f.icon className="w-10 h-10" /></div>
                <h3 className="font-display text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-sky-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-sky-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl font-bold text-sky-950 mb-6">
            Ready to transform your hiring?
          </h2>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {['AI-powered screening','Bias reduction','Instant shortlists','Full explainability'].map(f => (
              <div key={f} className="flex items-center gap-2 bg-white border border-sky-200 rounded-full px-4 py-2">
                <CheckCircle className="w-4 h-4 text-sky-500" />
                <span className="text-sky-800 text-sm font-medium">{f}</span>
              </div>
            ))}
          </div>
          <Link href="/auth/hr" className="btn-sky text-lg inline-flex items-center gap-2">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-sky-950 py-8 px-6 text-center text-sky-400 text-sm">
        <p>© 2024 Umurava TalentAI · Powered by Google Gemini API · Built for Umurava AI Hackathon</p>
      </footer>
    </main>
  )
}
