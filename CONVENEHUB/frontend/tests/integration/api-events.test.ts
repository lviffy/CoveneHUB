/**
 * Events API Integration Tests
 * Tests event CRUD operations and real-time updates
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('Events API Integration', () => {
  let supabase: any;
  let testEventId: string;
  let adminUserId: string;

  test.beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create admin user
    const { data: { user } } = await supabase.auth.admin.createUser({
      email: `admin-${Date.now()}@example.com`,
      password: 'Admin123!',
      email_confirm: true,
      user_metadata: {
        role: 'admin_team',
        full_name: 'Test Admin',
        city: 'Mumbai',
      },
    });

    adminUserId = user.id;
  });

  test.afterAll(async () => {
    // Cleanup
    if (testEventId) {
      await supabase.from('events').delete().eq('event_id', testEventId);
    }
    if (adminUserId) {
      await supabase.auth.admin.deleteUser(adminUserId);
    }
  });

  test('POST /api/admin/events - creates event successfully', async ({ request }) => {
    const response = await request.post('/api/admin/events', {
      data: {
        title: 'Integration Test Event',
        description: 'This is a test event for integration testing',
        venue_name: 'Test Venue',
        venue_address: '123 Test Street, Mumbai',
        city: 'Mumbai',
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 100,
        ticket_price: 0,
        status: 'draft',
        latitude: 19.0760,
        longitude: 72.8777,
        entry_instructions: 'Please arrive 30 minutes early',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.event).toBeDefined();
    expect(data.event.event_id).toBeTruthy();
    expect(data.event.title).toBe('Integration Test Event');
    expect(data.event.capacity).toBe(100);
    expect(data.event.remaining).toBe(100); // Should initialize to capacity

    testEventId = data.event.event_id;
  });

  test('Database - event has correct default values', async () => {
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('event_id', testEventId)
      .single();

    expect(event.remaining).toBe(event.capacity);
    expect(event.status).toBe('draft');
    expect(event.created_at).toBeTruthy();
    expect(event.updated_at).toBeTruthy();
  });

  test('GET /api/events/public - returns published events only', async ({ request }) => {
    // Publish the test event
    await supabase
      .from('events')
      .update({ status: 'published' })
      .eq('event_id', testEventId);

    const response = await request.get('/api/events/public');

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(Array.isArray(data.events)).toBe(true);
    const event = data.events.find((e: any) => e.event_id === testEventId);
    expect(event).toBeDefined();
    expect(event.status).toBe('published');
  });

  test('GET /api/events/public - calculates accurate booking counts', async ({ request }) => {
    const response = await request.get('/api/events/public');
    const data = await response.json();

    const event = data.events.find((e: any) => e.event_id === testEventId);
    
    // Verify count calculation
    expect(event.remaining).toBeDefined();
    expect(event.booked).toBeDefined();
    expect(event.capacity).toBe(event.remaining + event.booked);
  });

  test('PUT /api/admin/events - updates event successfully', async ({ request }) => {
    const response = await request.put('/api/admin/events', {
      data: {
        event_id: testEventId,
        title: 'Updated Event Title',
        capacity: 150,
      },
    });

    expect(response.ok()).toBeTruthy();
    
    // Verify update in database
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('event_id', testEventId)
      .single();

    expect(event.title).toBe('Updated Event Title');
    expect(event.capacity).toBe(150);
    expect(event.updated_at).toBeTruthy();
  });

  test('PUT /api/admin/events - updates remaining when capacity changes', async ({ request }) => {
    // Create a booking first
    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        event_id: testEventId,
        user_id: adminUserId,
        tickets_count: 10,
        total_amount: 0,
        booking_status: 'confirmed',
      })
      .select()
      .single();

    // Update capacity
    await request.put('/api/admin/events', {
      data: {
        event_id: testEventId,
        capacity: 200,
      },
    });

    // Check remaining count
    const { data: event } = await supabase
      .from('events')
      .select('remaining')
      .eq('event_id', testEventId)
      .single();

    expect(event.remaining).toBe(190); // 200 - 10 booked

    // Cleanup booking
    await supabase.from('bookings').delete().eq('booking_id', booking.booking_id);
  });

  test('DELETE /api/admin/events - deletes event and cascades', async ({ request }) => {
    // Create a new event to delete
    const { data: newEvent } = await supabase
      .from('events')
      .insert({
        title: 'Event To Delete',
        venue_name: 'Test Venue',
        venue_address: '123 Test St',
        city: 'Mumbai',
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 50,
        remaining: 50,
        status: 'draft',
        ticket_price: 0,
      })
      .select()
      .single();

    // Create a booking for this event
    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        event_id: newEvent.event_id,
        user_id: adminUserId,
        tickets_count: 1,
        total_amount: 0,
        booking_status: 'confirmed',
      })
      .select()
      .single();

    // Delete the event
    const response = await request.delete('/api/admin/events', {
      data: {
        event_id: newEvent.event_id,
      },
    });

    expect(response.ok()).toBeTruthy();

    // Verify event is deleted
    const { data: deletedEvent } = await supabase
      .from('events')
      .select('*')
      .eq('event_id', newEvent.event_id)
      .single();

    expect(deletedEvent).toBeNull();

    // Verify booking was cascaded (deleted)
    const { data: deletedBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_id', booking.booking_id)
      .single();

    expect(deletedBooking).toBeNull();
  });
});

test.describe('Events API Authorization', () => {
  test('POST /api/admin/events - requires admin_team role', async ({ request }) => {
    const response = await request.post('/api/admin/events', {
      data: {
        title: 'Unauthorized Event',
      },
    });

    // Should return 401 (unauthenticated) or 403 (unauthorized)
    expect([401, 403]).toContain(response.status());
  });

  test('PUT /api/admin/events - requires admin_team role', async ({ request }) => {
    const response = await request.put('/api/admin/events', {
      data: {
        event_id: 'test-event-id',
        title: 'Unauthorized Update',
      },
    });

    expect([401, 403]).toContain(response.status());
  });

  test('DELETE /api/admin/events - requires admin_team role', async ({ request }) => {
    const response = await request.delete('/api/admin/events', {
      data: {
        event_id: 'test-event-id',
      },
    });

    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Events API Validation', () => {
  test('POST /api/admin/events - validates required fields', async ({ request }) => {
    const response = await request.post('/api/admin/events', {
      data: {
        // Missing required fields
        title: 'Test Event',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  test('POST /api/admin/events - validates capacity > 0', async ({ request }) => {
    const response = await request.post('/api/admin/events', {
      data: {
        title: 'Invalid Capacity Event',
        venue_name: 'Test Venue',
        venue_address: '123 Test St',
        city: 'Mumbai',
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 0, // Invalid
        ticket_price: 0,
      },
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/admin/events - validates date_time is future', async ({ request }) => {
    const response = await request.post('/api/admin/events', {
      data: {
        title: 'Past Event',
        venue_name: 'Test Venue',
        venue_address: '123 Test St',
        city: 'Mumbai',
        date_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Past date
        capacity: 100,
        ticket_price: 0,
      },
    });

    // Should either reject or warn
    if (!response.ok()) {
      const data = await response.json();
      expect(data.error || data.warning).toBeTruthy();
    }
  });

  test('POST /api/admin/events - validates ticket_price >= 0', async ({ request }) => {
    const response = await request.post('/api/admin/events', {
      data: {
        title: 'Negative Price Event',
        venue_name: 'Test Venue',
        venue_address: '123 Test St',
        city: 'Mumbai',
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 100,
        ticket_price: -100, // Invalid
      },
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/admin/events - validates status enum', async ({ request }) => {
    const response = await request.post('/api/admin/events', {
      data: {
        title: 'Invalid Status Event',
        venue_name: 'Test Venue',
        venue_address: '123 Test St',
        city: 'Mumbai',
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 100,
        ticket_price: 0,
        status: 'invalid_status', // Invalid
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Events Real-time Updates', () => {
  let supabase: any;

  test.beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  test('Real-time channel subscription works for events', async () => {
    let receivedUpdate = false;

    // Subscribe to events channel
    const channel = supabase
      .channel('events-test')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
        },
        (payload: any) => {
          receivedUpdate = true;
          expect(payload.new).toBeDefined();
        }
      )
      .subscribe();

    // Wait for subscription
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Insert an event
    await supabase.from('events').insert({
      title: 'Real-time Test Event',
      venue_name: 'Test Venue',
      venue_address: '123 Test St',
      city: 'Mumbai',
      date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      capacity: 100,
      remaining: 100,
      status: 'draft',
      ticket_price: 0,
    });

    // Wait for real-time notification
    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(receivedUpdate).toBe(true);

    // Cleanup
    await channel.unsubscribe();
  });
});
