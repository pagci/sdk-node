import { describe, it, expect, beforeEach } from 'vitest';
import { GiftsResource } from '../../src/resources/gifts.js';
import type { RequestSender } from '../../src/requestSender.js';
import type {
  CreateGiftParams,
  CreateGiftResponse,
  GetGiftResponse,
  GiftPreviewResponse,
  RegenerateGiftResponse,
  ResolveGiftResponse,
  RevokeGiftResponse,
} from '../../src/types/index.js';
import { ErrorCode } from '../../src/types/error.js';

// ── Mock RequestSender ────────────────────────────────────────────────

interface CapturedCall {
  method: string;
  path: string;
  body: unknown;
  options: unknown;
}

class MockRequestSender {
  calls: CapturedCall[] = [];
  fixtures: unknown[] = [];

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: unknown,
  ): Promise<T> {
    this.calls.push({ method, path, body, options });
    const next = this.fixtures.shift();
    return (next ?? {}) as T;
  }
}

function resource(mock: MockRequestSender): GiftsResource {
  return new GiftsResource(mock as unknown as RequestSender);
}

// ── gifts.create() ────────────────────────────────────────────────────

describe('GiftsResource.create', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('POSTs /payments/gift with body + auto-generated idempotency key', async () => {
    const gifts = resource(mock);
    const fixture: CreateGiftResponse = {
      payment_id: 'pay_01jx',
      status: 'pending',
      amount_cents: 10000,
      origin: 'gift_pix',
      gift_path: '/gift/aB3cD9eF2gH4iJ7k',
      expires_at: '2026-05-01T00:00:00.000Z',
      qr_code: '00020126...',
    };
    mock.fixtures.push(fixture);

    const resp = await gifts.create({
      amount_cents: 10000,
      method: 'pix',
      message: 'Parabéns!',
    });

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('POST');
    expect(mock.calls[0].path).toBe('/payments/gift');
    expect(mock.calls[0].body).toEqual({
      amount_cents: 10000,
      method: 'pix',
      message: 'Parabéns!',
    });
    // Auto-generated idempotency key — non-empty string starting with `idem_`.
    const opts = mock.calls[0].options as { idempotencyKey?: string };
    expect(opts.idempotencyKey).toMatch(/^idem_/);
    // Response is typed — access typed fields without cast.
    expect(resp.payment_id).toBe('pay_01jx');
    expect(resp.origin).toBe('gift_pix');
    expect(resp.qr_code).toBe('00020126...');
    // Phase 106 BREAKING — gift_path is the new shareable artifact.
    expect(resp.gift_path).toBe('/gift/aB3cD9eF2gH4iJ7k');
  });

  // ── Phase 106 BREAKING shape lock ─────────────────────────────────────
  it('Phase 106 — create() returns gift_path; access_token is absent', async () => {
    const gifts = resource(mock);
    const fixture: CreateGiftResponse = {
      payment_id: 'pay_01jz',
      status: 'pending',
      amount_cents: 25000,
      origin: 'gift_pix',
      gift_path: '/gift/zZ9yX8wV7uT6sR5q',
      expires_at: '2026-05-04T12:00:00.000Z',
      qr_code: '00020126...',
    };
    mock.fixtures.push(fixture);

    const resp = await gifts.create({ amount_cents: 25000, method: 'pix' });

    // Lock the new shape: gift_path present, access_token absent.
    expect(resp.gift_path).toBe('/gift/zZ9yX8wV7uT6sR5q');
    expect((resp as Record<string, unknown>).access_token).toBeUndefined();
    expect((resp as Record<string, unknown>).qr_code_image_url).toBeUndefined();
  });

  it('respects caller-provided idempotency key', async () => {
    const gifts = resource(mock);
    mock.fixtures.push({});

    await gifts.create(
      { amount_cents: 5000, method: 'internal_charge', funding_wallet_id: 'w1' },
      { idempotencyKey: 'idem_custom_42' },
    );

    const opts = mock.calls[0].options as { idempotencyKey?: string };
    expect(opts.idempotencyKey).toBe('idem_custom_42');
  });

  it('sends method=internal_charge with funding_wallet_id (no qr in response)', async () => {
    const gifts = resource(mock);
    const fixture: CreateGiftResponse = {
      payment_id: 'pay_01jy',
      status: 'pending',
      amount_cents: 2000,
      origin: 'gift_internal_charge',
      gift_path: '/gift/iC9hF8eG7dH6jI5k',
      expires_at: '2026-05-01T00:00:00.000Z',
    };
    mock.fixtures.push(fixture);

    const resp = await gifts.create({
      amount_cents: 2000,
      method: 'internal_charge',
      funding_wallet_id: 'w_creator',
    });

    expect(mock.calls[0].body).toEqual({
      amount_cents: 2000,
      method: 'internal_charge',
      funding_wallet_id: 'w_creator',
    });
    expect(resp.origin).toBe('gift_internal_charge');
    expect(resp.qr_code).toBeUndefined();
    // Phase 106 — gift_path emitted for both origins.
    expect(resp.gift_path).toBe('/gift/iC9hF8eG7dH6jI5k');
  });
});

