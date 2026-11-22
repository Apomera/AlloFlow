import { afterEach, describe, expect, it, vi } from "vitest";

const { mockGetContainer } = vi.hoisted(() => ({
  mockGetContainer: vi.fn(),
}));

vi.mock("@cloudflare/containers", () => ({
  Container: class MockContainer {},
  getContainer: mockGetContainer,
}));

vi.mock("cloudflare:workers", () => ({
  WorkflowEntrypoint: class MockWorkflowEntrypoint<E> {
    constructor(
      protected readonly ctx: unknown,
      protected readonly env: E,
    ) {}
  },
}));

vi.mock("cloudflare:workflows", () => ({
  NonRetryableError: class MockNonRetryableError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "NonRetryableError";
    }
  },
}));

vi.mock("../src/job-store", async () => {
  const actual =
    await vi.importActual<typeof import("../src/job-store")>("../src/job-store");
  return {
    ...actual,
    getInternalJob: vi.fn(),
    getJobCheckpoint: vi.fn(async () => null),
    markJobRunning: vi.fn(),
    claimJobAttempt: vi.fn(),
    renewJobLease: vi.fn(async () => undefined),
    completeJob: vi.fn(async () => undefined),
    finalizeInputDeletion: vi.fn(async () => undefined),
    failCurrentWorkflowAttempt: vi.fn(async () => ({
      owned: false,
      attemptId: null,
    })),
  };
});

import {
  MAX_GEMINI_REQUEST_BYTES,
  RemediationContainer,
} from "../src/remediation-container";
import {
  RemediationWorkflow,
  prepareContainerForRetryAttempt,
  probeContainerForRetryPreservation,
} from "../src/remediation-workflow";
import {
  BUNDLED_TESSERACT_LANGUAGES,
  PILOT_TOOL_NAMES,
  REMOTE_MCP_VERSION,
  getRemoteCapabilities,
} from "../src/pilot-capabilities";
import {
  claimJobAttempt,
  getInternalJob,
  markJobRunning,
  type JobRow,
} from "../src/job-store";
import {
  REQUIRED_PILOT_ACCEPTANCE_VERSION,
  type PilotEnv,
} from "../src/pilot-env";
import { nowSeconds } from "../src/security";

const JOB_ID = "job_0123456789abcdef0123456789abcdef";
const OTHER_JOB_ID = "job_fedcba9876543210fedcba9876543210";
const ATTEMPT_ID = `${JOB_ID}:run-1:attempt-1`;
const RUNNER_AUTH_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";

const OUTBOUND_CTX = {
  containerId: "ctr_wave9_01",
  className: "RemediationContainer",
  params: { jobId: JOB_ID, attemptId: ATTEMPT_ID },
};

function mockJob(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: JOB_ID,
    institution_id: "district_opaque_01",
    owner_id: "owner_1",
    upload_id: "upl_0123456789abcdef0123456789abcdef",
    status: "running",
    attempt_id: ATTEMPT_ID,
    attempt_number: 1,
    lease_expires_at: nowSeconds() + 300,
    input_key: "tenant/district_opaque_01/input/upl_1.pdf",
    input_sha256: "a".repeat(64),
    input_size_bytes: 1024,
    target_score: 95,
    fix_passes: 2,
    effort_profile: "standard",
    ocr_language: "",
    polish_passes: 0,
    auto_continue_rounds: 0,
    result_key: "tenant/district_opaque_01/result/job/attempt-2.pdf",
    result_sha256: null,
    result_size_bytes: null,
    report_key: "tenant/district_opaque_01/report/job/attempt-2.json",
    report_sha256: null,
    report_size_bytes: null,
    error_code: null,
    created_at: nowSeconds() - 10,
    updated_at: nowSeconds() - 5,
    completed_at: null,
    expires_at: nowSeconds() + 3600,
    ...overrides,
  } as JobRow;
}

