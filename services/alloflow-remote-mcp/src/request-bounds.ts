import {
  PilotError,
  readBoundedBytes,
} from "./security";

const MCP_REQUEST_MAX_BYTES = 64 * 1024;
const OAUTH_REQUEST_MAX_BYTES = 16 * 1024;

function requestBodyLimit(request: Request): number | undefined {
  if (request.method !== "POST") {
    return undefined;
  }
  const pathname = new URL(request.url).pathname;
  if (pathname === "/mcp") {
    return MCP_REQUEST_MAX_BYTES;
  }
  if (pathname === "/register" || pathname === "/token") {
    return OAUTH_REQUEST_MAX_BYTES;
  }
  return undefined;
}

/**
 * Bounds public protocol bodies before the OAuth provider or MCP SDK can call
 * their own convenience parsers. Rebuilding from the exact bytes avoids
 * cloning/teeing an attacker-controlled stream and preserves the original
 * method, URL, and headers used by downstream protocol handlers.
 */
export async function boundProtocolRequest(
  request: Request,
): Promise<Request> {
  const maximumBytes = requestBodyLimit(request);
  if (maximumBytes === undefined) {
    return request;
  }

  const bytes = await readBoundedBytes(
    request,
    maximumBytes,
    new PilotError("request_too_large", 413),
  );
  return new Request(request.url, {
    method: request.method,
    headers: new Headers(request.headers),
    body:
      bytes.byteLength > 0
        ? Uint8Array.from(bytes).buffer
        : undefined,
    redirect: request.redirect,
    signal: request.signal,
  });
}

export function exactLengthBodyStream(
  body: ReadableStream<Uint8Array>,
  expectedBytes: number,
  tooLargeError: Error,
  lengthMismatchError: Error,
): ReadableStream<Uint8Array> {
  let received = 0;
  const limiter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > expectedBytes) {
        controller.error(tooLargeError);
        return;
      }
      controller.enqueue(chunk);
    },
    flush(controller) {
      if (received !== expectedBytes) {
        controller.error(lengthMismatchError);
      }
    },
  });
  const bounded = body.pipeThrough(limiter);
  if (typeof FixedLengthStream === "function") {
    const fixed = new FixedLengthStream(expectedBytes);
    bounded.pipeTo(fixed.writable).catch(() => undefined);
    return fixed.readable;
  }
  return bounded;
}

export const protocolRequestLimits = Object.freeze({
  mcp: MCP_REQUEST_MAX_BYTES,
  oauth: OAUTH_REQUEST_MAX_BYTES,
});
