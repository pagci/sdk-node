import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { Pagci } from '../src/client.js';
import { SignatureVerificationError } from '../src/errors.js';

// ── Helpers ──────────────────────────────────────────────────────────

/** Replicate Go's SignWebhookPayload: HMAC-SHA256 of "{ts}.{payload}" */
function signLikeGo(
  payload: string,
  secret: string,
  ts: number,
): string {
  const mac = createHmac('sha256', secret);
  mac.update(`${ts}.${payload}`);
  return `t=${ts},v1=${mac.digest('hex')}`;
}

function computeExpectedHex(
  payload: string,
  secret: string,
  ts: number,
): string {
  return createHmac('sha256', secret)
    .update(`${ts}.${payload}`)
    .digest('hex');
}

// ── Test suite ───────────────────────────────────────────────────────

describe('Webhook signature verification', () => {
  const secret = 'whsec_test_secret_key_1234';
  const rawBody = '{"event":"payment.confirmed","data":{"id":"pay_123"}}';
  // Use a fixed timestamp close to "now" so tolerance check passes
  const nowSeconds = Math.floor(Date.now() / 1000);

  const client = new Pagci('sk_test_dummy_key');

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Known vector (matches Go implementation exactly) ────────────

  it('known vector: HMAC-SHA256 of "{ts}.{payload}" matches Go output', () => {
    const ts = 1700000000;
    const payload = '{"hello":"world"}';
    const key = 'mysecret';

    const expected = computeExpectedHex(payload, key, ts);

    // Manually compute what Go does:
    //   mac := hmac.New(sha256.New, []byte("mysecret"))
    //   fmt.Fprintf(mac, "%d.", ts)   → writes "1700000000."
    //   mac.Write([]byte(payload))    → writes '{"hello":"world"}'
    //   hex.EncodeToString(mac.Sum(nil))
    const goMac = createHmac('sha256', key);
    goMac.update('1700000000.');
    goMac.update(payload);
    const goHex = goMac.digest('hex');

    expect(expected).toBe(goHex);
  });

  // ── constructEvent: valid signature ─────────────────────────────

  it('constructEvent succeeds with valid signature', () => {
    const header = signLikeGo(rawBody, secret, nowSeconds);

    const event = client.webhooks.constructEvent(rawBody, header, secret);

    expect(event.type).toBe('payment.confirmed');
    expect(event.data).toEqual({ id: 'pay_123' });
    expect(event.timestamp).toBe(String(nowSeconds));
    expect(event.signature).toBe(computeExpectedHex(rawBody, secret, nowSeconds));
  });

  // ── constructEvent: wrong signature ─────────────────────────────

  it('constructEvent throws SignatureVerificationError on wrong signature', () => {
    const header = `t=${nowSeconds},v1=deadbeefdeadbeefdeadbeefdeadbeef`;

    expect(() =>
      client.webhooks.constructEvent(rawBody, header, secret),
    ).toThrow(SignatureVerificationError);
  });

  // ── constructEvent: wrong secret ────────────────────────────────

  it('constructEvent throws when signed with different secret', () => {
    const header = signLikeGo(rawBody, 'wrong_secret', nowSeconds);

    expect(() =>
      client.webhooks.constructEvent(rawBody, header, secret),
    ).toThrow(SignatureVerificationError);
  });

  // ── constructEvent: expired timestamp ───────────────────────────

  it('constructEvent throws on expired timestamp', () => {
    const oldTs = nowSeconds - 600; // 10 minutes ago, default tolerance is 300s
    const header = signLikeGo(rawBody, secret, oldTs);

    expect(() =>
      client.webhooks.constructEvent(rawBody, header, secret),
    ).toThrow(SignatureVerificationError);
  });

  // ── constructEvent: timestamp within tolerance ──────────────────

  it('constructEvent accepts timestamp within tolerance', () => {
    const recentTs = nowSeconds - 100; // 100s ago, well within 300s default
    const header = signLikeGo(rawBody, secret, recentTs);

    const event = client.webhooks.constructEvent(rawBody, header, secret);
    expect(event.type).toBe('payment.confirmed');
    expect(event.data).toEqual({ id: 'pay_123' });
  });

  // ── constructEvent: custom tolerance ────────────────────────────

  it('constructEvent respects custom tolerance', () => {
    const ts = nowSeconds - 10; // 10s ago
    const header = signLikeGo(rawBody, secret, ts);

    // With 5s tolerance, 10s old should fail
    expect(() =>
      client.webhooks.constructEvent(rawBody, header, secret, 5),
    ).toThrow(SignatureVerificationError);

    // With 20s tolerance, 10s old should succeed
    const event = client.webhooks.constructEvent(rawBody, header, secret, 20);
    expect(event.type).toBe('payment.confirmed');
    expect(event.data).toEqual({ id: 'pay_123' });
  });

  // ── constructEvent: malformed header ────────────────────────────

  it('constructEvent throws on malformed signature header', () => {
    expect(() =>
      client.webhooks.constructEvent(rawBody, 'garbage', secret),
    ).toThrow(SignatureVerificationError);
  });

  it('constructEvent throws on header missing v1', () => {
    expect(() =>
      client.webhooks.constructEvent(rawBody, `t=${nowSeconds}`, secret),
    ).toThrow(SignatureVerificationError);
  });

  it('constructEvent throws on header missing timestamp', () => {
    expect(() =>
      client.webhooks.constructEvent(rawBody, 'v1=abc123', secret),
    ).toThrow(SignatureVerificationError);
  });

  // ── constructEventAsync produces same result ────────────────────

  it('constructEventAsync produces same result as constructEvent', async () => {
    const header = signLikeGo(rawBody, secret, nowSeconds);

    const syncResult = client.webhooks.constructEvent(rawBody, header, secret);
    const asyncResult = await client.webhooks.constructEventAsync(
      rawBody,
      header,
      secret,
    );

    expect(asyncResult.payload).toEqual(syncResult.payload);
    expect(asyncResult.signature).toBe(syncResult.signature);
    expect(asyncResult.timestamp).toBe(syncResult.timestamp);
  });

  // ── constructEventAsync also rejects invalid ────────────────────

  it('constructEventAsync rejects with wrong signature', async () => {
    const header = `t=${nowSeconds},v1=0000000000000000000000000000000000000000000000000000000000000000`;

    await expect(
      client.webhooks.constructEventAsync(rawBody, header, secret),
    ).rejects.toThrow(SignatureVerificationError);
  });

  it('constructEventAsync rejects expired timestamp', async () => {
    const oldTs = nowSeconds - 600;
    const header = signLikeGo(rawBody, secret, oldTs);

    await expect(
      client.webhooks.constructEventAsync(rawBody, header, secret),
    ).rejects.toThrow(SignatureVerificationError);
  });
});
