import { createHmac, timingSafeEqual as cryptoTimingSafeEqual } from 'node:crypto';
import type { CryptoProvider } from './CryptoProvider.js';

/**
 * Node.js native implementation of CryptoProvider using `node:crypto`.
 * Zero runtime dependencies — uses only built-in modules.
 */
export class NodeCryptoProvider implements CryptoProvider {
  computeHmacSha256(key: string, data: string): string {
    return createHmac('sha256', key).update(data, 'utf8').digest('hex');
  }

  computeHmacSha256Async(key: string, data: string): Promise<string> {
    return Promise.resolve(this.computeHmacSha256(key, data));
  }

  /**
   * Constant-time comparison. If lengths differ, we still compare
   * fixed-size HMAC digests of both strings to avoid leaking length
   * information through timing.
   */
  timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    if (bufA.length !== bufB.length) {
      // Derive fixed-size digests so the comparison always runs
      // in constant time, even with different-length inputs.
      const hmacA = createHmac('sha256', 'len-guard').update(bufA).digest();
      const hmacB = createHmac('sha256', 'len-guard').update(bufB).digest();
      cryptoTimingSafeEqual(hmacA, hmacB);
      return false;
    }

    return cryptoTimingSafeEqual(bufA, bufB);
  }
}
