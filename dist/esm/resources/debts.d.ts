import type { RequestSender, ApiResponse, RequestOptions } from '../requestSender.js';
import type { CreateDebtParams, CreateDebtResponse, DebtListItem, DebtListParams } from '../types/index.js';
import type { StatusResponse } from '../types/common.js';
import { Page } from '../pagination.js';
export declare class DebtsResource {
    private readonly sender;
    constructor(sender: RequestSender);
    /** Create a new debt. */
    create(params: CreateDebtParams, options?: RequestOptions): Promise<ApiResponse<CreateDebtResponse>>;
    /** List debts with cursor-based pagination. */
    list(params?: DebtListParams): Page<DebtListItem>;
    /** Cancel a pending debt. */
    cancel(id: string, options?: RequestOptions): Promise<ApiResponse<StatusResponse>>;
    /** Reverse a paid debt. */
    reverse(id: string, options?: RequestOptions): Promise<ApiResponse<StatusResponse>>;
}
//# sourceMappingURL=debts.d.ts.map