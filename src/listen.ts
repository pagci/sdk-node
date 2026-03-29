/**
 * `pagci.listen()` — Real-time webhook listener for local development.
 *
 * Connects to the PAGCI relay server via WebSocket, receives webhook events
 * in real-time, and optionally forwards them to a local HTTP server.
 *
 * Usage:
 *   const session = await pagci.listen({ port: 3000 });
 *   // webhooks are forwarded to http://localhost:3000
 *   session.close();
 *
 * Or standalone with pretty logs:
 *   npx @pagci/node listen
 */

import * as http from 'node:http';
import * as crypto from 'node:crypto';

// ── Colors (ANSI escape codes, zero deps) ──────────────────────────────────

const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  gray:    '\x1b[90m',
  white:   '\x1b[37m',
  bgCyan:  '\x1b[46m',
  bgRed:   '\x1b[41m',
  bgGreen: '\x1b[42m',
} as const;

// ── Types ───────────────────────────────────────────────────────────────────

export interface ListenOptions {
  /** Local port to forward webhooks to. If omitted, only logs events. */
  port?: number;
  /** Path on the local server to POST to. Default: "/" */
  path?: string;
  /** Relay server URL. Default: wss://relay.pagci.com */
  relayUrl?: string;
  /** Event patterns to subscribe to. Default: ["*"] */
  events?: string[];
  /** Callback for each received event. */
  onEvent?: (event: WebhookPayload) => void;
  /** Suppress log output. Default: false */
  silent?: boolean;
}

export interface WebhookPayload {
  event: string;
  resource_type: string;
  resource_id: string;
  data: unknown;
  balances?: Record<string, unknown>;
  account_balance?: unknown;
}

export interface ListenSession {
  sessionId: string;
  close: () => void;
}

// ── Pretty Logger ───────────────────────────────────────────────────────────

function printBanner(sessionId: string, port?: number): void {
  const line = '─'.repeat(52);

  console.log();
  console.log(`  ${c.cyan}${c.bold}⚡ PAGCI${c.reset}  ${c.dim}Webhook Listener${c.reset}`);
  console.log(`  ${c.gray}${line}${c.reset}`);
  console.log(`  ${c.gray}Session${c.reset}   ${c.white}${sessionId}${c.reset}`);
  if (port) {
    console.log(`  ${c.gray}Forward${c.reset}   ${c.white}http://localhost:${port}${c.reset}`);
  }
  console.log(`  ${c.gray}Status${c.reset}    ${c.green}● Ready${c.reset}`);
  console.log(`  ${c.gray}${line}${c.reset}`);
  console.log();
}

function printEvent(event: string, resourceId: string, forwardResult?: { status: number; ms: number }): void {
  const time = new Date().toISOString().slice(11, 19);
  const eventPadded = event.padEnd(22);

  let statusStr: string;
  if (!forwardResult) {
    statusStr = `${c.dim}(no forward)${c.reset}`;
  } else if (forwardResult.status >= 200 && forwardResult.status < 300) {
    statusStr = `${c.green}✓ ${forwardResult.status}${c.reset} ${c.dim}${forwardResult.ms}ms${c.reset}`;
  } else {
    statusStr = `${c.red}✗ ${forwardResult.status}${c.reset} ${c.dim}${forwardResult.ms}ms${c.reset}`;
  }

  const eventColor = event.includes('failed') || event.includes('dispute')
    ? c.red
    : event.includes('confirmed') || event.includes('settled') || event.includes('completed')
      ? c.green
      : c.yellow;

  console.log(`  ${c.gray}${time}${c.reset}  ${eventColor}→${c.reset}  ${c.bold}${eventPadded}${c.reset}  ${c.dim}${resourceId.slice(0, 16)}${c.reset}  ${statusStr}`);
}

function printError(message: string): void {
  console.log(`  ${c.red}${c.bold}✗${c.reset} ${c.red}${message}${c.reset}`);
}

/** @internal Used by reconnection logic (future: auto-reconnect on disconnect) */
export function printReconnect(attempt: number): void {
  console.log(`  ${c.yellow}↻${c.reset} ${c.dim}Reconnecting (attempt ${attempt})...${c.reset}`);
}

// ── Forward to local server ─────────────────────────────────────────────────

async function forwardToLocal(
  port: number,
  path: string,
  payload: string,
  headers: Record<string, string>,
): Promise<{ status: number; ms: number }> {
  const start = Date.now();

  return new Promise((resolve) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: 'POST', headers },
      (res) => {
        res.resume(); // drain
        resolve({ status: res.statusCode ?? 0, ms: Date.now() - start });
      },
    );

    req.on('error', () => {
      resolve({ status: 0, ms: Date.now() - start });
    });

    req.write(payload);
    req.end();
  });
}

// ── Main listen function ────────────────────────────────────────────────────

/**
 * Start listening for webhook events from the PAGCI relay server.
 *
 * Requires the relay server to be running (see docs for setup).
 * Uses WebSocket (native in Node 21+, or `ws` package for Node 18-20).
 */
export async function listen(
  apiKey: string,
  options: ListenOptions = {},
): Promise<ListenSession> {
  const {
    port,
    path = '/',
    relayUrl = 'wss://relay.pagci.com',
    events: _events = ['*'],
    onEvent,
    silent = false,
  } = options;

  void _events; // will be used when registering temporary webhook via API
  const sessionId = crypto.randomUUID();

  if (!silent) {
    printBanner(sessionId, port);
  }

  // Dynamic import WebSocket — native in Node 21+, falls back to error message
  let WebSocketImpl: typeof WebSocket;
  try {
    WebSocketImpl = globalThis.WebSocket ?? (await import('ws' as string)).default;
  } catch {
    throw new Error(
      'WebSocket not available. Use Node.js 21+ (native WebSocket) or install the `ws` package: npm install ws',
    );
  }

  const ws = new WebSocketImpl(`${relayUrl}/listen/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  } as never);

  ws.onmessage = async (msg: MessageEvent) => {
    try {
      const raw = typeof msg.data === 'string' ? msg.data : msg.data.toString();
      const payload: WebhookPayload = JSON.parse(raw);

      onEvent?.(payload);

      let forwardResult: { status: number; ms: number } | undefined;

      if (port) {
        forwardResult = await forwardToLocal(port, path, raw, {
          'Content-Type': 'application/json',
          'X-Webhook-Event': payload.event,
          'X-Webhook-ID': crypto.randomUUID(),
          'X-Webhook-Timestamp': String(Math.floor(Date.now() / 1000)),
        });
      }

      if (!silent) {
        const resourceId = (payload as unknown as Record<string, unknown>)['resource_id'] as string
          ?? ((payload.data as Record<string, unknown> | null)?.['id'] as string)
          ?? '';
        printEvent(payload.event, resourceId, forwardResult);
      }
    } catch (err) {
      if (!silent) printError(`Failed to process event: ${err}`);
    }
  };

  ws.onerror = (err: Event) => {
    if (!silent) printError(`WebSocket error: ${err}`);
  };

  ws.onclose = () => {
    if (!silent) {
      console.log();
      console.log(`  ${c.dim}Session closed.${c.reset}`);
      console.log();
    }
  };

  return {
    sessionId,
    close: () => ws.close(),
  };
}
