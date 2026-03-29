import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type { Balance, TotalBalance, WalletListParams } from '../types/index.js';
import { Page } from '../pagination.js';
export declare class BalanceResource {
    private readonly sender;
    constructor(sender: RequestSender);
    /** Get account-level total balance (sum across all wallets). */
    getTotal(options?: RequestOptions): Promise<ApiResponse<TotalBalance>>;
    /** Get balance for a specific wallet. */
    getWallet(walletId: string, options?: RequestOptions): Promise<ApiResponse<Balance>>;
    /** List all wallets with their balances. */
    listWallets(params?: WalletListParams): Page<Balance>;
}
//# sourceMappingURL=balance.d.ts.map