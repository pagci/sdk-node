/**
 * `pagci.listen()` — Local webhook listener for development.
 *
 * Starts a local HTTP server, creates a public tunnel (localtunnel),
 * and returns the tunnel URL. Use it as `overwrite_webhook_url` when
 * creating payments — webhooks will arrive at your local server.
 *
 * Usage:
 *   const session = await listen('api_key', { port: 3000 });
 *   console.log(session.url); // https://xyz.loca.lt
 *
 * CLI:
 *   npx @pagci/node listen --port 3000
 *
 * Requires `localtunnel` as optional peer dependency:
 *   npm install localtunnel
 */

import * as http from 'node:http';

// ── ANSI Colors (zero deps) ─────────────────────────────────────────

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  white:  '\x1b[37m',
} as const;

// ── Types ────────────────────────────────────────────────────────────

export interface ListenOptions {
  /** Local port to receive webhooks. Default: 4400 */
  port?: number;
  /** Callback for each received event. */
  onEvent?: (event: IncomingWebhook) => void;
  /** Suppress log output. Default: false */
  silent?: boolean;
}

export interface IncomingWebhook {
  event: string;
  resource_type: string;
  data: unknown;
  balances?: Record<string, unknown>;
  account_balance?: unknown;
  /** Raw JSON body */
  raw: string;
  /** Headers from the webhook request */
  headers: Record<string, string | string[] | undefined>;
}

export interface ListenSession {
  /** Public tunnel URL — use as overwrite_webhook_url in payments.create() */
  url: string;
  /** Local port the server is running on */
  port: number;
  /** Stop the listener and close the tunnel */
  close: () => Promise<void>;
}

// ── Pretty Output ────────────────────────────────────────────────────

function printBanner(url: string, port: number): void {
  const line = '─'.repeat(56);
  console.log();
  console.log(`  ${c.cyan}${c.bold}⚡ PAGCI${c.reset}  ${c.dim}Webhook Listener${c.reset}`);
  console.log(`  ${c.gray}${line}${c.reset}`);
  console.log(`  ${c.gray}Tunnel${c.reset}    ${c.white}${url}${c.reset}`);
  console.log(`  ${c.gray}Forward${c.reset}   ${c.white}http://localhost:${port}${c.reset}`);
  console.log(`  ${c.gray}Status${c.reset}    ${c.green}● Ready${c.reset}`);
  console.log(`  ${c.gray}${line}${c.reset}`);
  console.log();
  console.log(`  ${c.dim}Use this URL as overwrite_webhook_url when creating payments.${c.reset}`);
  console.log(`  ${c.dim}Press Ctrl+C to stop.${c.reset}`);
  console.log();
}

function printEvent(event: string, resourceId: string, status: number, ms: number): void {
  const time = new Date().toISOString().slice(11, 19);
  const eventPadded = event.padEnd(24);

  const eventColor = event.includes('failed') || event.includes('dispute')
    ? c.red
    : event.includes('confirmed') || event.includes('settled') || event.includes('completed')
      ? c.green
      : c.yellow;

  const statusStr = status >= 200 && status < 300
    ? `${c.green}${status}${c.reset}`
    : `${c.red}${status}${c.reset}`;

  const id = resourceId ? `${c.dim}${resourceId.slice(0, 20)}${c.reset}` : '';

  console.log(`  ${c.gray}${time}${c.reset}  ${eventColor}→${c.reset}  ${c.bold}${eventPadded}${c.reset} ${id}  ${statusStr}  ${c.dim}${ms}ms${c.reset}`);
}

// ── Tunnel ────────────────────────────────────────────────────────────

async function createTunnel(port: number): Promise<{ url: string; close: () => Promise<void> }> {
  // localtunnel is an optional peer dependency — dynamic import to avoid bundling
  let ltModule: { default?: (opts: { port: number }) => Promise<{ url: string; close: () => void }> };
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ltModule = await import(/* webpackIgnore: true */ 'localtunnel' as string);
  } catch {
    throw new Error(
      `localtunnel is required for pagci listen.\n\n` +
      `Install it:\n` +
      `  npm install localtunnel\n`,
    );
  }

  const lt = ltModule.default ?? (ltModule as unknown as (opts: { port: number }) => Promise<{ url: string; close: () => void }>);
  const tunnel = await lt({ port });

  return {
    url: tunnel.url,
    close: () => new Promise<void>((resolve) => {
      tunnel.close();
      resolve();
    }),
  };
}

// ── Local HTTP Server ────────────────────────────────────────────────

function startServer(
  port: number,
  onRequest: (body: string, headers: http.IncomingHttpHeaders) => number,
): http.Server {
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405).end();
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      const status = onRequest(body, req.headers);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    });
  });

  server.listen(port);
  return server;
}

// ── Main ─────────────────────────────────────────────────────────────

export async function listen(
  _apiKey: string,
  options: ListenOptions = {},
): Promise<ListenSession> {
  const port = options.port ?? 4400;
  const { onEvent, silent = false } = options;

  // Start local HTTP server to receive webhook POSTs
  const server = startServer(port, (body, headers) => {
    const start = Date.now();
    try {
      const payload = JSON.parse(body) as IncomingWebhook;
      payload.raw = body;
      payload.headers = headers as Record<string, string | string[] | undefined>;

      onEvent?.(payload);

      const resourceId = (payload.data as Record<string, unknown> | null)?.['id'] as string ?? '';
      const ms = Date.now() - start;

      if (!silent) {
        printEvent(payload.event, resourceId, 200, ms);
      }
      return 200;
    } catch {
      if (!silent) {
        console.log(`  ${c.red}✗${c.reset} ${c.dim}Failed to parse webhook body${c.reset}`);
      }
      return 400;
    }
  });

  // Create public tunnel
  const tunnel = await createTunnel(port);

  if (!silent) {
    printBanner(tunnel.url, port);
  }

  return {
    url: tunnel.url,
    port,
    close: async () => {
      await tunnel.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      if (!silent) {
        console.log();
        console.log(`  ${c.dim}Listener stopped.${c.reset}`);
        console.log();
      }
    },
  };
}
