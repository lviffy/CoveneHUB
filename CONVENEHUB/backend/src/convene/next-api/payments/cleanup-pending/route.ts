import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// This endpoint cleans up pending payments that have timed out
// Should be called by a cron job or scheduled task
// Timeout: 15 minutes after booking creation

const PAYMENT_TIMEOUT_MINUTES = 15;
const CRON_SECRET = process.env.CRON_SECRET;

// Track cleanup executions to prevent concurrent runs (in-memory)
// In production with multiple instances, use Redis or database flag
const activeCleanups = new Map<string, number>();
const CLEANUP_LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

function acquireCleanupLock(lockKey: string = 'payment-cleanup'): boolean {
  const now = Date.now();
  const existingLock = activeCleanups.get(lockKey);
  
  // Check if lock exists and is still valid
  if (existingLock && (now - existingLock < CLEANUP_LOCK_DURATION)) {
    return false; // Lock held by another process
  }
  
  // Acquire lock
  activeCleanups.set(lockKey, now);
  return true;
}

function releaseCleanupLock(lockKey: string = 'payment-cleanup'): void {
  activeCleanups.delete(lockKey);
}

// Track processed payments for idempotency (24-hour window)
const processedPayments = new Map<string, number>();
const IDEMPOTENCY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

function isPaymentProcessed(paymentId: string): boolean {
  const processedTime = processedPayments.get(paymentId);
  if (!processedTime) return false;
  
  if (Date.now() - processedTime > IDEMPOTENCY_WINDOW) {
    processedPayments.delete(paymentId);
    return false;
  }
  
  return true;
}

