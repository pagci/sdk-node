import { PaymentsResource } from './resources/payments.js';
import { WithdrawalsResource } from './resources/withdrawals.js';
import { DebtsResource } from './resources/debts.js';
import { BalanceResource } from './resources/balance.js';
import { WebhookEndpointsResource } from './resources/webhookEndpoints.js';
import { TokensResource } from './resources/tokens.js';
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
export interface WebhookEvent {
    /** Verified, parsed webhook payload. */
    payload: unknown;
    /** Signature header value. */
    signature: string;
    /** Timestamp from the webhook header. */
    timestamp: string;
}
/**
 * Main entry point for the PAGCI Node.js SDK.
 *
 * ```ts
 * const pagci = new Pagci('sk_live_...');
 * const payment = await pagci.payments.create({ ... });
 * ```
 */
export declare class Pagci {
    private readonly _sender;
    private readonly _crypto;
    private _payments?;
    get payments(): PaymentsResource;
    private _withdrawals?;
    get withdrawals(): WithdrawalsResource;
    private _debts?;
    get debts(): DebtsResource;
    private _balance?;
    get balance(): BalanceResource;
    private _webhookEndpoints?;
    get webhookEndpoints(): WebhookEndpointsResource;
    private _tokens?;
    get tokens(): TokensResource;
    get webhooks(): {
        /**
         * Verify webhook signature and return the parsed event (sync).
         *
         * @param rawBody  - The raw request body as a string.
         * @param signature - Value of the `X-Webhook-Signature` header.
         * @param secret   - Your webhook signing secret (`whsec_...`).
         * @param tolerance - Max age of the event in seconds (default 300 = 5 min).
         */
        constructEvent(rawBody: string, signature: string, secret: string, tolerance?: number): WebhookEvent;
        /**
         * Async variant of constructEvent (for future WebCrypto compat).
         */
        constructEventAsync(rawBody: string, signature: string, secret: string, tolerance?: number): Promise<WebhookEvent>;
    };
    constructor(apiKey: string, config?: PagciConfig);
}
//# sourceMappingURL=client.d.ts.map