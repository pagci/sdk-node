"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestSender = void 0;
const retry_js_1 = require("./retry.js");
const errors_js_1 = require("./errors.js");
// ── SDK version (injected as User-Agent) ─────────────────────────────
const SDK_VERSION = '0.1.0';
// ── RequestSender ────────────────────────────────────────────────────
/**
 * Core HTTP engine. Handles:
 * - Header construction (auth, content-type, idempotency)
 * - JSON serialization / deserialization
 * - Retry loop with exponential backoff + jitter
 * - Error mapping (HTTP status → PagciError subclass)
 */
class RequestSender {
    apiKey;
    baseUrl;
    httpClient;
    retryConfig;
    defaultTimeout;
    constructor(apiKey, baseUrl, httpClient, retryConfig, defaultTimeout) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.httpClient = httpClient;
        this.retryConfig = retryConfig;
        this.defaultTimeout = defaultTimeout;
    }
    async request(method, path, body, options) {
        const url = `${this.baseUrl}${path}`;
        const timeout = options?.timeout ?? this.defaultTimeout;
        const maxRetries = options?.maxRetries ?? this.retryConfig.maxRetries;
        const idempotencyKey = options?.idempotencyKey;
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'application/json',
            'User-Agent': `pagci-node/${SDK_VERSION}`,
        };
        let serializedBody;
        if (body !== undefined) {
            headers['Content-Type'] = 'application/json';
            serializedBody = JSON.stringify(body);
        }
        if (idempotencyKey) {
            headers['Idempotency-Key'] = idempotencyKey;
        }
        // ── Retry loop ─────────────────────────────────────────────────
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            // Wait before retries (not before the first attempt)
            if (attempt > 0) {
                const delay = (0, retry_js_1.retryDelay)(attempt - 1, lastError?.status === 429
                    ? lastError.rawResponse?.['retry-after']
                    : undefined, this.retryConfig);
                await sleep(delay);
            }
            try {
                const res = await this.httpClient.request(method, url, headers, serializedBody, timeout);
                // ── Success ──────────────────────────────────────────────
                if (res.status >= 200 && res.status < 300) {
                    const parsed = (res.body.length > 0 ? JSON.parse(res.body) : {});
                    const response = Object.assign(parsed, {
                        _response: {
                            status: res.status,
                            headers: res.headers,
                            requestId: res.headers['x-request-id'] ?? '',
                        },
                    });
                    return response;
                }
                // ── Error response ───────────────────────────────────────
                let parsedBody;
                try {
                    parsedBody = res.body.length > 0 ? JSON.parse(res.body) : {};
                }
                catch {
                    parsedBody = { detail: res.body };
                }
                const apiErr = (0, errors_js_1.errorFromResponse)(res.status, parsedBody, res.headers);
                if (attempt < maxRetries &&
                    (0, retry_js_1.shouldRetry)(res.status, method, idempotencyKey !== undefined)) {
                    // Use Retry-After from response headers for delay calc
                    lastError = apiErr;
                    // Store retry-after on the error for delay calculation
                    if (res.headers['retry-after']) {
                        lastError._retryAfter =
                            res.headers['retry-after'];
                    }
                    continue;
                }
                throw apiErr;
            }
            catch (err) {
                // Re-throw PagciError subclasses (already mapped)
                if (err instanceof errors_js_1.PagciError) {
                    throw err;
                }
                // Connection / timeout errors
                const error = err;
                const isTimeout = error.code === 'ETIMEDOUT' ||
                    error.message?.includes('timed out');
                if (isTimeout) {
                    const timeoutErr = new errors_js_1.TimeoutError(timeout);
                    if (attempt < maxRetries) {
                        lastError = timeoutErr;
                        continue;
                    }
                    throw timeoutErr;
                }
                if ((0, retry_js_1.isRetriableConnectionError)(err) && attempt < maxRetries) {
                    lastError = new errors_js_1.ConnectionError(error.message, error);
                    continue;
                }
                throw new errors_js_1.ConnectionError(error.message ?? 'Unknown error', error);
            }
        }
        // Should be unreachable — the loop always throws or returns.
        // But satisfy the compiler:
        throw lastError ?? new errors_js_1.ConnectionError('Request failed after retries');
    }
}
exports.RequestSender = RequestSender;
// ── Helpers ──────────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=requestSender.js.map