// ── gifts.get() ───────────────────────────────────────────────────────

describe('GiftsResource.get', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('GETs /gift with no body and no path param', async () => {
    const gifts = resource(mock);
    const fixture: GetGiftResponse = {
      id: 'pay_01jx',
      amount_cents: 10000,
      withdrawable_amount_cents: 9550,
      status: 'claimable',
      message: 'Parabéns!',
      claimed_at: null,
      scheduled_at: null,
      expires_at: '2026-05-01T00:00:00.000Z',
    };
    mock.fixtures.push(fixture);

    const resp = await gifts.get();

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('GET');
    expect(mock.calls[0].path).toBe('/gift');
    expect(mock.calls[0].body).toBeUndefined();
    // `claimed_at: null` and `scheduled_at: null` round-trip intact.
    expect(resp.claimed_at).toBeNull();
    expect(resp.scheduled_at).toBeNull();
    expect(resp.status).toBe('claimable');
    // Phase 106 — withdrawable is the post-fee net (gross minus platform fee).
    expect(resp.withdrawable_amount_cents).toBe(9550);
    expect(resp.amount_cents).toBe(10000);
  });

  it('handles claimed_at set when the gift has been redeemed', async () => {
    const gifts = resource(mock);
    const fixture: GetGiftResponse = {
      id: 'pay_01jx',
      amount_cents: 10000,
      withdrawable_amount_cents: 9550,
      status: 'claimed',
      message: '',
      claimed_at: '2026-04-24T18:00:00.000Z',
      scheduled_at: null,
      expires_at: '2026-05-01T00:00:00.000Z',
    };
    mock.fixtures.push(fixture);

    const resp = await gifts.get();

    expect(resp.status).toBe('claimed');
    expect(resp.claimed_at).toBe('2026-04-24T18:00:00.000Z');
  });
});

// ── gifts.regenerateLink() ────────────────────────────────────────────

