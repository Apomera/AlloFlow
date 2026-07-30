import { getContainer } from "@cloudflare/containers";
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";

import {
  completeJob,
  clearTerminalArtifacts,
  failJob,
  finalizeInputDeletion,
  getInternalJob,
  markJobRunning,
  type JobRow,
  type RunnerResult,
} from "./job-store";
import {
  assertPilotBindings,
  type PilotEnv,
  type RemediationWorkflowParams,
} from "./pilot-env";
import { RemediationContainer } from "./remediation-container";
import {
  PilotError,
  base64UrlEncode,
  readJson,
  safeErrorCode as publicSafeErrorCode,
} from "./security";

type PublicRunnerFailure =
  | "distribution_review_required"
  | "tagged_pdf_verification_failed"
  | "verification_binding_failed"
  | "active_content_requires_review"
  | "active_content_scan_unavailable";

type RunnerVerificationState =
  | "complete"
  | "complete-for-tested-scope"
  | "review-required"
  | "partial"
  | "unavailable";

type RunnerResponse = {
  schema: number;
  jobId: string;
  status: string;
  summary?: {
    beforeScore?: number;
    afterScore?: number;
    autoContinueRoundsRun?: number;
    activeContentScanVerified?: unknown;
    activeContentDetected?: unknown;
    distributionLevel?: unknown;
    verificationState?: unknown;
    verificationHtmlBound?: unknown;
    taggedPdfDelivery?: unknown;
    taggedPdfExportMode?: unknown;
    remainingAxeViolations?: unknown;
    remainingEqualAccessFailures?: unknown;
    auditCoverage?: unknown;
  };
  artifacts?: Array<{
    kind?: string;
    contentType?: string;
    size?: number;
    sha256?: string;
  }>;
};

const PUBLIC_RUNNER_FAILURES = new Set<PublicRunnerFailure>([
  "distribution_review_required",
  "tagged_pdf_verification_failed",
  "verification_binding_failed",
  "active_content_requires_review",
  "active_content_scan_unavailable",
]);

