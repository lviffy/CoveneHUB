// ============================================================================
// PART 8 FIX: USER PROFILE MANAGEMENT - VALIDATION SCHEMA
// ============================================================================
// File: frontend/lib/validation/profile.ts
// CREATE THIS FILE
// ============================================================================

import { z } from 'zod';

// Shared name regex constants (mirror lib/validation/name.ts for Zod use)
const NAME_CHARS_RE = /^[\p{L}'\- ]+$/u;
const CONSECUTIVE_SEP_RE = /[-' ]{2}/;
const EDGE_SEP_RE = /^[-' ]|[-' ]$/;

/**
 * Zod field for a person's name.
 * Rules: Unicode letters, spaces, hyphens, apostrophes only; length 2–50 (trimmed);
 * no numbers; no consecutive separators; cannot start/end with a separator.
 */
const fullNameField = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim() : val),
  z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(50, 'Full name cannot exceed 50 characters')
    .refine(val => NAME_CHARS_RE.test(val), 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .refine(val => !CONSECUTIVE_SEP_RE.test(val), 'Name cannot have consecutive spaces, hyphens, or apostrophes')
    .refine(val => !EDGE_SEP_RE.test(val), 'Name cannot start or end with a space, hyphen, or apostrophe'),
);

/**
 * Profile validation schema for both profile update and complete-profile endpoints
 *
 * Security features:
 * - Length limits to prevent database overflow
 * - Phone number format validation
 * - Trimming to remove whitespace
 * - Type checking
 */
export const profileUpdateSchema = z.object({
  full_name: fullNameField,
  
  city: z.string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City cannot exceed 50 characters')
    .trim()
    .refine(val => val.length > 0, 'City cannot be empty after trimming'),
  
  phone: z.string()
    .regex(
      /^\+?[0-9\s\-\(\)]{10,20}$/,
      'Phone number must be 10-20 characters (digits, spaces, +, -, (, ) allowed)'
    )
    .max(20, 'Phone number cannot exceed 20 characters')
    .transform(val => val?.trim()),
});

/**
 * Complete profile schema (phone is required, city is required)
 */
export const completeProfileSchema = z.object({
  city: z.string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City cannot exceed 50 characters')
    .trim()
    .refine(val => val.length > 0, 'City cannot be empty after trimming'),
  
  phone: z.string()
    .regex(
      /^\+?[0-9\s\-\(\)]{10,20}$/,
      'Phone number must be 10-20 characters (digits, spaces, +, -, (, ) allowed)'
    )
    .max(20, 'Phone number cannot exceed 20 characters')
    .transform(val => val?.trim()),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type CompleteProfileData = z.infer<typeof completeProfileSchema>;
