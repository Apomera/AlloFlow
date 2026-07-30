export class PilotError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status = 400) {
    super(code);
    this.name = "PilotError";
    this.code = code;
    this.status = status;
  }
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function toIso(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function opaqueId(prefix: "upl" | "job"): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function isOpaqueId(
  value: string,
  prefix: "upl" | "job",
): boolean {
  return new RegExp(`^${prefix}_[0-9a-f]{32}$`).test(value);
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export async function sha256Base64Url(
  value: string | Uint8Array,
): Promise<string> {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digestBytes = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest("SHA-256", digestBytes.buffer);
  return base64UrlEncode(new Uint8Array(digest));
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |=
      (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function noStoreHeaders(
  additions: Record<string, string> = {},
): Headers {
  return new Headers({
    "Cache-Control": "no-store",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    ...additions,
  });
}

export function jsonError(error: unknown): Response {
  const pilotError =
    error instanceof PilotError
      ? error
      : new PilotError("internal_error", 500);
  return Response.json(
    {
      ok: false,
      error: pilotError.code,
    },
    {
      status: pilotError.status,
      headers: noStoreHeaders(),
    },
  );
}

export function safeErrorCode(error: unknown): string {
  if (error instanceof PilotError) {
    return error.code;
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "runner_timeout";
  }
  return "remediation_failed";
}

export function parseBearer(
  request: Request,
  scheme: "Upload" | "Download",
): string {
  const authorization = request.headers.get("Authorization") || "";
  const [actualScheme, token, ...extra] = authorization.trim().split(/\s+/u);
  if (
    actualScheme !== scheme ||
    !token ||
    extra.length > 0 ||
    !/^[A-Za-z0-9_-]{43}$/u.test(token)
  ) {
    throw new PilotError("invalid_grant", 401);
  }
  return token;
}

type StreamBody = {
  readonly body: ReadableStream<Uint8Array> | null;
  readonly headers: Headers;
};

async function cancelBody(
  body: ReadableStream<Uint8Array> | null,
  reason: Error,
): Promise<void> {
  if (!body || body.locked) {
    return;
  }
  try {
    await body.cancel(reason);
  } catch {
    // The size error is authoritative even if an upstream stream cannot cancel.
  }
}

export async function readBoundedBytes(
  source: StreamBody,
  maximumBytes: number,
  tooLargeError: PilotError,
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) {
    throw new Error("invalid_maximum_bytes");
  }

  const contentLength = source.headers.get("Content-Length");
  if (contentLength && /^\d+$/u.test(contentLength)) {
    const declaredBytes = Number(contentLength);
    if (
      !Number.isSafeInteger(declaredBytes) ||
      declaredBytes > maximumBytes
    ) {
      await cancelBody(source.body, tooLargeError);
      throw tooLargeError;
    }
  }

  if (!source.body) {
    return new Uint8Array();
  }

  const reader = source.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      const chunk =
        result.value instanceof Uint8Array
          ? result.value
          : new Uint8Array(result.value);
      receivedBytes += chunk.byteLength;
      if (receivedBytes > maximumBytes) {
        try {
          await reader.cancel(tooLargeError);
        } catch {
          // The size error is authoritative even if cancellation fails.
        }
        throw tooLargeError;
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readBoundedText(
  source: StreamBody,
  maximumBytes: number,
  tooLargeError: PilotError,
): Promise<string> {
  const bytes = await readBoundedBytes(source, maximumBytes, tooLargeError);
  return new TextDecoder().decode(bytes);
}

export async function readJson<T>(
  response: Response,
  maximumBytes = 128 * 1024,
): Promise<T> {
  const text = await readBoundedText(
    response,
    maximumBytes,
    new PilotError("response_too_large", 502),
  );
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new PilotError("invalid_json_response", 502);
  }
}

