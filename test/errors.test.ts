import { describe, it, expect } from 'vitest';
import {
  errorFromResponse,
  PagciError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InsufficientBalanceError,
  RateLimitError,
  ApiError,
  SignatureVerificationError,
  ConnectionError,
  TimeoutError,
} from '../src/errors.js';

// ── RFC 9457 body helper ─────────────────────────────────────────────

function rfc9457Body(overrides: Record<string, unknown> = {}) {
  return {
    type: 'https://api.pagci.com/errors/test',
    title: 'Test Error',
    status: 400,
    detail: 'Something went wrong',
    code: 'test_error',
    field: 'amount',
    ...overrides,
  };
}

const defaultHeaders: Record<string, string> = {
  'x-request-id': 'req_abc123',
};

// ── errorFromResponse status mapping ─────────────────────────────────

describe('errorFromResponse', () => {
  it('maps 400 to ValidationError', () => {
    const err = errorFromResponse(400, rfc9457Body({ status: 400 }), defaultHeaders);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toBeInstanceOf(PagciError);
    expect(err.status).toBe(400);
  });

  it('maps 401 to AuthenticationError', () => {
    const err = errorFromResponse(401, rfc9457Body({ status: 401 }), defaultHeaders);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.status).toBe(401);
  });

  it('maps 403 to ForbiddenError', () => {
    const err = errorFromResponse(403, rfc9457Body({ status: 403 }), defaultHeaders);
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.status).toBe(403);
  });

  it('maps 404 to NotFoundError', () => {
    const err = errorFromResponse(404, rfc9457Body({ status: 404 }), defaultHeaders);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.status).toBe(404);
  });

  it('maps 409 to ConflictError', () => {
    const err = errorFromResponse(409, rfc9457Body({ status: 409 }), defaultHeaders);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.status).toBe(409);
  });

  it('maps 422 to InsufficientBalanceError', () => {
    const body = rfc9457Body({
      status: 422,
      code: 'insufficient_balance',
      detail: 'Insufficient wallet balance',
    });
    const err = errorFromResponse(422, body, defaultHeaders);
    expect(err).toBeInstanceOf(InsufficientBalanceError);
    expect(err.status).toBe(422);
    expect(err.code).toBe('insufficient_balance');
  });

  it('maps 429 to RateLimitError', () => {
    const err = errorFromResponse(429, rfc9457Body({ status: 429 }), defaultHeaders);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.status).toBe(429);
  });

  it('maps 500 to ApiError', () => {
    const err = errorFromResponse(500, rfc9457Body({ status: 500 }), defaultHeaders);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
  });

  it('maps unknown 5xx to ApiError', () => {
    const err = errorFromResponse(503, rfc9457Body({ status: 503 }), defaultHeaders);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(503);
  });

  // ── RFC 9457 field extraction ────────────────────────────────────

  it('extracts all RFC 9457 fields from body', () => {
    const body = rfc9457Body();
    const err = errorFromResponse(400, body, defaultHeaders);

    expect(err.type).toBe('https://api.pagci.com/errors/test');
    expect(err.title).toBe('Test Error');
    expect(err.status).toBe(400);
    expect(err.code).toBe('test_error');
    expect(err.field).toBe('amount');
    expect(err.message).toBe('Something went wrong');
    expect(err.requestId).toBe('req_abc123');
    expect(err.rawResponse).toEqual(body);
  });

  // ── Defensive handling of non-object body ────────────────────────

  it('handles null body gracefully', () => {
    const err = errorFromResponse(500, null, {});
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Request failed with status 500');
    expect(err.type).toBe('about:blank');
    expect(err.code).toBe('unknown');
  });

  it('handles string body gracefully', () => {
    const err = errorFromResponse(500, 'Internal Server Error', {});
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Request failed with status 500');
  });

  it('uses "message" field when "detail" is absent', () => {
    const body = { message: 'Fallback message' };
    const err = errorFromResponse(400, body, {});
    expect(err.message).toBe('Fallback message');
  });

  // ── instanceof chain ─────────────────────────────────────────────

  it('all error subclasses are instanceof PagciError', () => {
    const classes = [
      ValidationError,
      AuthenticationError,
      ForbiddenError,
      NotFoundError,
      ConflictError,
      InsufficientBalanceError,
      RateLimitError,
      ApiError,
    ] as const;

    for (const Cls of classes) {
      const err = new Cls({ message: 'test', status: 400 });
      expect(err).toBeInstanceOf(PagciError);
      expect(err).toBeInstanceOf(Error);
    }
  });

  // ── Specialized error constructors ───────────────────────────────

  it('SignatureVerificationError has correct code and status 0', () => {
    const err = new SignatureVerificationError('bad sig');
    expect(err).toBeInstanceOf(PagciError);
    expect(err.status).toBe(0);
    expect(err.code).toBe('signature_verification_failed');
    expect(err.message).toBe('bad sig');
  });

  it('ConnectionError has status 0 and preserves cause', () => {
    const cause = new Error('ECONNRESET');
    const err = new ConnectionError('Connection failed', cause);
    expect(err).toBeInstanceOf(PagciError);
    expect(err.status).toBe(0);
    expect(err.code).toBe('connection_error');
    expect(err.cause).toBe(cause);
  });

  it('TimeoutError includes timeout in message', () => {
    const err = new TimeoutError(5000);
    expect(err).toBeInstanceOf(PagciError);
    expect(err.status).toBe(0);
    expect(err.code).toBe('timeout');
    expect(err.message).toContain('5000');
  });

  // ── .name property ───────────────────────────────────────────────

  it('error .name matches class name', () => {
    expect(new ValidationError({ message: 'x', status: 400 }).name).toBe('ValidationError');
    expect(new AuthenticationError({ message: 'x', status: 401 }).name).toBe('AuthenticationError');
    expect(new RateLimitError({ message: 'x', status: 429 }).name).toBe('RateLimitError');
    expect(new ApiError({ message: 'x', status: 500 }).name).toBe('ApiError');
  });
});
