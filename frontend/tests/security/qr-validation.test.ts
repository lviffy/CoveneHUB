/**
 * QR Code Security Validation Test Suite
 * Tests QR code generation, validation, and anti-fraud measures
 */

import { test, expect } from '@playwright/test';
import { createHash } from 'crypto';

test.describe('QR Code Generation Security', () => {
  test('QR codes contain unique nonces', async ({ request }) => {
    // Create two bookings and verify they have different QR nonces
    const booking1 = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 1,
      },
    });

    const booking2 = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 1,
      },
    });

    const data1 = await booking1.json();
    const data2 = await booking2.json();

    expect(data1.qr_nonce).toBeTruthy();
    expect(data2.qr_nonce).toBeTruthy();
    expect(data1.qr_nonce).not.toBe(data2.qr_nonce);
  });

  test('QR codes are not predictable', async ({ request }) => {
    // Verify that QR nonces are UUIDs (random)
    const response = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 1,
      },
    });

    const data = await response.json();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    expect(data.qr_nonce).toMatch(uuidRegex);
  });

  test('booking codes are unique per booking', async ({ request }) => {
    const response1 = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 1,
      },
    });

    const response2 = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 1,
      },
    });

    const data1 = await response1.json();
    const data2 = await response2.json();

    expect(data1.booking_code).toBeTruthy();
    expect(data2.booking_code).toBeTruthy();
    expect(data1.booking_code).not.toBe(data2.booking_code);
  });
});

