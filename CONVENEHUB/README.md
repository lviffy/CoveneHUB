# ConveneHub (React + Express + MongoDB)

This is the new separate implementation workspace for ConveneHub.

## Structure

- frontend: React + Vite + TypeScript
- backend: Express + TypeScript + MongoDB
- shared: shared types/contracts

## Quick Start

1. Install dependencies from project root:
   npm install
2. Copy env file and update values:
   cp backend/.env.example backend/.env

### Start MongoDB (Docker)

If this is your first run, create and start the MongoDB container:

```bash
docker run -d --name convenehub-mongo -p 27017:27017 -v convenehub-mongo-data:/data/db mongo:7
```

If the container already exists, start it with:

```bash
docker start convenehub-mongo
```

Optional health check:

```bash
docker exec convenehub-mongo mongosh --quiet --eval "db.adminCommand({ ping: 1 })"
```

3. Run backend:
   npm run dev:backend
4. Run frontend in another terminal:
   npm run dev:frontend

## Current Status

- Frontend route skeleton added for public, attendee, organizer, promoter, and admin paths.
- Backend API module skeleton added for auth, events, bookings, tickets, check-ins, promoters, analytics, and admin.
- MongoDB models added for users, events, bookings, and tickets.
