// ── Withdrawals resource ────────────────────────────────────────────
import { Page } from '../pagination.js';
import { generateIdempotencyKey } from '../idempotency.js';
import { buildQueryString } from '../querystring.js';
export class WithdrawalsResource {
    sender;
    constructor(sender) {
        this.sender = sender;
    }
    /**
     * Create a new withdrawal (PIX payout).
     *
     * Returns 202 Accepted. The withdrawal is processed asynchronously.
     * Automatically generates an idempotency key if none is provided.
     */
    async create(params, options) {
        return this.sender.request('POST', '/withdrawals', params, {
            ...options,
            idempotencyKey: options?.idempotencyKey ?? generateIdempotencyKey(),
        });
    }
    /**
     * List withdrawals with cursor-based pagination.
     */
    list(params) {
        return new Page((cursor) => {
            const query = buildQueryString({ ...params, cursor });
            return this.sender
                .request('GET', `/withdrawals${query}`)
                .then((res) => res);
        });
    }
    /** Get a single withdrawal by ID. */
    async get(id, options) {
        return this.sender.request('GET', `/withdrawals/${id}`, undefined, options);
    }
    /** Get the receipt for a settled withdrawal. */
    async getReceipt(id, options) {
        return this.sender.request('GET', `/withdrawals/${id}/receipt`, undefined, options);
    }
}
//# sourceMappingURL=withdrawals.js.map