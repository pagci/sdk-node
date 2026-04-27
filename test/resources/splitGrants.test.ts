import { describe, it, expect, beforeEach } from 'vitest';
import { SplitGrantsResource } from '../../src/resources/splitGrants.js';
import type { RequestSender } from '../../src/requestSender.js';
import type {
  SplitGrant,
  CreateSplitGrantParams,
  SplitGrantListResponse,
} from '../../src/types/index.js';
import { ErrorCode } from '../../src/types/error.js';

// ── Mock RequestSender ────────────────────────────────────────────────
//
// Mirrors the pattern from gifts.test.ts. The bench test fakes a minimal
// RequestSender that captures calls and returns queued fixtures.

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

function resource(mock: MockRequestSender): SplitGrantsResource {
  return new SplitGrantsResource(mock as unknown as RequestSender);
}

// Helper to build a SplitGrant fixture with sensible defaults.
function mkGrant(overrides: Partial<SplitGrant> = {}): SplitGrant {
  return {
    id: 'sg_01jxyz',
    issuer_owner_id: 'usr_b_owner',
    created_at: '2026-04-27T12:00:00Z',
    ...overrides,
  };
}

// ── splitGrants.create() ─────────────────────────────────────────────

describe('SplitGrantsResource.create', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('POSTs /split-grants with body and returns parsed SplitGrant', async () => {
    const sg = resource(mock);
    const fixture = mkGrant({
      wallet_id: 'wal_b_main',
      allowed_payer_owner_id: 'usr_a',
    });
    mock.fixtures.push(fixture);

    const params: CreateSplitGrantParams = {
      wallet_id: 'wal_b_main',
      allowed_payer_owner_id: 'usr_a',
    };
    const resp = await sg.create(params);

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('POST');
    expect(mock.calls[0].path).toBe('/split-grants');
    expect(mock.calls[0].body).toEqual({
      wallet_id: 'wal_b_main',
      allowed_payer_owner_id: 'usr_a',
    });
    expect(resp.id).toBe('sg_01jxyz');
    expect(resp.wallet_id).toBe('wal_b_main');
    expect(resp.allowed_payer_owner_id).toBe('usr_a');
  });

  it('accepts an empty body (open public grant — server fills issuer from JWT)', async () => {
    const sg = resource(mock);
    mock.fixtures.push(mkGrant());

    await sg.create({});

    expect(mock.calls[0].body).toEqual({});
  });

  it('forwards expires_at and refund_clawback_allowed unchanged', async () => {
    const sg = resource(mock);
    mock.fixtures.push(
      mkGrant({
        expires_at: '2026-12-31T23:59:59Z',
        refund_clawback_allowed: true,
      }),
    );

    await sg.create({
      expires_at: '2026-12-31T23:59:59Z',
      refund_clawback_allowed: true,
    });

    expect(mock.calls[0].body).toEqual({
      expires_at: '2026-12-31T23:59:59Z',
      refund_clawback_allowed: true,
    });
  });
});

// ── splitGrants.list() ───────────────────────────────────────────────

describe('SplitGrantsResource.list', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('issues GET /split-grants without query when no params', async () => {
    const sg = resource(mock);
    mock.fixtures.push({ data: [], meta: { per_page: 50 } });

    const page = sg.list();
    const data = await page.getData();

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('GET');
    expect(mock.calls[0].path).toBe('/split-grants');
    expect(data).toEqual([]);
  });

  it('issues GET /split-grants?limit=N when limit param provided', async () => {
    const sg = resource(mock);
    const fixture: SplitGrantListResponse = {
      data: [mkGrant({ id: 'sg_a' }), mkGrant({ id: 'sg_b' })],
      meta: { per_page: 25, next_cursor: 'sg_xxx' },
    };
    mock.fixtures.push(fixture);

    const page = sg.list({ limit: 25 });
    const data = await page.getData();

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].path).toBe('/split-grants?limit=25');
    expect(data).toHaveLength(2);
    expect(page.hasNextPage()).toBe(true);
    expect(page.meta.next_cursor).toBe('sg_xxx');
  });

  it('advances cursor across pages via for-await iteration', async () => {
    // Pattern: Page<T> drives cursor advancement through meta.next_cursor.
    // First fetch: no cursor query (Page calls fetcher(undefined)).
    // Second fetch: ?cursor=<previous next_cursor>.
    const sg = resource(mock);
    mock.fixtures.push({
      data: [mkGrant({ id: 'sg_p1_a' })],
      meta: { per_page: 1, next_cursor: 'sg_p1_a' },
    });
    mock.fixtures.push({
      data: [mkGrant({ id: 'sg_p2_a' })],
      meta: { per_page: 1 }, // no next_cursor — last page
    });

    const ids: string[] = [];
    for await (const grant of sg.list({ limit: 1 })) {
      ids.push(grant.id);
    }

    expect(ids).toEqual(['sg_p1_a', 'sg_p2_a']);
    expect(mock.calls).toHaveLength(2);
    // First page: no cursor (Page passes undefined initially).
    expect(mock.calls[0].path).toBe('/split-grants?limit=1');
    // Second page: cursor from page 1's meta.next_cursor.
    expect(mock.calls[1].path).toBe('/split-grants?limit=1&cursor=sg_p1_a');
  });

  it('uses {data, meta} envelope (matches PaymentListResponse shape)', async () => {
    const sg = resource(mock);
    // The runtime emits {data, meta:{per_page, next_cursor}} — NOT a flat
    // {data, next_cursor}. The Page<T> consumer reads meta.next_cursor.
    mock.fixtures.push({
      data: [mkGrant()],
      meta: { per_page: 50, next_cursor: 'sg_next' },
    });

    const page = sg.list();
    await page.getData();

    expect(page.meta.per_page).toBe(50);
    expect(page.meta.next_cursor).toBe('sg_next');
  });
});