describe('GiftsResource.regenerateLink', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('POSTs /payments/gift/:id/regenerate-link with link_expires_in_seconds body', async () => {
    const gifts = resource(mock);
    const fixture: RegenerateGiftResponse = {
      gift_path: '/gift/xY9wV2qZ8mN3oP1l',
      expires_at: '2026-05-01T00:00:00.000Z',
      regenerated_at: '2026-04-24T18:00:00.000Z',
    };
    mock.fixtures.push(fixture);

    const resp = await gifts.regenerateLink('pay_01jx', {
      link_expires_in_seconds: 3600,
    });

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('POST');
    expect(mock.calls[0].path).toBe('/payments/gift/pay_01jx/regenerate-link');
    expect(mock.calls[0].body).toEqual({ link_expires_in_seconds: 3600 });
    expect(resp.gift_path).toBe('/gift/xY9wV2qZ8mN3oP1l');
    expect(resp.regenerated_at).toBe('2026-04-24T18:00:00.000Z');
  });

  // ── Phase 106 BREAKING shape lock ─────────────────────────────────────
  it('Phase 106 — regenerateLink() returns gift_path; access_token is absent', async () => {
    const gifts = resource(mock);
    const fixture: RegenerateGiftResponse = {
      gift_path: '/gift/qR8sT9uV0wX1yZ2a',
      expires_at: '2026-05-08T00:00:00.000Z',
      regenerated_at: '2026-04-27T18:00:00.000Z',
    };
    mock.fixtures.push(fixture);

    const resp = await gifts.regenerateLink('pay_01jx');

    expect(resp.gift_path).toBe('/gift/qR8sT9uV0wX1yZ2a');
    // Lock the new shape — access_token is structurally gone.
    expect((resp as Record<string, unknown>).access_token).toBeUndefined();
  });

  it('sends empty-object body when no params are provided (server default-path)', async () => {
    const gifts = resource(mock);
    mock.fixtures.push({});

    await gifts.regenerateLink('pay_01jx');

    expect(mock.calls[0].body).toEqual({});
  });

  it('url-encodes the payment ID path segment', async () => {
    const gifts = resource(mock);
    mock.fixtures.push({});

    await gifts.regenerateLink('pay/01 jx%');

    // The path contains the encoded ID, never the raw one.
    expect(mock.calls[0].path).toBe(
      '/payments/gift/pay%2F01%20jx%25/regenerate-link',
    );
  });
});

// ── gifts.revoke() ────────────────────────────────────────────────────

describe('GiftsResource.revoke', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('POSTs /payments/gift/:id/revoke with no body', async () => {
    const gifts = resource(mock);
    const fixture: RevokeGiftResponse = {
      revoked_at: '2026-04-24T18:00:00.000Z',
      revoked_count: 1,
    };
    mock.fixtures.push(fixture);

    const resp = await gifts.revoke('pay_01jx');

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('POST');
    expect(mock.calls[0].path).toBe('/payments/gift/pay_01jx/revoke');
    expect(mock.calls[0].body).toBeUndefined();
    expect(resp.revoked_count).toBe(1);
  });

  it('surfaces idempotent replay (revoked_count=0) without throwing', async () => {
    const gifts = resource(mock);
    mock.fixtures.push({ revoked_at: '2026-04-24T18:00:01.000Z', revoked_count: 0 });

    const resp = await gifts.revoke('pay_01jx');

    expect(resp.revoked_count).toBe(0);
  });

  it('url-encodes the payment ID path segment', async () => {
    const gifts = resource(mock);
    mock.fixtures.push({});

    await gifts.revoke('pay+01jx?query');

    expect(mock.calls[0].path).toBe('/payments/gift/pay%2B01jx%3Fquery/revoke');
  });
});

// ── gifts.preview() ───────────────────────────────────────────────────

