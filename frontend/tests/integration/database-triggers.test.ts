/**
 * Database Triggers and Functions Integration Tests
 * Tests database triggers, functions, and constraints
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('Database Triggers - User Profile Creation', () => {
  let supabase: any;
  let testUserId: string;

  test.beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  test.afterAll(async () => {
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  test('handle_new_user trigger creates profile on signup', async () => {
    // Create a new user
    const { data: { user }, error } = await supabase.auth.admin.createUser({
      email: `trigger-test-${Date.now()}@example.com`,
      password: 'Test123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Trigger Test User',
        city: 'Mumbai',
        role: 'user',
      },
    });

    expect(error).toBeNull();
    expect(user).toBeDefined();
    testUserId = user.id;

    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if profile was created
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toBeDefined();
    expect(profile.full_name).toBe('Trigger Test User');
    expect(profile.city).toBeTruthy(); // City can be any value
    expect(profile.role).toBe('user');
  });

  test('profile creation uses default values for missing metadata', async () => {
    const { data: { user } } = await supabase.auth.admin.createUser({
      email: `default-test-${Date.now()}@example.com`,
      password: 'Test123!',
      email_confirm: true,
      // No user_metadata provided
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    expect(profile.full_name).toBeTruthy(); // Should have default
    expect(profile.city).toBeTruthy(); // Should have default
    expect(profile.role).toBe('user'); // Default role

    // Cleanup
    await supabase.auth.admin.deleteUser(user.id);
  });
});

test.describe('Database Functions - Booking Creation', () => {
  let supabase: any;
  let testEventId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test event
    const { data: event } = await supabase
      .from('events')
      .insert({
        title: 'Function Test Event',
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
      email: `function-test-${Date.now()}@example.com`,
      password: 'Test123!',
      email_confirm: true,
    });

    testUserId = user.id;
  });

  test.afterAll(async () => {
    if (testEventId) {
      await supabase.from('events').delete().eq('event_id', testEventId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  test('create_booking function creates booking and decrements remaining', async () => {
    const initialRemaining = 10;

    // Call create_booking function
    const { data, error } = await supabase
      .rpc('create_booking', {
        p_event_id: testEventId,
        p_user_id: testUserId,
        p_tickets_count: 3,
      });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // Check event remaining count
    const { data: event } = await supabase
      .from('events')
      .select('remaining')
      .eq('event_id', testEventId)
      .single();

    expect(event.remaining).toBe(initialRemaining - 3);
  });

  test('create_booking function prevents duplicate bookings', async () => {
    // Try to create duplicate booking
    const { error } = await supabase
      .rpc('create_booking', {
        p_event_id: testEventId,
        p_user_id: testUserId,
        p_tickets_count: 1,
      });

    expect(error).toBeDefined();
    expect(error.message).toContain('already booked');
  });

  test('create_booking function prevents overbooking', async () => {
    // Create a new user to test overbooking
    const { data: { user } } = await supabase.auth.admin.createUser({
      email: `overbook-test-${Date.now()}@example.com`,
      password: 'Test123!',
      email_confirm: true,
    });

    const { error } = await supabase
      .rpc('create_booking', {
        p_event_id: testEventId,
        p_user_id: user.id,
        p_tickets_count: 20, // More than remaining (7)
      });

    expect(error).toBeDefined();
    expect(error.message).toContain('Not enough slots');

    // Cleanup
    await supabase.auth.admin.deleteUser(user.id);
  });

  test('create_booking function validates event status', async () => {
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

    const { data: { user } } = await supabase.auth.admin.createUser({
      email: `draft-test-${Date.now()}@example.com`,
      password: 'Test123!',
      email_confirm: true,
    });

    const { error } = await supabase
      .rpc('create_booking', {
        p_event_id: draftEvent.event_id,
        p_user_id: user.id,
        p_tickets_count: 1,
      });

    expect(error).toBeDefined();
    expect(error.message).toContain('not available for booking');

    // Cleanup
    await supabase.from('events').delete().eq('event_id', draftEvent.event_id);
    await supabase.auth.admin.deleteUser(user.id);
  });
});

test.describe('Database Constraints', () => {
  let supabase: any;

  test.beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  test('events table enforces capacity > 0 constraint', async () => {
    const { error } = await supabase
      .from('events')
      .insert({
        title: 'Invalid Capacity Event',
        venue_name: 'Test Venue',
        venue_address: '123 Test St',
        city: 'Mumbai',
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 0, // Invalid
        remaining: 0,
        status: 'draft',
        ticket_price: 0,
      });

    expect(error).toBeDefined();
    expect(error.message).toContain('constraint');
  });

  test('events table enforces remaining >= 0 constraint', async () => {
    const { error } = await supabase
      .from('events')
      .insert({
        title: 'Negative Remaining Event',
        venue_name: 'Test Venue',
        venue_address: '123 Test St',
        city: 'Mumbai',
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 100,
        remaining: -1, // Invalid
        status: 'draft',
        ticket_price: 0,
      });

    expect(error).toBeDefined();
  });

  test('bookings table enforces tickets_count > 0 constraint', async () => {
    const { error } = await supabase
      .from('bookings')
      .insert({
        event_id: '00000000-0000-0000-0000-000000000000',
        user_id: '00000000-0000-0000-0000-000000000000',
        tickets_count: 0, // Invalid
        total_amount: 0,
        booking_status: 'confirmed',
      });

    expect(error).toBeDefined();
  });

  test('profiles table enforces role enum constraint', async () => {
    const { data: { user } } = await supabase.auth.admin.createUser({
      email: `role-test-${Date.now()}@example.com`,
      password: 'Test123!',
      email_confirm: true,
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to update with invalid role
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'invalid_role' })
      .eq('id', user.id);

    expect(error).toBeDefined();
    expect(error.message).toContain('constraint');

    // Cleanup
    await supabase.auth.admin.deleteUser(user.id);
  });
});

test.describe('Database Cascade Deletes', () => {
  let supabase: any;

  test.beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  test('deleting event cascades to bookings', async () => {
    // Create event
    const { data: event } = await supabase
      .from('events')
      .insert({
        title: 'Cascade Test Event',
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

    // Create user and booking
    const { data: { user } } = await supabase.auth.admin.createUser({
      email: `cascade-test-${Date.now()}@example.com`,
      password: 'Test123!',
      email_confirm: true,
    });

    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        event_id: event.event_id,
        user_id: user.id,
        tickets_count: 1,
        total_amount: 0,
        booking_status: 'confirmed',
      })
      .select()
      .single();

    // Delete event
    await supabase.from('events').delete().eq('event_id', event.event_id);

    // Verify booking is also deleted (cascade)
    const { data: deletedBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_id', booking.booking_id)
      .single();

    expect(deletedBooking).toBeNull();

    // Cleanup
    await supabase.auth.admin.deleteUser(user.id);
  });

});
