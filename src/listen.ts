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
  /** Show full headers and JSON body for each event. Default: false */
  verbose?: boolean;
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

function printBanner(url: string, port: number, provider: string): void {
  const line = '─'.repeat(56);
  console.log();
  console.log(`  ${c.cyan}${c.bold}⚡ PAGCI${c.reset}  ${c.dim}Webhook Listener${c.reset}`);
  console.log(`  ${c.gray}${line}${c.reset}`);
  console.log(`  ${c.gray}Tunnel${c.reset}    ${c.white}${url}${c.reset}`);
  console.log(`  ${c.gray}Forward${c.reset}   ${c.white}http://localhost:${port}${c.reset}`);
  console.log(`  ${c.gray}Provider${c.reset}  ${c.white}${provider}${c.reset}`);
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

function printVerbose(raw: string, headers: Record<string, string | string[] | undefined>): void {
  // Headers
  const relevantHeaders = ['x-webhook-signature', 'x-webhook-timestamp', 'x-webhook-id', 'x-webhook-event', 'content-type'];
  const headerEntries = Object.entries(headers)
    .filter(([k]) => relevantHeaders.includes(k.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));

  if (headerEntries.length > 0) {
    console.log(`  ${c.gray}┌─ Headers${c.reset}`);
    for (const [key, val] of headerEntries) {
      const value = Array.isArray(val) ? val.join(', ') : val ?? '';
      console.log(`  ${c.gray}│${c.reset}  ${c.cyan}${key}${c.reset}: ${c.dim}${value}${c.reset}`);
    }
    console.log(`  ${c.gray}│${c.reset}`);
  }

  // Body (pretty JSON, indented)
  try {
    const parsed = JSON.parse(raw);
    const pretty = JSON.stringify(parsed, null, 2);
    const lines = pretty.split('\n');
    console.log(`  ${c.gray}├─ Body${c.reset}`);
    for (const line of lines) {
      console.log(`  ${c.gray}│${c.reset}  ${c.dim}${line}${c.reset}`);
    }
    console.log(`  ${c.gray}└──${c.reset}`);
  } catch {
    console.log(`  ${c.gray}├─ Body (raw)${c.reset}`);
    console.log(`  ${c.gray}│${c.reset}  ${c.dim}${raw.slice(0, 500)}${c.reset}`);
    console.log(`  ${c.gray}└──${c.reset}`);
  }
  console.log();
}

/**
 * Print a QR code in the terminal (requires optional qrcode-terminal package).
 * Falls back to a hint message if not installed.
 */
export async function printQR(text: string): Promise<void> {
  try {
    const qrt = await import(/* webpackIgnore: true */ 'qrcode-terminal' as string);
    const generate = (qrt.default?.generate ?? qrt.generate) as
      (text: string, opts: { small: boolean }, cb: (code: string) => void) => void;
    await new Promise<void>((resolve) => {
      generate(text, { small: true }, (code: string) => {
        const indented = code.split('\n').map((l: string) => `  ${l}`).join('\n');
        console.log(indented);
        resolve();
      });
    });
  } catch {
    console.log(`  ${c.dim}(npm i qrcode-terminal para QR no terminal)${c.reset}`);
  }
}

// ── Tunnel providers (tried in order of ease of install) ─────────────

import { execSync, spawn, type ChildProcess } from 'node:child_process';

interface Tunnel {
  url: string;
  provider: string;
  close: () => Promise<void>;
}

/**
 * Tries tunnel providers in order:
 *  1. localtunnel — npm install localtunnel (easiest, no binary)
 *  2. cloudflared — quick tunnel, no account needed (most reliable)
 *  3. ngrok       — requires free account + authtoken
 *
 * Uses whichever is available first.
 */
async function createTunnel(port: number, silent: boolean): Promise<Tunnel> {
  // 1. localtunnel (npm package — easiest to install)
  const lt = await tryLocaltunnel(port);
  if (lt) {
    if (!silent) printProvider('localtunnel');
    return lt;
  }

  // 2. cloudflared (binary — most reliable)
  const cf = await tryCloudflared(port);
  if (cf) {
    if (!silent) printProvider('cloudflared');
    return cf;
  }

  // 3. ngrok (binary — requires account)
  const ng = await tryNgrok(port);
  if (ng) {
    if (!silent) printProvider('ngrok');
    return ng;
  }

  throw new Error(
    `No tunnel provider found. Install one:\n\n` +
    `  ${c.bold}Option 1 — localtunnel${c.reset} ${c.dim}(easiest, no binary)${c.reset}\n` +
    `    npm install localtunnel\n\n` +
    `  ${c.bold}Option 2 — cloudflared${c.reset} ${c.dim}(most reliable, no account)${c.reset}\n` +
    `    brew install cloudflared          ${c.dim}# macOS${c.reset}\n` +
    `    choco install cloudflared         ${c.dim}# Windows${c.reset}\n` +
    `    sudo apt install cloudflared      ${c.dim}# Debian/Ubuntu${c.reset}\n\n` +
    `  ${c.bold}Option 3 — ngrok${c.reset} ${c.dim}(requires free account)${c.reset}\n` +
    `    brew install ngrok                ${c.dim}# macOS${c.reset}\n` +
    `    choco install ngrok               ${c.dim}# Windows${c.reset}\n` +
    `    snap install ngrok                ${c.dim}# Linux${c.reset}\n` +
    `    ngrok config add-authtoken <token>${c.dim}# one-time setup${c.reset}\n`,
  );
}

function printProvider(name: string): void {
  console.log(`  ${c.gray}Provider${c.reset}  ${c.white}${name}${c.reset}`);
}

// ── Provider: localtunnel ────────────────────────────────────────────

async function tryLocaltunnel(port: number): Promise<Tunnel | null> {
  try {
    const ltModule = await import(/* webpackIgnore: true */ 'localtunnel' as string);
    const lt = ltModule.default ?? ltModule;
    const tunnel = await (lt as (opts: { port: number }) => Promise<{ url: string; close: () => void }>)({ port });
    return {
      url: tunnel.url,
      provider: 'localtunnel',
      close: () => new Promise<void>((r) => { tunnel.close(); r(); }),
    };
  } catch {
    return null;
  }
}

// ── Provider: cloudflared ────────────────────────────────────────────

async function tryCloudflared(port: number): Promise<Tunnel | null> {
  // Check if cloudflared binary exists
  try {
    execSync('cloudflared --version', { stdio: 'ignore' });
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    const proc: ChildProcess = spawn(
      'cloudflared', ['tunnel', '--url', `http://localhost:${port}`, '--no-autoupdate'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; proc.kill(); resolve(null); }
    }, 15_000);

    const onData = (chunk: Buffer): void => {
      const line = chunk.toString();
      // cloudflared prints the URL to stderr like: "... https://xxx.trycloudflare.com ..."
      const match = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i.exec(line);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          url: match[0],
          provider: 'cloudflared',
          close: () => new Promise<void>((r) => { proc.kill(); proc.on('close', () => r()); }),
        });
      }
    };

    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
    proc.on('error', () => { if (!resolved) { resolved = true; clearTimeout(timeout); resolve(null); } });
    proc.on('close', () => { if (!resolved) { resolved = true; clearTimeout(timeout); resolve(null); } });
  });
}

