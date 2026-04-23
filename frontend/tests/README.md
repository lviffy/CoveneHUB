# E2E Testing with Playwright

## Overview

This directory contains End-to-End tests for the ConveneHub ticket booking application using Playwright.

## Test Structure

```
tests/
├── e2e/                          # E2E test files
│   ├── authentication.spec.ts    # Login, signup, profile tests
│   ├── booking-flow.spec.ts      # Event viewing and booking tests
│   ├── admin-flow.spec.ts        # Admin dashboard tests
│   └── movie-team-flow.spec.ts   # Movie team dashboard tests
├── helpers/                      # Test utilities
│   └── test-helpers.ts          # Helper functions and test data
└── fixtures/                     # Test data and mocks
```

## Running Tests

### Prerequisites

1. Ensure your development server is running or will be started automatically
2. Set up test environment variables in `.env.local`

### Commands

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests with UI mode (recommended for development)
npm run test:e2e:ui

# Run tests with browser visible
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# View last test report
npm run test:e2e:report

# Run specific test file
npx playwright test authentication

# Run tests matching a pattern
npx playwright test --grep "should login"

# Run only chromium tests
npx playwright test --project=chromium

# Run only mobile tests
npx playwright test --project="Mobile Chrome"
```

## Test Files

### 1. authentication.spec.ts
Tests user authentication flows:
- Login page display and validation
- Signup form validation
- Google OAuth integration
- Profile completion
- Navigation and error handling

### 2. booking-flow.spec.ts
Tests public user booking journey:
- Events listing page
- Event detail page display
- Capacity and availability
- Booking form interaction
- Real-time updates
- Event filtering

### 3. admin-flow.spec.ts
Tests admin dashboard functionality:
- Access control
- Event management (CRUD)
- User management
- Movie team assignments
- CSV export
- Navigation

### 4. movie-team-flow.spec.ts
Tests movie team dashboard:
- Access control
- Assigned events display
- QR code scanning
- Manual check-in
- Event statistics
- Notes functionality

## Configuration

### playwright.config.ts

- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **Retries**: 2 on CI, 0 locally
- **Timeout**: Default 30s per test
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On first retry

## Writing New Tests

### Basic Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/path');
    
    // Your test actions
    await page.click('button');
    
    // Assertions
    await expect(page).toHaveURL('/expected-path');
  });
});
```

### Using Test Helpers

```typescript
import { TestHelpers, TestData } from '../helpers/test-helpers';

test('should login', async ({ page }) => {
  const email = TestData.generateEmail();
  await TestHelpers.loginAsAdmin(page, email, 'password');
  
  expect(await TestHelpers.isAuthenticated(page)).toBeTruthy();
});
```

## Best Practices

### 1. Independent Tests
- Each test should be independent
- Don't rely on execution order
- Clean up after tests

### 2. Stable Selectors
- Use `getByRole`, `getByLabel`, `getByText` when possible
- Avoid brittle CSS selectors
- Use test IDs for complex elements

### 3. Wait for Elements
```typescript
// Good
await page.getByRole('button', { name: 'Submit' }).click();

// Also good
await page.waitForSelector('[data-testid="submit"]');

// Avoid
await page.waitForTimeout(5000); // Use only when necessary
```

### 4. Assertions
```typescript
// Good
await expect(page.getByText('Success')).toBeVisible();

// Also good
await expect(page).toHaveURL(/success/);

// Check multiple conditions
await expect(page.locator('.error')).toHaveCount(0);
```

### 5. Error Handling
```typescript
test('should handle errors', async ({ page }) => {
  await page.goto('/events');
  
  // Capture console errors
  const errors = TestHelpers.captureConsoleErrors(page);
  
  // Your test actions
  
  expect(errors.length).toBe(0);
});
```

## Debugging Tests

### Visual Debugging
```bash
# Open Playwright Inspector
npm run test:e2e:debug

# Run with headed browser
npm run test:e2e:headed

# Use UI mode (best for debugging)
npm run test:e2e:ui
```

### Console Output
```typescript
test('debug test', async ({ page }) => {
  // Enable verbose logging
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  // Take screenshots
  await page.screenshot({ path: 'debug.png' });
  
  // Get element details
  const element = await page.locator('.class');
  console.log(await element.textContent());
});
```

### Network Debugging
```typescript
test('debug network', async ({ page }) => {
  // Log all requests
  page.on('request', request => 
    console.log('REQUEST:', request.method(), request.url())
  );
  
  // Log all responses
  page.on('response', response =>
    console.log('RESPONSE:', response.status(), response.url())
  );
});
```

## Authentication Testing

### Test Users
For testing, you'll need test accounts:

```typescript
// In your tests
const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'test123'
  },
  movieTeam: {
    email: 'team@test.com',
    password: 'test123'
  },
  user: {
    email: 'user@test.com',
    password: 'test123'
  }
};
```

### Reusing Authentication
```typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'test123');
  await page.click('button[type="submit"]');
  
  // Save authentication state
  await page.context().storageState({ 
    path: 'tests/.auth/admin.json' 
  });
});
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Coverage

Current test coverage:
- ✅ Authentication flows
- ✅ Event browsing
- ✅ Admin dashboard UI
- ✅ Movie team dashboard UI
- ⚠️ Booking submission (requires auth)
- ⚠️ QR scanning (requires camera)
- ⚠️ Payment flow (Phase 2)

## Troubleshooting

### Common Issues

**1. Tests timeout**
```bash
# Increase timeout in config
timeout: 60000 // 60 seconds
```

**2. Element not found**
```typescript
// Wait for element explicitly
await page.locator('.element').waitFor({ state: 'visible' });
```

**3. Flaky tests**
```typescript
// Add stable waits
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000); // Last resort
```

**4. Authentication issues**
```bash
# Clear stored auth state
rm -rf tests/.auth
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Selectors](https://playwright.dev/docs/selectors)

## Support

For issues or questions:
1. Check existing test files for examples
2. Review Playwright documentation
3. Ask in team chat
4. Create an issue in the repo
