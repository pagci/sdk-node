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
    pix_key_type: string;
    origin?: string;
    /** Debt collected in this withdrawal, in centavos (integer). */
    debt_amount: number;
    /** Fee charged to user, in centavos (integer). */
    fee: number;
    status: string;
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
    status: string;
    /** Amount in centavos (integer). */
    amount: number;
}
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
    from?: string;
    /** End date (ISO 8601). */
    to?: string;
}
//# sourceMappingURL=withdrawal.d.ts.map