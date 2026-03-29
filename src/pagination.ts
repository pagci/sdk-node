// ── Cursor-based auto-pagination ────────────────────────────────────

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
export class Page<T> implements AsyncIterable<T> {
  /** Current page data (empty until first fetch). */
  data: T[] = [];

  /** Current page metadata. */
  meta: ListMeta = { per_page: 20 };

  private loaded = false;

  constructor(private readonly fetcher: Fetcher<T>) {}

  // ── Lazy first-page load ────────────────────────────────────────

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const res = await this.fetcher(undefined);
    this.data = res.data;
    this.meta = res.meta;
    this.loaded = true;
  }

  /** Get current page data (fetches first page if not yet loaded). */
  async getData(): Promise<T[]> {
    await this.ensureLoaded();
    return this.data;
  }

  // ── Manual navigation ───────────────────────────────────────────

  /** Whether there is a next page available. */
  hasNextPage(): boolean {
    return this.meta.next_cursor !== undefined && this.meta.next_cursor !== '';
  }

  /** Fetch the next page. Returns a new Page positioned at the next cursor. */
  async getNextPage(): Promise<Page<T>> {
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

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
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
  async autoPagingToArray(opts: { limit: number }): Promise<T[]> {
    const result: T[] = [];
    for await (const item of this) {
      result.push(item);
      if (result.length >= opts.limit) break;
    }
    return result;
  }
}
