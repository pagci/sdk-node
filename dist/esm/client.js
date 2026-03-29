import { NodeCryptoProvider } from './crypto/NodeCryptoProvider.js';
import { NodeHttpClient } from './net/NodeHttpClient.js';
import { RequestSender } from './requestSender.js';
import { DEFAULT_RETRY_CONFIG } from './retry.js';
import { SignatureVerificationError } from './errors.js';
// ── Resource classes ─────────────────────────────────────────────────
import { PaymentsResource } from './resources/payments.js';
import { WithdrawalsResource } from './resources/withdrawals.js';
import { DebtsResource } from './resources/debts.js';
import { BalanceResource } from './resources/balance.js';
import { WebhookEndpointsResource } from './resources/webhookEndpoints.js';
import { TokensResource } from './resources/tokens.js';
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
    _sender;
    _crypto;
    // ── Lazy resource singletons (Square / Fern pattern) ─────────────
    _payments;
    get payments() {
        return (this._payments ??= new PaymentsResource(this._sender));
    }
    _withdrawals;
    get withdrawals() {
        return (this._withdrawals ??= new WithdrawalsResource(this._sender));
    }
    _debts;
    get debts() {
        return (this._debts ??= new DebtsResource(this._sender));
    }
    _balance;
    get balance() {
        return (this._balance ??= new BalanceResource(this._sender));
    }
    _webhookEndpoints;
    get webhookEndpoints() {
        return (this._webhookEndpoints ??= new WebhookEndpointsResource(this._sender));
    }
    _tokens;
    get tokens() {
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
            constructEvent(rawBody, signature, secret, tolerance = 300) {
                return verifyAndParse(crypto, rawBody, signature, secret, tolerance);
            },
            /**
             * Async variant of constructEvent (for future WebCrypto compat).
             */
            async constructEventAsync(rawBody, signature, secret, tolerance = 300) {
                // Parse header parts first (sync)
                const { timestamp, sig } = parseSignatureHeader(signature);
                // Verify age
                assertTimestampWithinTolerance(timestamp, tolerance);
                // Async HMAC
                const expectedSig = await crypto.computeHmacSha256Async(secret, `${timestamp}.${rawBody}`);
                if (!crypto.timingSafeEqual(sig, expectedSig)) {
                    throw new SignatureVerificationError('Webhook signature verification failed');
                }
                return {
                    payload: JSON.parse(rawBody),
                    signature: sig,
                    timestamp,
                };
            },
        };
    }
    // ── Constructor ──────────────────────────────────────────────────
    constructor(apiKey, config) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('API key is required. Pass it as the first argument: new Pagci("sk_live_...")');
        }
        const baseUrl = (config?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
        const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
        const maxRetries = config?.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries;
        const httpClient = new NodeHttpClient(config?.httpAgent);
        this._crypto = new NodeCryptoProvider();
        this._sender = new RequestSender(apiKey, baseUrl, httpClient, { ...DEFAULT_RETRY_CONFIG, maxRetries }, timeout);
    }
}
// ── Webhook verification internals ───────────────────────────────────
/**
 * Expected header format: `t=<unix_timestamp>,v1=<hex_signature>`
 */
function parseSignatureHeader(header) {
    const parts = header.split(',');
    let timestamp = '';
    let sig = '';
    for (const part of parts) {
        const [key, value] = part.split('=', 2);
        if (key === 't')
            timestamp = value ?? '';
        if (key === 'v1')
            sig = value ?? '';
    }
    if (!timestamp || !sig) {
        throw new SignatureVerificationError('Invalid webhook signature header format. Expected "t=<timestamp>,v1=<signature>".');
    }
    return { timestamp, sig };
}
function assertTimestampWithinTolerance(timestamp, toleranceSeconds) {
    const ts = Number(timestamp);
    if (Number.isNaN(ts)) {
        throw new SignatureVerificationError('Invalid timestamp in webhook signature header.');
    }
    const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
    if (age > toleranceSeconds) {
        throw new SignatureVerificationError(`Webhook timestamp too old (${age}s > ${toleranceSeconds}s tolerance). ` +
            'This may indicate a replay attack.');
    }
}
function verifyAndParse(crypto, rawBody, signatureHeader, secret, tolerance) {
    const { timestamp, sig } = parseSignatureHeader(signatureHeader);
    assertTimestampWithinTolerance(timestamp, tolerance);
    const expectedSig = crypto.computeHmacSha256(secret, `${timestamp}.${rawBody}`);
    if (!crypto.timingSafeEqual(sig, expectedSig)) {
        throw new SignatureVerificationError('Webhook signature verification failed');
    }
    return {
        payload: JSON.parse(rawBody),
        signature: sig,
        timestamp,
    };
}
//# sourceMappingURL=client.js.map