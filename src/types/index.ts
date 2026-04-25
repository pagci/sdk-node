// ── Type barrel re-exports ──────────────────────────────────────────

export type {
  Owner,
  CompactOwner,
  Customer,
  Item,
  ListMeta,
  ListResponse,
  StatusResponse,
  MessageResponse,
} from './common.js';

export type {
  Payer,
  Bank,
  RefundEntry,
  DeductionEntry,
  HistoryEvent,
  KYCValidation,
  PaymentConfig,
  QRLogoConfig,
  QRForegroundConfig,
  QRModuleConfig,
  QRBadgeConfig,
  QRConfig,
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
} from './payment.js';

export type {
  WithdrawalStatus,
  PixKeyType,
  ReceiverBank,
  Receiver,
  WithdrawalLiquidator,
  Withdrawal,
  CreateWithdrawalResponse,
  CreateWithdrawalParams,
  WithdrawalListParams,
} from './withdrawal.js';

export type {
  Balance,
  TotalBalance,
  BatchBalance,
  WalletListParams,
} from './balance.js';

export {
  WebhookEventType,
} from './webhook.js';
export type {
  WebhookEnvelope,
  WebhookEndpoint,
  WebhookEndpointsListResponse,
  ReplaceWebhookEndpointsResponse,
  ReplaceWebhookEndpointsParams,
  AddWebhookEndpointParams,
  AddWebhookEndpointResponse,
  WebhookEndpointInput,
  // Deprecated aliases — kept one release for forward-compat. Prefer the
  // ReplaceWebhookEndpoints* / AddWebhookEndpoint* names.
  RegisterWebhooksResponse,
  RegisterWebhooksParams,
  UpdateWebhookEndpointParams,
  WebhookDelivery,
  WebhookDeliveryListResponse,
  WebhookTestParams,
  WebhookTestResponse,
  WebhookDeliveryListParams,
  WebhookEventInfo,
  WebhookWildcardInfo,
  WebhookEventsCatalogResponse,
} from './webhook.js';

export type {
  DebtStatus,
  CreateDebtParams,
  CreateDebtResponse,
  DebtListItem,
  DebtListResponse,
  DebtListParams,
} from './debt.js';

export type {
  GiftStatus,
  GiftMethod,
  GiftOrigin,
  CreateGiftParams,
  CreateGiftResponse,
  GetGiftResponse,
  RegenerateGiftParams,
  RegenerateGiftResponse,
  RevokeGiftResponse,
} from './gift.js';

export type {
  CreateAccessTokenParams,
  CreateAccessTokenResponse,
  CreateAPIKeyParams,
  CreateAPIKeyResponse,
  UpdateTokenScopesParams,
} from './token.js';

export type {
  FeeConfig,
  Reserve,
  TierBreakdown,
  RecipientFormula,
  FeeTier,
  FeeResponse,
  FeePreviewRecipient,
  FeePreviewResponse,
} from './fee.js';

export { ErrorCode } from './error.js';
