"use strict";
// ── Webhook Endpoints resource ──────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookEndpointsResource = void 0;
const pagination_js_1 = require("../pagination.js");
const querystring_js_1 = require("../querystring.js");
class WebhookEndpointsResource {
    sender;
    constructor(sender) {
        this.sender = sender;
    }
    /** Register one or more webhook endpoints. */
    async register(params, options) {
        return this.sender.request('POST', '/hooks', params, options);
    }
    /** List all webhook endpoints. */
    async list(options) {
        return this.sender.request('GET', '/hooks', undefined, options);
    }
    /** Update a webhook endpoint. */
    async update(id, params, options) {
        return this.sender.request('PUT', `/hooks/${id}`, params, options);
    }
    /** Delete a webhook endpoint. */
    async delete(id, options) {
        return this.sender.request('DELETE', `/hooks/${id}`, undefined, options);
    }
    /** List webhook deliveries with cursor-based pagination. */
    listDeliveries(params) {
        return new pagination_js_1.Page((cursor) => {
            const query = (0, querystring_js_1.buildQueryString)({ ...params, cursor });
            return this.sender
                .request('GET', `/hooks/deliveries${query}`)
                .then((res) => res);
        });
    }
    /** Get a single webhook delivery by ID. */
    async getDelivery(id, options) {
        return this.sender.request('GET', `/hooks/deliveries/${id}`, undefined, options);
    }
    /** Resend a single webhook delivery. */
    async resend(id, options) {
        return this.sender.request('POST', `/hooks/deliveries/${id}/resend`, undefined, options);
    }
    /** Bulk resend webhook deliveries matching a filter. */
    async bulkResend(params, options) {
        return this.sender.request('POST', '/hooks/deliveries/bulk-resend', params, options);
    }
    /** Send a test webhook to a specific endpoint. */
    async test(params, options) {
        return this.sender.request('POST', '/hooks/test', params, options);
    }
}
exports.WebhookEndpointsResource = WebhookEndpointsResource;
//# sourceMappingURL=webhookEndpoints.js.map