// ── Balance resource ────────────────────────────────────────────────
import { Page } from '../pagination.js';
import { buildQueryString } from '../querystring.js';
export class BalanceResource {
    sender;
    constructor(sender) {
        this.sender = sender;
    }
    /** Get account-level total balance (sum across all wallets). */
    async getTotal(options) {
        return this.sender.request('GET', '/user/balance', undefined, options);
    }
    /** Get balance for a specific wallet. */
    async getWallet(walletId, options) {
        return this.sender.request('GET', `/user/wallets/${walletId}/balance`, undefined, options);
    }
    /** List all wallets with their balances. */
    listWallets(params) {
        return new Page((cursor) => {
            const query = buildQueryString({ ...params, cursor });
            return this.sender
                .request('GET', `/user/wallets${query}`)
                .then((res) => res);
        });
    }
}
//# sourceMappingURL=balance.js.map