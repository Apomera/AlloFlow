import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(
    new URL("../src/remediation-workflow.ts", import.meta.url),
  ),
  "utf8",
);

describe("remediation workflow privacy and capacity invariants", () => {
  it("stores only a sensitive minimal claim output", () => {
    const claimStart = source.indexOf('"claim queued job"');
    const runStart = source.indexOf('"run isolated remediation"');
    const claimBlock = source.slice(claimStart, runStart);

    expect(claimStart).toBeGreaterThan(-1);
    expect(claimBlock).toContain('sensitive: "output"');
    expect(claimBlock).toContain("minimalRunnerJob");
  });

  it("releases the container before publishing completed state", () => {
    const release = source.indexOf('"release remediation container"');
    const publish = source.indexOf('"verify and publish result"');
    const complete = source.indexOf("await completeJob(");

    expect(release).toBeGreaterThan(-1);
    expect(release).toBeLessThan(publish);
    expect(publish).toBeLessThan(complete);
  });

  it("fences failure state before releasing or deleting artifacts", () => {
    const cleanup = source.indexOf('"remove failed artifacts"');
    const cleanupBlock = source.slice(
      cleanup,
      source.indexOf("throw new PilotError(errorCode", cleanup),
    );

    expect(cleanup).toBeGreaterThan(-1);
    expect(cleanupBlock.indexOf("await container.destroy()")).toBeGreaterThan(
      -1,
    );
    expect(cleanupBlock.indexOf("await failJob(")).toBeLessThan(
      cleanupBlock.indexOf("await container.destroy()"),
    );
  });

  it("uses Workflow retry attempts as fenced runner leases", () => {
    const runStart = source.indexOf('"run isolated remediation"');
    const releaseStart = source.indexOf(
      '"release remediation container"',
      runStart,
    );
    const runBlock = source.slice(runStart, releaseStart);

    expect(runBlock).toContain("context.attempt");
    expect(runBlock).toContain("claimJobAttempt(");
    expect(runBlock).toContain("runWithLeaseHeartbeat(");
    expect(source).toContain("RUNNER_HEARTBEAT_INTERVAL_MS = 30_000");
    expect(source).toContain("await renewJobLease(");
    expect(source).toContain("result.attemptId");
  });

  it("uses lease slack for transient D1 renewal failures without hiding fencing", () => {
    const heartbeatStart = source.indexOf(
      "async function runWithLeaseHeartbeat(",
    );
    const resultStart = source.indexOf(
      "function runnerResult(",
      heartbeatStart,
    );
    const heartbeat = source.slice(heartbeatStart, resultStart);

    expect(heartbeatStart).toBeGreaterThan(-1);
    expect(heartbeat).toContain("lastSuccessfulLeaseRenewalAt");
    expect(heartbeat).toContain("deferredLeaseRenewals");
    expect(heartbeat).toContain("RUNNING_JOB_LEASE_SECONDS * 1000");
    expect(heartbeat).toContain("RUNNER_LEASE_RENEWAL_SAFETY_MS");
    expect(heartbeat).toContain("if (error instanceof PilotError)");
    expect(heartbeat).toContain(
      'throw new PilotError("job_lease_renewal_failed", 503)',
    );
  });

  it("surfaces only strict, non-retryable, allowlisted runner policy failures", () => {
    const parserStart = source.indexOf(
      "function publicRunnerFailure(",
    );
    const requestStart = source.indexOf(
      "async function runnerRequestError(",
    );
    const parserBlock = source.slice(parserStart, requestStart);

    expect(parserStart).toBeGreaterThan(-1);
    expect(parserBlock).toContain('value.schema !== 1');
    expect(parserBlock).toContain('value.status !== "error"');
    expect(parserBlock).toContain('error.retryable !== false');
    for (const code of [
      "distribution_review_required",
      "tagged_pdf_verification_failed",
      "verification_binding_failed",
      "active_content_requires_review",
      "active_content_scan_unavailable",
      "checkpoint_snapshot_too_large",
      "model_throttled",
    ]) {
      expect(source).toContain(`"${code}"`);
    }
    expect(source).toContain(
      "? new NonRetryableError(publicFailure)",
    );
    expect(source).toContain(
      "error instanceof NonRetryableError",
    );
    expect(source).toContain(
      "throw await runnerRequestError(this.env, response)",
    );
  });

  it("propagates bounded provider backoff and shares retry spend across attempts", () => {
    expect(source).toContain("function modelThrottleFailure(");
    expect(source).toContain('error.code !== "model_throttled"');
    expect(source).toContain("error.retryAfterMs <= 10 * 60 * 1000");
    expect(source).toContain("function runnerRetryDelay(");
    expect(source).toContain(
      "Math.max(15_000, Math.min(10 * 60 * 1000, error.retryAfterMs))",
    );
    expect(source).toContain(
      "const retryAfterMs = runnerRetryDelay(error);",
    );
    expect(source).toContain(
      'workflowMetric(this.env, "model_retry_delay"',
    );
    expect(source).toContain(
      "RUNNER_MODEL_RETRY_BUDGET_BY_ATTEMPT = [4, 2]",
    );
    expect(source).toContain("modelRetryBudget:");
    expect(source).toContain('workflowMetric(env, "model_throttled"');
    expect(source).toContain(
      'workflowMetric(env, "model_retry_budget_exhausted"',
    );
  });

  it("emits bounded checkpoint and lease lifecycle metrics without identifiers", () => {
    expect(source).toContain("function emitRunnerCheckpointTelemetry(");
    expect(source).toContain('emitSizes("checkpoint_resumed"');
    expect(source).toContain('emitSizes("checkpoint_saved"');
    expect(source).toContain('workflowMetric(env, "lease_renewal"');
    expect(source).toContain("bytes: metric.compressedBytes");
    expect(source).toContain("bytes: metric.uncompressedBytes");
  });

  it("validates every runner quality field before accepting artifacts", () => {
    const resultStart = source.indexOf("function runnerResult(");
    const resultEnd = source.indexOf(
      "function checksumHex(",
      resultStart,
    );
    const resultBlock = source.slice(resultStart, resultEnd);

    expect(resultStart).toBeGreaterThan(-1);
    for (const field of [
      "activeContentScanVerified",
      "activeContentDetected",
      "distributionLevel",
      "verificationState",
      "verificationHtmlBound",
      "taggedPdfDelivery",
      "taggedPdfExportMode",
      "remainingAxeViolations",
      "remainingEqualAccessFailures",
      "auditCoverage",
    ]) {
      expect(resultBlock).toContain(field);
    }
    expect(resultBlock).toContain('"ready"');
    expect(resultBlock).toContain('"caution"');
    expect(resultBlock).toContain('"verified"');
    expect(resultBlock).toContain('"original_layout"');
    expect(resultBlock).toContain("isNullableFindingCount");
    expect(resultBlock).toContain("isRunnerAuditCoverage");
    expect(source).toContain("value.configuredAuditorCap === 5");
    expect(source).toContain("completed >= requested");
    expect(source).toContain("value.sliced === false");
  });
});
