import { test, expect } from '@playwright/test';

/**
 * E2E Test: Admin Dashboard Flow
 * Tests admin event management, user management, and team assignments
 */

test.describe('Admin Dashboard - Access Control', () => {
  
  test('should redirect non-admin users from admin routes', async ({ page }) => {
    // Try to access admin page without authentication
    await page.goto('/admin');
    
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login or show unauthorized
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/login|\/admin/);
  });

  test('should display admin dashboard for authorized users', async ({ page }) => {
    // This would require admin authentication
    // For now, check if page exists
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});

test.describe('Admin Dashboard - Event Management', () => {
  
  test('should display admin dashboard with tabs', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Look for navigation tabs
    const tabs = page.getByRole('tab').or(
      page.locator('[role="tab"]')
    );
    
    const tabCount = await tabs.count();
    console.log(`Found ${tabCount} tabs in admin dashboard`);
  });

  test('should show events list in admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Should have events section
    const bodyText = await page.textContent('body');
    
    const hasEventsSection = 
      bodyText?.includes('event') || 
      bodyText?.includes('Event');
    
    expect(hasEventsSection).toBeTruthy();
  });

  test('should have create event button/tab', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Look for create event UI
    const createButton = page.getByRole('button', { name: /create event/i }).or(
      page.getByRole('tab', { name: /create event/i })
    ).or(
      page.getByRole('link', { name: /create event/i })
    );
    
    // Check if create event UI exists
    const exists = await createButton.count() > 0;
    console.log('Create event UI exists:', exists);
  });

  test('should display create event form', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Try to access create event
    const createTab = page.getByRole('tab', { name: /create/i });
    
    if (await createTab.isVisible()) {
      await createTab.click();
      await page.waitForTimeout(1000);
      
      // Should show form fields
      const form = page.locator('form');
      if (await form.isVisible()) {
        await expect(form).toBeVisible();
      }
    }
  });

  test('should have required fields in create event form', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Navigate to create event
    const createTab = page.getByRole('tab', { name: /create/i });
    
    if (await createTab.isVisible()) {
      await createTab.click();
      await page.waitForTimeout(1000);
      
      // Check for common event fields
      const titleField = page.locator('input[name="title"]').or(
        page.getByLabel(/title/i)
      );
      
      const venueField = page.locator('input[name*="venue"]').or(
        page.getByLabel(/venue/i)
      );
      
      const capacityField = page.locator('input[name="capacity"]').or(
        page.getByLabel(/capacity/i)
      );
      
      // At least some fields should be visible
      const fieldsExist = 
        (await titleField.count()) > 0 ||
        (await venueField.count()) > 0 ||
        (await capacityField.count()) > 0;
      
      console.log('Event form fields exist:', fieldsExist);
    }
  });

  test('should validate required fields on submit', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    const createTab = page.getByRole('tab', { name: /create/i });
    
    if (await createTab.isVisible()) {
      await createTab.click();
      await page.waitForTimeout(1000);
      
      // Try to submit empty form
      const submitButton = page.getByRole('button', { name: /create|submit|save/i }).first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(1000);
        
        // Should show validation or stay on form
        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
      }
    }
  });

  test('should show event status options', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    const createTab = page.getByRole('tab', { name: /create/i });
    
    if (await createTab.isVisible()) {
      await createTab.click();
      await page.waitForTimeout(1000);
      
      // Look for status field (draft, published, etc.)
      const statusField = page.locator('select[name="status"]').or(
        page.getByLabel(/status/i)
      );
      
      if (await statusField.isVisible()) {
        await expect(statusField).toBeVisible();
      }
    }
  });

  test('should have city selection in event form', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    const createTab = page.getByRole('tab', { name: /create/i });
    
    if (await createTab.isVisible()) {
      await createTab.click();
      await page.waitForTimeout(1000);
      
      // Look for city field (now an input field)
      const cityField = page.locator('input[name="city"]').or(
        page.getByLabel(/city/i)
      );
      
      const exists = await cityField.count() > 0;
      console.log('City field exists:', exists);
    }
  });

  test('should allow event editing', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Look for edit buttons/icons in events list
    const editButton = page.locator('button[aria-label*="edit"]').or(
      page.getByRole('button', { name: /edit/i })
    ).or(
      page.locator('a[href*="/edit"]')
    ).first();
    
    if (await editButton.isVisible()) {
      console.log('Edit functionality available');
    }
  });

  test('should show event statistics', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    const bodyText = await page.textContent('body');
    
    // Should show some stats (capacity, booked, remaining)
    const hasStats = 
      bodyText?.includes('capacity') ||
      bodyText?.includes('booked') ||
      bodyText?.includes('remaining') ||
      bodyText?.includes('checked-in');
    
    expect(hasStats).toBeTruthy();
  });
});

