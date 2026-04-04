/**
 * Simple in-memory rate limiter for API endpoints
 * Uses LRU cache with automatic cleanup of old entries
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed per interval
}

interface RateLimitResult {
  success: boolean; // Whether the request is allowed
  remaining: number; // Remaining requests in current window
  reset: number; // Timestamp when the rate limit resets
}

// Store request timestamps per identifier
const requestStore = new Map<string, number[]>();

/**
 * Rate limit a request based on identifier (e.g., user ID, IP)
 * 
 * @param identifier - Unique identifier for the requester
 * @param config - Rate limit configuration
 * @returns Result indicating if request is allowed
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { interval: 60000, maxRequests: 10 }
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  // Get existing requests for this identifier
  const requests = requestStore.get(key) || [];

  // Remove requests outside the current window
  const validRequests = requests.filter(
    (timestamp) => now - timestamp < config.interval
  );

  // Check if limit exceeded
  if (validRequests.length >= config.maxRequests) {
    const oldestRequest = Math.min(...validRequests);
    const resetTime = oldestRequest + config.interval;

    return {
      success: false,
      remaining: 0,
      reset: resetTime,
    };
  }

  // Add current request
  validRequests.push(now);
  requestStore.set(key, validRequests);

  // Cleanup old entries to prevent memory leak
  // Remove entries that are completely outside any reasonable window
  if (requestStore.size > 1000) {
    const cutoffTime = now - config.interval * 2;
    const keysToDelete: string[] = [];
    
    requestStore.forEach((timestamps, k) => {
      const latestTimestamp = Math.max(...timestamps);
      if (latestTimestamp < cutoffTime) {
        keysToDelete.push(k);
      }
    });
    
    keysToDelete.forEach(k => requestStore.delete(k));
  }

  return {
    success: true,
    remaining: config.maxRequests - validRequests.length,
    reset: now + config.interval,
  };
}

/**
 * Clear rate limit for a specific identifier
 * Useful for testing or manual resets
 */
export function clearRateLimit(identifier: string): void {
  requestStore.delete(identifier);
}

/**
 * Clear all rate limits
 * Useful for testing
 */
export function clearAllRateLimits(): void {
  requestStore.clear();
}
