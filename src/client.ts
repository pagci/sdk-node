import type { CryptoProvider } from './crypto/CryptoProvider.js';
import { NodeCryptoProvider } from './crypto/NodeCryptoProvider.js';
import type { HttpClient } from './net/HttpClient.js';
import { NodeHttpClient } from './net/NodeHttpClient.js';
import { RequestSender } from './requestSender.js';
import { DEFAULT_RETRY_CONFIG } from './retry.js';
import { SignatureVerificationError } from './errors.js';

// ── Resource classes ─────────────────────────────────────────────────
import { PaymentsResource } from './resources/payments.js';
import { WithdrawalsResource } from './resources/withdrawals.js';
import { DebtsResource } from './resources/debts.js';
import { BalanceResource } from './resources/balance.js';
import { GiftsResource } from './resources/gifts.js';
import { WebhookEndpointsResource } from './resources/webhookEndpoints.js';
import { TokensResource } from './resources/tokens.js';

// ── Configuration ────────────────────────────────────────────────────

export interface PagciConfig {
  /** API base URL (default: 'https://api.pagci.com'). */
  baseUrl?: string;
  /** Maximum automatic retries on transient failures (default: 2). */
  maxRetries?: number;
  /** Default request timeout in ms (default: 30 000). */
  timeout?: number;
  /** Custom HTTP agent (e.g. for proxies or custom TLS). */
  httpAgent?: unknown;
}

// ── Webhook verified event (discriminated union by event type) ────────

import type { Payment } from './types/payment.js';
import type { Withdrawal } from './types/withdrawal.js';
import type { Balance } from './types/balance.js';

interface WebhookEventBase {
  /** HMAC signature that was verified. */
  signature: string;
  /** Unix timestamp from the webhook header. */
  timestamp: string;
  /** Per-wallet balances at time of event. */
  balances?: Record<string, Balance>;
  /** Account-level total balance. */
  account_balance?: Balance;
}

export interface PaymentPaidEvent extends WebhookEventBase {
  type: 'payment.paid';
  data: Payment;
}
export interface PaymentFailedEvent extends WebhookEventBase {
  type: 'payment.failed';
  data: Payment;
}
export interface PaymentCancelledEvent extends WebhookEventBase {
  type: 'payment.cancelled';
  data: Payment;
}
export interface PaymentExpiredEvent extends WebhookEventBase {
  type: 'payment.expired';
  data: Payment;
}
export interface PaymentDisputeEvent extends WebhookEventBase {
  type: 'payment.dispute.opened';
  data: Payment;
}
export interface WithdrawalSettledEvent extends WebhookEventBase {
  type: 'withdrawal.settled';
  data: Withdrawal;
}
export interface WithdrawalFailedEvent extends WebhookEventBase {
  type: 'withdrawal.failed';
  data: Withdrawal;
}
export interface RefundCompletedEvent extends WebhookEventBase {
  type: 'refund.completed';
  data: unknown;
}

/** Discriminated union of all webhook events. Switch on `event.type` for type narrowing. */
export type WebhookEvent =
  | PaymentPaidEvent
  | PaymentFailedEvent
  | PaymentCancelledEvent
  | PaymentExpiredEvent
  | PaymentDisputeEvent
  | WithdrawalSettledEvent
  | WithdrawalFailedEvent
  | RefundCompletedEvent;

// ── Client ───────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://api.pagci.com';
const DEFAULT_TIMEOUT = 30_000;

/**
 * Main entry point for the PAGCI Node.js SDK.
 *
 * ```ts
 * const pagci = new Pagci('sk_live_...');
 * const payment = await pagci.payments.create({ ... });
 * ```
 */
export class Pagci {
  private readonly _sender: RequestSender;
  private readonly _crypto: CryptoProvider;

  // ── Lazy resource singletons (Square / Fern pattern) ─────────────

  private _payments?: PaymentsResource;
  get payments(): PaymentsResource {
    return (this._payments ??= new PaymentsResource(this._sender));
  }

  private _gifts?: GiftsResource;
  get gifts(): GiftsResource {
    return (this._gifts ??= new GiftsResource(this._sender));
  }

  private _withdrawals?: WithdrawalsResource;
  get withdrawals(): WithdrawalsResource {
    return (this._withdrawals ??= new WithdrawalsResource(this._sender));
  }

  private _debts?: DebtsResource;
  get debts(): DebtsResource {
    return (this._debts ??= new DebtsResource(this._sender));
  }

  private _balance?: BalanceResource;
  get balance(): BalanceResource {
    return (this._balance ??= new BalanceResource(this._sender));
  }

  private _webhookEndpoints?: WebhookEndpointsResource;
  get webhookEndpoints(): WebhookEndpointsResource {
    return (this._webhookEndpoints ??= new WebhookEndpointsResource(
      this._sender,
    ));
  }

