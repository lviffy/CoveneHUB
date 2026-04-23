/**
 * Environment Variable Validation
 * 
 * This module validates all required environment variables at startup
 * to prevent runtime errors and improve debugging.
 * 
 * Import this file early in your application (e.g., in middleware or root layout)
 * to ensure validation runs before any routes are accessed.
 */

interface EnvConfig {
  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Razorpay (Required for paid event checkout)
  NEXT_PUBLIC_RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  
  // QR Code Security (Required for bookings)
  QR_HMAC_SECRET: string;
  
  // Email (Required for notifications)
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_SECURE: string;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_FROM_EMAIL: string;
  SMTP_REPLY_TO: string;
  
  // Cron Security (Optional but recommended)
  CRON_SECRET?: string;
  
  // Node Environment
  NODE_ENV: string;
}

/**
 * Validation rules for environment variables
 */
interface ValidationRule {
  required: boolean;
  minLength?: number;
  pattern?: RegExp;
  message: string;
  mustNotBeExposed?: boolean;
}

const validationRules: Record<string, ValidationRule> = {
  NEXT_PUBLIC_SUPABASE_URL: {
    required: true,
    pattern: /^https:\/\/.+\.supabase\.co$/,
    message: 'Must be a valid Supabase URL (https://xxx.supabase.co)',
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    required: true,
    minLength: 100,
    message: 'Must be a valid Supabase anon key (JWT token)',
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    required: true,
    minLength: 100,
    message: 'Must be a valid Supabase service role key (JWT token)',
    mustNotBeExposed: true, // Should never have NEXT_PUBLIC_ prefix
  },
  NEXT_PUBLIC_RAZORPAY_KEY_ID: {
    required: true,
    pattern: /^rzp_(test|live)_[A-Za-z0-9]+$/,
    message: 'Must be a valid Razorpay key ID (rzp_test_xxx or rzp_live_xxx)',
  },
  RAZORPAY_KEY_SECRET: {
    required: true,
    minLength: 16,
    message: 'Must be a valid Razorpay key secret',
    mustNotBeExposed: true,
  },
  QR_HMAC_SECRET: {
    required: true,
    minLength: 32,
    message: 'Must be at least 32 characters for security',
    mustNotBeExposed: true,
  },
  SMTP_HOST: {
    required: true,
    message: 'SMTP host is required for email delivery',
  },
  SMTP_PORT: {
    required: true,
    pattern: /^\d+$/,
    message: 'Must be a valid port number',
  },
  SMTP_USER: {
    required: true,
    pattern: /^.+@.+\..+$/,
    message: 'Must be a valid email address',
  },
  SMTP_PASSWORD: {
    required: true,
    minLength: 4,
    message: 'SMTP password is required',
    mustNotBeExposed: true,
  },
  CRON_SECRET: {
    required: false,
    minLength: 32,
    message: 'Should be at least 32 characters if set (recommended for production)',
    mustNotBeExposed: true,
  },
};

/**
 * Validate a single environment variable
 */
function validateEnvVar(
  name: string,
  value: string | undefined,
  rules: ValidationRule
): { valid: boolean; error?: string } {
  // Check if required
  if (rules.required && !value) {
    return {
      valid: false,
      error: `${name} is required. ${rules.message || ''}`,
    };
  }
  
  // If not required and not set, skip further validation
  if (!rules.required && !value) {
    return { valid: true };
  }
  
  // Check minimum length
  if (rules.minLength && value && value.length < rules.minLength) {
    return {
      valid: false,
      error: `${name} must be at least ${rules.minLength} characters. ${rules.message || ''}`,
    };
  }
  
  // Check pattern
  if (rules.pattern && value && !rules.pattern.test(value)) {
    return {
      valid: false,
      error: `${name} format is invalid. ${rules.message || ''}`,
    };
  }
  
  // Check if secret is exposed to client
  if (rules.mustNotBeExposed && name.startsWith('NEXT_PUBLIC_')) {
    return {
      valid: false,
      error: `${name} must NOT have NEXT_PUBLIC_ prefix. This would expose secrets to the browser!`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate all environment variables
 * Throws error with detailed message if validation fails
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate each environment variable
  Object.entries(validationRules).forEach(([name, rules]) => {
    const value = process.env[name];
    const result = validateEnvVar(name, value, rules);
    
    if (!result.valid) {
      errors.push(`  ❌ ${result.error}`);
    }
  });
  
  // Check for common mistakes
  
  // 1. Check if service role key is accidentally exposed
  if (process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY) {
    errors.push(
      '  ❌ NEXT_PUBLIC_SERVICE_ROLE_KEY detected! Remove NEXT_PUBLIC_ prefix immediately. ' +
      'This exposes admin access to your database!'
    );
  }
  
  // 2. Check if any secret keys have NEXT_PUBLIC_ prefix
  const secretKeys = [
    'RAZORPAY_KEY_SECRET',
    'QR_HMAC_SECRET',
    'SMTP_PASSWORD',
    'CRON_SECRET',
  ];
  
  secretKeys.forEach((key) => {
    const exposedKey = `NEXT_PUBLIC_${key}`;
    if (process.env[exposedKey]) {
      errors.push(
        `  ❌ ${exposedKey} detected! Remove NEXT_PUBLIC_ prefix. ` +
        'This would expose secrets in the client-side JavaScript bundle!'
      );
    }
  });
  
  // 3. Warn about default/example values
  if (process.env.QR_HMAC_SECRET?.includes('convenehub-secret-key-2025')) {
    warnings.push(
      '  ⚠️  QR_HMAC_SECRET appears to be the example value. ' +
      'Generate a new secret: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  
  // 4. Warn if CRON_SECRET not set in production
  if (process.env.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
    warnings.push(
      '  ⚠️  CRON_SECRET not set in production. ' +
      'Set this to secure your cron endpoints!'
    );
  }

  // 5. Warn if test Razorpay keys are used in production
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.startsWith('rzp_test_')
  ) {
    warnings.push(
      '  ⚠️  Razorpay test keys are configured in production. Switch to live keys before launch.'
    );
  }
  
  // Print warnings
  if (warnings.length > 0) {
    warnings.forEach((warning) => console.warn(warning));
  }
  
  // If there are errors, throw
  if (errors.length > 0) {
    const errorMessage = `
╔═══════════════════════════════════════════════════════════╗
║  ❌  ENVIRONMENT CONFIGURATION ERRORS                     ║
╚═══════════════════════════════════════════════════════════╝

The following environment variables are missing or invalid:

${errors.join('\n')}

📝 To fix:
1. Copy .env.example to .env.local
2. Fill in all required values
3. Never commit .env.local to git
4. Use .env.example as a template only

💡 Quick start:
  cp .env.example .env.local
  # Edit .env.local with your actual credentials

For more help, see: README.md or .env.example
`;
    throw new Error(errorMessage);
  }
  
  // Return validated config (TypeScript will ensure all required vars are present)
  return process.env as unknown as EnvConfig;
}

/**
 * Get validated environment config
 * Safe to use after validateEnv() has been called
 */
export function getEnv(): Partial<EnvConfig> {
  return process.env as Partial<EnvConfig>;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

// Auto-validate on import (only in server environment)
if (typeof window === 'undefined') {
  try {
    validateEnv();
  } catch (error) {
    // Error will be thrown and logged by Next.js
    // This prevents the application from starting with invalid config
    throw error;
  }
}
