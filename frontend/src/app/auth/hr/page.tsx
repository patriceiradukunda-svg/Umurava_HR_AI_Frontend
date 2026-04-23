'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { BrainCircuit, Eye, EyeOff, Loader2, Building2, ShieldAlert } from 'lucide-react'

export default function HRAuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { register, handleSubmit } = useForm()

  const onSubmit = async (data: any) => {
    if (mode === 'register') {
      toast.error('HR accounts are created by your administrator. Please contact admin@umurava.africa to get access.')
      return
    }
    setBusy(true)
    try {
      const res = await login(data.email, data.password)
      if (res.role === 'applicant') {
        toast.error('This account is a Job Seeker account. Please use the Job Seeker portal.')
        return
      }
      toast.success(`Welcome back, ${data.email.split('@')[0]}!`)
      router.push('/hr/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-sky-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-sky-gradient opacity-90" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-sky-300/20 rounded-full blur-2xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-display text-white font-bold text-xl">Umurava Africa</span>
            <p className="text-sky-100 text-xs tracking-widest uppercase">HR Portal</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="font-display text-5xl font-bold text-white leading-tight mb-6">
            Screen smarter,<br />hire faster.
          </h2>
          <p className="text-sky-100 text-lg leading-relaxed mb-10">
            A streamlined candidate screening experience designed to save time, improve clarity,
            and help teams focus on meaningful hiring decisions.
          </p>
          <div className="space-y-4">
            {[
              'Review 100+ candidate applications in minutes',
              'Clear insights that support confident decision-making',
              'Structured evaluation across multiple key criteria',
              'Full visibility throughout every stage of the hiring pipeline',
            ].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-sky-100 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-sky-200 text-sm">
            Sample credentials: <span className="text-white font-mono">recruiter@umurava.africa</span> /
            <span className="text-white font-mono"> Recruiter@1234</span>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="glass rounded-3xl p-8 shadow-sky-lg">

            {/* Logo mobile */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-xl bg-sky-gradient flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-sky-900 text-lg">Umurava Africa</span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-sky-500" />
              <h1 className="font-display text-2xl font-bold text-sky-900">
                {mode === 'login' ? 'HR Sign In' : 'HR Account Info'}
              </h1>
            </div>
            <p className="text-sky-500 text-sm mb-8">
              {mode === 'login' ? 'Access your recruiter dashboard' : 'How to get an HR account'}
            </p>

            {/* Toggle */}
            <div className="flex bg-sky-50 rounded-xl p-1 mb-8">
              {(['login', 'register'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mode === m ? 'bg-white text-sky-700 shadow-card' : 'text-sky-400'
                  }`}>
                  {m === 'login' ? 'Sign In' : 'Get Access'}
                </button>
              ))}
            </div>

            {/* Login form */}
            {mode === 'login' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">
                    Email
                  </label>
                  <input
                    {...register('email', { required: true })}
                    type="email"
                    placeholder="recruiter@company.com"
                    className="input-sky"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('password', { required: true, minLength: 6 })}
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="input-sky pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sky-400 hover:text-sky-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full btn-sky flex items-center justify-center gap-2 mt-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In to Dashboard
                </button>
              </form>
            )}

            {/* Register info panel */}
            {mode === 'register' && (
              <div className="space-y-5">
                <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <ShieldAlert className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 text-sm mb-1">
                      HR accounts require admin approval
                    </p>
                    <p className="text-amber-700 text-xs leading-relaxed">
                      For security, recruiter and admin accounts cannot be self-registered.
                      They are created by your organization&apos;s administrator.
                    </p>
                  </div>
                </div>

                <div className="bg-sky-50 rounded-2xl p-5 border border-sky-100 space-y-3">
                  <p className="font-semibold text-sky-800 text-sm">How to get access:</p>
                  {[
                    'Contact your Umurava administrator',
                    'Provide your name, email and department',
                    'Your account will be created and credentials sent to you',
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-sky-200 text-sky-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-sky-700 text-sm">{step}</p>
                    </div>
                  ))}
                </div>

                <a
                  href="mailto:admin@umurava.africa?subject=HR Account Request&body=Hello, I would like to request an HR recruiter account. My name is: [Your Name]. Department: [Your Department]."
                  className="w-full btn-sky flex items-center justify-center gap-2">
                  📧 Email admin@umurava.africa
                </a>

                <button
                  onClick={() => setMode('login')}
                  className="w-full btn-ghost-sky text-sm">
                  ← Back to Sign In
                </button>
              </div>
            )}

            <p className="text-center text-sky-500 text-sm mt-6">
              Not a recruiter?{' '}
              <Link href="/auth/applicant" className="text-sky-600 font-semibold hover:underline">
                Job Seeker Portal →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
