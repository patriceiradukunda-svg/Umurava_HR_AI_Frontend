# Umurava AI Screening — Frontend

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=for-the-badge&logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)

**AI-powered HR screening platform that helps recruiters evaluate, rank, and shortlist candidates using Google Gemini.**

[Live Demo](https://umurava-hr-ai-frontend-three.vercel.app) · [Backend Repository](https://github.com/patriceiradukunda-svg/Umurava_HR_AI_Backend)

</div>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [AI Decision Flow](#ai-decision-flow)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Assumptions & Limitations](#assumptions--limitations)

---

## Project Overview

Umurava AI Screening is a full-stack HR platform that uses the **Google Gemini API** to automatically screen job applicants. HR professionals can post jobs, manage applicants, trigger AI-powered screening, view ranked shortlists, and notify candidates — all from a clean, mobile-first interface.

The platform solves a critical HR bottleneck: manually reviewing dozens of CVs is time-consuming and inconsistent. Umurava AI Screening automates this with structured, bias-free AI evaluation that scores every candidate across five weighted dimensions and provides natural-language reasoning for every decision.


## Innoviation

**Umurava AI Screening’s scoring weight customization** is innovative because most hiring platforms use the same fixed criteria for every job. They often judge all roles the same way, whether it is a creative company hiring a junior designer or a bank hiring a senior security engineer.

**Our system is different** because it allows HR teams to choose what matters most for each hiring process, not allowes using default scoring weight. They can adjust the importance of five key areas: **skills match, experience, education, project relevance, and availability, using a 0–100 scale**.

For example, if a delivery company needs a worker urgently, it can give availability 40% so candidates who can start this week get higher scores. If a university is hiring a lecturerand looking someone with High Qualification degree, it can give education 50% so candidates with a Master’s degree or PhD get higher scores.

This means candidates are not judged by one generic system. Instead, they are evaluated based on the real needs and priorities of the company hiring them, **making the shortlist more accurate and fair**.


### Demo Credentials
```
URL:https://umurava-hr-ai-frontend-three.vercel.app

Recruiter Account:
-Email: recruiter@umurava.africa
- Password: Recruiter@1234


Demo Credentials

JobSeeker Account:
- Email: patriceir@gmail.com
- Password: Syntare123
You can register a new account directly on the platform.

```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        HR Browser Client                        │
│                    (Next.js 14 · Vercel)                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS REST (Axios)
                      │ JWT Bearer Token
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express.js REST API                           │
│               (Node.js 20 · TypeScript · Render)                │
│                                                                  │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  /auth   │  │   /jobs    │  │/applicants│  │ /screening  │  │
│  └──────────┘  └────────────┘  └──────────┘  └──────┬──────┘  │
└────────────────────────────────────────────────────── │ ────────┘
                                                        │
                      ┌─────────────────────────────────┘
                      │ HTTPS (Google Gemini REST API)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Google Gemini API                             │
│              model: gemini-3-flash-preview                       │
│                                                                  │
│   Call 1: Evaluate candidates → scores + reasoning              │
│   Call 2: Pool insights → skill gaps + hiring recommendations   │
└─────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MongoDB Atlas                              │
│   Collections: users · jobs · applicants · screeningresults     │
└─────────────────────────────────────────────────────────────────┘
```

### Page Structure

```
/auth/hr              →  HR Login
/hr/dashboard         →  Metrics, analytics, job overview
/hr/jobs              →  Post and manage job listings
/hr/applicants        →  View and manage all applicants
/hr/screening         →  Configure and launch AI screening
/hr/shortlist         →  View ranked results, notify candidates
/hr/settings          →  Organization profile, AI weight defaults
```

---

## AI Decision Flow

This section explains exactly how Gemini makes screening decisions.

### Step 1 — HR Triggers Screening

HR selects a job, sets shortlist size, and optionally adjusts scoring weights. The backend fetches all applicants for that job from MongoDB.

### Step 2 — Candidate Profiling

Each applicant's `talentProfile` is serialised into a compact structured text block:

```
CANDIDATE_1 id:665f000000000000000002c1
Name: Jean-Pierre Nkurunziza | Email: jp@gmail.com | Location: Kigali, Rwanda
TotalExp: 7.8yr | Skills: Node.js(Expert,6y), TypeScript(Advanced,4y), ...
Work: Lead Backend Engineer@Kigali Fintech(2021-now)[Node.js,Docker,AWS]
Edu: Bachelor's Computer Science@University of Rwanda(2018) | Certs: AWS Developer
Projects: PayFlow API Gateway[Node.js,Redis,Kubernetes]
Availability: Open to Opportunities
```

### Step 3 — Gemini Evaluation (Call 1)

Candidates are sent to Gemini in batches of 8. The prompt instructs Gemini to evaluate every candidate and return a structured JSON object using `responseMimeType: 'application/json'` which forces clean, parseable output.

**Scoring formula:**
```
matchScore = (
  skillsMatch       × 40  +
  experienceMatch   × 30  +
  educationMatch    × 15  +
  projectRelevance  × 10  +
  availabilityBonus ×  5
) / 100
```

Weights are HR-configurable per screening run. Gemini scores each dimension 0–100 independently, then computes the weighted `matchScore`.

**Per-candidate output:**
```json
{
  "applicantId": "665f000000000000000002c1",
  "matchScore": 87,
  "scoreBreakdown": {
    "skillsMatch": 95,
    "experienceMatch": 90,
    "educationMatch": 80,
    "projectRelevance": 85,
    "availabilityBonus": 70
  },
  "strengths": ["Expert Node.js with 6 years...", "Led microservices migration..."],
  "gaps": ["No Kubernetes production experience", "Limited GraphQL exposure"],
  "shortlistedReason": "Jean-Pierre is the strongest backend candidate with direct fintech experience and proven leadership at scale.",
  "skillGaps": ["Kubernetes", "GraphQL"],
  "growthAreas": ["Cloud-native orchestration", "API gateway patterns"],
  "courseRecommendations": ["CKA — closes Kubernetes gap", "GraphQL by Example on Udemy"],
  "recommendation": "Strongly Recommend for Interview"
}
```

### Step 4 — Ranking & Shortlisting

All candidates across all batches are sorted by `matchScore` descending. The top N (HR-configured) are marked `isShortlisted: true` with assigned ranks. The remainder are marked `isShortlisted: false`. Both groups are saved to MongoDB.

### Step 5 — Pool Insights (Call 2)

A second, lightweight Gemini call analyses the full evaluated pool and returns strategic recommendations:

```json
{
  "overallSkillGaps": [{ "skill": "Kubernetes", "coverage": 20, "severity": "critical" }],
  "pipelineHealth": "Strong Node.js talent pool but weak on cloud-native skills...",
  "criticalMissingSkills": ["Kubernetes", "GraphQL"],
  "hiringRecommendation": "Proceed with top 3 candidates. Consider upskilling for cloud infrastructure."
}
```

This call is **non-fatal** — if it fails, the candidate results are still saved and the screening completes successfully.

### Step 6 — HR Reviews & Notifies

HR views the ranked shortlist (green = shortlisted, red = not selected), clicks candidates to read AI reasoning, and sends typed notifications (Shortlisted / Interview / Written Test / Hired / Not Selected) directly from the UI.

---

## Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Real-time hiring metrics with date-range filters (7/30/90 days) |
| **Job Management** | Create, edit, close, and track job postings |
| **Applicant Management** | View full talent profiles, filter by job/status |
| **AI Screening** | Trigger Gemini-powered evaluation with custom weights |
| **Screening Guard** | Warns and blocks if shortlist size exceeds applicant count |
| **Shortlist View** | Ranked table — green shortlisted, red not selected |
| **Candidate Detail** | Per-candidate score breakdown, strengths, gaps, recommendations |
| **Email Notifications** | Send 5 notification types directly to candidates |
| **Delete & Re-screen** | Delete screening result → resets applicants → job available for re-screening |
| **Export CSV** | Export filtered shortlist to CSV |
| **Responsive UI** | Mobile bottom nav + desktop hamburger drawer |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| HTTP Client | Axios |
| Auth | JWT stored in cookies (`js-cookie`) |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| Hosting | Vercel |

---

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Backend running (see [backend README](https://github.com/patriceiradukunda-svg/Umurava_HR_AI_Backend))

### 1. Clone the repository

```bash
git clone https://github.com/patriceiradukunda-svg/Umurava_HR_AI_Frontend
cd Umurava_HR_AI_Frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your values (see [Environment Variables](#environment-variables) below).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
npm start
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Required — URL of the backend API (no trailing slash)
NEXT_PUBLIC_API_URL=https://umurava-hr-ai-backend-1.onrender.com/api
```

For local development with the backend running locally:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

> **Note:** All environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets (API keys, database credentials) in frontend environment variables.

---

## Project Structure

```
├── app/
│   ├── auth/
│   │   └── hr/
│   │       └── page.tsx          # HR login page
│   └── hr/
│       ├── layout.tsx            # Shared layout: drawer nav, topbar, mobile bottom nav
│       ├── dashboard/
│       │   └── page.tsx          # Dashboard: metrics, analytics, job overview
│       ├── jobs/
│       │   └── page.tsx          # Job postings management
│       ├── applicants/
│       │   └── page.tsx          # Applicant management
│       ├── screening/
│       │   └── page.tsx          # AI screening configuration and launch
│       ├── shortlist/
│       │   └── page.tsx          # Ranked results, notifications, delete
│       └── settings/
│           └── page.tsx          # Organization & AI settings
├── src/
│   ├── lib/
│   │   └── api.ts                # All Axios API calls (authAPI, jobsAPI, screeningAPI…)
│   └── context/
│       └── AuthContext.tsx       # JWT auth state, login/logout, route protection
├── public/                       # Static assets
├── .env.local                    # Environment variables (not committed)
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## Assumptions & Limitations

### Assumptions

- **HR users only.** The platform is designed exclusively for internal HR use. Applicant-facing features (e.g., viewing their own results) are out of scope for this submission.
- **Applicants are pre-loaded.** Applicants are added manually or via the API. There is no public applicant application form in this version.
- **One active screening per job.** The system assumes one screening result per job at a time. HR must delete an existing result before running a fresh screening with different settings.
- **Gemini API availability.** Screening requires an active Gemini API key with available quota. The `gemini-3-flash-preview` model is used as the primary model because it operates on a separate quota pool from production models.
- **Email notifications are simulated.** The "Send Notification" feature updates the applicant status in the database and records the notification type. Actual email delivery (SMTP) is not implemented — it would require an email service such as SendGrid or Resend in a production deployment.

### Limitations

- **No real-time collaboration.** Multiple HR users working simultaneously may see stale data without a page refresh. WebSocket or server-sent event support would be needed for real-time collaboration.
- **Gemini free tier quota.** The free tier allows 1,500 requests/day. Heavy usage (many simultaneous screenings) can exhaust the daily quota. Enabling Google Cloud billing resolves this and costs approximately $0.01 per screening.
- **No pagination on screening results.** The shortlist table loads all candidates at once. For jobs with 100+ applicants, this could affect performance.
- **Mobile screens limited for data-heavy views.** The shortlist table hides some columns (skills, experience, location) on small screens to maintain readability. Full detail is accessible through the row detail modal.
- **Screening timeout.** Render's free tier has a 30-second HTTP timeout. For jobs with many applicants (30+), the initial POST to `/screening/run` returns immediately (202 Accepted) and the frontend polls for status — avoiding timeout issues entirely.

---

## Deployment

The frontend is deployed on **Vercel** with automatic deployments from the `main` branch.

To deploy your own instance:

1. Fork the repository
2. Connect to Vercel: [vercel.com/new](https://vercel.com/new)
3. Set the environment variable `NEXT_PUBLIC_API_URL` in Vercel project settings
4. Deploy — Vercel handles the build automatically

---

<div align="center">
Built for the Umurava AI Challenge · 2026
</div>
