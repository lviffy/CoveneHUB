# ConveneHub Project Architecture (Technical Deep Dive)

_Last updated: 2026-04-24_

## 1) Executive Summary

ConveneHub is a **monorepo** with a currently active runtime composed of:

- `frontend`: Vite + React + JavaScript SPA
- `backend`: Express + JavaScript + MongoDB (Mongoose)
- `shared`: minimal shared type contracts

---

## 2) Repository Topology

```text
/ (repo root)
├─ package.json                  # npm workspaces orchestrator (frontend + backend)
├─ docker-compose.yml            # Mongo + backend local stack
├─ backend/
│  ├─ src/
│  │  ├─ app.js                  # Express app composition
│  │  ├─ server.js               # Server bootstrap
│  │  ├─ config/                 # env + DB connection
│  │  ├─ middlewares/            # auth + error middleware
│  │  ├─ models/                 # Mongoose domain models
│  │  ├─ routes/                 # REST API modules
│  │  ├─ services/               # referral commission logic
│  │  ├─ utils/                  # token/code/tenant helpers
│  │  └─ convene/                # legacy excluded subtree
│  ├─ scripts/                   # migration/backfill/smoke scripts
│  └─ uploads/                   # image upload storage
├─ frontend/
│  ├─ src/                       # Vite SPA entry + compat shims
│  ├─ app/                       # page modules consumed by SPA router
│  ├─ components/                # UI + domain components
│  ├─ lib/                       # auth adapter, utilities, payments, storage
│  ├─ tests/                     # e2e/integration/security tests
│  └─ app/api/                   # supplemental API route handlers
└─ shared/
   └─ types.js                   # shared minimal API types
```

---

## 3) Active Runtime Architecture

## 3.1 Request Path (Browser -> API -> DB)

```text
Browser (React SPA, Vite)
  -> fetch('/api/...')
  -> Vite dev proxy rewrites to /api/v1/* (backend)
  -> Express routes (auth/events/bookings/...)
  -> Mongoose models
  -> MongoDB
```

In production, frontend may call backend directly using `VITE_API_BASE_URL`.

## 3.2 Runtime Composition (Code)

Backend app assembly (`backend/src/app.ts`):

```ts
app.use(helmet(...));
app.use(cors(...));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/api/v1/uploads', express.static(uploadsDir));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use('/api/v1', apiRouter);
```

Frontend fetch wiring (`frontend/src/main.jsx`):

```ts
window.fetch = async (input, init) => {
  // rewrites /api/* -> /api/v1/* (or external API base)
  // injects Authorization Bearer token from localStorage
  // on 401, attempts /api/auth/refresh and retries once
};
```

---

## 4) Backend Architecture (Express + MongoDB)

## 4.1 Bootstrap and Config

- Entry: `backend/src/server.ts`
- App factory: `backend/src/app.ts`
- Env parser/validation: `backend/src/config/env.ts` (Zod)
- DB connector: `backend/src/config/db.ts` (`mongoose.connect`)

Important behavior:

- API starts listening **before** Mongo connection resolves; if DB fails, server runs in degraded mode (logs warning).
- `FRONTEND_ORIGIN` supports comma-separated origins for CORS.
- Upload storage root is configurable via `UPLOAD_ROOT`.

## 4.2 Middleware Stack

- Security headers: `helmet`
- CORS with explicit allow-list
- Logging: `morgan`
- JSON body parsing (`10mb`)
- Cookie parsing
- Global rate limiting (`300 req / 15 min`)
- Auth middleware:
  - `requireAuth`: validates Bearer JWT access token
  - `requireRole`: role-based guard
  - Role normalization supports aliases (`admin_team -> admin`, `movie_team -> organizer`, `user -> attendee`)

## 4.3 Route Modules and Responsibilities

Mounted under `/api/v1` in `backend/src/routes/index.ts`:

- `auth` -> `auth.routes.ts`
- `events` -> `events.routes.ts`
- `bookings` -> `bookings.routes.ts`
- `tickets` -> `tickets.routes.ts`
- `checkins` -> `checkins.routes.ts`
- `promoters` -> `promoters.routes.ts`
- `analytics` -> `analytics.routes.ts`
- `admin` -> `admin.routes.ts`
- `organizer` -> `organizer.routes.ts`
- `uploads` -> `uploads.routes.ts`
- `payments` -> `payments.routes.ts`
- misc (`/profile/update`, `/contact`) -> `misc.routes.ts`

