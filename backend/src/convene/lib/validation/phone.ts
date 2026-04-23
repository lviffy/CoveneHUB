/**
 * Normalizes a phone number to its 10-digit local form (India-focused).
 * Strips country code (91 / +91), leading zero, and all non-digit characters.
 *
 * Examples:
 *   "+91 8260034880" → "8260034880"
 *   "918260034880"   → "8260034880"
 *   "08260034880"    → "8260034880"
 *   "8260034880"     → "8260034880"
 */
export function normalizePhoneCore(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  // Unrecognised length — return raw digits so caller can still attempt a match
  return digits.length > 0 ? digits : null;
}

/**
 * Returns all realistic stored forms of a phone number so a single OR query
 * can catch duplicates regardless of how the existing record was saved.
 *
 * Examples for "8260034880":
 *   ["8260034880", "918260034880", "+918260034880", "+91 8260034880",
 *    "+91-8260034880", "08260034880"]
 */
export function getPhoneVariants(phone: string): string[] {
  const variants = new Set<string>();

  // Always include the raw trimmed input
  variants.add(phone.trim());

  const core = normalizePhoneCore(phone);
  if (!core) return [...variants];

  variants.add(core);
  variants.add(`91${core}`);
  variants.add(`+91${core}`);
  variants.add(`+91 ${core}`);
  variants.add(`+91-${core}`);
  variants.add(`0${core}`);

  return [...variants];
}
