// ── Gift PIX types ───────────────────────────────────────────────────
// Source of truth:
//  - cmd/specgen/types.go (CreateGiftRequest/Response, GetGiftResponse,
//    RegenerateGiftRequest/Response, RevokeGiftResponse)
//  - internal/handler/gift_handler.go (response structs + field semantics)
//  - internal/giftops/status.go (GiftStatus derivation)
//
// See @pagci/node CLAUDE.md § Source of Truth for the backend-mapping
// convention. These types are a byte-for-byte TypeScript mirror of the
// OpenAPI schema the backend emits; do NOT add fields that the backend
// does not emit (magic_link is intentionally absent — the frontend builds
// the URL from access_token + a base URL, see GIFT-SEC-01).

import type { QRConfig, QRResult } from './payment.js';

/**
 * Derived status of a Gift PIX, returned by `GET /gift`.
 *
 * The value is derived from (payment.status, gift wallet balance, active
 * withdrawal, latest withdrawal state) on every read — never stored. See
 * REQUIREMENTS.md GIFT-MGMT-02 for the full derivation table.
 *
 * - `awaiting_payment` — gift pending: PSP has not confirmed the PIX yet,
 *   or the internal_charge has not been settled.
 * - `claimable`        — gift paid, balance on the synthetic wallet > 0,
 *   no active withdrawal; the bearer can redeem via `POST /withdrawals`.
 * - `claim_in_progress`— an active withdrawal is in flight on the gift
 *   wallet (claim started, not settled).
 * - `claimed`          — the withdrawal has settled; balance is 0.
 * - `under_review`     — withdrawal frozen post-PSP call (PSP timeout or
 *   ambiguous error; funds held for manual review).
 * - `payment_failed`   — the underlying payment failed, expired, or was
 *   cancelled before ever being paid.
 * - `payment_refunded` — the creator refunded the underlying payment.
 */
export type GiftStatus =
  | 'awaiting_payment'
  | 'claimable'
  | 'claim_in_progress'
  | 'claimed'
  | 'under_review'
  | 'payment_failed'
  | 'payment_refunded';

/** Funding method for a gift. */
export type GiftMethod = 'pix' | 'internal_charge';

/** Origin discriminator on the gift payment record. */
export type GiftOrigin = 'gift_pix' | 'gift_internal_charge';

// ── Create ──────────────────────────────────────────────────────────

/**
 * Parameters for `POST /payments/gift`.
 *
 * Validation (server-side, surfaces as 400):
 *  - `amount_cents` > 0 and within the standard `POST /payments` PIX limits.
 *  - `method` ∈ {"pix", "internal_charge"}.
 *  - `funding_wallet_id` REQUIRED iff `method === "internal_charge"`.
 *  - `message` ≤ 140 characters when present.
 *  - `link_expires_in_seconds` ∈ [60, 2592000] when present; default 604800 (7 days).
 */
