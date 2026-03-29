#!/usr/bin/env node

/**
 * PAGCI CLI — Local webhook testing.
 *
 * Usage:
 *   npx @pagci/node listen
 *   npx @pagci/node listen --port 3000
 *   PAGCI_API_KEY=pk_... npx @pagci/node listen
 */

import { listen } from './listen.js';

const c = {
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  dim:   '\x1b[2m',
  cyan:  '\x1b[36m',
  red:   '\x1b[31m',
} as const;

function printHelp(): void {
  console.log();
  console.log(`  ${c.cyan}${c.bold}⚡ PAGCI CLI${c.reset}`);
  console.log();
  console.log(`  ${c.bold}Usage${c.reset}`);
  console.log(`    ${c.dim}npx @pagci/node listen${c.reset}              Log events`);
  console.log(`    ${c.dim}npx @pagci/node listen --port 3000${c.reset}  Custom port`);
  console.log();
  console.log(`  ${c.bold}Options${c.reset}`);
  console.log(`    --port <n>     Port to listen on (default: 4400)`);
  console.log(`    --key <key>    API key (or set PAGCI_API_KEY)`);
  console.log();
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('--') && i + 1 < args.length) {
      result[arg.slice(2)] = args[++i]!;
    } else if (!arg.startsWith('--')) {
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

  const session = await listen(apiKey, {
    port: args['port'] ? parseInt(args['port'], 10) : undefined,
  });

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
