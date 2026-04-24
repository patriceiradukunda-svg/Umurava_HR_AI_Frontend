import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://umurava-hr-ai-backend-1.onrender.com/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ── Attach JWT to every request ───────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = Cookies.get('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Handle 401 globally ───────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('token')
      Cookies.remove('user')
      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        if (path.startsWith('/hr')) window.location.href = '/auth/hr'
        else                        window.location.href = '/auth/applicant'
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:       (data: object)  => api.post('/auth/register', data),
  login:          (data: object)  => api.post('/auth/login', data),
  me:             ()              => api.get('/auth/me'),
  changePassword: (data: object)  => api.patch('/auth/change-password', data),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  get: (params?: object) => api.get('/dashboard', { params }),
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobsAPI = {
  list:         (params?: object)             => api.get('/jobs', { params }),
  stats:        ()                            => api.get('/jobs/stats'),
  get:          (id: string)                  => api.get(`/jobs/${id}`),
  create:       (data: object)                => api.post('/jobs', data),
  update:       (id: string, data: object)    => api.put(`/jobs/${id}`, data),
  updateStatus: (id: string, status: string)  => api.patch(`/jobs/${id}/status`, { status }),
  delete:       (id: string)                  => api.delete(`/jobs/${id}`),
  applicants:   (id: string, params?: object) => api.get(`/jobs/${id}/applicants`, { params }),
}

// ── Applicants ────────────────────────────────────────────────────────────────
export const applicantsAPI = {
  list:         (params?: object)             => api.get('/applicants', { params }),
  stats:        ()                            => api.get('/applicants/stats'),
  get:          (id: string)                  => api.get(`/applicants/${id}`),
  create:       (data: object)                => api.post('/applicants', data),

  // File upload — matches POST /api/applicants/bulk-upload in backend
  bulkUpload:   (formData: FormData)          => api.post('/applicants/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // bulk uploads can take longer
  }),

  updateStatus: (id: string, status: string)  => api.patch(`/applicants/${id}/status`, { status }),
  update:       (id: string, data: object)    => api.patch(`/applicants/${id}`, data),
  delete:       (id: string)                  => api.delete(`/applicants/${id}`),
}

// ── Screening ─────────────────────────────────────────────────────────────────
export const screeningAPI = {
  list:       (params?: object) => api.get('/screening', { params }),
  get:        (id: string)      => api.get(`/screening/${id}`),
  latest:     (jobId: string)   => api.get(`/screening/latest/${jobId}`),
  run:        (data: object)    => api.post('/screening/run', data),
  pollStatus: (id: string)      => api.get(`/screening/${id}/status`),
  delete:     (id: string)      => api.delete(`/screening/${id}`),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  get:           (params?: object) => api.get('/analytics', { params }),
  pipeline:      (jobId: string)   => api.get(`/analytics/pipeline/${jobId}`),
  filterOptions: ()                => api.get('/analytics/filter-options'),
}

// ── Settings ──────────────────────────────────────────────────────────────────
// Matches the settings.routes.ts: GET /settings, PATCH /settings, DELETE /settings
export const settingsAPI = {
  get:    ()             => api.get('/settings'),
  update: (data: object) => api.patch('/settings', data),
  reset:  ()             => api.delete('/settings'),
}

export default api