## 4.4 Auth and Identity Flow

`backend/src/routes/auth.routes.ts` handles:

- Register/signup (`/register`, `/signup`)
- Login/logout/signout
- Refresh token exchange
- OTP send/verify + forgot-password + reset-password
- Profile completion (`/complete-profile`)
- Current user (`/me`)
- Google OAuth (`/google`, `/google/callback`)

JWT model:

- Access token: 1 hour (`JWT_ACCESS_SECRET`)
- Refresh token: 30 days (`JWT_REFRESH_SECRET`)
- Payload: `{ sub, role, tenantId }`

Role bridging:

- Frontend role labels are normalized in responses (`admin_team`, `organizer`, `promoter`, `user` mapped to backend canon).

## 4.5 Core Domain Flows

### 4.5.1 Event Lifecycle

- Create event with tier validation (`General` required; `VIP` optional but price must differ).
- Ticket tier quantities cannot exceed event capacity.
- Organizer ownership checks for update/delete.
- Tenant records synced on create/update role contexts.

### 4.5.2 Booking Lifecycle (Non-payment)

`bookings.routes.ts`:

1. Validate role and payload
2. Validate event status and tier capacity
3. Resolve referral attribution
4. Create booking record
5. Decrement event remaining + increment tier sold count
6. Generate ticket documents with QR payload JSON
7. Upsert attendee aggregate record
8. Create promoter commission entry (if referral)

### 4.5.3 Paid Booking Lifecycle (Razorpay)

`payments.routes.ts`:

1. `POST /payments/create-order`
   - Validates event + capacity + no duplicate confirmed booking
   - Creates/returns Razorpay order
   - Persists `PaymentAttempt` with expiry
2. `POST /payments/verify`
   - Verifies signature
   - Verifies payment status via Razorpay API
   - Creates booking/tickets if not already materialized
   - Updates event counters and attendee aggregate
   - Creates commission and referral conversion
3. `POST /payments/fail`
   - Marks attempt failed

### 4.5.4 Check-in Flow

- QR and manual check-ins in `checkins.routes.ts`.
- Organizer can only check in for own events; admin unrestricted.
- Check-in writes both `Ticket` status and `CheckIn` record and syncs `Attendee` aggregate.
- `organizer.routes.ts` adds dashboard-specific check-in APIs and duplicate detection messages.

### 4.5.5 Promoter Flow

- Create/find unique referral link per promoter+event
- Track clicks (`/promoters/track-click`)
- Track conversions through booking attribution + commission creation
- Aggregate promoter performance and commission totals

### 4.5.6 Admin and Organizer Analytics/Finance

Both `admin.routes.ts` and `organizer.routes.ts` expose financial summary and reconciliation views:

- event-level bookings/check-ins/no-show metrics
- gross revenue + platform commission calculations
- settlement recording and export endpoints (admin)

## 4.6 Data Model (Mongo Collections)

Primary models (`backend/src/models`):

1. `User`

- identity, role, tenant/campus, contact, OTP metadata
- aliases: `name <-> fullName`, `password <-> passwordHash`

2. `Event`

- organizer + tenant context
- lifecycle status
- ticket tiers with `soldCount`
- settlement metadata

3. `Booking`

- attendee, event, tier, amount, status, payment status
- referral/promoter attribution
- unique booking code

4. `Ticket`

- booking/event/attendee relation
- QR payload, check-in metadata

5. `CheckIn`

- immutable scan records (qr/manual)

6. `ReferralLink`

- promoter-event code + click/conversion counters
- unique index on `{ promoterId, eventId }`

7. `Commission`

- promoter payout record per booking
- unique index on `bookingId`

8. `PaymentAttempt`

- Razorpay order/payment tracking and expiry state machine

9. `Attendee`

- attendee aggregate per event for quick lookup/status

10. `Tenant`

- multi-tenant grouping (adminIds, organizerIds)

11. `Order`, `Promoter`, `Analytics`

- compatibility/derived collections used by migration and legacy flows

## 4.7 File Upload Subsystem

`uploads.routes.ts`:

- accepts base64 image payloads (jpeg/png/gif/webp)
- max file size: 5MB
- sanitizes and constrains file path to `UPLOAD_ROOT`
- serves via `/api/v1/uploads/*`
- delete endpoint sanitizes/normalizes paths to prevent traversal

