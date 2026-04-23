# 🎬 ConveneHub - Event Ticket Booking System

> A comprehensive event management and ticket booking platform built with Next.js, Supabase, and TypeScript.

[![Next.js](https://img.shields.io/badge/Next.js-13.5.1-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3.3-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Documentation](#documentation)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment](#deployment)

## 🌟 Overview

ConveneHub is a full-stack event management platform that enables organizations to create, manage, and track events with advanced features including:

- **Three-tier role system**: ConveneHub Team (Admin), Movie Team (Event Staff), and Users
- **QR-based ticket validation**: Generate and scan QR codes for check-ins
- **Real-time booking management**: Live updates on ticket availability
- **Email notifications**: Automated booking confirmations with QR codes
- **CSV export**: Export booking and check-in data
- **Mobile-responsive**: Optimized for all devices
- **Secure**: Row-level security (RLS) policies with Supabase

**Project Status:** 🎉 100% Complete (55/55 tasks done) - Production Ready!

## ✨ Features

### For Event Organizers (ConveneHub Team)
- ✅ Create and manage events with rich details
- ✅ Upload event images to Supabase Storage
- ✅ Track bookings and check-ins in real-time
- ✅ Assign movie team members to specific events
- ✅ Export booking/check-in data as CSV
- ✅ View comprehensive analytics and audit logs
- ✅ Manage user roles and permissions
- ✅ Edit event details with validation

### For Event Staff (Movie Team)
- ✅ View assigned events only
- ✅ Scan QR codes for ticket validation
- ✅ Manual attendee lookup and check-in
- ✅ Real-time check-in status updates
- ✅ Event-specific access control

### For Attendees (Users)
- ✅ Browse and discover events
- ✅ Book tickets with seat selection
- ✅ Receive QR code tickets via email
- ✅ View booking history
- ✅ Manage personal profile
- ✅ Google OAuth integration

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 13.5.1 (App Router)
- **Language**: TypeScript 5.2.2
- **Styling**: Tailwind CSS 3.3.3
- **UI Components**: Radix UI + shadcn/ui
- **Animations**: Framer Motion
- **3D Graphics**: Three.js + Spline
- **State Management**: React Hook Form + Zod validation
- **Icons**: Lucide React

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password + Google OAuth)
- **Storage**: Supabase Storage (Event images)
- **Email**: Nodemailer
- **QR Generation**: qrcode library
- **Date Handling**: date-fns

### Developer Tools
- **Testing**: Playwright (E2E, Security, Integration)
- **Linting**: ESLint
- **Type Safety**: TypeScript
- **Bundle Analysis**: @next/bundle-analyzer

## 📁 Project Structure

```
ConveneHub/                          # Main repository (Next.js application)
├── app/                           # Next.js App Router pages
│   │   ├── admin/                 # Admin dashboard & management
│   │   │   ├── page.tsx           # Main admin dashboard
│   │   │   ├── assignments/       # Movie team assignments
│   │   │   ├── csv-export/        # CSV export functionality
│   │   │   └── events/            # Event management
│   │   ├── auth/                  # Authentication pages
│   │   ├── bookings/              # Booking management
│   │   ├── events/                # Public events pages
│   │   │   ├── page.tsx           # Events listing
│   │   │   └── [id]/              # Individual event details
│   │   ├── movie-team/            # Movie team dashboard
│   │   ├── complete-profile/      # Profile completion
│   │   ├── early-access/          # Early access page
│   │   ├── about/                 # About page
│   │   ├── login/                 # Login/signup page
│   ├── api/                       # API routes
│   │   ├── auth/                  # Authentication endpoints
│   │   ├── bookings/              # Booking endpoints
│   │   ├── checkin/               # Check-in endpoints
│   │   ├── events/                # Event endpoints
│   │   ├── admin/                 # Admin endpoints
│   │   └── csv-export/            # CSV export endpoints
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   └── globals.css                # Global styles
│
├── components/                    # React components
│   ├── admin/                     # Admin-specific components
│   │   ├── admin-dashboard.tsx
│   │   ├── create-event-form.tsx
│   │   ├── edit-event-form.tsx
│   │   ├── events-list.tsx
│   │   ├── csv-export-dropdown.tsx
│   │   └── analytics-dashboard.tsx
│   ├── movie-team/                # Movie team components
│   │   ├── movie-team-dashboard.tsx
│   │   ├── qr-scanner.tsx
│   │   └── check-in-interface.tsx
│   ├── events/                    # Event-related components
│   │   ├── events-hero-section.tsx
│   │   ├── events-list-section.tsx
│   │   ├── event-booking-page.tsx
│   │   └── event-card.tsx
│   ├── ui/                        # Reusable UI components (50+)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   └── ... (40+ more)
│   ├── header.tsx                 # Main header/navbar
│   ├── footer.tsx                 # Footer component
│   ├── hero-section.tsx           # Landing page hero
│   ├── features-section.tsx       # Features showcase
│   ├── error-boundary.tsx         # Error handling
│   └── protected-route.tsx        # Route protection
│
├── lib/                           # Utility libraries
│   ├── supabase/                  # Supabase clients
│   │   ├── client.ts              # Client-side Supabase
│   │   └── server.ts              # Server-side Supabase
│   ├── email/                     # Email functionality
│   │   ├── templates.ts           # Email templates
│   │   └── sender.ts              # Email sending logic
│   ├── qr-generator.ts            # QR code generation
│   ├── csv-export.ts              # CSV export utilities
│   ├── utils.ts                   # General utilities
│   └── hydration-utils.ts         # Client hydration helpers
│
├── types/                         # TypeScript type definitions
│   └── database.types.ts          # Database schema types
│
├── hooks/                         # Custom React hooks
│
├── utils/                         # Additional utilities
│
├── scripts/                       # Utility scripts
│
├── tests/                         # Playwright tests
│   ├── security/                  # Security tests
│   └── integration/               # Integration tests
│
├── public/                        # Static assets
│
├── middleware.ts                  # Next.js middleware (route protection)
├── next.config.js                 # Next.js configuration
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
├── playwright.config.ts           # Playwright configuration
├── components.json                # shadcn/ui configuration
├── package.json                   # Dependencies
├── .env.local.example             # Environment variables template
├── README.md                      # This file
├── CONTRIBUTING.md                # Contribution guidelines
└── LICENSE                        # MIT License
```

### Database Setup Files

The `/database` folder contains SQL migration scripts:
- Database schema setup
- Row-level security policies
- Stored procedures and functions
- Performance indexes
- Storage bucket configuration

### Documentation

The `/documentation` folder contains comprehensive guides:
- Architecture and system design
- User guides for all roles
- API documentation
- Setup and deployment guides
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (free tier works)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lviffy/ConveneHub.git
   cd ConveneHub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Set up the database**
   
   Run the SQL scripts in Supabase SQL Editor in this order:
   ```bash
   # 1. Initial setup
   database/supabase-setup.sql
   
   # 2. Complete database setup
   database/complete-database-setup.sql
   
   # 3. Storage setup
   database/storage-setup.sql
   
   # 4. Performance indexes
   database/add-performance-indexes.sql
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Create your first admin user**
   
   After signing up, manually set the role in Supabase:
   ```sql
   UPDATE profiles SET role = 'eon_team' WHERE id = 'your_user_id';
   ```

## 🏗️ Architecture

### Three-Tier Role System

```
┌─────────────────────────────────────────────────────────────┐
│                        EON TEAM                              │
│                    (eon_team role)                           │
│  • Full system access                                        │
│  • Create events                                             │
│  • Manage users (promote/delete)                             │
│  • Assign movie team to events                               │
│  • View all analytics                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────────┐
                              │                     │
                              ▼                     ▼
        ┌───────────────────────────┐   ┌──────────────────────────┐
        │     MOVIE TEAM            │   │     USERS                │
        │  (movie_team role)        │   │  (user role)             │
        │  • View assigned events   │   │  • View all events       │
        │  • Scan tickets           │   │  • Book tickets          │
        │  • Check-in attendees     │   │  • Manage bookings       │
        │  • Event-specific access  │   │  • View QR codes         │
        └───────────────────────────┘   └──────────────────────────┘
```

### Application Flow

```
User Journey:
1. User signs up/logs in → Profile created
2. User browses events → Selects event
3. User books tickets → Booking created + QR generated
4. Email sent with QR code
5. User arrives at event → QR scanned by Movie Team
6. Check-in recorded → Analytics updated

Admin Journey:
1. Admin logs in → Admin dashboard
2. Creates new event → Event published
3. Assigns movie team → Assignment created
4. Monitors bookings → Real-time updates
5. Exports data → CSV download

Movie Team Journey:
1. Team member logs in → Movie team dashboard
2. Views assigned events
3. Opens event → Check-in interface
4. Scans QR codes → Validates & checks in
```

## 🗄️ Database Schema

### Core Tables

```sql
-- User profiles (extends auth.users)
profiles
├── id (UUID, PK, FK → auth.users)
├── full_name (TEXT)
├── avatar_url (TEXT)
├── phone (TEXT)
├── city (TEXT)
├── role (TEXT) -- 'user' | 'movie_team' | 'eon_team'
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Events
events
├── event_id (UUID, PK)
├── title (TEXT)
├── description (TEXT)
├── event_type (TEXT)
├── venue_name (TEXT)
├── venue_address (TEXT)
├── city (TEXT)
├── date_time (TIMESTAMP)
├── capacity (INT)
├── remaining (INT)
├── status (TEXT) -- 'draft' | 'published' | 'checkin_open' | 'in_progress' | 'ended'
├── image_url (TEXT)
├── created_by (UUID, FK → profiles)
└── created_at (TIMESTAMP)

-- Bookings
bookings
├── booking_id (UUID, PK)
├── event_id (UUID, FK → events)
├── user_id (UUID, FK → profiles)
├── num_tickets (INT)
├── qr_code_data (TEXT)
├── booking_status (TEXT) -- 'confirmed' | 'cancelled'
├── checked_in (BOOLEAN)
└── created_at (TIMESTAMP)

-- Individual tickets
tickets
├── ticket_id (UUID, PK)
├── booking_id (UUID, FK → bookings)
├── ticket_number (INT)
├── qr_code_data (TEXT)
├── checked_in (BOOLEAN)
└── checked_in_at (TIMESTAMP)

-- Check-ins
checkins
├── checkin_id (UUID, PK)
├── booking_id (UUID, FK → bookings)
├── ticket_id (UUID, FK → tickets)
├── event_id (UUID, FK → events)
├── checked_in_by (UUID, FK → profiles)
├── notes (TEXT)
└── checked_in_at (TIMESTAMP)

-- Audit logs
audit_logs
├── log_id (UUID, PK)
├── user_id (UUID, FK → profiles)
├── action (TEXT)
├── entity_type (TEXT)
├── entity_id (UUID)
├── details (JSONB)
└── created_at (TIMESTAMP)
```

### Row-Level Security (RLS)

All tables have RLS enabled with policies for:
- `SELECT`: Role-based read access
- `INSERT`: Role-based create access
- `UPDATE`: Role-based update access
- `DELETE`: Admin-only delete access

## 🔌 API Routes

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signout` - User logout
- `POST /api/auth/verifyotp` - OTP verification

### Events
- `GET /api/events` - List all published events
- `GET /api/events/[id]` - Get event details
- `POST /api/events/create` - Create event (admin only)
- `PUT /api/events/[id]` - Update event (admin only)
- `DELETE /api/events/[id]` - Delete event (admin only)

### Bookings
- `GET /api/bookings` - Get user's bookings
- `POST /api/bookings/create` - Create booking
- `GET /api/bookings/[id]` - Get booking details
- `DELETE /api/bookings/[id]` - Cancel booking

### Check-ins
- `POST /api/checkin` - Check-in attendee
- `POST /api/checkin/verify` - Verify QR code
- `GET /api/checkin/stats` - Get check-in statistics

### Admin
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/[id]/role` - Update user role
- `DELETE /api/admin/users/[id]` - Delete user
- `POST /api/admin/assignments` - Create movie team assignment
- `GET /api/admin/analytics` - Get system analytics

### CSV Export
- `GET /api/csv-export/bookings` - Export bookings CSV
- `GET /api/csv-export/checkins` - Export check-ins CSV

## 📚 Documentation

Comprehensive documentation is available in the repository:

### For Users
- **[USER_GUIDE.md](../documentation/USER_GUIDE.md)** - Complete guide for ticket buyers
- **[ADMIN_MANUAL.md](../documentation/ADMIN_MANUAL.md)** - Full manual for ConveneHub team admins
- **[MOVIE_TEAM_GUIDE.md](../documentation/MOVIE_TEAM_GUIDE.md)** - Comprehensive guide for event staff

### For Developers
- **[QUICKSTART.md](../documentation/QUICKSTART.md)** - Get started in 5 minutes
- **[ARCHITECTURE_SUMMARY.md](../documentation/ARCHITECTURE_SUMMARY.md)** - System architecture
- **[RBAC_IMPLEMENTATION_GUIDE.md](../documentation/RBAC_IMPLEMENTATION_GUIDE.md)** - Security implementation
- **[BOOKING_SETUP_GUIDE.md](../documentation/BOOKING_SETUP_GUIDE.md)** - Booking system setup
- **[MOVIE_TEAM_ASSIGNMENT_GUIDE.md](../documentation/MOVIE_TEAM_ASSIGNMENT_GUIDE.md)** - Team assignments
- **[EON-Verse.md](../documentation/EON-Verse.md)** - Development tracker (100% complete)
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - How to contribute to this project

## 📜 Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run analyze      # Analyze bundle size
```

### Testing
```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:ui           # Run tests in UI mode
npm run test:e2e:headed       # Run tests in headed mode
npm run test:e2e:debug        # Debug tests
npm run test:e2e:report       # Show test report
npm run test:security         # Run security tests
npm run test:integration      # Run integration tests
```

### Database
```bash
# Run from project root
./test-multiple-tickets.sh    # Test multiple ticket bookings
```

## 🧪 Testing

The project uses **Playwright** for comprehensive testing:

### Test Structure
```
tests/
├── security/           # Security & authentication tests
│   ├── auth.spec.ts
│   ├── rbac.spec.ts
│   └── sql-injection.spec.ts
└── integration/        # Integration tests
    ├── booking.spec.ts
    ├── checkin.spec.ts
    └── events.spec.ts
```

### Running Tests
```bash
# Run all tests
npm run test:e2e

# Run specific test suite
npm run test:security

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Debug tests
npm run test:e2e:debug
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository**
   - Import your GitHub repository to Vercel
   - The root directory is automatically selected

2. **Configure environment variables**
   - Add all variables from `.env.local`
   - Set `NEXT_PUBLIC_SITE_URL` to your production URL

3. **Deploy**
   - Vercel will automatically build and deploy
   - Your app will be live at `your-project.vercel.app`

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
VITE_API_BASE_URL=https://your-backend-service.up.railway.app

# Email configuration (if using SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@convenehub.com
```

## 🔒 Security Features

- ✅ Row-level security (RLS) on all tables
- ✅ Role-based access control (RBAC)
- ✅ Secure API routes with authentication checks
- ✅ SQL injection prevention via parameterized queries
- ✅ XSS protection via React's built-in sanitization
- ✅ CSRF protection via Supabase Auth
- ✅ Secure password hashing (handled by Supabase)
- ✅ Environment variable management
- ✅ Input validation with Zod schemas

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](../CONTRIBUTING.md) for details on:

