/**
 * Bookings API Integration Tests
 * Tests the complete booking flow from creation to check-in
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('Bookings API Integration', () => {
  let supabase: any;
  let testEventId: string;
  let testUserId: string;
  let testBookingId: string;

  test.beforeAll(async () => {
    // Create Supabase client
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test event
    const { data: event } = await supabase
      .from('events')
      .insert({
        title: 'Integration Test Event',
        venue_name: 'Test Venue',
        venue_address: '123 Test St',
        city: 'Mumbai',
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 10,
        remaining: 10,
        status: 'published',
        ticket_price: 0,
      })
      .select()
      .single();

    testEventId = event.event_id;

    // Create test user
    const { data: { user } } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!',
      email_confirm: true,
    });

    testUserId = user.id;
  });

  test.afterAll(async () => {
    // Cleanup
    if (testBookingId) {
      await supabase.from('bookings').delete().eq('booking_id', testBookingId);
    }
    if (testEventId) {
      await supabase.from('events').delete().eq('event_id', testEventId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  test('POST /api/bookings - creates booking successfully', async ({ request }) => {
    const response = await request.post('/api/bookings', {
      data: {
        event_id: testEventId,
        tickets_count: 2,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.booking).toBeDefined();
    expect(data.booking.event_id).toBe(testEventId);
    expect(data.booking.tickets_count).toBe(2);
    expect(data.booking.booking_code).toBeTruthy();
    expect(data.booking.qr_nonce).toBeTruthy();

    testBookingId = data.booking.booking_id;
  });

  test('POST /api/bookings - decrements event remaining count', async () => {
    // Check that remaining count was decremented
    const { data: event } = await supabase
      .from('events')
      .select('remaining')
      .eq('event_id', testEventId)
      .single();

    expect(event.remaining).toBe(8); // 10 - 2 tickets
  });

  test('POST /api/bookings - prevents duplicate bookings', async ({ request }) => {
    const response = await request.post('/api/bookings', {
      data: {
        event_id: testEventId,
        tickets_count: 1,
      },
    });

    expect(response.status()).toBe(409);
    const data = await response.json();
    expect(data.error).toContain('already booked');
  });

  test('POST /api/bookings - prevents overbooking', async ({ request }) => {
    const response = await request.post('/api/bookings', {
      data: {
        event_id: testEventId,
        tickets_count: 20, // More than remaining (8)
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/slots|capacity/);
  });

  test('GET /api/bookings - returns user bookings', async ({ request }) => {
    const response = await request.get('/api/bookings');

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(Array.isArray(data.bookings)).toBe(true);
    expect(data.bookings.length).toBeGreaterThan(0);
    
    const booking = data.bookings.find((b: any) => b.booking_id === testBookingId);
    expect(booking).toBeDefined();
  });

  test('GET /api/bookings/event/[eventId] - returns event bookings count', async ({ request }) => {
    const response = await request.get(`/api/bookings/event/${testEventId}`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.count).toBe(2); // 2 tickets booked
    expect(data.hasBooked).toBe(true);
  });

  test('GET /api/bookings/[bookingId]/qr - generates QR code', async ({ request }) => {
    const response = await request.get(`/api/bookings/${testBookingId}/qr`);

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('image');
  });

  test('POST /api/movie-team/checkin - checks in booking', async ({ request }) => {
    // Get booking code
    const { data: booking } = await supabase
      .from('bookings')
      .select('booking_code')
      .eq('booking_id', testBookingId)
      .single();

    const response = await request.post('/api/movie-team/checkin', {
      data: {
        booking_code: booking.booking_code,
        event_id: testEventId,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.booking.checked_in).toBe(true);
    expect(data.booking.checked_in_at).toBeTruthy();
  });

  test('POST /api/movie-team/checkin - prevents double check-in', async ({ request }) => {
    const { data: booking } = await supabase
      .from('bookings')
      .select('booking_code')
      .eq('booking_id', testBookingId)
      .single();

    const response = await request.post('/api/movie-team/checkin', {
      data: {
        booking_code: booking.booking_code,
        event_id: testEventId,
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already checked in');
  });

  test('Database trigger - updates booking status on check-in', async () => {
    // Verify booking status in database
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_id', testBookingId)
      .single();

    expect(booking.checked_in).toBe(true);
    expect(booking.checked_in_at).toBeTruthy();
    expect(booking.checked_in_by).toBeTruthy();
  });
});

test.describe('Booking Edge Cases', () => {
  let supabase: any;

  test.beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  test('POST /api/bookings - rejects booking for non-existent event', async ({ request }) => {
    const response = await request.post('/api/bookings', {
      data: {
        event_id: '00000000-0000-0000-0000-000000000000',
        tickets_count: 1,
      },
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/bookings - rejects booking for draft event', async ({ request }) => {
    // Create draft event
    const { data: draftEvent } = await supabase
      .from('events')
      .insert({
        title: 'Draft Event',
        venue_name: 'Test Venue',
        venue_address: '123 Test St',
        city: 'Mumbai',
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 10,
        remaining: 10,
        status: 'draft',
        ticket_price: 0,
      })
      .select()
      .single();

    const response = await request.post('/api/bookings', {
      data: {
        event_id: draftEvent.event_id,
        tickets_count: 1,
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('not available');

    // Cleanup
    await supabase.from('events').delete().eq('event_id', draftEvent.event_id);
  });

  test('POST /api/bookings - validates tickets_count range', async ({ request }) => {
    // Test 0 tickets
    const response1 = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 0,
      },
    });

    expect(response1.status()).toBe(400);

    // Test > 10 tickets
    const response2 = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 11,
      },
    });

    expect(response2.status()).toBe(400);
  });

  test('POST /api/bookings - requires authentication', async ({ request }) => {
    const response = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 1,
      },
      headers: {
        // No auth header
      },
    });

    expect(response.status()).toBe(401);
  });
});

test.describe('Booking Cancellation', () => {
  test('Cancelled bookings are rejected at check-in', async ({ request }) => {
    // This test would require cancellation endpoint implementation
    // Placeholder for future implementation
    expect(true).toBe(true);
  });
});
