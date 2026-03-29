"use strict";
// ── Withdrawals resource ────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalsResource = void 0;
const pagination_js_1 = require("../pagination.js");
const idempotency_js_1 = require("../idempotency.js");
const querystring_js_1 = require("../querystring.js");
class WithdrawalsResource {
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
            idempotencyKey: options?.idempotencyKey ?? (0, idempotency_js_1.generateIdempotencyKey)(),
        });
    }
    /**
     * List withdrawals with cursor-based pagination.
     */
    list(params) {
        return new pagination_js_1.Page((cursor) => {
            const query = (0, querystring_js_1.buildQueryString)({ ...params, cursor });
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
exports.WithdrawalsResource = WithdrawalsResource;
//# sourceMappingURL=withdrawals.js.map