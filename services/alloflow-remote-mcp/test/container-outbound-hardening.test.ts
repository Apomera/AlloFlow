import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("@cloudflare/containers", () => ({
  Container: class MockContainer {},
}));

vi.mock("../src/job-store", async () => {
  const actual = await vi.importActual<typeof import("../src/job-store")>("../src/job-store");
  return {
    ...actual,
    getInternalJob: vi.fn(),
  };
});

import { RemediationContainer } from "../src/remediation-container";
import { getInternalJob, type JobRow } from "../src/job-store";
import { nowSeconds } from "../src/security";
import type { PilotEnv } from "../src/pilot-env";

const JOB_ID = "job_0123456789abcdef0123456789abcdef";
const ATTEMPT_ID = "attempt_0123456789abcdef";
const OUTBOUND_CTX = {
  containerId: "ctr_test_01",
  className: "RemediationContainer",
  params: { jobId: JOB_ID, attemptId: ATTEMPT_ID },
};

function mockJob(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: JOB_ID,
    institution_id: "inst_1",
    owner_id: "owner_1",
    upload_id: "upl_1",
    status: "running",
    attempt_id: ATTEMPT_ID,
    attempt_number: 1,
    lease_expires_at: nowSeconds() + 300,
    input_key: "inst_1/input.pdf",
    input_sha256: "a".repeat(64),
    input_size_bytes: 1024,
    options_json: "{}",
    result_key: null,
    result_sha256: null,
    result_size_bytes: null,
    report_key: null,
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

function mockEnv(overrides: Partial<PilotEnv> = {}): PilotEnv {
  return {
    GEMINI_API_KEY: "test-gemini-key",
    GEMINI_MODEL: "gemini-2.5-flash",
    DOCUMENTS: {
      get: vi.fn(async () => ({ body: new ReadableStream(), size: 5 })),
    } as unknown as R2Bucket,
    ...overrides,
  } as PilotEnv;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RemediationContainer outbound handlers (Wave 5 W5-8)", () => {
  it("rejects storageOutbound when job lease_expires_at has expired", async () => {
    vi.mocked(getInternalJob).mockResolvedValueOnce(
      mockJob({ lease_expires_at: nowSeconds() - 5 }),
    );
    const res = await RemediationContainer.outboundHandlers.jobStorage(
      new Request("http://r2.internal/input", { method: "GET" }),
      mockEnv(),
      OUTBOUND_CTX,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "runner_storage_denied" });
  });

  it("rejects geminiOutbound when job lease_expires_at has expired", async () => {
    vi.mocked(getInternalJob).mockResolvedValueOnce(
      mockJob({ lease_expires_at: nowSeconds() - 1 }),
    );
    const res = await RemediationContainer.outboundHandlers.gemini(
      new Request("http://gemini.internal/v1beta/models/gemini-2.5-flash:generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [] }),
      }),
      mockEnv(),
      OUTBOUND_CTX,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "model_request_denied" });
  });

  it("forwards bounded Retry-After header from upstream Gemini 429 and allows configured GEMINI_FALLBACK_MODEL", async () => {
    vi.mocked(getInternalJob).mockResolvedValue(
      mockJob({ lease_expires_at: nowSeconds() + 300 }),
    );
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 429 } }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "45",
        },
      }),
    );

    const env = mockEnv({ GEMINI_FALLBACK_MODEL: "gemini-2.5-flash-lite" });
    const res = await RemediationContainer.outboundHandlers.gemini(
      new Request("http://gemini.internal/v1beta/models/gemini-2.5-flash-lite:generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [] }),
      }),
      env,
      OUTBOUND_CTX,
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("45");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
      expect.anything(),
    );

    // Unapproved model path is still rejected.
    const denied = await RemediationContainer.outboundHandlers.gemini(
      new Request("http://gemini.internal/v1beta/models/evil-model:generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [] }),
      }),
      env,
      OUTBOUND_CTX,
    );
    expect(denied.status).toBe(403);
  });
});
