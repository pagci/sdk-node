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
}

/**
 * Response from `POST /payments/gift`.
 *
 * The SDK returns the raw `access_token` + `expires_at`; the caller's
 * frontend constructs the magic link. Recommended format (D-90-13):
 *
 * ```
 * https://<app>/gift#token=<access_token>
 * ```
 *
 * Use the URL fragment (`#token=`) rather than a query string so the
 * token is not forwarded via the `Referer` header to third-party scripts
 * on the claim page (GIFT-SEC-01).
 */
export interface CreateGiftResponse {
  payment_id: string;
  /** Underlying payment status (e.g. `"pending"`); NOT the derived `GiftStatus`. */
  status: string;
  amount_cents: number;
  /** `"gift_pix"` for PSP-backed gifts; `"gift_internal_charge"` for two-step internal-charge gifts. */
  origin: GiftOrigin;
  /** JWT bearer token with scopes `[withdrawals:write, gifts:read]`. */
  access_token: string;
  /** RFC3339 UTC timestamp when the access token expires. */
  expires_at: string;
  /** PIX identifier (copy-paste string). Present only when `origin === "gift_pix"`. */
  qr_code?: string;
  /** PSP-returned QR image URL (or base64 depending on PSP). Present only when `origin === "gift_pix"`. */
  qr_code_image_url?: string;
}

// ── Get ─────────────────────────────────────────────────────────────

/**
 * Response from `GET /gift` (bearer view).
 *
 * No path parameter — the gift is derived from the bearer's access token
 * on the server side (GIFT-MGMT-01 / D-92-06 — prevents gift enumeration).
 *
 * `claimed_at` is `null` until a settled withdrawal exists; the setter
 * of a claimed state is the settled withdrawal's updated timestamp.
 */
export interface GetGiftResponse {
  id: string;
  amount_cents: number;
  status: GiftStatus;
  /** Creator-supplied greeting; empty string when omitted at create time. */
  message: string;
  /** RFC3339.ms UTC; null until the gift is claimed. */
  claimed_at: string | null;
  /** RFC3339.ms UTC. */
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
 * The previous active tokens for the synthetic owner are revoked in the
 * same transaction that mints the new one. The frontend builds the magic
 * link from `access_token` (see `CreateGiftResponse` docstring).
 */
export interface RegenerateGiftResponse {
  /** New JWT bearer token; scopes `[withdrawals:write, gifts:read]`. */
  access_token: string;
  /** RFC3339.ms UTC timestamp when the new token expires. */
  expires_at: string;
  /** RFC3339.ms UTC timestamp when the regenerate operation committed. */
  regenerated_at: string;
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
