// ── Tokens resource ─────────────────────────────────────────────────
export class TokensResource {
    sender;
    constructor(sender) {
        this.sender = sender;
    }
    /** Create a wallet-scoped access token. */
    async createAccessToken(params, options) {
        return this.sender.request('POST', '/tokens/access', params, options);
    }
    /** Create an account-level API key. */
    async createAPIKey(params, options) {
        return this.sender.request('POST', '/tokens/api-key', params, options);
    }
    /** List all active tokens (login, API keys, access tokens). */
    async list(options) {
        return this.sender.request('GET', '/tokens', undefined, options);
    }
    /** List access tokens only. */
    async listAccessTokens(options) {
        return this.sender.request('GET', '/tokens/access', undefined, options);
    }
    /** Revoke (delete) a token by ID. */
    async revoke(id, options) {
        return this.sender.request('DELETE', `/tokens/${id}`, undefined, options);
    }
    /** Update the scopes of a token. */
    async updateScopes(id, params, options) {
        return this.sender.request('PUT', `/tokens/${id}/scopes`, params, options);
    }
    /** Copy (duplicate) a token with the same scopes. */
    async copy(id, options) {
        return this.sender.request('POST', `/tokens/${id}/copy`, undefined, options);
    }
}
//# sourceMappingURL=tokens.js.map