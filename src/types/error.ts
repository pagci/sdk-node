// ── Error codes ─────────────────────────────────────────────────────
// Source: internal/handler/helpers.go errorMappings + handler-level codes
//
// Every machine-readable error code the API can return.

export enum ErrorCode {
  // ── 400 Bad Request (validation) ────────────────────────────────
  EmptyField = 'empty_field',
  EmptyWalletID = 'empty_wallet_id',
  InvalidAmount = 'invalid_amount',
  DuplicateWalletID = 'duplicate_wallet_id',
  DuplicateItemID = 'duplicate_item_id',
  AvailableAtPast = 'available_at_past',
  AvailableAtTooFar = 'available_at_too_far',
  FeeTooHigh = 'fee_too_high',
  CannotCoverFee = 'cannot_cover_fee',
  InvalidPixKeyType = 'invalid_pix_key_type',
  InvalidPixKey = 'invalid_pix_key',
  InvalidField = 'invalid_field',
  SelfTransfer = 'self_transfer',
  InvalidCPF = 'invalid_cpf',
  InvalidCNPJ = 'invalid_cnpj',
  WeakPassword = 'weak_password',
  RecipientNotInPayment = 'recipient_not_in_payment',
  RefundModesConflict = 'refund_modes_conflict',
  RefundModeRequired = 'refund_mode_required',
  GovBRDocNotGenerated = 'govbr_doc_not_generated',
  DebtNotPending = 'debt_not_pending',
  DebtNotPaid = 'debt_not_paid',
  SamePassword = 'same_password',
  IPAllowlistFull = 'ip_allowlist_full',
  TwoFactorNotEnabled = 'two_factor_not_enabled',
  TwoFactorNotSetup = 'two_factor_not_setup',
  InvalidScope = 'invalid_scope',
  OTPInvalid = 'otp_invalid',
  OTPExpired = 'otp_expired',
  OTPMaxAttempts = 'otp_max_attempts',
  EmailNotVerified = 'email_not_verified',
  LoginTokenScopeModify = 'login_token_scope_modify',

  // ── 401 Unauthorized ──────────────────────────────────────────
  InvalidCredentials = 'invalid_credentials',
  TwoFactorInvalidCode = 'two_factor_invalid_code',
  ResetTokenInvalid = 'reset_token_invalid',

  // ── 403 Forbidden ─────────────────────────────────────────────
  KYCNotValidated = 'kyc_not_validated',
  ConsentRequired = 'consent_required',
  AccountBanned = 'account_banned',
  SelfTokenModify = 'self_token_modify',
  PaymentLimitExceeded = 'payment_limit_exceeded',
  IPNotAllowed = 'ip_not_allowed',

  // ── 404 Not Found ─────────────────────────────────────────────
  PreferencePlanNotFound = 'preference_plan_not_found',
  LiquidatorNotFound = 'liquidator_not_found',
  PaymentNotFound = 'payment_not_found',
  WithdrawalNotFound = 'withdrawal_not_found',
  UserNotFound = 'user_not_found',
  TokenNotFound = 'token_not_found',
  WhitelabelNotFound = 'whitelabel_not_found',
  DocumentNotFound = 'document_not_found',
  IPNotInAllowlist = 'ip_not_in_allowlist',
  EmailDeliveryNotFound = 'email_delivery_not_found',
  WebhookNotFound = 'webhook_not_found',
  EmailNotSuppressed = 'email_not_suppressed',
  DebtNotFound = 'debt_not_found',
  AvatarNotFound = 'avatar_not_found',
  LogoNotFound = 'logo_not_found',
  MagicTokenNotFound = 'magic_token_not_found',

  // ── 409 Conflict ──────────────────────────────────────────────
  OptimisticLockConflict = 'optimistic_lock_conflict',
  PreferencePlanInUse = 'preference_plan_in_use',
  DuplicateIdempotencyKey = 'duplicate_idempotency_key',
  ActiveWithdrawalExists = 'active_withdrawal_exists',
  DuplicateReferer = 'duplicate_referer',
  RefundInProgress = 'refund_in_progress',
  EmailAlreadyExists = 'email_already_exists',
  DocumentAlreadyUsed = 'document_already_used',
  EnterpriseAlreadyRegistered = 'enterprise_already_registered',
  KYCAlreadyValidated = 'kyc_already_validated',
  GovBRAlreadyValidated = 'govbr_already_validated',
  TokenLimitReached = 'token_limit_reached',
  InvalidTransition = 'invalid_transition',
  IPAlreadyInAllowlist = 'ip_already_in_allowlist',
  TwoFactorAlreadyEnabled = 'two_factor_already_enabled',
  EmailAlreadyVerified = 'email_already_verified',
  ResendLimitReached = 'resend_limit_reached',
  ResetTokenUsed = 'reset_token_used',

  // ── 413 Payload Too Large ─────────────────────────────────────
  FileTooLarge = 'file_too_large',

  // ── 415 Unsupported Media Type ────────────────────────────────
  InvalidFileType = 'invalid_file_type',

  // ── 422 Unprocessable Entity (business rules) ─────────────────
  PreferencePlanInactive = 'preference_plan_inactive',
  LiquidatorRefInvalid = 'liquidator_ref_invalid',
  InsufficientBalance = 'insufficient_balance',
  RefundExceedsBalance = 'refund_exceeds_balance',
  RecipientNotHeld = 'recipient_not_held',
  PSPRejected = 'psp_rejected',
  PSPUnavailable = 'psp_unavailable',
  KYCPaymentNotRefundable = 'kyc_payment_not_refundable',
  CNPJValidationFailed = 'cnpj_validation_failed',
  ReservedDomain = 'reserved_domain',
  GovBRNoCertificate = 'govbr_no_certificate',
  GovBRCertExpired = 'govbr_cert_expired',
  GovBRCPFMismatch = 'govbr_cpf_mismatch',
  GovBRSignatureInvalid = 'govbr_signature_invalid',
  PDFConversionFailed = 'pdf_conversion_failed',
  RefundDataInconsistent = 'refund_data_inconsistent',
  PSPDisabled = 'psp_disabled',
  PSPCapabilityMissing = 'psp_capability_missing',

