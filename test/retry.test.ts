import { describe, it, expect } from 'vitest';
import {
  shouldRetry,
  retryDelay,
  DEFAULT_RETRY_CONFIG,
} from '../src/retry.js';

// ── shouldRetry ──────────────────────────────────────────────────────

describe('shouldRetry', () => {
  const retryableStatuses = [429, 500, 502, 503, 504];
  const nonRetryableStatuses = [400, 401, 403, 404, 409, 422];

  describe('retryable statuses', () => {
    for (const status of retryableStatuses) {
      it(`returns true for ${status} with GET`, () => {
        expect(shouldRetry(status, 'GET', false)).toBe(true);
      });
    }
  });

  describe('non-retryable statuses', () => {
    for (const status of nonRetryableStatuses) {
      it(`returns false for ${status} regardless of method`, () => {
        expect(shouldRetry(status, 'GET', false)).toBe(false);
        expect(shouldRetry(status, 'POST', true)).toBe(false);
      });
    }
  });

  describe('idempotent methods always retryable (on retryable status)', () => {
    const methods = ['GET', 'DELETE', 'PUT', 'HEAD', 'OPTIONS'];
    for (const method of methods) {
      it(`${method} retries on 500 without idempotency key`, () => {
        expect(shouldRetry(500, method, false)).toBe(true);
      });
    }
  });

  describe('POST without idempotency key', () => {
    for (const status of retryableStatuses) {
      it(`returns false for POST ${status} without idempotency key`, () => {
        expect(shouldRetry(status, 'POST', false)).toBe(false);
      });
    }
  });

  describe('POST with idempotency key', () => {
    for (const status of retryableStatuses) {
      it(`returns true for POST ${status} with idempotency key`, () => {
        expect(shouldRetry(status, 'POST', true)).toBe(true);
      });
    }
  });

  describe('PATCH follows POST rules', () => {
    it('returns false for PATCH without idempotency key', () => {
      expect(shouldRetry(500, 'PATCH', false)).toBe(false);
    });

    it('returns true for PATCH with idempotency key', () => {
      expect(shouldRetry(500, 'PATCH', true)).toBe(true);
    });
  });

  it('is case-insensitive for method', () => {
    expect(shouldRetry(500, 'get', false)).toBe(true);
    expect(shouldRetry(500, 'Get', false)).toBe(true);
    expect(shouldRetry(500, 'post', true)).toBe(true);
  });
});

// ── retryDelay ───────────────────────────────────────────────────────

describe('retryDelay', () => {
  const config = { ...DEFAULT_RETRY_CONFIG };

  it('computes exponential backoff for attempt 0', () => {
    // base = min(500 * 2^0, 15000) = 500
    // jitter in [0.5, 1.0) → delay in [250, 500)
    const delays = Array.from({ length: 100 }, () =>
      retryDelay(0, undefined, config),
    );

    for (const d of delays) {
      expect(d).toBeGreaterThanOrEqual(250);
      expect(d).toBeLessThanOrEqual(500);
    }
  });

  it('computes exponential backoff for attempt 1', () => {
    // base = min(500 * 2^1, 15000) = 1000
    // jitter → [500, 1000)
    const delays = Array.from({ length: 100 }, () =>
      retryDelay(1, undefined, config),
    );

    for (const d of delays) {
      expect(d).toBeGreaterThanOrEqual(500);
      expect(d).toBeLessThanOrEqual(1000);
    }
  });

  it('caps at maxDelay', () => {
    // attempt 10: base = min(500 * 1024, 15000) = 15000
    // jitter → [7500, 15000)
    const delays = Array.from({ length: 100 }, () =>
      retryDelay(10, undefined, config),
    );

    for (const d of delays) {
      expect(d).toBeGreaterThanOrEqual(7500);
      expect(d).toBeLessThanOrEqual(15000);
    }
  });

  it('uses Retry-After header when present', () => {
    const delay = retryDelay(0, '3', config);
    expect(delay).toBe(3000);
  });

  it('caps Retry-After at 60s', () => {
    const delay = retryDelay(0, '120', config);
    expect(delay).toBe(60000);
  });

  it('ignores non-numeric Retry-After', () => {
    const delay = retryDelay(0, 'not-a-number', config);
    // Falls back to exponential backoff
    expect(delay).toBeGreaterThanOrEqual(250);
    expect(delay).toBeLessThanOrEqual(500);
  });

  it('ignores zero Retry-After', () => {
    const delay = retryDelay(0, '0', config);
    // Falls back to exponential backoff (seconds <= 0 is rejected)
    expect(delay).toBeGreaterThanOrEqual(250);
    expect(delay).toBeLessThanOrEqual(500);
  });

  it('ignores negative Retry-After', () => {
    const delay = retryDelay(0, '-5', config);
    expect(delay).toBeGreaterThanOrEqual(250);
    expect(delay).toBeLessThanOrEqual(500);
  });
});