export interface CreateGiftParams {
  /** Gift amount in centavos (integer). */
  amount_cents: number;
  /** Funding method. `"pix"` = external PSP QR; `"internal_charge"` = creator pays via `POST /withdrawals` with `pix_key="charge:<id>"`. */
  method: GiftMethod;
  /** Wallet that funds the gift. Required when `method === "internal_charge"`. */
  funding_wallet_id?: string;
  /** Creator-supplied greeting, max 140 characters. */
  message?: string;
  /** Validity window of the bearer access token, in seconds. Range [60, 2592000]. Defaults to 604800 (7 days). */
  link_expires_in_seconds?: number;
  /**
   * When true (default), the QR payer covers payment + withdrawal fees and
   * the bearer receives `amount_cents` net at claim time. When false, the
   * recipient absorbs the payment fee (legacy pre-Phase-98 behavior).
   *
   * Server forces `false` for `method: 'internal_charge'` (silent
   * normalisation — internal charges and internal withdrawals are exempt
   * from fees by design).
   *
   * Omit the field to inherit the server default (`true`). Send explicit
   * `false` to opt out of fee pass-through. The server-side `*bool`
   * pointer distinguishes "omitted" from "explicit false" — sending
   * `false` is NOT the same as omitting.
   */
  pass_fees_to_payer?: boolean;
  /**
   * Opt-in server-side QR rendering (parity with `POST /payments` —
   * quick-260428-1pv). Two valid shapes:
   *
   *  - `true`            — render with branded defaults (256px SVG, badge,
   *                        whitelabel logo if configured).
   *  - {@link QRConfig}  — full custom config (size, format, logo,
   *                        foreground, module, background, badge).
   *
   * Anything else (`false`, `null`, number, string, array) is rejected by
   * the backend with `400 invalid_request_body`. Omit the field to keep
   * the legacy response shape (`qr_code` as a copy-paste BR Code string).
   *
   * Effective only when `method === "pix"` AND the PSP returned a
   * non-empty BR Code; for `internal_charge` gifts the field is parsed
   * and ignored (no PSP-issued QR exists), and the response falls back
   * to the string-shape `qr_code`.
   */
  qr?: true | QRConfig;
}

/**
 * Response from `POST /payments/gift`.
 *
 * **BREAKING (Phase 106 — SDK v2.0.0)**: the response shape changed.
 * Pre-v2 returned `access_token` (bearer JWT) + `expires_at` (of bearer);
 * v2 returns `gift_path` (relative `/gift/<code>`) + `expires_at` (of
 * link). The bearer JWT is now minted on demand by `gifts.resolve()`.
 *
 * The merchant's frontend constructs the full URL as `<own-origin> +
 * gift_path` — for example `"https://app.example.com" +
 * "/gift/aB3cD9eF2gH4iJ7k"`. The backend never knows the merchant's
 * domain (preserves GIFT-SEC-01).
 *
 * Recipients open the link, the page extracts the trailing 16-char code,
 * and POSTs it to `/gift/resolve` (via `gifts.resolve()`) to mint the
 * 30-minute bearer JWT. Recommended fragment format for the magic link
 * (so the code is never sent to merchant analytics):
 *
 * ```
 * https://<app>/gift#code=<code>
 * ```
 *
 * `expires_at` semantics changed: now exposes the LINK lifetime
 * (potentially days/weeks via `link_expires_in_seconds`) rather than the
 * pre-v2 bearer JWT's 30-minute window.
 */
export interface CreateGiftResponse {
  payment_id: string;
  /** Underlying payment status (e.g. `"pending"`); NOT the derived `GiftStatus`. */
  status: string;
  amount_cents: number;
  /** `"gift_pix"` for PSP-backed gifts; `"gift_internal_charge"` for two-step internal-charge gifts. */
  origin: GiftOrigin;
  /**
   * Phase 106 — relative path component of the gift magic link
   * (e.g. `/gift/aB3cD9eF2gH4iJ7k`). Frontend prefixes its own origin
   * to construct the full URL. Backend never knows the merchant's
   * domain (preserves GIFT-SEC-01).
   */
  gift_path: string;
  /**
   * RFC3339.ms UTC. LINK expiration timestamp (Phase 106) — when the code
   * stops resolving via `gifts.resolve()`. NOT the bearer JWT expiry
   * (which is 30 minutes after each resolve call).
   */
  expires_at: string;
  /**
   * QR code returned by the backend.
   *
   * - **Default** (request omitted `qr`): copy-paste PIX BR Code string
   *   — `Liquidator.PixQR`. Present only when `origin === "gift_pix"`.
   * - **When `qr: true` or `qr: { ... }` was sent in the request AND
   *   `origin === "gift_pix"`**: a {@link QRResult} object with a
   *   `data_uri` (SVG by default; PNG when `qr.format === "png"`).
   *   The data URI can be set directly on `<img src>` or used as a CSS
   *   `background-image: url(...)`.
   * - **When `origin === "gift_internal_charge"`**: the field stays a
   *   string (likely empty) regardless of the request — there is no
   *   PSP-issued QR to render for internal charges.
   *
   * The union narrows at runtime by `typeof`:
   *
   * ```ts
   * if (typeof res.qr_code === 'string') {
   *   // BR Code copy-paste — render manually or display as text.
   * } else if (res.qr_code) {
   *   // Rendered QR object.
   *   img.src = res.qr_code.data_uri;
   * }
   * ```
   */
  qr_code?: string | QRResult;
}

