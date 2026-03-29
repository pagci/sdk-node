import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type { CreateAccessTokenParams, CreateAccessTokenResponse, CreateAPIKeyParams, CreateAPIKeyResponse, UpdateTokenScopesParams } from '../types/index.js';
import type { StatusResponse } from '../types/common.js';
export declare class TokensResource {
    private readonly sender;
    constructor(sender: RequestSender);
    /** Create a wallet-scoped access token. */
    createAccessToken(params: CreateAccessTokenParams, options?: RequestOptions): Promise<ApiResponse<CreateAccessTokenResponse>>;
    /** Create an account-level API key. */
    createAPIKey(params: CreateAPIKeyParams, options?: RequestOptions): Promise<ApiResponse<CreateAPIKeyResponse>>;
    /** List all active tokens (login, API keys, access tokens). */
    list(options?: RequestOptions): Promise<ApiResponse<Record<string, unknown>[]>>;
    /** List access tokens only. */
    listAccessTokens(options?: RequestOptions): Promise<ApiResponse<Record<string, unknown>[]>>;
    /** Revoke (delete) a token by ID. */
    revoke(id: string, options?: RequestOptions): Promise<ApiResponse<StatusResponse>>;
    /** Update the scopes of a token. */
    updateScopes(id: string, params: UpdateTokenScopesParams, options?: RequestOptions): Promise<ApiResponse<StatusResponse>>;
    /** Copy (duplicate) a token with the same scopes. */
    copy(id: string, options?: RequestOptions): Promise<ApiResponse<Record<string, unknown>>>;
}
//# sourceMappingURL=tokens.d.ts.map