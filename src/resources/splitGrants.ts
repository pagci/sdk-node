// ── SplitGrants resource — Phase 105 ────────────────────────────────

import type {
  RequestSender,
  ApiResponse,
  RequestOptions,
} from '../requestSender.js';
import type {
  SplitGrant,
  CreateSplitGrantParams,
  SplitGrantListParams,
  SplitGrantListResponse,
} from '../types/index.js';
import type { ListResponse } from '../types/common.js';
import { Page } from '../pagination.js';
import { buildQueryString } from '../querystring.js';

/**
 * SplitGrants resource — cross-owner split authorisation (Phase 105).
 *
 * The issuer (**B**) emits a grant; the payer (**A**) uses the grant ID
 * inside `recipients[i].external_grant_id` of `POST /payments` to credit
 * one of B's wallets without B's involvement at use time.
 *
 * Four methods map 1:1 to the backend surface:
 *
 * | Method | Endpoint | Auth |
 * |--------|----------|------|
 * | `create` | `POST /split-grants` | merchant session or access token |
 * | `list` | `GET /split-grants` | merchant session or access token |
 * | `get` | `GET /split-grants/{id}` | merchant session or access token |
 * | `revoke` | `POST /split-grants/{id}/revoke` | merchant session or access token |
 *
 * ### Privacy posture (D-12)
 *
 * There is intentionally no endpoint for A to "discover" available
 * grants — A receives the `id` from B out-of-band (WhatsApp, email,
 * contract). Same posture as Stripe Connect's `account_id`.
 *
 * ### Tenant guard (opaque)
 *
 * `get` and `revoke` collapse three cases into a single 404:
 * - id missing
 * - wrong tenant (the grant belongs to another `api_owner`)
 * - genuinely non-existent
 *
 * → all return 404 `split_grant_not_found`. A token holder cannot probe
 * for grant IDs that don't belong to them.
 *
 * ### Idempotent revoke
 *
 * `revoke` is idempotent at the API surface (D-22). Re-revoking an
 * already-revoked grant returns 200 with the same `revoked_at`; no
 * service call, no audit emission. Once revoked, terminal — D-11
 * blocks reactivation; create a new grant to re-authorise.
 *
 * ### Failure modes (resolved at use time, not creation)
 *
 * The grant is just an authorisation token. The payment-level guards
 * apply during A's `POST /payments`:
 *
 * - 422 `split_grant_revoked` / `split_grant_expired` /
 *   `split_grant_cap_exceeded` / `split_grant_not_minority` — fix the
 *   inputs and retry.
 * - 403 `split_grant_payer_not_allowed` / `split_grant_self_referential` —
 *   the grant cannot authorise this caller.
 * - 400 `split_grant_wallet_required` / `split_grant_wallet_conflict` /
 *   `split_grant_origin_not_allowed` — payload misshape.
 * - 404 `split_grant_not_found` — grant doesn't exist or belongs to
 *   another tenant (opaque — see Tenant guard above).
 *
 * ### Rate limit (D-26)
 *
 * `POST /split-grants`: 5/min per `api_owner`. Grants are low-volume
 * manual partnership agreements, not transactional traffic. Other
 * endpoints follow the project's standard limits.
 */
export class SplitGrantsResource {
  constructor(private readonly sender: RequestSender) {}

  /**
   * Create a new split grant.
   *
   * The issuer is server-derived from the JWT — the request body MUST NOT
   * contain `issuer_owner_id`. Strict JSON decoding rejects unknown
   * fields with 400 `invalid_request_body`.
   *
   * Returns 201 Created with the populated grant. The minimal valid
   * request is `{}` (an open public grant authorising any payer to any
   * wallet, never expiring).
   */
  async create(
    params: CreateSplitGrantParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<SplitGrant>> {
    return this.sender.request<SplitGrant>(
      'POST',
      '/split-grants',
      params,
      options,
    );
  }

  /**
   * List your split grants, newest first (ULID desc on `_id`).
   *
   * Cursor pagination — pass the previous response's
   * `meta.next_cursor` as `?cursor=`. Empty `next_cursor` means no more
   * pages. There is intentionally no cross-issuer view (D-12 privacy).
   *
   * Returns a `Page<SplitGrant>` that supports async iteration, manual
   * navigation, and `autoPagingToArray()`.
   */
  list(params?: SplitGrantListParams): Page<SplitGrant> {
    return new Page((cursor) => {
      const query = buildQueryString({ ...params, cursor });
      return this.sender
        .request<SplitGrantListResponse>('GET', `/split-grants${query}`)
        .then((res) => res as ListResponse<SplitGrant>);
    });
  }

  /**
   * Get a single grant by ID.
   *
   * Returns the full grant document if you own it. Tenant guard is
   * opaque: a wrong-tenant `id` returns 404 (not 403) — same shape as a
   * genuine not-found.
   */
  async get(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<SplitGrant>> {
    return this.sender.request<SplitGrant>(
      'GET',
      `/split-grants/${encodeURIComponent(id)}`,
      undefined,
      options,
    );
  }

  /**
   * Revoke a grant. Sets `revoked_at = now`.
   *
   * **Idempotent**: re-revoking an already-revoked grant returns 200
   * with the same `revoked_at` (no service call, no audit emission).
   *
   * **Cache invalidated synchronously** — subsequent payment creation
   * attempts using this grant return 422 `split_grant_revoked`
   * immediately.
   *
   * **Terminal** (D-11): revoked grants cannot be reactivated. To
   * re-authorise, create a new grant.
   *
   * Wrong tenant → 404 (opaque — same as not-found).
   */
  async revoke(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<SplitGrant>> {
    return this.sender.request<SplitGrant>(
      'POST',
      `/split-grants/${encodeURIComponent(id)}/revoke`,
      undefined,
      options,
    );
  }
}
