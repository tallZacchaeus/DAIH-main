interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

class ApiCacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private inFlightRequests = new Map<string, Promise<any>>();
  private readonly storagePrefix = "daih_cache_v1_";

  /**
   * Get cached data if valid according to TTL
   */
  get<T>(key: string): { data: T; isStale: boolean } | null {
    const memEntry = this.memoryCache.get(key);
    const now = Date.now();

    if (memEntry) {
      const age = now - memEntry.timestamp;
      const isStale = age > memEntry.ttlMs;
      return { data: memEntry.data as T, isStale };
    }

    // Try localStorage fallback
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(this.storagePrefix + key);
        if (raw) {
          const parsed: CacheEntry<T> = JSON.parse(raw);
          const age = now - parsed.timestamp;
          const isStale = age > parsed.ttlMs;
          // Hydrate memory cache
          this.memoryCache.set(key, parsed);
          return { data: parsed.data, isStale };
        }
      } catch {
        // Ignore localStorage read errors
      }
    }

    return null;
  }

  /**
   * Store data in memory and localStorage
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };

    this.memoryCache.set(key, entry);

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(
          this.storagePrefix + key,
          JSON.stringify(entry),
        );
      } catch {
        // Ignore localStorage write quota errors
      }
    }
  }

  /**
   * Invalidate cached keys matching a pattern or exact string
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.memoryCache.clear();
      this.inFlightRequests.clear();
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          Object.keys(window.localStorage).forEach((key) => {
            if (key.startsWith(this.storagePrefix)) {
              window.localStorage.removeItem(key);
            }
          });
        } catch {
          // ignore storage errors
        }
      }
      return;
    }

    // Invalidate matching keys
    Array.from(this.inFlightRequests.keys()).forEach((k) => {
      if (k.includes(pattern)) {
        this.inFlightRequests.delete(k);
      }
    });

    Array.from(this.memoryCache.keys()).forEach((k) => {
      if (k.includes(pattern)) {
        this.memoryCache.delete(k);
      }
    });

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith(this.storagePrefix) && key.includes(pattern)) {
            window.localStorage.removeItem(key);
          }
        });
      } catch {
        // ignore
      }
    }
  }

  /**
   * Fetch with caching, request deduplication, and Stale-While-Revalidate support
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 300000, // Default 5 minutes
    options: { forceRefresh?: boolean; silentRevalidate?: boolean } = {},
  ): Promise<T> {
    const { forceRefresh = false, silentRevalidate = true } = options;

    if (!forceRefresh) {
      const cached = this.get<T>(key);
      if (cached) {
        if (cached.isStale && silentRevalidate) {
          // Return cached data immediately, revalidate silently in background
          this.executeDeduplicatedFetcher(key, fetcher)
            .then((freshData) => this.set(key, freshData, ttlMs))
            .catch(() => {});
        }
        return cached.data;
      }
    } else {
      // Evict any stale in-flight request so forced refresh executes a fresh network request
      this.inFlightRequests.delete(key);
    }

    // Execute deduplicated fetch
    const freshData = await this.executeDeduplicatedFetcher(key, fetcher);
    this.set(key, freshData, ttlMs);
    return freshData;
  }

  /**
   * Joins identical concurrent HTTP requests into a single promise
   */
  private async executeDeduplicatedFetcher<T>(
    key: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    const promise = fetcher().finally(() => {
      this.inFlightRequests.delete(key);
    });

    this.inFlightRequests.set(key, promise);
    return promise;
  }
}

export const apiCacheManager = new ApiCacheManager();
