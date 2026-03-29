import type { ListMeta } from './common.js';
/** Parameters for creating a debt. */
export interface CreateDebtParams {
    wallet_id: string;
    /** Debt amount in centavos (integer). */
    amount: number;
    /** Unique reference. */
    referer: string;
}
/** Response from creating a debt (no timestamps). */
export interface CreateDebtResponse {
    id: string;
    wallet_id: string;
    /** Amount in centavos (integer). */
    amount: number;
    referer: string;
    status: string;
}
/** Debt item in a list response (includes timestamps). */
export interface DebtListItem {
    id: string;
    wallet_id: string;
    /** Amount in centavos (integer). */
    amount: number;
    status: string;
    referer: string;
    /** ISO 8601 timestamp. */
    created_at: string;
    /** ISO 8601 timestamp. */
    updated_at: string;
}
/** Debt list response envelope. */
export interface DebtListResponse {
    data: DebtListItem[];
    meta: ListMeta;
}
export interface DebtListParams {
    cursor?: string;
    prev_cursor?: string;
    per_page?: number;
    sort?: string;
    status?: string;
    wallet_id?: string;
    /** Start date (ISO 8601). */
    from?: string;
    /** End date (ISO 8601). */
    to?: string;
}
//# sourceMappingURL=debt.d.ts.map