import { describe, it, expect } from 'vitest';
import { Page } from '../src/pagination.js';
import type { ListResponse } from '../src/types/common.js';

// ── Helpers ──────────────────────────────────────────────────────────

/** Create a fetcher that returns pages from a pre-built array of responses. */
function mockFetcher<T>(
  pages: Array<{ data: T[]; nextCursor?: string }>,
): (cursor?: string) => Promise<ListResponse<T>> {
  // Map cursors to page indices: undefined → 0, "cursor_1" → 1, etc.
  const cursorMap = new Map<string | undefined, number>();
  cursorMap.set(undefined, 0);
  for (let i = 1; i < pages.length; i++) {
    cursorMap.set(`cursor_${i}`, i);
  }

  return async (cursor?: string) => {
    const idx = cursorMap.get(cursor) ?? -1;
    const page = pages[idx];
    if (!page) throw new Error(`Unexpected cursor: ${cursor}`);

    return {
      data: page.data,
      meta: {
        per_page: 2,
        next_cursor: page.nextCursor,
      },
    };
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Page', () => {
  describe('AsyncIterator', () => {
    it('yields all items across multiple pages', async () => {
      const fetcher = mockFetcher([
        { data: [1, 2], nextCursor: 'cursor_1' },
        { data: [3, 4], nextCursor: 'cursor_2' },
        { data: [5] },
      ]);

      const page = new Page(fetcher);
      const items: number[] = [];
      for await (const item of page) {
        items.push(item);
      }

      expect(items).toEqual([1, 2, 3, 4, 5]);
    });

    it('handles single page with no next cursor', async () => {
      const fetcher = mockFetcher([{ data: ['a', 'b'] }]);
      const page = new Page(fetcher);

      const items: string[] = [];
      for await (const item of page) {
        items.push(item);
      }

      expect(items).toEqual(['a', 'b']);
    });
  });

  describe('autoPagingToArray', () => {
    it('respects limit', async () => {
      const fetcher = mockFetcher([
        { data: [1, 2], nextCursor: 'cursor_1' },
        { data: [3, 4], nextCursor: 'cursor_2' },
        { data: [5, 6] },
      ]);

      const page = new Page(fetcher);
      const items = await page.autoPagingToArray({ limit: 3 });

      expect(items).toEqual([1, 2, 3]);
    });

    it('stops when no more pages', async () => {
      const fetcher = mockFetcher([
        { data: [1, 2], nextCursor: 'cursor_1' },
        { data: [3] },
      ]);

      const page = new Page(fetcher);
      const items = await page.autoPagingToArray({ limit: 100 });

      expect(items).toEqual([1, 2, 3]);
    });

    it('returns empty array for empty first page', async () => {
      const fetcher = mockFetcher([{ data: [] }]);

      const page = new Page(fetcher);
      const items = await page.autoPagingToArray({ limit: 100 });

      expect(items).toEqual([]);
    });
  });

  describe('hasNextPage', () => {
    it('returns true when next_cursor exists', async () => {
      const fetcher = mockFetcher([
        { data: [1], nextCursor: 'cursor_1' },
        { data: [2] },
      ]);

      const page = new Page(fetcher);
      await page.getData(); // trigger load
      expect(page.hasNextPage()).toBe(true);
    });

    it('returns false when no next_cursor', async () => {
      const fetcher = mockFetcher([{ data: [1] }]);

      const page = new Page(fetcher);
      await page.getData();
      expect(page.hasNextPage()).toBe(false);
    });

    it('returns false before first load (default meta has no cursor)', () => {
      const fetcher = mockFetcher([{ data: [1] }]);
      const page = new Page(fetcher);
      expect(page.hasNextPage()).toBe(false);
    });
  });

  describe('getData', () => {
    it('returns current page data', async () => {
      const fetcher = mockFetcher([{ data: ['x', 'y'] }]);
      const page = new Page(fetcher);

      const data = await page.getData();
      expect(data).toEqual(['x', 'y']);
    });

    it('only fetches once on multiple getData calls', async () => {
      let callCount = 0;
      const fetcher = async () => {
        callCount++;
        return { data: [1], meta: { per_page: 10 } };
      };

      const page = new Page(fetcher);
      await page.getData();
      await page.getData();

      expect(callCount).toBe(1);
    });
  });

  describe('getNextPage', () => {
    it('returns a new Page for the next cursor', async () => {
      const fetcher = mockFetcher([
        { data: [1, 2], nextCursor: 'cursor_1' },
        { data: [3, 4] },
      ]);

      const page = new Page(fetcher);
      await page.getData();

      const next = await page.getNextPage();
      expect(next.data).toEqual([3, 4]);
      expect(next.hasNextPage()).toBe(false);
    });

    it('throws when no next page', async () => {
      const fetcher = mockFetcher([{ data: [1] }]);
      const page = new Page(fetcher);
      await page.getData();

      await expect(page.getNextPage()).rejects.toThrow('No next page');
    });
  });

  describe('empty first page', () => {
    it('async iterator yields nothing', async () => {
      const fetcher = mockFetcher([{ data: [] as number[] }]);
      const page = new Page(fetcher);

      const items: number[] = [];
      for await (const item of page) {
        items.push(item);
      }

      expect(items).toEqual([]);
    });
  });
});
