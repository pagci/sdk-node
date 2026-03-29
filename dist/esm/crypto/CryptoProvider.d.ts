/**
 * Abstract interface for cryptographic operations.
 * Allows swapping implementations (Node.js native, WebCrypto, etc.)
 * without changing consuming code.
 */
export interface CryptoProvider {
    /**
     * Compute HMAC-SHA256 synchronously.
     * @returns hex-encoded digest
     */
    computeHmacSha256(key: string, data: string): string;
    /**
     * Compute HMAC-SHA256 asynchronously.
     * Identical result to sync variant — exists for API consistency
     * and future WebCrypto compatibility (SubtleCrypto is async-only).
     * @returns hex-encoded digest
     */
    computeHmacSha256Async(key: string, data: string): Promise<string>;
    /**
     * Constant-time string comparison to prevent timing attacks.
     * Both strings MUST be compared in their entirety regardless of length.
     */
    timingSafeEqual(a: string, b: string): boolean;
}
//# sourceMappingURL=CryptoProvider.d.ts.map