import { safeLogger } from "./sanitizer.js";

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitBreakerOpenError extends Error {
  constructor(
    message = "Circuit breaker is open. Service temporarily unavailable.",
  ) {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

export interface CircuitBreakerOptions {
  name?: string;
  failureThreshold?: number;
  resetTimeoutMs?: number;
}

/**
 * Standard Finite-State-Machine Circuit Breaker (Closed -> Open -> Half-Open -> Closed).
 * Protects downstream services (like PostgreSQL) from cascading failure loops.
 */
export class CircuitBreaker {
  public state: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private nextAttempt = Date.now();
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.name = options.name || "default";
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeoutMs = options.resetTimeoutMs || 12000;
  }

  /**
   * Executes the protected action within the circuit breaker.
   */
  async execute<T>(action: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.state === "OPEN") {
      if (now >= this.nextAttempt) {
        this.state = "HALF_OPEN";
        safeLogger.warn(
          `[CIRCUIT_BREAKER:${this.name}] Transitioned from OPEN to HALF_OPEN (probing healthy state)`,
        );
      } else {
        throw new CircuitBreakerOpenError(
          `Circuit breaker [${this.name}] is OPEN. Downstream failure shed.`,
        );
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      safeLogger.info(
        `[CIRCUIT_BREAKER:${this.name}] Probe successful. Resetting state to CLOSED.`,
      );
    }
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure(error: any): void {
    this.failureCount++;
    safeLogger.error(
      `[CIRCUIT_BREAKER:${this.name}] Execution failure #${this.failureCount}: ${error?.message || error}`,
    );

    if (
      this.state === "HALF_OPEN" ||
      this.failureCount >= this.failureThreshold
    ) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
      safeLogger.error(
        `[CIRCUIT_BREAKER:${this.name}] Tripped to OPEN for ${this.resetTimeoutMs}ms.`,
      );
    }
  }

  /**
   * Manually resets circuit breaker to closed state (useful for tests).
   */
  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.nextAttempt = Date.now();
  }
}
