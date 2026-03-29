import * as https from 'node:https';
import * as http from 'node:http';
/**
 * Default keep-alive agent — TCP connections stay warm between requests.
 * Singleton: created once, shared across all NodeHttpClient instances
 * unless the caller provides a custom agent.
 */
const DEFAULT_AGENT = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 60_000,
    maxSockets: 50,
});
/**
 * Node.js native HTTPS client. Zero runtime dependencies.
 * Uses `node:https` with TCP keep-alive by default.
 */
export class NodeHttpClient {
    agent;
    constructor(agent) {
        this.agent = agent ?? DEFAULT_AGENT;
    }
    request(method, url, headers, body, timeout) {
        return new Promise((resolve, reject) => {
            const parsed = new URL(url);
            const isHttps = parsed.protocol === 'https:';
            const transport = isHttps ? https : http;
            const options = {
                method,
                hostname: parsed.hostname,
                port: parsed.port || (isHttps ? 443 : 80),
                path: parsed.pathname + parsed.search,
                headers,
                agent: this.agent,
            };
            const req = transport.request(options, (res) => {
                const chunks = [];
                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                res.on('end', () => {
                    // Normalize header keys to lowercase for consistent access
                    const responseHeaders = {};
                    for (const [key, value] of Object.entries(res.headers)) {
                        if (value !== undefined) {
                            responseHeaders[key.toLowerCase()] = Array.isArray(value)
                                ? value.join(', ')
                                : value;
                        }
                    }
                    resolve({
                        status: res.statusCode ?? 0,
                        headers: responseHeaders,
                        body: Buffer.concat(chunks).toString('utf8'),
                    });
                });
                res.on('error', (err) => {
                    reject(wrapConnectionError(err));
                });
            });
            if (timeout !== undefined && timeout > 0) {
                req.setTimeout(timeout, () => {
                    req.destroy(new Error(`Request timed out after ${timeout}ms`));
                });
            }
            req.on('error', (err) => {
                reject(wrapConnectionError(err));
            });
            if (body !== undefined) {
                req.write(body, 'utf8');
            }
            req.end();
        });
    }
}
// ── Helpers ──────────────────────────────────────────────────────────
const RETRIABLE_CODES = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'EPIPE',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'EAI_AGAIN',
]);
/**
 * Annotate connection-level errors with a `retriable` flag so the
 * retry layer can make decisions without inspecting error messages.
 */
function wrapConnectionError(err) {
    const code = err.code;
    if (code && RETRIABLE_CODES.has(code)) {
        err.retriable = true;
    }
    return err;
}
//# sourceMappingURL=NodeHttpClient.js.map