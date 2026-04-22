# Umurava_HR_AI_Frontend

Next.js 14 frontend for the Umurava AI HR Screening Platform.

## Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS (sky-blue + white theme)
- **State**: React Context + hooks
- **Forms**: react-hook-form
- **Charts**: Recharts
- **HTTP**: Axios
- **Auth**: JWT stored in cookies (js-cookie)

## Two Portals

### HR Portal (`/hr/*`)
- Dashboard with live stats
- Job postings — full CRUD
- Applicants — view, filter, upload CSV/PDF
- AI Screening — trigger Gemini screening with live progress
- Shortlist — view ranked candidates with AI reasoning
- Pipeline — kanban view per job
- Analytics — score distribution, skill gaps
- Settings — AI model config, organization

### Applicant Portal (`/applicant/*`)
- Browse active job postings
- Apply to positions with one click
- My Applications — track status
- Profile page

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev        # runs on http://localhost:3000
```

## Deploy to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://umurava-hr-ai-backend-1.onrender.com/api`
4. Deploy

## Demo Credentials

**HR / Recruiter:**
- Email: `recruiter@umurava.africa`
- Password: `Recruiter@1234`

**Applicant:** Register a new account at `/auth/applicant`

## API Connection

All API calls go through `src/lib/api.ts` which connects to the backend.
Update `NEXT_PUBLIC_API_URL` in your environment to point to your backend.
