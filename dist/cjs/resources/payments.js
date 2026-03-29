"use strict";
// ── Payments resource ───────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsResource = void 0;
const pagination_js_1 = require("../pagination.js");
const idempotency_js_1 = require("../idempotency.js");
const querystring_js_1 = require("../querystring.js");
class PaymentsResource {
    sender;
    constructor(sender) {
        this.sender = sender;
    }
    /**
     * Create a new PIX payment.
     *
     * Automatically generates an idempotency key if none is provided.
     */
    async create(params, options) {
        return this.sender.request('POST', '/payments', params, {
            ...options,
            idempotencyKey: options?.idempotencyKey ?? (0, idempotency_js_1.generateIdempotencyKey)(),
        });
    }
    /**
     * List payments with cursor-based pagination.
     *
     * Returns a `Page` that supports async iteration, manual navigation,
     * and `autoPagingToArray()`.
     */
    list(params) {
        return new pagination_js_1.Page((cursor) => {
            const query = (0, querystring_js_1.buildQueryString)({ ...params, cursor });
            return this.sender
                .request('GET', `/payments${query}`)
                .then((res) => res);
        });
    }
    /** Get a single payment by ID. */
    async get(id, options) {
        return this.sender.request('GET', `/payments/${id}`, undefined, options);
    }
    /**
     * Refund a payment (fully or partially).
     *
     * Pass `{ amount }` for proportional refund or `{ recipients }` for
     * per-recipient distribution. These are mutually exclusive.
     */
    async refund(id, params, options) {
        return this.sender.request('POST', `/payments/${id}/refund`, params, options);
    }
    /** Release a held recipient on a payment. */
    async releaseRecipient(paymentId, walletId, options) {
        return this.sender.request('POST', `/payments/${paymentId}/recipients/${walletId}/release`, undefined, options);
    }
    /**
     * Get the receipt for a confirmed payment.
     *
     * Returns the raw response; the receipt format depends on the API
     * (typically PDF binary or a JSON with a URL).
     */
    async getReceipt(id, options) {
        return this.sender.request('GET', `/payments/${id}/receipt`, undefined, options);
    }
}
exports.PaymentsResource = PaymentsResource;
//# sourceMappingURL=payments.js.map