## 4.8 Backend Scripts and Ops Utilities

`backend/scripts`:

- `backfill-role-flow-data.ts`: tenant + attendee backfill and index sync
- `migrate-schema-db.ts`: schema alias/data compatibility migration
- `smoke-test-api.ts`: end-to-end API smoke harness covering auth/events/bookings/checkins/promoters/admin/payments

---

## 5) Frontend Architecture (Vite SPA)

## 5.1 SPA Runtime

- Entrypoint: `frontend/src/main.jsx`
- Router: `react-router-dom` `BrowserRouter`
- Route map: `frontend/src/App.jsx` (imports many `frontend/app/*/page.jsx` modules)

## 5.2 Supabase-like Client Adapter (Critical Abstraction)

`frontend/lib/convene/client.ts` is the main frontend data/auth adapter.

It provides a **Supabase-style API surface** while translating to backend REST calls:

- `auth.*` methods map to `/api/v1/auth/*`
- `from('profiles'|'events'|'bookings')` query builder maps to backend endpoints
- `storage.from(...).upload/remove` maps to `/api/v1/uploads/images`

Session storage keys:

- `convenehub_access_token`
- `convenehub_refresh_token`
- `convenehub_user`

Role translation in client adapter:

- backend `admin` <-> frontend `admin_team`
- backend `attendee` <-> frontend `user`

## 5.3 Frontend Domain Modules

Main user-facing route groups in `frontend/app`:

- Public: home/events/contact/legal pages
- Auth: login/callback/error/forgot/reset/complete-profile
- Booking: event details + booking history + ticket QR
- Organizer: organizer dashboard + live check-in
- Admin: admin dashboard + users + event edit
- Promoter: referral and commission dashboard

Component architecture:

- `components/events/*`: discovery and booking UX
- `components/admin/*`: financial + reconciliation + event admin
- `components/organizer-team/*` + `components/movie-team/*`: operational check-in UIs
- `components/ui/*`: reusable design system components

Lazy-loading:

- `components/lazy-components.jsx` dynamically loads heavy dashboards.

## 5.4 Payment UX

`components/payments/RazorpayCheckout.jsx` orchestrates:

1. create order (`/api/payments/create-order`)
2. Razorpay checkout handler
3. verify/fail callbacks (`/api/payments/verify`, `/api/payments/fail`)

## 5.5 Asset URL Normalization

`frontend/lib/storage.ts` translates stored image paths to resolved API URLs and strips legacy prefixes.

## 5.6 Frontend Tests

`frontend/tests` contains:

- `e2e` Playwright flows (auth, booking, admin, organizer)
- `integration` API/database trigger tests
- `security` role-access/RLS/QR validation tests

Note: current Playwright config uses `baseURL=http://localhost:3000` while active Vite dev server script defaults to 5173.

---

## 7) Endpoint Inventory (Active Express API)

All below are mounted under `/api/v1` unless noted.

## 7.1 Health

- `GET /` (root app)
- `GET /health`

## 7.2 Auth

