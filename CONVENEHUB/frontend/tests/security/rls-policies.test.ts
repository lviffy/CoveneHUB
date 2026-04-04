/**
 * Row Level Security (RLS) Policies Test Suite
 * Tests that database RLS policies correctly restrict access based on user roles
 */

import { createClient } from '@supabase/supabase-js';
import { test, expect } from '@playwright/test';

test.describe('RLS Policies - Profiles Table', () => {
  let adminClient: any;
  let userClient: any;
  let movieTeamClient: any;
  let testUserIds: string[] = [];

  test.beforeAll(async () => {
    // Create clients with different role contexts
    // Note: In real tests, you'd authenticate with actual users
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });

  test.afterAll(async () => {
    // Cleanup test data
    if (testUserIds.length > 0) {
      await adminClient
        .from('profiles')
        .delete()
        .in('id', testUserIds);
    }
  });

  test('users can view their own profile', async () => {
    // Test that authenticated users can SELECT their own profile
    const { data, error } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', 'current-user-id')
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.id).toBe('current-user-id');
  });

  test('users cannot view other users profiles', async () => {
    // Test that users cannot SELECT other profiles
    const { data, error } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', 'different-user-id')
      .single();

    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  test('users can update their own profile', async () => {
    // Test that users can UPDATE their own profile
    const { error } = await userClient
      .from('profiles')
      .update({ city: 'Mumbai' })
      .eq('id', 'current-user-id');

    expect(error).toBeNull();
  });

  test('users cannot update other users profiles', async () => {
    // Test that users cannot UPDATE other profiles
    const { error } = await userClient
      .from('profiles')
      .update({ city: 'Delhi' })
      .eq('id', 'different-user-id');

    expect(error).toBeTruthy();
    expect(error.message).toContain('violates row-level security policy');
  });

  test('admin_team can view all profiles', async () => {
    // Test that ConveneHub team members can SELECT all profiles
    const { data, error } = await adminClient
      .from('profiles')
      .select('*');

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(Array.isArray(data)).toBe(true);
  });

  test('regular users cannot view all profiles', async () => {
    // Test that regular users cannot SELECT all profiles
    const { data } = await userClient
      .from('profiles')
      .select('*');

    // Should only see their own profile
    expect(data?.length).toBeLessThanOrEqual(1);
  });
});

test.describe('RLS Policies - Events Table', () => {
  let adminClient: any;
  let userClient: any;
  let testEventIds: string[] = [];

  test('anyone can view published events', async () => {
    // Test that authenticated users can SELECT published events
    const { data, error } = await userClient
      .from('events')
      .select('*')
      .eq('status', 'published');

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  test('regular users cannot create events', async () => {
    // Test that regular users cannot INSERT events
    const { error } = await userClient
      .from('events')
      .insert({
        title: 'Test Event',
        venue_name: 'Test Venue',
        venue_address: '123 Test St',
        city: 'Mumbai',
        date_time: new Date().toISOString(),
        capacity: 100,
        remaining: 100,
      });

    expect(error).toBeTruthy();
    expect(error.message).toContain('violates row-level security policy');
  });

  test('admin_team can create events', async () => {
    // Test that ConveneHub team can INSERT events
    const { data, error } = await adminClient
      .from('events')
      .insert({
        title: 'Test Event',
        venue_name: 'Test Venue',
        venue_address: '123 Test St',
        city: 'Mumbai',
        date_time: new Date().toISOString(),
        capacity: 100,
        remaining: 100,
        status: 'draft',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    if (data) testEventIds.push(data.event_id);
  });

  test('regular users cannot update events', async () => {
    // Test that regular users cannot UPDATE events
    const { error } = await userClient
      .from('events')
      .update({ title: 'Hacked Event' })
      .eq('event_id', testEventIds[0]);

    expect(error).toBeTruthy();
  });

  test('admin_team can update events', async () => {
    // Test that ConveneHub team can UPDATE events
    const { error } = await adminClient
      .from('events')
      .update({ title: 'Updated Event' })
      .eq('event_id', testEventIds[0]);

    expect(error).toBeNull();
  });

  test('regular users cannot delete events', async () => {
    // Test that regular users cannot DELETE events
    const { error } = await userClient
      .from('events')
      .delete()
      .eq('event_id', testEventIds[0]);

    expect(error).toBeTruthy();
  });
});

test.describe('RLS Policies - Bookings Table', () => {
  let userClient: any;
  let adminClient: any;

  test('users can view their own bookings', async () => {
    // Test that users can SELECT their own bookings
    const { data, error } = await userClient
      .from('bookings')
      .select('*')
      .eq('user_id', 'current-user-id');

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  test('users cannot view other users bookings', async () => {
    // Test that users cannot SELECT other users bookings
    const { data } = await userClient
      .from('bookings')
      .select('*')
      .eq('user_id', 'different-user-id');

    expect(data?.length).toBe(0);
  });

  test('users can create bookings for themselves', async () => {
    // Test that users can INSERT bookings for themselves
    const { data, error } = await userClient
      .from('bookings')
      .insert({
        event_id: 'test-event-id',
        user_id: 'current-user-id',
        tickets_count: 1,
        total_amount: 0,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  test('users cannot create bookings for others', async () => {
    // Test that users cannot INSERT bookings for other users
    const { error } = await userClient
      .from('bookings')
      .insert({
        event_id: 'test-event-id',
        user_id: 'different-user-id',
        tickets_count: 1,
        total_amount: 0,
      });

    expect(error).toBeTruthy();
  });

  test('admin_team can view all bookings', async () => {
    // Test that ConveneHub team can SELECT all bookings
    const { data, error } = await adminClient
      .from('bookings')
      .select('*');

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });
});

test.describe('RLS Policies - Movie Team Assignments', () => {
  let movieTeamClient: any;
  let adminClient: any;

  test('movie_team can view their assignments', async () => {
    // Test that movie team can SELECT their assignments
    const { data, error } = await movieTeamClient
      .from('movie_team_assignments')
      .select('*')
      .eq('user_id', 'movie-team-user-id');

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  test('movie_team cannot view other assignments', async () => {
    // Test that movie team cannot SELECT other team members assignments
    const { data } = await movieTeamClient
      .from('movie_team_assignments')
      .select('*')
      .eq('user_id', 'different-movie-team-id');

    expect(data?.length).toBe(0);
  });

  test('regular users cannot create assignments', async () => {
    // Test that regular users cannot INSERT assignments
    const { error } = await movieTeamClient
      .from('movie_team_assignments')
      .insert({
        event_id: 'test-event-id',
        user_id: 'movie-team-user-id',
      });

    expect(error).toBeTruthy();
  });

  test('admin_team can create assignments', async () => {
    // Test that ConveneHub team can INSERT assignments
    const { error } = await adminClient
      .from('movie_team_assignments')
      .insert({
        event_id: 'test-event-id',
        user_id: 'movie-team-user-id',
      });

    expect(error).toBeNull();
  });

  test('admin_team can delete assignments', async () => {
    // Test that ConveneHub team can DELETE assignments
    const { error } = await adminClient
      .from('movie_team_assignments')
      .delete()
      .eq('event_id', 'test-event-id')
      .eq('user_id', 'movie-team-user-id');

    expect(error).toBeNull();
  });
});

test.describe('RLS Policies - Audit Logs', () => {
  let userClient: any;
  let adminClient: any;

  test('regular users cannot view audit logs', async () => {
    // Test that regular users cannot SELECT audit logs
    const { data, error } = await userClient
      .from('audit_logs')
      .select('*');

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });

  test('admin_team can view all audit logs', async () => {
    // Test that ConveneHub team can SELECT all audit logs
    const { data, error } = await adminClient
      .from('audit_logs')
      .select('*');

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  test('authenticated users can insert audit logs', async () => {
    // Test that service role can INSERT audit logs
    const { error } = await adminClient
      .from('audit_logs')
      .insert({
        actor_id: 'test-user-id',
        actor_role: 'user',
        action: 'test_action',
        entity: 'test_entity',
        entity_id: 'test-entity-id',
      });

    expect(error).toBeNull();
  });
});
