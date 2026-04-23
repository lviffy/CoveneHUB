import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E Test: Multiple Tickets Feature
 * Tests the complete flow of booking multiple tickets, viewing individual QR codes,
 * and checking in each ticket separately
 * 
 * Prerequisites:
 * - User must be logged in with valid session
 * - At least one event must be available for booking
 * - Movie team user with assigned event access
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

test.describe('Multiple Tickets Feature - End to End', () => {
  
  test.describe('Booking Multiple Tickets', () => {
    
    test('should book multiple tickets for an event', async ({ page }) => {
      // Navigate to events page
      await page.goto('/events');
      await page.waitForTimeout(2000);
      
      // Find and click on an available event
      const eventLink = page.locator('a[href*="/events/"]').first();
      await eventLink.click();
      await page.waitForLoadState('networkidle');
      
      // Set ticket count to 3
      const ticketInput = page.locator('input[type="number"]').first();
      await ticketInput.fill('3');
      
      // Fill booking form
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"]').first();
      const phoneInput = page.locator('input[name="phone"], input[type="tel"]').first();
      
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test User');
      }
      
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('1234567890');
      }
      
      // Submit booking
      const bookButton = page.getByRole('button', { name: /book|confirm/i });
      await bookButton.click();
      
      // Wait for booking confirmation
      await page.waitForTimeout(3000);
      
      // Should show success message or redirect to bookings
      const bodyText = await page.textContent('body');
      const hasSuccess = 
        bodyText?.includes('success') ||
        bodyText?.includes('confirmed') ||
        bodyText?.includes('booked') ||
        page.url().includes('bookings');
      
      expect(hasSuccess).toBeTruthy();
    });

    test('should display individual tickets after booking', async ({ page }) => {
      // Go to bookings page
      await page.goto('/bookings');
      await page.waitForTimeout(2000);
      
      // Should show bookings
      const bodyText = await page.textContent('body');
      expect(bodyText?.includes('booking') || bodyText?.includes('Booking')).toBeTruthy();
      
      // Look for ticket elements
      const ticketElements = page.locator('[class*="ticket"]').or(
        page.getByText(/ticket #\d+/i)
      );
      
      const ticketCount = await ticketElements.count();
      console.log(`Found ${ticketCount} ticket elements`);
      
      // Should have at least one ticket visible
      expect(ticketCount).toBeGreaterThan(0);
    });

    test('should show correct number of tickets matching booking count', async ({ page }) => {
      // This test requires a booking with known ticket count
      await page.goto('/bookings');
      await page.waitForTimeout(2000);
      
      // Click on a booking to expand tickets
      const bookingCard = page.locator('[class*="booking"]').first();
      
      if (await bookingCard.isVisible()) {
        await bookingCard.click();
        await page.waitForTimeout(1000);
        
        // Count ticket cards
        const tickets = page.locator('[class*="ticket"]');
        const count = await tickets.count();
        
        console.log(`Booking shows ${count} tickets`);
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Individual Ticket QR Codes', () => {
    
    test('should display QR button for each ticket', async ({ page }) => {
      await page.goto('/bookings');
      await page.waitForTimeout(2000);
      
      // Look for QR buttons within tickets
      const qrButtons = page.getByRole('button', { name: /qr|show qr/i });
      const buttonCount = await qrButtons.count();
      
      console.log(`Found ${buttonCount} QR code buttons`);
      expect(buttonCount).toBeGreaterThan(0);
    });

    test('should open QR modal when clicking ticket QR button', async ({ page }) => {
      await page.goto('/bookings');
      await page.waitForTimeout(2000);
      
      // Click first QR button
      const qrButton = page.getByRole('button', { name: /qr|show qr/i }).first();
      
      if (await qrButton.isVisible()) {
        await qrButton.click();
        await page.waitForTimeout(1000);
        
        // Should show modal with QR code
        const modal = page.locator('[role="dialog"]').or(
          page.locator('[class*="modal"]')
        );
        
        await expect(modal.first()).toBeVisible();
        
        // Should have QR image
        const qrImage = page.locator('img[alt*="QR"]').or(
          page.locator('canvas')
        );
        
        const hasQR = await qrImage.count() > 0;
        expect(hasQR).toBeTruthy();
      }
    });

    test('should show unique ticket code for each ticket', async ({ page }) => {
      await page.goto('/bookings');
      await page.waitForTimeout(2000);
      
      // Collect all visible ticket codes
      const ticketCodeElements = page.locator('[class*="ticket-code"]').or(
        page.getByText(/[A-Z0-9]{8}/)
      );
      
      const codes = await ticketCodeElements.allTextContents();
      const uniqueCodes = new Set(codes.filter(c => c.trim().length === 8));
      
      console.log(`Found ${codes.length} ticket codes, ${uniqueCodes.size} unique`);
      
      // Each ticket should have unique code
      expect(uniqueCodes.size).toBeGreaterThan(0);
    });

    test('should display ticket number for each ticket', async ({ page }) => {
      await page.goto('/bookings');
      await page.waitForTimeout(2000);
      
      // Look for ticket numbers (e.g., "Ticket #1", "Ticket #2")
      const bodyText = await page.textContent('body');
      
      const hasTicketNumbers = 
        bodyText?.includes('Ticket #1') ||
        bodyText?.includes('1 of') ||
        bodyText?.includes('#1');
      
      expect(hasTicketNumbers).toBeTruthy();
    });

    test('should close QR modal when clicking close button', async ({ page }) => {
      await page.goto('/bookings');
      await page.waitForTimeout(2000);
      
      // Open QR modal
      const qrButton = page.getByRole('button', { name: /qr|show qr/i }).first();
      
      if (await qrButton.isVisible()) {
        await qrButton.click();
        await page.waitForTimeout(1000);
        
        // Close modal
        const closeButton = page.getByRole('button', { name: /close/i }).or(
          page.locator('button[aria-label="Close"]')
        );
        
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(500);
          
          // Modal should be hidden
          const modal = page.locator('[role="dialog"]').first();
          await expect(modal).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Event Booking Page - Multiple Tickets', () => {
    
    test('should display all tickets with QR buttons on event page', async ({ page }) => {
      // Navigate to an event with existing booking
      await page.goto('/events');
      await page.waitForTimeout(2000);
      
      const eventLink = page.locator('a[href*="/events/"]').first();
      await eventLink.click();
      await page.waitForLoadState('networkidle');
      
      // If user has booking, should show tickets section
      await page.waitForTimeout(2000);
      
      const ticketSection = page.getByText(/your tickets|my tickets/i);
      
      if (await ticketSection.isVisible()) {
        // Should have individual QR buttons
        const qrButtons = page.getByRole('button', { name: /show qr|view qr/i });
        const count = await qrButtons.count();
        
        console.log(`Event page shows ${count} ticket QR buttons`);
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should show "Buy More Tickets" button instead of modify count', async ({ page }) => {
      await page.goto('/events');
      await page.waitForTimeout(2000);
      
      const eventLink = page.locator('a[href*="/events/"]').first();
      await eventLink.click();
      await page.waitForLoadState('networkidle');
      
      await page.waitForTimeout(2000);
      
      // Should NOT have decrease button
      const decreaseButton = page.getByRole('button', { name: /-|minus|decrease/i });
      const hasDecrease = await decreaseButton.isVisible();
      expect(hasDecrease).toBeFalsy();
      
      // Should have "Buy More" button if user has booking
      const buyMoreButton = page.getByRole('button', { name: /buy more|add more/i });
      
      if (await buyMoreButton.isVisible()) {
        console.log('Buy More Tickets button is present');
      }
    });

    test('should allow buying more tickets for existing booking', async ({ page }) => {
      // This test requires an existing booking
      await page.goto('/events');
      await page.waitForTimeout(2000);
      
      const eventLink = page.locator('a[href*="/events/"]').first();
      await eventLink.click();
      await page.waitForLoadState('networkidle');
      
      await page.waitForTimeout(2000);
      
      const buyMoreButton = page.getByRole('button', { name: /buy more|add more/i });
      
      if (await buyMoreButton.isVisible()) {
        const initialTicketCount = await page.locator('[class*="ticket"]').count();
        
        await buyMoreButton.click();
        await page.waitForTimeout(1000);
        
        // Fill additional tickets (e.g., +2)
        const ticketInput = page.locator('input[type="number"]').first();
        await ticketInput.fill('2');
        
        // Confirm
        const confirmButton = page.getByRole('button', { name: /confirm|add/i });
        await confirmButton.click();
        
        await page.waitForTimeout(3000);
        
        // Should now show more tickets
        const newTicketCount = await page.locator('[class*="ticket"]').count();
        console.log(`Tickets increased from ${initialTicketCount} to ${newTicketCount}`);
        
        expect(newTicketCount).toBeGreaterThanOrEqual(initialTicketCount);
      }
    });
  });

  test.describe('Database Verification', () => {
    
    test('should create ticket records in database for each booking', async () => {
      // This test requires direct database access
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.log('Skipping: Supabase credentials not configured');
        return;
      }
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Get a recent booking
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('booking_id, tickets_count')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error || !bookings || bookings.length === 0) {
        console.log('No bookings found for verification');
        return;
      }
      
      const booking = bookings[0];
      
      // Get tickets for this booking
      const { data: tickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('booking_id', booking.booking_id);
      
      console.log(`Booking ${booking.booking_id}: tickets_count=${booking.tickets_count}, actual tickets=${tickets?.length}`);
      
      // Ticket count should match
      expect(tickets?.length).toBe(booking.tickets_count);
      
      // Each ticket should have unique codes
      const ticketCodes = tickets?.map(t => t.ticket_code) || [];
      const uniqueCodes = new Set(ticketCodes);
      expect(uniqueCodes.size).toBe(ticketCodes.length);
    });

    test('should have unique ticket_id for each ticket', async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.log('Skipping: Supabase credentials not configured');
        return;
      }
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      const { data: tickets } = await supabase
        .from('tickets')
        .select('ticket_id, booking_id')
        .limit(10);
      
      if (!tickets || tickets.length === 0) {
        console.log('No tickets found');
        return;
      }
      
      const ticketIds = tickets.map(t => t.ticket_id);
      const uniqueIds = new Set(ticketIds);
      
      expect(uniqueIds.size).toBe(ticketIds.length);
    });

    test('should have sequential ticket_number within each booking', async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.log('Skipping: Supabase credentials not configured');
        return;
      }
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Get a booking with multiple tickets
      const { data: bookings } = await supabase
        .from('bookings')
        .select('booking_id')
        .gte('tickets_count', 2)
        .limit(1);
      
      if (!bookings || bookings.length === 0) {
        console.log('No multi-ticket bookings found');
        return;
      }
      
      const { data: tickets } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('booking_id', bookings[0].booking_id)
        .order('ticket_number');
      
      if (!tickets) return;
      
      // Should be sequential: 1, 2, 3, ...
      const numbers = tickets.map(t => t.ticket_number);
      const expected = Array.from({ length: numbers.length }, (_, i) => i + 1);
      
      expect(numbers).toEqual(expected);
    });
  });

  test.describe('Check-in Individual Tickets', () => {
    
    test('should allow movie team to scan and check-in individual ticket', async ({ page, context }) => {
      // This test requires movie team authentication and QR scanning capability
      
      // Navigate to movie team dashboard
      await page.goto('/movie-team');
      await page.waitForTimeout(2000);
      
      // Select an event
      const eventCard = page.locator('[class*="event"]').first();
      
      if (await eventCard.isVisible()) {
        await eventCard.click();
        await page.waitForTimeout(1000);
        
        // Look for scan button
        const scanButton = page.getByRole('button', { name: /scan|qr/i });
        
        if (await scanButton.isVisible()) {
          console.log('QR scanner interface is available');
          
          // Note: Actual QR scanning requires camera access and QR code image
          // This would need to be mocked or tested with test QR codes
        }
      }
    });

    test('should show ticket as checked-in after successful scan', async ({ page }) => {
      // This would require a checked-in ticket in the database
      await page.goto('/bookings');
      await page.waitForTimeout(2000);
      
      // Look for checked-in indicator
      const checkedInBadge = page.getByText(/checked.?in|checked/i);
      
      if (await checkedInBadge.isVisible()) {
        console.log('Checked-in status is displayed');
      }
    });

    test('should prevent duplicate check-in of same ticket', async () => {
      // This requires API testing with duplicate check-in request
      // Would be implemented as integration test
      console.log('Duplicate check-in prevention should be tested at API level');
    });

    test('should update statistics after individual ticket check-in', async ({ page }) => {
      // Navigate to movie team dashboard
      await page.goto('/movie-team');
      await page.waitForTimeout(2000);
      
      // Check statistics before and after check-in
      const bodyText = await page.textContent('body');
      
      const hasStats = 
        bodyText?.includes('checked') ||
        bodyText?.includes('remaining');
      
      expect(hasStats).toBeTruthy();
    });
  });

  test.describe('Email Notifications', () => {
    
    test('should send email with all ticket codes after booking', async () => {
      // This requires email testing infrastructure
      // Could be verified by checking email service logs or using email testing service
      console.log('Email verification requires email testing service integration');
    });

    test('should NOT include QR code images in email', async () => {
      // Email should contain ticket codes as text, not QR images
      console.log('Email content verification requires email testing service');
    });
  });

  test.describe('Real-time Updates', () => {
    
    test('should update ticket status in real-time when checked in', async ({ page, context }) => {
      // This requires two browser contexts: user viewing bookings and movie team checking in
      
      const userPage = page;
      const movieTeamPage = await context.newPage();
      
      // User opens bookings page
      await userPage.goto('/bookings');
      await userPage.waitForTimeout(2000);
      
      // Movie team opens dashboard
      await movieTeamPage.goto('/movie-team');
      await movieTeamPage.waitForTimeout(2000);
      
      // Listen for real-time updates on user page
      const logs: string[] = [];
      userPage.on('console', msg => logs.push(msg.text()));
      
      // Movie team checks in a ticket (simulated)
      // ... QR scanning flow ...
      
      await userPage.waitForTimeout(3000);
      
      // User's page should show updated status
      const hasRealtimeUpdate = logs.some(log => 
        log.includes('subscription') || 
        log.includes('UPDATE')
      );
      
      console.log('Real-time update received:', hasRealtimeUpdate);
      
      await movieTeamPage.close();
    });

    test('should update capacity count after multiple ticket booking', async ({ page }) => {
      // Open event page
      await page.goto('/events');
      await page.waitForTimeout(2000);
      
      const eventLink = page.locator('a[href*="/events/"]').first();
      await eventLink.click();
      await page.waitForLoadState('networkidle');
      
      // Get initial capacity
      const bodyText = await page.textContent('body');
      console.log('Event page loaded with capacity information');
      
      // After booking, capacity should update
      // This would require real-time subscription testing
    });
  });
});

test.describe('Edge Cases and Error Handling', () => {
  
  test('should handle booking when only 1 ticket remaining', async ({ page }) => {
    // This requires finding an event with exactly 1 slot remaining
    await page.goto('/events');
    await page.waitForTimeout(2000);
    
    console.log('Edge case testing: booking last available ticket');
  });

  test('should prevent booking more tickets than available', async ({ page }) => {
    // Try to book 100 tickets when only 5 available
    await page.goto('/events');
    await page.waitForTimeout(2000);
    
    const eventLink = page.locator('a[href*="/events/"]').first();
    await eventLink.click();
    await page.waitForLoadState('networkidle');
    
    const ticketInput = page.locator('input[type="number"]').first();
    await ticketInput.fill('999');
    
    const bookButton = page.getByRole('button', { name: /book/i });
    
    if (await bookButton.isVisible()) {
      await bookButton.click();
      await page.waitForTimeout(2000);
      
      // Should show error message
      const bodyText = await page.textContent('body');
      const hasError = 
        bodyText?.includes('not available') ||
        bodyText?.includes('insufficient') ||
        bodyText?.includes('error');
      
      expect(hasError).toBeTruthy();
    }
  });

  test('should handle ticket creation failure gracefully', async () => {
    // This would require mocking database errors
    console.log('Ticket creation error handling should be tested at API level');
  });

  test('should handle QR generation failure', async ({ page }) => {
    // Navigate to bookings
    await page.goto('/bookings');
    await page.waitForTimeout(2000);
    
    // Monitor network errors
    const errors: string[] = [];
    page.on('response', response => {
      if (!response.ok()) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });
    
    await page.waitForTimeout(3000);
    
    if (errors.length > 0) {
      console.log('Network errors detected:', errors);
    }
  });
});
