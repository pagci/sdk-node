/**
 * Generate a unique, timestamp-sortable idempotency key.
 *
 * Format: `idem_{base36_timestamp_8}{base36_random_18}` (32 chars total)
 *
 * The timestamp prefix (ms since epoch in base-36, zero-padded to 8 chars)
 * ensures keys sort chronologically. The random suffix (12 random bytes
 * encoded as base-36, truncated to 18 chars) ensures uniqueness.
 *
 * This key must be generated ONCE per logical create() call and reused
 * across retries of that same call.
 */
export declare function generateIdempotencyKey(): string;
//# sourceMappingURL=idempotency.d.ts.map