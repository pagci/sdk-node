const { Pagci, listen, printQR } = require('./dist/cjs/index.js');

const API_KEY = process.env.PAGCI_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl9pZCI6InRva18wMWttdjdkeGJqZzJkcTJneXB5OXJ2djVqOSIsInR5cGUiOiJsb2dpbiIsInVzZXJfaWQiOiJ1c3JfMDFrbXF0ZWE5N2M0ZXJ6OGp6czZ4cWg1NnIiLCJhZG1pbiI6dHJ1ZSwibGFzdF91cGRhdGVkIjoiMjAyNi0wMy0yN1QxNDoxNjoxNy40NDdaIiwidG9rZW5fbGFzdF91cGRhdGVkIjoiMjAyNi0wMy0yOFQyMjowMDo1OC45OTRaIiwic2NvcGVzIjpbImFsbCJdLCJleHAiOjE4MDYyNzEyNTgsImlhdCI6MTc3NDczNTI1OH0.z_D7iiPV8tyI80kWgmULxUqDibziW5YrgGiYDSaS5Eg';

async function main() {
  const pagci = new Pagci(API_KEY);

  // 1. Start tunnel with verbose mode
  let webhookReceived = false;
  const session = await listen(API_KEY, {
    port: 4500,
    verbose: true,
    onEvent: (event) => {
      webhookReceived = true;
    },
  });

  // 2. Create payment R$0.01
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
  console.log('  Waiting 120s for webhook...');

  // 4. Wait
  const start = Date.now();
  while (Date.now() - start < 120000) {
    if (webhookReceived) {
      console.log('  Webhook arrived after', Math.round((Date.now() - start) / 1000), 's');
      break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!webhookReceived) console.log('  No webhook in 120s');

  await session.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
