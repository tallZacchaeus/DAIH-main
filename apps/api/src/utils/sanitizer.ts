/**
 * Secret & Infrastructure Data Sanitizer
 * Enforces zero-leakage of environment variables, database URLs,
 * server hostnames, tokens, and credentials across logs and responses.
 */

// Dynamically extract all sensitive values from process.env
function getSensitiveEnvValues(): string[] {
  const values = new Set<string>();
  const ignored = new Set([
    "true",
    "false",
    "development",
    "production",
    "test",
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "1.0.0",
    "default",
    "none",
    "lax",
    "strict",
    "customer",
    "admin",
    "web",
    "auto",
    "resend",
    "zeptomail",
    "mock",
  ]);

  for (const [key, val] of Object.entries(process.env)) {
    if (
      SENSITIVE_KEY_REGEX.test(key) &&
      typeof val === "string" &&
      val.trim().length >= 4
    ) {
      const trimmed = val.trim();
      if (!ignored.has(trimmed.toLowerCase())) {
        values.add(trimmed);
      }
    }
  }

  // Sort longest first to avoid partial replacements
  return Array.from(values).sort((a, b) => b.length - a.length);
}

const SENSITIVE_KEY_REGEX =
  /password|secret|token|authorization|cookie|apikey|api_key|databaseurl|redisurl|privatekey|jwt|key|dsn|uri|connection/i;

// Match URI schemes (postgresql, postgres, mysql, redis, http, https with credentials or hosts)
const URI_REGEX =
  /(?:postgresql|postgres|mysql|mongodb|redis|rediss|amqp|amqps):\/\/[^\s"']+/gi;

// Match DB hostnames / cloud host patterns (e.g. *.neon.tech, *.aws.neon.tech, *.supabase.co, *.upstash.io, IP addresses)
const HOST_REGEX =
  /\b(?:[a-zA-Z0-9-]+\.)*(?:neon\.tech|supabase\.co|upstash\.io|amazonaws\.com|render\.com|railway\.app|herokuapp\.com)(?::\d+)?\b/gi;
const IP_PORT_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/g;

// Match JWT tokens and API key patterns
const JWT_REGEX = /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g;
const API_KEY_REGEX = /\b(?:sk|pk)_(?:live|test)_[a-zA-Z0-9]{10,}\b/g;
const RESEND_KEY_REGEX = /\bre_[a-zA-Z0-9_]{10,}\b/g;

/**
 * Sanitizes any string message, redacting all known env values,
 * connection strings, hostnames, passwords, and tokens.
 */
export function sanitizeMessage(input?: string | null): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  let sanitized = input;

  // 1. Redact known env values
  const envValues = getSensitiveEnvValues();
  for (const envVal of envValues) {
    if (sanitized.includes(envVal)) {
      sanitized = sanitized.split(envVal).join("[REDACTED_ENV_VALUE]");
    }
  }

  // 2. Redact URIs and connection strings
  sanitized = sanitized.replace(URI_REGEX, "[CONNECTION_URL_REDACTED]");

  // 3. Redact DB Hostnames and IP addresses
  sanitized = sanitized.replace(HOST_REGEX, "[HOST_REDACTED]");
  sanitized = sanitized.replace(IP_PORT_REGEX, "[IP_REDACTED]");

  // 4. Redact JWTs and API keys
  sanitized = sanitized.replace(JWT_REGEX, "[JWT_TOKEN_REDACTED]");
  sanitized = sanitized.replace(API_KEY_REGEX, "[API_KEY_REDACTED]");
  sanitized = sanitized.replace(RESEND_KEY_REGEX, "[API_KEY_REDACTED]");

  // 5. Prisma error cleanup
  sanitized = sanitized.replace(
    /Can't reach database server at `.*?`/gi,
    "Can't reach database server",
  );
  sanitized = sanitized.replace(
    /Please make sure your database server is running at `.*?`/gi,
    "Please verify database server status",
  );

  return sanitized;
}

/**
 * Recursively sanitizes objects and arrays, masking sensitive keys and string values.
 */
export function sanitizeObject<T>(obj: T, depth = 0): T {
  if (depth > 6 || obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeMessage(obj) as unknown as T;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1)) as unknown as T;
  }

  if (typeof obj === "object") {
    const sanitizedObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitizedObj[key] = "[REDACTED]";
      } else {
        sanitizedObj[key] = sanitizeObject(value, depth + 1);
      }
    }
    return sanitizedObj;
  }

  return obj;
}

/**
 * Sanitizes stack traces, removing environment variables and sensitive paths/URLs.
 */
export function sanitizeStack(stack?: string): string | undefined {
  if (!stack) return undefined;
  return sanitizeMessage(stack);
}

/**
 * Safe console logger that ensures all logged values are sanitized.
 */
export const safeLogger = {
  log: (...args: any[]): void => {
    console.log(
      ...args.map((a) =>
        typeof a === "string" ? sanitizeMessage(a) : sanitizeObject(a),
      ),
    );
  },
  info: (...args: any[]): void => {
    console.info(
      ...args.map((a) =>
        typeof a === "string" ? sanitizeMessage(a) : sanitizeObject(a),
      ),
    );
  },
  warn: (...args: any[]): void => {
    console.warn(
      ...args.map((a) =>
        typeof a === "string" ? sanitizeMessage(a) : sanitizeObject(a),
      ),
    );
  },
  error: (...args: any[]): void => {
    console.error(
      ...args.map((a) =>
        typeof a === "string" ? sanitizeMessage(a) : sanitizeObject(a),
      ),
    );
  },
};
