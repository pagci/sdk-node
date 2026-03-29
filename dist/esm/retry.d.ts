export interface RetryConfig {
    /** Maximum number of automatic retries (default 2). */
    maxRetries: number;
    /** Base delay in ms before first retry (default 500). */
    initialDelay: number;
    /** Ceiling for computed delay in ms (default 15 000). */
    maxDelay: number;
}
export declare const DEFAULT_RETRY_CONFIG: Readonly<RetryConfig>;
/**
 * Determine whether a failed request should be retried.
 *
 * Rules:
 * - Status 429, 5xx are retryable.
 * - GET / DELETE / PUT / HEAD / OPTIONS are always safe to retry.
 * - POST is retryable ONLY if an idempotency key was provided.
 * - PATCH follows POST rules (not inherently idempotent).
 */
export declare function shouldRetry(status: number, method: string, hasIdempotencyKey: boolean): boolean;
/**
 * Check whether a connection-level error (no HTTP response) is retryable.
 */
export declare function isRetriableConnectionError(err: unknown): boolean;
/**
 * Calculate the delay (in ms) before the next retry.
 *
 * Strategy: exponential backoff with jitter.
 *   delay = min(initialDelay * 2^attempt, maxDelay) * random(0.5, 1.0)
 *
 * If the server sent a `Retry-After` header (seconds), we use that
 * instead — capped at 60 s to avoid absurd waits.
 */
export declare function retryDelay(attempt: number, retryAfterHeader: string | undefined, config: RetryConfig): number;
//# sourceMappingURL=retry.d.ts.map