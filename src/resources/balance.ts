// ── Balance resource ────────────────────────────────────────────────

import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type { Balance, TotalBalance, WalletListParams } from '../types/index.js';
import type { ListResponse } from '../types/common.js';
import { Page } from '../pagination.js';
import { buildQueryString } from '../querystring.js';

export class BalanceResource {
  constructor(private readonly sender: RequestSender) {}

  /** Get account-level total balance (sum across all wallets). */
  async getTotal(
    options?: RequestOptions,
  ): Promise<ApiResponse<TotalBalance>> {
    return this.sender.request<TotalBalance>(
      'GET',
      '/user/balance',
      undefined,
      options,
    );
  }

  /** Get balance for a specific wallet. */
  async getWallet(
    walletId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Balance>> {
    return this.sender.request<Balance>(
      'GET',
      `/user/wallets/${walletId}/balance`,
      undefined,
      options,
    );
  }

  /** List all wallets with their balances. */
  listWallets(params?: WalletListParams): Page<Balance> {
    return new Page((cursor) => {
      const query = buildQueryString({ ...params, cursor });
      return this.sender
        .request<ListResponse<Balance>>('GET', `/user/wallets${query}`)
        .then((res) => res as ListResponse<Balance>);
    });
  }
}
