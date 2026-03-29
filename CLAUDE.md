# @pagci/node — SDK Node.js

SDK oficial para a API PAGCI. Zero dependências runtime. Node 18+.

## Critical Rules

1. ALL money is `number` in **centavos** (integer). NEVER use float. `4990` = R$ 49,90.
2. NEVER retry POST without `Idempotency-Key`. Financial safety is non-negotiable.
3. Webhook HMAC must match Go's `SignWebhookPayload` EXACTLY: `HMAC-SHA256(secret, "{timestamp}.{payload}")`.
4. TCP keep-alive is ON by default via `https.Agent` singleton. Never disable.
5. Zero runtime dependencies. Use only `node:http`, `node:https`, `node:crypto`.
6. Dual CJS + ESM output via `tsc` pure (no bundler).

## Architecture

```
src/
  client.ts          — Pagci class (lazy resource getters, webhook verification)
  requestSender.ts   — HTTP engine (auth, retry, error mapping, response metadata)
  retry.ts           — Exponential backoff + jitter, Retry-After respect
  idempotency.ts     — idem_{ulid} generation, stable across retries
  pagination.ts      — Page<T> AsyncIterable + autoPagingToArray
  errors.ts          — PagciError hierarchy (10 subclasses mapped by HTTP status)
  net/
    HttpClient.ts       — Abstract interface
    NodeHttpClient.ts   — node:https + Agent({keepAlive: true}) singleton
  crypto/
    CryptoProvider.ts   — Abstract (sign, verify, timingSafeEqual)
    NodeCryptoProvider.ts — node:crypto implementation
  resources/           — One file per API domain (payments, withdrawals, etc.)
  types/               — TypeScript types matching cmd/specgen/types.go
```

## Source of Truth

Types MUST match the API backend. Sources:

| SDK File | Backend Source |
|----------|---------------|
| `types/payment.ts` | `cmd/specgen/types.go` (PaymentView, RecipientView, etc.) |
| `types/withdrawal.ts` | `cmd/specgen/types.go` (WithdrawalView = port.Withdrawal) |
| `types/error.ts` | `internal/handler/helpers.go:45-168` (errorMappings) |
| `types/webhook.ts` | `internal/domain/events.go:8-15` (webhook event constants) |
| `src/client.ts` (HMAC) | `internal/paymentview/webhook_envelope.go:109-116` |

When the backend changes:
- New endpoint → add method to corresponding resource in `src/resources/`
- Changed type → update `src/types/` to match `cmd/specgen/types.go`
- New error code → add to `ErrorCode` enum in `src/types/error.ts`
- New webhook event → add to `WebhookEvent` enum in `src/types/webhook.ts`

## Patterns

### Adding a new resource method

```typescript
// In src/resources/example.ts
async create(params: CreateExampleParams, options?: RequestOptions): Promise<ApiResponse<Example>> {
  return this.sender.request('POST', '/examples', params, {
    ...options,
    // Auto-generate idempotency key for financial create operations:
    idempotencyKey: options?.idempotencyKey ?? generateIdempotencyKey(),
  });
}
```

### Adding a list method with pagination

```typescript
list(params?: ExampleListParams): Page<Example> {
  return new Page((cursor) =>
    this.sender.request<ListResponse<Example>>('GET', '/examples', undefined, {
      query: { ...params, cursor },
    }),
  );
}
```

## Testing

```bash
npm test          # vitest run (86 tests)
npm run typecheck # tsc --noEmit
npm run build     # dual CJS + ESM
```

HMAC test vectors MUST be validated against the Go implementation. If `SignWebhookPayload` changes in the backend, update `test/webhooks.test.ts` immediately.

## Common Pitfalls

1. **Importing without `.js` extension** — ESM requires explicit extensions: `import { X } from './file.js'`
2. **Using `any` in public API** — Use `unknown` or specific types. `any` only in `_response.headers`.
3. **Retry on POST without idem key** — `shouldRetry()` in `retry.ts` blocks this. Never bypass.
4. **Forgetting to update ErrorCode enum** — Backend has 96+ codes. Run `/sync-sdk` to catch drift.
