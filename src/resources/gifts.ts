// ── Gifts resource ──────────────────────────────────────────────────

import type {
  RequestSender,
  ApiResponse,
  RequestOptions,
} from '../requestSender.js';
import type {
  CreateGiftParams,
  CreateGiftResponse,
  GetGiftResponse,
  GiftPreviewRequest,
  GiftPreviewResponse,
  RegenerateGiftParams,
  RegenerateGiftResponse,
  RevokeGiftResponse,
} from '../types/index.js';
import { generateIdempotencyKey } from '../idempotency.js';

/**
 * Gift PIX endpoints — issue a claimable PIX credit that a third party
 * redeems via a magic link.
 *
 * Four methods map 1:1 to the backend surface:
 *
 * | Method | Endpoint | Auth |
 * |--------|----------|------|
 * | `create` | `POST /payments/gift` | merchant session or access token w/ `gifts:write` |
 * | `get` | `GET /gift` | **gift bearer token only** — wallet is derived from the token |
 * | `regenerateLink` | `POST /payments/gift/:id/regenerate-link` | merchant session or access token w/ `gifts:write` |
 * | `revoke` | `POST /payments/gift/:id/revoke` | merchant session or access token w/ `gifts:write` |
 *
 * ### Magic link construction (frontend responsibility)
 *
 * The SDK returns the raw `access_token` + `expires_at`. The caller's
 * frontend builds the magic link (recommended: `#token=` fragment, not
 * query string, so the token is not leaked via `Referer` — GIFT-SEC-01).
 *
 * ### Bearer vs creator flows
 *
 * The bearer (claimer) and the creator use DIFFERENT authenticated
 * clients. In practice you instantiate one `Pagci` with a merchant API
 * key for creator-side work (create / regenerate / revoke) and a second
 * `Pagci` with the short-lived gift `access_token` for bearer-side work
 * (`get`, and the eventual `POST /withdrawals` claim which is handled
 * by the `withdrawals` resource — not by this one).
 *
 * ### Feature flag
 *
 * Every endpoint returns `404 gift_pix_disabled` when `GIFT_PIX_ENABLED`
 * is off server-side. The route is structurally hidden (not 403) so the
 * feature's existence is not discoverable by status code.
 */
export class GiftsResource {
  constructor(private readonly sender: RequestSender) {}

  /**
   * Create a new Gift PIX.
   *
   * Auto-generates an idempotency key if none is supplied — duplicate
   * retries with the same key + body are replayed from cache server-side.
   *
   * The response carries `access_token` + `expires_at`; the frontend
   * constructs the magic link (see class docstring).
   */
  async create(
    params: CreateGiftParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<CreateGiftResponse>> {
    return this.sender.request<CreateGiftResponse>(
      'POST',
      '/payments/gift',
      params,
      {
        ...options,
        idempotencyKey: options?.idempotencyKey ?? generateIdempotencyKey(),
      },
    );
  }

  /**
   * Preview the fee breakdown that `POST /payments/gift` would produce
   * for a given (amount, method, pass_fees_to_payer) tuple.
   *
   * Read-only by design — no DB write, no PSP call, no bearer token
   * minted. Use it to populate UI fee disclaimers before committing the
   * creator to issuing the gift.
   *
   * Unlike `create()`, this method does NOT auto-inject an idempotency
   * key: preview is naturally idempotent (same inputs → same outputs
   * deterministically) and caching responses on an Idempotency-Key would
   * mask fee-plan mutations within the cache TTL window. Safe to retry
   * without a key.
   *
   * Server contract:
   *  - `pass_fees_to_payer` defaults `true` server-side when omitted; the
   *    resolved value is echoed back on `response.input.pass_fees_to_payer`.
   *  - `method=internal_charge` silently forces `pass_fees_to_payer=false`
   *    and emits both fee fields as `0` (internal charges + internal
   *    withdrawals are exempt from fees by design).
   *  - Response is structurally NO-LEAK (D-94-13): no `wallet_id`,
   *    `origin`, `recipients[]`, `whitelabel_*`, or `affiliate_*` keys.
   *
   * Returns `404 gift_pix_disabled` when `GIFT_PIX_ENABLED` is off
   * server-side (parity with the rest of the gift surface).
   */
  async preview(
    params: GiftPreviewRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<GiftPreviewResponse>> {
    // Read-only — no idempotency key auto-injection (unlike create).
    return this.sender.request<GiftPreviewResponse>(
      'POST',
      '/gift/preview',
      params,
      options,
    );
  }

  /**
   * Fetch the current state of the gift (bearer view).
   *
   * **Authentication**: this method requires the client to be
   * instantiated with a gift access token (the one returned by
   * `create()` or `regenerateLink()`), NOT a merchant API key. The
   * bearer's wallet is derived from the token server-side — no path
   * parameter is accepted (prevents gift enumeration).
   *
   * Returns the derived `GiftStatus` + amount + message + claimed_at +
   * expires_at.
   */
  async get(options?: RequestOptions): Promise<ApiResponse<GetGiftResponse>> {
    return this.sender.request<GetGiftResponse>(
      'GET',
      '/gift',
      undefined,
      options,
    );
  }

  /**
   * Regenerate the magic link for a gift the caller owns.
   *
   * Atomically revokes every currently active access token for the
   * gift's synthetic owner and mints a new one. Returns the new
   * `access_token` + `expires_at` + `regenerated_at`.
   *
   * **Not auto-idempotent.** Each call produces a different token, so
   * retrying without an explicit `options.idempotencyKey` would leave
   * dangling state (the first call's token revoked, a second token in
   * flight). Supply your own idempotency key when you need at-most-once
   * semantics.
   *
   * Blocked with `403 gift_already_claimed` when the gift has been
   * claimed, is claim-in-progress, or is under review.
   *
   * @param paymentId - ID of the gift payment (e.g. `pay_01jx...`).
   * @param params - Optional `{ link_expires_in_seconds }`; absent → server default of 604800.
   */
  async regenerateLink(
    paymentId: string,
    params?: RegenerateGiftParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<RegenerateGiftResponse>> {
    return this.sender.request<RegenerateGiftResponse>(
      'POST',
      `/payments/gift/${encodeURIComponent(paymentId)}/regenerate-link`,
      params ?? {},
      options,
    );
  }

  /**
   * Revoke all active access tokens for a gift the caller owns, without
   * minting a replacement.
   *
   * Idempotent: a second call returns `revoked_count = 0` with HTTP 200
   * (never 404).
   *
   * Blocked with `403 gift_already_claimed` when the gift has been
   * claimed, is claim-in-progress, or is under review.
   */
  async revoke(
    paymentId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<RevokeGiftResponse>> {
    return this.sender.request<RevokeGiftResponse>(
      'POST',
      `/payments/gift/${encodeURIComponent(paymentId)}/revoke`,
      undefined,
      options,
    );
  }
}
