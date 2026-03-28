# Hulinks NMU – Replit Project Guide

## Overview

Hulinks NMU is an AI-powered student study platform built exclusively for Nelson Mandela University (NMU) students. It helps students generate quizzes and exam papers, predict likely exam topics, run full mock exams, get AI feedback on assignments, solve math/physics step-by-step, and upload their own study notes for AI-powered practice generation.

**Core Features:**
- **AI Quiz/Test/Exam Generator** – Three modes (Quick Quiz, Timed Test, Full Exam Paper) using OpenAI gpt-4o
- **AI Exam Predictor** – Analyzes study material to predict likely exam topics, key concepts, and study priorities
- **Mock Exam Generator** – Full 20-question simulated exam with 90-min countdown timer, MCQ + short + problem-solving questions, auto-scoring and weak-topic analysis
- **Exam History** – Stores all past mock exams and prediction results; tracks scores, weak topics, dates
- **Notes & QP Generator** – Two-tab page: (1) Drag-and-drop upload of student-created notes (PDF, TXT, MD); AI uses uploaded content to generate quizzes; (2) QP Generator — form to generate a complete NMU-style Question Paper + Marking Memo with optional file upload of learning outcomes
- **Study Buddy** – AI conversational tutor at `/study-buddy`; student describes what they're struggling with, AI explains step-by-step with examples; quick-reply buttons for follow-up; no auth required beyond login
- **Assignment Structure Assistant** – Students paste assignment text and receive AI feedback on structure, grammar, referencing, and plagiarism
- **Step-by-Step Calculator** – Multi-file upload (up to 10 files, images + PDF); GPT-4o Vision for image math; instruction prompt; animated progress bar; rich solution display
- **Voice Explainer** – Audio explanation of any topic; includes file upload zone to upload notes/images/PDFs and have them explained aloud
- **Presentation Analyzer** – AI feedback on presentation files; includes file upload zone
- **FileUploadZone component** – Reusable drag-and-drop upload zone (`client/src/components/FileUploadZone.tsx`); accepts any file type, up to 200 files at once, 50MB per file; calls `POST /api/extract-text`; available on Voice Explainer, Assignments, Exam Predictor, Presentation Analyzer, and Study Buddy pages
- **Freemium/Premium Tiers** – Free with 3-day trial for first 50 users; R29/month or R150/semester for unlimited access

**Target users:** NMU students authenticated via student number + password (no Replit account needed)

---

## User Preferences
Preferred communication style: Simple, everyday language.

---

## System Architecture

### Full-Stack Structure
- `client/` – React frontend (Vite + TypeScript)
- `server/` – Express.js backend (TypeScript, runs with `tsx`)
- `shared/` – Shared types, Drizzle schema, route definitions

