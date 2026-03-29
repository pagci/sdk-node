// ── Main client ──────────────────────────────────────────────────────
export { Pagci } from './client.js';
export type { PagciConfig, WebhookEvent } from './client.js';

// ── Errors ───────────────────────────────────────────────────────────
export {
  PagciError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  InsufficientBalanceError,
  RateLimitError,
  ApiError,
  ConnectionError,
  TimeoutError,
  SignatureVerificationError,
  errorFromResponse,
} from './errors.js';

// ── Request types ────────────────────────────────────────────────────
export type { ApiResponse, RequestOptions, ResponseMeta } from './requestSender.js';

// ── Retry ────────────────────────────────────────────────────────────
export type { RetryConfig } from './retry.js';

// ── Crypto (for advanced users / custom implementations) ─────────────
export type { CryptoProvider } from './crypto/CryptoProvider.js';
export { NodeCryptoProvider } from './crypto/NodeCryptoProvider.js';

// ── HTTP (for advanced users / custom implementations) ───────────────
export type { HttpClient, HttpClientResponse } from './net/HttpClient.js';
export { NodeHttpClient } from './net/NodeHttpClient.js';

// ── Utilities ────────────────────────────────────────────────────────
export { generateIdempotencyKey } from './idempotency.js';

// ── Pagination ──────────────────────────────────────────────────────
export { Page } from './pagination.js';

// ── Resource classes ────────────────────────────────────────────────
export { PaymentsResource } from './resources/payments.js';
export { WithdrawalsResource } from './resources/withdrawals.js';
export { DebtsResource } from './resources/debts.js';
export { BalanceResource } from './resources/balance.js';
export { WebhookEndpointsResource } from './resources/webhookEndpoints.js';
export { TokensResource } from './resources/tokens.js';

// ── Types ───────────────────────────────────────────────────────────
export type {
  Owner,
  CompactOwner,
  Customer,
  Item,
  ListMeta,
  ListResponse,
  StatusResponse,
  MessageResponse,
  Payer,
  Bank,
  RefundEntry,
  DeductionEntry,
  HistoryEvent,
  KYCValidation,
  PaymentConfig,
  QRConfig,
  QRLogoConfig,
  QRForegroundConfig,
  QRModuleConfig,
  QRBadgeConfig,
  RecipientView,
  LiquidatorView,
  Payment,
  PaymentCompact,
  StatusCount,
  RecipientParams,
  CreatePaymentParams,
  RefundRecipientEntry,
  RefundParams,
  RefundDistEntry,
  RefundResponse,
  PaymentListParams,
  ReceiverBank,
  Receiver,
  WithdrawalLiquidator,
  Withdrawal,
  CreateWithdrawalResponse,
  CreateWithdrawalParams,
  WithdrawalListParams,
  Balance,
  TotalBalance,
  WalletListParams,
  WebhookEnvelope,
  WebhookEndpoint,
  WebhookEndpointsListResponse,
  WebhookEndpointInput,
  RegisterWebhooksParams,
  WebhookDelivery,
  WebhookDeliveryListResponse,
  WebhookTestParams,
  WebhookTestResponse,
  WebhookDeliveryListParams,
  CreateDebtParams,
  CreateDebtResponse,
  DebtListItem,
  DebtListResponse,
  DebtListParams,
  CreateAccessTokenParams,
  CreateAccessTokenResponse,
  CreateAPIKeyParams,
  CreateAPIKeyResponse,
  UpdateTokenScopesParams,
} from './types/index.js';
export { ErrorCode, WebhookEventType } from './types/index.js';
