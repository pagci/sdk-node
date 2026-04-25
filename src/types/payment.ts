// ── Payment types ───────────────────────────────────────────────────
// Source: cmd/specgen/types.go (PaymentView, PaymentCompactView, etc.)

import type { Owner, CompactOwner, Customer, Item } from './common.js';

// ── Status & value literal unions ───────────────────────────────────

/**
 * Payment status. Runtime canonical — responses always emit values from this
 * union. 'expired' is distinct from 'cancelled' — QR-expired payments emit
 * 'expired', user/system cancellations emit 'cancelled'. The full-detail
 * view additionally returns 'refunded' when every owner recipient has been
 * fully refunded; the list/compact view does not emit 'refunded' (see
 * internal/paymentview/paymentview.go).
 *
 * For request filters the backend also accepts the legacy alias
 * `confirmed` → `paid`; that is exposed separately via {@link PaymentStatusFilter}
 * so this response-side union stays narrow.
 */
export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'psp_failed'
  | 'debt_pending'
  | 'debt_locked'
  | 'debt_paid'
  | 'refunded';

/**
 * Accepted values for the `status` query filter on list endpoints.
 * Superset of {@link PaymentStatus} with the back-compat alias and the
 * internal lifecycle states. Prefer canonical values in new code — the
 * alias is kept for back-compat only and may be removed in a future major
 * release.
 */
export type PaymentStatusFilter =
  | PaymentStatus
  /** @deprecated alias of `paid` — responses emit `paid`. */
  | 'confirmed'
  /** Internal lifecycle state; queryable by admins. Not emitted as document status. */
  | 'locked'
  /** Internal lifecycle state; queryable by admins. Not emitted as document status. */
  | 'settling'
  /** Internal lifecycle state; queryable by admins. Not emitted as document status. */
  | 'settled';
export type RecipientStatus = 'pending' | 'paid' | 'locked' | 'settling' | 'settled' | 'failed' | 'cancelled' | 'debt_pending' | 'debt_locked' | 'debt_paid';
export type PaymentOrigin = '' | 'change' | 'debt' | 'transfer' | 'kyc' | 'internal_charge';
export type DocumentType = 'cpf' | 'cnpj';
export type QRFormat = 'png' | 'svg';
export type SortOrder = 'newest' | 'oldest' | 'amount' | 'status';
export type RefundStatus = 'pending' | 'completed' | 'failed';

// ── Nested types ────────────────────────────────────────────────────

/** Payer information from the PSP (who actually paid the PIX). */
export interface Payer {
  name?: string;
  /** Masked CPF/CNPJ. */
  document?: string;
  /** "cpf" or "cnpj". */
  document_type?: DocumentType;
  bank?: Bank;
  matches_customer?: boolean;
}

/** Bank information attached to payer or receiver. */
export interface Bank {
  name?: string;
  code?: string;
  ispb?: string;
  account?: string;
  logo_url?: string;
}

/** Refund entry on a recipient. */
export interface RefundEntry {
  id: string;
  /** Amount in centavos (integer). */
  amount: number;
}

/** Deduction entry on a recipient. */
export interface DeductionEntry {
  wallet_id: string;
  origin: PaymentOrigin;
  /** Amount in centavos (integer). */
  amount: number;
}

/** Payment lifecycle event. */
export interface HistoryEvent {
  event_type: string;
  /** ISO 8601 timestamp. */
  occurred_at: string;
  details: string;
}

/** KYC validation attached to a payment. */
export interface KYCValidation {
  validated: boolean;
  section: string;
  failure_reason?: string;
  /** ISO 8601 timestamp. */
  validated_at: string;
}

/** Payment-level configuration. */
export interface PaymentConfig {
  /** Override webhook URL for this payment. */
  overwrite_webhook_url?: string;
}

// ── QR Code configuration (nested structs) ──────────────────────────

export interface QRLogoConfig {
  image?: string;
  show?: boolean;
  size?: number;
  border_size?: number | null;
  border_color?: string;
  border_radius?: number | null;
  padding?: number | null;
  background?: string;
}

export interface QRForegroundConfig {
  color?: string;
  edge?: string;
  intensity?: number | null;
  spread?: number | null;
}

export interface QRModuleConfig {
  radius?: number | null;
}

export interface QRBadgeConfig {
  text?: string;
  color?: string;
  text_color?: string;
  border_size?: number | null;
  border_color?: string;
  radius?: number | null;
  padding_x?: number | null;
  padding_y?: number | null;
  offset_y?: number | null;
}

