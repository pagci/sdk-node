// ── PIX Keys (DICT lookup) ─────────────────────────────────────────
//
// quick-260428-o4g — POST /pix-keys/lookup. Multi-PSP DICT consultation
// behind the `pix_keys:lookup` scope. valid=false is an authoritative
// "this key does not exist in DICT" answer (NOT an error); receiver is
// then absent.
//
// quick-260428-wv4 — Routing metadata (which PSP answered, cache hit/miss)
// is intentionally NOT exposed on the response. Parity with payments and
// withdrawals where routing info is admin-only. Operational visibility
// lives in the backend's structured logs.

import type { Receiver } from './withdrawal.js';

/**
 * PIX key categories accepted by POST /pix-keys/lookup.
 *
 * Excludes `wallet` (which is internal-charge / refund vocabulary, not
 * a DICT-resolvable key class).
 */
export type LookupPixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

/** Request body for POST /pix-keys/lookup. */
export interface LookupPixKeyParams {
  /**
   * The PIX key to resolve. Format depends on `key_type`:
   * - cpf: 11 digits (mask is allowed; service strips non-digits)
   * - cnpj: 14 digits
   * - email: any valid e-mail (case-insensitive on the wire)
   * - phone: BR mobile (mask is allowed; service normalizes to "+55<digits>")
   * - random: UUID v4
   */
  key: string;
  key_type: LookupPixKeyType;
}

/**
 * 200 OK response from POST /pix-keys/lookup.
 *
 * `valid=false` is an AUTHORITATIVE DICT-NXKEY answer — not an error.
 * `receiver` is omitted in that case.
 *
 * Routing metadata (which PSP answered, cache hit/miss) is intentionally
 * NOT exposed — parity with payments/withdrawals where routing info is
 * admin-only (quick-260428-wv4).
 */
export interface LookupPixKeyResponse {
  valid: boolean;
  key: string;
  key_type: LookupPixKeyType;
  receiver?: Receiver;
}
