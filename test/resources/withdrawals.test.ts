import { describe, it, expect, beforeEach } from 'vitest';
import { WithdrawalsResource } from '../../src/resources/withdrawals.js';
import type { RequestSender } from '../../src/requestSender.js';
import { ErrorCode } from '../../src/types/index.js';
import { ApiError } from '../../src/errors.js';

// ── Mock RequestSender ────────────────────────────────────────────────
//
// Mirrors the pattern from test/resources/fees.test.ts. The bench test fakes
// a minimal RequestSender that captures calls and returns queued fixtures.

interface CapturedCall {
  method: string;
  path: string;
  body: unknown;
}

class MockRequestSender {
  calls: CapturedCall[] = [];
  fixtures: unknown[] = [];
  errors: unknown[] = [];

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    this.calls.push({ method, path, body });
    if (this.errors.length > 0) {
      throw this.errors.shift();
    }
    const next = this.fixtures.shift();
    return (next ?? {}) as T;
  }
}

function resource(mock: MockRequestSender): WithdrawalsResource {
  return new WithdrawalsResource(mock as unknown as RequestSender);
}

// ── withdrawals.summary() — Phase 104 ────────────────────────────────

describe('WithdrawalsResource.summary', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('issues GET /withdrawals/summary with no body', async () => {
    const w = resource(mock);
    mock.fixtures.push({
      disponivel_centavos: 0,
      em_processamento_centavos: 0,
      total_sacado_centavos: 0,
      rejeitados_centavos: 0,
    });

    await w.summary();

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('GET');
    expect(mock.calls[0].path).toBe('/withdrawals/summary');
    expect(mock.calls[0].body).toBeUndefined();
  });

  it('returns parsed WithdrawalSummary with all 5 fields when MV has data', async () => {
    const w = resource(mock);
    mock.fixtures.push({
      disponivel_centavos: 750000,
      em_processamento_centavos: 50000,
      total_sacado_centavos: 1000000,
      rejeitados_centavos: 25000,
      last_updated_at: '2026-04-27T15:30:00Z',
    });

    const summary = await w.summary();

    expect(summary.disponivel_centavos).toBe(750000);
    expect(summary.em_processamento_centavos).toBe(50000);
    expect(summary.total_sacado_centavos).toBe(1000000);
    expect(summary.rejeitados_centavos).toBe(25000);
    expect(summary.last_updated_at).toBe('2026-04-27T15:30:00Z');
  });

  it('handles missing last_updated_at gracefully (MV empty for owner)', async () => {
    // Backend emits the field with omitempty; absent means MV has no rows yet.
    const w = resource(mock);
    mock.fixtures.push({
      disponivel_centavos: 0,
      em_processamento_centavos: 0,
      total_sacado_centavos: 0,
      rejeitados_centavos: 0,
    });

    const summary = await w.summary();

    expect(summary.last_updated_at).toBeUndefined();
    expect(summary.disponivel_centavos).toBe(0);
    expect(summary.total_sacado_centavos).toBe(0);
  });
});

// ── withdrawals.create() — quick-260428-q99 pre-claim DICT gate ──────
//
// Locks the SDK contract for the new 400 invalid_pix_key_dict error code
// emitted by POST /withdrawals when the pre-claim DICT pre-validation gate
// receives an authoritative NXKEY answer. Distinct from invalid_pix_key
// (format error) — the SDK enum carries both and consumers branch on the
// exact code.

describe('WithdrawalsResource.create — DICT pre-validation gate', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('throws ApiError with code invalid_pix_key_dict on DICT NXKEY', async () => {
    const w = resource(mock);
    mock.errors.push(
      new ApiError({
        message: 'pix key not registered in DICT',
        type: 'https://docs.pagci.com/errors/invalid_pix_key_dict',
        title: 'Invalid Pix Key Dict',
        status: 400,
        code: ErrorCode.InvalidPixKeyDICT,
      }),
    );

    await expect(
      w.create({
        wallet_id: 'wallet_main',
        amount: 5000,
        pix_key: 'naoexiste@example.com',
        pix_key_type: 'email',
      }),
    ).rejects.toMatchObject({ status: 400, code: ErrorCode.InvalidPixKeyDICT });
  });
});
