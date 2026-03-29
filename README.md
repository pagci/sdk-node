<div align="center">

<h1>@pagci/node</h1>

<p>Node.js SDK for the PAGCI PIX payments API.</p>

<p>
  <a href="https://www.npmjs.com/package/@pagci/node"><img src="https://img.shields.io/npm/v/@pagci/node.svg?style=flat&color=06B6D4" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@pagci/node"><img src="https://img.shields.io/npm/dm/@pagci/node.svg?style=flat&color=06B6D4" alt="npm downloads"></a>
  <a href="https://github.com/pagci/sdk-node/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@pagci/node.svg?style=flat&color=06B6D4" alt="license"></a>
</p>

<p>
  <a href="https://docs.pagci.com">Documentation</a> · <a href="https://docs.pagci.com/webhooks">Webhooks</a> · <a href="https://github.com/pagci/sdk-node/issues">Issues</a>
</p>

</div>

<br/>

## Install

```bash
npm install @pagci/node
```

## Quick Start

```typescript
import { Pagci } from '@pagci/node';

const pagci = new Pagci('your_api_key');

const payment = await pagci.payments.create({
  owner: { wallet_id: 'wallet_main' },
  customer: { id: 'cust_1', document: '12345678900' },
  items: [{ name: 'Assinatura mensal', id: 'sub_1', value: 4990 }],
  recipients: [{ wallet_id: 'wallet_main', amount: 4990 }],
});

console.log(payment.id);                // "pay_01jx..."
console.log(payment.liquidator.pix_qr); // PIX copia e cola
```

## Payments

```typescript
// List with auto-pagination
for await (const p of pagci.payments.list({ status: 'confirmed' })) {
  console.log(p.id, p.pix_total);
}

// Or collect into array
const recent = await pagci.payments
  .list({ status: 'confirmed' })
  .autoPagingToArray({ limit: 100 });

// Get by ID
const payment = await pagci.payments.get('pay_01jx...');

// Refund
const refund = await pagci.payments.refund('pay_01jx...', {
  amount: 2500, // R$25.00 in centavos
});

// Release a held recipient
await pagci.payments.releaseRecipient('pay_01jx...', 'wallet_001');
```

## Withdrawals

```typescript
const withdrawal = await pagci.withdrawals.create({
  wallet_id: 'wallet_main',
  amount: 10000,   // R$100.00
  pix_key: 'email@example.com',
  pix_key_type: 'email',
});
// status: "pending" — settlement is async
```

## Balance

```typescript
const total = await pagci.balance.getTotal();
console.log(total.available); // 50000 (centavos)

const wallet = await pagci.balance.getWallet('wallet_main');
```

## Webhooks

Verify webhook signatures with HMAC-SHA256. The signing secret is returned when you authenticate.

```typescript
import express from 'express';
import { Pagci } from '@pagci/node';

const pagci = new Pagci('your_api_key');

app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const event = pagci.webhooks.constructEvent(
    req.body.toString(),
    req.headers['x-webhook-signature'] as string,
    'whsec_your_webhook_secret',
  );

  switch (event.payload.event) {
    case 'payment.confirmed':
      // event.payload.data is typed as Payment
      break;
    case 'withdrawal.settled':
      // event.payload.data is typed as Withdrawal
      break;
  }

  res.sendStatus(200);
});
```

Events: `payment.confirmed` · `payment.failed` · `payment.cancelled` · `payment.expired` · `withdrawal.settled` · `withdrawal.failed` · `refund.completed`

## Error Handling

```typescript
import { Pagci, ValidationError, InsufficientBalanceError } from '@pagci/node';

try {
  await pagci.payments.create({ /* ... */ });
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.code);  // "empty_field"
    console.log(err.field); // "owner.wallet_id"
  }

  if (err instanceof InsufficientBalanceError) {
    // wallet doesn't have enough funds
  }
}
```

All errors extend `PagciError` with RFC 9457 fields: `type`, `title`, `status`, `code`, `detail`, `field`.

## Configuration

```typescript
const pagci = new Pagci('your_api_key', {
  baseUrl: 'https://api.pagci.com',  // default
  maxRetries: 2,                      // default — exponential backoff with jitter
  timeout: 30_000,                    // default — ms
});
```

**Retries** are automatic for network errors, 429, and 5xx responses. POST requests only retry when an `Idempotency-Key` is present — the SDK generates one automatically for `payments.create()` and `withdrawals.create()`.

**All amounts** are `number` in centavos (integer). `4990` = R$49.90.

## Requirements

Node.js 18+. Zero runtime dependencies.

## License

MIT
