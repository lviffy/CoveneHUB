/**
 * Safe production logger
 * - Prevents sensitive data leakage in production
 * - Structured logging for monitoring
 * - Automatic PII redaction
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionToken',
  'session_token',
  'email', // Redact in production
  'phone', // Redact in production
];

/**
 * Redact sensitive values from objects
 */
function redactSensitive(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitive);
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitive(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Log only in development mode
 * In production, use structured logging service
 */
function shouldLog(level: LogLevel): boolean {
  // Only log errors in production
  if (process.env.NODE_ENV === 'production') {
    return level === 'error';
  }
  return true;
}

/**
 * Format log message with context
 */
function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(redactSensitive(context))}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

export const logger = {
  /**
   * Debug-level logging (development only)
   */
  debug(message: string, context?: LogContext) {
    if (shouldLog('debug')) {
      console.debug(formatLog('debug', message, context));
    }
  },

  /**
   * Info-level logging (development only)
   */
  info(message: string, context?: LogContext) {
    if (shouldLog('info')) {
      console.info(formatLog('info', message, context));
    }
  },

  /**
   * Warning-level logging
   */
  warn(message: string, context?: LogContext) {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, context));
    }
  },

  /**
   * Error-level logging (always logged for monitoring)
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    if (shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          name: error.name,
        } : error,
      };
      console.error(formatLog('error', message, errorContext));
    }
    
    // In production, send to monitoring service (e.g., Sentry, LogRocket)
    if (process.env.NODE_ENV === 'production' && error instanceof Error) {
      // TODO: Send to error tracking service
      // Example: Sentry.captureException(error, { extra: context });
    }
  },

  /**
   * Audit log for security-critical events
   * Always logged regardless of environment
   */
  audit(action: string, context: LogContext) {
    const auditLog = formatLog('info', `AUDIT: ${action}`, redactSensitive(context));
    console.info(auditLog);
    
    // In production, send to SIEM or audit logging service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to audit logging service
    }
  },
};

/**
 * Safe error serialization for API responses
 * Never expose internal errors to clients
 */
export function safeErrorResponse(error: unknown): { message: string; code?: string } {
  if (process.env.NODE_ENV === 'development') {
    if (error instanceof Error) {
      return { message: error.message, code: error.name };
    }
    return { message: String(error) };
  }
  
  // Production: Generic error message
  return { message: 'An error occurred. Please try again later.' };
}
