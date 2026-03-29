import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type { WebhookEndpoint, WebhookEndpointsListResponse, RegisterWebhooksParams, WebhookEndpointInput, WebhookDelivery, WebhookDeliveryListParams, WebhookTestParams, WebhookTestResponse } from '../types/index.js';
import type { StatusResponse } from '../types/common.js';
import { Page } from '../pagination.js';
export declare class WebhookEndpointsResource {
    private readonly sender;
    constructor(sender: RequestSender);
    /** Register one or more webhook endpoints. */
    register(params: RegisterWebhooksParams, options?: RequestOptions): Promise<ApiResponse<WebhookEndpointsListResponse>>;
    /** List all webhook endpoints. */
    list(options?: RequestOptions): Promise<ApiResponse<WebhookEndpointsListResponse>>;
    /** Update a webhook endpoint. */
    update(id: string, params: WebhookEndpointInput, options?: RequestOptions): Promise<ApiResponse<WebhookEndpoint>>;
    /** Delete a webhook endpoint. */
    delete(id: string, options?: RequestOptions): Promise<ApiResponse<StatusResponse>>;
    /** List webhook deliveries with cursor-based pagination. */
    listDeliveries(params?: WebhookDeliveryListParams): Page<WebhookDelivery>;
    /** Get a single webhook delivery by ID. */
    getDelivery(id: string, options?: RequestOptions): Promise<ApiResponse<WebhookDelivery>>;
    /** Resend a single webhook delivery. */
    resend(id: string, options?: RequestOptions): Promise<ApiResponse<StatusResponse>>;
    /** Bulk resend webhook deliveries matching a filter. */
    bulkResend(params: WebhookDeliveryListParams, options?: RequestOptions): Promise<ApiResponse<StatusResponse>>;
    /** Send a test webhook to a specific endpoint. */
    test(params: WebhookTestParams, options?: RequestOptions): Promise<ApiResponse<WebhookTestResponse>>;
}
//# sourceMappingURL=webhookEndpoints.d.ts.map