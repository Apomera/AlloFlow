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

  it("releases a failed container before marking the job inactive", () => {
    const cleanup = source.indexOf('"remove failed artifacts"');
    const cleanupBlock = source.slice(
      cleanup,
      source.indexOf("throw new PilotError(errorCode", cleanup),
    );

    expect(cleanup).toBeGreaterThan(-1);
    expect(cleanupBlock.indexOf("await container.destroy()")).toBeGreaterThan(
      -1,
    );
    expect(cleanupBlock.indexOf("await container.destroy()")).toBeLessThan(
      cleanupBlock.indexOf("await failJob("),
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
    ]) {
      expect(source).toContain(`"${code}"`);
    }
    expect(source).toContain(
      'publicRunnerFailure(body) ?? "runner_request_failed"',
    );
    expect(source).toContain(
      "throw await runnerRequestError(response)",
    );
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