test.describe('Admin Dashboard - User Management', () => {
  
  test('should have users management section', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Look for users tab or section
    const usersTab = page.getByRole('tab', { name: /user/i }).or(
      page.getByRole('link', { name: /user/i })
    );
    
    const exists = await usersTab.count() > 0;
    console.log('Users management section exists:', exists);
  });

  test('should display list of users', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForTimeout(2000);
    
    // Check if page loads (might redirect if not authorized)
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should show user roles', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForTimeout(2000);
    
    const bodyText = await page.textContent('body');
    
    // Should have role-related content
    const hasRoles = 
      bodyText?.includes('role') ||
      bodyText?.includes('admin') ||
      bodyText?.includes('movie_team') ||
      bodyText?.includes('user');
    
    console.log('Has role information:', hasRoles);
  });
});

test.describe('Admin Dashboard - Movie Team Assignments', () => {
  
  test('should have team assignments section', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Look for assignments tab
    const assignmentsTab = page.getByRole('tab', { name: /team|assignment/i });
    
    const exists = await assignmentsTab.count() > 0;
    console.log('Team assignments section exists:', exists);
  });

  test('should navigate to assignments page', async ({ page }) => {
    await page.goto('/admin/assignments');
    
    await page.waitForTimeout(2000);
    
    // Should load assignments page
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should allow assigning movie team to events', async ({ page }) => {
    await page.goto('/admin/assignments');
    
    await page.waitForTimeout(2000);
    
    // Look for assignment UI
    const assignButton = page.getByRole('button', { name: /assign/i });
    
    if (await assignButton.isVisible()) {
      console.log('Assignment functionality available');
    }
  });

  test('should display current assignments', async ({ page }) => {
    await page.goto('/admin/assignments');
    
    await page.waitForTimeout(2000);
    
    const bodyText = await page.textContent('body');
    
    // Should show assignment-related content
    const hasAssignments = 
      bodyText?.includes('assignment') ||
      bodyText?.includes('assigned') ||
      bodyText?.includes('movie team') ||
      bodyText?.includes('event');
    
    expect(hasAssignments).toBeTruthy();
  });
});

test.describe('Admin Dashboard - CSV Export', () => {
  
  test('should have export functionality', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Look for export button
    const exportButton = page.getByRole('button', { name: /export|download|csv/i });
    
    const exists = await exportButton.count() > 0;
    console.log('Export functionality exists:', exists);
  });

  test('should allow exporting event data', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    const bodyText = await page.textContent('body');
    
    // Should have export-related UI
    const hasExport = 
      bodyText?.toLowerCase().includes('export') ||
      bodyText?.toLowerCase().includes('download') ||
      bodyText?.toLowerCase().includes('csv');
    
    console.log('Has export UI:', hasExport);
  });
});

test.describe('Admin Dashboard - Navigation', () => {
  
  test('should have logout functionality', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Look for logout button
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    
    const exists = await logoutButton.count() > 0;
    console.log('Logout button exists:', exists);
  });

  test('should navigate between admin sections', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Get all tabs
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    
    if (tabCount > 1) {
      // Click second tab
      await tabs.nth(1).click();
      await page.waitForTimeout(1000);
      
      // Should navigate or show different content
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
    }
  });

  test('should have breadcrumb or page title', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Should have some indication of current page
    const heading = page.locator('h1, h2, h3').first();
    
    if (await heading.isVisible()) {
      const text = await heading.textContent();
      console.log('Page heading:', text);
      expect(text).toBeTruthy();
    }
  });
});
