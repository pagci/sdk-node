// ── Payments resource ───────────────────────────────────────────────
import { Page } from '../pagination.js';
import { generateIdempotencyKey } from '../idempotency.js';
import { buildQueryString } from '../querystring.js';
export class PaymentsResource {
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
            idempotencyKey: options?.idempotencyKey ?? generateIdempotencyKey(),
        });
    }
    /**
     * List payments with cursor-based pagination.
     *
     * Returns a `Page` that supports async iteration, manual navigation,
     * and `autoPagingToArray()`.
     */
    list(params) {
        return new Page((cursor) => {
            const query = buildQueryString({ ...params, cursor });
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
//# sourceMappingURL=payments.js.map