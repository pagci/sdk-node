// ── Base error ───────────────────────────────────────────────────────
/**
 * Base error for every error surfaced by the PAGCI SDK.
 * Mirrors the RFC 9457 Problem Details structure returned by the API.
 */
export class PagciError extends Error {
    /** RFC 9457 `type` URI identifying the error category. */
    type;
    /** RFC 9457 human-readable title. */
    title;
    /** HTTP status code (0 for network-level errors). */
    status;
    /** Machine-readable error code (e.g. "invalid_amount"). */
    code;
    /** Field that triggered the error, if applicable. */
    field;
    /** Server-assigned request ID for support correlation. */
    requestId;
    /** Raw deserialized response body for debugging. */
    rawResponse;
    constructor(params) {
        super(params.message);
        this.name = this.constructor.name;
        this.type = params.type ?? 'about:blank';
        this.title = params.title ?? params.message;
        this.status = params.status;
        this.code = params.code ?? 'unknown';
        this.field = params.field;
        this.requestId = params.requestId;
        this.rawResponse = params.rawResponse;
        // Maintain proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
// ── HTTP-status subclasses ───────────────────────────────────────────
/** 401 — Missing or invalid API key. */
export class AuthenticationError extends PagciError {
    constructor(params) {
        super(params);
    }
}
/** 403 — Valid credentials but insufficient permissions. */
export class ForbiddenError extends PagciError {
    constructor(params) {
        super(params);
    }
}
/** 404 — Resource not found. */
export class NotFoundError extends PagciError {
    constructor(params) {
        super(params);
    }
}
/** 400 — Validation failure (bad input). */
export class ValidationError extends PagciError {
    constructor(params) {
        super(params);
    }
}
/** 409 — Conflict (e.g. duplicate idempotency key with different params). */
export class ConflictError extends PagciError {
    constructor(params) {
        super(params);
    }
}
/** 422 — Business rule violation (e.g. insufficient wallet balance). */
export class InsufficientBalanceError extends PagciError {
    constructor(params) {
        super(params);
    }
}
/** 429 — Rate limit exceeded. */
export class RateLimitError extends PagciError {
    constructor(params) {
        super(params);
    }
}
/** 500+ — Unexpected server error. */
export class ApiError extends PagciError {
    constructor(params) {
        super(params);
    }
}
/** Network-level failure (ECONNRESET, ECONNREFUSED, etc.). */
export class ConnectionError extends PagciError {
    constructor(message, cause) {
        super({ message, status: 0, code: 'connection_error' });
        if (cause)
            this.cause = cause;
    }
}
/** Request exceeded the configured timeout. */
export class TimeoutError extends PagciError {
    constructor(timeout) {
        super({
            message: `Request timed out after ${timeout}ms`,
            status: 0,
            code: 'timeout',
        });
    }
}
/** Webhook signature verification failed — reject the payload. */
export class SignatureVerificationError extends PagciError {
    constructor(message) {
        super({ message, status: 0, code: 'signature_verification_failed' });
    }
}
// ── Factory ──────────────────────────────────────────────────────────
/** Status → PagciError subclass mapping. */
const STATUS_MAP = {
    400: ValidationError,
    401: AuthenticationError,
    403: ForbiddenError,
    404: NotFoundError,
    409: ConflictError,
    422: InsufficientBalanceError,
    429: RateLimitError,
};
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
export function errorFromResponse(status, body, headers) {
    // Parse RFC 9457 fields (defensive — body may not be an object)
    const obj = (typeof body === 'object' && body !== null ? body : {});
    const message = typeof obj['detail'] === 'string'
        ? obj['detail']
        : typeof obj['message'] === 'string'
            ? obj['message']
            : `Request failed with status ${status}`;
    const params = {
        message,
        type: typeof obj['type'] === 'string' ? obj['type'] : undefined,
        title: typeof obj['title'] === 'string' ? obj['title'] : undefined,
        status,
        code: typeof obj['code'] === 'string' ? obj['code'] : undefined,
        field: typeof obj['field'] === 'string' ? obj['field'] : undefined,
        requestId: headers['x-request-id'] ?? undefined,
        rawResponse: body,
    };
    const ErrorClass = STATUS_MAP[status] ?? ApiError;
    return new ErrorClass(params);
}
//# sourceMappingURL=errors.js.map