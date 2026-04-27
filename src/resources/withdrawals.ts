// ── Withdrawals resource ────────────────────────────────────────────

import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type {
  Withdrawal,
  CreateWithdrawalParams,
  CreateWithdrawalResponse,
  WithdrawalListParams,
  WithdrawalSummary,
} from '../types/index.js';
import type { ListResponse } from '../types/common.js';
import { Page } from '../pagination.js';
import { generateIdempotencyKey } from '../idempotency.js';
import { buildQueryString } from '../querystring.js';

export class WithdrawalsResource {
  constructor(private readonly sender: RequestSender) {}

  /**
   * Create a new withdrawal (PIX payout).
   *
   * Returns 202 Accepted. The withdrawal is processed asynchronously.
   * Automatically generates an idempotency key if none is provided.
   */
  async create(
    params: CreateWithdrawalParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<CreateWithdrawalResponse>> {
    return this.sender.request<CreateWithdrawalResponse>(
      'POST',
      '/withdrawals',
      params,
      {
        ...options,
        idempotencyKey: options?.idempotencyKey ?? generateIdempotencyKey(),
      },
    );
  }

  /**
   * List withdrawals with cursor-based pagination.
   */
  list(params?: WithdrawalListParams): Page<Withdrawal> {
    return new Page((cursor) => {
      const query = buildQueryString({ ...params, cursor });
      return this.sender
        .request<ListResponse<Withdrawal>>('GET', `/withdrawals${query}`)
        .then((res) => res as ListResponse<Withdrawal>);
    });
  }

  /** Get a single withdrawal by ID. */
  async get(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Withdrawal>> {
    return this.sender.request<Withdrawal>(
      'GET',
      `/withdrawals/${id}`,
      undefined,
      options,
    );
  }

  /** Get the receipt for a settled withdrawal. */
  async getReceipt(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.sender.request<Record<string, unknown>>(
      'GET',
      `/withdrawals/${id}/receipt`,
      undefined,
      options,
    );
  }

  /**
   * Get the 4-card lifetime summary for the authenticated owner.
   *
   * Returns four int64 cents totals plus an optional last_updated_at
   * RFC3339 timestamp. See `WithdrawalSummary` for field semantics.
   *
   * Failure semantics:
   * - 503 `clickhouse_unavailable` — analytics infra down; retry with backoff.
   * - 500 `internal_error` — MongoDB error; retry with backoff.
   * - 401 `unauthorized` — token missing or invalid.
   *
   * Source: GET /withdrawals/summary (Phase 104).
   */
  async summary(
    options?: RequestOptions,
  ): Promise<ApiResponse<WithdrawalSummary>> {
    return this.sender.request<WithdrawalSummary>(
      'GET',
      '/withdrawals/summary',
      undefined,
      options,
    );
  }
}
