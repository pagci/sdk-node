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

/** Aggregated balance for a subset of wallets (POST /user/balance/batch response). */
export interface BatchBalance {
  /** Sum of available balance across the requested wallets, in centavos. */
  available: number;
  /** Sum of locked balance, in centavos. */
  locked: number;
  /** Sum of pending balance, in centavos. */
  pending: number;
  /** Sum of scheduled balance, in centavos. */
  scheduled: number;
  /** Sum of debt balance, in centavos. */
  debt: number;
  /** Number of distinct wallet IDs aggregated (after dedup). */
  count: number;
  /** Per-wallet breakdown. Present only when `wallets=true` was requested. */
  wallets?: Balance[];
}

// ── List query params ───────────────────────────────────────────────

export interface WalletListParams {
  sort?: string;
  /** Prefix filter on wallet_id. */
  search?: string;
  page?: number;
  per_page?: number;
}