  private _tokens?: TokensResource;
  get tokens(): TokensResource {
    return (this._tokens ??= new TokensResource(this._sender));
  }

  // ── Webhook verification (utility, not a REST resource) ──────────

  get webhooks() {
    const crypto = this._crypto;

    return {
      /**
       * Verify webhook signature and return the parsed event (sync).
       *
       * @param rawBody  - The raw request body as a string.
       * @param signature - Value of the `X-Webhook-Signature` header.
       * @param secret   - Your webhook signing secret (`whsec_...`).
       * @param tolerance - Max age of the event in seconds (default 300 = 5 min).
       */
      constructEvent(
        rawBody: string,
        signature: string,
        secret: string,
        tolerance = 300,
      ): WebhookEvent {
        return verifyAndParse(crypto, rawBody, signature, secret, tolerance);
      },

      /**
       * Async variant of constructEvent (for future WebCrypto compat).
       */
      async constructEventAsync(
        rawBody: string,
        signature: string,
        secret: string,
        tolerance = 300,
      ): Promise<WebhookEvent> {
        // Parse header parts first (sync)
        const { timestamp, sig } = parseSignatureHeader(signature);

        // Verify age
        assertTimestampWithinTolerance(timestamp, tolerance);

        // Async HMAC
        const expectedSig = await crypto.computeHmacSha256Async(
          secret,
          `${timestamp}.${rawBody}`,
        );

        if (!crypto.timingSafeEqual(sig, expectedSig)) {
          throw new SignatureVerificationError(
            'Webhook signature verification failed',
          );
        }

        const envelope = JSON.parse(rawBody) as {
          event: string;
          data: unknown;
          balances?: Record<string, Balance>;
          account_balance?: Balance;
        };

        return {
          type: envelope.event,
          data: envelope.data,
          balances: envelope.balances,
          account_balance: envelope.account_balance,
          signature: sig,
          timestamp,
        } as WebhookEvent;
      },
    };
  }

  // ── Constructor ──────────────────────────────────────────────────

  constructor(apiKey: string, config?: PagciConfig) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error(
        'API key is required. Pass it as the first argument: new Pagci("sk_live_...")',
      );
    }

    const baseUrl = (config?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
    const maxRetries = config?.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries;

    const httpClient: HttpClient = new NodeHttpClient(
      config?.httpAgent as undefined,
    );
    this._crypto = new NodeCryptoProvider();

    this._sender = new RequestSender(
      apiKey,
      baseUrl,
      httpClient,
      { ...DEFAULT_RETRY_CONFIG, maxRetries },
      timeout,
    );
  }
}

// ── Webhook verification internals ───────────────────────────────────

/**
 * Expected header format: `t=<unix_timestamp>,v1=<hex_signature>`
 */
function parseSignatureHeader(header: string): {
  timestamp: string;
  sig: string;
} {
  const parts = header.split(',');
  let timestamp = '';
  let sig = '';

  for (const part of parts) {
    const [key, value] = part.split('=', 2);
    if (key === 't') timestamp = value ?? '';
    if (key === 'v1') sig = value ?? '';
  }

  if (!timestamp || !sig) {
    throw new SignatureVerificationError(
      'Invalid webhook signature header format. Expected "t=<timestamp>,v1=<signature>".',
    );
  }

  return { timestamp, sig };
}

function assertTimestampWithinTolerance(
  timestamp: string,
  toleranceSeconds: number,
): void {
  const ts = Number(timestamp);
  if (Number.isNaN(ts)) {
    throw new SignatureVerificationError(
      'Invalid timestamp in webhook signature header.',
    );
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (age > toleranceSeconds) {
    throw new SignatureVerificationError(
      `Webhook timestamp too old (${age}s > ${toleranceSeconds}s tolerance). ` +
        'This may indicate a replay attack.',
    );
  }
}

function verifyAndParse(
  crypto: CryptoProvider,
  rawBody: string,
  signatureHeader: string,
  secret: string,
  tolerance: number,
): WebhookEvent {
  const { timestamp, sig } = parseSignatureHeader(signatureHeader);

  assertTimestampWithinTolerance(timestamp, tolerance);

  const expectedSig = crypto.computeHmacSha256(
    secret,
    `${timestamp}.${rawBody}`,
  );

  if (!crypto.timingSafeEqual(sig, expectedSig)) {
    throw new SignatureVerificationError(
      'Webhook signature verification failed',
    );
  }

  const envelope = JSON.parse(rawBody) as {
    event: string;
    resource_type: string;
    data: unknown;
    balances?: Record<string, Balance>;
    account_balance?: Balance;
  };

  return {
    type: envelope.event,
    data: envelope.data,
    balances: envelope.balances,
    account_balance: envelope.account_balance,
    signature: sig,
    timestamp,
  } as WebhookEvent;
}