function completePilotEnv(overrides: Partial<PilotEnv> = {}): PilotEnv {
  return {
    PILOT_ENABLED: "true",
    PUBLIC_ORIGIN: "https://mcp.district.example",
    INSTITUTION_ID: "district_opaque_01",
    CHATGPT_REDIRECT_URI:
      "https://chatgpt.com/connector/oauth/callback_123",
    PILOT_ACCEPTANCE_VERSION: REQUIRED_PILOT_ACCEPTANCE_VERSION,
    ACCESS_AUTHORIZATION_URL:
      "https://district.cloudflareaccess.com/authorize",
    ACCESS_TOKEN_URL:
      "https://district.cloudflareaccess.com/token",
    ACCESS_JWKS_URL:
      "https://district.cloudflareaccess.com/jwks",
    ACCESS_ISSUER:
      "https://district.cloudflareaccess.com/issuer",
    ACCESS_CLIENT_ID: "public-client-id",
    ACCESS_CLIENT_SECRET: "0123456789abcdef0123456789abcdef",
    GEMINI_API_KEY: "test-gemini-key-0123456789abcdef",
    GEMINI_MODEL: "gemini-2.5-flash",
    GEMINI_FALLBACK_MODEL: "gemini-2.5-flash-lite",
    RELEASE_CANARY_SECRET: RUNNER_AUTH_SECRET,
    RUNNER_AUTH_SECRET,
    TRANSFER_ACCESS_AUDIENCE: "0".repeat(64),
    OAUTH_KV: {} as KVNamespace,
    PILOT_DB: {} as D1Database,
    DOCUMENTS: {
      delete: vi.fn(async () => undefined),
      head: vi.fn(async () => null),
      list: vi.fn(async () => ({ objects: [], truncated: false })),
    } as unknown as R2Bucket,
    REMEDIATION_WORKFLOW: {} as Workflow<{ jobId: string }>,
    REMEDIATION_CONTAINER: {} as PilotEnv["REMEDIATION_CONTAINER"],
    DCR_RATE_LIMITER: {
      limit: vi.fn(async () => ({ success: true })),
    } as unknown as RateLimit,
    ...overrides,
  };
}

async function readStreamToString(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

afterEach(() => {
  vi.restoreAllMocks();
  mockGetContainer.mockReset();
});

describe("Wave 9B: streaming geminiOutbound request bodies", () => {
  it("streams a multi-chunk ReadableStream cleanly within budget without calling request.arrayBuffer()", async () => {
    vi.mocked(getInternalJob).mockResolvedValueOnce(
      mockJob({ lease_expires_at: nowSeconds() + 300 }),
    );
    const encoder = new TextEncoder();
    const parts = [
      '{"contents":[{"role":"user","parts":[{"text":"chunk-1-hello "}',
      ',{"text":"chunk-2-world"}]}]}',
    ];
    const bodyStream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const part of parts) {
          controller.enqueue(encoder.encode(part));
        }
        controller.close();
      },
    });
    const request = new Request(
      "http://gemini.internal/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: bodyStream,
        duplex: "half",
      } as RequestInit & { duplex: "half" },
    );
    const arrayBufferSpy = vi.spyOn(request, "arrayBuffer");

    let forwardedBody = "";
    let forwardedBodyWasStream = false;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(async (_url, init) => {
        forwardedBodyWasStream = init?.body instanceof ReadableStream;
        expect(forwardedBodyWasStream).toBe(true);
        forwardedBody = await readStreamToString(
          init?.body as ReadableStream<Uint8Array>,
        );
        return new Response(JSON.stringify({ candidates: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

    const res = await RemediationContainer.outboundHandlers.gemini(
      request,
      completePilotEnv(),
      OUTBOUND_CTX,
    );

    expect(res.status).toBe(200);
    expect(arrayBufferSpy).not.toHaveBeenCalled();
    expect(forwardedBodyWasStream).toBe(true);
    expect(forwardedBody).toBe(parts.join(""));
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("rejects oversized Content-Length immediately with 413 without calling fetch", async () => {
    vi.mocked(getInternalJob).mockResolvedValueOnce(
      mockJob({ lease_expires_at: nowSeconds() + 300 }),
    );
    let cancelled = false;
    const bodyStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"contents":[]}'));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request(
      "http://gemini.internal/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(MAX_GEMINI_REQUEST_BYTES + 1),
        },
        body: bodyStream,
        duplex: "half",
      } as RequestInit & { duplex: "half" },
    );
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await RemediationContainer.outboundHandlers.gemini(
      request,
      completePilotEnv(),
      OUTBOUND_CTX,
    );

    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({
      ok: false,
      error: "model_request_too_large",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(cancelled).toBe(true);
  });

  it("aborts and returns 413 mid-stream when streamed bytes exceed MAX_GEMINI_REQUEST_BYTES", async () => {
    vi.mocked(getInternalJob).mockResolvedValueOnce(
      mockJob({ lease_expires_at: nowSeconds() + 300 }),
    );
    const oneMiB = new Uint8Array(1024 * 1024);
    let chunksSent = 0;
    let sourceCancelled = false;
    const oversizedStream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunksSent >= 100) {
          controller.close();
          return;
        }
        chunksSent += 1;
        controller.enqueue(oneMiB);
      },
      cancel() {
        sourceCancelled = true;
      },
    });
    const request = new Request(
      "http://gemini.internal/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: oversizedStream,
        duplex: "half",
      } as RequestInit & { duplex: "half" },
    );
    const arrayBufferSpy = vi.spyOn(request, "arrayBuffer");
    let observedAbort = false;

    vi.spyOn(globalThis, "fetch").mockImplementationOnce(async (_url, init) => {
      const reader = (init?.body as ReadableStream<Uint8Array>).getReader();
      try {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      } catch (err) {
        observedAbort = Boolean(init?.signal?.aborted);
        // Simulate undici wrapping the stream error inside a generic TypeError.
        throw new TypeError("fetch failed", { cause: err });
      } finally {
        reader.releaseLock();
      }
      return new Response("{}", { status: 200 });
    });

    const res = await RemediationContainer.outboundHandlers.gemini(
      request,
      completePilotEnv(),
      OUTBOUND_CTX,
    );

    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({
      ok: false,
      error: "model_request_too_large",
    });
    expect(arrayBufferSpy).not.toHaveBeenCalled();
    expect(observedAbort).toBe(true);
    expect(sourceCancelled).toBe(true);
    expect(chunksSent).toBeLessThanOrEqual(22);
  });
});