export interface QRConfig {
  size?: number;
  /** "png" or "svg". */
  format?: QRFormat;
  logo?: QRLogoConfig;
  foreground?: QRForegroundConfig;
  module?: QRModuleConfig;
  background?: string;
  invert?: boolean;
  transparent?: boolean;
  badge?: QRBadgeConfig;
}

// ── Internal charge (Phase 87) ──────────────────────────────────────

/**
 * InternalCharge subdoc present on payments created with `kind: "internal_charge"`.
 * The charge is paid by another wallet of the same api_owner via
 * `POST /withdrawals` with `pix_key: "charge:<paymentID>"`.
 *
 * State is enumerable by inspecting these fields:
 *  - nil                                                 → not an internal charge
 *  - reserved_by_withdrawal == "" && paid_by_withdrawal == ""  → awaiting payment
 *  - reserved_by_withdrawal != "" && paid_by_withdrawal == ""  → reserved (claim in flight)
 *  - paid_by_withdrawal != ""                            → paid
 *  - confirmed_side_effects_at != null                   → paid + webhooks/analytics done
 *
 * Invariant: `paid_by_withdrawal != ""` implies `reserved_by_withdrawal == paid_by_withdrawal`.
 */
export interface InternalCharge {
  /** Withdrawal ID that won the Pattern A CAS claim (empty until a withdrawal reserves it). */
  reserved_by_withdrawal?: string;
  /** Withdrawal ID that settled the charge (empty until settle worker confirms). */
  paid_by_withdrawal?: string;
  /** ISO 8601 timestamp — set atomically with paid_by_withdrawal by ConfirmInternalChargeAtomic. */
  paid_at?: string;
  /** ISO 8601 timestamp — cutoff after which the charge becomes unclaimable. */
  expires_at: string;
  /** ISO 8601 timestamp — idempotency marker set after HandleConfirmed pipeline completes. */
  confirmed_side_effects_at?: string;
}

// ── Recipient view (response) ───────────────────────────────────────

export interface RecipientView {
  wallet_id: string;
  /** Amount in centavos (integer). */
  amount: number;
  /** Original amount before deductions, in centavos (integer). */
  original_amount: number;
  /** Recipient status. */
  status: RecipientStatus;
  origin?: PaymentOrigin;
  participate_gateway_fees: boolean;
  /** ISO 8601 timestamp. */
  available_at: string;
  api_owner: string;
  held: boolean;
  withdrawal_id?: string;
  /** Refunded amount in centavos (integer). */
  refunded_amount: number;
  refunded_data?: RefundEntry[];
  deductions?: DeductionEntry[];
  /** Amount still available for refund, in centavos (integer). */
  refundable_amount: number;
}

/** PSP liquidator information on a payment. */
export interface LiquidatorView {
  id: string;
  name: string;
  /** PIX end-to-end ID. */
  e2e_id?: string;
  /** PIX QR code payload (copia e cola). */
  pix_qr?: string;
  payer?: Payer | null;
  /** Time to create PIX charge (ms). */
  creation_ms?: number | null;
  /**
   * Time to claim from the QR pool, in ms.
   * `0` means the QR did not come from the pool (PSP miss or internal charge).
   *
   * **Legacy field** — kept for backward compatibility. For the canonical
   * critical-path latency on origin=pix payments (whether pool hit or PSP
   * miss), prefer {@link total_qr_ms}. For the canonical pool-hit signal,
   * prefer {@link pool_hit}.
   */
  claim_ms: number;
  /**
   * Total critical-path time to obtain the QR, in ms.
   *
   * Populated on every payment with a real QR (origin=pix), regardless of
   * whether the QR came from the pool or required a PSP call (including
   * routing fallback). Absent (`undefined`) on internal charges, where no
   * QR is produced — the backend emits `*int64` with `omitempty`, so the
   * field is structurally dropped from the JSON response.
   */
  total_qr_ms?: number;
  /**
   * Canonical "QR came from the pool" signal.
   *
   * Always emitted (the backend Go field has no `omitempty`) — `false` is
   * informative and distinguishes "QR came from the PSP, not the pool"
   * from "no QR was produced" (internal charges, where `total_qr_ms` is
   * also absent). Matches the always-emitted style of {@link claim_ms}.
   */
  pool_hit: boolean;
  /** Time from creation to payment (ms). */
  payment_ms?: number | null;
}

// ── Payment views ───────────────────────────────────────────────────

