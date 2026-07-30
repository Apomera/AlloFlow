import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";

const harness = createTestHarness({
  workers: [{ configPath: "./wrangler.jsonc" }],
});

const MODERN_PROTOCOL_VERSION = "2026-07-28";
const MODERN_REQUEST_META = {
  "io.modelcontextprotocol/protocolVersion": MODERN_PROTOCOL_VERSION,
  "io.modelcontextprotocol/clientInfo": {
    name: "alloflow-remote-mcp-test",
    version: "0.1.0",
  },
  "io.modelcontextprotocol/clientCapabilities": {},
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id?: number | string;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
  };
};

type HarnessResponse = Awaited<
  ReturnType<ReturnType<typeof harness.getWorker>["fetch"]>
>;

async function readMcpResponse(
  response: HarnessResponse,
): Promise<JsonRpcResponse> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as JsonRpcResponse;
  }

  const body = await response.text();
  const data = body
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .find((line) => line && line !== "[DONE]");

  if (!data) {
    throw new Error(`No MCP JSON payload in response: ${body.slice(0, 500)}`);
  }
  return JSON.parse(data) as JsonRpcResponse;
}

async function mcpRequest(
  id: number,
  method: string,
  params: Record<string, unknown>,
  options: {
    legacy?: boolean;
    name?: string;
  } = {},
): Promise<{ response: HarnessResponse; body: JsonRpcResponse }> {
  const worker = harness.getWorker();
  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    "Mcp-Method": method,
  };
  const requestParams = options.legacy
    ? params
    : {
        ...params,
        _meta: MODERN_REQUEST_META,
      };

  if (!options.legacy) {
    headers["MCP-Protocol-Version"] = MODERN_PROTOCOL_VERSION;
  }
  if (options.name) {
    headers["Mcp-Name"] = options.name;
  }

  const response = await worker.fetch("/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params: requestParams,
    }),
  });

  return {
    response,
    body: await readMcpResponse(response),
  };
}

beforeAll(async () => {
  await harness.listen();
});

afterEach(async ({ task }) => {
  if (task.result?.state === "fail") {
    harness.debug();
  }
  await harness.reset();
});

afterAll(async () => {
  await harness.close();
});

describe("AlloFlow remote MCP gateway", () => {
  it("reports an honest health state", async () => {
    const response = await harness.getWorker().fetch("/healthz");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      ok: true,
      protocolState: "stateless",
      documentRemediationConfigured: false,
      documentToolsEnabled: false,
    });
  });

  it.each([
    ["/mcp", 64 * 1024 + 1, "application/json"],
    ["/register", 16 * 1024 + 1, "application/json"],
    ["/token", 16 * 1024 + 1, "application/x-www-form-urlencoded"],
  ])(
    "rejects an oversized protocol body before dispatching %s",
    async (pathname, size, contentType) => {
      const response = await harness.getWorker().fetch(pathname, {
        method: "POST",
        headers: {
          "Content-Type": contentType,
        },
        body: "x".repeat(size),
      });

      expect(response.status).toBe(413);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({
        ok: false,
        error: "request_too_large",
      });
    },
  );

  it("discovers the server through the modern stateless protocol", async () => {
    const { response, body } = await mcpRequest(1, "server/discover", {});

    expect(response.status).toBe(200);
    expect(response.headers.get("mcp-session-id")).toBeNull();
    expect(body.error).toBeUndefined();
    expect(body.result).toMatchObject({
      _meta: {
        "io.modelcontextprotocol/serverInfo": {
          name: "alloflow-remediation",
          version: "0.3.0",
        },
      },
    });
    expect(body.result?.supportedVersions).toContain(MODERN_PROTOCOL_VERSION);
  });

  it("keeps stateless compatibility for initialize-era clients", async () => {
    const { response, body } = await mcpRequest(
      2,
      "initialize",
      {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: {
          name: "alloflow-remote-mcp-test",
          version: "0.1.0",
        },
      },
      { legacy: true },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("mcp-session-id")).toBeNull();
    expect(body.error).toBeUndefined();
    expect(body.result).toMatchObject({
      serverInfo: {
        name: "alloflow-remediation",
        version: "0.3.0",
      },
    });
  });

  it("advertises only the implemented capabilities tool", async () => {
    const { body } = await mcpRequest(3, "tools/list", {});

    expect(body.error).toBeUndefined();
    const tools = (body.result?.tools || []) as Array<Record<string, unknown>>;
    expect(tools.map((tool) => tool.name)).toEqual([
      "remediation_capabilities",
    ]);
    expect(tools[0]?.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
    expect(tools[0]?.securitySchemes).toEqual([
      { type: "noauth" },
    ]);
    expect(tools[0]?._meta).toMatchObject({
      securitySchemes: [
        { type: "noauth" },
      ],
    });
  });

  it("returns structured capability truth without accepting documents", async () => {
    const { body } = await mcpRequest(
      4,
      "tools/call",
      {
        name: "remediation_capabilities",
        arguments: {},
      },
      { name: "remediation_capabilities" },
    );

    expect(body.error).toBeUndefined();
    expect(body.result?.structuredContent).toMatchObject({
      protocolReady: true,
      documentRemediationConfigured: false,
      documentToolsEnabled: false,
      protocolState: "stateless",
      authentication: "not-configured",
      documentIntake: "not-configured",
      jobStorage: "not-configured",
      remediationRunner: "not-configured",
      implementedTools: ["remediation_capabilities"],
      remediationCoverage: {
        effortProfiles: ["standard", "thorough"],
        privacySafeReportTool: true,
        independentPdfUaValidation: false,
      },
      admissionControl:
        "d1-backed-owner-and-institution-quotas",
    });
  });
});
