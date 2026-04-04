/**
 * Role-Based Access Control (RBAC) Test Suite
 * Tests that API endpoints correctly enforce role-based permissions
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test helper to authenticate as different roles
async function loginAs(page: Page, role: 'user' | 'movie_team' | 'admin_team') {
  const credentials = {
    user: {
      email: 'testuser@example.com',
      password: 'TestUser123!',
    },
    movie_team: {
      email: 'movieteam@example.com',
      password: 'MovieTeam123!',
    },
    admin_team: {
      email: 'admin@convenehub.com',
      password: 'Admin123!',
    },
  };

  await page.goto('/login');
  await page.fill('input[type="email"]', credentials[role].email);
  await page.fill('input[type="password"]', credentials[role].password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(events|admin|movie-team)/);
}

test.describe('User Role Access Control', () => {
  test('regular users can access public events page', async ({ page }) => {
    await loginAs(page, 'user');
    await page.goto('/events');
    await expect(page).toHaveURL('/events');
    await expect(page.locator('h1')).toContainText('Events');
  });

  test('regular users cannot access admin dashboard', async ({ page }) => {
    await loginAs(page, 'user');
    await page.goto('/admin');
    
    // Should redirect to unauthorized or events page
    await expect(page).not.toHaveURL('/admin');
    await expect(page).toHaveURL(/\/(events|unauthorized)/);
  });

  test('regular users cannot access movie team dashboard', async ({ page }) => {
    await loginAs(page, 'user');
    await page.goto('/movie-team');
    
    // Should redirect
    await expect(page).not.toHaveURL('/movie-team');
  });

  test('regular users can create bookings', async ({ page, request }) => {
    await loginAs(page, 'user');
    
    const response = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 1,
      },
    });

    expect(response.ok()).toBeTruthy();
  });

  test('regular users cannot create events', async ({ page, request }) => {
    await loginAs(page, 'user');
    
    const response = await request.post('/api/admin/events', {
      data: {
        title: 'Unauthorized Event',
        venue_name: 'Test Venue',
        city: 'Mumbai',
      },
    });

    expect(response.status()).toBe(403);
  });
});

test.describe('Movie Team Role Access Control', () => {
  test('movie team can access their dashboard', async ({ page }) => {
    await loginAs(page, 'movie_team');
    await page.goto('/movie-team');
    await expect(page).toHaveURL('/movie-team');
    await expect(page.locator('h1')).toContainText('Movie Team');
  });

  test('movie team cannot access admin dashboard', async ({ page }) => {
    await loginAs(page, 'movie_team');
    await page.goto('/admin');
    
    await expect(page).not.toHaveURL('/admin');
  });

  test('movie team can view assigned events', async ({ page, request }) => {
    await loginAs(page, 'movie_team');
    
    const response = await request.get('/api/movie-team/my-events');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.events).toBeDefined();
  });

  test('movie team can check-in bookings', async ({ page, request }) => {
    await loginAs(page, 'movie_team');
    
    const response = await request.post('/api/movie-team/checkin', {
      data: {
        booking_code: 'TEST123',
        event_id: 'test-event-id',
      },
    });

    // Should not return 403 (may return 404 if booking doesn't exist)
    expect(response.status()).not.toBe(403);
  });

  test('movie team cannot create events', async ({ page, request }) => {
    await loginAs(page, 'movie_team');
    
    const response = await request.post('/api/admin/events', {
      data: {
        title: 'Unauthorized Event',
      },
    });

    expect(response.status()).toBe(403);
  });

  test('movie team cannot delete users', async ({ page, request }) => {
    await loginAs(page, 'movie_team');
    
    const response = await request.delete('/api/admin/users/delete', {
      data: {
        userId: 'some-user-id',
      },
    });

    expect(response.status()).toBe(403);
  });

  test('movie team cannot assign team members', async ({ page, request }) => {
    await loginAs(page, 'movie_team');
    
    const response = await request.post('/api/admin/movie-team-assignments', {
      data: {
        event_id: 'test-event-id',
        user_id: 'test-user-id',
      },
    });

    expect(response.status()).toBe(403);
  });
});

test.describe('ConveneHub Team (Admin) Role Access Control', () => {
  test('admin_team can access admin dashboard', async ({ page }) => {
    await loginAs(page, 'admin_team');
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toContainText('Admin');
  });

  test('admin_team can create events', async ({ page, request }) => {
    await loginAs(page, 'admin_team');
    
    const response = await request.post('/api/admin/events', {
      data: {
        title: 'New Event',
        description: 'Test event description',
        venue_name: 'Test Venue',
        venue_address: '123 Test St',
        city: 'Mumbai',
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 100,
        ticket_price: 0,
        status: 'draft',
      },
    });

    expect(response.ok()).toBeTruthy();
  });

  test('admin_team can update events', async ({ page, request }) => {
    await loginAs(page, 'admin_team');
    
    const response = await request.put('/api/admin/events', {
      data: {
        event_id: 'test-event-id',
        title: 'Updated Event',
      },
    });

    expect(response.status()).not.toBe(403);
  });

  test('admin_team can delete events', async ({ page, request }) => {
    await loginAs(page, 'admin_team');
    
    const response = await request.delete('/api/admin/events', {
      data: {
        event_id: 'test-event-id',
      },
    });

    expect(response.status()).not.toBe(403);
  });

  test('admin_team can view all users', async ({ page, request }) => {
    await loginAs(page, 'admin_team');
    
    const response = await request.get('/api/admin/users');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.users).toBeDefined();
  });

  test('admin_team can update user roles', async ({ page, request }) => {
    await loginAs(page, 'admin_team');
    
    const response = await request.post('/api/admin/users/update-role', {
      data: {
        userId: 'test-user-id',
        newRole: 'movie_team',
      },
    });

    expect(response.status()).not.toBe(403);
  });

  test('admin_team can delete users', async ({ page, request }) => {
    await loginAs(page, 'admin_team');
    
    const response = await request.delete('/api/admin/users/delete', {
      data: {
        userId: 'test-user-id',
      },
    });

    expect(response.status()).not.toBe(403);
  });

  test('admin_team can assign movie team members', async ({ page, request }) => {
    await loginAs(page, 'admin_team');
    
    const response = await request.post('/api/admin/movie-team-assignments', {
      data: {
        event_id: 'test-event-id',
        user_id: 'movie-team-user-id',
      },
    });

    expect(response.status()).not.toBe(403);
  });

  test('admin_team can export bookings', async ({ page, request }) => {
    await loginAs(page, 'admin_team');
    
    const response = await request.get('/api/admin/events/test-event-id/export-bookings');
    expect(response.status()).not.toBe(403);
  });

  test('admin_team can export check-ins', async ({ page, request }) => {
    await loginAs(page, 'admin_team');
    
    const response = await request.get('/api/admin/events/test-event-id/export-checkins');
    expect(response.status()).not.toBe(403);
  });
});

test.describe('Unauthenticated Access Control', () => {
  test('unauthenticated users cannot access admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated users cannot access movie team dashboard', async ({ page }) => {
    await page.goto('/movie-team');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated users can view public events', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText(/Events|ConveneHub/);
  });

  test('unauthenticated users cannot create bookings', async ({ request }) => {
    const response = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 1,
      },
    });

    expect(response.status()).toBe(401);
  });

  test('unauthenticated API requests are rejected', async ({ request }) => {
    const endpoints = [
      '/api/admin/events',
      '/api/admin/users',
      '/api/movie-team/my-events',
      '/api/bookings',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    }
  });
});
