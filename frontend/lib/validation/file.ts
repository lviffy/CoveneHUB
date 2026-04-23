// ============================================================================
// PART 9 FIX: FILE UPLOAD SECURITY - VALIDATION UTILITIES
// ============================================================================
// File: frontend/lib/validation/file.ts
// ============================================================================

import { z } from 'zod';

/**
 * Allowed MIME types for image uploads
 * Whitelist approach for maximum security
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

/**
 * Allowed file extensions for image uploads
 * Must match MIME types above
 */
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const;

/**
 * Maximum file size: 5MB
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Zod schema for image file metadata validation
 */
export const imageFileSchema = z.object({
  name: z.string().min(1, 'Filename cannot be empty'),
  type: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: 'Invalid image type. Only JPG, PNG, GIF, and WebP are allowed' }),
  }),
  size: z
    .number()
    .min(1, 'File cannot be empty')
    .max(MAX_FILE_SIZE, 'File size must be less than 5MB'),
});

/**
 * Validation result interface
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Comprehensive file validation function
 * 
 * Security checks:
 * 1. MIME type whitelist
 * 2. File extension whitelist
 * 3. File size limit
 * 4. Double extension detection
 * 5. Filename sanitization
 * 
 * @param file - The File object to validate
 * @returns Validation result with success status and error message if invalid
 */
export function validateImageFile(file: File): FileValidationResult {
  // 1. Validate file metadata with Zod
  const metadataResult = imageFileSchema.safeParse({
    name: file.name,
    type: file.type,
    size: file.size,
  });

  if (!metadataResult.success) {
    return {
      valid: false,
      error: metadataResult.error.errors[0].message,
    };
  }

  // 2. Validate file extension (case-insensitive)
  const fileName = file.name.toLowerCase();
  const extension = fileName.split('.').pop();

  if (!extension || !ALLOWED_EXTENSIONS.includes(extension as any)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // 3. Check for double extensions (e.g., file.php.jpg)
  const parts = fileName.split('.');
  if (parts.length > 2) {
    return {
      valid: false,
      error: 'Multiple file extensions are not allowed',
    };
  }

  // 4. Check for suspicious characters in filename
  const suspiciousChars = /[<>:"|?*\x00-\x1F]/;
  if (suspiciousChars.test(file.name)) {
    return {
      valid: false,
      error: 'Filename contains invalid characters',
    };
  }

  // 5. Check for path traversal attempts (../)
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      error: 'Filename cannot contain path separators',
    };
  }

  return { valid: true };
}

/**
 * Get sanitized file extension from filename
 * Returns null if extension is not in whitelist
 * 
 * @param filename - Original filename from user
 * @returns Sanitized extension or null if invalid
 */
export function getSanitizedExtension(filename: string): string | null {
  const extension = filename.toLowerCase().split('.').pop();

  if (!extension || !ALLOWED_EXTENSIONS.includes(extension as any)) {
    return null;
  }

  return extension;
}

/**
 * Generate secure random filename
 * Format: timestamp-uuid.extension
 * 
 * @param originalFilename - Original filename to extract extension from
 * @returns Secure filename or null if extension is invalid
 */
export function generateSecureFilename(originalFilename: string): string | null {
  const extension = getSanitizedExtension(originalFilename);

  if (!extension) {
    return null;
  }

  // Use crypto.randomUUID() for cryptographically secure random ID
  const uuid = crypto.randomUUID();
  const timestamp = Date.now();

  return `${timestamp}-${uuid}.${extension}`;
}

/**
 * Validate image file header (magic numbers)
 * Checks first few bytes to verify file is actually an image
 * 
 * This is an advanced check that reads the file content
 * to detect polyglot attacks and file type spoofing
 * 
 * @param file - The File object to validate
 * @returns Promise resolving to true if valid image header
 */
export async function validateImageHeader(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        resolve(false);
        return;
      }

      const arr = new Uint8Array(arrayBuffer).subarray(0, 12);
      let header = '';

      // Convert bytes to hex string
      for (let i = 0; i < Math.min(arr.length, 4); i++) {
        header += arr[i].toString(16).padStart(2, '0');
      }

      // Magic numbers for valid image formats
      const magicNumbers: Record<string, string[]> = {
        // JPEG: FF D8 FF E0/E1/E2/E3/E8
        jpeg: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8', 'ffd8ffdb'],
        // PNG: 89 50 4E 47
        png: ['89504e47'],
        // GIF: 47 49 46 38
        gif: ['47494638'],
        // WebP: 52 49 46 46 (RIFF)
        webp: ['52494646'],
      };

      // Check if header matches any valid magic number
      const isValid = Object.values(magicNumbers).some((numbers) =>
        numbers.some((num) => header.startsWith(num))
      );

      resolve(isValid);
    };

    reader.onerror = () => resolve(false);

    // Read first 12 bytes of file
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

/**
 * Full file validation with magic number check
 * Use this for maximum security (requires async)
 * 
 * @param file - The File object to validate
 * @returns Promise resolving to validation result
 */
export async function validateImageFileFull(file: File): Promise<FileValidationResult> {
  // First, do basic validation
  const basicValidation = validateImageFile(file);
  if (!basicValidation.valid) {
    return basicValidation;
  }

  // Then, validate file header (magic numbers)
  const hasValidHeader = await validateImageHeader(file);
  if (!hasValidHeader) {
    return {
      valid: false,
      error: 'File does not appear to be a valid image (invalid file header)',
    };
  }

  return { valid: true };
}

/**
 * Constants export for use in components
 */
export const FILE_VALIDATION_CONSTANTS = {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB: MAX_FILE_SIZE / (1024 * 1024),
} as const;