// ── Get ─────────────────────────────────────────────────────────────

/**
 * Response from `GET /gift` (bearer view).
 *
 * No path parameter — the gift is derived from the bearer's access token
 * on the server side (GIFT-MGMT-01 / D-92-06 — prevents gift enumeration).
 *
 * **BREAKING (Phase 106 — SDK v2.0.0)**: the `expires_at` semantics
 * changed. Pre-v2 it was the bearer JWT's 30-minute expiration; v2
 * exposes the LINK's expiration (days/weeks). Without this fix the UI
 * would falsely render every gift as expiring in 30 minutes regardless
 * of the actual gift lifetime. Backend also now emits a typed pointer
 * field `scheduled_at` (null when status !== `'scheduled'`) and
 * `withdrawable_amount_cents` — the post-fee net the bearer can claim.
 *
 * `claimed_at` is `null` until a settled withdrawal exists; the setter
 * of a claimed state is the settled withdrawal's updated timestamp.
 */
export interface GetGiftResponse {
  id: string;
  /** Gross gift amount in centavos — what the creator funded. */
  amount_cents: number;
  /**
   * Net amount in centavos the bearer can actually claim — gross minus
   * the platform fee deducted at creation. The claim UI MUST render this
   * value (the gross would mislead about what hits the bearer's PIX key).
   */
  withdrawable_amount_cents: number;
  status: GiftStatus;
  /** Creator-supplied greeting; empty string when omitted at create time. */
  message: string;
  /** RFC3339.ms UTC; null until the gift is claimed. */
  claimed_at: string | null;
  /**
   * RFC3339.ms UTC; emitted only when `status === 'scheduled'` (money
   * credited but still parked in a release-day bucket); null otherwise.
   */
  scheduled_at: string | null;
  /**
   * RFC3339.ms UTC. Phase 106 — LINK expiration (source:
   * `payment.GiftMetadata.Link.ExpiresAt`), NOT the bearer JWT's
   * 30-minute expiry.
   */
  expires_at: string;
}

// ── Regenerate ──────────────────────────────────────────────────────

/**
 * Parameters for `POST /payments/gift/:id/regenerate-link`.
 *
 * Absent body or absent `link_expires_in_seconds` → default 7 days
 * (server-side). Range [60, 2592000]; out of range → 400 `gift_invalid_expiry`.
 */
export interface RegenerateGiftParams {
  link_expires_in_seconds?: number;
}

/**
 * Response from `POST /payments/gift/:id/regenerate-link`.
 *
 * **BREAKING (Phase 106 — SDK v2.0.0)**: same shape change as
 * `CreateGiftResponse`. The regenerate flow no longer mints a bearer
 * JWT; it generates a new public 16-char base62 code, hashes it, and
 * atomically overwrites `payment.GiftMetadata.Link`. The previous code
 * stops resolving on the next call to `gifts.resolve()`. Bearers minted
 * from past resolves continue to live up to 30 minutes via their natural
 * JWT expiry (CONTEXT.md "bearer policy" decision lock — accepted
 * window).
 *
 * `gift_path` is RELATIVE (e.g. `/gift/xY9wV2qZ8mN3oP1l`); frontend
 * prefixes its own origin (preserves GIFT-SEC-01).
 */
