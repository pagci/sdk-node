"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeHttpClient = void 0;
const https = __importStar(require("node:https"));
const http = __importStar(require("node:http"));
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
class NodeHttpClient {
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
exports.NodeHttpClient = NodeHttpClient;
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