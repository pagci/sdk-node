"use strict";
// ── Debts resource ──────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebtsResource = void 0;
const pagination_js_1 = require("../pagination.js");
const querystring_js_1 = require("../querystring.js");
class DebtsResource {
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
        return new pagination_js_1.Page((cursor) => {
            const query = (0, querystring_js_1.buildQueryString)({ ...params, cursor });
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
exports.DebtsResource = DebtsResource;
//# sourceMappingURL=debts.js.map