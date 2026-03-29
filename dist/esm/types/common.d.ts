/** Payment owner — identifies the wallet that owns the payment. */
export interface Owner {
    /** Wallet identifier. */
    wallet_id: string;
    /** Owner display name. */
    name?: string;
    /** CPF or CNPJ. */
    document?: string;
}
/** Compact owner used in list views. */
export interface CompactOwner {
    wallet_id: string;
    name: string;
}
/** Customer attached to a payment. */
export interface Customer {
    /** Customer identifier. */
    id: string;
    /** Customer CPF or CNPJ. */
    document?: string;
    /** Customer IP address. */
    ip?: string;
    /** Customer phone number. */
    phone?: string;
    /** Customer email. */
    email?: string;
}
/** Line item within a payment. */
export interface Item {
    /** Item name. */
    name: string;
    /** Item identifier. */
    id: string;
    /** Item value in centavos (integer). */
    value: number;
}
/** Cursor-based pagination metadata. */
export interface ListMeta {
    per_page: number;
    next_cursor?: string;
    prev_cursor?: string;
    total?: number;
}
/** Paginated list envelope. */
export interface ListResponse<T> {
    data: T[];
    meta: ListMeta;
}
/** Generic status response (e.g. { status: "ok" }). */
export interface StatusResponse {
    status: string;
}
/** Generic message response. */
export interface MessageResponse {
    message: string;
}
//# sourceMappingURL=common.d.ts.map