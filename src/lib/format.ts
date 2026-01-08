/**
 * Formatting helpers for consistent display across the application
 */

export type Currency = "EGP" | "USD";

export type PercentMode = "decimal" | "percent";

/**
 * Format a money value with currency symbol
 * @param value - The numeric value to format (can be null)
 * @param currency - Currency type (defaults to "EGP")
 * @returns Formatted string with currency symbol, or "N/A" if value is null
 * EGP -> "{n} LE", USD -> "${n}"
 */
export function formatMoney(value: number | null, currency: Currency = "EGP"): string {
  if (value === null || isNaN(value)) return "N/A";
  const formatted = value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "USD" ? `$${formatted}` : `${formatted} LE`;
}

/**
 * Format a percentage value
 * @param value - The numeric value (can be decimal like 0.5 or percentage like 50)
 * @param mode - "decimal" if value is 0-1, "percent" if value is 0-100 (defaults to "decimal")
 * @param decimals - Number of decimal places (defaults to 2)
 * @returns Formatted string with % symbol
 */
export function formatPercent(
  value: number | null,
  mode: PercentMode = "decimal",
  decimals: number = 2
): string {
  if (value === null || isNaN(value)) return "N/A";
  const percentValue = mode === "decimal" ? value * 100 : value;
  return `${percentValue.toFixed(decimals)}%`;
}

/**
 * Format a number with optional decimal places
 * @param value - The numeric value to format (can be null)
 * @param decimals - Number of decimal places (defaults to 2)
 * @returns Formatted string, or "N/A" if value is null
 */
export function formatNumber(value: number | null, decimals: number = 2): string {
  if (value === null || isNaN(value)) return "N/A";
  return value.toFixed(decimals);
}

/**
 * Format a number with locale-specific formatting (thousands separators)
 * @param value - The numeric value to format (can be null)
 * @param decimals - Number of decimal places (defaults to 0)
 * @returns Formatted string with thousands separators, or "N/A" if value is null
 */
export function formatNumberLocale(value: number | null, decimals: number = 0): string {
  if (value === null || isNaN(value)) return "N/A";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a percentage value with 1 decimal place
 * @param value - The percentage value (0-100, not decimal)
 * @returns Formatted string with % symbol and 1 decimal place, or "—" if value is null/NaN
 */
export function formatPct(value: number | null): string {
  if (value === null || isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

