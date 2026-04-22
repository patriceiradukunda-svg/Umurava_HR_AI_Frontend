'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { BrainCircuit, Eye, EyeOff, Loader2, Building2 } from 'lucide-react'

export default function HRAuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const { login, register: registerUser } = useAuth()
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data: any) => {
    setBusy(true)
    try {
      if (mode === 'login') {
        const res = await login(data.email, data.password)
        if (res.role === 'applicant') {
          toast.error('Please use the Job Seeker portal')
          return
        }
        toast.success(`Welcome back, ${data.email.split('@')[0]}!`)
        router.push('/hr/dashboard')
      } else {
        await registerUser({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          role: 'recruiter',
          department: data.department,
          organization: data.organization || 'Umurava',
        })
        toast.success('Account created! Welcome to TalentAI.')
        router.push('/hr/dashboard')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Authentication failed')
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
            <span className="font-display text-white font-bold text-xl">Umurava TalentAI</span>
            <p className="text-sky-100 text-xs tracking-widest uppercase">HR Portal</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="font-display text-5xl font-bold text-white leading-tight mb-6">
            Screen smarter,<br />hire faster.
          </h2>
          <p className="text-sky-100 text-lg leading-relaxed mb-10">
            AI-powered candidate screening that gives your team back hours every day.
          </p>
          <div className="space-y-4">
            {[
              'Screen 100+ candidates in under 5 minutes',
              'Gemini AI with explainable reasoning',
              'Weighted scoring across 5 dimensions',
              'Full pipeline visibility',
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
            Demo credentials: <span className="text-white font-mono">recruiter@umurava.africa</span> /
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
              <span className="font-display font-bold text-sky-900 text-lg">Umurava TalentAI</span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-sky-500" />
              <h1 className="font-display text-2xl font-bold text-sky-900">
                {mode === 'login' ? 'HR Sign In' : 'Create HR Account'}
              </h1>
            </div>
            <p className="text-sky-500 text-sm mb-8">
              {mode === 'login' ? 'Access your recruiter dashboard' : 'Join as a recruiter or admin'}
            </p>

            {/* Toggle */}
            <div className="flex bg-sky-50 rounded-xl p-1 mb-8">
              {(['login', 'register'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mode === m ? 'bg-white text-sky-700 shadow-card' : 'text-sky-400'
                  }`}>
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">First Name</label>
                      <input {...register('firstName', { required: true })} placeholder="Alice" className="input-sky" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Last Name</label>
                      <input {...register('lastName', { required: true })} placeholder="Mutoni" className="input-sky" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Department</label>
                    <input {...register('department')} placeholder="e.g. Talent Acquisition" className="input-sky" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Organization</label>
                    <input {...register('organization')} placeholder="e.g. Umurava" className="input-sky" />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Email</label>
                <input {...register('email', { required: true })} type="email" placeholder="recruiter@company.com" className="input-sky" />
              </div>

              <div>
                <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Password</label>
                <div className="relative">
                  <input {...register('password', { required: true, minLength: 6 })}
                    type={showPass ? 'text' : 'password'} placeholder="••••••••" className="input-sky pr-12" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sky-400 hover:text-sky-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={busy}
                className="w-full btn-sky flex items-center justify-center gap-2 mt-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {mode === 'login' ? 'Sign In to Dashboard' : 'Create HR Account'}
              </button>
            </form>

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
