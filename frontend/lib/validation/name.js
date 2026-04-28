/**
 * Shared name validation rules (used on both client and server).
 *
 * Rules:
 *  1. Unicode letters, spaces, hyphens, apostrophes only
 *  2. Length 2–50 (after trimming)
 *  3. No digits
 *  4. No special symbols
 *  5. No consecutive separators (e.g. "--", "  ", "''")
 *  6. Cannot start or end with a separator
 *  7. Trim leading/trailing whitespace
 *  8. Full Unicode support via \p{L}
 */

const NAME_CHARS_RE = /^[\p{L}'\- ]+$/u;
const CONSECUTIVE_SEP_RE = /[-' ]{2}/;
const EDGE_SEP_RE = /^[-' ]|[-' ]$/;
export function validateName(raw) {
  const name = raw.trim();
  if (!name)
    return {
      isValid: false,
      error: "Name is required.",
    };
  if (name.length < 2)
    return {
      isValid: false,
      error: "Name must be at least 2 characters.",
    };
  if (name.length > 50)
    return {
      isValid: false,
      error: "Name cannot exceed 50 characters.",
    };
  if (!NAME_CHARS_RE.test(name))
    return {
      isValid: false,
      error: "Name can only contain letters, spaces, hyphens, and apostrophes.",
    };
  if (CONSECUTIVE_SEP_RE.test(name))
    return {
      isValid: false,
      error: "Name cannot have consecutive spaces, hyphens, or apostrophes.",
    };
  if (EDGE_SEP_RE.test(name))
    return {
      isValid: false,
      error: "Name cannot start or end with a space, hyphen, or apostrophe.",
    };
  return {
    isValid: true,
    error: "",
  };
}
