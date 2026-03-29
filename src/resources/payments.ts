// ── Payments resource ───────────────────────────────────────────────

import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type {
  Payment,
  PaymentCompact,
  CreatePaymentParams,
  RefundParams,
  RefundResponse,
  PaymentListParams,
  StatusCount,
} from '../types/index.js';
import type { ListResponse, StatusResponse } from '../types/common.js';
import { Page } from '../pagination.js';
import { generateIdempotencyKey } from '../idempotency.js';
import { buildQueryString } from '../querystring.js';

/** Payment list response includes status_counts alongside data. */
export interface PaymentListResponse extends ListResponse<PaymentCompact> {
  status_counts: StatusCount[];
}

export class PaymentsResource {
  constructor(private readonly sender: RequestSender) {}

  /**
   * Create a new PIX payment.
   *
   * Automatically generates an idempotency key if none is provided.
   */
  async create(
    params: CreatePaymentParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<Payment>> {
    return this.sender.request<Payment>('POST', '/payments', params, {
      ...options,
      idempotencyKey: options?.idempotencyKey ?? generateIdempotencyKey(),
    });
  }

  /**
   * List payments with cursor-based pagination.
   *
   * Returns a `Page` that supports async iteration, manual navigation,
   * and `autoPagingToArray()`.
   */
  list(params?: PaymentListParams): Page<PaymentCompact> {
    return new Page((cursor) => {
      const query = buildQueryString({ ...params, cursor });
      return this.sender
        .request<PaymentListResponse>('GET', `/payments${query}`)
        .then((res) => res as ListResponse<PaymentCompact>);
    });
  }

  /** Get a single payment by ID. */
  async get(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Payment>> {
    return this.sender.request<Payment>('GET', `/payments/${id}`, undefined, options);
  }

  /**
   * Refund a payment (fully or partially).
   *
   * Pass `{ amount }` for proportional refund or `{ recipients }` for
   * per-recipient distribution. These are mutually exclusive.
   */
  async refund(
    id: string,
    params: RefundParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<RefundResponse>> {
    return this.sender.request<RefundResponse>(
      'POST',
      `/payments/${id}/refund`,
      params,
      options,
    );
  }

  /** Release a held recipient on a payment. */
  async releaseRecipient(
    paymentId: string,
    walletId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<StatusResponse>> {
    return this.sender.request<StatusResponse>(
      'POST',
      `/payments/${paymentId}/recipients/${walletId}/release`,
      undefined,
      options,
    );
  }

  /**
   * Get the receipt for a confirmed payment.
   *
   * Returns the raw response; the receipt format depends on the API
   * (typically PDF binary or a JSON with a URL).
   */
  async getReceipt(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.sender.request<Record<string, unknown>>(
      'GET',
      `/payments/${id}/receipt`,
      undefined,
      options,
    );
  }
}
