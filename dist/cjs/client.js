"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pagci = void 0;
const NodeCryptoProvider_js_1 = require("./crypto/NodeCryptoProvider.js");
const NodeHttpClient_js_1 = require("./net/NodeHttpClient.js");
const requestSender_js_1 = require("./requestSender.js");
const retry_js_1 = require("./retry.js");
const errors_js_1 = require("./errors.js");
// ── Resource classes ─────────────────────────────────────────────────
const payments_js_1 = require("./resources/payments.js");
const withdrawals_js_1 = require("./resources/withdrawals.js");
const debts_js_1 = require("./resources/debts.js");
const balance_js_1 = require("./resources/balance.js");
const webhookEndpoints_js_1 = require("./resources/webhookEndpoints.js");
const tokens_js_1 = require("./resources/tokens.js");
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
class Pagci {
    _sender;
    _crypto;
    // ── Lazy resource singletons (Square / Fern pattern) ─────────────
    _payments;
    get payments() {
        return (this._payments ??= new payments_js_1.PaymentsResource(this._sender));
    }
    _withdrawals;
    get withdrawals() {
        return (this._withdrawals ??= new withdrawals_js_1.WithdrawalsResource(this._sender));
    }
    _debts;
    get debts() {
        return (this._debts ??= new debts_js_1.DebtsResource(this._sender));
    }
    _balance;
    get balance() {
        return (this._balance ??= new balance_js_1.BalanceResource(this._sender));
    }
    _webhookEndpoints;
    get webhookEndpoints() {
        return (this._webhookEndpoints ??= new webhookEndpoints_js_1.WebhookEndpointsResource(this._sender));
    }
    _tokens;
    get tokens() {
        return (this._tokens ??= new tokens_js_1.TokensResource(this._sender));
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
                    throw new errors_js_1.SignatureVerificationError('Webhook signature verification failed');
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
        const maxRetries = config?.maxRetries ?? retry_js_1.DEFAULT_RETRY_CONFIG.maxRetries;
        const httpClient = new NodeHttpClient_js_1.NodeHttpClient(config?.httpAgent);
        this._crypto = new NodeCryptoProvider_js_1.NodeCryptoProvider();
        this._sender = new requestSender_js_1.RequestSender(apiKey, baseUrl, httpClient, { ...retry_js_1.DEFAULT_RETRY_CONFIG, maxRetries }, timeout);
    }
}
exports.Pagci = Pagci;
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
        throw new errors_js_1.SignatureVerificationError('Invalid webhook signature header format. Expected "t=<timestamp>,v1=<signature>".');
    }
    return { timestamp, sig };
}
function assertTimestampWithinTolerance(timestamp, toleranceSeconds) {
    const ts = Number(timestamp);
    if (Number.isNaN(ts)) {
        throw new errors_js_1.SignatureVerificationError('Invalid timestamp in webhook signature header.');
    }
    const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
    if (age > toleranceSeconds) {
        throw new errors_js_1.SignatureVerificationError(`Webhook timestamp too old (${age}s > ${toleranceSeconds}s tolerance). ` +
            'This may indicate a replay attack.');
    }
}
function verifyAndParse(crypto, rawBody, signatureHeader, secret, tolerance) {
    const { timestamp, sig } = parseSignatureHeader(signatureHeader);
    assertTimestampWithinTolerance(timestamp, tolerance);
    const expectedSig = crypto.computeHmacSha256(secret, `${timestamp}.${rawBody}`);
    if (!crypto.timingSafeEqual(sig, expectedSig)) {
        throw new errors_js_1.SignatureVerificationError('Webhook signature verification failed');
    }
    return {
        payload: JSON.parse(rawBody),
        signature: sig,
        timestamp,
    };
}
//# sourceMappingURL=client.js.map