// ── splitGrants.get() ────────────────────────────────────────────────

describe('SplitGrantsResource.get', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('issues GET /split-grants/{id}, URL-encoding the id', async () => {
    const sg = resource(mock);
    const fixture = mkGrant({ id: 'sg_01jxyz' });
    mock.fixtures.push(fixture);

    const resp = await sg.get('sg_01jxyz');

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('GET');
    expect(mock.calls[0].path).toBe('/split-grants/sg_01jxyz');
    expect(mock.calls[0].body).toBeUndefined();
    expect(resp.id).toBe('sg_01jxyz');
  });

  it('url-encodes special characters in the id path segment', async () => {
    const sg = resource(mock);
    mock.fixtures.push(mkGrant());

    await sg.get('sg/needs encoding%');

    expect(mock.calls[0].path).toBe(
      '/split-grants/sg%2Fneeds%20encoding%25',
    );
  });
});

// ── splitGrants.revoke() ─────────────────────────────────────────────

describe('SplitGrantsResource.revoke', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('POSTs /split-grants/{id}/revoke and returns parsed SplitGrant with revoked_at set', async () => {
    const sg = resource(mock);
    const fixture = mkGrant({
      id: 'sg_01jxyz',
      revoked_at: '2026-04-27T15:00:00Z',
    });
    mock.fixtures.push(fixture);

    const resp = await sg.revoke('sg_01jxyz');

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('POST');
    expect(mock.calls[0].path).toBe('/split-grants/sg_01jxyz/revoke');
    // Empty body — revoke takes no params.
    expect(mock.calls[0].body).toBeUndefined();
    expect(resp.revoked_at).toBe('2026-04-27T15:00:00Z');
  });

  it('handles idempotent re-revoke (returns existing revoked_at, no error)', async () => {
    const sg = resource(mock);
    // Server returns the same grant with the same revoked_at on idempotent replay.
    mock.fixtures.push(
      mkGrant({ revoked_at: '2026-04-27T15:00:00Z' }),
    );

    const resp = await sg.revoke('sg_01jxyz');

    expect(resp.revoked_at).toBe('2026-04-27T15:00:00Z');
  });

  it('url-encodes special characters in the id path segment', async () => {
    const sg = resource(mock);
    mock.fixtures.push(mkGrant());

    await sg.revoke('sg+with?special');

    expect(mock.calls[0].path).toBe(
      '/split-grants/sg%2Bwith%3Fspecial/revoke',
    );
  });
});

// ── ErrorCode enum entries (Phase 105) ───────────────────────────────

describe('ErrorCode — Phase 105 SplitGrant sentinels', () => {
  it('exposes 10 new entries with snake_case wire values', () => {
    // Source: internal/handler/helpers.go errorMappings (Phase 105 plan 105-07
    // added 8 SplitGrant sentinels; D-23/D-24 add origin_not_allowed +
    // self_referential; payment-level guard adds cap_exceeded + not_minority).
    expect(ErrorCode.SplitGrantNotFound).toBe('split_grant_not_found');
    expect(ErrorCode.SplitGrantRevoked).toBe('split_grant_revoked');
    expect(ErrorCode.SplitGrantExpired).toBe('split_grant_expired');
    expect(ErrorCode.SplitGrantPayerNotAllowed).toBe(
      'split_grant_payer_not_allowed',
    );
    expect(ErrorCode.SplitGrantWalletRequired).toBe(
      'split_grant_wallet_required',
    );
    expect(ErrorCode.SplitGrantWalletConflict).toBe(
      'split_grant_wallet_conflict',
    );
    expect(ErrorCode.SplitGrantSelfReferential).toBe(
      'split_grant_self_referential',
    );
    expect(ErrorCode.SplitGrantOriginNotAllowed).toBe(
      'split_grant_origin_not_allowed',
    );
    expect(ErrorCode.SplitGrantCapExceeded).toBe('split_grant_cap_exceeded');
    expect(ErrorCode.SplitGrantNotMinority).toBe('split_grant_not_minority');
  });
});
