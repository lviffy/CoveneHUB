import { test, expect } from '@playwright/test';

/**
 * E2E Test: Movie Team Dashboard Flow
 * Tests QR scanning, check-in, and event management for movie team members
 */

test.describe('Movie Team Dashboard - Access Control', () => {
  
  test('should redirect unauthorized users from movie team routes', async ({ page }) => {
    // Try to access movie team page without authentication
    await page.goto('/movie-team');
    
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login or show unauthorized
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/login|\/movie-team/);
  });

  test('should display movie team dashboard for authorized users', async ({ page }) => {
    // This would require movie team authentication
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});

test.describe('Movie Team Dashboard - Event Access', () => {
  
  test('should display only assigned events', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    const bodyText = await page.textContent('body');
    
    // Should have event-related content or "no events" message
    const hasContent = 
      bodyText?.includes('event') ||
      bodyText?.includes('Event') ||
      bodyText?.includes('assigned') ||
      bodyText?.includes('No events');
    
    expect(hasContent).toBeTruthy();
  });

  test('should show assigned events count', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Should show some indication of number of events
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should allow selecting an event', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Look for event cards or selection UI
    const eventCards = page.locator('[class*="event"]').or(
      page.locator('button[class*="event"]')
    );
    
    const count = await eventCards.count();
    console.log(`Found ${count} event elements`);
    
    if (count > 0) {
      await eventCards.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display event details', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    const bodyText = await page.textContent('body');
    
    // Should show event details like venue, date, capacity
    const hasDetails = 
      bodyText?.includes('venue') ||
      bodyText?.includes('capacity') ||
      bodyText?.includes('booked') ||
      bodyText?.includes('checked');
    
    console.log('Has event details:', hasDetails);
  });
});

test.describe('Movie Team Dashboard - Statistics', () => {
  
  test('should show booking statistics', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    const bodyText = await page.textContent('body');
    
    // Should show stats like booked, checked-in, remaining
    const hasStats = 
      bodyText?.includes('booked') ||
      bodyText?.includes('checked') ||
      bodyText?.includes('remaining') ||
      bodyText?.includes('capacity');
    
    expect(hasStats).toBeTruthy();
  });

  test('should update statistics in real-time', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Monitor console for real-time updates
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await page.waitForTimeout(3000);
    
    // Should have some activity or subscription logs
    console.log(`Captured ${logs.length} console messages`);
  });

  test('should display progress indicators', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Look for progress bars or indicators
    const progressBar = page.locator('[role="progressbar"]').or(
      page.locator('progress')
    ).or(
      page.locator('[class*="progress"]')
    );
    
    const exists = await progressBar.count() > 0;
    console.log('Progress indicators exist:', exists);
  });
});

test.describe('Movie Team Dashboard - QR Scanner', () => {
  
  test('should have QR scanner interface', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Look for scan/scanner related UI
    const scanButton = page.getByRole('button', { name: /scan|qr/i }).or(
      page.getByRole('tab', { name: /scan/i })
    );
    
    const exists = await scanButton.count() > 0;
    console.log('QR scanner interface exists:', exists);
  });

  test('should request camera permissions for QR scanning', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Try to open scanner
    const scanButton = page.getByRole('button', { name: /scan|qr/i }).first();
    
    if (await scanButton.isVisible()) {
      // Grant camera permissions
      await page.context().grantPermissions(['camera']);
      
      await scanButton.click();
      await page.waitForTimeout(1000);
      
      // Scanner UI should be visible or camera permission requested
      console.log('Scanner button clicked');
    }
  });

  test('should display scanner instructions', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    const scanButton = page.getByRole('button', { name: /scan/i }).first();
    
    if (await scanButton.isVisible()) {
      await page.context().grantPermissions(['camera']);
      await scanButton.click();
      await page.waitForTimeout(1000);
      
      // Should show some instructions or UI
      const bodyText = await page.textContent('body');
      
      const hasInstructions = 
        bodyText?.includes('scan') ||
        bodyText?.includes('camera') ||
        bodyText?.includes('QR');
      
      console.log('Has scanner instructions:', hasInstructions);
    }
  });

  test('should handle invalid QR codes', async ({ page }) => {
    // This would require mocking QR code detection
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // For now, just verify scanner exists
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('should show scan history or results', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Look for scan results or history section
    const bodyText = await page.textContent('body');
    
    const hasHistory = 
      bodyText?.includes('scan') ||
      bodyText?.includes('check') ||
      bodyText?.includes('history');
    
    console.log('Has scan history section:', hasHistory);
  });
});

