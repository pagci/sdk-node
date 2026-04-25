// ── Webhook types ───────────────────────────────────────────────────
// Source: cmd/specgen/types.go (WebhookEnvelope, WebhookEndpoint, etc.)

import type { Payment } from './payment.js';
import type { Withdrawal } from './withdrawal.js';
import type { Balance } from './balance.js';
import type { ListMeta } from './common.js';

// ── Webhook events ──────────────────────────────────────────────────

export enum WebhookEventType {
  /**
   * Emitted when a payment reaches the "paid" status.
   * Follows the payment.{status} pattern aligned with response.status emission.
   */
  PaymentPaid = 'payment.paid',
  PaymentFailed = 'payment.failed',
  PaymentCancelled = 'payment.cancelled',
  PaymentExpired = 'payment.expired',
  PaymentDispute = 'payment.dispute',
  WithdrawalSettled = 'withdrawal.settled',
  WithdrawalFailed = 'withdrawal.failed',
  RefundCompleted = 'refund.completed',
}

// ── Webhook envelope (discriminated union on resource_type) ─────────

export type WebhookEnvelope =
  | {
      event: string;
      resource_type: 'payment';
      data: Payment;
      balances?: Record<string, Balance>;
      account_balance?: Balance;
    }
  | {
      event: string;
      resource_type: 'withdrawal';
      data: Withdrawal;
      balances?: Record<string, Balance>;
      account_balance?: Balance;
    }
  | {
      event: string;
      resource_type: 'refund';
      data: unknown;
      balances?: Record<string, Balance>;
      account_balance?: Balance;
    };

// ── Webhook endpoint management ─────────────────────────────────────

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  host: string;
  host_status: string;
  /** Whether the endpoint is currently receiving webhook deliveries. Paused endpoints (active=false) are skipped at fanout time without being deleted. */
  active: boolean;
}

export interface WebhookEndpointsListResponse {
  endpoints: WebhookEndpoint[];
  valid_events: string[];
}

/**
 * Response shape of `PUT /hooks/endpoints` (replace-all). Does NOT include
 * `valid_events` — use `listEvents()` for the catalog.
 */
export interface ReplaceWebhookEndpointsResponse {
  endpoints: WebhookEndpoint[];
}

/**
 * Single-endpoint shape used inside the replace-all `PUT /hooks/endpoints`
 * request body. URL is verified via challenge-response before registration
 * completes.
 */
export interface WebhookEndpointInput {
  url: string;
  events: string[];
}

/** Payload for `PUT /hooks/endpoints` — replace the entire set. */
export interface ReplaceWebhookEndpointsParams {
  endpoints: WebhookEndpointInput[];
}

/** Payload for `POST /hooks/endpoints` — append a single endpoint atomically. */
export interface AddWebhookEndpointParams {
  url: string;
  events: string[];
}

/** Response of `POST /hooks/endpoints` — the single endpoint that was added. */
export type AddWebhookEndpointResponse = WebhookEndpoint;

/**
 * Deprecated aliases retained for one release so existing imports keep
 * compiling while consumers migrate to ReplaceWebhookEndpoints* names.
 *
 * @deprecated Use ReplaceWebhookEndpointsParams.
 */
export type RegisterWebhooksParams = ReplaceWebhookEndpointsParams;
/** @deprecated Use ReplaceWebhookEndpointsResponse. */
export type RegisterWebhooksResponse = ReplaceWebhookEndpointsResponse;

/**
 * Partial-update payload for `PUT /hooks/endpoints/{id}`. Send only the
 * fields you want to change — omitted fields are preserved. At least one of
 * `url`, `events`, or `active` must be provided.
 */
export interface UpdateWebhookEndpointParams {
  /** New delivery URL. Triggers challenge-response verification when changed. */
  url?: string;
  /** Replacement event subscription list. */
  events?: string[];
  /** Pause (false) or resume (true) delivery without deleting the endpoint. */
  active?: boolean;
}

// ── Webhook events catalog ──────────────────────────────────────────

export interface WebhookEventInfo {
  event: string;
  description: string;
  resource_type: string;
}

export interface WebhookWildcardInfo {
  pattern: string;
  description: string;
}

export interface WebhookEventsCatalogResponse {
  events: WebhookEventInfo[];
  wildcards: WebhookWildcardInfo[];
}

// ── Webhook delivery ────────────────────────────────────────────────

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

// ── Webhook test ────────────────────────────────────────────────────

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

// ── Webhook delivery list query params ──────────────────────────────

export interface WebhookDeliveryListParams {
  cursor?: string;
  prev_cursor?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  /** Filter by delivery status. Comma-separated list. Values: pending, processing, delivered, failed, removed, skipped. Example: "failed,pending". */
  status?: string;
  resource_type?: string;
  target_status?: string;
  event?: string;
  /** Start date (ISO 8601). */
  created_gte?: string;
  /** End date (ISO 8601). */
  created_lte?: string;
  wallet_id?: string;
}