export interface RegenerateGiftResponse {
  /**
   * Phase 106 — relative path component of the new magic link
   * (e.g. `/gift/xY9wV2qZ8mN3oP1l`). Frontend constructs the full URL
   * as `<own-origin> + gift_path`.
   */
  gift_path: string;
  /**
   * RFC3339.ms UTC. New LINK expiration timestamp (Phase 106) — NOT a
   * bearer JWT expiry.
   */
  expires_at: string;
  /** RFC3339.ms UTC timestamp when the regenerate operation committed. */
  regenerated_at: string;
}

// ── Resolve (Phase 106) ─────────────────────────────────────────────

/**
 * Parameters for `POST /gift/resolve` — Phase 106 short-link resolver.
 *
 * The 16-char base62 code (charset `[0-9A-Za-z]`) extracted from the
 * magic link's URL fragment. POST + body (NOT GET + path) so the code
 * is never leaked via browser history, Referer header, access logs, or
 * link unfurl previewers (WhatsApp / iMessage / Slack / Telegram all
 * GET shared URLs to render previews — a GET-with-code endpoint would
 * be auto-resolved by those, burning the gift before the recipient
 * clicks).
 */
export interface ResolveGiftParams {
  /** 16-char base62 gift code extracted from the magic link fragment. */
  code: string;
}

/**
 * Response from `POST /gift/resolve`.
 *
 * - `access_token`: ephemeral 30-minute bearer JWT scoped to the
 *   synthetic gift wallet (scopes `[withdrawals:write, gifts:read]`).
 *   Use as `Authorization: Bearer <access_token>` on subsequent
 *   `gifts.get()` and `withdrawals.create()` calls.
 * - `expires_at`: the JWT's expiration (NOT the link's). Re-call
 *   `gifts.resolve()` with the same code to mint a fresh JWT (within
 *   the link's longer-term `expires_at`).
 *
 * The server emits `Cache-Control: no-store, private` — do NOT layer a
 * custom cache on top of this method. Every resolve produces a fresh
 * JWT; treat the response as a single-use credential.
 */
export interface ResolveGiftResponse {
  /** Signed bearer JWT with scopes `[withdrawals:write, gifts:read]`. 30-minute TTL by default. */
  access_token: string;
  /**
   * RFC3339.ms UTC. JWT expiration timestamp — NOT the link's
   * expiration. The link can outlive multiple resolves.
   */
  expires_at: string;
}

// ── Revoke ──────────────────────────────────────────────────────────

/**
 * Response from `POST /payments/gift/:id/revoke`.
 *
 * Idempotent: calling twice returns 200 with `revoked_count = 0` on the
 * second call; the endpoint never returns 404 for an already-revoked gift.
 */
export interface RevokeGiftResponse {
  /** RFC3339.ms UTC timestamp when the revoke operation committed. */
  revoked_at: string;
  /** Number of active tokens revoked in this call. 0 means no active tokens existed (idempotent replay). */
  revoked_count: number;
}

// ── Preview ─────────────────────────────────────────────────────────

/**
 * Parameters for `POST /gift/preview`.
 *
 * Read-only fee-breakdown calculator that mirrors what `POST /payments/gift`
 * would compute, WITHOUT persisting state, calling the PSP, or minting a
 * bearer access token. Use it to populate UI fee disclaimers before the
 * creator commits to issuing the gift.
 *
 * Response shape is structurally NO-LEAK by design (D-94-13): the response
 * type carries no `wallet_id`, `origin`, `recipients[]`, `whitelabel_*`, or
 * `affiliate_*` field — only the aggregated fee + total breakdown.
 *
 * Validation (server-side, surfaces as 400):
 *  - `amount_cents` > 0 and within the standard PIX limits.
 *  - `method` ∈ {"pix", "internal_charge"}.
 */
