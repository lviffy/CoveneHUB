/**
 * CSV Export Utilities
 * Functions to generate CSV files from booking and check-in data
 */

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV(data, headers) {
  if (data.length === 0) {
    return headers.join(",") + "\n";
  }

  // CSV header row
  const csvHeaders = headers.join(",");

  // CSV data rows
  const csvRows = data
    .map((row) => {
      return headers
        .map((header) => {
          const value = row[header];

          // Handle null/undefined
          if (value === null || value === undefined) {
            return "";
          }

          // Convert to string and escape
          let cellValue = String(value);

          // Escape quotes by doubling them
          cellValue = cellValue.replace(/"/g, '""');

          // Wrap in quotes if contains comma, newline, or quote
          if (
            cellValue.includes(",") ||
            cellValue.includes("\n") ||
            cellValue.includes('"')
          ) {
            cellValue = `"${cellValue}"`;
          }
          return cellValue;
        })
        .join(",");
    })
    .join("\n");
  return `${csvHeaders}\n${csvRows}`;
}

/**
 * Download CSV file in browser
 */
export function downloadCSV(csvContent, filename) {
  // Add BOM for Excel UTF-8 support
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    // Create download link
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Format bookings data for CSV export
 */
export function formatBookingsForCSV(bookings) {
  const headers = [
    "Booking Code",
    "Booking ID",
    "User Name",
    "Email",
    "Phone",
    "Tickets",
    "Amount (₹)",
    "Status",
    "Booked At",
    "Checked In",
    "Check-in Time",
    "Checked In By",
  ];
  const data = bookings.map((b) => ({
    "Booking Code": b.booking_code,
    "Booking ID": b.booking_id,
    "User Name": b.user_name,
    Email: b.user_email,
    Phone: b.user_phone,
    Tickets: b.tickets_count,
    "Amount (₹)": b.total_amount,
    Status: b.booking_status,
    "Booked At": b.booked_at,
    "Checked In": b.checked_in ? "Yes" : "No",
    "Check-in Time": b.checked_in_at || "-",
    "Checked In By": b.checked_in_by_name || "-",
  }));
  return arrayToCSV(data, headers);
}

/**
 * Format check-ins data for CSV export
 */
export function formatCheckInsForCSV(checkIns) {
  const headers = [
    "Booking Code",
    "Booking ID",
    "User Name",
    "Email",
    "Phone",
    "Tickets",
    "Booked At",
    "Check-in Time",
    "Checked In By",
  ];
  const data = checkIns.map((c) => ({
    "Booking Code": c.booking_code,
    "Booking ID": c.booking_id,
    "User Name": c.user_name,
    Email: c.user_email,
    Phone: c.user_phone,
    Tickets: c.tickets_count,
    "Booked At": c.booked_at,
    "Check-in Time": c.checked_in_at,
    "Checked In By": c.checked_in_by_name,
  }));
  return arrayToCSV(data, headers);
}

/**
 * Generate filename with timestamp
 */
export function generateCSVFilename(eventTitle, type) {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const sanitizedTitle = eventTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return `${sanitizedTitle}_${type}_${timestamp}.csv`;
}
