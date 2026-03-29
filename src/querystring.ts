// ── Query string builder ────────────────────────────────────────────

/**
 * Build a query string from an object of key-value pairs.
 * Omits undefined/null values. Returns empty string if no params.
 *
 * @returns Query string WITH leading '?' (or empty string).
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}
