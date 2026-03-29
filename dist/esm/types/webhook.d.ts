import type { Payment } from './payment.js';
import type { Withdrawal } from './withdrawal.js';
import type { Balance } from './balance.js';
import type { ListMeta } from './common.js';
export declare enum WebhookEventType {
    PaymentConfirmed = "payment.confirmed",
    PaymentFailed = "payment.failed",
    PaymentCancelled = "payment.cancelled",
    PaymentExpired = "payment.expired",
    PaymentDispute = "payment.dispute",
    WithdrawalSettled = "withdrawal.settled",
    WithdrawalFailed = "withdrawal.failed",
    RefundCompleted = "refund.completed"
}
export type WebhookEnvelope = {
    event: string;
    resource_type: 'payment';
    data: Payment;
    balances?: Record<string, Balance>;
    account_balance?: Balance;
} | {
    event: string;
    resource_type: 'withdrawal';
    data: Withdrawal;
    balances?: Record<string, Balance>;
    account_balance?: Balance;
} | {
    event: string;
    resource_type: 'refund';
    data: unknown;
    balances?: Record<string, Balance>;
    account_balance?: Balance;
};
export interface WebhookEndpoint {
    id: string;
    url: string;
    events: string[];
    host: string;
    host_status: string;
}
export interface WebhookEndpointsListResponse {
    endpoints: WebhookEndpoint[];
    valid_events: string[];
}
export interface WebhookEndpointInput {
    url: string;
    events: string[];
}
export interface RegisterWebhooksParams {
    endpoints: WebhookEndpointInput[];
}
export interface WebhookDelivery {
    id: string;
    event: string;
    resource_type: string;
    resource_id: string;
    status: string;
    attempts: number;
    /** ISO 8601 timestamp. */
    created_at: string;
    /** ISO 8601 timestamp. */
    updated_at: string;
}
export interface WebhookDeliveryListResponse {
    data: WebhookDelivery[];
    meta: ListMeta;
}
export interface WebhookTestParams {
    event: string;
    resource_type: string;
    resource_id: string;
    /** Which endpoint to test. */
    url: string;
}
export interface WebhookTestResponse {
    event: string;
    resource_type: string;
    resource_id: string;
    url: string;
    payload_size_bytes: number;
    status_code?: number;
    latency_ms?: number;
    response_body?: string;
    error?: string;
}
export interface WebhookDeliveryListParams {
    cursor?: string;
    prev_cursor?: string;
    page?: number;
    per_page?: number;
    sort?: string;
    status?: string;
    resource_type?: string;
    target_status?: string;
    event?: string;
    /** Start date (ISO 8601). */
    from?: string;
    /** End date (ISO 8601). */
    to?: string;
    wallet_id?: string;
}
//# sourceMappingURL=webhook.d.ts.map