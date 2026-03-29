import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type { Withdrawal, CreateWithdrawalParams, CreateWithdrawalResponse, WithdrawalListParams } from '../types/index.js';
import { Page } from '../pagination.js';
export declare class WithdrawalsResource {
    private readonly sender;
    constructor(sender: RequestSender);
    /**
     * Create a new withdrawal (PIX payout).
     *
     * Returns 202 Accepted. The withdrawal is processed asynchronously.
     * Automatically generates an idempotency key if none is provided.
     */
    create(params: CreateWithdrawalParams, options?: RequestOptions): Promise<ApiResponse<CreateWithdrawalResponse>>;
    /**
     * List withdrawals with cursor-based pagination.
     */
    list(params?: WithdrawalListParams): Page<Withdrawal>;
    /** Get a single withdrawal by ID. */
    get(id: string, options?: RequestOptions): Promise<ApiResponse<Withdrawal>>;
    /** Get the receipt for a settled withdrawal. */
    getReceipt(id: string, options?: RequestOptions): Promise<ApiResponse<Record<string, unknown>>>;
}
//# sourceMappingURL=withdrawals.d.ts.map