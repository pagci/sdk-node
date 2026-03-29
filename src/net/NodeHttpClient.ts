import * as https from 'node:https';
import * as http from 'node:http';
import type { HttpClient, HttpClientResponse } from './HttpClient.js';

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
export class NodeHttpClient implements HttpClient {
  private readonly agent: https.Agent | http.Agent;

  constructor(agent?: https.Agent | http.Agent) {
    this.agent = agent ?? DEFAULT_AGENT;
  }

  request(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string,
    timeout?: number,
  ): Promise<HttpClientResponse> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const transport = isHttps ? https : http;

      const options: https.RequestOptions = {
        method,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        headers,
        agent: this.agent,
      };

      const req = transport.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          // Normalize header keys to lowercase for consistent access
          const responseHeaders: Record<string, string> = {};
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
          req.destroy(
            new Error(`Request timed out after ${timeout}ms`),
          );
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
function wrapConnectionError(err: Error): Error & { retriable?: boolean } {
  const code = (err as NodeJS.ErrnoException).code;
  if (code && RETRIABLE_CODES.has(code)) {
    (err as Error & { retriable: boolean }).retriable = true;
  }
  return err;
}
