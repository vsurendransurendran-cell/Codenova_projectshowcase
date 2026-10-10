# CampusCraft — Student Project Showcase

[![CI / Tests](https://img.shields.io/badge/tests-12%20passed-emerald)](./tests)
[![Security](https://img.shields.io/badge/security-SSRF%20protected-indigo)](./src/server/urlValidator.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](./tsconfig.json)

**CampusCraft** is a production-grade, moderated web application designed for universities, colleges, and engineering academies to showcase student capstone builds, research prototypes, and open-source software. Students submit projects with verified code and demo links, faculty administrators moderate submissions through a secure portal, and only approved work is published to the public gallery.

---

## 🌟 Key Features

1. **Public Project Gallery**
   - Responsive multi-column card grid with clean unboxed metadata.
   - Enforced database filtering: only `APPROVED` projects are returned in queries (`where: { status: 'APPROVED' }`).
   - Debounced (300ms) reactive search across titles, author names, descriptions, and tags.
   - Multi-select technology tag filtering with live project counts.
   - Deep-linking and URL sync (`?q=&tags=`) for instant bookmarking and sharing.

2. **Public Submission Engine**
   - Character limits with live character counters (Title: 80, Student Name: 60, Description: 20–1000).
   - Type-ahead multi-select technology tags (max 6 chips, normalized lowercase).
   - Anti-bot honeypot field (`company_website`).
   - IP rate-limiting (5 submissions/hour/IP).
   - Automatic generation of a private 32-byte cryptographic token (`/status/[token]`) so students can monitor review progress without creating an account.
   - Initial status is always `PENDING` on creation regardless of client input.

3. **Strict URL & SSRF Validation**
   - **GitHub Validation:** Strict regex matching (`https://github.com/:owner/:repo`) and public API existence check.
   - **Live Demo Validation:** Strict HTTPS protocol requirement, HTTP status check (`< 400`), 5-second timeout, and max 3 redirects.
   - **SSRF Hardening:** Pre-flight DNS resolution blocking loopback (`127.x`, `::1`), private networks (`10.x`, `172.16-31.x`, `192.168.x`), and cloud metadata (`169.254.169.254`).

4. **Moderator Portal (`/admin`)**
   - Secure login with bcrypt password hashing and constant-time comparison to prevent user enumeration.
   - Session authentication via `httpOnly`, `SameSite=Lax` cookies.
   - 5 failed login attempts per 15-minute lockout window per IP.
   - Real-time tab queues: **Pending**, **Approved**, **Rejected**, and **Audit Trail**.
   - Review Drawer with live URL health inspector to re-verify links at moderation time.
   - Mandatory rejection reason input for declined submissions.
   - Bulk approval, rejection, and deletion tools.
   - Full immutable audit log (`AdminAction`) tracking reviewer ID, target project, action, and timestamp.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client Browser
        UI[React 19 SPA + Tailwind CSS]
        Form[Submission Form /submit]
        Gallery[Public Gallery /]
        Status[Status Tracker /status/:token]
        AdminUI[Moderator Portal /admin]
    end

    subgraph Express API Layer
        Router[Router & Middleware]
        RateLimit[Rate Limiter & IP Privacy Hash]
        AuthCheck[Auth Session Guard]
        SSRF[URL & SSRF Validator]
    end

    subgraph Database
        DB[(PostgreSQL / SQLite Database)]
        ProjectsTable[(projects)]
        UsersTable[(users)]
        TagsTable[(tags / project_tags)]
        AuditTable[(admin_actions)]
    end

    Form -->|POST /api/projects| Router
    Router --> RateLimit
    RateLimit --> SSRF
    SSRF -->|1. DNS Lookup & IP Range Check\n2. GitHub API\n3. Demo HEAD| Router
    SSRF -->|On Success: Insert PENDING| ProjectsTable

    Gallery -->|GET /api/projects?q=&tags=| Router
    Router -->|SELECT WHERE status = 'APPROVED'| ProjectsTable

    Status -->|GET /api/status/:token| Router
    Router -->|SELECT by trackingToken| ProjectsTable

    AdminUI -->|POST /api/admin/login| Router
    Router --> AuthCheck
    AdminUI -->|PATCH /api/admin/projects/:id| Router
    Router -->|UPDATE status + INSERT audit| ProjectsTable
    Router --> AuditTable
```

---

## 📁 Directory Structure

```
├── .env.example              # Environment variables template
├── docs/
│   └── WALKTHROUGH.md        # Step-by-step evaluation guide & demo script
├── prisma/
│   ├── schema.prisma         # Production PostgreSQL / Prisma data model
│   └── seed.ts               # Database seeder entry point
├── src/
│   ├── components/
│   │   ├── AdminDashboard.tsx# Moderation queue, drawer, bulk tools & audit
│   │   ├── AdminLogin.tsx    # Admin login form with rate-limit alerts
│   │   ├── Footer.tsx        # Academic showcase footer
│   │   ├── Guidelines.tsx    # Project criteria and submission standards
│   │   ├── Navbar.tsx        # Sticky nav, theme switcher & submit CTA
│   │   ├── ProjectCard.tsx   # Gallery card with unboxed metadata
│   │   ├── ProjectModal.tsx  # Full project details dialog
│   │   ├── StatusTracker.tsx # Private token status checker
│   │   ├── SubmissionForm.tsx# Multi-field form with live link inspector
│   │   └── TagFilter.tsx     # Filter chips with count badges
│   ├── lib/
│   │   ├── api.ts            # Type-safe API client
│   │   └── theme.ts          # Dark/light theme state
│   ├── server/
│   │   ├── auth.ts           # HMAC session signing, cookies & rate limits
│   │   ├── db.ts             # Database access layer & prepared statements
│   │   ├── routes.ts         # Public and administrative Express API endpoints
│   │   ├── seed.ts           # Seeder (1 admin, 12 projects, 10+ tags)
│   │   └── urlValidator.ts   # SSRF defense, DNS resolution & HTTP checks
│   ├── shared/
│   │   └── schema.ts         # Shared Zod schemas (client & server)
│   ├── types.ts              # Frontend TypeScript interfaces
│   ├── App.tsx               # Main application controller
│   └── main.tsx              # DOM root mount
├── tests/
│   ├── auth.test.ts          # Session security & rate limiting unit tests
│   ├── queries.test.ts       # Database lifecycle & approved-only feed tests
│   ├── urlValidator.test.ts  # SSRF protection & GitHub repo validation tests
│   └── e2e.spec.ts           # Playwright end-to-end user-to-admin test spec
├── server.ts                 # Full-stack server entry point (Express + Vite)
├── vitest.config.ts          # Vitest test runner configuration
└── package.json              # Project dependencies and npm scripts
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+ (tested on Node 20 & 22)
- npm or bun

### Step 1: Clone & Install Dependencies
```bash
git clone <repository-url> campuscraft
cd campuscraft
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default testing variables are pre-configured:
```env
ADMIN_EMAIL="admin@campuscraft.edu"
ADMIN_PASSWORD="AdminPass123!"
SESSION_SECRET="your-32-character-random-session-secret-key-goes-here"
IP_SALT="your-privacy-ip-salt-key"
```

### Step 3: Initialize Database & Seed Sample Projects
Runs the database setup script to create tables and seed 1 admin user, 12 projects across `APPROVED`, `PENDING`, and `REJECTED` states, and 10+ tags:
```bash
npm run db:setup
```

### Step 4: Run the Development Server
```bash
npm run dev
```
The application will be live at `http://localhost:3000`.

---

## 🧪 Testing

Run the test suite using Vitest:
```bash
npm test
```
The test suite covers:
- **SSRF Protection:** Loopback (`127.0.0.1`), private IPv4 (`10.x`, `172.16.x`, `192.168.x`), AWS/GCP metadata (`169.254.169.254`), and IPv6 (`::1`, `fc00::`).
- **GitHub URL Verification:** Regex parsing and live public repo checks.
- **Approved-Only Filtering:** Verifies that unapproved projects are excluded from database queries until explicitly moderated.
- **Session & Auth Security:** Token tampering rejection and IP lockout after 5 failed attempts.

---

## 📡 API Reference Table

All responses adhere to the consistent JSON envelope `{ data, error: { code, message, fields? } }`.

| Method | Endpoint | Auth Required | Request Body / Query | Success Response | Description |
|:---|:---|:---|:---|:---|:---|
| `GET` | `/api/projects` | None | `?q=&tags=&page=&limit=` | `200` `{ projects, total, page, totalPages }` | Returns approved projects only |
| `GET` | `/api/tags` | None | None | `200` `[{ id, name, count }]` | Tags used in approved projects |
| `POST` | `/api/validate-links` | None | `{ githubUrl, liveUrl }` | `200` `{ github: {...}, live: {...} }` | Pre-checks URLs before submit |
| `POST` | `/api/projects` | None | `{ title, studentName, description, tags, githubUrl, liveUrl, honeypot }` | `201` `{ id, trackingToken, trackingUrl }` | Submits project (enters PENDING) |
| `GET` | `/api/status/:token` | None | Path parameter: `token` | `200` `{ id, title, status, rejectionReason, ... }` | Returns private submission status |
| `POST` | `/api/admin/login` | None | `{ email, password }` | `200` `{ user: { id, email, role }, token }` | Authenticates admin (sets cookie) |
| `POST` | `/api/admin/logout` | Admin | None | `200` `{ message }` | Clears admin session cookie |
| `GET` | `/api/admin/me` | Admin | Cookie / Bearer | `200` `{ user }` | Validates session |
| `GET` | `/api/admin/stats` | Admin | None | `200` `{ PENDING, APPROVED, REJECTED, TOTAL }` | Moderation queue counts |
| `GET` | `/api/admin/projects` | Admin | `?status=&q=&page=&limit=` | `200` `{ projects, total, page, totalPages }` | Lists all projects across statuses |
| `PATCH` | `/api/admin/projects/:id` | Admin | `{ status, rejectionReason?, note? }` | `200` `{ success, id, status }` | Approves or rejects project |
| `DELETE`| `/api/admin/projects/:id` | Admin | `{ note? }` | `200` `{ success, id }` | Permanently deletes project |
| `POST` | `/api/admin/projects/bulk`| Admin | `{ projectIds, action, rejectionReason? }` | `200` `{ count, items }` | Bulk approves, rejects, or deletes |
| `GET` | `/api/admin/audit-logs` | Admin | None | `200` `[{ id, adminEmail, action, ... }]` | Returns chronological audit log |
| `POST` | `/api/admin/recheck-links/:id`| Admin | Path parameter: `id` | `200` `{ github, live }` | Live re-tests URLs in drawer |

---

## 🔒 Security Hardening

- **SSRF Defense:** All user-supplied URLs undergo asynchronous DNS resolution. Target IP addresses matching RFC 1918, RFC 3927 (cloud metadata), RFC 6598 (carrier-grade NAT), or loopback interfaces are blocked immediately before issuing HTTP requests.
- **XSS Prevention:** All user-submitted text is treated as plain text and escaped by React. HTML injection attempts are neutral.
- **SQL Injection Prevention:** Parameterized SQL queries are strictly enforced across all database queries.
- **IP Privacy Hashing:** Submitter IPs are salted and hashed using SHA-256 before storage (`submitterIpHash`). Raw IP addresses are never persisted or exposed.
- **Brute Force & Anti-Bot Protection:** 
  - Admin login: 5 failed attempts per 15-minute window results in an automated lockout.
  - Submissions: 5 submissions per hour per IP rate limit.
  - Honeypot: Hidden input traps automated spam bots without exposing form rejection triggers.
- **Security Headers:** Enforced via middleware:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

## ☁️ Deployment Guide (Vercel + Neon / Supabase PostgreSQL)

1. **Database Provisioning (Neon / Supabase)**:
   - Create a free PostgreSQL database on Neon (`neon.tech`) or Supabase (`supabase.com`).
   - Copy the connection string (e.g. `postgresql://user:password@ep-host.neon.tech/neondb?sslmode=require`).

2. **Configure Environment Variables in Vercel**:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `ADMIN_EMAIL`: Initial admin email.
   - `ADMIN_PASSWORD`: Strong password for the admin account.
   - `SESSION_SECRET`: A 32+ character random hex string.
   - `IP_SALT`: A random salt string for IP hashing.

3. **Deploy with Vercel**:
   ```bash
   vercel
   ```
   Or connect your GitHub repository in the Vercel dashboard. The build script `npm run build` will compile the assets into `dist/`.

---

## 📦 Dependency Audit
A dependency check (`npm audit`) was completed. All core packages use current, maintained versions:
- Express 4.21+
- React 19+
- Tailwind CSS 4.3+
- Zod 4.6+
- Vitest 5.0+
- bcryptjs 3.0+
