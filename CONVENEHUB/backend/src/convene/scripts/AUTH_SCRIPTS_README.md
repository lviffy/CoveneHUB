# Auth Diagnostic Scripts

Collection of scripts to diagnose and fix authentication issues in the ConveneHub application.

## Prerequisites

```bash
# Make sure you have .env.local configured with:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

## Scripts Overview

### 1. 🔍 `verify-db-state.js`
**Quick database health check**

```bash
node scripts/verify-db-state.js
```

Shows:
- Total profiles count
- Movie team members
- ConveneHub team members
- Recent auth users and their metadata

Use this for a quick snapshot of your database state.

---

### 2. 🧪 `test-auth-flow.js`
**Comprehensive auth configuration test**

```bash
node scripts/test-auth-flow.js
```

Checks:
- ✅ Redirect URLs configuration
- ✅ Database triggers
- ✅ Profiles table access
- ✅ Orphaned users (auth users without profiles)
- ✅ RLS policies

**Run this first** when debugging auth issues.

---

### 3. 🔧 `fix-orphaned-users.js`
**Fix users with confirmed emails but no profiles**

```bash
node scripts/fix-orphaned-users.js
```

This happens when:
- Database trigger fails
- Profile creation is interrupted
- Race conditions during signup

**Safe to run multiple times** - it will only create missing profiles.

---

### 4. 🪄 `test-magic-link.js`
**Magic link flow diagnostics**

```bash
node scripts/test-magic-link.js
```

Shows:
- Recent signup attempts
- Confirmation status
- Profile creation status
- Common magic link issues

Use when debugging email confirmation problems.

---

### 5. 📡 `monitor-auth.js`
**Real-time auth monitoring (live updates)**

```bash
node scripts/monitor-auth.js
```

**Best for live testing!** Refreshes every 3 seconds showing:
- 🆕 New signups
- ✅ Recent confirmations
- ⚠️ Orphaned users
- 📊 Live statistics

**Press Ctrl+C to stop**

---

## Common Issues & Solutions

### Issue: "Magic link not working"

**Symptoms:**
- User clicks email link
- Gets redirected to error page
- Shows "verification_failed"

**Diagnosis:**
```bash
node scripts/test-magic-link.js
```

**Common causes:**
1. ❌ **Token expired** (valid for 24 hours)
   - Solution: Request a new verification email
   
2. ❌ **Token already used** (one-time use)
   - Solution: User is already verified, just login
   
3. ❌ **Profile not created**
   - Solution: Run `node scripts/fix-orphaned-users.js`
   
4. ❌ **Wrong redirect URL**
   - Solution: Check Supabase Dashboard > Authentication > URL Configuration
   - Must include: `http://localhost:3000/**` and your production domain

---

### Issue: "Movie team login fails"

**Diagnosis:**
```bash
node scripts/verify-db-state.js
```

Check:
1. User has `role: movie_team` in profiles table
2. User email is confirmed
3. Profile exists for the user

**Fix:**
```bash
# If profile missing:
node scripts/fix-orphaned-users.js

# If role is wrong, update manually in Supabase dashboard
# or via admin panel
```

---

### Issue: "Google OAuth fails"

**Check:**
1. Redirect URLs in Supabase include `/auth/callback`
2. Google OAuth is enabled in Supabase Dashboard
3. OAuth callback saves correct role

**Monitor live:**
```bash
node scripts/monitor-auth.js
# Then try Google OAuth
# Watch for new signups and profile creation
```

---

## Testing Workflow

### Full Flow Test (Recommended)

**Terminal 1: Start server**
```bash
npm run dev
```

**Terminal 2: Monitor auth**
```bash
node scripts/monitor-auth.js
```

**Terminal 3: Available for checks**
```bash
# Quick check
node scripts/verify-db-state.js

# Fix issues
node scripts/fix-orphaned-users.js
```

**Browser: Test the flows**
1. Go to `http://localhost:3000/movie-team-login`
2. Try signup → watch Terminal 2 for activity
3. Check email → click magic link
4. Watch Terminal 2 for confirmation

---

## Automated Fixes

### Fix all orphaned users
```bash
node scripts/fix-orphaned-users.js
```

### Check for issues
```bash
node scripts/test-auth-flow.js
```

---

## Monitoring Production

For production, you can run these scripts with production credentials:

```bash
# Set production env vars
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-key"

# Run any script
node scripts/verify-db-state.js
```

**⚠️ Be careful with `fix-orphaned-users.js` in production**

---

## Debug Mode

All routes have enhanced logging. Check your terminal (where `npm run dev` runs) for:

- `[DEBUG]` - Detailed flow information
- `[INFO]` - Important events
- `[WARN]` - Potential issues
- `[ERROR]` - Failures with stack traces

---

## Support

If issues persist after running diagnostics:

1. Check `/auth/error` page for user-friendly error messages
2. Check server logs in terminal
3. Run `node scripts/test-auth-flow.js` for full report
4. Contact: technical@convenehub.in

---

## Quick Reference

```bash
# Health check
node scripts/verify-db-state.js

# Full diagnostics
node scripts/test-auth-flow.js

# Fix profiles
node scripts/fix-orphaned-users.js

# Test magic links
node scripts/test-magic-link.js

# Live monitor (best for testing)
node scripts/monitor-auth.js
```