describe('GiftsResource.preview', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('POSTs /gift/preview with body and no auto-idempotency', async () => {
    const gifts = resource(mock);
    const fixture: GiftPreviewResponse = {
      input: {
        amount_cents: 10000,
        method: 'pix',
        pass_fees_to_payer: true,
      },
      fees: { payment_cents: 510, withdrawal_cents: 200 },
      totals: { pix_total_cents: 10710, bearer_receives_cents: 10000 },
    };
    mock.fixtures.push(fixture);

    const resp = await gifts.preview({
      amount_cents: 10000,
      method: 'pix',
      pass_fees_to_payer: true,
    });

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('POST');
    expect(mock.calls[0].path).toBe('/gift/preview');
    expect(mock.calls[0].body).toEqual({
      amount_cents: 10000,
      method: 'pix',
      pass_fees_to_payer: true,
    });
    // Preview is read-only — no auto-injected idempotency key (unlike create).
    const opts = mock.calls[0].options as { idempotencyKey?: string } | undefined;
    expect(opts?.idempotencyKey).toBeUndefined();
    // Typed response — math echoed correctly.
    expect(resp.totals.bearer_receives_cents).toBe(10000);
    expect(resp.fees.payment_cents).toBe(510);
    expect(resp.fees.withdrawal_cents).toBe(200);
    expect(resp.totals.pix_total_cents).toBe(10710);
    expect(resp.input.pass_fees_to_payer).toBe(true);
  });

  it('preview omits pass_fees_to_payer when not provided (server defaults true)', async () => {
    const gifts = resource(mock);
    mock.fixtures.push({});

    await gifts.preview({ amount_cents: 10000, method: 'pix' });

    const body = mock.calls[0].body as Record<string, unknown>;
    expect(body.amount_cents).toBe(10000);
    expect(body.method).toBe('pix');
    // The flag is intentionally omitted from the wire body — server applies its default-true.
    expect('pass_fees_to_payer' in body).toBe(false);
  });

  it('preview supports internal_charge with degenerate response (silent force-false)', async () => {
    const gifts = resource(mock);
    const fixture: GiftPreviewResponse = {
      input: {
        amount_cents: 10000,
        method: 'internal_charge',
        // Server reflects the silent force-false in the echoed input — even
        // if the client sent pass_fees_to_payer=true.
        pass_fees_to_payer: false,
      },
      fees: { payment_cents: 0, withdrawal_cents: 0 },
      totals: { pix_total_cents: 10000, bearer_receives_cents: 10000 },
    };
    mock.fixtures.push(fixture);

    const resp = await gifts.preview({
      amount_cents: 10000,
      method: 'internal_charge',
      pass_fees_to_payer: true,
    });

    // Both fees zero by design — internal_charge is fee-exempt.
    expect(resp.fees.payment_cents).toBe(0);
    expect(resp.fees.withdrawal_cents).toBe(0);
    // Bearer receives = amount; PIX total = amount (no inflation).
    expect(resp.totals.bearer_receives_cents).toBe(10000);
    expect(resp.totals.pix_total_cents).toBe(10000);
    // The echoed input reflects the silent force-false the server applied.
    expect(resp.input.pass_fees_to_payer).toBe(false);
  });

  it('preview returns aggregate without leaking wallet_id, origin, or recipients (D-94-13 NO-LEAK)', async () => {
    const gifts = resource(mock);
    const fixture: GiftPreviewResponse = {
      input: {
        amount_cents: 10000,
        method: 'pix',
        pass_fees_to_payer: true,
      },
      fees: { payment_cents: 510, withdrawal_cents: 200 },
      totals: { pix_total_cents: 10710, bearer_receives_cents: 10000 },
    };
    mock.fixtures.push(fixture);

    const resp = await gifts.preview({
      amount_cents: 10000,
      method: 'pix',
      wallet_id: 'wallet-leak-canary',
    });

    // Substring scan: the response JSON must not contain any of the
    // forbidden keys. The TS type literally cannot represent these fields,
    // but a runtime substring check guards against future refactors that
    // would surface them via accidental spread or type widening.
    const serialized = JSON.stringify(resp);
    expect(serialized).not.toContain('wallet_id');
    expect(serialized).not.toContain('origin');
    expect(serialized).not.toContain('recipients');
    expect(serialized).not.toContain('whitelabel');
    expect(serialized).not.toContain('affiliate');
    expect(serialized).not.toContain('withdrawal_fee_allocations');
    // The leak-canary wallet ID we sent on the REQUEST never round-trips
    // through the response — confirms the server's NO-LEAK contract.
    expect(serialized).not.toContain('wallet-leak-canary');
  });

  it('create accepts pass_fees_to_payer optional field type-safely', async () => {
    const gifts = resource(mock);
    mock.fixtures.push({});

    // Compile-time test: the CreateGiftParams type must accept the new
    // optional flag in all three states (omitted, explicit true, explicit
    // false). If the type does not accept it, the build fails before this
    // assertion runs.
    const explicitFalse: CreateGiftParams = {
      amount_cents: 5000,
      method: 'pix',
      pass_fees_to_payer: false,
    };
    const explicitTrue: CreateGiftParams = {
      amount_cents: 5000,
      method: 'pix',
      pass_fees_to_payer: true,
    };
    const omitted: CreateGiftParams = {
      amount_cents: 5000,
      method: 'pix',
    };

    await gifts.create(explicitFalse);
    expect((mock.calls[0].body as CreateGiftParams).pass_fees_to_payer).toBe(false);

    // Sanity: the other two shapes are accepted by the create() signature
    // without TypeScript errors. Use them at runtime so the linter does
    // not flag them as unused.
    expect(explicitTrue.pass_fees_to_payer).toBe(true);
    expect(omitted.pass_fees_to_payer).toBeUndefined();
  });
});

