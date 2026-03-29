// ── Tokens resource ─────────────────────────────────────────────────

import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type {
  CreateAccessTokenParams,
  CreateAccessTokenResponse,
  CreateAPIKeyParams,
  CreateAPIKeyResponse,
  UpdateTokenScopesParams,
} from '../types/index.js';
import type { StatusResponse } from '../types/common.js';

export class TokensResource {
  constructor(private readonly sender: RequestSender) {}

  /** Create a wallet-scoped access token. */
  async createAccessToken(
    params: CreateAccessTokenParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<CreateAccessTokenResponse>> {
    return this.sender.request<CreateAccessTokenResponse>(
      'POST',
      '/tokens/access',
      params,
      options,
    );
  }

  /** Create an account-level API key. */
  async createAPIKey(
    params: CreateAPIKeyParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<CreateAPIKeyResponse>> {
    return this.sender.request<CreateAPIKeyResponse>(
      'POST',
      '/tokens/api-key',
      params,
      options,
    );
  }

  /** List all active tokens (login, API keys, access tokens). */
  async list(
    options?: RequestOptions,
  ): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.sender.request<Record<string, unknown>[]>(
      'GET',
      '/tokens',
      undefined,
      options,
    );
  }

  /** List access tokens only. */
  async listAccessTokens(
    options?: RequestOptions,
  ): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.sender.request<Record<string, unknown>[]>(
      'GET',
      '/tokens/access',
      undefined,
      options,
    );
  }

  /** Revoke (delete) a token by ID. */
  async revoke(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<StatusResponse>> {
    return this.sender.request<StatusResponse>(
      'DELETE',
      `/tokens/${id}`,
      undefined,
      options,
    );
  }

  /** Update the scopes of a token. */
  async updateScopes(
    id: string,
    params: UpdateTokenScopesParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<StatusResponse>> {
    return this.sender.request<StatusResponse>(
      'PUT',
      `/tokens/${id}/scopes`,
      params,
      options,
    );
  }

  /** Copy (duplicate) a token with the same scopes. */
  async copy(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.sender.request<Record<string, unknown>>(
      'POST',
      `/tokens/${id}/copy`,
      undefined,
      options,
    );
  }
}
