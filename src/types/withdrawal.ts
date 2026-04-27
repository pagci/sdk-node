// ── Withdrawal types ────────────────────────────────────────────────
// Source: cmd/specgen/types.go (WithdrawalView, Receiver, etc.)

/**
 * Withdrawal lifecycle status.
 *
 * Terminal failure-like states carry distinct money-flow semantics:
 * - `failed`   — natural PSP failure (timeout, explicit rejection)
 * - `reverted` — admin stopped a pre-payout withdrawal (frozen/rejected → reverted)
 * - `reversed` — admin reversed a settled withdrawal (settled → reversed via CLI)
 */
export type WithdrawalStatus = 'pending' | 'psp_calling' | 'settling' | 'settled' | 'failed' | 'frozen' | 'rejected' | 'reversed' | 'reverted';
/**
 * PIX key type enum.
 *
 * Phase 87 — `internal_charge` is the type used to pay an internal charge.
 * It requires the `pix_key` to be in the form `"charge:<paymentID>"`, where
 * `<paymentID>` is the id of the receiver-side charge payment (returned as
 * `payable_key` on the charge response). Any other `pix_key_type` combined
 * with a `charge:` prefix is rejected with `ErrorCode.InvalidPixKeyType`.
 */
export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | 'wallet' | 'refund' | 'internal_charge';

/** Receiver bank information on a withdrawal. */
export interface ReceiverBank {
  name?: string;
  code?: string;
  ispb?: string;
  account?: string;
  logo_url?: string;
}

/** Receiver (who received the payout). */
export interface Receiver {
  name?: string;
  /** Masked document. */
  document?: string;
  pix_key?: string;
  bank?: ReceiverBank;
}

/** PSP liquidator for a withdrawal. */
export interface WithdrawalLiquidator {
  id: string;
  name: string;
  /** PIX end-to-end ID. */
  e2e_id?: string;
}

/** Full withdrawal detail (GET /withdrawals/:id response). */
export interface Withdrawal {
  id: string;
  wallet_id: string;
  api_owner: string;
  /** Originally requested amount in centavos (integer). */
  requested_amount: number;
  /** Final amount after fees in centavos (integer). */
  amount: number;
  pix_key: string;
  pix_key_type: PixKeyType;
  origin?: string;
  /** Debt collected in this withdrawal, in centavos (integer). */
  debt_amount: number;
  /** Fee charged to user, in centavos (integer). */
  fee: number;
  status: WithdrawalStatus;
  psp_name?: string;
  liquidator?: WithdrawalLiquidator | null;
  receiver?: Receiver | null;
  /** Change amount returned, in centavos (integer). */
  change_amount: number;
  change_payment_id?: string;
  refund_id?: string;
  /** Error message if failed. */
  error?: string;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** Response from creating a withdrawal. */
export interface CreateWithdrawalResponse {
  id: string;
  status: WithdrawalStatus;
  /** Amount in centavos (integer). */
  amount: number;
}

// ── Request param types ─────────────────────────────────────────────

/** Parameters for creating a withdrawal. */
export interface CreateWithdrawalParams {
  /** Source wallet. */
  wallet_id: string;
  /** Amount in centavos (integer). */
  amount: number;
  /** PIX key for payout. */
  pix_key: string;
  /** PIX key type. */
  pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
}

// ── List query params ───────────────────────────────────────────────

export interface WithdrawalListParams {
  cursor?: string;
  prev_cursor?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  status?: string;
  wallet_id?: string;
  pix_key_type?: string;
  idempotency_key?: string;
  q?: string;
  /** Start date (ISO 8601). */
  created_gte?: string;
  /** End date (ISO 8601). */
  created_lte?: string;
}

// ── Lifetime summary (Phase 104) ────────────────────────────────────

/**
 * Lifetime summary of withdrawals for the authenticated owner — 4 cards.
 *
 * All money fields are int64 centavos. JavaScript's Number type can safely
 * represent integers up to 2^53 - 1 (Number.MAX_SAFE_INTEGER, ~9 quadrillion
 * cents = ~9 × 10^13 reais), which is far above any realistic withdrawal
 * volume. Callers needing > 2^53 cents must use BigInt.
 *
 * Source: GET /withdrawals/summary (Phase 104).
 *
 * Failure semantics:
 * - 503 `clickhouse_unavailable` — analytics infra down; retry with backoff.
 * - 500 `internal_error` — MongoDB error; retry with backoff.
 * - 401 `unauthorized` — token missing or invalid.
 */
export interface WithdrawalSummary {
  /** Saldo disponível para saque, em centavos. */
  disponivel_centavos: number;
  /** Saques em pending/psp_calling/settling, net (inflow - outflow), em centavos. */
  em_processamento_centavos: number;
  /** Total lifetime de saques settled, em centavos. */
  total_sacado_centavos: number;
  /** Total lifetime de saques failed/rejected/reverted/reversed, em centavos. */
  rejeitados_centavos: number;
  /**
   * Timestamp RFC3339 UTC do evento mais recente visível na MV.
   * Vazio (campo ausente) se a MV não tiver dados ainda — granularidade Date (dia).
   */
  last_updated_at?: string;
}