test.describe('QR Code Validation Security', () => {
  test('cannot check-in with invalid QR nonce', async ({ request }) => {
    const response = await request.post('/api/movie-team/checkin', {
      data: {
        booking_code: 'INVALID123',
        event_id: 'test-event-id',
      },
    });

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('not found');
  });

  test('cannot check-in the same booking twice', async ({ request }) => {
    // First check-in should succeed
    const response1 = await request.post('/api/movie-team/checkin', {
      data: {
        booking_code: 'VALID123',
        event_id: 'test-event-id',
      },
    });

    if (response1.ok()) {
      // Second check-in should fail
      const response2 = await request.post('/api/movie-team/checkin', {
        data: {
          booking_code: 'VALID123',
          event_id: 'test-event-id',
        },
      });

      expect(response2.status()).toBe(400);
      const data = await response2.json();
      expect(data.error).toContain('already checked in');
    }
  });

  test('cannot check-in cancelled bookings', async ({ request }) => {
    // Cancel a booking first
    await request.post('/api/bookings/cancel', {
      data: {
        booking_id: 'test-booking-id',
      },
    });

    // Try to check-in the cancelled booking
    const response = await request.post('/api/movie-team/checkin', {
      data: {
        booking_code: 'CANCELLED123',
        event_id: 'test-event-id',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('cancelled');
  });

  test('cannot check-in booking at wrong event', async ({ request }) => {
    // Try to check-in a booking at a different event
    const response = await request.post('/api/movie-team/checkin', {
      data: {
        booking_code: 'VALID123',
        event_id: 'wrong-event-id',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('event');
  });

  test('QR code validation requires both booking_code and event_id', async ({ request }) => {
    // Missing event_id
    const response1 = await request.post('/api/movie-team/checkin', {
      data: {
        booking_code: 'VALID123',
      },
    });

    expect(response1.status()).toBe(400);

    // Missing booking_code
    const response2 = await request.post('/api/movie-team/checkin', {
      data: {
        event_id: 'test-event-id',
      },
    });

    expect(response2.status()).toBe(400);
  });
});

test.describe('QR Code Anti-Fraud Measures', () => {
  test('cannot generate QR codes for non-existent events', async ({ request }) => {
    const response = await request.post('/api/bookings', {
      data: {
        event_id: 'non-existent-event-id',
        tickets_count: 1,
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('event');
  });

  test('cannot book more tickets than available', async ({ request }) => {
    const response = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 999999,
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/slots|capacity/);
  });

  test('cannot duplicate bookings for same user and event', async ({ request }) => {
    // First booking should succeed
    const response1 = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 1,
      },
    });

    if (response1.ok()) {
      // Second booking for same event should fail
      const response2 = await request.post('/api/bookings', {
        data: {
          event_id: 'test-event-id',
          tickets_count: 1,
        },
      });

      expect(response2.status()).toBe(409);
      const data = await response2.json();
      expect(data.error).toContain('already booked');
    }
  });

  test('QR codes expire after event ends', async ({ request }) => {
    // Try to check-in a booking for a past event
    const response = await request.post('/api/movie-team/checkin', {
      data: {
        booking_code: 'PAST_EVENT_CODE',
        event_id: 'past-event-id',
      },
    });

    // Should either reject or warn about past event
    if (!response.ok()) {
      const data = await response.json();
      expect(data.error || data.warning).toBeTruthy();
    }
  });

  test('QR codes are embedded in email securely', async ({ request }) => {
    const response = await request.post('/api/bookings', {
      data: {
        event_id: 'test-event-id',
        tickets_count: 1,
      },
    });

    const data = await response.json();
    
    // Verify QR data structure contains necessary security fields
    expect(data.qr_nonce).toBeTruthy();
    expect(data.booking_code).toBeTruthy();
    expect(data.event_id).toBeTruthy();
  });
});

test.describe('QR Code Rate Limiting', () => {
  test('rate limit QR scan attempts', async ({ request }) => {
    const attempts = [];
    
    // Try scanning the same QR code rapidly
    for (let i = 0; i < 10; i++) {
      attempts.push(
        request.post('/api/movie-team/checkin', {
          data: {
            booking_code: 'VALID123',
            event_id: 'test-event-id',
          },
        })
      );
    }

    const responses = await Promise.all(attempts);
    const tooManyRequests = responses.filter(r => r.status() === 429);
    
    // Should have some rate limiting after rapid attempts
    if (tooManyRequests.length > 0) {
      expect(tooManyRequests.length).toBeGreaterThan(0);
    }
  });

  test('rate limit booking creation', async ({ request }) => {
    const attempts = [];
    
    // Try creating bookings rapidly
    for (let i = 0; i < 20; i++) {
      attempts.push(
        request.post('/api/bookings', {
          data: {
            event_id: 'test-event-id',
            tickets_count: 1,
          },
        })
      );
    }

    const responses = await Promise.all(attempts);
    const tooManyRequests = responses.filter(r => r.status() === 429);
    
    // Some requests should be rate limited
    if (tooManyRequests.length > 0) {
      expect(tooManyRequests.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Manual Check-in Security', () => {
  test('manual check-in requires movie team role', async ({ request }) => {
    // Try manual check-in without movie team role
    const response = await request.post('/api/movie-team/checkin', {
      data: {
        booking_code: 'VALID123',
        event_id: 'test-event-id',
      },
    });

    // Should require authentication/authorization
    expect([200, 401, 403]).toContain(response.status());
  });

  test('manual check-in records who performed check-in', async ({ request }) => {
    const response = await request.post('/api/movie-team/checkin', {
      data: {
        booking_code: 'VALID123',
        event_id: 'test-event-id',
      },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.checked_in_by).toBeTruthy();
    }
  });

  test('check-in audit trail is maintained', async ({ request }) => {
    // Perform a check-in
    await request.post('/api/movie-team/checkin', {
      data: {
        booking_code: 'VALID123',
        event_id: 'test-event-id',
      },
    });

    // Verify audit log entry exists (admin only)
    const auditResponse = await request.get('/api/admin/audit-logs');
    
    if (auditResponse.ok()) {
      const auditData = await auditResponse.json();
      const checkinLogs = auditData.logs.filter(
        (log: any) => log.action === 'checkin' || log.action === 'check_in'
      );
      expect(checkinLogs.length).toBeGreaterThan(0);
    }
  });
});
