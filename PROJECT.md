# CronzPH Agency Management System

> A full-stack freelance agency management platform built with React, Firebase, and Vercel. Designed for Filipino freelance agencies to manage clients, projects, payments, bug reports, feature requests, contracts, and AI-assisted discovery — end to end.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Environment Variables](#environment-variables)
4. [Features Overview](#features-overview)
5. [User Roles](#user-roles)
6. [Complete Workflows](#complete-workflows)
   - [Client Inquiry & AI Assessment](#1-client-inquiry--ai-assessment)
   - [Proposal Generation & Acceptance](#2-proposal-generation--acceptance)
   - [Payment Flow](#3-payment-flow)
   - [Discovery & Project Planning](#4-discovery--project-planning)
   - [Contract Generation & Signing](#5-contract-generation--signing)
   - [Project Execution & Delivery](#6-project-execution--delivery)
   - [Bug Reporting & Tracking](#7-bug-reporting--tracking)
   - [Feature Requests](#8-feature-requests)
   - [Client Portal](#9-client-portal)
7. [Admin Panel](#admin-panel)
   - [Dashboard](#dashboard)
   - [Projects](#projects)
   - [Clients](#clients)
   - [Payments](#payments)
   - [Analytics](#analytics)
   - [Bug Reports](#bug-reports)
   - [Feature Requests (Admin)](#feature-requests-admin)
   - [Portfolio](#portfolio)
   - [Billing](#billing)
   - [Dev Dashboard](#dev-dashboard)
   - [Settings](#settings)
8. [AI Integration](#ai-integration)
9. [Firebase Collections](#firebase-collections)
10. [Routing Map](#routing-map)
11. [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TailwindCSS 3 |
| Backend / DB | Firebase Firestore, Firebase Auth |
| Serverless API | Vercel Edge Functions |
| AI / LLM | Groq (LLaMA 3.3-70B), Cerebras |
| Charts | Recharts |
| Routing | React Router DOM v7 |
| Deployment | Vercel (frontend + API), Firebase (Firestore rules) |
| Currency | Philippine Peso (PHP ₱) |

---

## Project Structure

```
/
├── api/
│   └── assess.js              # Vercel serverless: AI inquiry assessment
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── ai/
│   │   ├── bugRouter.js       # AI bug triage & routing
│   │   ├── callAI.js          # Unified AI caller with provider fallback
│   │   ├── cerebras.js        # Cerebras provider integration
│   │   ├── contract.js        # AI contract generation
│   │   ├── discovery.js       # AI discovery analysis & build framework
│   │   └── groq.js            # Groq provider integration
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminLayout.jsx  # Sidebar + top nav layout for admin
│   │   └── shared/
│   │       ├── ConfirmModal.jsx # Reusable confirmation dialog
│   │       ├── ProtectedRoute.jsx # Firebase auth guard
│   │       ├── StatusBadge.jsx  # Color-coded project status pill
│   │       └── Toast.jsx        # Global toast notification system
│   ├── firebase/
│   │   ├── config.js          # Firebase app init (db, auth)
│   │   ├── firestore.js       # CRUD helpers for clients, projects, payments
│   │   └── adminUsers.js      # Admin user management
│   ├── pages/
│   │   ├── admin/             # All admin-only pages (protected)
│   │   └── public/            # All client-facing public pages
│   └── utils/
│       ├── notifications.js   # Notification creation & management
│       ├── proposalGenerator.js # Proposal document generator
│       └── settings.js        # Agency settings helpers
├── .env.example
├── firebase.json
├── firestore.rules
├── vercel.json
└── vite.config.js
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# AI Providers
VITE_GROQ_API_KEY=           # Groq LLaMA 3.3-70B
VITE_CEREBRAS_API_KEY=       # Cerebras (fallback AI)
```

---

## Features Overview

### Public / Client-Facing
- 🏠 **Landing Page** — Agency homepage with services, hero, CTA
- 📝 **Inquiry Form** — Clients submit project inquiries (AI-assessed instantly)
- 📄 **Proposal Page** — View AI-generated project proposal with pricing breakdown
- 💳 **Payment Page** — Submit down payment with proof-of-payment upload
- 🔍 **Discovery Form** — Detailed requirements gathering for active projects
- 📃 **Contract Page** — View and digitally sign project contract
- 🐛 **Bug Report** — Submit bugs with AI-powered severity analysis
- ✨ **Feature Request** — Submit new feature requests with AI prioritization
- 📦 **Delivery Page** — View and accept final project delivery
- 🔐 **Client Portal** — Email-based login to track all project progress

### Admin
- 📊 **Dashboard** — Revenue, active projects, SaaS MRR, recent activity, charts
- 👥 **Clients** — Full client list with project history
- 🗂️ **Projects** — Pipeline view, status management, project actions
- 💰 **Payments** — Review & confirm submitted payments
- 📈 **Analytics** — Revenue trends, conversion pipeline, bug stats, MRR growth
- 🐞 **Bug Reports** — Global bug list with AI analysis & status tracking
- ✨ **Feature Requests** — Review and manage client feature requests
- 🏆 **Portfolio** — Manage public-facing case studies
- 🧾 **Billing** — SaaS subscription billing management
- 🛠️ **Dev Dashboard** — Developer build progress and task tracker
- ⚙️ **Settings** — Agency info, payment methods configuration

---

## User Roles

| Role | Access | Auth Method |
|---|---|---|
| **Admin / Agency Owner** | Full admin panel | Firebase Email/Password |
| **Client** | Client portal (read-only project view) | Email lookup (no password) |
| **Developer** | Dev Dashboard (build progress) | Firebase Auth (admin account) |

---

## Complete Workflows

### 1. Client Inquiry & AI Assessment

**Route:** `GET /inquiry`

**Actor:** Prospective client (public)

**Steps:**
1. Client visits the **Landing Page** (`/`) and clicks "Start a Project" or "Get a Quote".
2. Client fills out the **Inquiry Form** (`/inquiry`) with:
   - Full name, email, business name
   - Services needed (Website, Booking System, Inventory, Client Portal, etc.)
   - Budget range
   - Project timeline preference
   - Additional notes
3. On submission, the form calls the **Vercel serverless function** (`/api/assess`).
4. The API sends the inquiry data to **Groq LLaMA 3.3-70B** with a structured prompt that includes:
   - Philippine market pricing tiers (Starter → Enterprise)
   - Technology stack recommendations (React + Firebase + Vercel)
   - Complexity scoring rules
5. AI returns a JSON assessment with:
   - `projectType` — classified project category
   - `complexity` — simple / medium / complex
   - `estimatedDays` — working days estimate
   - `suggestedPrice` — one-time project price (PHP)
   - `downPayment` — 50% of suggested price
   - `finalPayment` — remaining 50%
   - `monthlySassPrice` — optional SaaS subscription fee
   - `sassTier` — starter / growth / business / enterprise
   - `techStack` — recommended technologies
   - `features` — list of suggested features
   - `notes` — AI reasoning
6. The project is saved to Firestore `projects` collection with status `assessed`.
7. A notification is created in Firestore `notifications` collection.
8. Client is redirected to their **Proposal page** (`/proposal/:id`).

**Firestore Status After:** `assessed`

---

### 2. Proposal Generation & Acceptance

**Route:** `GET /proposal/:id`

**Actor:** Client (public, uses project ID)

**Steps:**
1. Client receives a link to `/proposal/:id` (shared by admin or auto-redirected).
2. The Proposal page fetches the project from Firestore and loads:
   - AI assessment data (pricing, timeline, complexity)
   - Agency branding (name, email from Settings)
   - Payment method options
3. The `proposalGenerator.js` utility builds the full proposal document with:
   - Investment summary (down payment + final payment breakdown)
   - Pricing breakdown by module
   - Timeline with milestones
   - Scope of work by category (with emojis)
   - Out-of-scope items
   - Revision policy (typically 2–3 rounds)
   - Bug policy (critical vs minor with time windows)
   - Assumptions and terms & conditions
4. Client reviews the proposal. They can optionally choose **SaaS subscription** vs **one-time payment**.
5. Client clicks **"Accept Proposal"** → project status updated to `proposal_accepted`.
6. Admin is notified via Firestore notification.
7. Client is redirected to the **Payment page** (`/payment/:id`).

**Firestore Status After:** `proposal_accepted` → `awaiting_payment`

---

### 3. Payment Flow

**Route:** `GET /payment/:id`

**Actor:** Client (public)

**Steps:**
1. Client visits the Payment page and sees:
   - Amount due (down payment)
   - Active payment methods (GCash, Maya, CIMB, etc. — configured by admin in Settings)
   - Account numbers and account names for each active method
2. Client transfers the down payment via their preferred method.
3. Client uploads **proof of payment** (screenshot) and submits.
4. A new document is created in Firestore `payments` collection with status `pending`.
5. Project status is updated to `payment_submitted`.
6. Admin receives a notification.
7. **Admin reviews** the payment in the Payments admin page:
   - Views uploaded proof
   - Clicks "Confirm Payment"
   - Payment status → `confirmed`
   - Project status → `in_progress` (or `planning`)
8. Client is notified of confirmation on their portal.

**Firestore Collections:** `payments` (linked to project via `projectId`)

**Firestore Status After:** `payment_submitted` → `in_progress`

---

### 4. Discovery & Project Planning

**Route:** `GET /discovery/:id`

**Actor:** Client (public, link sent by admin)

**Steps:**
1. Admin sends the discovery link to the client after payment is confirmed.
2. Client fills out the **Discovery Form** (`/discovery/:id`) — a multi-section requirements form:
   - **Business Process:** Current workflow, tools used, pain points
   - **Workflow Steps:** Step-by-step process mapping
   - **Roles & Tasks:** Who does what in the organization
   - **Approval Flows:** Whether approvals are needed and how they work
   - **Technical Requirements:** User roles, device preferences, internet availability, data volume
   - **Feature Priorities:** Rating each feature (must-have / nice-to-have)
   - **Additional Features:** Free-text additional requirements
3. On submission, `analyzeDiscovery()` from `src/ai/discovery.js` is called.
4. AI (via `callAI.js` with Cerebras/Groq fallback) generates a **Build Framework** JSON:
   - `processMapping` — current vs proposed digital workflow
   - `features.mustHave` — prioritized features with complexity
   - `features.niceToHave` — optional enhancements
   - `firestoreSchema` — exact Firestore collections and fields
   - `userRoles` — role definitions with permissions
   - `buildPhases` — phased development plan with estimated days
   - `kiloCodePrompts` — ready-to-use developer prompts with file paths and component names
5. Discovery data + AI framework saved to Firestore under the project document.
6. Project status → `planning`.
7. Admin views the full Discovery analysis in **Admin → Project → Discovery** (`/admin/projects/:id/discovery`).
8. Admin uses the `kiloCodePrompts` to guide development via Kilo Code AI IDE.

**Firestore Status After:** `planning`

**AI Output includes:** Exact React component names, Firestore collection schemas, TailwindCSS styling notes.

---

### 5. Contract Generation & Signing

**Route:** `GET /contract/:id`

**Actor:** Client (public, link sent by admin)

**Steps:**
1. Admin generates the contract from the project view in admin panel.
2. `src/ai/contract.js` auto-generates a formal contract using AI with:
   - Contract ID: `CONTRACT-YYYYMMDD-XXXX`
   - Developer: CronzPH (agency details from Settings)
   - Client: name, business, email from project
   - Scope of work from AI assessment + discovery
   - Deliverables list
   - Timeline (working days from AI assessment)
   - Payment terms: 50% down / 50% final
   - SaaS subscription terms (if applicable)
   - 30-day warranty on bug fixes
   - Philippine law governance clause
   - Revision policy
3. Client visits `/contract/:id` and reads the full contract.
4. Client clicks **"I Agree & Sign"** — their name and timestamp are recorded.
5. Contract signed status saved to Firestore under the project.
6. Project status → `building`.
7. Admin can view the signed contract at `/admin/projects/:id/contract`.

**Firestore Status After:** `building`

---

### 6. Project Execution & Delivery

**Route:** `GET /delivery/:id`

**Actor:** Client (public)

**Admin Routes:** `/admin/projects/:id/plan`, `/admin/dev-dashboard`

**Steps:**
1. During the `building` phase, the admin tracks tasks in the **Dev Dashboard** (`/admin/dev-dashboard`).
2. The **Project Plan** page (`/admin/projects/:id/plan`) shows the AI-generated build phases and tasks from the discovery analysis.
3. Admin updates task statuses as development progresses.
4. When the project is complete, admin clicks **"Mark as Delivered"** → project status → `delivered`.
5. Client receives a link to the **Delivery page** (`/delivery/:id`) which shows:
   - Project summary
   - Deliverables
   - Live URL / credentials
   - Final payment request
6. Client reviews and accepts the delivery.
7. Client submits the **final payment** (50% remaining).
8. After admin confirms final payment → project status → `completed`.

**Firestore Status After:** `delivered` → `completed`

---

### 7. Bug Reporting & Tracking

**Route:** `GET /bug-report/:id`

**Actor:** Client (public, project-specific link)

**Admin Routes:** `/admin/bugs`, `/admin/projects/:id/bugs`

**Steps:**
1. Client visits `/bug-report/:id` (project-specific link).
2. Client fills out the Bug Report form:
   - Bug title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Severity self-assessment (low / medium / high)
   - Screenshot upload (optional)
3. `src/ai/bugRouter.js` analyzes the report using AI:
   - Classifies severity: `minor` / `medium` / `major` / `critical`
   - Generates fix suggestions
   - Estimates resolution time
   - Determines if the bug is in-scope (covered by warranty)
4. Bug report saved to Firestore subcollection `projects/{id}/bugReports` with status `analyzed`.
5. Admin reviews bugs in:
   - **All Bugs** (`/admin/bugs`) — global view across all projects
   - **Project Bugs** (`/admin/projects/:id/bugs`) — per-project view
6. Admin updates bug status through lifecycle:
   - `submitted` → `analyzing` → `analyzed` → `fixed` → `closed`
7. Client can see bug status updates on their **Client Portal**.

**AI Output includes:** Severity rating, fix suggestions, estimated hours, warranty coverage determination.

---

### 8. Feature Requests

**Route:** `GET /feature-request/:id`

**Actor:** Client (public, project-specific link)

**Admin Route:** `/admin/feature-requests`

**Steps:**
1. Client visits `/feature-request/:id`.
2. Client submits a feature request with:
   - Feature title and description
   - Business justification
   - Priority preference (nice-to-have / important / critical)
3. AI analyzes the request and returns:
   - Implementation complexity estimate
   - Suggested additional cost (if out of scope)
   - Development time estimate
   - Whether it fits within existing contract scope
4. Feature request saved to Firestore under the project.
5. Admin reviews all feature requests in `/admin/feature-requests`.
6. Admin can approve, quote, or decline the request.
7. If approved and paid, a new milestone is added to the project plan.

---

### 9. Client Portal

**Routes:** `GET /portal/login`, `GET /portal`

**Actor:** Client (email-based auth — no password required)

**Steps:**
1. Client visits `/portal/login`.
2. Client enters the email used during inquiry.
3. System queries Firestore `projects` collection for matching email.
4. If found, client email + project list stored in `localStorage`.
5. Client is redirected to `/portal` — the main portal dashboard.
6. Portal shows all projects associated with the email:
   - Project name, status badge, timeline
   - Current stage in the workflow
   - Links to: Proposal, Payment, Discovery, Contract, Delivery, Bug Report, Feature Request
7. Client can track their project progress without a password.

---

## Admin Panel

### Dashboard

**Route:** `/admin`

Real-time stats powered by Firestore `onSnapshot` listeners:

| Widget | Description |
|---|---|
| Total Revenue | Sum of all confirmed payments (PHP) |
| Active Projects | Projects in `in_progress`, `planning`, `building`, `for_review` |
| Total Clients | Unique client emails across all projects |
| Pending Actions | Unconfirmed payments + unassessed proposals |
| Projects by Status | Interactive pie chart (Recharts) |
| Monthly Revenue | 6-month bar chart (Recharts) |
| Recent Activity | Timeline of proposals sent, payments, builds started, deliveries |
| SaaS Subscribers | List of SaaS clients with tier and monthly fee; Total MRR displayed |

---

### Projects

**Route:** `/admin/projects`

Full project pipeline management:
- List all projects sorted by creation date
- Filter by status, search by client name / business
- View project details: AI assessment, pricing, timeline, services
- **Status Actions:** Move projects through statuses (assess → proposal → payment → build → deliver)
- **Quick Links** per project:
  - 📋 View Plan (`/admin/projects/:id/plan`)
  - 🔍 View Discovery (`/admin/projects/:id/discovery`)
  - 📃 View Contract (`/admin/projects/:id/contract`)
  - 🐛 View Bugs (`/admin/projects/:id/bugs`)
- Send proposal link, discovery link, contract link, delivery link to client
- Delete project

---

### Clients

**Route:** `/admin/clients`

- Aggregated view of all unique clients (by email)
- Shows number of projects per client
- Project history with statuses
- Quick access to each project

---

### Payments

**Route:** `/admin/payments`

- List all submitted payments (pending + confirmed)
- View proof of payment uploaded by client
- **Confirm Payment** → updates payment status to `confirmed` and project status accordingly
- Filter by status (pending / confirmed)
- Payment details: amount, payment method, client name, project

---

### Analytics

**Route:** `/admin/analytics`

Filterable by date range: 30 days / 90 days / 6 months / 12 months / All time

| Chart | Description |
|---|---|
| Summary Cards | Total Revenue, Avg Project Value, Bug Reports, Conversion Rate, SaaS MRR |
| Revenue Trend | Line chart of monthly confirmed revenue |
| Conversion Pipeline | Horizontal bar chart: Inquiry → Assessed → Proposal → Accepted → Paid → Delivered |
| Client Acquisition | Area chart of new clients per month |
| Avg Project Value by Type | Bar chart comparing average pricing per project category |
| SaaS MRR Growth | Line chart of monthly recurring revenue growth |
| Bug Reports by Severity | Bar chart: Minor / Medium / Major / Critical |
| Bug Status Breakdown | Bar chart: Submitted / Analyzing / Analyzed / Fixed / Closed |

---

### Bug Reports

**Route:** `/admin/bugs`

- Global view of all bug reports across all projects
- AI severity classification visible for each bug
- Status management: `submitted` → `analyzing` → `analyzed` → `fixed` → `closed`
- Filter by severity and status
- Link to the specific project

---

### Feature Requests (Admin)

**Route:** `/admin/feature-requests`

- List all feature requests across all projects
- AI complexity and cost estimate visible
- Admin can approve / decline / quote additional cost
- Status tracking

---

### Portfolio

**Route:** `/admin/portfolio`

- Manage public-facing case studies / portfolio items
- Add projects to portfolio with:
  - Project title, description, tech stack used
  - Client industry, results/outcomes
  - Screenshots / links
- Portfolio items can be shown on the public Landing page

---

### Billing

**Route:** `/admin/billing`

- SaaS subscription management
- View all active SaaS clients with their tier (Starter / Growth / Business / Enterprise)
- Monthly billing amounts per client
- Billing cycle tracking
- Total MRR summary

SaaS Pricing Tiers (PHP/month):
| Tier | Price |
|---|---|
| Starter | ₱2,750 |
| Growth | ₱6,500 |
| Business | ₱20,000 |
| Enterprise | ₱40,000 |

---

### Dev Dashboard

**Route:** `/admin/dev-dashboard`

- Overview of all projects currently in active development
- Build phase progress tracking (from AI-generated discovery framework)
- Task completion per phase
- Developer notes
- Links to Kilo Code prompts for each build step

---

### Settings

**Route:** `/admin/settings`

Configure agency-wide settings stored in Firestore `settings` collection:

**Agency Information:**
- Agency Name (default: CronzPH)
- Agency Email
- Agency Facebook Page URL

**Payment Methods** (shown to clients on payment page):
- Supported: GCash, Maya, CIMB, Maribank, Coins.ph, Others (custom label)
- Per method: Account Number, Account Name
- Toggle each method active/inactive
- Add / delete payment methods

Changes saved to Firestore `settings/general` and `settings/paymentMethods`.

---

## AI Integration

The system uses a **multi-provider AI architecture** with automatic fallback:

### Provider Priority
1. **Cerebras** (primary, fast inference)
2. **Groq LLaMA 3.3-70B** (fallback)

### `callAI.js` — Unified AI Caller
- `callAIJson(prompt, options)` — returns parsed JSON from AI
- `callAIText(prompt, options)` — returns raw text
- Automatic retry and fallback between providers
- Error handling with meaningful messages

### AI Features

| Feature | File | Description |
|---|---|---|
| Inquiry Assessment | `api/assess.js` | Analyzes client inquiry, generates pricing & timeline |
| Proposal Generation | `src/utils/proposalGenerator.js` | Builds formatted proposal document from AI assessment |
| Discovery Analysis | `src/ai/discovery.js` | Analyzes discovery form → generates build framework + Kilo Code prompts |
| Contract Generation | `src/ai/contract.js` | Generates formal legal contract (Philippine law) |
| Bug Triage | `src/ai/bugRouter.js` | Analyzes bug reports → severity, fix suggestions, warranty coverage |
| Feature Analysis | (inline in FeatureRequest page) | Estimates complexity and cost of new features |

### Pricing Logic (PHP — Philippine Market)
- **Simple projects:** ₱5,000 – ₱15,000
- **Medium projects:** ₱15,000 – ₱50,000
- **Complex projects:** ₱50,000 – ₱150,000+
- **Enterprise:** ₱150,000+
- All projects use **50/50 payment split** (down payment + final payment)
- SaaS subscription available as alternative to one-time payment

---

## Firebase Collections

```
firestore/
├── projects/                    # Main project documents
│   ├── {projectId}
│   │   ├── clientName, email, businessName
│   │   ├── servicesNeeded[]
│   │   ├── budgetRange
│   │   ├── status                # See status lifecycle below
│   │   ├── aiAssessment{}        # Groq AI output
│   │   ├── discoveryData{}       # Discovery form responses
│   │   ├── aiDiscovery{}         # AI build framework
│   │   ├── contract{}            # Generated contract + signature
│   │   ├── paymentPreference     # 'one-time' | 'saas'
│   │   ├── saasTier              # 'starter'|'growth'|'business'|'enterprise'
│   │   ├── proposalAcceptedAt
│   │   ├── createdAt
│   │   └── bugReports/           # Subcollection
│   │       └── {bugId}
│   │           ├── title, description, stepsToReproduce
│   │           ├── severity (self-reported)
│   │           ├── aiAnalysis{}  # AI triage output
│   │           ├── status        # submitted|analyzing|analyzed|fixed|closed
│   │           └── createdAt
│
├── payments/                    # Payment records
│   └── {paymentId}
│       ├── projectId, clientName
│       ├── amount, paymentMethod
│       ├── proofUrl              # Uploaded screenshot
│       ├── status                # pending | confirmed
│       ├── type                  # down_payment | final_payment
│       ├── confirmedAt
│       └── createdAt
│
├── adminUsers/                  # Admin accounts
│   └── {uid}
│       ├── username, email
│       └── role
│
├── notifications/               # In-app notifications
│   └── {notifId}
│       ├── type                  # new_inquiry | payment_submitted | etc.
│       ├── message, link
│       ├── read (boolean)
│       └── createdAt
│
└── settings/                    # Agency configuration
    ├── general
    │   ├── agencyName, agencyEmail, agencyFbPage
    └── paymentMethods
        └── methods[]
```

### Project Status Lifecycle

```
inquiry
  └─► assessed           (AI assessment complete)
        └─► proposal_sent
              └─► proposal_accepted
                    └─► awaiting_payment
                          └─► payment_submitted
                                └─► in_progress
                                      ├─► planning
                                      ├─► building
                                      ├─► for_review
                                      └─► delivered
                                            └─► completed
                                            
cancelled  (can occur at any stage)
```

---

## Routing Map

### Public Routes

| Path | Page | Description |
|---|---|---|
| `/` | Landing | Agency homepage |
| `/inquiry` | Inquiry | New project inquiry form |
| `/proposal/:id` | Proposal | View AI-generated proposal |
| `/payment/:id` | Payment | Submit down/final payment |
| `/delivery/:id` | Delivery | View & accept project delivery |
| `/discovery/:id` | Discovery | Requirements discovery form |
| `/contract/:id` | Contract | View & sign project contract |
| `/bug-report/:id` | BugReport | Submit a bug report |
| `/feature-request/:id` | FeatureRequest | Submit a feature request |
| `/portal/login` | ClientLogin | Email-based client login |
| `/portal` | ClientPortal | Client project dashboard |

### Admin Routes (Protected — Firebase Auth Required)

| Path | Page | Description |
|---|---|---|
| `/admin/login` | Login | Admin email/password login |
| `/admin/seed` | SeedAdmin | One-time admin account setup |
| `/admin` | Dashboard | Main admin dashboard |
| `/admin/clients` | Clients | Client management |
| `/admin/projects` | Projects | Project pipeline |
| `/admin/projects/:id/plan` | ProjectPlan | AI-generated build plan |
| `/admin/projects/:id/discovery` | DiscoveryView | Discovery analysis viewer |
| `/admin/projects/:id/contract` | ContractView | Contract viewer |
| `/admin/projects/:id/bugs` | ProjectBugs | Per-project bug tracker |
| `/admin/bugs` | BugReports | All bugs across projects |
| `/admin/feature-requests` | FeatureRequests | All feature requests |
| `/admin/payments` | Payments | Payment review & confirmation |
| `/admin/analytics` | Analytics | Business analytics |
| `/admin/portfolio` | Portfolio | Portfolio management |
| `/admin/billing` | Billing | SaaS billing management |
| `/admin/dev-dashboard` | DevDashboard | Developer build tracker |
| `/admin/settings` | Settings | Agency settings |
| `/admin/change-password` | ChangePassword | Admin password change |

---

## Deployment

### Prerequisites
- Node.js 18+
- Firebase project (Firestore + Auth enabled)
- Vercel account
- Groq API key (get free at console.groq.com)
- Cerebras API key (optional, for fallback)

### Local Development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your keys
npm run dev
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add all environment variables in Vercel Dashboard → Project → Settings → Environment Variables.

### Firebase Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and deploy Firestore rules
firebase login
firebase deploy --only firestore:rules
```

### First Admin Account

1. Deploy the app
2. Visit `/admin/seed`
3. Create the first admin account (username + email + password)
4. This route should be disabled after initial setup

### Vercel Configuration (`vercel.json`)

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The first rule routes `/api/*` to Vercel serverless functions. The second rule enables React Router SPA navigation.

---

## Shared Components

| Component | Description |
|---|---|
| `AdminLayout` | Sidebar navigation + top bar for all admin pages. Includes: nav links, user info, logout |
| `ProtectedRoute` | Wraps admin routes; redirects to `/admin/login` if not authenticated via Firebase Auth |
| `StatusBadge` | Color-coded pill showing project status (e.g., 🟢 completed, 🟡 payment_submitted) |
| `Toast` | Global toast notification system using React Context. Call `useToast()` hook anywhere |
| `ConfirmModal` | Reusable confirmation dialog for destructive actions |

---

## Notification Events

The `notifications.js` utility creates Firestore notification documents for these events:

| Event | Trigger |
|---|---|
| `new_inquiry` | Client submits an inquiry |
| `proposal_accepted` | Client accepts a proposal |
| `payment_submitted` | Client submits payment proof |
| `payment_confirmed` | Admin confirms payment |
| `project_delivered` | Admin marks project as delivered |
| `discovery_completed` | Client submits discovery form |
| `contract_signed` | Client signs the contract |
| `bug_report` | Client submits a bug report |

---

*Built with ❤️ by CronzPH — A Filipino Freelance Agency Management Platform*
