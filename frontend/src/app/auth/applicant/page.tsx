'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { BrainCircuit, Eye, EyeOff, Loader2, Users } from 'lucide-react'

export default function ApplicantAuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const { login, register: registerUser } = useAuth()
  const router = useRouter()
  const { register, handleSubmit } = useForm()

  const onSubmit = async (data: any) => {
    setBusy(true)
    try {
      if (mode === 'login') {
        const res = await login(data.email, data.password)
        if (res.role !== 'applicant') {
          toast.error('Please use the HR Portal for recruiter accounts')
          return
        }
        toast.success('Welcome back!')
        router.push('/applicant/jobs')
      } else {
        await registerUser({
          firstName: data.firstName,
          lastName:  data.lastName,
          email:     data.email,
          password:  data.password,
          role:      'applicant',
        })
        toast.success('Account created! Browse open positions.')
        router.push('/applicant/jobs')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center gap-12 p-12 bg-sky-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-200 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-sky-300 rounded-full blur-3xl opacity-30" />

        {/* Top corners: logo left, badge right */}
        <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
          <Link href="/" className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-gradient flex items-center justify-center shadow-sky-sm">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-sky-900 text-lg">Umurava Africa</span>
          </Link>

          <div className="inline-flex items-center gap-2 bg-sky-100 border border-sky-200 rounded-full px-4 py-2">
            <Users className="w-4 h-4 text-sky-500" />
            <span className="text-sky-700 text-sm font-semibold">Job Seeker Portal</span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative">
          <h2 className="font-display text-5xl font-bold text-sky-950 leading-tight mb-6">
            Find your<br />
            <span className="gradient-text">dream role.</span>
          </h2>
          <p className="text-sky-600 text-lg leading-relaxed">
            Browse job opportunities, apply with your profile, and find the
            right position, you have been waiting for.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-sky-gradient flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-sky-900 text-lg">Umurava Africa</span>
          </Link>

          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-sky-500" />
            <h1 className="font-display text-2xl font-bold text-sky-900">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
          </div>
          <p className="text-sky-400 text-sm mb-8">
            {mode === 'login' ? 'Sign in and apply for great opportunities waiting for you' : 'Start your professional career now'}
          </p>

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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">First Name</label>
                  <input {...register('firstName', { required: true })} placeholder="Jean" className="input-sky" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Last Name</label>
                  <input {...register('lastName', { required: true })} placeholder="Mutesi" className="input-sky" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Email</label>
              <input {...register('email', { required: true })} type="email" placeholder="you@example.com" className="input-sky" />
            </div>

            <div>
              <label className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1.5 block">Password</label>
              <div className="relative">
                <input {...register('password', { required: true })}
                  type={showPass ? 'text' : 'password'} placeholder="••••••••" className="input-sky pr-12" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sky-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={busy}
              className="w-full btn-sky flex items-center justify-center gap-2 mt-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sky-400 text-sm mt-6">
            Are you a recruiter?{' '}
            <Link href="/auth/hr" className="text-sky-600 font-semibold hover:underline">
              HR Portal →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
