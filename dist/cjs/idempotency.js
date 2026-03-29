"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIdempotencyKey = generateIdempotencyKey;
const node_crypto_1 = require("node:crypto");
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
function generateIdempotencyKey() {
    // Timestamp component: milliseconds since epoch in base-36
    const ts = Date.now().toString(36).padStart(8, '0');
    // Random component: 12 bytes → base-36 string → first 18 chars
    const rand = (0, node_crypto_1.randomBytes)(12)
        .reduce((acc, byte) => acc + byte.toString(36).padStart(2, '0'), '')
        .slice(0, 18);
    return `idem_${ts}${rand}`;
}
//# sourceMappingURL=idempotency.js.map