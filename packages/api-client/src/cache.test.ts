import { describe, it, expect, beforeEach, vi } from "vitest";
import { apiCacheManager } from "./cache";

describe("ApiCacheManager", () => {
  beforeEach(() => {
    apiCacheManager.invalidate();
  });

  it("should store and retrieve data within TTL", () => {
    apiCacheManager.set("test_key", { name: "Workspace A" }, 5000);
    const cached = apiCacheManager.get<{ name: string }>("test_key");
    expect(cached).not.toBeNull();
    expect(cached?.data.name).toBe("Workspace A");
    expect(cached?.isStale).toBe(false);
  });

  it("should mark data as stale after TTL expires", async () => {
    apiCacheManager.set("test_key_stale", { name: "Workspace B" }, 10); // 10ms TTL
    await new Promise((resolve) => setTimeout(resolve, 20));

    const cached = apiCacheManager.get<{ name: string }>("test_key_stale");
    expect(cached).not.toBeNull();
    expect(cached?.isStale).toBe(true);
  });

  it("should deduplicate concurrent fetch requests", async () => {
    let callCount = 0;
    const mockFetcher = async () => {
      callCount++;
      await new Promise((res) => setTimeout(res, 50));
      return { result: "data" };
    };

    const p1 = apiCacheManager.fetchWithCache("dedup_key", mockFetcher, 1000);
    const p2 = apiCacheManager.fetchWithCache("dedup_key", mockFetcher, 1000);

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(res1).toEqual({ result: "data" });
    expect(res2).toEqual({ result: "data" });
    expect(callCount).toBe(1); // Only 1 network request fired!
  });

  it("should invalidate matching keys on pattern match", () => {
    apiCacheManager.set("my_bookings", [{ id: "1" }], 5000);
    apiCacheManager.set("cal_avail_space1", { status: "OK" }, 5000);
    apiCacheManager.set("catalogue_resources", [{ name: "Flex" }], 5000);

    apiCacheManager.invalidate("my_bookings");

    expect(apiCacheManager.get("my_bookings")).toBeNull();
    expect(apiCacheManager.get("cal_avail_space1")).not.toBeNull();
    expect(apiCacheManager.get("catalogue_resources")).not.toBeNull();
  });
});
