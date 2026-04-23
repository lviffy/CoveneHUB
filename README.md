# ConveneHub

ConveneHub is a role-based event platform built with React, Express, and MongoDB. The current implementation supports organizer, attendee, promoter, and admin workflows with backend enforcement and MongoDB records aligned to those roles.

## Stack

- `frontend`: React + Vite + TypeScript
- `backend`: Express + TypeScript + MongoDB
- `shared`: shared contracts/types

## Role Flows

### Organizer Flow

`Organizer -> Create Event -> Set Ticket Tiers -> Monitor Dashboard`

### Attendee Flow

`Attendee -> Register -> Buy Ticket -> Receive QR Code -> Check-in`

### Promoter Flow

`Promoter -> Share Referral Link -> Track Sales -> Earn Commission`

### Admin Flow

`Admin -> Monitor Platform -> Manage Tenants`

## What Is Implemented

- Role-aware authentication for `admin`, `organizer`, `promoter`, and `attendee`
- Organizer/admin event creation with ticket tiers
- Attendee-only booking flow in the backend
- Ticket QR generation and organizer/admin check-in handling
- Promoter referral links, sales tracking, and commission records
- Admin tenant APIs with a real `tenants` collection
- Mongo backfill script for tenant and attendee records

## Backend Logic Alignment

The backend now enforces the same logic as the documented flows:

- Only `attendee` and `admin` roles can create attendee bookings
- Booking creation updates `bookings`, `tickets`, `commissions`, and `attendees`
- Only the event owner organizer or an admin can check attendees in
- Organizer analytics are restricted to the organizer’s own events
- Promoter links can only be created for valid published events
- Admin tenant management is backed by stored tenant documents, not inferred IDs

## MongoDB Model Shape

The implementation now uses or maintains these role-aligned collections:

- `users`
- `events`
- `bookings`
- `tickets`
- `attendees`
- `referrallinks`
- `commissions`
- `tenants`
- `checkins`

Notes:

- `attendeeId` is the canonical field for attendee-owned booking and check-in data
- Some legacy aliases like `userId` are still preserved in places for compatibility
- Admin and organizer accounts without a tenant are bootstrapped into `default-tenant`

## Quick Start

From the `CONVENEHUB` directory:

```bash
npm install
cp backend/.env.example backend/.env
```

Update `backend/.env` with your MongoDB URI, JWT secrets, SMTP config, and optional Google OAuth values.

### Run With Docker Compose

This starts MongoDB and the backend:

```bash
docker compose up --build
```

Useful commands:

```bash
docker compose up -d --build
docker compose logs -f
docker compose down
docker compose down -v
```

### Run Locally

Start MongoDB separately, then run:

```bash
npm run dev:backend
npm run dev:frontend
```

## Scripts

From the `CONVENEHUB` root:

```bash
npm run dev:backend
npm run dev:frontend
npm run build
npm run typecheck
```

From `CONVENEHUB/backend`:

```bash
npm run typecheck
npm run build
npm run backfill:role-flow
```

## Existing Database Migration

If you already have Mongo data and want it aligned to the current role flow model, run:

```bash
cd backend
npm run backfill:role-flow
```

This currently:

- syncs indexes for `attendees`, `referrallinks`, and `tenants`
- creates tenant records from existing users/events
- assigns `default-tenant` to admin/organizer users that do not yet have one
- backfills attendee records from confirmed bookings and tickets

## Verified State

The current codebase has been verified with:

```bash
cd backend && npm run typecheck && npm run build
cd ../frontend && npm run build
```

## Project Status

This is no longer just a route skeleton. The role flows, backend rules, and MongoDB structure have been updated together so the docs and implementation match.
