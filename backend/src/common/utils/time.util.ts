/**
 * Time parsing utility — single source of truth for departure time parsing.
 * Supports both 24-hour ("14:30") and 12-hour ("2:30 PM") formats.
 */

export interface ParsedTime {
  hours: number;
  minutes: number;
}

/**
 * Parse a raw time string into hours and minutes.
 * Handles: "14:30", "2:30 PM", "10:00am", "10:00 AM"
 * Falls back to midnight (00:00) on unrecognised input rather than throwing.
 */
export function parseTimeString(raw: string): ParsedTime {
  const trimmed = raw?.trim() ?? '';

  // 12-hour format — "H:MM AM/PM" with optional space
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return { hours: h, minutes: m };
  }

  // 24-hour format — "HH:MM"
  const parts = trimmed.split(':').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { hours: parts[0], minutes: parts[1] };
  }

  // Fallback — caller should validate the result
  return { hours: 0, minutes: 0 };
}

/**
 * Combine a date and a raw departure-time string into a full Date object.
 */
export function buildDepartureDate(routeDate: Date, rawDepartureTime: string): Date {
  const { hours, minutes } = parseTimeString(rawDepartureTime);
  const dt = new Date(routeDate);
  dt.setHours(hours, minutes, 0, 0);
  return dt;
}
