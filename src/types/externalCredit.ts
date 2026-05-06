// ── ExternalCredit types (Phase 105 closure — quick-260427-pk4) ──────
// Source of truth:
//  - cmd/specgen/types.go (ExternalCreditView, ExternalCreditListResponse)
//  - internal/handler/external_credits_handler.go
//  - internal/service/external_credits_service.go (privacy contract)
//
// Phase 105 closure — receiver-side historical reconciliation
// ----------------------------------------------------------------------
// Use case: receiver B reconciles credits received via cross-owner
// SplitGrant. The webhook `payment.paid` covers real-time delivery;
// this endpoint covers historical browsing.
//
// Privacy: the payer's real api_owner is NEVER exposed. Each row
// carries `payer_owner_masked` — a deterministic opaque token scoped
// to the viewing receiver. Same payer + same receiver ⇒ same token
// (correlation OK). Different receivers ⇒ different tokens for the
// same payer (no cross-tenant correlation). See D-19 in
// .planning/phases/105-cross-owner-split-via-splitgrant/105-CONTEXT.md.

import type { ListMeta } from './common.js';

/**
 * One historical credit received by the receiver via an external_split
 * recipient on a cross-owner payment.
 */
export interface ExternalCredit {
  /** Payment ID of the source cross-owner payment. Pass to
   *  GET /payments/{id} for full detail. */
  payment_id: string;

  /** Centavos (int64). Equals recipient.amount on the source payment. */
  amount_received: number;

  /** SplitGrant ID that authorised this credit. The receiver issued it. */
  grant_id: string;

  /** Opaque deterministic identifier of the payer's api_owner. Format
   *  `pyr_<12 hex chars>`. Stable per (receiver, payer) tuple. */
  payer_owner_masked: string;

  /** Origin of the payer's payment. Always `"pix"` in v1 (D-23). */
  payer_origin: string;

  /** RFC3339 UTC timestamp the source payment transitioned to paid.
   *  `undefined` while the source payment is still pending. */
  confirmed_at?: string;

  /** Pass-through of payment.status (user-facing values). */
  status: string;

  /** ID of the receiver-side wallet that received this credit. Referential
   *  within the receiver's own api_owner namespace — safe to expose under
   *  D-19 because the receiver already owns the wallet. Closed grants get
   *  this from the grant (D-07); open grants get it from the
   *  recipient.wallet_id (which is scoped to the issuer's namespace by
   *  the resolver — no cross-owner spoof vector). */
  wallet_id: string;
}

/** Query params for `GET /external-credits`. */
export interface ExternalCreditListParams {
  /** Cursor from the previous page's `meta.next_cursor`. */
  cursor?: string;
  /** Items per page; clamps to (0, 100], default 50. */
  limit?: number;
}

/** Paginated envelope for `GET /external-credits`. Mirrors
 *  PaymentListResponse / SplitGrantListResponse — cursor inside `meta`. */
export interface ExternalCreditListResponse {
  data: ExternalCredit[];
  meta: ListMeta;
}
