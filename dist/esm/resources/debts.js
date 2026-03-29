// ── Debts resource ──────────────────────────────────────────────────
import { Page } from '../pagination.js';
import { buildQueryString } from '../querystring.js';
export class DebtsResource {
    sender;
    constructor(sender) {
        this.sender = sender;
    }
    /** Create a new debt. */
    async create(params, options) {
        return this.sender.request('POST', '/debts', params, options);
    }
    /** List debts with cursor-based pagination. */
    list(params) {
        return new Page((cursor) => {
            const query = buildQueryString({ ...params, cursor });
            return this.sender
                .request('GET', `/debts${query}`)
                .then((res) => res);
        });
    }
    /** Cancel a pending debt. */
    async cancel(id, options) {
        return this.sender.request('DELETE', `/debts/${id}`, undefined, options);
    }
    /** Reverse a paid debt. */
    async reverse(id, options) {
        return this.sender.request('POST', `/debts/${id}/reverse`, undefined, options);
    }
}
//# sourceMappingURL=debts.js.map