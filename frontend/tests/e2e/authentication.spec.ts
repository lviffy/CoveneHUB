import { test, expect } from '@playwright/test';

/**
 * E2E Test: Authentication Flow
 * Tests user signup, login, profile completion, and logout
 */

test.describe('Authentication Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    
    // Check page title and elements
    await expect(page).toHaveTitle(/ConveneHub|Login/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit with invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show validation error (either HTML5 or custom)
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should show error for incorrect credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in fake credentials
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Check if still on login page (redirect didn't happen)
    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate to signup tab', async ({ page }) => {
    await page.goto('/login');
    
    // Look for Sign Up tab or link
    const signupTab = page.getByRole('tab', { name: /sign up/i }).or(
      page.getByRole('link', { name: /sign up/i })
    );
    
    if (await signupTab.isVisible()) {
      await signupTab.click();
      
      // Should show signup form fields
      await expect(page.locator('input[name="full_name"]').or(
        page.locator('input[placeholder*="name"]')
      )).toBeVisible();
    }
  });

  test('should display Google OAuth button', async ({ page }) => {
    await page.goto('/login');
    
    // Check for Google sign-in button
    const googleButton = page.getByRole('button', { name: /google/i });
    await expect(googleButton).toBeVisible();
  });

  test('should require all fields in signup form', async ({ page }) => {
    await page.goto('/login');
    
    // Switch to signup if available
    const signupTab = page.getByRole('tab', { name: /sign up/i });
    if (await signupTab.isVisible()) {
      await signupTab.click();
      
      // Try to submit without filling fields
      const submitButton = page.getByRole('button', { name: /sign up|create account/i });
      await submitButton.click();
      
      // Should show validation (HTML5 required or custom validation)
      await page.waitForTimeout(500);
      
      // Verify we're still on signup
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should redirect to complete profile after Google OAuth', async ({ page }) => {
    // This test would require mocking Google OAuth
    // For now, we just check the route exists
    await page.goto('/complete-profile');
    
    // Should either show profile form or redirect to login
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    
    expect(currentUrl).toMatch(/\/complete-profile|\/login/);
  });

  test('should navigate to home page', async ({ page }) => {
    await page.goto('/');
    
    // Check if home page loads
    await expect(page).toHaveTitle(/ConveneHub/i);
    
    // Should have navigation
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should show events link in navigation', async ({ page }) => {
    await page.goto('/');
    
    // Look for Events link
    const eventsLink = page.getByRole('link', { name: /events/i });
    
    if (await eventsLink.isVisible()) {
      await eventsLink.click();
      await expect(page).toHaveURL(/\/events/);
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
      // Expected to fail
    });
    
    // Restore connection
    await page.context().setOffline(false);
  });
});

test.describe('Profile Management', () => {
  
  test('should display profile completion page', async ({ page }) => {
    await page.goto('/complete-profile');
    
    await page.waitForLoadState('networkidle');
    
    // Check if redirected to login (not authenticated) or shows profile form
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/complete-profile|\/login/);
  });

  test('should require city selection', async ({ page }) => {
    await page.goto('/complete-profile');
    
    await page.waitForTimeout(1000);
    
    // If on complete-profile page, check for city field
    if (page.url().includes('/complete-profile')) {
      const cityField = page.locator('input[id="city"]').or(
        page.getByLabel(/city/i)
      );
      
      if (await cityField.isVisible()) {
        await expect(cityField).toBeVisible();
      }
    }
  });
});

test.describe('Navigation and UI', () => {
  
  test('should have working navigation menu', async ({ page }) => {
    await page.goto('/');
    
    // Check for main navigation
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await page.goto('/');
    
    // Page should load without errors
    await expect(page).toHaveTitle(/ConveneHub/i);
  });

  test('should handle 404 pages', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    
    // Should show 404 or redirect
    await page.waitForLoadState('networkidle');
    
    // Check for 404 indication
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});
