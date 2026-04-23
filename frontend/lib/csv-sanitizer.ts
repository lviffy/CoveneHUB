/**
 * CSV Sanitization Utility
 * Prevents CSV formula injection attacks (CSV Injection / Formula Injection)
 * 
 * Following OWASP guidelines:
 * https://owasp.org/www-community/attacks/CSV_Injection
 */

/**
 * Sanitize a single CSV value to prevent formula injection
 * 
 * Formula injection occurs when spreadsheet applications (Excel, LibreOffice, Google Sheets)
 * interpret cell values starting with special characters as formulas:
 * - = (equals) - Formula start
 * - + (plus) - Formula start
 * - - (minus) - Formula start  
 * - @ (at) - Formula start
 * - \t (tab) - Can be used in formula context
 * - \r (carriage return) - Can be used in formula context
 * 
 * Attack examples:
 * =1+1                     → Executes as formula
 * =cmd|'/c calc'!A1        → May execute commands
 * @SUM(A1:A999)            → References other cells
 * +1+1                     → Treated as formula
 * 
 * @param value - Any value to be included in CSV
 * @returns Sanitized string safe for CSV export
 */
export function sanitizeCSVValue(value: any): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string and trim
  let stringValue = String(value).trim();

  // If empty after trim, return empty string
  if (!stringValue) {
    return '';
  }

  // Detect formula characters at the start of the value
  // These characters can make spreadsheet applications interpret the cell as a formula
  const formulaChars = ['=', '+', '-', '@', '\t', '\r'];
  
  if (formulaChars.some(char => stringValue.startsWith(char))) {
    // Prefix with single quote to force text interpretation
    // Excel/LibreOffice treat cells starting with ' as plain text
    // The quote itself is not displayed in the spreadsheet
    stringValue = `'${stringValue}`;
  }

  // Escape double quotes by doubling them (CSV standard)
  stringValue = stringValue.replace(/"/g, '""');

  // Wrap in quotes if contains special CSV characters
  if (
    stringValue.includes(',') ||
    stringValue.includes('\n') ||
    stringValue.includes('"') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue}"`;
  }

  return stringValue;
}

/**
 * Sanitize and join a row of CSV values
 * 
 * @param row - Array of values for a single CSV row
 * @returns CSV-formatted row string
 */
export function sanitizeCSVRow(row: any[]): string {
  return row.map(sanitizeCSVValue).join(',');
}

/**
 * Generate complete CSV content with headers and rows
 * 
 * @param headers - Array of header column names
 * @param rows - 2D array of data rows
 * @returns Complete CSV string with headers and data
 */
export function generateSafeCSV(headers: string[], rows: any[][]): string {
  const headerLine = sanitizeCSVRow(headers);
  const dataLines = rows.map(row => sanitizeCSVRow(row));
  
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Test if a value would be treated as a formula
 * Useful for validation/warning purposes
 * 
 * @param value - Value to test
 * @returns True if value starts with formula character
 */
export function isFormulaLike(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  const stringValue = String(value).trim();
  const formulaChars = ['=', '+', '-', '@', '\t', '\r'];
  
  return formulaChars.some(char => stringValue.startsWith(char));
}
