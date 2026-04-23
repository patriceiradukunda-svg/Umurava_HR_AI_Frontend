'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import {
  User, Mail, Phone, MapPin, Briefcase, GraduationCap,
  Award, FolderGit2, Globe, Linkedin, Github, FileText,
  Plus, Trash2, Save, Pencil, CheckCircle, Upload,
  Calendar, ChevronDown, ChevronUp, Clock, Star,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
interface Skill       { name: string; level: string; yearsOfExperience: number }
interface Language    { name: string; proficiency: string }
interface Experience  { company: string; role: string; startDate: string; endDate: string; description: string; technologies: string; isCurrent: boolean }
interface Education   { institution: string; degree: string; fieldOfStudy: string; startYear: string; endYear: string }
interface Certification { name: string; issuer: string; issueDate: string }
interface Project     { name: string; description: string; technologies: string; role: string; link: string; startDate: string; endDate: string }

interface Profile {
  // Basic
  firstName: string; lastName: string; email: string; phone: string
  headline: string; bio: string; location: string; nationality: string
  dateOfBirth: string; gender: string; linkedIn: string; github: string; portfolio: string
  // Arrays
  skills: Skill[]; languages: Language[]; experience: Experience[]
  education: Education[]; certifications: Certification[]; projects: Project[]
  // Availability
  availabilityStatus: string; availabilityType: string; availableFrom: string
  expectedSalary: string; currency: string; willingToRelocate: string; remotePreference: string
  // Files
  resumeUrl: string; coverLetterUrl: string
  // Meta
  profileCompletedAt: string; lastUpdatedAt: string
}

const EMPTY_PROFILE: Profile = {
  firstName: '', lastName: '', email: '', phone: '', headline: '', bio: '',
  location: '', nationality: '', dateOfBirth: '', gender: '', linkedIn: '',
  github: '', portfolio: '',
  skills: [], languages: [], experience: [], education: [],
  certifications: [], projects: [],
  availabilityStatus: '', availabilityType: '', availableFrom: '',
  expectedSalary: '', currency: 'USD', willingToRelocate: '', remotePreference: '',
  resumeUrl: '', coverLetterUrl: '',
  profileCompletedAt: '', lastUpdatedAt: '',
}

// ── Completion calculator ─────────────────────────────────────────────────────
function calcCompletion(p: Profile): number {
  const checks = [
    !!p.firstName, !!p.lastName, !!p.email, !!p.phone,
    !!p.headline, !!p.bio, !!p.location, !!p.nationality,
    !!p.dateOfBirth, !!p.gender,
    p.skills.length > 0, p.languages.length > 0,
    p.experience.length > 0, p.education.length > 0,
    p.certifications.length > 0, p.projects.length > 0,
    !!p.availabilityStatus, !!p.availabilityType,
    !!p.expectedSalary,
    !!p.resumeUrl, !!p.coverLetterUrl,
    !!p.linkedIn, !!p.github,
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-sky-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-sky-600" />
          </div>
          <span className="font-display font-bold text-sky-900 text-base">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-sky-400" /> : <ChevronDown className="w-4 h-4 text-sky-400" />}
      </button>
      {open && <div className="px-6 pb-6 border-t border-sky-50">{children}</div>}
    </div>
  )
}

// ── Field helpers ─────────────────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-bold text-sky-600 uppercase tracking-wide mb-1.5 block">{children}</label>
)
const Input = ({ ...props }) => (
  <input {...props} className={`input-sky ${props.className || ''}`} />
)
const Select = ({ children, ...props }: any) => (
  <select {...props} className="input-sky">{children}</select>
)
const Textarea = ({ ...props }) => (
  <textarea {...props} className="input-sky resize-none" rows={4} />
)

