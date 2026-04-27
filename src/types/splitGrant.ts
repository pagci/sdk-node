// ── SplitGrant types ─────────────────────────────────────────────────
// Source of truth:
//  - cmd/specgen/types.go (CreateSplitGrantRequest, SplitGrantResponse,
//    SplitGrantListResponse — Phase 105)
//  - internal/handler/split_grant_handler.go (response structs + tenant guard)
//  - internal/domain/split_grant.go (Grant struct + IsActive() derivation)
//
// See @pagci/node CLAUDE.md § Source of Truth. The TypeScript shapes here
// mirror the OpenAPI schema the backend emits byte-for-byte. The list
// response uses the project-wide `{data, meta}` envelope (matches
// PaymentListResponse / WithdrawalListResponse), not a flat `{data, next_cursor}`.
//
// Phase 105 — Cross-owner split authorization
// ----------------------------------------------------------------------
// A SplitGrant authorises one platform (the allowed payer, A) to credit
// a wallet of another platform (the issuer, B) during payment creation.
//
// State is derived purely from timestamps (Stripe-like): a grant is
// active when it has NOT been revoked AND has NOT expired. There is no
// `Status` enum on this type — D-01: states emerge from `revoked_at`
// and `expires_at`, eliminating the "status diverged from timestamps"
// drift category.

/**
 * A cross-owner split authorization issued by platform B.
 *
 * Activeness is a pure function of timestamps:
 *
 * ```ts
 * const active =
 *   grant.revoked_at === undefined &&
 *   (grant.expires_at === undefined ||
 *    new Date(grant.expires_at) > new Date());
 * ```
 *
 * Use the SDK helpers (or your own derivation) — the API does not return
 * a pre-computed `status` field on this resource (D-01).
 */
export interface SplitGrant {
  /** SplitGrant ID. Prefix `sg_` + ULID (D-06). Share this out-of-band
   *  with the payer (A) — they pass it as `recipients[i].external_grant_id`
   *  in `POST /payments`. */
  id: string;

  /** `api_owner` of the platform that authored this grant. Server-derived
   *  from the JWT at creation; never trusted from the request body. */
  issuer_owner_id: string;

  /** Optional. Single permitted payer `api_owner`. If set, only this owner
   *  can use the grant. Empty = grant is public (any payer). Issue multiple
   *  grants to authorise multiple partners (D-04 — single + opcional). */
  allowed_payer_owner_id?: string;

  /** Optional. If set, the grant is closed to this wallet (D-07): the payer
   *  must NOT pass `wallet_id` at use time, or it must match exactly
   *  (conflict → 400 `split_grant_wallet_conflict`). Empty makes the grant
   *  open — A passes `wallet_id` at use. */
  wallet_id?: string;

  /** Optional. RFC3339 UTC timestamp. Null/missing means never expires —
   *  only manual revoke ends the grant (D-05). No hard cap. */
  expires_at?: string;

  /** Set by `POST /split-grants/{id}/revoke`. Once set, terminal (D-11) —
   *  re-authorise by creating a new grant. Idempotent: re-revoke returns
   *  200 with the same `revoked_at`. */
  revoked_at?: string;

  /** Schema-only flag in v1 (D-25). Persisted but no consumer wired —
   *  refund cross-owner is default-immune via the APIOwner filter at
   *  refund_service.go:476/544. Reserved for future opt-in clawback
   *  without schema migration. */
  refund_clawback_allowed?: boolean;

  /** RFC3339 UTC timestamp. Server-set on creation. */
  created_at: string;
}

/**
 * Parameters for `POST /split-grants`.
 *
 * The issuer is server-derived from the JWT — the request body MUST NOT
 * contain `issuer_owner_id`. Strict JSON decoding rejects unknown fields
 * with 400 `invalid_request_body` (closes the mass-assignment class at
 * the boundary).
 *
 * All four fields are optional; the minimal valid request is `{}` (an
 * open public grant authorising any payer to any wallet, never expiring).
 */
export interface CreateSplitGrantParams {
  /** Optional. Single permitted payer. Empty allows any payer (D-04). */
  allowed_payer_owner_id?: string;

  /** Optional. If set, the grant is closed to this wallet (D-07). Empty
   *  makes the grant open. */
  wallet_id?: string;

  /** Optional. RFC3339 UTC timestamp. Null/missing means never expires
   *  (D-05). No hard cap. */
  expires_at?: string;

  /** Schema-only flag in v1 (D-25). Persisted but no consumer wired. */
  refund_clawback_allowed?: boolean;
}

/**
 * Query parameters for `GET /split-grants` cursor-based pagination.
 *
 * Mirrors the project-wide pattern (`?cursor=&limit=`). There is
 * intentionally no cross-issuer view — a token cannot enumerate other
 * issuers' grants (D-12 privacy).
 */
export interface SplitGrantListParams {
  /** Opaque cursor returned by the previous page's `meta.next_cursor`
   *  (the last-seen `_id`). Empty/absent starts from the newest grant. */
  cursor?: string;

  /** Page size. Server-clamped to `(0, 100]`; default 50. */
  limit?: number;
}

/**
 * Response from `GET /split-grants`.
 *
 * Wire shape mirrors `writeList` from `internal/handler/helpers.go`:
 * `{ data: [...], meta: { per_page, next_cursor } }` — the same envelope
 * as `PaymentListResponse` / `WithdrawalListResponse`. The cursor lives
 * inside `meta`, not as a top-level field.
 */
export interface SplitGrantListResponse {
  data: SplitGrant[];
  /** Cursor metadata: `per_page` + optional `next_cursor` (empty when no
   *  more pages). */
  meta: {
    per_page: number;
    next_cursor?: string;
    prev_cursor?: string;
    total?: number;
  };
}
