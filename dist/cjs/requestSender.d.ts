import type { HttpClient } from './net/HttpClient.js';
import type { RetryConfig } from './retry.js';
export interface RequestOptions {
    /** Idempotency key for mutating requests. Reused across retries. */
    idempotencyKey?: string;
    /** Per-request timeout override (ms). */
    timeout?: number;
    /** Per-request max retries override. */
    maxRetries?: number;
}
/** Response metadata attached to every successful API result. */
export interface ResponseMeta {
    status: number;
    headers: Record<string, string>;
    requestId: string;
}
/**
 * Successful API response — the deserialized body `T` extended with
 * non-enumerable `_response` metadata.
 */
export type ApiResponse<T> = T & {
    _response: ResponseMeta;
};
/**
 * Core HTTP engine. Handles:
 * - Header construction (auth, content-type, idempotency)
 * - JSON serialization / deserialization
 * - Retry loop with exponential backoff + jitter
 * - Error mapping (HTTP status → PagciError subclass)
 */
export declare class RequestSender {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly httpClient;
    private readonly retryConfig;
    private readonly defaultTimeout;
    constructor(apiKey: string, baseUrl: string, httpClient: HttpClient, retryConfig: RetryConfig, defaultTimeout: number);
    request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
}
//# sourceMappingURL=requestSender.d.ts.map