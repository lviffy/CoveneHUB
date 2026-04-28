# ConveneHub

<div align="center">

**A role-based event platform for organizers, attendees, promoters, and admins**

[![JavaScript](https://img.shields.io/badge/JavaScript-5.0-blue)](https://www.javascriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.x-000000)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-47A248)](https://www.mongodb.com/)

</div>

---

ConveneHub is a comprehensive event management platform that supports multi-role workflows with backend enforcement and MongoDB records aligned to those roles. Whether you’re organizing events, attending them, promoting tickets, or managing the platform, ConveneHub provides the tools you need.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Role Flows](#role-flows)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Overview](#api-overview)
- [Scripts](#scripts)
- [Migration](#migration)
- [Contributing](#contributing)

---

## Features

- **Multi-Role Authentication** — Support for admin, organizer, promoter, and attendee roles
- **Event Management** — Create events with customizable ticket tiers
- **Ticket Booking** — Attendee-only booking flow with QR code generation
- **Check-in System** — Organizer/admin check-in handling with real-time validation
- **Referral Program** — Promoter referral links with sales tracking and commission records
- **Tenant Management** — Admin tenant APIs with multi-tenancy support
- **Analytics Dashboard** — Role-specific analytics and monitoring

---

## Tech Stack

| Component          | Technology                     |
| ------------------ | ------------------------------ |
| **Frontend**       | React + Vite + JavaScript      |
| **Backend**        | Express + JavaScript + MongoDB |
| **Shared**         | Shared contracts/types         |
| **Database**       | MongoDB                        |
| **Authentication** | JWT + Google OAuth (optional)  |
| **Email**          | SMTP (configurable)            |

---

## Role Flows

### Organizer Flow

```
Organizer → Create Event → Set Ticket Tiers → Monitor Dashboard
```

Organizers can create events, define ticket tiers, and monitor sales and attendance through their dashboard.

### Attendee Flow

```
Attendee → Register → Buy Ticket → Receive QR Code → Check-in
```

Attendees can browse events, purchase tickets, receive QR codes for entry, and get checked in at events.

### Promoter Flow

```
Promoter → Share Referral Link → Track Sales → Earn Commission
```

Promoters can generate referral links for events, track their sales performance, and earn commissions on ticket sales.

### Admin Flow

```
Admin → Monitor Platform → Manage Tenants
```

Admins have platform-wide visibility and can manage tenants, users, and monitor overall platform health.

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6.0+
- npm or yarn

### Installation

From the project root:

```bash
npm install
cp backend/.env.example backend/.env
```

### Configuration

Update `backend/.env` with your configuration:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/convenehub

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# SMTP (for emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5173/auth/google/callback

# Uploads
UPLOAD_ROOT=./uploads
```

> **Note:** For production, set `UPLOAD_ROOT` to a persistent directory (e.g., `/data/uploads` on Railway) so uploaded files remain available after restarts/redeploys.

### Running the Application

#### With Docker Compose (Recommended)

This starts MongoDB and the backend together:

```bash
docker compose up --build
```

Useful commands:

```bash
# Run in background
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v
```

#### Locally

Start MongoDB separately, then run:

```bash
npm run dev:backend  # Backend on http://localhost:3000
npm run dev:frontend # Frontend on http://localhost:5173
```

---

## Environment Variables

| Variable               | Description                | Default                                |
| ---------------------- | -------------------------- | -------------------------------------- |
| `MONGODB_URI`          | MongoDB connection string  | `mongodb://localhost:27017/convenehub` |
| `JWT_SECRET`           | Secret key for JWT tokens  | (required)                             |
| `JWT_EXPIRES_IN`       | JWT token expiration time  | `7d`                                   |
| `SMTP_HOST`            | SMTP server host           | -                                      |
| `SMTP_PORT`            | SMTP server port           | -                                      |
| `SMTP_USER`            | SMTP username              | -                                      |
| `SMTP_PASS`            | SMTP password              | -                                      |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID     | -                                      |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | -                                      |
| `GOOGLE_CALLBACK_URL`  | Google OAuth callback URL  | -                                      |
| `UPLOAD_ROOT`          | Directory for file uploads | `./uploads`                            |

---

## Project Structure

```
CoveneHUB/
├── frontend/          # React + Vite frontend
├── backend/           # Express + JavaScript backend
├── shared/            # Shared types and contracts
├── docker-compose.yml # Docker configuration
└── README.md          # This file
```

---

## Database Schema

The implementation uses these role-aligned collections:

| Collection      | Purpose                             |
| --------------- | ----------------------------------- |
| `users`         | User accounts with role assignments |
| `events`        | Event details and metadata          |
| `bookings`      | Booking records                     |
| `tickets`       | Ticket instances                    |
| `attendees`     | Attendee profiles and data          |
| `referrallinks` | Promoter referral links             |
| `commissions`   | Commission records for promoters    |
| `tenants`       | Tenant/organization records         |
| `checkins`      | Check-in event logs                 |

**Notes:**

- `attendeeId` is the canonical field for attendee-owned booking and check-in data
- Some legacy aliases like `userId` are preserved for compatibility
- Admin and organizer accounts without a tenant are bootstrapped into `default-tenant`

---

## API Overview

### Authentication Endpoints

- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login with email/password
- `POST /api/auth/google` — Google OAuth login
- `GET /api/auth/me` — Get current user profile

### Event Endpoints

- `GET /api/events` — List all events
- `POST /api/events` — Create an event (organizer/admin)
- `GET /api/events/:id` — Get event details
- `PUT /api/events/:id` — Update event (owner/admin)
- `DELETE /api/events/:id` — Delete event (owner/admin)

### Booking Endpoints

- `POST /api/bookings` — Create a booking (attendee/admin)
- `GET /api/bookings` — List user bookings
- `GET /api/bookings/:id` — Get booking details

### Check-in Endpoints

- `POST /api/checkins` — Check in an attendee (organizer/admin)
- `GET /api/checkins/event/:eventId` — Get event check-ins

### Promoter Endpoints

- `POST /api/referrallinks` — Create referral link (promoter)
- `GET /api/referrallinks` — List referral links
- `GET /api/commissions` — View commission earnings

### Admin Endpoints

- `GET /api/admin/tenants` — List all tenants
- `POST /api/admin/tenants` — Create a tenant
- `PUT /api/admin/tenants/:id` — Update tenant
- `DELETE /api/admin/tenants/:id` — Delete tenant

---

## Scripts

### From Project Root

```bash
npm run dev:backend    # Start backend in dev mode
npm run dev:frontend   # Start frontend in dev mode
npm run build          # Build all packages
npm run typecheck      # Type check all packages
```

### From Backend Directory

```bash
npm run typecheck           # Type check backend
npm run build               # Build backend
npm run backfill:role-flow  # Run database migration
```

---

## Migration

If you already have MongoDB data and want it aligned to the current role flow model, run:

```bash
cd backend
npm run backfill:role-flow
```

This migration:

- Syncs indexes for `attendees`, `referrallinks`, and `tenants`
- Creates tenant records from existing users/events
- Assigns `default-tenant` to admin/organizer users without one
- Backfills attendee records from confirmed bookings and tickets

---

## Backend Logic Alignment

The backend enforces the following rules:

- Only `attendee` and `admin` roles can create attendee bookings
- Booking creation updates `bookings`, `tickets`, `commissions`, and `attendees`
- Only the event owner organizer or an admin can check attendees in
- Organizer analytics are restricted to the organizer’s own events
- Promoter links can only be created for valid published events
- Admin tenant management is backed by stored tenant documents, not inferred IDs

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m ‘Add amazing feature’`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Run `npm run typecheck` before committing
- Ensure all tests pass
- Follow the existing code style
- Update documentation as needed

---

## License

This project is licensed under the MIT License.

---

## Project Status

This is a fully functional event management platform with complete role flows, backend rules, and MongoDB structure. The documentation and implementation are aligned and verified.

### Verified State

The codebase has been verified with:

```bash
cd backend && npm run typecheck && npm run build
cd frontend && npm run build
```