function markPaymentProcessed(paymentId: string): void {
  processedPayments.set(paymentId, Date.now());
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // SECURITY: Verify cron secret for production deployments
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');
      
      if (providedSecret !== CRON_SECRET) {
        logger.warn('Unauthorized cron job access attempt');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    // Acquire lock to prevent concurrent execution
    if (!acquireCleanupLock()) {
      logger.info('Cleanup job already running, skipping execution');
      return NextResponse.json({
        success: true,
        message: 'Cleanup already in progress',
        skipped: true,
      });
    }
    
    logger.info('Starting payment cleanup job');
    
    const supabase = await createClient();
    
    // Calculate timeout threshold (15 minutes ago)
    const timeoutThreshold = new Date();
    timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - PAYMENT_TIMEOUT_MINUTES);
    const timeoutISO = timeoutThreshold.toISOString();

    logger.debug('Checking for pending payments', { 
      threshold: PAYMENT_TIMEOUT_MINUTES,
      cutoffTime: timeoutISO 
    });

    // Find all pending payments that have timed out
    const { data: timedOutPayments, error: fetchError } = await supabase
      .from('payments')
      .select(`
        id,
        booking_id,
        razorpay_order_id,
        amount,
        created_at,
        bookings!inner(
          id,
          booking_id,
          event_id,
          tickets_count,
          booking_status
        )
      `)
      .eq('status', 'PENDING')
      .lt('created_at', timeoutISO) as {
        data: Array<{
          id: string;
          booking_id: string;
          razorpay_order_id: string;
          amount: number;
          created_at: string;
          bookings: {
            id: string;
            booking_id: string;
            event_id: string;
            tickets_count: number;
            booking_status: string;
          };
        }> | null;
        error: any;
      };

    if (fetchError) {
      logger.error('Error fetching timed out payments', fetchError);
      releaseCleanupLock();
      return NextResponse.json(
        { error: 'Failed to fetch pending payments' },
        { status: 500 }
      );
    }

    if (!timedOutPayments || timedOutPayments.length === 0) {
      logger.info('No timed out payments found');
      releaseCleanupLock();
      return NextResponse.json({
        success: true,
        message: 'No timed out payments to clean up',
        count: 0,
      });
    }

    logger.info(`Found payments to process`, { count: timedOutPayments.length });

    const results = [];
    let totalTicketsRestored = 0;

    // Process each timed out payment
    for (const payment of timedOutPayments) {
      try {
        // Check idempotency - skip if already processed
        if (isPaymentProcessed(payment.id)) {
          logger.debug('Payment already processed, skipping', { paymentId: payment.id });
          results.push({
            booking_id: payment.bookings.booking_id,
            success: true,
            already_processed: true,
          });
          continue;
        }
        
        // Update payment status to FAILED
        const { error: paymentUpdateError } = await (supabase
          .from('payments') as any)
          .update({
            status: 'FAILED',
            metadata: {
              failure_reason: 'Payment timeout - exceeded 15 minutes',
              failed_at: new Date().toISOString(),
            },
          })
          .eq('id', payment.id);

        if (paymentUpdateError) {
          logger.error('Failed to update payment status', paymentUpdateError, {
            paymentId: payment.id
          });
          results.push({
            booking_id: payment.bookings.booking_id,
            success: false,
            error: 'Failed to update payment status',
          });
          continue;
        }

        // Update booking status to cancelled
        const { error: bookingUpdateError } = await (supabase
          .from('bookings') as any)
          .update({
            booking_status: 'cancelled',
            payment_status: 'failed',
          })
          .eq('id', payment.bookings.id);

        if (bookingUpdateError) {
          logger.error('Failed to update booking status', bookingUpdateError, {
            bookingId: payment.bookings.booking_id
          });
          results.push({
            booking_id: payment.bookings.booking_id,
            success: false,
            error: 'Failed to update booking status',
          });
          continue;
        }

        // Restore event capacity
        const { data: eventData, error: eventFetchError } = await supabase
          .from('events')
          .select('remaining')
          .eq('event_id', payment.bookings.event_id)
          .single() as { data: { remaining: number } | null; error: any };

        if (!eventFetchError && eventData) {
          const newRemaining = eventData.remaining + payment.bookings.tickets_count;
          const { error: capacityError } = await (supabase
            .from('events') as any)
            .update({ remaining: newRemaining })
            .eq('event_id', payment.bookings.event_id);

          if (capacityError) {
            logger.error('Failed to restore capacity', capacityError, {
              eventId: payment.bookings.event_id
            });
          } else {
            totalTicketsRestored += payment.bookings.tickets_count;
            logger.debug('Capacity restored', { 
              eventId: payment.bookings.event_id,
              ticketsRestored: payment.bookings.tickets_count 
            });
          }
        }
        
        // Mark as processed for idempotency
        markPaymentProcessed(payment.id);

        logger.debug('Booking cancelled successfully', {
          bookingId: payment.bookings.booking_id
        });
        
        results.push({
          booking_id: payment.bookings.booking_id,
          success: true,
          tickets_released: payment.bookings.tickets_count,
          timeout_duration: `${PAYMENT_TIMEOUT_MINUTES} minutes`,
        });
      } catch (error) {
        logger.error('Error processing payment', error, {
          paymentId: payment.id
        });
        results.push({
          booking_id: payment.bookings.booking_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const executionTime = Date.now() - startTime;

    logger.info('Payment cleanup completed', {
      total: timedOutPayments.length,
      successful: successCount,
      failed: failureCount,
      ticketsRestored: totalTicketsRestored,
      executionTimeMs: executionTime
    });
    
    // Create audit log entry
    try {
      await (supabase
        .from('audit_logs') as any)
        .insert({
          actor_id: null, // System-triggered
          actor_role: 'system',
          action: 'PAYMENT_CLEANUP_EXECUTED',
          entity: 'payment',
          entity_id: null,
          metadata: {
            payments_processed: successCount,
            payments_failed: failureCount,
            tickets_restored: totalTicketsRestored,
            execution_time_ms: executionTime,
            triggered_by: 'cron'
          }
        });
    } catch (auditError) {
      logger.warn('Failed to create audit log', {
        error: auditError instanceof Error ? auditError.message : 'Unknown error'
      });
    }
    
    releaseCleanupLock();

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${successCount} timed out payments`,
      total: timedOutPayments.length,
      successful: successCount,
      failed: failureCount,
      tickets_restored: totalTicketsRestored,
      execution_time_ms: executionTime,
      results,
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Unexpected error in payment cleanup', error, {
      executionTimeMs: executionTime
    });
    releaseCleanupLock();
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500 }
    );
  }
}

// Allow GET for manual trigger (in development)
export async function GET(request: NextRequest) {
  return POST(request);
}