// ── Main component ────────────────────────────────────────────────────────────
export default function ApplicantProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile]   = useState<Profile>(EMPTY_PROFILE)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState<'resume' | 'cover' | null>(null)
  const resumeRef   = useRef<HTMLInputElement>(null)
  const coverRef    = useRef<HTMLInputElement>(null)
  const STORAGE_KEY = user ? `umurava_profile_${user.id}` : 'umurava_profile'

  // Load saved profile from localStorage on mount
  useEffect(() => {
    if (!user) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setProfile({ ...EMPTY_PROFILE, ...parsed })
      } catch { /* ignore */ }
    } else {
      // Pre-fill from auth user
      setProfile(p => ({
        ...p,
        firstName: user.firstName || '',
        lastName:  user.lastName  || '',
        email:     user.email     || '',
      }))
    }
  }, [user])

  const completion = calcCompletion(profile)

  // ── Helpers ──────────────────────────────────────────────────────────────
  const set = (field: keyof Profile, value: any) =>
    setProfile(p => ({ ...p, [field]: value }))

  const saveProfile = () => {
    setSaving(true)
    const now = new Date().toISOString()
    const updated: Profile = {
      ...profile,
      lastUpdatedAt:      now,
      profileCompletedAt: profile.profileCompletedAt || now,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setProfile(updated)
    setTimeout(() => {
      setSaving(false)
      toast.success('Profile saved successfully! ✓')
    }, 600)
  }

  // ── File upload (simulated — stores as base64 or filename) ────────────────
  const handleFileUpload = async (type: 'resume' | 'cover', file: File) => {
    setUploading(type)
    try {
      // In production this would upload to S3/Cloudinary
      // For now we store the filename and simulate upload
      await new Promise(r => setTimeout(r, 1200))
      const fakeUrl = `https://storage.umurava.africa/${type}/${user?.id}/${file.name}`
      if (type === 'resume')      set('resumeUrl', fakeUrl)
      else                        set('coverLetterUrl', fakeUrl)
      toast.success(`${type === 'resume' ? 'Resume' : 'Cover letter'} uploaded: ${file.name}`)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(null)
    }
  }

  // ── Array item helpers ────────────────────────────────────────────────────
  const addSkill          = () => set('skills', [...profile.skills, { name: '', level: 'Intermediate', yearsOfExperience: 1 }])
  const removeSkill       = (i: number) => set('skills', profile.skills.filter((_, x) => x !== i))
  const updateSkill       = (i: number, f: keyof Skill, v: any) => set('skills', profile.skills.map((s, x) => x === i ? { ...s, [f]: v } : s))

  const addLanguage       = () => set('languages', [...profile.languages, { name: '', proficiency: 'Conversational' }])
  const removeLanguage    = (i: number) => set('languages', profile.languages.filter((_, x) => x !== i))
  const updateLanguage    = (i: number, f: keyof Language, v: any) => set('languages', profile.languages.map((l, x) => x === i ? { ...l, [f]: v } : l))

  const addExperience     = () => set('experience', [...profile.experience, { company: '', role: '', startDate: '', endDate: '', description: '', technologies: '', isCurrent: false }])
  const removeExperience  = (i: number) => set('experience', profile.experience.filter((_, x) => x !== i))
  const updateExperience  = (i: number, f: keyof Experience, v: any) => set('experience', profile.experience.map((e, x) => x === i ? { ...e, [f]: v } : e))

  const addEducation      = () => set('education', [...profile.education, { institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' }])
  const removeEducation   = (i: number) => set('education', profile.education.filter((_, x) => x !== i))
  const updateEducation   = (i: number, f: keyof Education, v: any) => set('education', profile.education.map((e, x) => x === i ? { ...e, [f]: v } : e))

  const addCert           = () => set('certifications', [...profile.certifications, { name: '', issuer: '', issueDate: '' }])
  const removeCert        = (i: number) => set('certifications', profile.certifications.filter((_, x) => x !== i))
  const updateCert        = (i: number, f: keyof Certification, v: any) => set('certifications', profile.certifications.map((c, x) => x === i ? { ...c, [f]: v } : c))

  const addProject        = () => set('projects', [...profile.projects, { name: '', description: '', technologies: '', role: '', link: '', startDate: '', endDate: '' }])
  const removeProject     = (i: number) => set('projects', profile.projects.filter((_, x) => x !== i))
  const updateProject     = (i: number, f: keyof Project, v: any) => set('projects', profile.projects.map((p, x) => x === i ? { ...p, [f]: v } : p))

  if (!user) return null

  const initials = `${user.firstName?.[0] || '?'}${user.lastName?.[0] || '?'}`.toUpperCase()

  const completionColor =
    completion >= 80 ? 'text-emerald-600' :
    completion >= 50 ? 'text-sky-600' :
    'text-amber-600'

  const completionBg =
    completion >= 80 ? 'bg-emerald-500' :
    completion >= 50 ? 'bg-sky-500' :
    'bg-amber-500'

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">

      {/* ── Profile header + completion ───────────────────────────────────── */}
      <div className="bg-sky-950 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-sky-gradient text-white font-bold text-2xl flex items-center justify-center shadow-sky-md flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold">{user.firstName} {user.lastName}</h1>
            <p className="text-sky-400 text-sm">{profile.headline || 'Add your professional headline below'}</p>
            <p className="text-sky-500 text-xs mt-1">{profile.location || 'Location not set'}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`font-display text-4xl font-bold ${completionColor}`}>{completion}%</div>
            <div className="text-sky-400 text-xs">Profile complete</div>
            {profile.lastUpdatedAt && (
              <div className="text-sky-500 text-xs mt-1 flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" />
                Last saved {new Date(profile.lastUpdatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative mt-5">
          <div className="flex items-center justify-between text-xs text-sky-400 mb-2">
            <span>Profile completion</span>
            <span className={completionColor}>{completion >= 80 ? '🎉 Excellent!' : completion >= 50 ? '👍 Good progress' : '⚡ Keep going!'}</span>
          </div>
          <div className="h-2.5 bg-sky-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${completionBg}`}
              style={{ width: `${completion}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-1 mt-3">
            {[
              { label: 'Basic Info',    done: !!(profile.firstName && profile.email && profile.phone && profile.location) },
              { label: 'Skills & Exp', done: !!(profile.skills.length && profile.experience.length) },
              { label: 'Education',    done: !!(profile.education.length && profile.certifications.length) },
              { label: 'Documents',    done: !!(profile.resumeUrl && profile.coverLetterUrl) },
            ].map(s => (
              <div key={s.label} className={`text-center py-1.5 rounded-lg text-xs font-semibold ${s.done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-800/50 text-sky-500'}`}>
                {s.done ? '✓ ' : ''}{s.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Save button (sticky top) ─────────────────────────────────────── */}
      <div className="sticky top-20 z-30 flex justify-end">
        <button onClick={saveProfile} disabled={saving}
          className="btn-sky flex items-center gap-2 shadow-sky-lg">
          {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Profile</>}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. BASIC PERSONAL INFORMATION                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section title="Personal Information" icon={User}>
        <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>First Name *</Label>
            <Input value={profile.firstName} onChange={(e: any) => set('firstName', e.target.value)} placeholder="Jean" />
          </div>
          <div>
            <Label>Last Name *</Label>
            <Input value={profile.lastName} onChange={(e: any) => set('lastName', e.target.value)} placeholder="Mutesi" />
          </div>
          <div>
            <Label>Email Address *</Label>
            <Input type="email" value={profile.email} onChange={(e: any) => set('email', e.target.value)} placeholder="jean@email.com" />
          </div>
          <div>
            <Label>Phone Number *</Label>
            <Input type="tel" value={profile.phone} onChange={(e: any) => set('phone', e.target.value)} placeholder="+250 78X XXX XXX" />
          </div>
          <div>
            <Label>Date of Birth *</Label>
            <Input type="date" value={profile.dateOfBirth} onChange={(e: any) => set('dateOfBirth', e.target.value)} />
          </div>
          <div>
            <Label>Gender *</Label>
            <Select value={profile.gender} onChange={(e: any) => set('gender', e.target.value)}>
              <option value="">Select gender…</option>
              <option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option>
            </Select>
          </div>
          <div>
            <Label>Nationality *</Label>
            <Input value={profile.nationality} onChange={(e: any) => set('nationality', e.target.value)} placeholder="Rwandan" />
          </div>
          <div>
            <Label>Current Location (City, Country) *</Label>
            <Input value={profile.location} onChange={(e: any) => set('location', e.target.value)} placeholder="Kigali, Rwanda" />
          </div>
          <div className="sm:col-span-2">
            <Label>Professional Headline *</Label>
            <Input value={profile.headline} onChange={(e: any) => set('headline', e.target.value)} placeholder="e.g. Senior Backend Engineer – Node.js & AI Systems" />
          </div>
          <div className="sm:col-span-2">
            <Label>Professional Bio / Summary *</Label>
            <Textarea value={profile.bio} onChange={(e: any) => set('bio', e.target.value)}
              placeholder="Write a 3-5 sentence professional summary about yourself, your experience, and what you are looking for…" />
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. SOCIAL LINKS                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section title="Social & Online Presence" icon={Globe}>
        <div className="pt-5 grid sm:grid-cols-2 gap-4">
          <div>
            <Label>LinkedIn Profile URL</Label>
            <div className="relative">
              <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
              <input value={profile.linkedIn} onChange={(e: any) => set('linkedIn', e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className="input-sky pl-9" />
            </div>
          </div>
          <div>
            <Label>GitHub Profile URL</Label>
            <div className="relative">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
              <input value={profile.github} onChange={(e: any) => set('github', e.target.value)}
                placeholder="https://github.com/yourusername"
                className="input-sky pl-9" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Portfolio / Personal Website URL</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
              <input value={profile.portfolio} onChange={(e: any) => set('portfolio', e.target.value)}
                placeholder="https://yourportfolio.com"
                className="input-sky pl-9" />
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. SKILLS                                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section title="Skills & Expertise" icon={Star}>
        <div className="pt-5 space-y-3">
          {profile.skills.map((s, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 bg-sky-50 rounded-xl p-3 border border-sky-100">
              <div className="col-span-12 sm:col-span-5">
                <Label>Skill Name</Label>
                <Input value={s.name} onChange={(e: any) => updateSkill(i, 'name', e.target.value)} placeholder="e.g. Node.js" />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Label>Proficiency Level</Label>
                <Select value={s.level} onChange={(e: any) => updateSkill(i, 'level', e.target.value)}>
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Expert</option>
                </Select>
              </div>
              <div className="col-span-5 sm:col-span-2">
                <Label>Years</Label>
                <Input type="number" min="0" max="40" value={s.yearsOfExperience}
                  onChange={(e: any) => updateSkill(i, 'yearsOfExperience', Number(e.target.value))} />
              </div>
              <div className="col-span-1 flex items-end pb-0.5">
                <button onClick={() => removeSkill(i)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button onClick={addSkill} className="flex items-center gap-2 text-sky-600 font-semibold text-sm hover:text-sky-800 transition-colors">
            <Plus className="w-4 h-4" /> Add Skill
          </button>
          {profile.skills.length === 0 && (
            <p className="text-sky-300 text-sm italic">No skills added yet. Click &quot;Add Skill&quot; to get started.</p>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 4. LANGUAGES                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section title="Languages" icon={Globe}>
        <div className="pt-5 space-y-3">
          {profile.languages.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 bg-sky-50 rounded-xl p-3 border border-sky-100">
              <div className="col-span-6">
                <Label>Language</Label>
                <Input value={l.name} onChange={(e: any) => updateLanguage(i, 'name', e.target.value)} placeholder="e.g. English" />
              </div>
              <div className="col-span-5">
                <Label>Proficiency</Label>
                <Select value={l.proficiency} onChange={(e: any) => updateLanguage(i, 'proficiency', e.target.value)}>
                  <option>Basic</option><option>Conversational</option><option>Fluent</option><option>Native</option>
                </Select>
              </div>
              <div className="col-span-1 flex items-end pb-0.5">
                <button onClick={() => removeLanguage(i)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button onClick={addLanguage} className="flex items-center gap-2 text-sky-600 font-semibold text-sm hover:text-sky-800">
            <Plus className="w-4 h-4" /> Add Language
          </button>
          {profile.languages.length === 0 && (
            <p className="text-sky-300 text-sm italic">No languages added yet.</p>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 5. WORK EXPERIENCE                                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section title="Work Experience" icon={Briefcase}>
        <div className="pt-5 space-y-4">
          {profile.experience.map((e, i) => (
            <div key={i} className="bg-sky-50 rounded-xl p-4 border border-sky-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sky-800 text-sm">Experience #{i + 1}</span>
                <button onClick={() => removeExperience(i)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Company / Organisation *</Label>
                  <Input value={e.company} onChange={(e2: any) => updateExperience(i, 'company', e2.target.value)} placeholder="e.g. Andela" />
                </div>
                <div>
                  <Label>Job Title / Role *</Label>
                  <Input value={e.role} onChange={(e2: any) => updateExperience(i, 'role', e2.target.value)} placeholder="e.g. Backend Engineer" />
                </div>
                <div>
                  <Label>Start Date *</Label>
                  <Input type="month" value={e.startDate} onChange={(e2: any) => updateExperience(i, 'startDate', e2.target.value)} />
                </div>
                <div>
                  <Label>End Date {e.isCurrent ? '(Current Job)' : '*'}</Label>
                  <Input type="month" value={e.endDate} disabled={e.isCurrent}
                    onChange={(e2: any) => updateExperience(i, 'endDate', e2.target.value)} />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <input type="checkbox" id={`current-${i}`} checked={e.isCurrent}
                    onChange={(e2: any) => updateExperience(i, 'isCurrent', e2.target.checked)}
                    className="w-4 h-4 accent-sky-500" />
                  <label htmlFor={`current-${i}`} className="text-sky-700 text-sm font-medium">
                    I currently work here
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <Label>Key Responsibilities & Achievements *</Label>
                  <Textarea value={e.description}
                    onChange={(e2: any) => updateExperience(i, 'description', e2.target.value)}
                    placeholder="Describe your main responsibilities, achievements, and impact. Include metrics where possible (e.g. 'Improved API response time by 40%')…" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Technologies Used (comma separated)</Label>
                  <Input value={e.technologies}
                    onChange={(e2: any) => updateExperience(i, 'technologies', e2.target.value)}
                    placeholder="Node.js, TypeScript, MongoDB, AWS…" />
                </div>
              </div>
            </div>
          ))}
          <button onClick={addExperience} className="flex items-center gap-2 text-sky-600 font-semibold text-sm hover:text-sky-800">
            <Plus className="w-4 h-4" /> Add Work Experience
          </button>
          {profile.experience.length === 0 && (
            <p className="text-sky-300 text-sm italic">No work experience added yet. Add your most recent job first.</p>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 6. EDUCATION                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section title="Education" icon={GraduationCap}>
        <div className="pt-5 space-y-4">
          {profile.education.map((e, i) => (
            <div key={i} className="bg-sky-50 rounded-xl p-4 border border-sky-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sky-800 text-sm">Education #{i + 1}</span>
                <button onClick={() => removeEducation(i)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label>Institution / University Name *</Label>
                  <Input value={e.institution} onChange={(e2: any) => updateEducation(i, 'institution', e2.target.value)}
                    placeholder="e.g. University of Rwanda" />
                </div>
                <div>
                  <Label>Degree / Qualification *</Label>
                  <Select value={e.degree} onChange={(e2: any) => updateEducation(i, 'degree', e2.target.value)}>
                    <option value="">Select…</option>
                    <option>High School Diploma</option><option>Associate&apos;s</option>
                    <option>Bachelor&apos;s</option><option>Master&apos;s</option>
                    <option>PhD / Doctorate</option><option>Professional Certificate</option>
                    <option>Bootcamp</option><option>Other</option>
                  </Select>
                </div>
                <div>
                  <Label>Field of Study *</Label>
                  <Input value={e.fieldOfStudy} onChange={(e2: any) => updateEducation(i, 'fieldOfStudy', e2.target.value)}
                    placeholder="e.g. Computer Science" />
                </div>
                <div>
                  <Label>Start Year *</Label>
                  <Input type="number" min="1980" max="2030" value={e.startYear}
                    onChange={(e2: any) => updateEducation(i, 'startYear', e2.target.value)} placeholder="2019" />
                </div>
                <div>
                  <Label>End Year (or expected) *</Label>
                  <Input type="number" min="1980" max="2030" value={e.endYear}
                    onChange={(e2: any) => updateEducation(i, 'endYear', e2.target.value)} placeholder="2023" />
                </div>
              </div>
            </div>
          ))}
          <button onClick={addEducation} className="flex items-center gap-2 text-sky-600 font-semibold text-sm hover:text-sky-800">
            <Plus className="w-4 h-4" /> Add Education
          </button>
          {profile.education.length === 0 && (
            <p className="text-sky-300 text-sm italic">No education added yet.</p>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 7. CERTIFICATIONS                                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section title="Certifications & Licences" icon={Award}>
        <div className="pt-5 space-y-3">
          {profile.certifications.map((c, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 bg-sky-50 rounded-xl p-3 border border-sky-100">
              <div className="col-span-12 sm:col-span-5">
                <Label>Certification Name *</Label>
                <Input value={c.name} onChange={(e: any) => updateCert(i, 'name', e.target.value)}
                  placeholder="e.g. AWS Certified Developer" />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Label>Issuing Organisation *</Label>
                <Input value={c.issuer} onChange={(e: any) => updateCert(i, 'issuer', e.target.value)}
                  placeholder="e.g. Amazon" />
              </div>
              <div className="col-span-5 sm:col-span-2">
                <Label>Issue Date *</Label>
                <Input type="month" value={c.issueDate} onChange={(e: any) => updateCert(i, 'issueDate', e.target.value)} />
              </div>
              <div className="col-span-1 flex items-end pb-0.5">
                <button onClick={() => removeCert(i)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button onClick={addCert} className="flex items-center gap-2 text-sky-600 font-semibold text-sm hover:text-sky-800">
            <Plus className="w-4 h-4" /> Add Certification
          </button>
          {profile.certifications.length === 0 && (
            <p className="text-sky-300 text-sm italic">No certifications added yet.</p>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 8. PROJECTS                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section title="Portfolio Projects" icon={FolderGit2}>
        <div className="pt-5 space-y-4">
          {profile.projects.map((p, i) => (
            <div key={i} className="bg-sky-50 rounded-xl p-4 border border-sky-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sky-800 text-sm">Project #{i + 1}</span>
                <button onClick={() => removeProject(i)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Project Name *</Label>
                  <Input value={p.name} onChange={(e: any) => updateProject(i, 'name', e.target.value)}
                    placeholder="e.g. AI Recruitment System" />
                </div>
                <div>
                  <Label>Your Role in Project *</Label>
                  <Input value={p.role} onChange={(e: any) => updateProject(i, 'role', e.target.value)}
                    placeholder="e.g. Lead Backend Engineer" />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="month" value={p.startDate} onChange={(e: any) => updateProject(i, 'startDate', e.target.value)} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="month" value={p.endDate} onChange={(e: any) => updateProject(i, 'endDate', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Project Description *</Label>
                  <Textarea value={p.description} onChange={(e: any) => updateProject(i, 'description', e.target.value)}
                    placeholder="Describe what the project does, the problem it solves, and your specific contribution…" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Technologies Used (comma separated)</Label>
                  <Input value={p.technologies} onChange={(e: any) => updateProject(i, 'technologies', e.target.value)}
                    placeholder="Next.js, Node.js, MongoDB, Gemini API…" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Project Link / GitHub URL</Label>
                  <Input type="url" value={p.link} onChange={(e: any) => updateProject(i, 'link', e.target.value)}
                    placeholder="https://github.com/you/project or https://project.vercel.app" />
                </div>
              </div>
            </div>
          ))}
          <button onClick={addProject} className="flex items-center gap-2 text-sky-600 font-semibold text-sm hover:text-sky-800">
            <Plus className="w-4 h-4" /> Add Project
          </button>
          {profile.projects.length === 0 && (
            <p className="text-sky-300 text-sm italic">No projects added yet. Showcase your best work!</p>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 9. AVAILABILITY & PREFERENCES                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section title="Availability & Job Preferences" icon={Calendar}>
        <div className="pt-5 grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Availability Status *</Label>
            <Select value={profile.availabilityStatus} onChange={(e: any) => set('availabilityStatus', e.target.value)}>
              <option value="">Select…</option>
              <option>Available</option>
              <option>Open to Opportunities</option>
              <option>Not Available</option>
            </Select>
          </div>
          <div>
            <Label>Employment Type *</Label>
            <Select value={profile.availabilityType} onChange={(e: any) => set('availabilityType', e.target.value)}>
              <option value="">Select…</option>
              <option>Full-time</option><option>Part-time</option><option>Contract</option>
              <option>Freelance</option><option>Internship</option>
            </Select>
          </div>
          <div>
            <Label>Available From (date)</Label>
            <Input type="date" value={profile.availableFrom} onChange={(e: any) => set('availableFrom', e.target.value)} />
          </div>
          <div>
            <Label>Remote Work Preference</Label>
            <Select value={profile.remotePreference} onChange={(e: any) => set('remotePreference', e.target.value)}>
              <option value="">Select…</option>
              <option>Remote only</option><option>Hybrid</option><option>On-site only</option>
              <option>No preference</option>
            </Select>
          </div>
          <div>
            <Label>Willing to Relocate?</Label>
            <Select value={profile.willingToRelocate} onChange={(e: any) => set('willingToRelocate', e.target.value)}>
              <option value="">Select…</option>
              <option>Yes</option><option>No</option><option>Depends on location</option>
            </Select>
          </div>
          <div>
            <Label>Expected Salary</Label>
            <div className="flex gap-2">
              <Select value={profile.currency} onChange={(e: any) => set('currency', e.target.value)}
                className="w-24 flex-shrink-0">
                <option>USD</option><option>RWF</option><option>KES</option><option>EUR</option><option>GBP</option>
              </Select>
              <Input type="number" min="0" value={profile.expectedSalary}
                onChange={(e: any) => set('expectedSalary', e.target.value)}
                placeholder="e.g. 50000" />
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 10. RESUME & COVER LETTER UPLOAD                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Section title="Resume & Cover Letter" icon={FileText}>
        <div className="pt-5 space-y-5">
          {/* Resume */}
          <div>
            <Label>Resume / CV *</Label>
            <div
              onClick={() => resumeRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                ${profile.resumeUrl ? 'border-emerald-300 bg-emerald-50' : 'border-sky-200 bg-sky-50 hover:border-sky-400 hover:bg-white'}`}>
              {uploading === 'resume' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sky-600 font-semibold text-sm">Uploading resume…</p>
                </div>
              ) : profile.resumeUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                  <p className="font-semibold text-emerald-700 text-sm">Resume uploaded ✓</p>
                  <p className="text-emerald-500 text-xs truncate max-w-xs">{profile.resumeUrl.split('/').pop()}</p>
                  <button onClick={(e) => { e.stopPropagation(); set('resumeUrl', '') }}
                    className="text-red-400 text-xs font-semibold hover:underline mt-1">Remove</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-sky-300" />
                  <p className="font-semibold text-sky-700">Upload your Resume / CV</p>
                  <p className="text-sky-400 text-sm">PDF, DOC, DOCX — max 10MB</p>
                  <p className="text-sky-300 text-xs">Click to browse or drag and drop</p>
                </div>
              )}
              <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('resume', f) }} />
            </div>
          </div>

          {/* Cover Letter */}
          <div>
            <Label>Cover Letter *</Label>
            <div
              onClick={() => coverRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                ${profile.coverLetterUrl ? 'border-emerald-300 bg-emerald-50' : 'border-sky-200 bg-sky-50 hover:border-sky-400 hover:bg-white'}`}>
              {uploading === 'cover' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sky-600 font-semibold text-sm">Uploading cover letter…</p>
                </div>
              ) : profile.coverLetterUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                  <p className="font-semibold text-emerald-700 text-sm">Cover letter uploaded ✓</p>
                  <p className="text-emerald-500 text-xs truncate max-w-xs">{profile.coverLetterUrl.split('/').pop()}</p>
                  <button onClick={(e) => { e.stopPropagation(); set('coverLetterUrl', '') }}
                    className="text-red-400 text-xs font-semibold hover:underline mt-1">Remove</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-sky-300" />
                  <p className="font-semibold text-sky-700">Upload your Cover Letter</p>
                  <p className="text-sky-400 text-sm">PDF, DOC, DOCX — max 5MB</p>
                  <p className="text-sky-300 text-xs">Click to browse or drag and drop</p>
                </div>
              )}
              <input ref={coverRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('cover', f) }} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Bottom save button ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-sky-50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-display font-bold text-sky-900 text-lg">
              Profile {completion}% complete
            </p>
            <p className="text-sky-400 text-sm">
              {completion < 100
                ? `${23 - Math.round(completion / 100 * 23)} more items to complete your profile`
                : '🎉 Your profile is 100% complete!'}
            </p>
            {profile.lastUpdatedAt && (
              <p className="text-sky-300 text-xs mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last saved: {new Date(profile.lastUpdatedAt).toLocaleString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            )}
            {profile.profileCompletedAt && (
              <p className="text-sky-300 text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Profile started: {new Date(profile.profileCompletedAt).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric'
                })}
              </p>
            )}
          </div>
          <button onClick={saveProfile} disabled={saving}
            className="btn-sky flex items-center gap-2 text-base px-8 py-3">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              : <><Save className="w-5 h-5" /> Save Profile</>}
          </button>
        </div>
      </div>
    </div>
  )
}
