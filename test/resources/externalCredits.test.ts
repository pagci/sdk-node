import { describe, it, expect, beforeEach } from 'vitest';
import { ExternalCreditsResource } from '../../src/resources/externalCredits.js';
import type { RequestSender } from '../../src/requestSender.js';
import type {
  ExternalCredit,
  ExternalCreditListResponse,
} from '../../src/types/index.js';

// ── Mock RequestSender ────────────────────────────────────────────────
//
// Mirrors the pattern from splitGrants.test.ts.

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

function resource(mock: MockRequestSender): ExternalCreditsResource {
  return new ExternalCreditsResource(mock as unknown as RequestSender);
}

// Helper to build an ExternalCredit fixture with sensible defaults.
function mkCredit(overrides: Partial<ExternalCredit> = {}): ExternalCredit {
  return {
    payment_id: 'pay_01jxyz',
    amount_received: 15000,
    grant_id: 'sg_01jq',
    payer_owner_masked: 'pyr_3a4b5c6d7e8f',
    payer_origin: 'pix',
    confirmed_at: '2026-04-27T12:00:00Z',
    status: 'paid',
    wallet_id: 'wlt_01jxyz_main',
    ...overrides,
  };
}

// ── externalCredits.list() ────────────────────────────────────────────

describe('ExternalCreditsResource.list', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('issues GET /external-credits without query when no params', async () => {
    const ec = resource(mock);
    mock.fixtures.push({ data: [], meta: { per_page: 50 } });

    const page = ec.list();
    const data = await page.getData();

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('GET');
    expect(mock.calls[0].path).toBe('/external-credits');
    expect(mock.calls[0].body).toBeUndefined();
    expect(data).toEqual([]);
    expect(page.meta.per_page).toBe(50);
  });

  it('issues GET /external-credits?limit=N when limit param provided', async () => {
    const ec = resource(mock);
    const fixture: ExternalCreditListResponse = {
      data: [mkCredit({ payment_id: 'pay_a' }), mkCredit({ payment_id: 'pay_b' })],
      meta: { per_page: 25, next_cursor: 'pay_xyz' },
    };
    mock.fixtures.push(fixture);

    const page = ec.list({ limit: 25 });
    const data = await page.getData();

    expect(mock.calls).toHaveLength(1);
    // First fetch: Page passes cursor=undefined; the spread `{...params, cursor}`
    // overrides any caller-provided cursor on the initial call (Page semantics —
    // the first fetch always starts from the newest record). Cursor only flows
    // when Page advances internally (see auto-paginates test below).
    expect(mock.calls[0].path).toBe('/external-credits?limit=25');
    expect(data).toHaveLength(2);
    expect(page.hasNextPage()).toBe(true);
    expect(page.meta.next_cursor).toBe('pay_xyz');
  });

  it('auto-paginates across pages via for-await iteration', async () => {
    const ec = resource(mock);
    mock.fixtures.push({
      data: [mkCredit({ payment_id: 'pay_p1' })],
      meta: { per_page: 1, next_cursor: 'pay_p1' },
    });
    mock.fixtures.push({
      data: [mkCredit({ payment_id: 'pay_p2' })],
      meta: { per_page: 1 }, // no next_cursor — last page
    });

    const ids: string[] = [];
    for await (const credit of ec.list({ limit: 1 })) {
      ids.push(credit.payment_id);
    }

    expect(ids).toEqual(['pay_p1', 'pay_p2']);
    expect(mock.calls).toHaveLength(2);
    // First page: limit only (Page passes undefined initial cursor).
    expect(mock.calls[0].path).toBe('/external-credits?limit=1');
    // Second page: limit + cursor from page 1's next_cursor.
    expect(mock.calls[1].path).toBe('/external-credits?limit=1&cursor=pay_p1');
  });

  it('autoPagingToArray flattens multi-page results', async () => {
    const ec = resource(mock);
    mock.fixtures.push({
      data: [mkCredit({ payment_id: 'pay_a' }), mkCredit({ payment_id: 'pay_b' })],
      meta: { per_page: 2, next_cursor: 'pay_b' },
    });
    mock.fixtures.push({
      data: [mkCredit({ payment_id: 'pay_c' })],
      meta: { per_page: 2 }, // last page, no next_cursor
    });

    const all = await ec.list({ limit: 2 }).autoPagingToArray({ limit: 100 });

    expect(all.map((c) => c.payment_id)).toEqual(['pay_a', 'pay_b', 'pay_c']);
  });

  it('uses {data, meta} envelope (matches PaymentListResponse shape)', async () => {
    const ec = resource(mock);
    // Wire shape mirrors writeList: {data, meta:{per_page, next_cursor}}.
    // NOT a flat {data, next_cursor} — Page<T> reads meta.next_cursor.
    mock.fixtures.push({
      data: [mkCredit()],
      meta: { per_page: 50, next_cursor: 'pay_next' },
    });

    const page = ec.list();
    await page.getData();

    expect(page.meta.per_page).toBe(50);
    expect(page.meta.next_cursor).toBe('pay_next');
  });
});

// ── Privacy contract (D-19) ───────────────────────────────────────────

describe('ExternalCredit type — D-19 privacy contract', () => {
  it('payer_owner_masked matches pyr_<12 hex> regex', () => {
    const credit = mkCredit({ payer_owner_masked: 'pyr_3a4b5c6d7e8f' });
    expect(credit.payer_owner_masked).toMatch(/^pyr_[a-f0-9]{12}$/);
  });

  it('TypeScript type prevents access to raw payer api_owner', () => {
    // Compile-time guard: the ExternalCredit interface has NO field
    // exposing the raw payer api_owner. Adding `api_owner` / `payer_api_owner`
    // / `payer_owner_id` would break the masking contract (D-19).
    //
    // The @ts-expect-error directives below MUST trigger compile errors —
    // if a future refactor accidentally adds one of these fields, the
    // directive flips from "expected error" to "unexpected no-error" and
    // tsc fails the build.
    const credit = mkCredit();

    // @ts-expect-error — D-19: ExternalCredit must not expose api_owner
    void credit.api_owner;

    // @ts-expect-error — D-19: ExternalCredit must not expose payer_api_owner
    void credit.payer_api_owner;

    // @ts-expect-error — D-19: ExternalCredit must not expose payer_owner_id
    void credit.payer_owner_id;
  });

  it('confirmed_at is optional (undefined while pending)', () => {
    const pending = mkCredit({ status: 'pending', confirmed_at: undefined });
    expect(pending.confirmed_at).toBeUndefined();
  });

  it('amount_received is number (centavos) — not string, not float', () => {
    const credit = mkCredit({ amount_received: 15000 });
    expect(typeof credit.amount_received).toBe('number');
    // Project invariant: integer centavos. The SDK type is `number`,
    // value here is a whole int.
    expect(Number.isInteger(credit.amount_received)).toBe(true);
  });

  it('exposes wallet_id (receiver-side wallet ID) on every row', () => {
    // wallet_id is referential within the receiver's own api_owner namespace
    // (CLAUDE.md feedback_wallet_id_referential.md). Safe to expose because
    // the receiver already owns the wallet — never the payer's wallet.
    const credit = mkCredit({ wallet_id: 'wlt_test_xyz' });
    expect(typeof credit.wallet_id).toBe('string');
    expect(credit.wallet_id).toBe('wlt_test_xyz');
    expect(credit.wallet_id.length).toBeGreaterThan(0);
  });
});
