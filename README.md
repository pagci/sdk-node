<div align="center">

<br/>

<h1>@pagci/node</h1>

<p>SDK oficial para integração com a plataforma de pagamentos PIX PAGCI.</p>

<a href="https://docs.pagci.com">Documentação</a> · <a href="https://docs.pagci.com/webhooks">Webhooks</a> · <a href="https://docs.pagci.com/errors">Errors</a> · <a href="https://github.com/pagci/sdk-node/issues">Issues</a>

<br/>
<br/>

<a href="https://www.npmjs.com/package/@pagci/node"><img src="https://img.shields.io/npm/v/@pagci/node?style=flat-square&color=06B6D4" alt="npm" /></a>&nbsp;&nbsp;<a href="https://www.npmjs.com/package/@pagci/node"><img src="https://img.shields.io/npm/dm/@pagci/node?style=flat-square&color=06B6D4" alt="downloads" /></a>&nbsp;&nbsp;<a href="https://github.com/pagci/sdk-node/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@pagci/node?style=flat-square&color=06B6D4" alt="license" /></a>&nbsp;&nbsp;<img src="https://img.shields.io/badge/deps-0-06B6D4?style=flat-square" alt="zero deps" />

<br/>
<br/>

</div>

```bash
npm install @pagci/node
```

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

> Todos os valores são `number` em **centavos**. `4990` = R$ 49,90.

---

### Paginar resultados

```typescript
for await (const p of pagci.payments.list({ status: 'confirmed' })) {
  console.log(p.id, p.pix_total);
}

// ou colete com limite
const batch = await pagci.payments.list().autoPagingToArray({ limit: 100 });
```

---

### Saques

```typescript
const w = await pagci.withdrawals.create({
  wallet_id: 'wallet_main',
  amount: 10000,
  pix_key: 'email@example.com',
  pix_key_type: 'email',
});
```

---

### Testar webhooks localmente

```bash
npx @pagci/node listen --port 3000
```

```
  ⚡ PAGCI  Webhook Listener
  ────────────────────────────────────────────────────
  Tunnel    https://xyz.trycloudflare.com
  Forward   http://localhost:3000
  Provider  cloudflared
  Status    ● Ready
  ────────────────────────────────────────────────────

  14:32:01  →  payment.confirmed       pay_01jx...  200  23ms
  14:32:05  →  withdrawal.settled      wdrl_01jx... 200  12ms
```

O SDK detecta automaticamente qual tunnel usar. Instale um:

<details>
<summary>Opções de tunnel (por ordem de facilidade)</summary>
<br/>

**1. localtunnel** — mais fácil, só npm

```bash
npm install localtunnel
```

**2. cloudflared** — mais estável, sem conta

```bash
# macOS
brew install cloudflared

# Windows
choco install cloudflared

# Linux (Debian/Ubuntu)
sudo apt install cloudflared
```

**3. ngrok** — requer conta gratuita

```bash
# macOS
brew install ngrok

# Windows
choco install ngrok

# Linux
snap install ngrok

# Setup (uma vez)
ngrok config add-authtoken <seu_token>  # pegar em dashboard.ngrok.com
```

</details>

Use a URL do tunnel como `overwrite_webhook_url` ao criar pagamentos:

```typescript
const session = await listen('sua_api_key', { port: 3000 });

await pagci.payments.create({
  // ...
  config: { overwrite_webhook_url: session.url },
});
```

---

### Verificar assinatura de webhooks

```typescript
app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const event = pagci.webhooks.constructEvent(
    req.body.toString(),
    req.headers['x-webhook-signature'],
    'whsec_...',
  );

  if (event.payload.event === 'payment.confirmed') {
    const payment = event.payload.data;
    // payment é tipado como Payment
  }

  res.sendStatus(200);
});
```

<details>
<summary>Eventos disponíveis</summary>
<br/>

`payment.confirmed` · `payment.failed` · `payment.cancelled` · `payment.expired` · `withdrawal.settled` · `withdrawal.failed` · `refund.completed`

</details>

---

### Erros tipados

```typescript
import { ValidationError, InsufficientBalanceError } from '@pagci/node';

try {
  await pagci.payments.create({ /* ... */ });
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.code, err.field);
  }
}
```

<details>
<summary>Hierarquia de erros</summary>
<br/>

`AuthenticationError` · `ForbiddenError` · `NotFoundError` · `ValidationError` · `ConflictError` · `InsufficientBalanceError` · `RateLimitError` · `ApiError` · `ConnectionError` · `TimeoutError` · `SignatureVerificationError`

Todos seguem [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) — `type`, `title`, `status`, `code`, `detail`, `field`.

</details>

---

### Configuração

```typescript
const pagci = new Pagci('sua_api_key', {
  maxRetries: 2,    // backoff exponencial + jitter
  timeout: 30_000,  // ms
});
```

Retry automático em erros de rede, 429 e 5xx. POST financeiro só faz retry com `Idempotency-Key` — gerada automaticamente em `payments.create()` e `withdrawals.create()`.

---

<div align="center">

Node.js 18+ · Zero dependências · 86 testes · TCP keep-alive

<br/>

<a href="https://docs.pagci.com">Documentação →</a>

<br/>
<br/>

</div>
