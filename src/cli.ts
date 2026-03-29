#!/usr/bin/env node

/**
 * PAGCI CLI — Developer tools for local development.
 *
 * Usage:
 *   npx @pagci/node listen                    # Log events to console
 *   npx @pagci/node listen --port 3000        # Forward to localhost:3000
 *   npx @pagci/node listen --port 3000 --path /webhooks
 *   PAGCI_API_KEY=pk_... npx @pagci/node listen
 */

import { listen } from './listen.js';

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
} as const;

function printHelp(): void {
  console.log();
  console.log(`  ${c.cyan}${c.bold}⚡ PAGCI CLI${c.reset}`);
  console.log();
  console.log(`  ${c.bold}Commands${c.reset}`);
  console.log(`    listen              Start webhook listener`);
  console.log();
  console.log(`  ${c.bold}Options${c.reset}`);
  console.log(`    --port <n>          Forward events to localhost:<n>`);
  console.log(`    --path <p>          Path to POST to (default: /)`);
  console.log(`    --key <key>         API key (or set PAGCI_API_KEY env)`);
  console.log(`    --events <e,e>      Event patterns (default: *)`);
  console.log();
  console.log(`  ${c.bold}Examples${c.reset}`);
  console.log(`    ${c.dim}npx @pagci/node listen${c.reset}`);
  console.log(`    ${c.dim}npx @pagci/node listen --port 3000${c.reset}`);
  console.log(`    ${c.dim}npx @pagci/node listen --port 3000 --path /webhooks${c.reset}`);
  console.log(`    ${c.dim}PAGCI_API_KEY=pk_... npx @pagci/node listen${c.reset}`);
  console.log();
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('--') && i + 1 < args.length) {
      result[arg.slice(2)] = args[++i]!;
    } else if (!arg.startsWith('--')) {
      result._command = arg;
    }
  }
  return result;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args._command || args._command === 'help') {
    printHelp();
    return;
  }

  if (args._command !== 'listen') {
    console.log(`  ${c.red}Unknown command: ${args._command}${c.reset}`);
    printHelp();
    process.exit(1);
  }

  const apiKey = args.key ?? process.env['PAGCI_API_KEY'];
  if (!apiKey) {
    console.log();
    console.log(`  ${c.red}${c.bold}✗${c.reset} ${c.red}Missing API key.${c.reset}`);
    console.log(`  ${c.dim}Set PAGCI_API_KEY env or use --key <key>${c.reset}`);
    console.log();
    process.exit(1);
  }

  const session = await listen(apiKey, {
    port: args.port ? parseInt(args.port, 10) : undefined,
    path: args.path ?? '/',
    events: args.events ? args.events.split(',') : ['*'],
  });

  // Graceful shutdown
  const shutdown = (): void => {
    session.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(`  ${c.red}${err.message}${c.reset}`);
  process.exit(1);
});
