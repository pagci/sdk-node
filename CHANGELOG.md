# pagci-node — Changelog

This changelog covers integrator-facing changes only — runtime API contract,
SDK type signatures, error codes, webhook events. Internal refactors that
do not affect the npm consumer are not listed.

## 2.0.1 — 2026-04-28 — Pix-key lookup response slimmed (quick-260428-wv4)

### What changed

The `POST /pix-keys/lookup` 200 OK response shape lost two fields:

- `psp_used` — string, removed.
- `from_cache` — boolean, removed.

The remaining shape is `{ valid, key, key_type, receiver? }`.

### Why

Parity with the rest of the financial surface — `POST /payments` and
`POST /withdrawals` only expose routing/PSP information to admin contexts
(via the `Liquidator` view, which is `json:"-"` in non-admin code paths).
The lookup endpoint shipped in `2.0.0` (Phase 106 sibling release)
accidentally surfaced the routing info to all callers. This release
brings it in line. Reduces attack surface for cache-timing inference and
PSP-fingerprinting against DICT key resolution.

### Compat

The `pix-keys/lookup` endpoint went live <24h before this release; there
are no known external consumers reading `psp_used` or `from_cache`. SDK
consumers reading those fields will get `undefined` post-upgrade — this
is a BREAKING change in the strictest TypeScript sense, but practically
a no-op.

### Migration

If your code reads `result.psp_used` or `result.from_cache`, remove those
reads. Operational visibility into which PSP answered lives in the
backend's structured logs and is exposed to admins only.

## 2.0.0 — 2026-04-27 — Phase 106 Gift PIX Short-Link Resolver

### Why this release exists

Replaces the v1.x magic link (URL fragment containing the entire JWT,
~300 characters) with a Discord-style short link (`/gift/<16-char-code>`,
~50 characters total). The short link is family-friendly:

- WhatsApp / iMessage previews unfurl correctly (no more truncation
  mid-token).
- SMS fits in a single 160-char message (Brazil — no more split URLs).
- QR codes scan reliably on small screens (low density).
- The URL no longer looks "spammy" or phishing-like to recipients.

The bearer JWT is now minted on demand by a NEW endpoint
`POST /gift/resolve` when the recipient opens the magic link in their
browser. The 16-char public code lives transitively in the URL; only its
SHA-256 hash is persisted in the backend (mirrors the existing
`AccessToken.KeyPreview` precedent — DB compromise yields no usable codes).

See `.planning/GIFT-PIX-DESIGN.md` v3 in the backend repo for the full
design rationale, security analysis, and the 12 anti-pitfalls captured
during the Claydis TRIPLE design discussion (Claude + Codex + Gemini,
6 cross-review verdicts).

### BREAKING — Response shapes (NO COMPAT WINDOW)

This is a BREAKING change with no graceful degradation: rolling back the
backend forces a rollback of the frontend, and vice versa. Coordinate
the release. The atomic-break decision is documented in
`.planning/GIFT-PIX-DESIGN.md` v3 (backend repo) under
GIFT-LINK-COMPAT-01.

#### `gifts.create()` and `gifts.regenerateLink()`

**Before (v1.x):**

```typescript
{
  payment_id: 'pay_01jx...',
  status: 'pending',
  amount_cents: 10000,
  origin: 'gift_pix',
  access_token: 'eyJhbGc...',                    // ← DROPPED
  expires_at: '2026-04-27T15:30:00.000Z',        // ← was bearer's TTL (30min)
  qr_code: '00020126...',
}
```

**After (v2.0.0):**

```typescript
{
  payment_id: 'pay_01jx...',
  status: 'pending',
  amount_cents: 10000,
  origin: 'gift_pix',
  gift_path: '/gift/aB3cD9eF2gH4iJ7k',           // ← NEW (relative path)
  expires_at: '2026-05-04T18:00:00.000Z',        // ← now the LINK expiry (e.g. 7 days)
  qr_code: '00020126...',
}
```

The frontend constructs the full magic link by prefixing its own origin:

```typescript
const fullURL = `${window.location.origin}${response.gift_path}`;
// e.g. "https://app.misticpay.com.br/gift/aB3cD9eF2gH4iJ7k"
```

The backend has zero knowledge of the merchant's domain — the frontend
OWNS the URL construction. This preserves the existing `GIFT-SEC-01`
invariant from the backend design doc (`.planning/GIFT-PIX-DESIGN.md`).

#### `gifts.get()` (`GET /gift`)

The response shape is UNCHANGED, but the semantic source of `expires_at`
migrated from the bearer JWT (30-min TTL) to the LINK's expiry
(potentially days/weeks per `link_expires_in_seconds` at create time).

