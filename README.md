# Umurava AI Talent Screening Platform

Frontend for the **Umurava AI Hackathon Challenge**. Our project is an intelligent tool designed to help recruiters find the best talent quickly, fairly, and transparently. 

We focused on **Scenario 1**, ensuring our system works perfectly with the official **Umurava Talent Profile Schema**.

##  Project Overview
Hiring usually takes days of manual work. Our platform uses the **Google Gemini AI** to screen hundreds of applicants in seconds. 

### Why it’s better:
*   **It is Fast:** It finishes in seconds what would normally take a recruiter many hours or days.
*   **It is Fair:** Because it is an AI, it is not biased. It treats everyone the same and only looks at their skills and experience, not their personal background.
*   **It is Transparent:** The AI doesn't just give a score; it explains **why** it picked a candidate by listing their **Strengths** and **Gaps**.

##  The Tech Stack
- **Frontend**: Next.js.
- **AI**: Google Gemini API.
- **Database**: MongoDB Atlas.

##  Portals

### 1. Recruiter Portal (`/hr/*`)
*   **Dashboard**: See live stats of your hiring progress.
*   **Job Management**: Create and edit job postings.
*   **AI Screening**: Trigger the Gemini AI to rank applicants and see live progress.
*   **Shortlist & Insights**: View the top candidates with clear AI reasoning on their fit.
*   **Analytics**: See distribution charts of candidate scores and common skill gaps.

### 2. Talent Portal (`/applicant/*`)
*   **Profile Creation**: Build a profile that follows the official Umurava Schema.
*   **Job Browser**: View and apply for active positions.
*   **Tracking**: Keep track of all your applications in one place.

## Project Structure
```
app/
├── auth/hr/              # Login page
├── hr/
│   ├── layout.tsx        # Shared layout with drawer navigation
│   ├── dashboard/        # Dashboard page
│   ├── jobs/             # Job management
│   ├── applicants/       # Applicant management
│   ├── screening/        # AI screening workflow
│   ├── shortlist/        # Results & shortlist
│   └── settings/         # Settings
src/
├── lib/api.ts            # All API calls
└── context/AuthContext.tsx
```


##  Deployment
- **<a href="https://umurava-hr-ai-frontend-three.vercel.app" target="_blank">Frontend</a>**: Deployed and hosted on **Vercel** 
- **<a href="https://umurava-hr-ai-backend-1.onrender.com/api" target="_blank">Backend</a>**: Deployed and hosted on **Render** 
- **Database**: Hosted on **MongoDB Atlas**.

##  Local Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Run the project**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

 ## Screening Workflow (UI Design)
```
1. Select Job → 2. Configure Weights → 3. Run Screening →
4. View Shortlist → 5. Review Candidates → 6. Send Notifications
```

## 🔑 Demo Credentials

**Recruiter Account:**
- **Email:** `recruiter@umurava.africa`
- **Password:** `Recruiter@1234`


## 🔑 Demo Credentials

**JobSeeker Account:**
- **Email:** patriceir@gmail.com`
- **Password:** `Syntare123`
** You can register a new account directly on the platform.**

---
*Built with ❤️ by Syntarecy team*
