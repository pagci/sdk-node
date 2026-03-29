import type { CryptoProvider } from './CryptoProvider.js';
/**
 * Node.js native implementation of CryptoProvider using `node:crypto`.
 * Zero runtime dependencies — uses only built-in modules.
 */
export declare class NodeCryptoProvider implements CryptoProvider {
    computeHmacSha256(key: string, data: string): string;
    computeHmacSha256Async(key: string, data: string): Promise<string>;
    /**
     * Constant-time comparison. If lengths differ, we still compare
     * fixed-size HMAC digests of both strings to avoid leaking length
     * information through timing.
     */
    timingSafeEqual(a: string, b: string): boolean;
}
//# sourceMappingURL=NodeCryptoProvider.d.ts.map