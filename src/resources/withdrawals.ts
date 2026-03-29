// ── Withdrawals resource ────────────────────────────────────────────

import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type {
  Withdrawal,
  CreateWithdrawalParams,
  CreateWithdrawalResponse,
  WithdrawalListParams,
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
}
