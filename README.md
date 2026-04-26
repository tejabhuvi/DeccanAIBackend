# Skill Assessment Agent

> An AI-powered system that takes a job description and a candidate's resume, conducts a real conversational interview to assess actual skill proficiency, identifies genuine gaps, and generates a personalised learning plan — not based on what someone claims to know, but on what they can actually demonstrate.

---

## Repositories

| | Repo |
|---|---|
| **Frontend** | [https://github.com/tejabhuvi/deccan-ai-frontend](https://github.com/tejabhuvi/deccan-ai-frontend) |
| **Backend** | [https://github.com/tejabhuvi/DeccanAIBackend](https://github.com/tejabhuvi/DeccanAIBackend) |

```bash
# Clone both
git clone https://github.com/tejabhuvi/deccan-ai-frontend
git clone https://github.com/tejabhuvi/DeccanAIBackend
```

---

## Table of Contents

- [What This Actually Does](#what-this-actually-does)
- [Why It Works This Way](#why-it-works-this-way)
- [How It Works — The 7 Stages](#how-it-works--the-7-stages)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Running the App](#running-the-app)
- [The Three Pages](#the-three-pages)
- [API Reference](#api-reference)
- [Design Decisions](#design-decisions)
- [Known Limitations](#known-limitations)

---

## What This Actually Does

Most hiring tools do resume scoring — they compare keywords in a resume against keywords in a job description and give a match percentage. That tells you nothing about whether someone actually knows what they claim to know.

This system does something different. It reads both documents, figures out what skills matter for the role and how confident it should be about the candidate's claim to each one, and then conducts an actual interview — asking pointed, scenario-based questions tailored to what it found suspicious or weak in the resume.

After the interview, it evaluates every answer holistically, identifies real gaps with evidence, and builds a learning plan that accounts for what the candidate already knows — so if they know JavaScript well, it doesn't tell them to spend 8 weeks on TypeScript. It says 2 weeks because the transfer is fast.

The result is three things:

1. **An honest skill scorecard** — every required skill scored 1–10 with a verdict (Strong / Adequate / Weak / Bluffing) and specific evidence from the interview
2. **A gap analysis** — exactly what's missing, why it matters, and how significant the gap actually is
3. **A personalised learning roadmap** — prioritised by role importance, with curated resources, time estimates, and concrete practice projects

---

## Why It Works This Way

### The resume problem

Resumes lie — not always intentionally, but they do. A candidate lists "Machine Learning" because they took a 6-week course 2 years ago. They list "SQL — Experienced" because they know SELECT and JOIN. The resume has no way to convey depth.

A traditional keyword matcher sees "Machine Learning" in both the JD and resume and scores it as a match. This system sees "Machine Learning — listed as Intermediate, zero project evidence showing actual model implementation" and marks it as a red flag to probe hard.

### The interview approach

The agent doesn't ask "Tell me about your Python experience." That question is useless — anyone can talk around it. Instead it asks something specific and concrete — a real scenario with a right answer. Someone who actually knows the skill will be specific. Someone bluffing will stay general — and the evaluator knows the difference.

### The batch evaluation approach

Rather than evaluating each answer one by one, the system collects all answers and evaluates them together. The AI can see patterns across the whole interview — if someone claims ML expertise but their data analysis answers also show shallow thinking, the evaluator catches that cross-answer inconsistency. A per-answer evaluator would miss it entirely.

### The follow-up system

After the first evaluation pass, the AI identifies 2–3 skills where the answer was borderline — not clearly weak enough to fail but not strong enough to pass. It generates targeted follow-up questions grounded in exactly what the candidate said. These aren't generic probes — they're direct responses to the specific gaps in a specific answer.

---

## How It Works — The 7 Stages

### Stage 1 — Document Processing

The candidate uploads their resume and the job description (PDF or DOCX). Both files are processed simultaneously — text is extracted from each and cleaned. This happens in a single request so the frontend never has to manage two separate calls.

---

### Stage 2 — Skill Analysis

Both extracted texts are sent to Gemini together. The AI acts as a technical recruiter building an interview strategy — not just listing skills, but producing a briefing document for the interview agent.

For every skill found in the JD, the analysis determines:

- **How important is it?** Critical, Important, or Bonus to the role
- **How credible is the resume's claim?** Strong evidence (projects back it up), Weak (just listed, nothing to show for it), or None (not mentioned at all)
- **How deep should the assessment go?** A Critical skill with weak resume evidence gets the deepest interrogation
- **What angle to probe from** — not "assess Python" but "probe Python specifically for data manipulation, the resume only shows web dev usage"

The analysis also produces an interview strategy — which skill to open with, what to be skeptical about, how many questions to generate.

This is the agent's internal brief. Everything downstream is driven by it.

---

### Stage 3 — Question Generation

The analysis brief is sent to Gemini which generates 8–15 questions depending on role complexity.

Every question must be specific and concrete — vague openers are explicitly forbidden. Questions are ordered by priority so the most important gaps are always covered first. Different skill depths get different question types — practical scenarios for deep skills, behavioural questions for soft skills, quick conceptuals for surface confirmations.

There are no hardcoded follow-up questions. Early versions had these — they were removed because a preset follow-up is the same regardless of what the candidate actually said. Follow-ups are generated later, based on real answers.

---

### Stage 4 — The Interview Loop

The interview is a simple back-and-forth: a question is shown, the candidate answers, the next question loads. There is no AI involved in this phase at all — the questions were already generated and the loop just serves them one by one while collecting answers.

This is deliberate. No AI calls during the interview means no latency between questions, no quota burn during the conversation, and better evaluation quality later since all answers are assessed together.

---

### Stage 5 — Batch Evaluation

Once all questions are answered, every question and answer is sent to Gemini together. The AI scores each skill 1–10, assigns a verdict, cites specific evidence from the answers, and identifies gaps.

The scoring scale:

| Score | What it means |
|---|---|
| 1–3 | No real knowledge, or bluffing with buzzwords |
| 4–5 | Basic awareness but cannot apply the skill |
| 6–7 | Adequate — can work with guidance |
| 8–9 | Strong — works independently with good depth |
| 10 | Expert — went beyond what was asked |

The evaluator also flags up to 3 skills for follow-up — only borderline scores (4–6) on Critical or Important skills qualify. Bonus skills and clearly passing scores are never followed up.

---

### Stage 6 — Follow-up Round

If the evaluation identifies borderline skills, a second targeted round begins. The candidate answers 1–3 follow-up questions, each directly addressing the specific gap in an earlier answer.

When complete, original answers and follow-up answers are evaluated together for the final scores. If no follow-ups are needed, this stage is skipped entirely.

---

### Stage 7 — Learning Plan

The final evaluation feeds directly into learning plan generation. Only skills with genuine gaps (score below 7) are included.

What makes this different from a generic resource list:

- **Adjacent strength mapping** — looks at what the candidate already knows and finds transfer opportunities. Strong in JavaScript? TypeScript is a 2-week gap, not 8.
- **Concrete practice projects** — not "build something with pandas" but a specific project with a specific dataset and a specific expected output
- **Realistic time estimates** — instructed to be honest, not optimistic
- **Learning order** — which gap to close first, which builds on others
- **Quick wins** — things learnable in 3–5 days that give immediate value and build momentum

---

## Tech Stack

### Backend
| Package | Purpose |
|---|---|
| Express | HTTP server and routing |
| Multer | File upload handling |
| pdf-parse | PDF text extraction |
| Mammoth | DOCX text extraction |
| @google/generative-ai | Gemini API client |
| dotenv | Environment variable management |
| cors | Cross-origin request handling |

### Frontend
| Package | Purpose |
|---|---|
| React | UI framework |
| React Router | 3-page client-side navigation |
| Tailwind CSS | Styling |
| Vite | Build tool and dev server |

### AI
- **Model:** Gemini 2.0 Flash
- **Total AI calls per full assessment:** 5–6 maximum
  - 1 — process (extract + analyze)
  - 1 — question generation
  - 0 — entire interview chat phase
  - 1 — first evaluation
  - 1–2 — final evaluation + learning plan

---

## Project Structure

```
skill-assessment-agent/
│
├── DeccanAIBackend/
│   ├── AI/
│   │   └── geminiApi.js          — Gemini model initialisation
│   ├── extractors/
│   │   └── extractText.js        — PDF and DOCX text extraction
│   ├── routes/
│   │   ├── process.js            — POST /api/process
│   │   ├── questions.js          — POST /api/generate-questions
│   │   ├── chat.js               — POST /api/chat + /api/chat/followup
│   │   └── evaluate.js           — POST /api/evaluate
│   ├── .env                      — API keys (never commit this)
│   └── server.js                 — Express entry point
│
└── deccan-ai-frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Upload.jsx         — Page 1: file upload
    │   │   ├── Interview.jsx      — Page 2: interview loop
    │   │   └── Results.jsx        — Page 3: scores + learning plan
    │   ├── App.jsx                — Router setup
    │   ├── main.jsx               — React entry point
    │   └── index.css              — Fonts + Tailwind base
    └── package.json
```

---

## Setup & Installation

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- A Gemini API key (free tier available)
- A resume and a job description (PDF or DOCX) for testing

---

### Getting a Gemini API Key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with a Google account
3. Click **"Create API key"** → **"Create API key in new project"**
4. Copy the key — it starts with `AIza...`

> Always use **"Create API key in new project"** — not an existing Google Cloud project. AI Studio auto-configures the free tier quota correctly. Manually created projects sometimes don't get the quota assigned and return `limit: 0` errors from the very first request.

Free tier limits:
- 15 requests per minute
- 1,500 requests per day
- Each full assessment uses 5–6 requests

---

### Backend Setup

```bash
cd DeccanAIBackend
npm install
```

Create a `.env` file in the backend root:

```
GEMINI_API_KEY=AIzaSy...your_key_here
```

No quotes around the value. Never commit this file — it's in `.gitignore`.

---

### Frontend Setup

```bash
cd deccan-ai-frontend
npm install
```

> **Production note:** The frontend is already pointed at the production backend URL. No changes needed to run against the live backend. If you want to test against a local backend instead, find the `const API = '...'` line at the top of both `Upload.jsx` and `Interview.jsx` and change it to `http://localhost:5000/api`. Both files need this change independently.

---

## Running the App

**Production** — the frontend and backend are already deployed. No local setup needed, just open the live frontend URL.

**Local development:**

```bash
# Terminal 1 — backend
cd DeccanAIBackend
nodemon server.js
# Runs on http://localhost:5000

# Terminal 2 — frontend
cd deccan-ai-frontend
npm run dev
# Runs on http://localhost:5173
```

Remember to update the `API` constant in `Upload.jsx` and `Interview.jsx` to point to `localhost:5000` when running locally.

---

## The Three Pages

### Page 1 — Upload

Two file drop zones side by side — Resume and Job Description. Drag and drop or click to upload. The Start Assessment button activates only when both files are present. On click, the documents are processed and questions are generated in the background with live status updates. The candidate moves to the interview automatically when ready.

### Page 2 — Interview

Opens with a screen showing the role title, number of questions, experience level, and initial resume match score. The interview itself is a split layout — question on the left, answer area on the right. A progress bar tracks completion at the top. After all main questions, a follow-up round may appear (1–3 questions max) before results are generated. The whole thing feels like a conversation, not a form.

### Page 3 — Results

The overall score (0–100) and verdict (Strong Hire / Hire / Maybe / No Hire) sit at the top alongside a written summary. Below that, every assessed skill has its own card showing score, level, verdict, evidence from the interview, and gap notes where applicable. The learning plan follows — each skill gap is a collapsible row revealing the target level, time estimate, resources with links and hour estimates, and a concrete practice project. Quick wins and final personalised advice close the page.

---

## API Reference

| Method | Route | Purpose | AI Calls |
|---|---|---|---|
| POST | `/api/process` | Upload files, extract text, analyze skills | 1 |
| POST | `/api/generate-questions` | Generate prioritized question bank | 1 |
| POST | `/api/chat` | Serve next question, collect answer | 0 |
| POST | `/api/chat/followup` | Serve follow-up questions | 0 |
| POST | `/api/evaluate` | Batch evaluate all answers + generate learning plan | 1–2 |

Full request/response shapes are documented in `API_DOCUMENTATION.md`.

---

## Design Decisions

**Why no AI during the interview?**
Evaluating each answer in real time burns quota (12+ calls vs 1), adds latency between every question, and is actually less accurate — the AI can't spot cross-answer inconsistencies if it only sees one answer at a time. Batch evaluation at the end is smarter on every dimension.

**Why a maximum of 3 follow-ups?**
More than 3 and the follow-up round stops feeling like clarification and starts feeling like a second interrogation. Only genuinely borderline scores on genuinely important skills qualify.

**Why no scores shown during the interview?**
Showing scores mid-interview changes candidate behaviour — people stop answering honestly and start trying to recover. The full picture is always revealed at the end.

**Why sessionStorage instead of a database?**
This is a single-session tool. The assessment data is only relevant during the current browser session. When the tab closes it's gone — the right default for sensitive candidate data with no auth layer.

**Why one merged `/process` route instead of separate upload and analyze routes?**
The frontend always needs both — there's never a case where you extract text but don't analyze it. Merging them means one loading state, one error to handle, and one fewer round trip.

---

## Known Limitations

- **Scanned PDFs** (image-based rather than text-based) will return empty or garbage text. Text-embedded PDFs only. OCR is not supported.
- **Very long documents** (over ~8,000 words) may produce less precise analysis. Standard 1–2 page resumes and 1-page JDs work best.
- **Gemini free tier quota** — 15 RPM, 1,500 RPD. Each assessment uses 5–6 calls. If you hit limits, create a fresh key under a new project at [aistudio.google.com](https://aistudio.google.com/app/apikey).
- **No authentication** — API endpoints are open. Not suitable for public production use without an auth layer.
- **No persistent storage** — results exist only in sessionStorage for the duration of the session.
- **Single candidate per session** — running two assessments simultaneously in the same browser will cause session data collisions.
