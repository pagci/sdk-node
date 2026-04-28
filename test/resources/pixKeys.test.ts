// quick-260428-o4g — POST /pix-keys/lookup SDK contract tests.
//
// Mirrors the externalCredits + splitGrants test pattern: a MockRequestSender
// captures HTTP calls + serves fixture responses; the resource is asserted
// against the captured frame (method/path/body) and the typed return shape.

import { describe, it, expect, beforeEach } from 'vitest';
import { PixKeysResource } from '../../src/resources/pixKeys.js';
import type { RequestSender } from '../../src/requestSender.js';
import type {
  LookupPixKeyResponse,
  Receiver,
} from '../../src/types/index.js';
import { ErrorCode } from '../../src/types/index.js';
import { ApiError } from '../../src/errors.js';

// ── Mock RequestSender ────────────────────────────────────────────────

interface CapturedCall {
  method: string;
  path: string;
  body: unknown;
  options: unknown;
}

class MockRequestSender {
  calls: CapturedCall[] = [];
  fixtures: unknown[] = [];
  errors: unknown[] = [];

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: unknown,
  ): Promise<T> {
    this.calls.push({ method, path, body, options });
    if (this.errors.length > 0) {
      throw this.errors.shift();
    }
    const next = this.fixtures.shift();
    return (next ?? {}) as T;
  }
}

function resource(mock: MockRequestSender): PixKeysResource {
  return new PixKeysResource(mock as unknown as RequestSender);
}

// ── Tests ───────────────────────────────────────────────────────────

describe('PixKeysResource.lookup', () => {
  let mock: MockRequestSender;

  beforeEach(() => {
    mock = new MockRequestSender();
  });

  it('issues POST /pix-keys/lookup with the correct body and returns the typed receiver', async () => {
    const pix = resource(mock);
    const receiver: Receiver = {
      name: 'JOAO DA SILVA',
      document: '***456789**',
      pix_key: 'hake@a.org',
      bank: { name: 'BB', code: '1', ispb: '00000000', logo_url: 'https://x/y.png' },
    };
    const fixture: LookupPixKeyResponse = {
      valid: true,
      key: 'hake@a.org',
      key_type: 'email',
      receiver,
      psp_used: 'cartwave',
      from_cache: false,
    };
    mock.fixtures.push(fixture);

    const res = await pix.lookup({ key: 'hake@a.org', key_type: 'email' });

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('POST');
    expect(mock.calls[0].path).toBe('/pix-keys/lookup');
    expect(mock.calls[0].body).toEqual({ key: 'hake@a.org', key_type: 'email' });

    expect(res.valid).toBe(true);
    expect(res.receiver?.name).toBe('JOAO DA SILVA');
    expect(res.receiver?.bank?.ispb).toBe('00000000');
    expect(res.psp_used).toBe('cartwave');
    expect(res.from_cache).toBe(false);
  });

  it('omits receiver when valid=false (DICT-NXKEY is NOT an error)', async () => {
    const pix = resource(mock);
    const fixture: LookupPixKeyResponse = {
      valid: false,
      key: 'ghost@nowhere.com',
      key_type: 'email',
      from_cache: true,
    };
    mock.fixtures.push(fixture);

    const res = await pix.lookup({ key: 'ghost@nowhere.com', key_type: 'email' });

    expect(res.valid).toBe(false);
    expect(res.receiver).toBeUndefined();
    expect(res.from_cache).toBe(true);
  });

  it('propagates 503 pix_lookup_all_psps_failed via ApiError', async () => {
    const pix = resource(mock);
    mock.errors.push(
      new ApiError({
        message: 'pix lookup: all PSPs failed',
        type: 'https://docs.pagci.com/errors/pix_lookup_all_psps_failed',
        title: 'Pix Lookup All PSPs Failed',
        status: 503,
        code: ErrorCode.PixLookupAllPSPsFailed,
      }),
    );

    await expect(
      pix.lookup({ key: 'x@y.com', key_type: 'email' }),
    ).rejects.toMatchObject({ status: 503, code: ErrorCode.PixLookupAllPSPsFailed });
  });

  it('propagates 503 pix_lookup_no_provider via ApiError', async () => {
    const pix = resource(mock);
    mock.errors.push(
      new ApiError({
        message: 'pix lookup: no PSP with capability',
        type: 'https://docs.pagci.com/errors/pix_lookup_no_provider',
        title: 'Pix Lookup No Provider',
        status: 503,
        code: ErrorCode.PixLookupNoProvider,
      }),
    );

    await expect(
      pix.lookup({ key: 'x@y.com', key_type: 'email' }),
    ).rejects.toMatchObject({ status: 503, code: ErrorCode.PixLookupNoProvider });
  });
});