export interface GiftPreviewRequest {
  /** Gift amount in centavos (int64 > 0). Same range as POST /payments/gift. */
  amount_cents: number;
  /** Funding method. `'pix'` applies fees; `'internal_charge'` silently forces `pass_fees_to_payer=false` (both fees zero by design). */
  method: GiftMethod;
  /**
   * Optional wallet that scopes the fee resolution. Overridden by the
   * access-token-bound wallet when present (same forcing pattern as
   * elsewhere in the API).
   */
  wallet_id?: string;
  /**
   * Whether the QR payer (not the creator) bears the payment + withdrawal
   * fees.
   *
   * Omitted → server default `true`. Explicit `false` → legacy opt-out.
   * Forced to `false` when `method: 'internal_charge'` — the resolved
   * value is echoed back on `response.input.pass_fees_to_payer`.
   */
  pass_fees_to_payer?: boolean;
}

/**
 * Echo of the resolved caller intent inside `GiftPreviewResponse.input`.
 *
 * The server resolves the effective `pass_fees_to_payer` (default-true on
 * omit; force-false on `internal_charge`) and echoes the EXACT bool the
 * fee math was computed against. Surfacing the resolved value lets
 * integrators detect the silent force-false on internal charges without
 * having to replicate the resolution logic client-side.
 */
export interface GiftPreviewInput {
  /** Echo of the requested amount in centavos. */
  amount_cents: number;
  /** Echo of the requested funding method. */
  method: GiftMethod;
  /**
   * Resolved value of `pass_fees_to_payer` used in the math (NOT the bool
   * the client sent). May differ from the request: omitted → `true`;
   * `method=internal_charge` → `false`.
   */
  pass_fees_to_payer: boolean;
}

/**
 * Aggregated fee breakdown.
 *
 * Both fields are ALWAYS emitted — even as `0`/`0` for `internal_charge`
 * gifts — so an explicit zero communicates "exempt by design" rather than
 * "missing because the field was elided".
 */
export interface GiftPreviewFees {
  /**
   * Aggregated payment-side fee in centavos (sum of system + whitelabel +
   * affiliate fee recipients on the gift payment). Zero for
   * `method=internal_charge` by design.
   */
  payment_cents: number;
  /**
   * Frozen withdrawal-side fee in centavos that the bearer will pay at
   * claim time. Zero when `pass_fees_to_payer=false` (legacy gift carve-out
   * preserved) or `method=internal_charge`.
   */
  withdrawal_cents: number;
}

/**
 * QR-payer total + bearer-net pair the integrator surfaces in the gift
 * creation UI.
 *
 * Conservation invariant: `bearer_receives_cents + fees.payment_cents +
 * fees.withdrawal_cents === pix_total_cents` for `method=pix +
 * pass_fees_to_payer=true`.
 */
export interface GiftPreviewTotals {
  /**
   * Total PIX amount the QR payer scans and transfers, in centavos.
   * Equals `amount + payment_fee + withdrawal_fee` when
   * `pass_fees_to_payer=true`; equals `amount` when `method=internal_charge`.
   */
  pix_total_cents: number;
  /**
   * Net amount the gift bearer ends up with after claim, in centavos.
   * Bearer-net is fixed by construction when `pass_fees_to_payer=true`
   * (the whole point of fee pass-through).
   */
  bearer_receives_cents: number;
}

/**
 * Response from `POST /gift/preview`.
 *
 * The response type structurally cannot leak granular fee allocations,
 * recipient breakdowns, wallet identifiers, or origin discriminators —
 * only the aggregated breakdown intended for end-user UI surfaces (D-94-13).
 *
 * `input` echoes the resolved caller intent (post default + force-false)
 * so integrators can detect the silent normalisation on internal charges.
 */
export interface GiftPreviewResponse {
  /** Echo of the resolved caller intent. */
  input: GiftPreviewInput;
  /** Aggregated payment-side + withdrawal-side fee breakdown. */
  fees: GiftPreviewFees;
  /** QR payer total + bearer-net pair. */
  totals: GiftPreviewTotals;
}
