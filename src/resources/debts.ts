// ── Debts resource ──────────────────────────────────────────────────

import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type {
  CreateDebtParams,
  CreateDebtResponse,
  DebtListItem,
  DebtListParams,
} from '../types/index.js';
import type { ListResponse, StatusResponse } from '../types/common.js';
import { Page } from '../pagination.js';
import { buildQueryString } from '../querystring.js';

export class DebtsResource {
  constructor(private readonly sender: RequestSender) {}

  /** Create a new debt. */
  async create(
    params: CreateDebtParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<CreateDebtResponse>> {
    return this.sender.request<CreateDebtResponse>(
      'POST',
      '/debts',
      params,
      options,
    );
  }

  /** List debts with cursor-based pagination. */
  list(params?: DebtListParams): Page<DebtListItem> {
    return new Page((cursor) => {
      const query = buildQueryString({ ...params, cursor });
      return this.sender
        .request<ListResponse<DebtListItem>>('GET', `/debts${query}`)
        .then((res) => res as ListResponse<DebtListItem>);
    });
  }

  /** Cancel a pending debt. */
  async cancel(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<StatusResponse>> {
    return this.sender.request<StatusResponse>(
      'DELETE',
      `/debts/${id}`,
      undefined,
      options,
    );
  }

  /** Reverse a paid debt. */
  async reverse(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<StatusResponse>> {
    return this.sender.request<StatusResponse>(
      'POST',
      `/debts/${id}/reverse`,
      undefined,
      options,
    );
  }
}
