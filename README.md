<div align="center">

<br/>

<h1>@pagci/node</h1>

<p><strong>SDK oficial para integração com a plataforma de pagamentos PIX PAGCI.</strong></p>

<p>
  <a href="https://docs.pagci.com"><strong>Documentação</strong></a> ·
  <a href="https://docs.pagci.com/webhooks"><strong>Webhooks</strong></a> ·
  <a href="https://docs.pagci.com/errors"><strong>Error Codes</strong></a> ·
  <a href="https://github.com/pagci/sdk-node/issues"><strong>Issues</strong></a>
</p>

<br/>

<p>
  <img src="https://img.shields.io/badge/PIX-Instant%C3%A2neo-06B6D4?style=for-the-badge" alt="PIX Instantâneo" />
  <img src="https://img.shields.io/badge/Split-N--way-0891B2?style=for-the-badge" alt="Split N-way" />
  <img src="https://img.shields.io/badge/Webhooks-HMAC--SHA256-0E7490?style=for-the-badge" alt="Webhooks HMAC" />
  <img src="https://img.shields.io/badge/Retry-Inteligente-155E75?style=for-the-badge" alt="Retry Inteligente" />
</p>

<p>
  <a href="https://www.npmjs.com/package/@pagci/node"><img src="https://img.shields.io/npm/v/@pagci/node?style=flat-square&color=06B6D4" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/@pagci/node"><img src="https://img.shields.io/npm/dm/@pagci/node?style=flat-square&color=06B6D4" alt="downloads" /></a>
  <a href="https://github.com/pagci/sdk-node/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@pagci/node?style=flat-square&color=06B6D4" alt="license" /></a>
  <img src="https://img.shields.io/badge/deps-zero-06B6D4?style=flat-square" alt="zero deps" />
</p>

<br/>

</div>

<table>
  <tr>
    <td align="center" width="25%">
      <br/>
      <strong>Pagamentos PIX</strong>
      <br/><br/>
      <sub>QR Code dinâmico com split automático para N recipientes. Liquidação em segundos.</sub>
      <br/><br/>
    </td>
    <td align="center" width="25%">
      <br/>
      <strong>Saques (Payouts)</strong>
      <br/><br/>
      <sub>PIX payout para qualquer chave. Idempotency automática. Settlement assíncrono via webhook.</sub>
      <br/><br/>
    </td>
    <td align="center" width="25%">
      <br/>
      <strong>Webhooks Seguros</strong>
      <br/><br/>
      <sub>HMAC-SHA256 com verificação timing-safe. Tipagem por evento. Replay protection.</sub>
      <br/><br/>
    </td>
    <td align="center" width="25%">
      <br/>
      <strong>Retry Seguro</strong>
      <br/><br/>
      <sub>Backoff exponencial + jitter. Nunca retry em POST financeiro sem idempotency key.</sub>
      <br/><br/>
    </td>
  </tr>
</table>

<br/>

## Instalar

```bash
npm install @pagci/node
```

<br/>

## Criar um pagamento PIX

```typescript
import { Pagci } from '@pagci/node';

const pagci = new Pagci('sua_api_key');

const payment = await pagci.payments.create({
  owner: { wallet_id: 'wallet_main' },
  customer: { id: 'cust_1', document: '12345678900' },
  items: [{ name: 'Assinatura mensal', id: 'sub_1', value: 4990 }],
  recipients: [{ wallet_id: 'wallet_main', amount: 4990 }],
});

console.log(payment.liquidator.pix_qr); // PIX copia e cola
```

> Todos os valores monetários são `number` em **centavos** (inteiro). `4990` = R$ 49,90.

<br/>

## Listar e paginar

```typescript
// Auto-pagination — itera por TODAS as páginas automaticamente
for await (const p of pagci.payments.list({ status: 'confirmed' })) {
  console.log(p.id, p.pix_total);
}

// Ou colete em array com limite de segurança
const recent = await pagci.payments
  .list({ status: 'confirmed' })
  .autoPagingToArray({ limit: 100 });
```

<br/>

## Saques

```typescript
const withdrawal = await pagci.withdrawals.create({
  wallet_id: 'wallet_main',
  amount: 10000,
  pix_key: 'email@example.com',
  pix_key_type: 'email',
});
// withdrawal.status → "pending"
// Liquidação é assíncrona — receba via webhook
```

<br/>

## Verificar webhooks

```typescript
app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const event = pagci.webhooks.constructEvent(
    req.body.toString(),
    req.headers['x-webhook-signature'],
    'whsec_seu_webhook_secret',
  );

  if (event.payload.event === 'payment.confirmed') {
    const payment = event.payload.data; // tipado como Payment
    console.log(`Pagamento ${payment.id} confirmado: R$ ${payment.pix_total / 100}`);
  }

  res.sendStatus(200);
});
```

<details>
<summary><strong>Todos os eventos disponíveis</strong></summary>

<br/>

| Evento | Quando |
|--------|--------|
| `payment.confirmed` | PIX confirmado pelo PSP |
| `payment.failed` | PIX rejeitado |
| `payment.cancelled` | Cancelado pelo usuário/sistema |
| `payment.expired` | QR code expirou |
| `withdrawal.settled` | Saque liquidado |
| `withdrawal.failed` | Saque falhou |
| `refund.completed` | Reembolso concluído |

</details>

<br/>

## Tratamento de erros

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
    // saldo insuficiente para saque
  }
}
```

<details>
<summary><strong>Hierarquia de erros</strong></summary>

<br/>

```
PagciError
├── AuthenticationError      (401)
├── ForbiddenError           (403)
├── NotFoundError            (404)
├── ValidationError          (400)
├── ConflictError            (409)
├── InsufficientBalanceError (422)
├── RateLimitError           (429)
├── ApiError                 (500+)
├── ConnectionError          (rede)
├── TimeoutError             (timeout)
└── SignatureVerificationError (HMAC)
```

Todos seguem [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) com campos `type`, `title`, `status`, `code`, `detail`, `field`.

</details>

<br/>

## Configuração

```typescript
const pagci = new Pagci('sua_api_key', {
  baseUrl: 'https://api.pagci.com',  // default
  maxRetries: 2,                      // default
  timeout: 30_000,                    // default (ms)
});
```

O SDK faz **retry automático** em erros de rede, 429 e 5xx com backoff exponencial + jitter. Respeita o header `Retry-After`. Requisições POST só fazem retry quando têm `Idempotency-Key` — o SDK gera automaticamente em `payments.create()` e `withdrawals.create()`.

<br/>

<div align="center">

<sub>Node.js 18+ · Zero dependências runtime · 86 testes · TCP keep-alive por default</sub>

<br/><br/>

<a href="https://docs.pagci.com"><strong>Documentação completa →</strong></a>

<br/><br/>

</div>
