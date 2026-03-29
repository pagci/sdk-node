// ── Error codes ─────────────────────────────────────────────────────
// Source: internal/handler/helpers.go errorMappings + handler-level codes
//
// Every machine-readable error code the API can return.
export var ErrorCode;
(function (ErrorCode) {
    // ── 400 Bad Request (validation) ────────────────────────────────
    ErrorCode["EmptyField"] = "empty_field";
    ErrorCode["EmptyWalletID"] = "empty_wallet_id";
    ErrorCode["InvalidAmount"] = "invalid_amount";
    ErrorCode["DuplicateWalletID"] = "duplicate_wallet_id";
    ErrorCode["DuplicateItemID"] = "duplicate_item_id";
    ErrorCode["AvailableAtPast"] = "available_at_past";
    ErrorCode["AvailableAtTooFar"] = "available_at_too_far";
    ErrorCode["FeeTooHigh"] = "fee_too_high";
    ErrorCode["CannotCoverFee"] = "cannot_cover_fee";
    ErrorCode["InvalidPixKeyType"] = "invalid_pix_key_type";
    ErrorCode["InvalidPixKey"] = "invalid_pix_key";
    ErrorCode["InvalidField"] = "invalid_field";
    ErrorCode["SelfTransfer"] = "self_transfer";
    ErrorCode["InvalidCPF"] = "invalid_cpf";
    ErrorCode["InvalidCNPJ"] = "invalid_cnpj";
    ErrorCode["WeakPassword"] = "weak_password";
    ErrorCode["RecipientNotInPayment"] = "recipient_not_in_payment";
    ErrorCode["RefundModesConflict"] = "refund_modes_conflict";
    ErrorCode["RefundModeRequired"] = "refund_mode_required";
    ErrorCode["GovBRDocNotGenerated"] = "govbr_doc_not_generated";
    ErrorCode["DebtNotPending"] = "debt_not_pending";
    ErrorCode["DebtNotPaid"] = "debt_not_paid";
    ErrorCode["SamePassword"] = "same_password";
    ErrorCode["IPAllowlistFull"] = "ip_allowlist_full";
    ErrorCode["TwoFactorNotEnabled"] = "two_factor_not_enabled";
    ErrorCode["TwoFactorNotSetup"] = "two_factor_not_setup";
    ErrorCode["InvalidScope"] = "invalid_scope";
    ErrorCode["OTPInvalid"] = "otp_invalid";
    ErrorCode["OTPExpired"] = "otp_expired";
    ErrorCode["OTPMaxAttempts"] = "otp_max_attempts";
    ErrorCode["EmailNotVerified"] = "email_not_verified";
    ErrorCode["LoginTokenScopeModify"] = "login_token_scope_modify";
    // ── 401 Unauthorized ──────────────────────────────────────────
    ErrorCode["InvalidCredentials"] = "invalid_credentials";
    ErrorCode["TwoFactorInvalidCode"] = "two_factor_invalid_code";
    ErrorCode["ResetTokenInvalid"] = "reset_token_invalid";
    // ── 403 Forbidden ─────────────────────────────────────────────
    ErrorCode["KYCNotValidated"] = "kyc_not_validated";
    ErrorCode["ConsentRequired"] = "consent_required";
    ErrorCode["AccountBanned"] = "account_banned";
    ErrorCode["SelfTokenModify"] = "self_token_modify";
    ErrorCode["PaymentLimitExceeded"] = "payment_limit_exceeded";
    ErrorCode["IPNotAllowed"] = "ip_not_allowed";
    // ── 404 Not Found ─────────────────────────────────────────────
    ErrorCode["PaymentNotFound"] = "payment_not_found";
    ErrorCode["WithdrawalNotFound"] = "withdrawal_not_found";
    ErrorCode["UserNotFound"] = "user_not_found";
    ErrorCode["TokenNotFound"] = "token_not_found";
    ErrorCode["WhitelabelNotFound"] = "whitelabel_not_found";
    ErrorCode["DocumentNotFound"] = "document_not_found";
    ErrorCode["IPNotInAllowlist"] = "ip_not_in_allowlist";
    ErrorCode["EmailDeliveryNotFound"] = "email_delivery_not_found";
    ErrorCode["WebhookNotFound"] = "webhook_not_found";
    ErrorCode["EmailNotSuppressed"] = "email_not_suppressed";
    ErrorCode["DebtNotFound"] = "debt_not_found";
    ErrorCode["AvatarNotFound"] = "avatar_not_found";
    ErrorCode["LogoNotFound"] = "logo_not_found";
    ErrorCode["MagicTokenNotFound"] = "magic_token_not_found";
    // ── 409 Conflict ──────────────────────────────────────────────
    ErrorCode["DuplicateIdempotencyKey"] = "duplicate_idempotency_key";
    ErrorCode["ActiveWithdrawalExists"] = "active_withdrawal_exists";
    ErrorCode["DuplicateReferer"] = "duplicate_referer";
    ErrorCode["RefundInProgress"] = "refund_in_progress";
    ErrorCode["EmailAlreadyExists"] = "email_already_exists";
    ErrorCode["DocumentAlreadyUsed"] = "document_already_used";
    ErrorCode["EnterpriseAlreadyRegistered"] = "enterprise_already_registered";
    ErrorCode["KYCAlreadyValidated"] = "kyc_already_validated";
    ErrorCode["GovBRAlreadyValidated"] = "govbr_already_validated";
    ErrorCode["TokenLimitReached"] = "token_limit_reached";
    ErrorCode["InvalidTransition"] = "invalid_transition";
    ErrorCode["IPAlreadyInAllowlist"] = "ip_already_in_allowlist";
    ErrorCode["TwoFactorAlreadyEnabled"] = "two_factor_already_enabled";
    ErrorCode["EmailAlreadyVerified"] = "email_already_verified";
    ErrorCode["ResendLimitReached"] = "resend_limit_reached";
    ErrorCode["ResetTokenUsed"] = "reset_token_used";
    // ── 413 Payload Too Large ─────────────────────────────────────
    ErrorCode["FileTooLarge"] = "file_too_large";
    // ── 415 Unsupported Media Type ────────────────────────────────
    ErrorCode["InvalidFileType"] = "invalid_file_type";
    // ── 422 Unprocessable Entity (business rules) ─────────────────
    ErrorCode["InsufficientBalance"] = "insufficient_balance";
    ErrorCode["RefundExceedsBalance"] = "refund_exceeds_balance";
    ErrorCode["RecipientNotHeld"] = "recipient_not_held";
    ErrorCode["PSPRejected"] = "psp_rejected";
    ErrorCode["PSPUnavailable"] = "psp_unavailable";
    ErrorCode["KYCPaymentNotRefundable"] = "kyc_payment_not_refundable";
    ErrorCode["CNPJValidationFailed"] = "cnpj_validation_failed";
    ErrorCode["ReservedDomain"] = "reserved_domain";
    ErrorCode["GovBRNoCertificate"] = "govbr_no_certificate";
    ErrorCode["GovBRCertExpired"] = "govbr_cert_expired";
    ErrorCode["GovBRCPFMismatch"] = "govbr_cpf_mismatch";
    ErrorCode["GovBRSignatureInvalid"] = "govbr_signature_invalid";
    ErrorCode["PDFConversionFailed"] = "pdf_conversion_failed";
    ErrorCode["RefundDataInconsistent"] = "refund_data_inconsistent";
    ErrorCode["PSPDisabled"] = "psp_disabled";
    ErrorCode["PSPCapabilityMissing"] = "psp_capability_missing";
    // ── 429 Too Many Requests ─────────────────────────────────────
    ErrorCode["OTPRateLimited"] = "otp_rate_limited";
    ErrorCode["RateLimited"] = "rate_limited";
    // ── 502 Bad Gateway ───────────────────────────────────────────
    ErrorCode["GovBRVerifierFailed"] = "govbr_verifier_failed";
    // ── 503 Service Unavailable ───────────────────────────────────
    ErrorCode["StorageUnavailable"] = "storage_unavailable";
    ErrorCode["ServiceNotConfigured"] = "service_not_configured";
    // ── Handler-level codes (not in errorMappings) ────────────────
    ErrorCode["InvalidRequestBody"] = "invalid_request_body";
    ErrorCode["InternalError"] = "internal_error";
    ErrorCode["Unauthorized"] = "unauthorized";
    ErrorCode["Forbidden"] = "forbidden";
    ErrorCode["WalletBoundForbidden"] = "wallet_bound_forbidden";
    ErrorCode["LoginTokenRequired"] = "login_token_required";
    ErrorCode["AdminTargetForbidden"] = "admin_target_forbidden";
    ErrorCode["DefaultWhitelabelProtected"] = "default_whitelabel_protected";
    ErrorCode["ScopeAllRequired"] = "scope_all_required";
    ErrorCode["ImpersonationBlocked"] = "impersonation_blocked";
    ErrorCode["TenantNotFound"] = "tenant_not_found";
    ErrorCode["ScopeNotAllowed"] = "scope_not_allowed";
    ErrorCode["AccessTokenForbidden"] = "access_token_forbidden";
    ErrorCode["ChallengeFailed"] = "challenge_failed";
    ErrorCode["ChallengeError"] = "challenge_error";
})(ErrorCode || (ErrorCode = {}));
//# sourceMappingURL=error.js.map