/**
 * End-to-end webhook tunnel test.
 *
 * Usage:
 *   PAGCI_API_KEY=your_key node test-tunnel.cjs
 *   PAGCI_API_KEY=your_key node test-tunnel.cjs --port 3000
 */

const { Pagci, listen, printQR } = require('./dist/cjs/index.js');

const TIMEOUT_MS = 180_000; // 3 minutes

const API_KEY = process.env.PAGCI_API_KEY;
if (!API_KEY) {
  console.error('  Set PAGCI_API_KEY environment variable.');
  process.exit(1);
}

const port = (() => {
  const idx = process.argv.indexOf('--port');
  return idx !== -1 && process.argv[idx + 1] ? parseInt(process.argv[idx + 1], 10) : 4500;
})();

async function main() {
  const pagci = new Pagci(API_KEY);

  // 1. Start tunnel with verbose mode
  let webhookReceived = false;
  const session = await listen(API_KEY, {
    port,
    verbose: true,
    onEvent: () => { webhookReceived = true; },
  });

  // 2. Create payment (minimum value)
  const payment = await pagci.payments.create({
    owner: { wallet_id: 'icaro' },
    customer: { id: 'pix_test', document: '12345678900' },
    items: [{ name: 'Teste SDK', id: 'sdk_test', value: 1 }],
    recipients: [{ wallet_id: 'icaro', amount: 1 }],
    config: { overwrite_webhook_url: session.url },
  });

  console.log('');
  console.log('  Payment:', payment.id);
  console.log('  PIX Total: R$', (payment.pix_total / 100).toFixed(2));
  console.log('');

  // 3. Show QR code in terminal
  const pixQR = payment.liquidator?.pix_qr;
  if (pixQR) {
    console.log('  ===== PIX COPIA E COLA =====');
    console.log('');
    console.log(' ', pixQR);
    console.log('');
    await printQR(pixQR);
    console.log('  ============================');
  }

  console.log('');
  console.log('  Waiting', TIMEOUT_MS / 1000, 's for webhook...');

  // 4. Wait
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    if (webhookReceived) {
      console.log('  Webhook arrived after', Math.round((Date.now() - start) / 1000), 's');
      break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!webhookReceived) console.log('  No webhook in', TIMEOUT_MS / 1000, 's');

  await session.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