- `POST /auth/register`
- `POST /auth/signup`
- `GET /auth/google`
- `GET /auth/google/callback`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/signout`
- `POST /auth/send-otp`
- `POST /auth/forgot-password`
- `POST /auth/verify-otp`
- `POST /auth/reset-password`
- `POST /auth/complete-profile`
- `GET /auth/me`

## 7.3 Events

- `GET /events`
- `GET /events/public`
- `GET /events/:id`
- `POST /events`
- `PATCH /events/:id`
- `DELETE /events/:id`

## 7.4 Bookings & Tickets

- `POST /bookings`
- `GET /bookings`
- `GET /bookings/me`
- `GET /bookings/:id/tickets`
- `GET /bookings/:id/qr`
- `GET /bookings/:id`
- `POST /bookings/:id/cancel`
- `POST /bookings/:id/create-missing-tickets`
- `GET /tickets/:id/qr`

## 7.5 Check-ins

- `POST /checkins/qr`
- `POST /checkins/manual`
- `GET /checkins/event/:eventId`

## 7.6 Promoters

- `POST /promoters/track-click`
- `POST /promoters/links`
- `GET /promoters/links`
- `GET /promoters/performance`
- `GET /promoters/commissions`

## 7.7 Analytics

- `GET /analytics/event/:eventId`
- `GET /analytics/organizer/:organizerId`
- `GET /analytics/promoter/:promoterId`

## 7.8 Organizer

- `GET /organizer/my-events`
- `GET /organizer/events`
- `GET /organizer/financial-summary`
- `GET /organizer/reconciliation`
- `GET /organizer/events/:eventId/notes`
- `POST /organizer/events/:eventId/notes`
- `GET /organizer/events/:eventId/stats`
- `GET /organizer/events/:eventId/checked-in-users`
- `POST /organizer/events/:eventId/status`
- `POST /organizer/checkin`

## 7.9 Admin

- `GET /admin/tenants`
- `POST /admin/tenants`
- `PATCH /admin/tenants/:tenantId`
- `GET /admin/users`
- `POST /admin/users/update-role`
- `POST /admin/users/delete`
- `GET /admin/financial-summary`
- `GET /admin/reconciliation`
- `POST /admin/settlements`
- `POST /admin/financial-summary/email`
- `POST /admin/settlements/email`
- `GET /admin/events/:eventId/export-bookings`
- `GET /admin/events/:eventId/export-checkins`

## 7.10 Payments, Uploads, Misc

- `POST /payments/create-order`
- `POST /payments/verify`
- `POST /payments/fail`
- `POST /uploads/images`
- `DELETE /uploads/images`
- `POST /profile/update`
- `POST /contact`

---

## 8) Configuration and Environments

## 8.1 Root Workspace Scripts

- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run build`
- `npm run typecheck`

## 8.2 Backend Environment (`backend/.env.example`)

Key groups:

- Core: `NODE_ENV`, `PORT`, `MONGODB_URI`
- JWT: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- CORS: `FRONTEND_ORIGIN`
- SMTP: `SMTP_*`, `OTP_TTL_MINUTES`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Razorpay: `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- Uploads: `UPLOAD_ROOT`

## 8.3 Frontend Environment (`frontend/.env.example`)

Key groups:

- API proxy targeting: `VITE_API_BASE_URL`
- Supabase integration keys: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`
- Razorpay + email + QR HMAC keys

---

## 9) Deployment and Runtime Surfaces

## 9.1 Local Docker

`docker-compose.yml` provisions:

- `mongo` (port `27017`)
- `backend` (port `8080`, depends on healthy mongo)

## 9.2 Backend Container

`backend/Dockerfile`:

- multi-stage Node 20 Alpine build
- compiles JavaScript into `dist`
- runtime installs prod deps and runs `node dist/server.js`

## 9.3 Frontend Hosting

- Vite SPA build output in `frontend/dist`
- `frontend/vercel.json` rewrites all routes to `/index.html` (SPA fallback)

---

## 10) Technical Inconsistencies and Drift Notes

1. Test-runtime mismatch:

- Playwright config defaults to port `3000` while Vite dev defaults to `5173`.

2. Role naming translation complexity:

- backend canonical roles and frontend display roles differ; mapping exists in multiple places.

3. Multiple API calling layers:

- `window.fetch` override in `src/main.jsx`
- plus auth/data adapter in `lib/convene/client.ts`

---

## 11) Code Landmarks (Where to Read First)

If onboarding a new engineer, read in this order:

1. `backend/src/server.ts`
2. `backend/src/app.ts`
3. `backend/src/routes/index.ts`
4. `backend/src/routes/auth.routes.ts`
5. `backend/src/routes/bookings.routes.ts`
6. `backend/src/routes/payments.routes.ts`
7. `backend/src/models/*.ts`
8. `frontend/src/main.jsx`
9. `frontend/src/App.jsx`
10. `frontend/lib/convene/client.ts`
11. `frontend/components/events/event-booking-page.jsx`
12. `frontend/components/admin/admin-dashboard.jsx`
13. `frontend/components/organizer-team/organizer-team-dashboard.jsx`

---

## 12) Architectural Conclusion

ConveneHub currently operates as a robust role-based event platform with:

- centralized auth + role enforcement
- event lifecycle management
- booking + ticket generation
- QR/manual check-in flows
- promoter attribution + commission tracking
- admin/organizer financial and reconciliation analytics
- payment integration via Razorpay
- image upload and asset serving

The current architecture is coherent and production-oriented for the active Vite + Express + Mongo stack.
