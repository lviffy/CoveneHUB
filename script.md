# 🎬 ConveneHub Video Presentation Script

This script is designed for a video walkthrough of the ConveneHub codebase. It covers both the Frontend (React/Vite) and Backend (Express/Node/MongoDB), highlighting the most important architectural decisions, key files, and core flows.

---

## Part 1: Project Overview & Architecture

### Scene 1: High-Level Architecture
- **🖥️ What to show (Screen):** Open your code editor and show the project's root folder structure. Expand the `frontend` and `backend` folders so viewers can see the separation. Optionally, open `PROJECT_ARCHITECTURE.md`.
- **🎙️ What to say (Voice-over):** 
  > "Welcome to the technical walkthrough of ConveneHub. This project is structured as a monorepo containing two main parts: a React Single Page Application built with Vite for the frontend, and a Node.js Express server using MongoDB for the backend. By keeping them together in a workspace, we easily manage dependencies and share configurations."

---

## Part 2: The Backend (Express + MongoDB)

### Scene 2: Server Entry Point & Middleware
- **🖥️ What to show (Screen):** Open `backend/src/server.ts` briefly, then switch to `backend/src/app.ts`. Highlight the middleware section with your cursor (lines containing `helmet`, `cors`, `morgan`, `rateLimit`).
- **🎙️ What to say (Voice-over):** 
  > "Let's dive into the backend first. Our entry point is `server.ts`, which bootstraps the database connection and starts the Express app. If we look at `app.ts`, you can see our robust middleware stack. We use Helmet for security headers, strict CORS policies, and global API rate limiting to protect our endpoints from abuse."

### Scene 3: Routing & Role-Based Access Control
- **🖥️ What to show (Screen):** Open `backend/src/routes/index.ts` to show how routes are grouped under `/api/v1`. Then, open `backend/src/middlewares/auth.middleware.ts` and highlight the `requireAuth` and `requireRole` functions.
- **🎙️ What to say (Voice-over):** 
  > "All our API routes are versioned and modular. Because ConveneHub serves different types of users, security is a priority. We have custom authentication middleware. The `requireAuth` function validates JWT access tokens, while `requireRole` acts as a guard, ensuring that only authorized users—like Admins or Organizers—can access sensitive financial or management endpoints."

### Scene 4: Database Models (MongoDB)
- **🖥️ What to show (Screen):** Open `backend/src/models/Event.ts` or `backend/src/models/Booking.ts`. Slowly scroll through the schema definition.
- **🎙️ What to say (Voice-over):** 
  > "For our database, we use MongoDB with Mongoose. Here is our Event model. It defines everything from ticket tiers and capacities to the lifecycle status of an event. Our database is heavily relational by design, intelligently linking Users, Events, Bookings, and Tickets together."

### Scene 5: Core Flows - Payments & Bookings
- **🖥️ What to show (Screen):** Open `backend/src/routes/payments.routes.ts`. Highlight the Razorpay order creation and webhook verification logic.
- **🎙️ What to say (Voice-over):** 
  > "The heart of ConveneHub is the booking and payment engine. When a user buys a ticket, we generate a Razorpay order. Once the payment is verified via Razorpay's API, the system automatically decrements the available ticket count, creates a unique booking record, and issues digital tickets with secure QR codes for the attendees."

---

## Part 3: The Frontend (React + Vite)

### Scene 6: Frontend Routing & Global Fetch
- **🖥️ What to show (Screen):** Open `frontend/src/App.tsx` showing the routes, and then switch to `frontend/src/main.tsx`. Highlight the block where `window.fetch` is being intercepted/overridden.
- **🎙️ What to say (Voice-over):** 
  > "Moving over to the frontend, we use React with Vite for blazing fast builds. Our routing directs users to public pages, authenticated dashboards, or the booking interface. A really cool architectural feature here is in `main.tsx`. We globally intercept the browser's `fetch` API. This allows us to automatically inject JWT bearer tokens into every request and handle token refreshes seamlessly in the background."

### Scene 7: The Data API Client Adapter
- **🖥️ What to show (Screen):** Open `frontend/lib/convene/client.ts`. Scroll through the `auth` methods and the `.from()` query builder.
- **🎙️ What to say (Voice-over):** 
  > "To keep our UI components clean, we built a custom API client adapter. This acts very much like a Supabase client, providing a clean abstraction over our REST API. It handles all the heavy lifting for authentication state, login logic, and data fetching across the entire application."

### Scene 8: User Interfaces - Booking & Dashboards
- **🖥️ What to show (Screen):** Open `frontend/components/events/event-booking-page.tsx`. Then briefly show `frontend/components/admin/admin-dashboard.tsx` or `frontend/components/organizer-team/organizer-team-dashboard.tsx`.
- **🎙️ What to say (Voice-over):** 
  > "On the UI side, we have dedicated, lazy-loaded components for different user journeys. The Event Booking Page provides a smooth checkout experience. Meanwhile, event organizers and admins have protected, data-rich dashboards where they can view real-time analytics, financial reconciliations, and manage their events."

### Scene 9: QR Code Check-in System
- **🖥️ What to show (Screen):** Open a check-in component, like `frontend/components/organizer-team/live-checkin.tsx` or the backend `backend/src/routes/checkins.routes.ts`.
- **🎙️ What to say (Voice-over):** 
  > "Finally, for event-day operations, we built a Live Check-in system. Organizers can use their devices to scan attendees' ticket QR codes. This hits our backend check-in endpoint to validate the secure QR payload in real-time. It prevents duplicate entries and updates live attendance stats instantly."

---

## Part 4: Conclusion

### Scene 10: Outro & Summary
- **🖥️ What to show (Screen):** Open the live deployed website in your browser, or show the `README.md` file in the editor.
- **🎙️ What to say (Voice-over):** 
  > "In summary, ConveneHub is a fully-featured, secure event management platform. From the scalable Node.js backend handling complex transactions to the responsive, role-based React frontend, every part of the stack is designed to handle real-world event ticketing, payments, and operations efficiently. Thank you for watching!"

---

### 💡 Tips for Recording Your Video:
1. **Preparation:** Have all the files mentioned in this script open in tabs at the top of your VS Code before you hit record. This saves you from searching for files on camera.
2. **Pacing:** When you switch to a new file, pause for a second before talking. Keep your scrolling slow and smooth so the viewer can read the code.
3. **Highlighting:** When the voice-over mentions a specific function (like `requireRole` or `RazorpayCheckout`), select that code block with your mouse so the viewer's eyes are drawn exactly to what you are talking about.