// ── Provider: ngrok ──────────────────────────────────────────────────

async function tryNgrok(port: number): Promise<Tunnel | null> {
  try {
    execSync('ngrok version', { stdio: 'ignore' });
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    const proc: ChildProcess = spawn(
      'ngrok', ['http', String(port), '--log', 'stdout', '--log-format', 'json'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; proc.kill(); resolve(null); }
    }, 15_000);

    proc.stdout?.on('data', (chunk: Buffer) => {
      const line = chunk.toString();
      // ngrok JSON logs contain "url":"https://xxx.ngrok-free.app"
      const match = /"url":"(https:\/\/[^"]+)"/.exec(line);
      if (match?.[1] && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          url: match[1],
          provider: 'ngrok',
          close: () => new Promise<void>((r) => { proc.kill(); proc.on('close', () => r()); }),
        });
      }
    });

    proc.on('error', () => { if (!resolved) { resolved = true; clearTimeout(timeout); resolve(null); } });
    proc.on('close', () => { if (!resolved) { resolved = true; clearTimeout(timeout); resolve(null); } });
  });
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
  const { onEvent, silent = false, verbose = false } = options;

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
        if (verbose) {
          printVerbose(body, headers as Record<string, string | string[] | undefined>);
        }
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
  const tunnel = await createTunnel(port, silent);

  if (!silent) {
    printBanner(tunnel.url, port, tunnel.provider);
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
