import { describe, expect, it } from "vitest";

import {
  boundProtocolRequest,
  protocolRequestLimits,
} from "../src/request-bounds";

function streamedRequest(
  pathname: string,
  chunks: Uint8Array[],
  onCancel?: () => void,
  headers: Record<string, string> = {},
  closeAfterChunks = true,
): Request {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      if (closeAfterChunks) {
        controller.close();
      }
    },
    cancel() {
      onCancel?.();
    },
  });
  return new Request(`https://mcp.example.test${pathname}`, {
    method: "POST",
    headers,
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

describe("outer protocol request bounds", () => {
  it("rebuilds an allowed MCP body from the exact bytes", async () => {
    const source = Uint8Array.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x7d]);
    const request = streamedRequest(
      "/mcp",
      [source.subarray(0, 3), source.subarray(3)],
      undefined,
      {
        "Content-Type": "application/json",
        Authorization: "Bearer opaque",
      },
    );

    const bounded = await boundProtocolRequest(request);

    expect(bounded).not.toBe(request);
    expect(bounded.method).toBe("POST");
    expect(bounded.headers.get("Authorization")).toBe("Bearer opaque");
    expect(Array.from(new Uint8Array(await bounded.arrayBuffer()))).toEqual(
      Array.from(source),
    );
  });

  it("cancels an oversized MCP stream without Content-Length", async () => {
    let cancelled = false;
    const first = new Uint8Array(protocolRequestLimits.mcp);
    const request = streamedRequest(
      "/mcp",
      [first, Uint8Array.of(1)],
      () => {
        cancelled = true;
      },
      {},
      false,
    );

    await expect(boundProtocolRequest(request)).rejects.toMatchObject({
      code: "request_too_large",
      status: 413,
    });
    expect(cancelled).toBe(true);
  });

  it("propagates client cancellation to the reconstructed request", async () => {
    const controller = new AbortController();
    const request = new Request("https://mcp.example.test/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: controller.signal,
    });

    const bounded = await boundProtocolRequest(request);
    expect(bounded.signal.aborted).toBe(false);

    controller.abort("client_disconnected");

    expect(bounded.signal.aborted).toBe(true);
    expect(bounded.signal.reason).toBe("client_disconnected");
  });

  it.each(["/register", "/token"])(
    "applies the smaller OAuth body cap to %s",
    async (pathname) => {
      let cancelled = false;
      const request = streamedRequest(
        pathname,
        [
          new Uint8Array(protocolRequestLimits.oauth),
          Uint8Array.of(1),
        ],
        () => {
          cancelled = true;
        },
        {},
        false,
      );

      await expect(boundProtocolRequest(request)).rejects.toMatchObject({
        code: "request_too_large",
        status: 413,
      });
      expect(cancelled).toBe(true);
    },
  );

  it("rejects and cancels an oversized declared body before reading", async () => {
    let cancelled = false;
    const request = streamedRequest(
      "/register",
      [Uint8Array.of(1)],
      () => {
        cancelled = true;
      },
      {
        "Content-Length": String(protocolRequestLimits.oauth + 1),
      },
    );

    await expect(boundProtocolRequest(request)).rejects.toMatchObject({
      code: "request_too_large",
      status: 413,
    });
    expect(cancelled).toBe(true);
  });

  it("does not consume bodies outside the public protocol routes", async () => {
    const request = streamedRequest("/upload/upl_example/content", [
      Uint8Array.of(1, 2, 3),
    ]);

    expect(await boundProtocolRequest(request)).toBe(request);
    expect(request.bodyUsed).toBe(false);
  });
});