// ── gifts.resolve() — Phase 106 ───────────────────────────────────────

describe('GiftsResource.resolve', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('POSTs /gift/resolve with code body and returns the JWT', async () => {
    const gifts = resource(mock);
    const fixture: ResolveGiftResponse = {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
      expires_at: '2026-04-27T18:30:00.000Z',
    };
    mock.fixtures.push(fixture);

    const resp = await gifts.resolve({ code: 'aB3cD9eF2gH4iJ7k' });

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('POST');
    expect(mock.calls[0].path).toBe('/gift/resolve');
    // Body is `{code}` — code must be in the BODY, never the URL/path/query.
    expect(mock.calls[0].body).toEqual({ code: 'aB3cD9eF2gH4iJ7k' });
    expect(resp.access_token).toBe(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
    );
    expect(resp.expires_at).toBe('2026-04-27T18:30:00.000Z');
  });

  it('does NOT auto-inject an idempotency key (unlike create)', async () => {
    const gifts = resource(mock);
    mock.fixtures.push({
      access_token: 'jwt.x',
      expires_at: '2026-04-27T18:30:00.000Z',
    });

    await gifts.resolve({ code: '0123456789abcdef' });

    // No options → no auto-injection. Resolve mints fresh credentials by
    // design; an Idempotency-Key would mask the intent.
    const opts = mock.calls[0].options as
      | { idempotencyKey?: string }
      | undefined;
    expect(opts?.idempotencyKey).toBeUndefined();
  });

  it('does not place the code in the URL path or query string', async () => {
    const gifts = resource(mock);
    mock.fixtures.push({
      access_token: 'jwt.x',
      expires_at: '2026-04-27T18:30:00.000Z',
    });

    await gifts.resolve({ code: 'SECRET_CODE_HERE' });

    // Anti-leak: the path is fixed; the code only travels in the body.
    expect(mock.calls[0].path).toBe('/gift/resolve');
    expect(mock.calls[0].path).not.toContain('SECRET_CODE_HERE');
  });

  it('surfaces the 404 anti-enumeration error code through the SDK', async () => {
    // The SDK's RequestSender translates non-2xx responses into thrown
    // PagciError instances populated with the server's error code. Here
    // we simulate that path: when the mock sender throws a structured
    // error, the resolve() promise rejects with the same payload, and
    // the consuming code can inspect `err.code === ErrorCode.GiftCodeNotFound`.
    class ThrowingSender extends MockRequestSender {
      async request<T>(
        method: string,
        path: string,
        body?: unknown,
        options?: unknown,
      ): Promise<T> {
        this.calls.push({ method, path, body, options });
        // Mimic the runtime: an Error subclass with a .code property
        // matching the server's anti-enum sentinel.
        const err = Object.assign(
          new Error('Code not found or expired'),
          { code: ErrorCode.GiftCodeNotFound, status: 404 },
        );
        throw err;
      }
    }
    const sender = new ThrowingSender();
    const gifts = new GiftsResource(sender as unknown as RequestSender);

    await expect(
      gifts.resolve({ code: 'expired_or_unknown' }),
    ).rejects.toMatchObject({
      code: ErrorCode.GiftCodeNotFound,
      status: 404,
    });

    // The request was issued exactly once before the rejection — no
    // implicit retry on 404.
    expect(sender.calls).toHaveLength(1);
  });

  it('ErrorCode.GiftCodeNotFound has the expected wire value', () => {
    // Lock the wire value of the new enum entry so a downstream
    // `if (err.code === 'gift_code_not_found')` keeps working across
    // versions of the SDK.
    expect(ErrorCode.GiftCodeNotFound).toBe('gift_code_not_found');
  });
});