### Frontend Architecture
- **Framework:** React 18 with TypeScript, bundled with Vite
- **Routing:** `wouter`
- **State/Data Fetching:** TanStack React Query v5
- **UI Components:** shadcn/ui (New York style) + Tailwind CSS
- **Animations:** Framer Motion
- **Theme:** NMU Navy (#001F54) + NMU Yellow (#FFC72C) — dark navy background, yellow primary

**Key pages:**
| Page | Path | Purpose |
|------|------|---------|
| Landing | `/` | Student number + password login/signup |
| Dashboard | `/dashboard` | Overview with 9 study tool cards |
| Quizzes | `/quizzes` | Generate quizzes/tests/exams |
| QuizSession | `/quizzes/:id` | Take a quiz/test with optional timer |
| Exam Predictor | `/exam-predictor` | AI exam topic prediction from study notes |
| Mock Exam | `/mock-exam` | Full 20Q timed mock exam with auto-scoring |
| Exam History | `/exam-history` | Past mock exams + predictions with scores |
| Study Uploads | `/study-uploads` | Two tabs: Notes upload (drag-and-drop) + QP Generator |
| Study Buddy | `/study-buddy` | AI conversational tutor — explain concepts, practice questions |
| Research Engine | `/research` | Search 240M+ real academic papers from OpenAlex; APA + Harvard citations |
| Assignments | `/assignments` | Submit text, get AI feedback; "Find Sources" button links to Research Engine |
| Calculator | `/calculator` | Step-by-step solver, multi-file upload + vision |
| Voice Explainer | `/voice-explainer` | Audio explanations of any topic |
| Presentation Analyzer | `/presentation-analyzer` | AI feedback on presentations |
| Premium | `/premium` | Upgrade plans (R29/mo, R150/semester) |

### Backend Architecture
- **Framework:** Express.js (TypeScript, ESM)
- **Entry point:** `server/index.ts` → `server/routes.ts`
- **Storage layer:** `server/storage.ts` — `DatabaseStorage` class implementing `IStorage`
- **Auth:** Custom student number + bcryptjs password auth; sessions stored in PostgreSQL
- **AI:** OpenAI gpt-4o via `AI_INTEGRATIONS_OPENAI_API_KEY`
- **File uploads:** multer (memory storage) + pdf-parse for PDF text extraction
- **Route protection:** `isAuthenticated` middleware on all `/api/*` routes

### Database Schema (PostgreSQL + Drizzle ORM)
All tables in `shared/schema.ts` and `shared/models/auth.ts`:

| Table | Purpose |
|-------|---------|
| `users` | Student accounts: studentNumber, name, course, passwordHash, tier, trialStartDate, trialEndDate, isPremium |
| `sessions` | Express session storage |
| `courses` | Available courses with module arrays |
| `quizzes` | Generated quizzes/tests/exams; JSONB questions; linked to user + course |
| `assignments` | Assignment text + AI feedback (JSONB) |
| `calculator_logs` | Math problems + step-by-step solutions (JSONB) |
| `exams` | Mock exams + predictions; questions/results/weakTopics stored; score as real |
| `student_uploads` | Student-uploaded notes: filename, extracted fileContent (text), module, topic, quizzesGenerated counter |

### Authentication (Custom — No Replit Account)
- Signup: POST /api/auth/signup — name, studentNumber, course, password (bcrypt 12 rounds)
- Login: POST /api/auth/login — studentNumber, password
- Session: `(req.session as any).userId`
- First 50 users get 3-day free trial (trialStartDate, trialEndDate, trialActive, trialDaysLeft returned on auth endpoints)
- `hasActiveAccess`: isPremium OR tier==="premium" OR trialEndDate > now

### Study Pack Upload System
- Backend: POST /api/uploads (multer memory storage, pdf-parse for PDFs, text stored in student_uploads.file_content)
- GET /api/uploads — list uploads
- DELETE /api/uploads/:id — remove
- AI quiz/exam generators fetch matching uploads for the chosen module and include extracted text as context
- Frontend: drag-and-drop zone, terms-of-use dialog on first upload (localStorage key: hulinks_terms_accepted)
- Files cannot be exported — content is read-only within the platform
- Upload counter `quizzes_generated` tracks how many AI tasks used each upload

### Content Protection
- CSS: `.protected-content` class applies `user-select: none`
- `@media print` blocks all printing with platform message
- Mock exam disables right-click and copy-paste via JS event listeners during exam phase

### Freemium/Premium Logic
- `tier`: "freemium" (default) or "premium"
- `isPremium`: boolean field
- Plans: Monthly R29/month, Semester R150
- First 50 users: automatic 3-day free trial with full access
- Upgrade: POST /api/auth/profile with {tier:"premium", isPremium:true} (MVP — no payment integration yet)

---

## PayFast Payments

PayFast is the payment gateway (South African, supports card, EFT, SnapScan, Zapper, Capitec Pay).

**How it works:**
1. Student clicks "Get Monthly — R29" or "Get Semester — R150" on `/premium`
2. Backend builds a signed PayFast payment object and returns the URL + params
3. Frontend submits a hidden form POST to PayFast's gateway
4. Student pays on PayFast (card, EFT, SnapScan, Zapper, Capitec)
5. PayFast sends an ITN (Instant Transaction Notification) to `/api/payments/payfast-notify` — signature is verified and user is upgraded
6. PayFast also redirects the student to `/payment-success` which calls `/api/payments/confirm` to upgrade immediately

**API endpoints:**
- `POST /api/payments/create-checkout` — returns `{url, params, sandbox}` for form POST to PayFast
- `POST /api/payments/payfast-notify` — ITN webhook (no auth, called by PayFast server)
- `POST /api/payments/confirm` — immediate upgrade on return URL

**Environment variables for production PayFast:**
| Variable | Description |
|----------|-------------|
| `PAYFAST_MERCHANT_ID` | From your PayFast merchant account |
| `PAYFAST_MERCHANT_KEY` | From your PayFast merchant account |
| `PAYFAST_PASSPHRASE` | Set in PayFast dashboard under Security |

**Without these set, the system uses PayFast sandbox credentials for testing:**
- Merchant ID: `10000100`
- Merchant Key: `46f0cd694581a`
- Sandbox URL: `https://sandbox.payfast.co.za/eng/process`

**To go live:**
1. Register at [payfast.co.za](https://www.payfast.co.za) and get a merchant account
2. Add `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE` as environment secrets
3. No code changes needed — production mode activates automatically

---

## Environment Variables
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session signing secret |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI base URL (Replit AI proxy) |

## Key NPM Packages
| Package | Role |
|---------|------|
| `drizzle-orm` + `drizzle-kit` | ORM and schema sync |
| `drizzle-zod` | Zod schemas from Drizzle tables |
| `@tanstack/react-query` | Client-side data fetching |
| `wouter` | Lightweight React router |
| `framer-motion` | Animations |
| `openai` | OpenAI SDK |
| `multer` | File upload handling |
| `pdf-parse` | PDF text extraction (CJS, use createRequire) |
| `bcryptjs` | Password hashing |
| `connect-pg-simple` | PostgreSQL session store |
| `shadcn/ui` (Radix UI) | UI component library |
| `tailwindcss` | Utility-first CSS |
| `zod` | Runtime validation |
