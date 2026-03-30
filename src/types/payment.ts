// ── Payment types ───────────────────────────────────────────────────
// Source: cmd/specgen/types.go (PaymentView, PaymentCompactView, etc.)

import type { Owner, CompactOwner, Customer, Item } from './common.js';

// ── Status & value literal unions ───────────────────────────────────

export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'expired' | 'psp_failed';
export type RecipientStatus = 'pending' | 'paid' | 'locked' | 'settling' | 'settled' | 'failed' | 'cancelled' | 'debt_pending' | 'debt_locked' | 'debt_paid';
export type PaymentOrigin = '' | 'change' | 'debt' | 'transfer' | 'kyc';
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
  /** Time from creation to claim (ms). */
  claim_ms: number;
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
  status?: string;
  /** Smart search -- auto-detects payment ID, e2e ID, document, email, or payer name. */
  q?: string;
  owner_wallet?: string;
  idempotency_key?: string;
  customer_doc?: string;
  /** Minimum amount in centavos (integer). */
  amount_gte?: number;
  /** Maximum amount in centavos (integer). */
  amount_lte?: number;
  /** Filter by wallet ID. */
  wallet_id?: string;
  /** Start date (ISO 8601). */
  created_gte?: string;
  /** End date (ISO 8601). */
  created_lte?: string;
  origin?: string;
}
