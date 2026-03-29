"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeCryptoProvider = void 0;
const node_crypto_1 = require("node:crypto");
/**
 * Node.js native implementation of CryptoProvider using `node:crypto`.
 * Zero runtime dependencies — uses only built-in modules.
 */
class NodeCryptoProvider {
    computeHmacSha256(key, data) {
        return (0, node_crypto_1.createHmac)('sha256', key).update(data, 'utf8').digest('hex');
    }
    computeHmacSha256Async(key, data) {
        return Promise.resolve(this.computeHmacSha256(key, data));
    }
    /**
     * Constant-time comparison. If lengths differ, we still compare
     * fixed-size HMAC digests of both strings to avoid leaking length
     * information through timing.
     */
    timingSafeEqual(a, b) {
        const bufA = Buffer.from(a, 'utf8');
        const bufB = Buffer.from(b, 'utf8');
        if (bufA.length !== bufB.length) {
            // Derive fixed-size digests so the comparison always runs
            // in constant time, even with different-length inputs.
            const hmacA = (0, node_crypto_1.createHmac)('sha256', 'len-guard').update(bufA).digest();
            const hmacB = (0, node_crypto_1.createHmac)('sha256', 'len-guard').update(bufB).digest();
            (0, node_crypto_1.timingSafeEqual)(hmacA, hmacB);
            return false;
        }
        return (0, node_crypto_1.timingSafeEqual)(bufA, bufB);
    }
}
exports.NodeCryptoProvider = NodeCryptoProvider;
//# sourceMappingURL=NodeCryptoProvider.js.map