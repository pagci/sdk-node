// ── Balance types ───────────────────────────────────────────────────
// Source: cmd/specgen/types.go (BalanceView)

/** Per-wallet balance (includes wallet_id). */
export interface Balance {
  wallet_id?: string;
  /** Available balance in centavos (integer). */
  available: number;
  /** Locked for pending withdrawals, in centavos (integer). */
  locked: number;
  /** Pending confirmation, in centavos (integer). */
  pending: number;
  /** Scheduled for future availability, in centavos (integer). */
  scheduled: number;
  /** Outstanding debt balance, in centavos (integer). */
  debt: number;
}

/** Account-level total balance (GET /user/balance response, no wallet_id). */
export interface TotalBalance {
  /** Available balance in centavos (integer). */
  available: number;
  /** Locked for pending withdrawals, in centavos (integer). */
  locked: number;
  /** Pending confirmation, in centavos (integer). */
  pending: number;
  /** Scheduled for future availability, in centavos (integer). */
  scheduled: number;
  /** Outstanding debt balance, in centavos (integer). */
  debt: number;
}

// ── List query params ───────────────────────────────────────────────

export interface WalletListParams {
  sort?: string;
  /** Prefix filter on wallet_id. */
  search?: string;
  page?: number;
  per_page?: number;
}
