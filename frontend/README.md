# ConveneHub Frontend

<div align="center">

**The React + Vite frontend for ConveneHub event management platform**

[![React](https://img.shields.io/badge/React-18.3+-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646CFF)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-38B2AC)](https://tailwindcss.com/)

</div>

---

## Overview

The ConveneHub frontend is a modern, responsive React application built with Vite and TypeScript. It provides role-based interfaces for organizers, attendees, promoters, and admins to manage events, bookings, and check-ins.

## Features

- **Multi-Role Interface** — Distinct dashboards for organizers, attendees, promoters, and admins
- **Event Discovery** — Browse and search events with filtering options
- **Ticket Booking** — Seamless booking flow with QR code generation
- **QR Code Scanning** — Built-in QR scanner for check-in validation
- **Real-time Updates** — Live booking and check-in status
- **Responsive Design** — Mobile-first design that works on all devices
- **Interactive Maps** — Event venue integration with Leaflet
- **Analytics Dashboard** — Visual charts and statistics with Recharts

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 18.3+ |
| **Build Tool** | Vite 7.1 |
| **Language** | TypeScript 5.2 |
| **Styling** | Tailwind CSS 3.3 |
| **Routing** | React Router DOM 7.7 |
| **UI Components** | Radix UI + shadcn/ui |
| **Forms** | React Hook Form + Zod |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Maps** | Leaflet + React Leaflet |
| **QR Code** | jsqr |
| **Icons** | Lucide React |

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   ├── pages/               # Page components
│   │   ├── auth/            # Authentication pages
│   │   ├── events/          # Event listing and details
│   │   ├── bookings/        # Booking management
│   │   ├── organizer/       # Organizer dashboard
│   │   ├── promoter/        # Promoter dashboard
│   │   └── admin/           # Admin dashboard
│   ├── components/          # Reusable components
│   │   ├── ui/              # shadcn/ui components
│   │   └── ...              # Feature-specific components
│   ├── lib/                 # Utility libraries
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Helper functions
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### Environment Variables

Configure your environment in `.env.local`:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api

# Optional: Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Development

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:5173
```

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run start
```

### Linting

```bash
# Run ESLint
npm run lint
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run analyze` | Analyze bundle size |

## Key Components

### Authentication

- Login and registration forms
- Google OAuth integration
- Protected route wrapper
- Session management

### Event Management

- Event listing with filters
- Event detail pages
- Event creation form (organizers)
- Event editing and deletion

### Booking System

- Ticket selection
- Booking confirmation
- QR code display
- Booking history

### Check-in System

- QR code scanner
- Manual check-in
- Check-in history
- Real-time status updates

### Analytics

- Sales charts
- Attendance statistics
- Revenue tracking
- Export functionality

## Styling

The project uses Tailwind CSS for styling with a custom design system:

- **Colors**: Primary, secondary, accent, and semantic colors
- **Typography**: Inter font family
- **Spacing**: Consistent spacing scale
- **Components**: Reusable UI components with variants

## State Management

State is managed through:

- **React Context** — Global state (auth, theme)
- **React Hook Form** — Form state and validation
- **React Router** — Navigation state
- **Custom Hooks** — Reusable state logic

## API Integration

The frontend communicates with the backend via REST API:

- Base URL: Configured via `VITE_API_BASE_URL`
- Authentication: JWT tokens stored in localStorage
- Error handling: Centralized error handling
- Loading states: Global loading indicators

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Follow the existing code style
2. Use TypeScript for all new code
3. Add tests for new features
4. Update documentation as needed
5. Run `npm run lint` before committing

## License

MIT License — see the main project LICENSE file for details.

---

**Built with ❤️ by the ConveneHub Team**
<<<<<<< HEAD
=======

*Last Updated: April 26, 2026*
>>>>>>> 885b164eaedd794fab3a8b0572cc3d121d2522a8
