"use strict";
// ── Query string builder ────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildQueryString = buildQueryString;
/**
 * Build a query string from an object of key-value pairs.
 * Omits undefined/null values. Returns empty string if no params.
 *
 * @returns Query string WITH leading '?' (or empty string).
 */
function buildQueryString(params) {
    const parts = [];
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '')
            continue;
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
    return parts.length > 0 ? `?${parts.join('&')}` : '';
}
//# sourceMappingURL=querystring.js.map