// ── PIX Keys (DICT lookup) resource ─────────────────────────────────
//
// quick-260428-o4g — POST /pix-keys/lookup. Multi-PSP DICT consultation
// behind the `pix_keys:lookup` scope. The lookup is read-only (no money
// flow, no DB write); the rate limit (30/min/user_id) is enforced at the
// API to bound real per-PSP cost.

import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type {
  LookupPixKeyParams,
  LookupPixKeyResponse,
} from '../types/index.js';

/**
 * Resolve PIX keys against the BACEN DICT registry.
 *
 * `valid=false` is an authoritative "this key does not exist" answer
 * (NOT an error) — `receiver` is then absent. Technical errors (every
 * PSP failed / no provider configured) surface as 503 with
 * `code=pix_lookup_all_psps_failed` or `pix_lookup_no_provider` (see
 * {@link ErrorCode}).
 */
export class PixKeysResource {
  constructor(private readonly sender: RequestSender) {}

  /**
   * Resolve a PIX key against DICT.
   *
   * @param params The PIX key + key type to resolve.
   * @param options Per-request overrides (timeout, etc.).
   * @returns DICT response with `valid`, optionally `receiver` + `psp_used` + `from_cache`.
   *
   * @example
   * ```ts
   * const { data } = await pagci.pixKeys.lookup({
   *   key: 'hake@a.org',
   *   key_type: 'email',
   * });
   * if (data.valid) {
   *   console.log(`Receiver: ${data.receiver?.name} (${data.receiver?.bank?.name})`);
   * } else {
   *   console.log('Key not registered in DICT');
   * }
   * ```
   */
  async lookup(
    params: LookupPixKeyParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<LookupPixKeyResponse>> {
    return this.sender.request<LookupPixKeyResponse>(
      'POST',
      '/pix-keys/lookup',
      params,
      options,
    );
  }
}
