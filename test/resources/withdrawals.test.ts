import { describe, it, expect, beforeEach } from 'vitest';
import { WithdrawalsResource } from '../../src/resources/withdrawals.js';
import type { RequestSender } from '../../src/requestSender.js';

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

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    this.calls.push({ method, path, body });
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
