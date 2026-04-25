// ── Webhook Endpoints resource ──────────────────────────────────────

import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type {
  WebhookEndpoint,
  WebhookEndpointsListResponse,
  ReplaceWebhookEndpointsResponse,
  ReplaceWebhookEndpointsParams,
  AddWebhookEndpointParams,
  AddWebhookEndpointResponse,
  UpdateWebhookEndpointParams,
  WebhookDelivery,
  WebhookDeliveryListParams,
  WebhookTestParams,
  WebhookTestResponse,
  WebhookEventsCatalogResponse,
} from '../types/index.js';
import type { ListResponse, StatusResponse } from '../types/common.js';
import { Page } from '../pagination.js';
import { buildQueryString } from '../querystring.js';

export class WebhookEndpointsResource {
  constructor(private readonly sender: RequestSender) {}

  /**
   * Append a single webhook endpoint atomically. Does NOT touch existing
   * endpoints. Backend verifies the URL via challenge-response before
   * persistence. Returns 201 with the created endpoint.
   *
   * Use {@link replaceEndpoints} when you want replace-all semantics.
   */
  async addEndpoint(
    params: AddWebhookEndpointParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<AddWebhookEndpointResponse>> {
    return this.sender.request<AddWebhookEndpointResponse>(
      'POST',
      '/hooks/endpoints',
      params,
      options,
    );
  }

  /**
   * Replace the entire set of webhook endpoints with the provided list.
   * Each endpoint is verified via challenge-response. Returns 201 with the
   * full new set.
   */
  async replaceEndpoints(
    params: ReplaceWebhookEndpointsParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<ReplaceWebhookEndpointsResponse>> {
    return this.sender.request<ReplaceWebhookEndpointsResponse>(
      'PUT',
      '/hooks/endpoints',
      params,
      options,
    );
  }

  /**
   * Replace-all alias retained for one release so existing integrations
   * keep working. Internally calls {@link replaceEndpoints} (PUT).
   *
   * @deprecated Use {@link replaceEndpoints} for replace-all (PUT) or
   * {@link addEndpoint} for atomic single-add (POST).
   */
  async register(
    params: ReplaceWebhookEndpointsParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<ReplaceWebhookEndpointsResponse>> {
    return this.replaceEndpoints(params, options);
  }

  /** List all webhook endpoints. */
  async list(
    options?: RequestOptions,
  ): Promise<ApiResponse<WebhookEndpointsListResponse>> {
    return this.sender.request<WebhookEndpointsListResponse>(
      'GET',
      '/hooks/endpoints',
      undefined,
      options,
    );
  }

  /**
   * Partial update of a webhook endpoint. Send only the fields you want to
   * change — at least one of url, events, or active is required. Use
   * `{ active: false }` to pause delivery without deleting the endpoint.
   */
  async update(
    id: string,
    params: UpdateWebhookEndpointParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<WebhookEndpoint>> {
    return this.sender.request<WebhookEndpoint>(
      'PUT',
      `/hooks/endpoints/${id}`,
      params,
      options,
    );
  }

  /** Pause webhook delivery for a single endpoint (active=false) without deleting it. */
  async pause(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<WebhookEndpoint>> {
    return this.update(id, { active: false }, options);
  }

  /** Resume webhook delivery for a paused endpoint (active=true). */
  async resume(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<WebhookEndpoint>> {
    return this.update(id, { active: true }, options);
  }

  /** Delete a single webhook endpoint by ID. */
  async delete(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<StatusResponse>> {
    return this.sender.request<StatusResponse>(
      'DELETE',
      `/hooks/endpoints/${id}`,
      undefined,
      options,
    );
  }

  /** Delete all configured webhook endpoints at once. */
  async deleteAll(
    options?: RequestOptions,
  ): Promise<ApiResponse<StatusResponse>> {
    return this.sender.request<StatusResponse>(
      'DELETE',
      '/hooks/endpoints',
      undefined,
      options,
    );
  }

  /** List webhook deliveries with cursor-based pagination. */
  listDeliveries(params?: WebhookDeliveryListParams): Page<WebhookDelivery> {
    return new Page((cursor) => {
      const query = buildQueryString({ ...params, cursor });
      return this.sender
        .request<ListResponse<WebhookDelivery>>('GET', `/hooks${query}`)
        .then((res) => res as ListResponse<WebhookDelivery>);
    });
  }

  /** Find a webhook delivery by resource type + resource ID. */
  async findByResource(
    resourceType: string,
    resourceId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<WebhookDelivery>> {
    const query = buildQueryString({
      resource_type: resourceType,
      resource_id: resourceId,
    });
    return this.sender.request<WebhookDelivery>(
      'GET',
      `/hooks/search${query}`,
      undefined,
      options,
    );
  }

  /** Get a single webhook delivery by ID. */
  async getDelivery(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<WebhookDelivery>> {
    return this.sender.request<WebhookDelivery>(
      'GET',
      `/hooks/${id}`,
      undefined,
      options,
    );
  }

  /**
   * Resend a single webhook delivery.
   *
   * Optional `scope`:
   * - `"pending"` — resend only pending/failed targets
   * - `"failed"` — resend only failed targets
   * - omitted — reset all targets for a fresh delivery cycle
   */
  async resend(
    id: string,
    params?: { scope?: 'pending' | 'failed' },
    options?: RequestOptions,
  ): Promise<ApiResponse<StatusResponse>> {
    const query = buildQueryString({ ...params });
    return this.sender.request<StatusResponse>(
      'POST',
      `/hooks/${id}/resend${query}`,
      undefined,
      options,
    );
  }

  /**
   * Bulk resend webhook deliveries matching a filter.
   *
   * Filters are sent as query params (not body). `status` accepts a CSV:
   * `"failed,pending"` matches deliveries with either status.
   */
  async bulkResend(
    params?: BulkResendParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<BulkResendResponse>> {
    const query = buildQueryString({ ...params });
    return this.sender.request<BulkResendResponse>(
      'POST',
      `/hooks/resend${query}`,
      undefined,
      options,
    );
  }

  /** List available webhook event types and wildcard patterns. */
  async listEvents(
    options?: RequestOptions,
  ): Promise<ApiResponse<WebhookEventsCatalogResponse>> {
    return this.sender.request<WebhookEventsCatalogResponse>(
      'GET',
      '/hooks/events',
      undefined,
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

// ── Bulk resend types ────────────────────────────────────────────────

export interface BulkResendParams {
  /** Comma-separated list. Values: pending, processing, delivered, failed, removed, skipped. Example: "failed,pending". */
  status?: string;
  /** Values: payment, withdrawal, refund. */
  resource_type?: string;
  /** ISO 8601 timestamp. */
  created_gte?: string;
  /** ISO 8601 timestamp. */
  created_lte?: string;
  /**
   * Target-level scope:
   * - `"pending"` — reset pending+failed targets only
   * - `"failed"` — reset failed targets only
   * - omitted — reset all targets
   */
  scope?: 'pending' | 'failed';
}

export interface BulkResendResponse {
  status: string;
  updated: number;
}
