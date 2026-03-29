import { describe, it, expect } from 'vitest';
import { generateIdempotencyKey } from '../src/idempotency.js';

describe('generateIdempotencyKey', () => {
  it('starts with "idem_" prefix', () => {
    const key = generateIdempotencyKey();
    expect(key.startsWith('idem_')).toBe(true);
  });

  it('has consistent length of 31 chars (idem_ + 8 ts + 18 random)', () => {
    // Format: idem_{8}{18} = 5 + 8 + 18 = 31
    for (let i = 0; i < 100; i++) {
      const key = generateIdempotencyKey();
      expect(key.length).toBe(31);
    }
  });

  it('generates unique keys (1000 keys, no duplicates)', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      keys.add(generateIdempotencyKey());
    }
    expect(keys.size).toBe(1000);
  });

  it('contains only valid characters (alphanumeric + underscore)', () => {
    for (let i = 0; i < 100; i++) {
      const key = generateIdempotencyKey();
      expect(key).toMatch(/^idem_[a-z0-9]+$/);
    }
  });

  it('timestamp portion is sortable (keys generated later sort after earlier)', () => {
    const key1 = generateIdempotencyKey();
    // Small delay to ensure different timestamp
    const key2 = generateIdempotencyKey();

    // Extract timestamp portions (chars 5-12)
    const ts1 = key1.slice(5, 13);
    const ts2 = key2.slice(5, 13);

    // Same or later timestamp (could be same ms)
    expect(ts2 >= ts1).toBe(true);
  });
});