Without this migration, the bearer-facing UI would falsely display
"expires in 30 minutes" for a gift that lasts a week. No client-side
code change is required — only the displayed value will look different
(longer-lived, as intended).

#### `gifts.revoke()`

The internal mechanism changed: instead of revoking access_tokens, the
backend now nullifies the `gift_metadata.link` subdoc. Bearer JWTs
already minted via past `gifts.resolve()` calls continue to live up to
30 minutes via the natural JWT expiry (cleaned up by a new TTL index
on `access_tokens.expires_at`).

Response shape UNCHANGED: `{ revoked_at, revoked_count }`. Idempotency
preserved — calling revoke twice returns `revoked_count: 0` on the
second call (Link was already nil).

### Added — `gifts.resolve()`

NEW method maps to `POST /gift/resolve`. Trades the public 16-char code
(extracted from the magic link path by the frontend) for an ephemeral
30-minute bearer JWT.

```typescript
import { Pagci, ErrorCode } from 'pagci-node';

// No API key required for resolve — instantiate without auth.
const anon = new Pagci();
const { access_token, expires_at } = await anon.gifts.resolve({
  code: 'aB3cD9eF2gH4iJ7k',
});

// Use the bearer for subsequent calls (gifts.get, withdrawals.create):
const authed = new Pagci({ apiKey: access_token });
const giftView = await authed.gifts.get();
```

**Anti-enumeration:** every failure path (missing code, expired code,
malformed code, INCLUDING malformed JSON / wrong-type fields / empty
body) returns an IDENTICAL `404 gift_code_not_found` body — bytes equal.
Treat any 404 as "code unusable; ask the user to re-paste or contact the
sender" — do NOT branch on the failure mode. The failure mode is
deliberately unobservable to a client (and to an attacker probing for
codes).

**Rate limit:** enforced primarily at the Cloudflare edge (30 req/min
per IP + threat-score block). If your frontend issues retry-on-blur or
similar patterns, add client-side debouncing — repeated bursts will be
blocked by the edge before reaching the SDK.

**Cache-Control:** the server emits `Cache-Control: no-store, private`
(plus `Pragma: no-cache` for HTTP/1.0 fallback) on BOTH success and
failure paths. The default `fetch` honours this. Do NOT layer a custom
HTTP cache or store the JWT in a service worker cache — the JWT is an
ephemeral session token and must not be cached by anyone.

### Added — `ErrorCode.GiftCodeNotFound`

New entry: `'gift_code_not_found'`. Sole error code for resolve
failures (anti-enumeration enforces this). Type-safe consumption:

```typescript
try {
  await pagci.gifts.resolve({ code });
} catch (err) {
  if (err.code === ErrorCode.GiftCodeNotFound) {
    showToast('This gift link is no longer valid.');
  } else {
    showToast('Network error — please try again.');
  }
}
```

### Migration Checklist

- [ ] Replace reads of `response.access_token` on the create + regenerateLink
      call sites with reads of `response.gift_path`.
- [ ] Construct full URLs from `gift_path` using your origin
      (e.g. `${origin}${gift_path}`). The backend deliberately does not
      know your domain.
- [ ] Update the bearer flow: instead of consuming the token from the
      create response, render the magic link and let the recipient's
      browser POST `/gift/resolve` to mint the JWT on demand.
- [ ] If you display "expires in X" on the bearer-facing view, use
      `gifts.get().expires_at` — the source migrated to the link's
      longer-term expiry; the value will look different (longer) for
      gifts created with a multi-day `link_expires_in_seconds`.
- [ ] Add `ErrorCode.GiftCodeNotFound` handling on the resolve path.
- [ ] Coordinate the deploy: SDK v2.0.0 → frontend v2.0.0 → backend
      Phase 106. NO graceful degradation; rolling back the backend
      requires rolling back the frontend.

### Internal — no client-facing impact

These changes are documented for completeness but do not affect SDK
consumers:

- SHA-256 hash-at-rest in `payment.gift_metadata.link.code_hash` (raw
  16-char code never persisted).
- Partial unique index `gift_link_code_hash_unique` in MongoDB on
  `payments.gift_metadata.link.code_hash` (filter: field exists).
- TTL index `expires_at_ttl` on `access_tokens.expires_at` for
  ephemeral-token cleanup (`expireAfterSeconds: 0`).
- Cloudflare edge rule documented in
  `deploy/CLOUDFLARE_RULES.md` (provisioned via dashboard or terraform).
- Redis cache stub at `internal/adapter/redis/gift_resolve_cache.go`
  — flag `GIFT_RESOLVE_CACHE_ENABLED` default OFF; turn on only if a
  load test shows Mongo as the resolve bottleneck. Stub fail-degrades on
  accidental wiring (returns "cache miss" for every call) so a future
  test misconfiguration does not crash the test runner.

---
