// ── Webhook Endpoints resource ──────────────────────────────────────

import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type {
  WebhookEndpoint,
  WebhookEndpointsListResponse,
  RegisterWebhooksParams,
  WebhookEndpointInput,
  WebhookDelivery,
  WebhookDeliveryListParams,
  WebhookTestParams,
  WebhookTestResponse,
} from '../types/index.js';
import type { ListResponse, StatusResponse } from '../types/common.js';
import { Page } from '../pagination.js';
import { buildQueryString } from '../querystring.js';

export class WebhookEndpointsResource {
  constructor(private readonly sender: RequestSender) {}

  /** Register one or more webhook endpoints. */
  async register(
    params: RegisterWebhooksParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<WebhookEndpointsListResponse>> {
    return this.sender.request<WebhookEndpointsListResponse>(
      'POST',
      '/hooks',
      params,
      options,
    );
  }

  /** List all webhook endpoints. */
  async list(
    options?: RequestOptions,
  ): Promise<ApiResponse<WebhookEndpointsListResponse>> {
    return this.sender.request<WebhookEndpointsListResponse>(
      'GET',
      '/hooks',
      undefined,
      options,
    );
  }

  /** Update a webhook endpoint. */
  async update(
    id: string,
    params: WebhookEndpointInput,
    options?: RequestOptions,
  ): Promise<ApiResponse<WebhookEndpoint>> {
    return this.sender.request<WebhookEndpoint>(
      'PUT',
      `/hooks/${id}`,
      params,
      options,
    );
  }

  /** Delete a webhook endpoint. */
  async delete(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<StatusResponse>> {
    return this.sender.request<StatusResponse>(
      'DELETE',
      `/hooks/${id}`,
      undefined,
      options,
    );
  }

  /** List webhook deliveries with cursor-based pagination. */
  listDeliveries(params?: WebhookDeliveryListParams): Page<WebhookDelivery> {
    return new Page((cursor) => {
      const query = buildQueryString({ ...params, cursor });
      return this.sender
        .request<ListResponse<WebhookDelivery>>('GET', `/hooks/deliveries${query}`)
        .then((res) => res as ListResponse<WebhookDelivery>);
    });
  }

  /** Get a single webhook delivery by ID. */
  async getDelivery(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<WebhookDelivery>> {
    return this.sender.request<WebhookDelivery>(
      'GET',
      `/hooks/deliveries/${id}`,
      undefined,
      options,
    );
  }

  /** Resend a single webhook delivery. */
  async resend(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<StatusResponse>> {
    return this.sender.request<StatusResponse>(
      'POST',
      `/hooks/deliveries/${id}/resend`,
      undefined,
      options,
    );
  }

  /** Bulk resend webhook deliveries matching a filter. */
  async bulkResend(
    params: WebhookDeliveryListParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<StatusResponse>> {
    return this.sender.request<StatusResponse>(
      'POST',
      '/hooks/deliveries/bulk-resend',
      params,
      options,
    );
  }

  /** Send a test webhook to a specific endpoint. */
  async test(
    params: WebhookTestParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<WebhookTestResponse>> {
    return this.sender.request<WebhookTestResponse>(
      'POST',
      '/hooks/test',
      params,
      options,
    );
  }
}