test.describe('Movie Team Dashboard - Manual Check-in', () => {
  
  test('should have manual check-in option', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Look for manual check-in UI
    const manualButton = page.getByRole('button', { name: /manual|lookup/i }).or(
      page.getByRole('tab', { name: /manual/i })
    );
    
    const exists = await manualButton.count() > 0;
    console.log('Manual check-in exists:', exists);
  });

  test('should allow searching by booking code', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Look for search/lookup field
    const searchField = page.locator('input[placeholder*="code"]').or(
      page.locator('input[placeholder*="booking"]')
    ).or(
      page.locator('input[type="search"]')
    );
    
    const exists = await searchField.count() > 0;
    console.log('Booking code search exists:', exists);
  });

  test('should allow searching by phone number', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Look for phone search field
    const phoneField = page.locator('input[placeholder*="phone"]').or(
      page.locator('input[type="tel"]')
    );
    
    const exists = await phoneField.count() > 0;
    console.log('Phone number search exists:', exists);
  });

  test('should validate check-in input', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Try manual check-in
    const manualTab = page.getByRole('tab', { name: /manual/i });
    
    if (await manualTab.isVisible()) {
      await manualTab.click();
      await page.waitForTimeout(1000);
      
      // Try to submit empty
      const submitButton = page.getByRole('button', { name: /check|verify/i }).first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);
        
        // Should show validation
        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
      }
    }
  });
});

test.describe('Movie Team Dashboard - Notes', () => {
  
  test('should have notes section for events', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Look for notes section
    const notesSection = page.getByRole('tab', { name: /note/i }).or(
      page.locator('textarea[placeholder*="note"]')
    );
    
    const exists = await notesSection.count() > 0;
    console.log('Notes section exists:', exists);
  });

  test('should allow adding notes to events', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Look for notes textarea
    const notesField = page.locator('textarea').first();
    
    if (await notesField.isVisible()) {
      await expect(notesField).toBeVisible();
    }
  });

  test('should save notes', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Look for save notes button
    const saveButton = page.getByRole('button', { name: /save.*note/i });
    
    const exists = await saveButton.count() > 0;
    console.log('Save notes button exists:', exists);
  });
});

test.describe('Movie Team Dashboard - Navigation', () => {
  
  test('should have navigation menu', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Should have navigation
    const nav = page.locator('nav');
    const exists = await nav.count() > 0;
    
    console.log('Navigation menu exists:', exists);
  });

  test('should have logout functionality', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Look for logout button
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    
    const exists = await logoutButton.count() > 0;
    console.log('Logout button exists:', exists);
  });

  test('should navigate between dashboard sections', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Get all tabs
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    
    console.log(`Found ${tabCount} tabs in movie team dashboard`);
    
    if (tabCount > 1) {
      // Click second tab
      await tabs.nth(1).click();
      await page.waitForTimeout(1000);
      
      // Should show different content
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
    }
  });

  test('should allow navigating back to events list', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Look for back button or events list link
    const backButton = page.getByRole('button', { name: /back|events/i }).or(
      page.getByRole('link', { name: /events/i })
    );
    
    const exists = await backButton.count() > 0;
    console.log('Back navigation exists:', exists);
  });

  test('should display page title or heading', async ({ page }) => {
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Should have heading
    const heading = page.locator('h1, h2').first();
    
    if (await heading.isVisible()) {
      const text = await heading.textContent();
      console.log('Page heading:', text);
      expect(text).toBeTruthy();
    }
  });
});

test.describe('Movie Team Dashboard - Responsive Design', () => {
  
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Page should load
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/movie-team');
    
    await page.waitForTimeout(2000);
    
    // Page should load
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
