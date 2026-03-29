import type { HttpClient } from './net/HttpClient.js';
import type { RetryConfig } from './retry.js';
import {
  shouldRetry,
  isRetriableConnectionError,
  retryDelay,
} from './retry.js';
import {
  errorFromResponse,
  ConnectionError,
  TimeoutError,
  PagciError,
} from './errors.js';

// ── Types ────────────────────────────────────────────────────────────

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
export type ApiResponse<T> = T & { _response: ResponseMeta };

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
export class RequestSender {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly httpClient: HttpClient,
    private readonly retryConfig: RetryConfig,
    private readonly defaultTimeout: number,
  ) {}

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const timeout = options?.timeout ?? this.defaultTimeout;
    const maxRetries = options?.maxRetries ?? this.retryConfig.maxRetries;
    const idempotencyKey = options?.idempotencyKey;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      'User-Agent': `pagci-node/${SDK_VERSION}`,
    };

    let serializedBody: string | undefined;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      serializedBody = JSON.stringify(body);
    }

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    // ── Retry loop ─────────────────────────────────────────────────

    let lastError: PagciError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Wait before retries (not before the first attempt)
      if (attempt > 0) {
        const delay = retryDelay(
          attempt - 1,
          lastError?.status === 429
            ? (lastError.rawResponse as Record<string, string> | undefined)?.[
                'retry-after'
              ]
            : undefined,
          this.retryConfig,
        );
        await sleep(delay);
      }

      try {
        const res = await this.httpClient.request(
          method,
          url,
          headers,
          serializedBody,
          timeout,
        );

        // ── Success ──────────────────────────────────────────────
        if (res.status >= 200 && res.status < 300) {
          const parsed = (
            res.body.length > 0 ? JSON.parse(res.body) : {}
          ) as T;

          const response: ApiResponse<T> = Object.assign(parsed as object, {
            _response: {
              status: res.status,
              headers: res.headers,
              requestId: res.headers['x-request-id'] ?? '',
            },
          }) as ApiResponse<T>;

          return response;
        }

        // ── Error response ───────────────────────────────────────
        let parsedBody: unknown;
        try {
          parsedBody = res.body.length > 0 ? JSON.parse(res.body) : {};
        } catch {
          parsedBody = { detail: res.body };
        }

        const apiErr = errorFromResponse(res.status, parsedBody, res.headers);

        if (
          attempt < maxRetries &&
          shouldRetry(res.status, method, idempotencyKey !== undefined)
        ) {
          // Use Retry-After from response headers for delay calc
          lastError = apiErr;
          // Store retry-after on the error for delay calculation
          if (res.headers['retry-after']) {
            (lastError as PagciError & { _retryAfter?: string })._retryAfter =
              res.headers['retry-after'];
          }
          continue;
        }

        throw apiErr;
      } catch (err) {
        // Re-throw PagciError subclasses (already mapped)
        if (err instanceof PagciError) {
          throw err;
        }

        // Connection / timeout errors
        const error = err as Error & { retriable?: boolean; code?: string };
        const isTimeout =
          error.code === 'ETIMEDOUT' ||
          error.message?.includes('timed out');

        if (isTimeout) {
          const timeoutErr = new TimeoutError(timeout);
          if (attempt < maxRetries) {
            lastError = timeoutErr;
            continue;
          }
          throw timeoutErr;
        }

        if (isRetriableConnectionError(err) && attempt < maxRetries) {
          lastError = new ConnectionError(error.message, error);
          continue;
        }

        throw new ConnectionError(error.message ?? 'Unknown error', error);
      }
    }

    // Should be unreachable — the loop always throws or returns.
    // But satisfy the compiler:
    throw lastError ?? new ConnectionError('Request failed after retries');
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
