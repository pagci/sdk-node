"use strict";
// ── Cursor-based auto-pagination ────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.Page = void 0;
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
class Page {
    fetcher;
    /** Current page data (empty until first fetch). */
    data = [];
    /** Current page metadata. */
    meta = { per_page: 20 };
    loaded = false;
    constructor(fetcher) {
        this.fetcher = fetcher;
    }
    // ── Lazy first-page load ────────────────────────────────────────
    async ensureLoaded() {
        if (this.loaded)
            return;
        const res = await this.fetcher(undefined);
        this.data = res.data;
        this.meta = res.meta;
        this.loaded = true;
    }
    /** Get current page data (fetches first page if not yet loaded). */
    async getData() {
        await this.ensureLoaded();
        return this.data;
    }
    // ── Manual navigation ───────────────────────────────────────────
    /** Whether there is a next page available. */
    hasNextPage() {
        return this.meta.next_cursor !== undefined && this.meta.next_cursor !== '';
    }
    /** Fetch the next page. Returns a new Page positioned at the next cursor. */
    async getNextPage() {
        await this.ensureLoaded();
        if (!this.hasNextPage()) {
            throw new Error('No next page available. Check hasNextPage() first.');
        }
        const next = new Page(this.fetcher);
        const res = await this.fetcher(this.meta.next_cursor);
        next.data = res.data;
        next.meta = res.meta;
        next.loaded = true;
        return next;
    }
    // ── AsyncIterable — iterates ALL items across ALL pages ─────────
    async *[Symbol.asyncIterator]() {
        await this.ensureLoaded();
        yield* this.data;
        let cursor = this.meta.next_cursor;
        while (cursor) {
            const res = await this.fetcher(cursor);
            yield* res.data;
            cursor = res.meta.next_cursor;
        }
    }
    // ── Collect into array ──────────────────────────────────────────
    /**
     * Collect items across pages into an array.
     *
     * @param opts.limit - Maximum number of items to collect (required as safety guard).
     */
    async autoPagingToArray(opts) {
        const result = [];
        for await (const item of this) {
            result.push(item);
            if (result.length >= opts.limit)
                break;
        }
        return result;
    }
}
exports.Page = Page;
//# sourceMappingURL=pagination.js.map