const RUNNER_VERIFICATION_STATES = new Set<RunnerVerificationState>([
  "complete",
  "complete-for-tested-scope",
  "review-required",
  "partial",
  "unavailable",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function publicRunnerFailure(value: unknown): PublicRunnerFailure | null {
  if (!isRecord(value) || value.schema !== 1 || value.status !== "error") {
    return null;
  }
  const error = value.error;
  if (
    !isRecord(error) ||
    typeof error.code !== "string" ||
    error.retryable !== false ||
    !PUBLIC_RUNNER_FAILURES.has(error.code as PublicRunnerFailure)
  ) {
    return null;
  }
  return error.code as PublicRunnerFailure;
}

async function runnerRequestError(
  response: Response,
): Promise<PilotError> {
  try {
    const body = await readJson<unknown>(response);
    return new PilotError(
      publicRunnerFailure(body) ?? "runner_request_failed",
      502,
    );
  } catch {
    return new PilotError("runner_request_failed", 502);
  }
}

function isRunnerVerificationState(
  value: unknown,
): value is RunnerVerificationState {
  return (
    typeof value === "string" &&
    RUNNER_VERIFICATION_STATES.has(value as RunnerVerificationState)
  );
}

function isNullableFindingCount(value: unknown): boolean {
  return (
    value === null ||
    (
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value <= 1_000_000
    )
  );
}

function isRunnerAuditCoverage(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const requested = value.requestedAuditors;
  const completed = value.completedAuditors;
  return (
    value.configuredAuditorCap === 5 &&
    typeof requested === "number" &&
    Number.isSafeInteger(requested) &&
    requested >= 3 &&
    requested <= 5 &&
    typeof completed === "number" &&
    Number.isSafeInteger(completed) &&
    completed >= requested &&
    completed <= 5 &&
    value.sliced === false
  );
}

type RunnerJob = Pick<
  JobRow,
  | "id"
  | "target_score"
  | "fix_passes"
  | "effort_profile"
  | "ocr_language"
  | "polish_passes"
  | "auto_continue_rounds"
>;

function minimalRunnerJob(job: JobRow): RunnerJob {
  return {
    id: job.id,
    target_score: job.target_score,
    fix_passes: job.fix_passes,
    effort_profile: job.effort_profile,
    ocr_language: job.ocr_language,
    polish_passes: job.polish_passes,
    auto_continue_rounds: job.auto_continue_rounds,
  };
}

async function deriveRunnerToken(
  env: PilotEnv,
  jobId: string,
): Promise<string> {
  if (!env.RUNNER_AUTH_SECRET || env.RUNNER_AUTH_SECRET.length < 32) {
    throw new PilotError("runner_auth_not_configured", 503);
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.RUNNER_AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(jobId),
  );
  return base64UrlEncode(new Uint8Array(signature));
}

function containerFor(env: PilotEnv, jobId: string) {
  if (!env.REMEDIATION_CONTAINER) {
    throw new PilotError("runner_not_configured", 503);
  }
  return getContainer<RemediationContainer>(
    env.REMEDIATION_CONTAINER as DurableObjectNamespace<RemediationContainer>,
    jobId,
  );
}

function runnerResult(
  body: RunnerResponse,
  job: RunnerJob,
): RunnerResult {
  const pdfArtifact = body.artifacts?.find(
    (candidate) => candidate.kind === "tagged_pdf",
  );
  const reportArtifact = body.artifacts?.find(
    (candidate) => candidate.kind === "report",
  );
  if (
    body.schema !== 1 ||
    body.jobId !== job.id ||
    body.status !== "succeeded" ||
    !pdfArtifact ||
    !reportArtifact ||
    pdfArtifact.contentType !== "application/pdf" ||
    typeof pdfArtifact.size !== "number" ||
    !Number.isSafeInteger(pdfArtifact.size) ||
    pdfArtifact.size < 5 ||
    typeof pdfArtifact.sha256 !== "string" ||
    !/^[A-Fa-f0-9]{64}$/u.test(pdfArtifact.sha256) ||
    reportArtifact.contentType !== "application/json" ||
    typeof reportArtifact.size !== "number" ||
    !Number.isSafeInteger(reportArtifact.size) ||
    reportArtifact.size < 2 ||
    typeof reportArtifact.sha256 !== "string" ||
    !/^[A-Fa-f0-9]{64}$/u.test(reportArtifact.sha256)
  ) {
    throw new PilotError("runner_result_invalid", 502);
  }
  const score = (value: unknown): number | undefined =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
      ? value
      : undefined;
  const autoContinueRoundsRun =
    body.summary?.autoContinueRoundsRun;
  if (
    !body.summary ||
    body.summary.activeContentScanVerified !== true ||
    body.summary.activeContentDetected !== false ||
    (
      body.summary.distributionLevel !== "ready" &&
      body.summary.distributionLevel !== "caution"
    ) ||
    !isRunnerVerificationState(body.summary.verificationState) ||
    body.summary.verificationHtmlBound !== true ||
    body.summary.taggedPdfDelivery !== "verified" ||
    body.summary.taggedPdfExportMode !== "original_layout" ||
    !isNullableFindingCount(
      body.summary.remainingAxeViolations,
    ) ||
    !isNullableFindingCount(
      body.summary.remainingEqualAccessFailures,
    ) ||
    !isRunnerAuditCoverage(body.summary.auditCoverage) ||
    !Number.isInteger(autoContinueRoundsRun) ||
    (autoContinueRoundsRun as number) < 0 ||
    (autoContinueRoundsRun as number) > job.auto_continue_rounds
  ) {
    throw new PilotError("runner_result_invalid", 502);
  }
  return {
    resultSizeBytes: pdfArtifact.size,
    resultSha256: pdfArtifact.sha256.toLowerCase(),
    reportSizeBytes: reportArtifact.size,
    reportSha256: reportArtifact.sha256.toLowerCase(),
    autoContinueRoundsRun: autoContinueRoundsRun as number,
    beforeScore: score(body.summary?.beforeScore),
    afterScore: score(body.summary?.afterScore),
  };
}

function checksumHex(value: ArrayBuffer | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export class RemediationWorkflow extends WorkflowEntrypoint<
  PilotEnv,
  RemediationWorkflowParams
> {
  async run(
    event: Readonly<WorkflowEvent<RemediationWorkflowParams>>,
    step: WorkflowStep,
  ): Promise<{ status: string; jobId: string }> {
    const jobId = event.payload.jobId;
    const config = assertPilotBindings(this.env);
    const container = containerFor(this.env, jobId);

    try {
      const job = await step.do(
        "claim queued job",
        {
          retries: {
            limit: 3,
            delay: "5 seconds",
            backoff: "exponential",
          },
          timeout: "1 minute",
          sensitive: "output",
        },
        async () =>
          minimalRunnerJob(
            await markJobRunning(this.env, jobId),
          ),
      );

      const result = await step.do(
        "run isolated remediation",
        {
          retries: {
            limit: 1,
            delay: "15 seconds",
            backoff: "constant",
          },
          timeout: "30 minutes",
          sensitive: "output",
        },
        async () => {
          const runnerToken = await deriveRunnerToken(this.env, jobId);
          await container.configureJob(jobId, runnerToken);
          const response = await container.fetch(
            new Request("http://container.internal/v1/run", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${runnerToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                schema: 1,
                jobId,
                input: {
                  url: "http://r2.internal/input",
                  contentType: "application/pdf",
                },
                output: {
                  taggedPdfUrl:
                    "http://r2.internal/output/tagged.pdf",
                  reportUrl:
                    "http://r2.internal/output/report.json",
                },
                options: {
                  targetScore: job.target_score,
                  fixPasses: job.fix_passes,
                  effortProfile: job.effort_profile,
                  ocrLanguage: job.ocr_language,
                  polishPasses: job.polish_passes,
                  taggedPdf: true,
                  autoContinue: job.auto_continue_rounds > 0,
                  autoContinueRounds: job.auto_continue_rounds,
                  validateUa: false,
                  maxRunMinutes: config.remediationMaxRunMinutes,
                },
              }),
            }),
          );
          if (!response.ok) {
            throw await runnerRequestError(response);
          }
          return runnerResult(
            await readJson<RunnerResponse>(response),
            job,
          );
        },
      );

      await step.do(
        "release remediation container",
        {
          retries: {
            limit: 3,
            delay: "5 seconds",
            backoff: "exponential",
          },
          timeout: "2 minutes",
        },
        async () => {
          await container.destroy();
          return { released: true };
        },
      );

      await step.do(
        "verify and publish result",
        {
          retries: {
            limit: 3,
            delay: "5 seconds",
            backoff: "exponential",
          },
          timeout: "2 minutes",
        },
        async () => {
          const current = await getInternalJob(this.env, jobId);
          if (
            !this.env.DOCUMENTS ||
            !current.result_key ||
            !current.report_key
          ) {
            throw new PilotError("runner_output_missing", 502);
          }
          const [pdf, report] = await Promise.all([
            this.env.DOCUMENTS.head(current.result_key),
            this.env.DOCUMENTS.head(current.report_key),
          ]);
          if (
            !pdf ||
            !report ||
            pdf.size !== result.resultSizeBytes ||
            report.size !== result.reportSizeBytes ||
            pdf.httpMetadata?.contentType !== "application/pdf" ||
            report.httpMetadata?.contentType !== "application/json" ||
            checksumHex(pdf.checksums.sha256) !== result.resultSha256 ||
            checksumHex(report.checksums.sha256) !== result.reportSha256
          ) {
            throw new PilotError("runner_output_invalid", 502);
          }
          await completeJob(this.env, config, jobId, result);
          return { published: true };
        },
      );

      try {
        await step.do(
          "remove published input",
          {
            retries: {
              limit: 3,
              delay: "10 seconds",
              backoff: "exponential",
            },
            timeout: "2 minutes",
          },
          async () => {
            const current = await getInternalJob(this.env, jobId);
            if (!this.env.DOCUMENTS) {
              throw new PilotError("runner_storage_unavailable", 503);
            }
            if (current.input_key) {
              await this.env.DOCUMENTS.delete(current.input_key);
            }
            await finalizeInputDeletion(this.env, jobId);
            return { cleaned: true };
          },
        );
      } catch {
        console.warn(
          JSON.stringify({ event: "successful_input_cleanup_deferred" }),
        );
      }

      return { status: "completed", jobId };
    } catch (error) {
      const errorCode = publicSafeErrorCode(error);
      try {
        await step.do(
          "remove failed artifacts",
          {
            retries: {
              limit: 3,
              delay: "10 seconds",
              backoff: "exponential",
            },
            timeout: "2 minutes",
          },
          async () => {
            await container.destroy();
            const job = await getInternalJob(this.env, jobId);
            if (this.env.DOCUMENTS) {
              await this.env.DOCUMENTS.delete(
                [job.input_key, job.result_key, job.report_key].filter(
                  (key): key is string => Boolean(key),
                ),
              );
            }
            await failJob(this.env, jobId, errorCode);
            await finalizeInputDeletion(this.env, jobId);
            await clearTerminalArtifacts(this.env, jobId);
            return { cleaned: true };
          },
        );
      } catch {
        try {
          await container.destroy();
          await failJob(this.env, jobId, errorCode);
        } catch {}
      }
      throw new PilotError(errorCode, 500);
    } finally {
      try {
        await container.destroy();
      } catch {
        // The scheduled cleanup path is authoritative; container teardown is
        // best effort after a terminal Workflow outcome.
      }
    }
  }
}