  // ── 429 Too Many Requests ─────────────────────────────────────
  OTPRateLimited = 'otp_rate_limited',
  RateLimited = 'rate_limited',

  // ── 502 Bad Gateway ───────────────────────────────────────────
  GovBRVerifierFailed = 'govbr_verifier_failed',

  // ── 503 Service Unavailable ───────────────────────────────────
  StorageUnavailable = 'storage_unavailable',
  ServiceNotConfigured = 'service_not_configured',
  // Phase 89 — PSP routing failures surface here. PreferencePlanRefNotResolved
  // = strict resolver refused because a non-empty ref pointed at a missing or
  // inactive plan (misconfiguration, not infrastructure). NoEligiblePSP =
  // selector evaluated every candidate and rejected all. PaymentAllPSPsFailed
  // = every candidate was actually called and each one returned
  // transient/hard-down (distinct from "no candidate was callable").
  PreferencePlanRefNotResolved = 'preference_plan_ref_not_resolved',
  NoEligiblePSP = 'no_eligible_psp',
  PaymentAllPSPsFailed = 'payment_all_psps_failed',

  // ── 504 Gateway Timeout ───────────────────────────────────────
  // Phase 89 — request context deadline expired BETWEEN PSP fallback
  // attempts (distinct from per-PSP timeout which is FailureTransient and
  // continues the loop).
  PaymentDeadlineExceeded = 'payment_deadline_exceeded',

  // ── Phase 87 — Internal charge ────────────────────────────────
  // Returned when `kind=internal_charge` is paired with a client-supplied
  // `liquidator.name` — the liquidator is server-forced to `internal`.
  LiquidatorNotAllowedForInternal = 'liquidator_not_allowed_for_internal',
  // Internal charge resolution errors — `POST /withdrawals` with `pix_key="charge:..."`.
  ChargeNotFound = 'charge_not_found',
  NotInternalCharge = 'not_internal_charge',
  ChargeExpired = 'charge_expired',
  ChargeAlreadyReserved = 'charge_already_reserved',
  ChargeAlreadyPaid = 'charge_already_paid',
  SelfPayInternalCharge = 'self_pay_forbidden',
  SplitSelfInternalCharge = 'split_self_forbidden',
  AmountMismatchInternalCharge = 'amount_mismatch',
  CrossOwnerNotSupported = 'cross_owner_not_supported',
  // Returned when the caller tries to reverse a settled withdrawal that paid an internal charge.
  // Compensation path: open a debt on the receiver wallet (admin-only).
  ReverseForbiddenInternalCharge = 'reverse_forbidden_internal_charge',
  // Returned when the caller tries to refund an internal_charge payment.
  // Refund is blocked by construction (internal PSP has no refund capability).
  // Compensation path: open a debt on the receiver wallet.
  RefundNotSupportedForInternalCharge = 'refund_not_supported_for_internal_charge',

  // ── Phase 94 — Gift PIX ───────────────────────────────────────
  // Sources: internal/handler/helpers.go:351-376 errorMappings (Phases
  // 90-93). Every code below is emitted by a POST /payments/gift,
  // GET /gift, POST /payments/gift/:id/{regenerate-link,revoke}, or
  // the middleware guarding gift tokens on `/withdrawals`.
  GiftPixDisabled = 'gift_pix_disabled',                     // 404 — feature flag off / route hidden
  GiftInvalidMethod = 'gift_invalid_method',                 // 400 — method ∉ {"pix","internal_charge"}
  GiftInvalidExpiry = 'gift_invalid_expiry',                 // 400 — link_expires_in_seconds out of [60, 2592000]
  GiftFundingWalletRequired = 'gift_funding_wallet_required',// 400 — method=internal_charge w/o funding_wallet_id
  GiftMessageTooLong = 'gift_message_too_long',              // 400 — message > 140 chars
  GiftAmountOutOfRange = 'gift_amount_out_of_range',         // 400 — amount ≤ 0 or over PIX ceiling
  GiftAlreadyClaimed = 'gift_already_claimed',               // 403 — regenerate/revoke blocked in claimed/in-progress/under_review states
  RouteNotAllowedForGiftToken = 'route_not_allowed_for_gift_token', // 403 — gift token hit a non-gift route
  GiftTokenRateLimited = 'gift_token_rate_limited',          // 429 — per-token limit on POST /withdrawals

  // ── Handler-level codes (not in errorMappings) ────────────────
  InvalidRequestBody = 'invalid_request_body',
  InternalError = 'internal_error',
  Unauthorized = 'unauthorized',
  Forbidden = 'forbidden',
  WalletBoundForbidden = 'wallet_bound_forbidden',
  LoginTokenRequired = 'login_token_required',
  AdminTargetForbidden = 'admin_target_forbidden',
  DefaultWhitelabelProtected = 'default_whitelabel_protected',
  DefaultPreferencePlanProtected = 'default_preference_plan_protected',
  ScopeAllRequired = 'scope_all_required',
  ImpersonationBlocked = 'impersonation_blocked',
  TenantNotFound = 'tenant_not_found',
  ScopeNotAllowed = 'scope_not_allowed',
  AccessTokenForbidden = 'access_token_forbidden',
  ChallengeFailed = 'challenge_failed',
  ChallengeError = 'challenge_error',
}
