// ── Configuration ────────────────────────────────────────────────────
export const DEFAULT_RETRY_CONFIG = {
    maxRetries: 2,
    initialDelay: 500,
    maxDelay: 15_000,
};
// ── Retry eligibility ────────────────────────────────────────────────
/** HTTP methods that are inherently idempotent. */
const IDEMPOTENT_METHODS = new Set(['GET', 'DELETE', 'PUT', 'HEAD', 'OPTIONS']);
/** HTTP status codes that warrant an automatic retry. */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
/**
 * Determine whether a failed request should be retried.
 *
 * Rules:
 * - Status 429, 5xx are retryable.
 * - GET / DELETE / PUT / HEAD / OPTIONS are always safe to retry.
 * - POST is retryable ONLY if an idempotency key was provided.
 * - PATCH follows POST rules (not inherently idempotent).
 */
export function shouldRetry(status, method, hasIdempotencyKey) {
    if (!RETRYABLE_STATUSES.has(status))
        return false;
    const upper = method.toUpperCase();
    if (IDEMPOTENT_METHODS.has(upper))
        return true;
    // POST / PATCH: only retry with an idempotency key
    return hasIdempotencyKey;
}
/**
 * Check whether a connection-level error (no HTTP response) is retryable.
 */
export function isRetriableConnectionError(err) {
    if (typeof err === 'object' && err !== null && 'retriable' in err) {
        return err.retriable === true;
    }
    return false;
}
// ── Delay calculation ────────────────────────────────────────────────
/** Maximum value we'll honour from a Retry-After header (seconds). */
const MAX_RETRY_AFTER_SECONDS = 60;
/**
 * Calculate the delay (in ms) before the next retry.
 *
 * Strategy: exponential backoff with jitter.
 *   delay = min(initialDelay * 2^attempt, maxDelay) * random(0.5, 1.0)
 *
 * If the server sent a `Retry-After` header (seconds), we use that
 * instead — capped at 60 s to avoid absurd waits.
 */
export function retryDelay(attempt, retryAfterHeader, config) {
    // Honour Retry-After if present and parseable
    if (retryAfterHeader !== undefined) {
        const seconds = Number(retryAfterHeader);
        if (!Number.isNaN(seconds) && seconds > 0) {
            const capped = Math.min(seconds, MAX_RETRY_AFTER_SECONDS);
            return capped * 1_000;
        }
    }
    // Exponential backoff: initialDelay * 2^attempt, capped at maxDelay
    const base = Math.min(config.initialDelay * 2 ** attempt, config.maxDelay);
    // Jitter: multiply by random factor in [0.5, 1.0)
    const jitter = 0.5 + Math.random() * 0.5;
    return Math.round(base * jitter);
}
//# sourceMappingURL=retry.js.map