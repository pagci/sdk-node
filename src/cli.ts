#!/usr/bin/env node

/**
 * PAGCI CLI — Local webhook testing.
 *
 * Usage:
 *   npx @pagci/node listen                              Listen for webhooks
 *   npx @pagci/node listen --test                       + create test payment + QR code
 *   npx @pagci/node listen --test --verbose             + full headers & JSON
 *   npx @pagci/node listen --port 3000 --test --verbose Custom port
 */

import { Pagci } from './client.js';
import { listen, printQR } from './listen.js';

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
} as const;

function printHelp(): void {
  console.log();
  console.log(`  ${c.cyan}${c.bold}⚡ PAGCI CLI${c.reset}`);
  console.log();
  console.log(`  ${c.bold}Usage${c.reset}`);
  console.log(`    ${c.dim}npx @pagci/node listen${c.reset}                        Listen for webhooks`);
  console.log(`    ${c.dim}npx @pagci/node listen --test${c.reset}                 + create payment + QR`);
  console.log(`    ${c.dim}npx @pagci/node listen --test --verbose${c.reset}       + headers & JSON`);
  console.log(`    ${c.dim}npx @pagci/node listen --port 3000 --test${c.reset}     Custom port`);
  console.log();
  console.log(`  ${c.bold}Options${c.reset}`);
  console.log(`    --port <n>       Port to listen on (default: 4400)`);
  console.log(`    --key <key>      API key (or set PAGCI_API_KEY)`);
  console.log(`    --test           Create a test payment and show PIX QR code`);
  console.log(`    --verbose        Show full webhook headers and JSON body`);
  console.log(`    --wallet <id>    Wallet ID for test payment (default: first available)`);
  console.log();
}

const FLAGS_WITHOUT_VALUE = new Set(['verbose', 'test']);

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (FLAGS_WITHOUT_VALUE.has(key)) {
        result[key] = 'true';
      } else if (i + 1 < args.length) {
        result[key] = args[++i]!;
      }
    } else {
      result['_command'] = arg;
    }
  }
  return result;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args['_command'] || args['_command'] === 'help') {
    printHelp();
    return;
  }

  if (args['_command'] !== 'listen') {
    console.log(`  ${c.red}Unknown command: ${args['_command']}${c.reset}`);
    printHelp();
    process.exit(1);
  }

  const apiKey = args['key'] ?? process.env['PAGCI_API_KEY'] ?? '';
  if (!apiKey) {
    console.log();
    console.log(`  ${c.red}${c.bold}✗${c.reset} ${c.red}Missing API key.${c.reset}`);
    console.log(`  ${c.dim}Set PAGCI_API_KEY env or use --key <key>${c.reset}`);
    console.log();
    process.exit(1);
  }

  const port = args['port'] ? parseInt(args['port'], 10) : undefined;
  const verbose = 'verbose' in args;
  const testMode = 'test' in args;

  // Start listener
  const session = await listen(apiKey, { port, verbose });

  // If --test, create a payment and show QR
  if (testMode) {
    const pagci = new Pagci(apiKey);
    const walletId = args['wallet'] ?? 'icaro';

    console.log(`  ${c.dim}Creating test payment (R$ 0,01)...${c.reset}`);
    console.log();

    try {
      const payment = await pagci.payments.create({
        owner: { wallet_id: walletId },
        customer: { id: 'cli_test', document: '12345678900' },
        items: [{ name: 'CLI Test', id: 'cli_1', value: 1 }],
        recipients: [{ wallet_id: walletId, amount: 1 }],
        config: { overwrite_webhook_url: session.url },
      });

      console.log(`  ${c.green}${c.bold}✓${c.reset} Payment ${c.bold}${payment.id}${c.reset}  R$ ${(payment.pix_total / 100).toFixed(2)}`);
      console.log();

      const pixQR = payment.liquidator?.pix_qr;
      if (pixQR) {
        await printQR(pixQR);
        console.log(`  ${c.gray}PIX copia e cola:${c.reset}`);
        console.log(`  ${c.dim}${pixQR}${c.reset}`);
        console.log();
      }

      console.log(`  ${c.dim}Pay the PIX above. Webhook will appear here when confirmed.${c.reset}`);
      console.log();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${c.red}✗ Failed to create payment: ${msg}${c.reset}`);
      console.log(`  ${c.dim}Listener is still running — send webhooks to ${session.url}${c.reset}`);
      console.log();
    }
  }

  // Keep alive until Ctrl+C
  const shutdown = async (): Promise<void> => {
    await session.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((err: Error) => {
  console.error(`  ${c.red}${err.message}${c.reset}`);
  process.exit(1);
});
