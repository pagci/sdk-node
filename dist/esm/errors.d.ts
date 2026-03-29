/**
 * Base error for every error surfaced by the PAGCI SDK.
 * Mirrors the RFC 9457 Problem Details structure returned by the API.
 */
export declare class PagciError extends Error {
    /** RFC 9457 `type` URI identifying the error category. */
    readonly type: string;
    /** RFC 9457 human-readable title. */
    readonly title: string;
    /** HTTP status code (0 for network-level errors). */
    readonly status: number;
    /** Machine-readable error code (e.g. "invalid_amount"). */
    readonly code: string;
    /** Field that triggered the error, if applicable. */
    readonly field?: string;
    /** Server-assigned request ID for support correlation. */
    readonly requestId?: string;
    /** Raw deserialized response body for debugging. */
    readonly rawResponse?: unknown;
    constructor(params: {
        message: string;
        type?: string;
        title?: string;
        status: number;
        code?: string;
        field?: string;
        requestId?: string;
        rawResponse?: unknown;
    });
}
/** 401 — Missing or invalid API key. */
export declare class AuthenticationError extends PagciError {
    constructor(params: ConstructorParameters<typeof PagciError>[0]);
}
/** 403 — Valid credentials but insufficient permissions. */
export declare class ForbiddenError extends PagciError {
    constructor(params: ConstructorParameters<typeof PagciError>[0]);
}
/** 404 — Resource not found. */
export declare class NotFoundError extends PagciError {
    constructor(params: ConstructorParameters<typeof PagciError>[0]);
}
/** 400 — Validation failure (bad input). */
export declare class ValidationError extends PagciError {
    constructor(params: ConstructorParameters<typeof PagciError>[0]);
}
/** 409 — Conflict (e.g. duplicate idempotency key with different params). */
export declare class ConflictError extends PagciError {
    constructor(params: ConstructorParameters<typeof PagciError>[0]);
}
/** 422 — Business rule violation (e.g. insufficient wallet balance). */
export declare class InsufficientBalanceError extends PagciError {
    constructor(params: ConstructorParameters<typeof PagciError>[0]);
}
/** 429 — Rate limit exceeded. */
export declare class RateLimitError extends PagciError {
    constructor(params: ConstructorParameters<typeof PagciError>[0]);
}
/** 500+ — Unexpected server error. */
export declare class ApiError extends PagciError {
    constructor(params: ConstructorParameters<typeof PagciError>[0]);
}
/** Network-level failure (ECONNRESET, ECONNREFUSED, etc.). */
export declare class ConnectionError extends PagciError {
    constructor(message: string, cause?: Error);
}
/** Request exceeded the configured timeout. */
export declare class TimeoutError extends PagciError {
    constructor(timeout: number);
}
/** Webhook signature verification failed — reject the payload. */
export declare class SignatureVerificationError extends PagciError {
    constructor(message: string);
}
/**
 * Build the appropriate PagciError subclass from an HTTP response.
 *
 * The response body is expected to follow RFC 9457 Problem Details:
 * ```json
 * {
 *   "type": "https://api.pagci.com/errors/validation",
 *   "title": "Validation Error",
 *   "status": 400,
 *   "detail": "amount must be positive",
 *   "code": "invalid_amount",
 *   "field": "amount"
 * }
 * ```
 */
export declare function errorFromResponse(status: number, body: unknown, headers: Record<string, string>): PagciError;
//# sourceMappingURL=errors.d.ts.map