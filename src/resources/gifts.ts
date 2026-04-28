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
  ResolveGiftParams,
  ResolveGiftResponse,
  RevokeGiftResponse,
} from '../types/index.js';
import { generateIdempotencyKey } from '../idempotency.js';

/**
 * Gift PIX endpoints — issue a claimable PIX credit that a third party
 * redeems via a magic link.
 *
 * Six methods map 1:1 to the backend surface:
 *
 * | Method | Endpoint | Auth |
 * |--------|----------|------|
 * | `create` | `POST /payments/gift` | merchant session or access token w/ `gifts:write` |
 * | `preview` | `POST /gift/preview` | merchant session or access token w/ `gifts:write` |
 * | `get` | `GET /gift` | **gift bearer token only** — wallet is derived from the token |
 * | `regenerateLink` | `POST /payments/gift/:id/regenerate-link` | merchant session or access token w/ `gifts:write` |
 * | `revoke` | `POST /payments/gift/:id/revoke` | merchant session or access token w/ `gifts:write` |
 * | `resolve` | `POST /gift/resolve` | **public** — no auth; the endpoint MINTS the bearer JWT |
 *
 * ### BREAKING: Phase 106 magic-link shape change (SDK v2.0.0)
 *
 * The Gift PIX magic-link contract changed atomically — there is no
 * compat window. Pre-v2 the backend returned `access_token` (bearer JWT)
 * at create time and the frontend embedded it in a `#token=` fragment.
 * v2 returns `gift_path` (relative `/gift/<code>`) at create time and
 * the recipient exchanges the code for an ephemeral 30-minute bearer
 * JWT via `gifts.resolve()`. The frontend constructs the full URL as
 * `<own-origin> + gift_path`. This preserves GIFT-SEC-01 (backend
 * never knows the merchant's domain).
 *
 * ### Magic link construction (frontend responsibility)
 *
 * The SDK returns the raw `gift_path` + `expires_at`. The caller's
 * frontend constructs the link as `<own-origin> + gift_path` and
 * surfaces it to the creator (e.g. copy-to-clipboard, share sheet).
 * Recommended fragment format for the page that consumes the link:
 *
 * ```
 * https://<merchant>/gift#code=<code>
 * ```
 *
 * Use the URL fragment (`#code=`) so the code is not sent to merchant
 * analytics / Referer chains.
 *
 * ### Bearer vs creator flows
 *
 * The bearer (claimer) and the creator use DIFFERENT authenticated
 * clients. In practice you instantiate one `Pagci` with a merchant API
 * key for creator-side work (`create` / `preview` / `regenerateLink` /
 * `revoke`); a second `Pagci` with NO auth (or with the JWT freshly
 * minted by `resolve()`) for bearer-side work (`resolve`, then `get`
 * with the JWT, then the `POST /withdrawals` claim — handled by the
 * `withdrawals` resource, not by this one).
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
   * **BREAKING (Phase 106 — SDK v2.0.0)**: the response shape changed.
   * Pre-v2 returned `access_token` + `expires_at` (of the bearer JWT);
   * v2 returns `gift_path` (relative `/gift/<code>`) + `expires_at` (of
   * the link). The bearer JWT is now minted on demand by `resolve()`.
   * Frontend MUST migrate to the new shape — there is NO compat window.
   *
   * The frontend constructs the full URL as `<own-origin> + gift_path`
   * (see class docstring).
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
   * Generates a fresh public 16-char base62 code, hashes it, and
   * atomically overwrites `payment.GiftMetadata.Link`. The previous
   * code stops resolving on the next call to `resolve()`.
   *
   * **BREAKING (Phase 106 — SDK v2.0.0)**: same shape change as
   * `create()`. Pre-v2 minted a fresh bearer JWT inside a transaction
   * and returned `access_token`; v2 returns `gift_path` (relative
   * `/gift/<new-code>`) + `expires_at` (of the new link) +
   * `regenerated_at`. Bearers minted from past `resolve()` calls
   * continue to live up to 30 minutes via their natural JWT expiry
   * (CONTEXT.md "bearer policy" — accepted window).
   *
   * **Not auto-idempotent.** Each call produces a different code, so
   * retrying without an explicit `options.idempotencyKey` would invalidate
   * the link the first call surfaced. Supply your own idempotency key
   * when you need at-most-once semantics.
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
   * Revoke a gift's magic link — the public code stops resolving on the
   * next call to `resolve()`.
   *
   * **BREAKING (Phase 106 — SDK v2.0.0)**: semantics shifted. Pre-v2
   * the call revoked every active access_token for the synthetic owner
   * (invalidating in-flight bearer JWTs). v2 clears
   * `payment.GiftMetadata.Link` so new resolves fail with
   * `gift_code_not_found`. Bearers minted from past `resolve()` calls
   * continue to live up to 30 minutes via their natural JWT expiry.
   * Response shape unchanged ({revoked_at, revoked_count}); the
   * `revoked_count` field reports 1 when a non-nil Link existed and was
   * cleared, 0 when the Link was already nil (idempotent / pre-v2 doc).
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

  /**
   * Resolve a gift magic-link code to an ephemeral 30-minute bearer JWT.
   *
   * Phase 106 short-link resolver. Trades the public 16-char base62 code
   * (extracted from the magic link's URL fragment) for a 30-minute bearer
   * JWT scoped to the synthetic gift wallet. Use the JWT as
   * `Authorization: Bearer <access_token>` on subsequent `gifts.get()`
   * and `withdrawals.create()` calls.
   *
   * **No authentication required** — the SDK should be instantiated
   * without an API key for this call (the endpoint is the entry point
   * of the bearer flow; it produces the JWT, it does not consume one).
   *
   * **Anti-enumeration**: every failure (missing/expired/malformed
   * code, including malformed JSON / empty body / wrong-type fields)
   * surfaces as `404 gift_code_not_found`. Clients cannot distinguish
   * failure modes from the response. Treat any 404 as "code is not
   * usable; ask the user to re-paste or contact the sender".
   *
   * **Cache-Control**: server emits `Cache-Control: no-store, private`
   * (and `Pragma: no-cache` for HTTP/1.0 fallback) — do NOT layer a
   * custom cache on top of this method. Every resolve produces a fresh
   * JWT; treat the response as a single-use credential.
   *
   * **Rate limit**: enforced PRIMARILY at the Cloudflare edge (30
   * req/min/IP + threat-score block). Implement client-side debouncing
   * if your frontend issues multiple resolve attempts (e.g. retry-on-
   * blur). The SDK does not auto-retry.
   *
   * **Not auto-idempotent**: unlike `create()`, `resolve()` does NOT
   * inject an idempotency key — it is naturally idempotent within the
   * link's lifetime (each call yields a fresh JWT, the underlying state
   * is unchanged), but retries that conserve the SAME JWT are not a
   * supported semantic.
   *
   * @param params - `{ code: <16-char base62 string from magic link fragment> }`
   */
  async resolve(
    params: ResolveGiftParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<ResolveGiftResponse>> {
    return this.sender.request<ResolveGiftResponse>(
      'POST',
      '/gift/resolve',
      params,
      options,
    );
  }
}
