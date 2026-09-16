import { describe, it, expect, vi } from "vitest";
import { CircuitBreaker, CircuitBreakerOpenError } from "./circuit-breaker.js";

describe("CircuitBreaker FSM", () => {
  it("starts in CLOSED state and allows successful executions", async () => {
    const cb = new CircuitBreaker({
      name: "test-cb",
      failureThreshold: 3,
      resetTimeoutMs: 100,
    });
    expect(cb.state).toBe("CLOSED");

    const result = await cb.execute(async () => "success");
    expect(result).toBe("success");
    expect(cb.state).toBe("CLOSED");
  });

  it("trips from CLOSED to OPEN after failure threshold is reached", async () => {
    const cb = new CircuitBreaker({
      name: "test-cb",
      failureThreshold: 2,
      resetTimeoutMs: 200,
    });

    const failingAction = async () => {
      throw new Error("DB failure");
    };

    // Failure 1
    await expect(cb.execute(failingAction)).rejects.toThrow("DB failure");
    expect(cb.state).toBe("CLOSED");

    // Failure 2 -> Trips OPEN
    await expect(cb.execute(failingAction)).rejects.toThrow("DB failure");
    expect(cb.state).toBe("OPEN");

    // Next call immediately rejected by CircuitBreakerOpenError without invoking action
    const mockFn = vi.fn();
    await expect(cb.execute(mockFn)).rejects.toThrow(CircuitBreakerOpenError);
    expect(mockFn).not.toHaveBeenCalled();
  });

  it("transitions to HALF_OPEN after timeout and recovers to CLOSED on successful probe", async () => {
    const cb = new CircuitBreaker({
      name: "test-cb",
      failureThreshold: 1,
      resetTimeoutMs: 50,
    });

    await expect(
      cb.execute(async () => {
        throw new Error("Temporary failure");
      }),
    ).rejects.toThrow();

    expect(cb.state).toBe("OPEN");

    // Wait for resetTimeoutMs to elapse
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Next execution probes in HALF_OPEN
    const result = await cb.execute(async () => "probe-ok");
    expect(result).toBe("probe-ok");
    expect(cb.state).toBe("CLOSED");
  });

  it("returns to OPEN if HALF_OPEN probe fails", async () => {
    const cb = new CircuitBreaker({
      name: "test-cb",
      failureThreshold: 1,
      resetTimeoutMs: 50,
    });

    await expect(
      cb.execute(async () => {
        throw new Error("Failure 1");
      }),
    ).rejects.toThrow();

    expect(cb.state).toBe("OPEN");

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Probe fails
    await expect(
      cb.execute(async () => {
        throw new Error("Probe failed");
      }),
    ).rejects.toThrow("Probe failed");

    expect(cb.state).toBe("OPEN");
  });
});
