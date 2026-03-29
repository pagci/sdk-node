import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type { Payment, PaymentCompact, CreatePaymentParams, RefundParams, RefundResponse, PaymentListParams, StatusCount } from '../types/index.js';
import type { ListResponse, StatusResponse } from '../types/common.js';
import { Page } from '../pagination.js';
/** Payment list response includes status_counts alongside data. */
export interface PaymentListResponse extends ListResponse<PaymentCompact> {
    status_counts: StatusCount[];
}
export declare class PaymentsResource {
    private readonly sender;
    constructor(sender: RequestSender);
    /**
     * Create a new PIX payment.
     *
     * Automatically generates an idempotency key if none is provided.
     */
    create(params: CreatePaymentParams, options?: RequestOptions): Promise<ApiResponse<Payment>>;
    /**
     * List payments with cursor-based pagination.
     *
     * Returns a `Page` that supports async iteration, manual navigation,
     * and `autoPagingToArray()`.
     */
    list(params?: PaymentListParams): Page<PaymentCompact>;
    /** Get a single payment by ID. */
    get(id: string, options?: RequestOptions): Promise<ApiResponse<Payment>>;
    /**
     * Refund a payment (fully or partially).
     *
     * Pass `{ amount }` for proportional refund or `{ recipients }` for
     * per-recipient distribution. These are mutually exclusive.
     */
    refund(id: string, params: RefundParams, options?: RequestOptions): Promise<ApiResponse<RefundResponse>>;
    /** Release a held recipient on a payment. */
    releaseRecipient(paymentId: string, walletId: string, options?: RequestOptions): Promise<ApiResponse<StatusResponse>>;
    /**
     * Get the receipt for a confirmed payment.
     *
     * Returns the raw response; the receipt format depends on the API
     * (typically PDF binary or a JSON with a URL).
     */
    getReceipt(id: string, options?: RequestOptions): Promise<ApiResponse<Record<string, unknown>>>;
}
//# sourceMappingURL=payments.d.ts.map