import type { ListMeta, ListResponse } from './types/common.js';
type Fetcher<T> = (cursor?: string) => Promise<ListResponse<T>>;
/**
 * A lazy, async-iterable page of results.
 *
 * Supports three consumption patterns:
 *
 * 1. **Manual page-by-page:**
 *    ```ts
 *    let page = pagci.payments.list({ per_page: 10 });
 *    const first = await page.getData();
 *    if (page.hasNextPage()) page = await page.getNextPage();
 *    ```
 *
 * 2. **for-await (all items across pages):**
 *    ```ts
 *    for await (const payment of pagci.payments.list()) {
 *      console.log(payment.id);
 *    }
 *    ```
 *
 * 3. **Collect into array (with safety limit):**
 *    ```ts
 *    const all = await pagci.payments.list().autoPagingToArray({ limit: 500 });
 *    ```
 */
export declare class Page<T> implements AsyncIterable<T> {
    private readonly fetcher;
    /** Current page data (empty until first fetch). */
    data: T[];
    /** Current page metadata. */
    meta: ListMeta;
    private loaded;
    constructor(fetcher: Fetcher<T>);
    private ensureLoaded;
    /** Get current page data (fetches first page if not yet loaded). */
    getData(): Promise<T[]>;
    /** Whether there is a next page available. */
    hasNextPage(): boolean;
    /** Fetch the next page. Returns a new Page positioned at the next cursor. */
    getNextPage(): Promise<Page<T>>;
    [Symbol.asyncIterator](): AsyncGenerator<T>;
    /**
     * Collect items across pages into an array.
     *
     * @param opts.limit - Maximum number of items to collect (required as safety guard).
     */
    autoPagingToArray(opts: {
        limit: number;
    }): Promise<T[]>;
}
export {};
//# sourceMappingURL=pagination.d.ts.map