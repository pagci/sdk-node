import { describe, it, expect } from 'vitest';
import type { LiquidatorView } from '../../src/types/payment.js';

// Lock the SDK <-> backend contract for the additive fields introduced
// in quick task 260425-nxy (TotalQRMs *int64 + PoolHit bool on
// internal/paymentview/paymentview.go:29-48). Three fixtures mirror the
// three runtime shapes the backend emits.

describe('LiquidatorView shape — total_qr_ms + pool_hit (260425-nxy follow-up)', () => {
  it('pool_hit_with_total_qr_ms: pool hit emits both fields', () => {
    const json = '{"id":"liq-1","name":"primary-psp","claim_ms":42,"total_qr_ms":58,"pool_hit":true}';
    const liq = JSON.parse(json) as LiquidatorView;

    expect(typeof liq.total_qr_ms).toBe('number');
    expect(liq.total_qr_ms).toBe(58);
    expect(liq.pool_hit).toBe(true);
    // Legacy field preserved unchanged (no rename, no deprecate):
    expect(liq.claim_ms).toBe(42);
  });

  it('psp_miss: pool miss with PSP fallback emits total_qr_ms with pool_hit=false', () => {
    const json = '{"id":"liq-2","name":"primary-psp","claim_ms":0,"total_qr_ms":420,"pool_hit":false}';
    const liq = JSON.parse(json) as LiquidatorView;

    // total_qr_ms === 420 represents the PSP critical-path latency
    // (always emitted for origin=pix regardless of pool outcome).
    expect(liq.total_qr_ms).toBe(420);
    // pool_hit === false is informative — "from PSP, not pool".
    expect(liq.pool_hit).toBe(false);
    // claim_ms is 0 on PSP miss (legacy field, kept for back-compat).
    expect(liq.claim_ms).toBe(0);
  });

  it('internal_charge: no QR produced — total_qr_ms structurally absent, pool_hit=false', () => {
    // Mirrors Go: `*int64 + omitempty` drops the field from JSON when nil.
    // pool_hit is `bool` without omitempty — always emitted, even false.
    const json = '{"id":"liq-3","name":"internal","claim_ms":0,"pool_hit":false}';
    const liq = JSON.parse(json) as LiquidatorView;

    expect(liq.total_qr_ms).toBeUndefined();
    expect(liq.pool_hit).toBe(false);
    // Structural absence (not just undefined): the key MUST not exist.
    expect(Object.prototype.hasOwnProperty.call(liq, 'total_qr_ms')).toBe(false);
  });
});
