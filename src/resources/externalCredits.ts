// ── ExternalCredits resource — Phase 105 closure (quick-260427-pk4) ──

import type { RequestSender } from '../requestSender.js';
import type {
  ExternalCredit,
  ExternalCreditListParams,
  ExternalCreditListResponse,
} from '../types/index.js';
import type { ListResponse } from '../types/common.js';
import { Page } from '../pagination.js';
import { buildQueryString } from '../querystring.js';

/**
 * ExternalCredits resource — receiver-side historical reconciliation
 * of cross-owner credits received via SplitGrant (Phase 105 D-20b).
 *
 * Complements the real-time `payment.paid` webhook: the webhook is
 * push (volatile, can be missed); this is pull (durable, idempotent).
 *
 * Single method: `list({ cursor, limit })` → `Page<ExternalCredit>`.
 *
 * ### Privacy (D-19)
 *
 * The payer's real api_owner is NEVER returned. Each row exposes
 * `payer_owner_masked` — a deterministic SHA256-derived opaque token
 * scoped to the viewing receiver. Same payer + same receiver ⇒ same
 * token (correlate-but-not-identify across rows). Different receivers
 * see different tokens for the same payer (no cross-tenant
 * correlation possible).
 *
 * ### Auth
 *
 * Scope `payments:read`. Standard access tokens are rejected at the
 * middleware layer (credits are owner-scoped, not wallet-scoped — a
 * wallet-bound token would have ambiguous read scope across receiver's
 * wallets).
 *
 * ### Pagination
 *
 * Cursor-based on payment `_id` (descending). Each page returns rows
 * from up to `limit` distinct payments. A payment with multiple
 * external_split recipients to the same receiver emits multiple rows.
 * Worst-case page size = `limit × 5` (Phase 105 D-02 caps at 5
 * grants per payment).
 */
export class ExternalCreditsResource {
  constructor(private readonly sender: RequestSender) {}

  /**
   * List historical cross-owner credits, newest first.
   *
   * Returns a `Page<ExternalCredit>` that supports async iteration
   * (`for await`), manual page navigation, and `autoPagingToArray()`.
   *
   * Empty result is `{ data: [], meta: { per_page, next_cursor: '' } }`
   * — never an error. A receiver who has not received any cross-owner
   * credits yet sees an empty list, not a 404.
   */
  list(params?: ExternalCreditListParams): Page<ExternalCredit> {
    return new Page((cursor) => {
      const query = buildQueryString({ ...params, cursor });
      return this.sender
        .request<ExternalCreditListResponse>(
          'GET',
          `/external-credits${query}`,
        )
        .then((res) => res as ListResponse<ExternalCredit>);
    });
  }
}