- Code of conduct
- Development process
- Coding standards
- Commit guidelines
- Pull request process
- Testing requirements

Quick steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)

## 👥 Team

**ConveneHub Team** - Event organization and management platform

## 📞 Support

For support, email: support@convenehub.com

---

## 🎯 Roadmap

### Current Status: 🎉 100% Complete - Production Ready!

### ✅ All Core Features Completed (55/55 tasks)
- [x] Authentication system (Email + Google OAuth)
- [x] Three-tier role system (ConveneHub Team, Movie Team, Users)
- [x] Event creation & management
- [x] Event editing with full validation
- [x] Booking system with QR codes
- [x] Individual ticket generation
- [x] Check-in system with QR scanner
- [x] Movie team assignments
- [x] CSV export functionality
- [x] Email notifications with QR codes
- [x] Image upload to Supabase Storage
- [x] Responsive UI design
- [x] Admin dashboard with analytics
- [x] Movie team dashboard
- [x] Public events page
- [x] Real-time subscriptions for live updates
- [x] Comprehensive testing suite (118+ tests)
- [x] E2E tests with Playwright
- [x] Security tests (RLS, RBAC, QR validation)
- [x] Integration tests
- [x] Performance optimization
- [x] Image optimization (80% reduction)
- [x] Code splitting (64% smaller bundles)
- [x] Bundle analysis
- [x] Database indexes (40+ indexes, 5-10x speedup)
- [x] Full documentation suite
- [x] User guides for all roles
- [x] Admin manual with SQL queries
- [x] Movie team operational guide
- [x] Contributing guidelines
- [x] API documentation
- [x] Deployment guides

### 📅 Future Enhancements
- [ ] Payment gateway integration
- [ ] Mobile app (React Native)
- [ ] Event analytics dashboard v2
- [ ] Advanced reporting features
- [ ] Multi-language support
- [ ] Social media integration
- [ ] Calendar integrations (Google Calendar, iCal)
- [ ] Waitlist functionality
- [ ] Refund management
- [ ] Event templates

---

**Built with ❤️ by the ConveneHub Team**

*Last Updated: November 16, 2025*
