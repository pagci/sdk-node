// ── Webhook types ───────────────────────────────────────────────────
// Source: cmd/specgen/types.go (WebhookEnvelope, WebhookEndpoint, etc.)
// ── Webhook events ──────────────────────────────────────────────────
export var WebhookEventType;
(function (WebhookEventType) {
    WebhookEventType["PaymentConfirmed"] = "payment.confirmed";
    WebhookEventType["PaymentFailed"] = "payment.failed";
    WebhookEventType["PaymentCancelled"] = "payment.cancelled";
    WebhookEventType["PaymentExpired"] = "payment.expired";
    WebhookEventType["PaymentDispute"] = "payment.dispute";
    WebhookEventType["WithdrawalSettled"] = "withdrawal.settled";
    WebhookEventType["WithdrawalFailed"] = "withdrawal.failed";
    WebhookEventType["RefundCompleted"] = "refund.completed";
})(WebhookEventType || (WebhookEventType = {}));
//# sourceMappingURL=webhook.js.map