describe("Wave 9B: Attempt-2 localOutputsReady container preservation", () => {
  it("preserves a healthy container reporting localOutputsReady for the same job without calling destroy()", async () => {
    const fetchMock = vi.fn(async (req: Request) => {
      expect(req.url).toBe(
        `http://container.internal/v1/status?job_id=${encodeURIComponent(JOB_ID)}`,
      );
      expect(req.headers.get("Authorization")).toMatch(/^Bearer [A-Za-z0-9_-]{43}$/u);
      return Response.json({
        schema: 1,
        jobId: JOB_ID,
        status: "retryable",
        localOutputsReady: true,
      });
    });
    const destroyMock = vi.fn(async () => undefined);
    const decision = await prepareContainerForRetryAttempt(
      completePilotEnv(),
      { fetch: fetchMock, destroy: destroyMock },
      JOB_ID,
      1,
      2,
      `${JOB_ID}:run-1:attempt-2`,
    );

    expect(decision.preserved).toBe(true);
    expect(decision.reason).toBe("local_outputs_ready");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(destroyMock).not.toHaveBeenCalled();
  });

  it.each([
    [
      "container unreachable",
      async () => {
        throw new Error("connect ECONNREFUSED");
      },
      "probe_failed",
    ],
    [
      "container returns 503 unhealthy",
      async () => new Response("unavailable", { status: 503 }),
      "status_not_ok",
    ],
    [
      "container reports a different jobId",
      async () =>
        Response.json({
          schema: 1,
          jobId: OTHER_JOB_ID,
          status: "retryable",
          localOutputsReady: true,
        }),
      "job_mismatch",
    ],
    [
      "container reports a different attemptId",
      async () =>
        Response.json({
          schema: 1,
          jobId: JOB_ID,
          attemptId: `${JOB_ID}:run-1:attempt-99`,
          status: "retryable",
          localOutputsReady: true,
        }),
      "attempt_mismatch",
    ],
    [
      "container lacks localOutputsReady",
      async () =>
        Response.json({
          schema: 1,
          jobId: JOB_ID,
          status: "retryable",
          localOutputsReady: false,
        }),
      "not_reusable",
    ],
    [
      "container is in terminal failed state",
      async () =>
        Response.json({
          schema: 1,
          jobId: JOB_ID,
          status: "failed",
          localOutputsReady: true,
        }),
      "not_reusable",
    ],
  ])(
    "destroys container on retry when %s",
    async (_label, fetchImpl, expectedReason) => {
      const fetchMock = vi.fn(fetchImpl);
      const destroyMock = vi.fn(async () => undefined);
      const decision = await prepareContainerForRetryAttempt(
        completePilotEnv(),
        { fetch: fetchMock, destroy: destroyMock },
        JOB_ID,
        1,
        2,
        `${JOB_ID}:run-1:attempt-2`,
      );

      expect(decision.preserved).toBe(false);
      expect(decision.reason).toBe(expectedReason);
      expect(destroyMock).toHaveBeenCalledOnce();
    },
  );

  it("probeContainerForRetryPreservation accepts matching attemptId when reported", async () => {
    const probe = await probeContainerForRetryPreservation(
      {
        fetch: vi.fn(async () =>
          Response.json({
            schema: 1,
            jobId: JOB_ID,
            attemptId: ATTEMPT_ID,
            status: "uploading",
            localOutputsReady: true,
          }),
        ),
      },
      JOB_ID,
      "a".repeat(43),
      ATTEMPT_ID,
    );
    expect(probe).toEqual({ preserve: true, reason: "local_outputs_ready" });
  });

  it("keeps container alive in RemediationWorkflow Attempt 2 when /v1/status reports localOutputsReady", async () => {
    const pdfSha = "b".repeat(64);
    const reportSha = "c".repeat(64);
    const pdfDigest = Uint8Array.from(Buffer.from(pdfSha, "hex")).buffer;
    const reportDigest = Uint8Array.from(Buffer.from(reportSha, "hex")).buffer;

    vi.mocked(markJobRunning).mockResolvedValueOnce(mockJob());
    vi.mocked(claimJobAttempt).mockResolvedValueOnce({
      job: mockJob({
        attempt_id: `${JOB_ID}:run-1:attempt-2`,
        attempt_number: 2,
      }),
      supersededArtifactKeys: [],
    });
    vi.mocked(getInternalJob).mockResolvedValue(
      mockJob({
        attempt_id: `${JOB_ID}:run-1:attempt-2`,
        attempt_number: 2,
      }),
    );

    const events: string[] = [];
    let observedRunPayload: { options?: { modelRetryBudget?: number } } | null =
      null;
    let statusAuthHeader: string | null = null;
    let runAuthHeader: string | null = null;

    const fakeContainer = {
      fetch: vi.fn(async (req: Request) => {
        const url = new URL(req.url);
        if (url.pathname === "/v1/status") {
          events.push("status");
          statusAuthHeader = req.headers.get("Authorization");
          return Response.json({
            schema: 1,
            jobId: JOB_ID,
            status: "retryable",
            localOutputsReady: true,
          });
        }
        if (url.pathname === "/v1/run") {
          events.push("run");
          runAuthHeader = req.headers.get("Authorization");
          observedRunPayload = (await req.json()) as {
            options?: { modelRetryBudget?: number };
          };
          return Response.json({
            schema: 1,
            jobId: JOB_ID,
            status: "succeeded",
            summary: {
              beforeScore: 60,
              afterScore: 98,
              autoContinueRoundsRun: 0,
              activeContentScanVerified: true,
              activeContentDetected: false,
              distributionLevel: "ready",
              verificationState: "complete",
              verificationHtmlBound: true,
              taggedPdfDelivery: "verified",
              taggedPdfExportMode: "original_layout",
              remainingAxeViolations: 0,
              remainingEqualAccessFailures: 0,
              auditCoverage: {
                configuredAuditorCap: 5,
                requestedAuditors: 5,
                completedAuditors: 5,
                sliced: false,
              },
            },
            artifacts: [
              {
                kind: "tagged_pdf",
                contentType: "application/pdf",
                size: 1024,
                sha256: pdfSha,
              },
              {
                kind: "report",
                contentType: "application/json",
                size: 256,
                sha256: reportSha,
              },
            ],
          });
        }
        return new Response("not_found", { status: 404 });
      }),
      configureJob: vi.fn(async () => {
        events.push("configureJob");
      }),
      destroy: vi.fn(async () => {
        events.push("destroy");
      }),
    };
    mockGetContainer.mockReturnValue(fakeContainer);

    const env = completePilotEnv({
      DOCUMENTS: {
        delete: vi.fn(async () => undefined),
        list: vi.fn(async () => ({ objects: [], truncated: false })),
        head: vi.fn(async (key: string) => {
          if (key.endsWith(".pdf")) {
            return {
              size: 1024,
              httpMetadata: { contentType: "application/pdf" },
              checksums: { sha256: pdfDigest },
            };
          }
          return {
            size: 256,
            httpMetadata: { contentType: "application/json" },
            checksums: { sha256: reportDigest },
          };
        }),
      } as unknown as R2Bucket,
    });

    const workflow = new RemediationWorkflow(
      {} as ExecutionContext,
      env,
    );
    const step = {
      do: vi.fn(async (name: string, _opts: unknown, fn?: unknown) => {
        const callback = (typeof _opts === "function" ? _opts : fn) as (
          ctx?: { step: { count: number }; attempt: number },
        ) => Promise<unknown>;
        if (name === "run isolated remediation") {
          return callback({ step: { count: 1 }, attempt: 2 });
        }
        return callback();
      }),
    };

    const outcome = await workflow.run(
      {
        payload: { jobId: JOB_ID },
        instanceId: "wf_instance_wave9_01",
        timestamp: new Date(),
        workflowName: "remediation-workflow",
      } as Parameters<RemediationWorkflow["run"]>[0],
      step as unknown as Parameters<RemediationWorkflow["run"]>[1],
    );

    expect(outcome).toEqual({ status: "completed", jobId: JOB_ID });
    // Container must be probed before configureJob/run, NOT destroyed prior to run,
    // and only destroyed in the post-run "release remediation container" step.
    expect(events).toEqual(["status", "configureJob", "run", "destroy"]);
    expect(statusAuthHeader).toBeTruthy();
    expect(runAuthHeader).toBe(statusAuthHeader);
    expect(fakeContainer.configureJob).toHaveBeenCalledWith(
      JOB_ID,
      `${JOB_ID}:run-1:attempt-2`,
      expect.any(String),
    );
    // Preserved container keeps Attempt 1's modelRetryBudget (4) so runner
    // requestDigest matches and localOutputsReady upload recovery succeeds.
    expect(
      (observedRunPayload as { options?: { modelRetryBudget?: number } } | null)
        ?.options?.modelRetryBudget,
    ).toBe(4);
  });
});

describe("Wave 9B: pilot capability truth alignment", () => {
  it("discloses bundled offline Tesseract language scope while preserving existing capability invariants", () => {
    expect(REMOTE_MCP_VERSION).toBe("0.3.0");
    expect(BUNDLED_TESSERACT_LANGUAGES).toEqual(["eng"]);

    for (const capabilities of [
      getRemoteCapabilities({}),
      getRemoteCapabilities(completePilotEnv()),
    ]) {
      expect(capabilities.remediationCoverage).toMatchObject({
        effortProfiles: ["standard", "thorough"],
        bundledTesseractLanguages: ["eng"],
        privacySafeReportTool: true,
        independentPdfUaValidation: false,
      });
      expect(capabilities.remediationCoverage.ocrLanguage).toContain("eng");
      expect(capabilities.remediationCoverage.ocrLanguage).toMatch(
        /vision|text extraction/iu,
      );
      expect(capabilities.remediationCoverage.ocrLanguage).toMatch(
        /Tesseract/u,
      );
    }

    const accepted = getRemoteCapabilities(completePilotEnv());
    expect(accepted.documentToolsEnabled).toBe(true);
    expect(accepted.implementedTools).toEqual(PILOT_TOOL_NAMES);
  });
});
