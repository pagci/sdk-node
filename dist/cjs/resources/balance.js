"use strict";
// ── Balance resource ────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceResource = void 0;
const pagination_js_1 = require("../pagination.js");
const querystring_js_1 = require("../querystring.js");
class BalanceResource {
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
        return new pagination_js_1.Page((cursor) => {
            const query = (0, querystring_js_1.buildQueryString)({ ...params, cursor });
            return this.sender
                .request('GET', `/user/wallets${query}`)
                .then((res) => res);
        });
    }
}
exports.BalanceResource = BalanceResource;
//# sourceMappingURL=balance.js.map