/** Full payment detail (GET /payments/:id response). */
export interface Payment {
  id: string;
  status: PaymentStatus;
  origin?: PaymentOrigin;
  idempotency_key?: string;
  api_owner?: string;
  owner: Owner;
  customer: Customer;
  items: Item[];
  recipients: RecipientView[];
  liquidator: LiquidatorView;
  /** Total PIX amount in centavos (integer). */
  pix_total: number;
  /** Platform fee in centavos (integer). */
  platform_fee: number;
  /** Total refundable amount in centavos (integer). */
  total_refundable: number;
  config: PaymentConfig;
  history: HistoryEvent[];
  kyc_validation?: KYCValidation | null;
  /**
   * Phase 87 — present when `origin === 'internal_charge'`. Omitted for regular payments.
   * See {@link InternalCharge} for field semantics and state enumeration.
   */
  internal_charge?: InternalCharge;
  /**
   * Phase 87 — present when `origin === 'internal_charge'`. Pass this string as
   * `pix_key` on `POST /withdrawals` (from a wallet of the same api_owner) to
   * pay the charge. Format: `charge:<paymentID>`.
   */
  payable_key?: string;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** Compact payment view used in list endpoints. */
export interface PaymentCompact {
  id: string;
  status: PaymentStatus;
  origin?: PaymentOrigin;
  owner: CompactOwner;
  customer: Customer;
  /** Total PIX amount in centavos (integer). */
  pix_total: number;
  /** Platform fee in centavos (integer). */
  platform_fee: number;
  /** ISO 8601 timestamp. */
  created_at: string;
}

/** Status count used in payment list response. */
export interface StatusCount {
  status: PaymentStatus;
  count: number;
}

// ── Request param types ─────────────────────────────────────────────

/** Recipient in a create payment request. */
export interface RecipientParams {
  /** Destination wallet. */
  wallet_id: string;
  /** Amount in centavos (integer). */
  amount: number;
  origin?: PaymentOrigin;
  participate_gateway_fees?: boolean;
  /** ISO 8601 when funds become available. */
  available_at?: string;
  /** Hold funds until explicit release. */
  held?: boolean;
}

/** Parameters for creating a payment. */
export interface CreatePaymentParams {
  owner: Owner;
  customer: Customer;
  items: Item[];
  recipients: RecipientParams[];
  config?: PaymentConfig;
  /** QR code customization. Pass object for custom config. */
  qr?: QRConfig;
  /**
   * Phase 87 — set to `"internal_charge"` to create an internal charge
   * (no PSP call, no QR code). The returned payment carries `payable_key`
   * which another wallet of the same api_owner can pass as `pix_key` on
   * `POST /withdrawals` to pay the charge.
   *
   * When set: the server rejects 400 `liquidator_not_allowed_for_internal`
   * if you also provide `liquidator` — the liquidator is forced to `internal`.
   *
   * Input-only: the field is NOT persisted; the durable discriminator is
   * `payment.internal_charge != null` on the response.
   */
  kind?: 'internal_charge';
}

/** Per-recipient entry for a refund request. */
export interface RefundRecipientEntry {
  wallet_id: string;
  /** Amount in centavos (integer). */
  amount: number;
}

/** Parameters for refunding a payment. Amount and recipients are mutually exclusive. */
export interface RefundParams {
  /** Total refund in centavos (mutually exclusive with recipients). */
  amount?: number;
  /** Per-recipient distribution (mutually exclusive with amount). */
  recipients?: RefundRecipientEntry[];
}

/** Distribution entry in a refund response. */
export interface RefundDistEntry {
  wallet_id: string;
  /** Amount in centavos (integer). */
  amount: number;
}

/** Refund response. */
export interface RefundResponse {
  refund_id: string;
  payment_id: string;
  /** Total refund amount in centavos (integer). */
  refund_total: number;
  status: RefundStatus;
  withdrawal_ids?: string[];
  distribution: RefundDistEntry[];
}

// ── List query params ───────────────────────────────────────────────

export interface PaymentListParams {
  cursor?: string;
  prev_cursor?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  /** Payment status filter. Accepts CSV (e.g. "paid,pending"). */
  status?: string;
  /** Smart search — auto-detects payment ID, e2e ID, document, email, or payer name. Minimum 2 characters. */
  q?: string;
  owner_wallet?: string;
  idempotency_key?: string;
  /** Exact match on customer CPF/CNPJ. Accepts formatted (123.456.789-00) or raw digits — punctuation is stripped server-side. */
  customer_doc?: string;
  /** Minimum pix_total in centavos (integer only, e.g. 1050 = R$10,50). */
  amount_gte?: number;
  /** Maximum pix_total in centavos (integer only, e.g. 10000 = R$100,00). */
  amount_lte?: number;
  /** Filter by wallet ID. */
  wallet_id?: string;
  /** Start date (ISO 8601). */
  created_gte?: string;
  /** End date (ISO 8601). */
  created_lte?: string;
  origin?: string;
}
