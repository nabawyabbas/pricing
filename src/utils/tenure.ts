/**
 * Format tenure since a hiring date
 * Returns "X years Y months" with proper pluralization
 * Handles day-of-month adjustment (e.g., hired on 15th, today is 10th = 0 months)
 */
export function formatTenureSince(hiringDate: Date, now: Date = new Date()): string {
  if (hiringDate > now) {
    return "0 months"; // Future date
  }

  let years = now.getFullYear() - hiringDate.getFullYear();
  let months = now.getMonth() - hiringDate.getMonth();

  // Adjust for day of month
  if (now.getDate() < hiringDate.getDate()) {
    months--;
  }

  // Adjust years if months is negative
  if (months < 0) {
    years--;
    months += 12;
  }

  const yearText = years === 1 ? "year" : "years";
  const monthText = months === 1 ? "month" : "months";

  if (years === 0 && months === 0) {
    return "0 months";
  } else if (years === 0) {
    return `${months} ${monthText}`;
  } else if (months === 0) {
    return `${years} ${yearText}`;
  } else {
    return `${years} ${yearText} ${months} ${monthText}`;
  }
}



