# 🔒 Security Tests

Comprehensive security testing suite for ConveneHub application.

## Test Suites

### 1. `rls-policies.test.ts`
Tests Row Level Security (RLS) policies in Supabase database:
- ✅ User profile access restrictions
- ✅ Event CRUD permissions by role
- ✅ Booking ownership validation
- ✅ Audit log visibility

**Coverage:**
- 4 core tables: profiles, events, bookings, audit_logs
- 25+ RLS policy tests
- All CRUD operations (SELECT, INSERT, UPDATE, DELETE)

### 2. `role-access.test.ts`
Tests role-based access control (RBAC) at API level:
- ✅ User role restrictions
- ✅ Movie team role permissions
- ✅ ConveneHub team (admin) full access
- ✅ Unauthenticated request handling
- ✅ Cross-role access prevention

**Coverage:**
- 3 roles: user, movie_team, eon_team
- 30+ API endpoint tests
- Dashboard access control
- Action permission validation

### 3. `qr-validation.test.ts`
Tests QR code security and anti-fraud measures:
- ✅ QR code uniqueness
- ✅ QR code unpredictability
- ✅ Duplicate check-in prevention
- ✅ Cancelled booking rejection
- ✅ Wrong event validation
- ✅ Rate limiting
- ✅ Audit trail

**Coverage:**
- QR generation security
- Check-in validation
- Anti-fraud measures
- Rate limiting
- Manual check-in audit

## Running Security Tests

### Run all security tests:
```bash
npm run test:security
```

### Run specific test suite:
```bash
# RLS policies
npx playwright test tests/security/rls-policies.test.ts

# Role access control
npx playwright test tests/security/role-access.test.ts

# QR validation
npx playwright test tests/security/qr-validation.test.ts
```

### Run with UI (recommended for debugging):
```bash
npx playwright test tests/security --ui
```

## Test Requirements

### Environment Setup:
1. Create test users with different roles:
   ```sql
   -- User role
   INSERT INTO profiles (id, full_name, city, role, email)
   VALUES ('test-user-id', 'Test User', 'Mumbai', 'user', 'testuser@example.com');

   -- Movie team role
   INSERT INTO profiles (id, full_name, city, role, email)
   VALUES ('movie-team-id', 'Movie Team', 'Mumbai', 'movie_team', 'movieteam@example.com');

   -- ConveneHub team (admin) role
   INSERT INTO profiles (id, full_name, city, role, email)
   VALUES ('admin-id', 'Admin User', 'Mumbai', 'eon_team', 'admin@convenehub.com');
   ```

2. Set environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. Create test event:
   ```sql
   INSERT INTO events (event_id, title, venue_name, venue_address, city, date_time, capacity, remaining, status)
   VALUES ('test-event-id', 'Test Event', 'Test Venue', '123 Test St', 'Mumbai', NOW() + INTERVAL '7 days', 100, 100, 'published');
   ```

## Security Checklist

Before deploying to production, ensure:

### Database Security:
- [ ] RLS enabled on all tables
- [ ] Policies tested for all roles
- [ ] Service role key kept secret
- [ ] No public tables (except as intended)

### API Security:
- [ ] All endpoints check authentication
- [ ] Role-based authorization enforced
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented

### QR Code Security:
- [ ] Unique nonces per booking
- [ ] Validation prevents replay attacks
- [ ] Cancelled bookings rejected
- [ ] Event matching enforced
- [ ] Audit trail for all check-ins

### Authentication:
- [ ] Password strength requirements
- [ ] Email verification enabled
- [ ] Session management secure
- [ ] OAuth providers configured correctly

## Expected Test Results

All tests should **PASS** before production deployment.

### Critical Tests (must pass):
- ✅ Users cannot access admin endpoints
- ✅ Users cannot view other users' data
- ✅ QR codes cannot be duplicated
- ✅ Check-ins cannot be replayed
- ✅ Cancelled bookings are rejected

### Warning Signs (investigate if failing):
- ⚠️ Rate limiting not working
- ⚠️ Audit logs not recording
- ⚠️ Unauthenticated requests succeeding

## Troubleshooting

### Common Issues:

**"Cannot read properties of null"**
- Ensure test users exist in database
- Check authentication credentials
- Verify Supabase connection

**"Row level security policy violation"**
- This is expected for negative tests
- Verify RLS policies are enabled
- Check role assignments

**"404 Not Found"**
- Ensure test event exists
- Check API routes are deployed
- Verify URL paths are correct

**Tests timing out**
- Increase timeout in playwright.config.ts
- Check network connection
- Verify Supabase is accessible

## Next Steps

After all security tests pass:

1. ✅ Run integration tests
2. ✅ Perform manual security audit
3. ✅ Review audit logs
4. ✅ Test in staging environment
5. ✅ Deploy to production

## Security Best Practices

- 🔒 Never commit credentials to git
- 🔒 Rotate API keys regularly
- 🔒 Monitor audit logs for suspicious activity
- 🔒 Keep dependencies updated
- 🔒 Review RLS policies after schema changes
- 🔒 Test with real user scenarios

## Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Playwright Testing Guide](https://playwright.dev/docs/intro)
- [OWASP Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
