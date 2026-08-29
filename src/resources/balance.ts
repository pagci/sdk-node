// ── Balance resource ────────────────────────────────────────────────

import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type { Balance, BatchBalance, TotalBalance, WalletListParams } from '../types/index.js';
import type { ListResponse } from '../types/common.js';
import { Page } from '../pagination.js';
import { buildQueryString } from '../querystring.js';

/** Options for {@link BalanceResource.batch}. */
export interface BatchBalanceOptions extends RequestOptions {
  /** When true, the response includes a per-wallet breakdown under `wallets`. */
  includeWallets?: boolean;
}

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

  /**
   * Get aggregated balance for an arbitrary subset of wallets (1 to 1000 IDs).
   * Returns the summed available/locked/pending/scheduled/debt across the
   * requested wallets. Pass `includeWallets: true` to also receive the
   * per-wallet breakdown in the `wallets` field.
   *
   * Duplicated wallet IDs are deduped server-side.
   */
  async batch(
    walletIds: string[],
    options?: BatchBalanceOptions,
  ): Promise<ApiResponse<BatchBalance>> {
    const { includeWallets, ...rest } = options ?? {};
    const path = includeWallets
      ? '/user/balance/batch?wallets=true'
      : '/user/balance/batch';
    return this.sender.request<BatchBalance>(
      'POST',
      path,
      { wallet_ids: walletIds },
      rest,
    );
  }
}
