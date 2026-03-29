/** Parameters for creating an access token (wallet-scoped). */
export interface CreateAccessTokenParams {
    wallet_id: string;
    scopes: string[];
    /** Duration string (e.g. "30d"). */
    expires_in?: string;
    label?: string;
    magic?: boolean;
}
/** Response from creating an access token. */
export interface CreateAccessTokenResponse {
    token: string;
    token_id: string;
    wallet_id: string;
    scopes: string[];
    /** ISO 8601 timestamp. */
    expires_at: string;
    magic_token?: string;
}
/** Parameters for creating an API key (account-level). */
export interface CreateAPIKeyParams {
    scopes: string[];
    /** Duration string (e.g. "30d"). */
    expires_in?: string;
    label?: string;
}
/** Response from creating an API key. */
export interface CreateAPIKeyResponse {
    token: string;
    token_id: string;
    scopes: string[];
    /** ISO 8601 timestamp. */
    expires_at: string;
}
/** Parameters for updating token scopes. */
export interface UpdateTokenScopesParams {
    scopes: string[];
}
//# sourceMappingURL=token.d.ts.map