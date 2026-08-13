import { getContainer } from "@cloudflare/containers";
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import {
  claimJobAttempt,
  clearJobCheckpoint,
  completeJob,
  clearTerminalArtifacts,
  failCurrentWorkflowAttempt,
  finalizeInputDeletion,
  getInternalJob,
  getJobCheckpoint,
  jobCheckpointPrefix,
  markJobRunning,
  markJobThrottleWait,
  renewJobLease,
  RUNNING_JOB_LEASE_SECONDS,
  type JobRow,
  type JobRunStage,
  type RunnerResult,
} from "./job-store";
import {
  assertPilotBindings,
  type PilotEnv,
  type RemediationWorkflowParams,
} from "./pilot-env";
import { RemediationContainer } from "./remediation-container";
import {
  emitPilotMetric,
  type PilotMetricFields,
} from "./pilot-telemetry";
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
  | "active_content_scan_unavailable"
  | "checkpoint_snapshot_too_large"
  | "model_throttled";

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
  checkpointTelemetry?: unknown;
};

const PUBLIC_RUNNER_FAILURES = new Set<PublicRunnerFailure>([
  "distribution_review_required",
  "tagged_pdf_verification_failed",
  "verification_binding_failed",
  "active_content_requires_review",
  "active_content_scan_unavailable",
  "checkpoint_snapshot_too_large",
  "model_throttled",
]);

type ModelThrottleFailure = {
  retryable: boolean;
  retryAfterMs: number;
  retryBudgetExhausted: boolean;
};

function modelThrottleFailure(value: unknown): ModelThrottleFailure | null {
  if (!isRecord(value) || value.schema !== 1 || value.status !== "error") {
    return null;
  }
  const error = value.error;
  if (
    !isRecord(error) ||
    error.code !== "model_throttled" ||
    typeof error.retryable !== "boolean"
  ) {
    return null;
  }
  const retryAfterMs =
    typeof error.retryAfterMs === "number" &&
    Number.isSafeInteger(error.retryAfterMs) &&
    error.retryAfterMs >= 0 &&
    error.retryAfterMs <= 10 * 60 * 1000
      ? error.retryAfterMs
      : 15_000;
  return {
    retryable: error.retryable,
    retryAfterMs,
    retryBudgetExhausted: error.retryBudgetExhausted === true,
  };
}

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

function workflowMetric(
  env: PilotEnv,
  event: string,
  fields: PilotMetricFields = {},
): void {
  try {
    emitPilotMetric(env, event, fields);
  } catch {
    // Metrics are best-effort and must never change job ownership or outcome.
  }
}

async function checkpointPointerMetric(
  env: PilotEnv,
  jobId: string,
  event: string,
): Promise<void> {
  try {
    const checkpoint = await getJobCheckpoint(env, jobId);
    workflowMetric(env, event, {
      outcome: checkpoint ? "present" : "absent",
      stage: checkpoint?.stage,
      bytes: checkpoint?.sizeBytes,
      checkpointSequence: checkpoint?.seq,
    });
  } catch {
    workflowMetric(env, event, { outcome: "unavailable" });
  }
}

type RunnerCheckpointMetric = {
  stage: string;
  sequence: number;
  compressedBytes: number;
  uncompressedBytes: number;
};

function runnerCheckpointMetric(value: unknown): RunnerCheckpointMetric | null {
  if (!isRecord(value)) return null;
  const stage = value.stage;
  const sequence = value.sequence;
  const compressedBytes = value.compressedBytes;
  const uncompressedBytes = value.uncompressedBytes;
  if (
    !["extraction", "primary", "round"].includes(String(stage)) ||
    typeof sequence !== "number" ||
    !Number.isSafeInteger(sequence) ||
    sequence < 1 ||
    sequence > 1_000_000 ||
    typeof compressedBytes !== "number" ||
    !Number.isSafeInteger(compressedBytes) ||
    compressedBytes < 1 ||
    compressedBytes > 32 * 1024 * 1024 ||
    typeof uncompressedBytes !== "number" ||
    !Number.isSafeInteger(uncompressedBytes) ||
    uncompressedBytes < 1 ||
    uncompressedBytes > 128 * 1024 * 1024
  ) {
    return null;
  }
  return {
    stage: stage as string,
    sequence,
    compressedBytes,
    uncompressedBytes,
  };
}

function emitRunnerCheckpointTelemetry(
  env: PilotEnv,
  body: RunnerResponse,
): void {
  const telemetry = body.checkpointTelemetry;
  if (!isRecord(telemetry)) return;
  const resumed = runnerCheckpointMetric(telemetry.resumed);
  const saved = Array.isArray(telemetry.saved)
    ? telemetry.saved.slice(0, 16)
      .map(runnerCheckpointMetric)
      .filter((value): value is RunnerCheckpointMetric => value !== null)
    : [];
  const emitSizes = (
    event: string,
    metric: RunnerCheckpointMetric,
  ): void => {
    workflowMetric(env, event, {
      outcome: "compressed",
      stage: metric.stage,
      bytes: metric.compressedBytes,
      checkpointSequence: metric.sequence,
    });
    workflowMetric(env, event, {
      outcome: "uncompressed",
      stage: metric.stage,
      bytes: metric.uncompressedBytes,
      checkpointSequence: metric.sequence,
    });
  };
  if (resumed) emitSizes("checkpoint_resumed", resumed);
  for (const metric of saved) emitSizes("checkpoint_saved", metric);
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
  env: PilotEnv,
  response: Response,
  jobId: string,
  attemptId: string,
): Promise<Error> {
  let body: unknown;
  try {
    body = await readJson<unknown>(response);
  } catch {
    return new PilotError("runner_request_failed", 502);
  }
  {
    const throttle = modelThrottleFailure(body);
    if (throttle) {
      workflowMetric(env, "model_throttled", {
        outcome: throttle.retryable ? "retryable" : "terminal",
        retryAfterMs: throttle.retryAfterMs,
        remaining: throttle.retryBudgetExhausted ? 0 : 1,
      });
      if (throttle.retryBudgetExhausted) {
        workflowMetric(env, "model_retry_budget_exhausted", {
          outcome: "terminal",
          retryAfterMs: throttle.retryAfterMs,
          remaining: 0,
        });
      }
      if (!throttle.retryable) {
        return new NonRetryableError("model_throttled");
      }
      const wait = await markJobThrottleWait(
        env,
        jobId,
        attemptId,
        throttle.retryAfterMs,
      );
      workflowMetric(env, "model_throttle_wait", {
        outcome: "durable",
        retryAfterMs: throttle.retryAfterMs,
        leaseSlackMs: Math.max(
          0,
          wait.leaseExpiresAt * 1000 - Date.now(),
        ),
      });
      const error = new PilotError("model_throttled", 429) as PilotError & {
        retryAfterMs: number;
      };
      error.retryAfterMs = throttle.retryAfterMs;
      return error;
    }
    const publicFailure = publicRunnerFailure(body);
    return publicFailure
      ? new NonRetryableError(publicFailure)
      : new PilotError("runner_request_failed", 502);
  }
}

function runnerRetryDelay(error: unknown): number {
  if (
    isRecord(error) &&
    typeof error.retryAfterMs === "number" &&
    Number.isSafeInteger(error.retryAfterMs)
  ) {
    return Math.max(15_000, Math.min(10 * 60 * 1000, error.retryAfterMs));
  }
  return 15_000;
}

function workflowErrorCode(error: unknown): string {
  if (
    error instanceof NonRetryableError &&
    PUBLIC_RUNNER_FAILURES.has(error.message as PublicRunnerFailure)
  ) {
    return error.message;
  }
  return publicSafeErrorCode(error);
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
  attemptId: string,
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
    new TextEncoder().encode(`${jobId}:${attemptId}`),
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

const RUNNER_HEARTBEAT_INTERVAL_MS = 30_000;
const RUNNER_LEASE_RENEWAL_SAFETY_MS = 60_000;
const RUNNER_MODEL_RETRY_BUDGET_BY_ATTEMPT = [4, 2] as const;

type AttemptRunnerResult = RunnerResult & {
  attemptId: string;
  attemptNumber: number;
};

function workflowAttemptId(
  jobId: string,
  stepCount: number,
  attemptNumber: number,
): string {
  return `${jobId}:run-${stepCount}:attempt-${attemptNumber}`;
}

function runnerStatusStage(value: unknown): JobRunStage {
  if (!isRecord(value)) {
    return "running";
  }
  switch (value.status) {
    case "receiving":
    case "running":
    case "validating":
    case "uploading":
      return value.status;
    default:
      return "running";
  }
}

async function readRunnerStage(
  container: ReturnType<typeof containerFor>,
  jobId: string,
  runnerToken: string,
): Promise<JobRunStage> {
  try {
    const response = await container.fetch(
      new Request(
        `http://container.internal/v1/status?job_id=${encodeURIComponent(jobId)}`,
        {
          headers: {
            Authorization: `Bearer ${runnerToken}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5_000),
        },
      ),
    );
    if (!response.ok) {
      return "running";
    }
    return runnerStatusStage(await readJson<unknown>(response, 8 * 1024));
  } catch {
    // A status poll is advisory. The still-pending authenticated run request is
    // sufficient liveness evidence for a generic running-stage renewal.
    return "running";
  }
}

function heartbeatDelay(): Promise<null> {
  return new Promise((resolve) => {
    setTimeout(resolve, RUNNER_HEARTBEAT_INTERVAL_MS, null);
  });
}

async function runWithLeaseHeartbeat(
  env: PilotEnv,
  container: ReturnType<typeof containerFor>,
  jobId: string,
  attemptId: string,
  runnerToken: string,
  request: Request,
): Promise<Response> {
  type SettledRun =
    | { ok: true; response: Response }
    | { ok: false; error: unknown };
  const settled: Promise<SettledRun> = container.fetch(request).then(
    (response): SettledRun => ({ ok: true, response }),
    (error: unknown): SettledRun => ({ ok: false, error }),
  );
  let lastSuccessfulLeaseRenewalAt = Date.now();
  let deferredLeaseRenewals = 0;

  while (true) {
    const outcome = await Promise.race([settled, heartbeatDelay()]);
    if (outcome !== null) {
      if (!outcome.ok) {
        throw outcome.error;
      }
      return outcome.response;
    }
    const stage = await readRunnerStage(container, jobId, runnerToken);
    try {
      await renewJobLease(env, jobId, attemptId, stage);
      lastSuccessfulLeaseRenewalAt = Date.now();
      if (deferredLeaseRenewals > 0) {
        console.warn(
          JSON.stringify({
            event: "job_lease_renewal_recovered",
            deferredRenewals: deferredLeaseRenewals,
          }),
        );
        workflowMetric(env, "lease_renewal", {
          outcome: "recovered",
          stage,
          count: deferredLeaseRenewals,
          leaseSlackMs:
            RUNNING_JOB_LEASE_SECONDS * 1000 -
            RUNNER_LEASE_RENEWAL_SAFETY_MS,
        });
      }
      deferredLeaseRenewals = 0;
    } catch (error) {
      // Store-level PilotErrors are deterministic fencing/configuration
      // outcomes. In particular, never hide job_attempt_lost behind lease
      // slack: the newer attempt owns the work now.
      if (error instanceof PilotError) {
        workflowMetric(env, "lease_renewal", {
          outcome: "fenced",
          stage,
          leaseSlackMs: 0,
        });
        throw error;
      }
      deferredLeaseRenewals += 1;
      const renewalDeadline =
        lastSuccessfulLeaseRenewalAt +
        RUNNING_JOB_LEASE_SECONDS * 1000 -
        RUNNER_LEASE_RENEWAL_SAFETY_MS;
      if (deferredLeaseRenewals === 1) {
        console.warn(
          JSON.stringify({ event: "job_lease_renewal_deferred" }),
        );
        workflowMetric(env, "lease_renewal", {
          outcome: "deferred",
          stage,
          leaseSlackMs: Math.max(0, renewalDeadline - Date.now()),
        });
      }
      if (Date.now() >= renewalDeadline) {
        workflowMetric(env, "lease_renewal", {
          outcome: "fatal",
          stage,
          count: deferredLeaseRenewals,
          leaseSlackMs: 0,
        });
        throw new PilotError("job_lease_renewal_failed", 503);
      }
      // A transient D1 throttle must not reset a healthy container on the
      // first missed 30-second pulse. The loop races the live result again and
      // retries renewal while the prior five-minute lease still has slack.
    }
  }
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
    verificationState: body.summary.verificationState,
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

async function deleteCheckpointObjects(
  env: PilotEnv,
  job: Pick<JobRow, "id" | "institution_id">,
): Promise<void> {
  if (!env.DOCUMENTS) {
    throw new PilotError("runner_storage_unavailable", 503);
  }
  const prefix = jobCheckpointPrefix(job);
  let cursor: string | undefined;
  do {
    const page = await env.DOCUMENTS.list({
      prefix,
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });
    if (page.objects.length > 0) {
      await env.DOCUMENTS.delete(
        page.objects.map((object) => object.key),
      );
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
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
            await markJobRunning(
              this.env,
              jobId,
              event.instanceId,
            ),
          ),
      );

      const result: AttemptRunnerResult = await step.do(
        "run isolated remediation",
        {
          retries: {
            limit: 1,
            delay: ({ error }) => {
              const retryAfterMs = runnerRetryDelay(error);
              workflowMetric(this.env, "model_retry_delay", {
                outcome: "scheduled",
                retryAfterMs,
              });
              return retryAfterMs;
            },
            backoff: "constant",
          },
          timeout: "30 minutes",
          sensitive: "output",
        },
        async (context) => {
          const attemptId = workflowAttemptId(
            jobId,
            context.step.count,
            context.attempt,
          );
          const claimed = await claimJobAttempt(
            this.env,
            jobId,
            event.instanceId,
            attemptId,
            context.attempt,
          );
          await checkpointPointerMetric(
            this.env,
            jobId,
            "checkpoint_resume_pointer",
          );

          if (context.attempt > 1) {
            // The D1 claim fences the old callback before the shared container
            // is stopped, so a late retry cannot tear down its successor.
            await container.destroy();
          }
          if (
            claimed.supersededArtifactKeys.length > 0 &&
            this.env.DOCUMENTS
          ) {
            await this.env.DOCUMENTS.delete(
              claimed.supersededArtifactKeys,
            );
          }

          await renewJobLease(
            this.env,
            jobId,
            attemptId,
            "starting",
          );
          const runnerToken = await deriveRunnerToken(
            this.env,
            jobId,
            attemptId,
          );
          await container.configureJob(jobId, attemptId, runnerToken);
          await renewJobLease(
            this.env,
            jobId,
            attemptId,
            "receiving",
          );
          const response = await runWithLeaseHeartbeat(
            this.env,
            container,
            jobId,
            attemptId,
            runnerToken,
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
                checkpoint: {
                  readUrl: "http://r2.internal/checkpoint",
                  writeUrl: "http://r2.internal/checkpoint",
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
                  modelRetryBudget:
                    RUNNER_MODEL_RETRY_BUDGET_BY_ATTEMPT[
                      Math.min(
                        context.attempt - 1,
                        RUNNER_MODEL_RETRY_BUDGET_BY_ATTEMPT.length - 1,
                      )
                    ],
                },
              }),
            }),
          );
          if (!response.ok) {
            throw await runnerRequestError(
              this.env,
              response,
              jobId,
              attemptId,
            );
          }
          const runnerBody = await readJson<RunnerResponse>(response);
          emitRunnerCheckpointTelemetry(this.env, runnerBody);
          return {
            ...runnerResult(
              runnerBody,
              job,
            ),
            attemptId,
            attemptNumber: context.attempt,
          };
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
          await renewJobLease(
            this.env,
            jobId,
            result.attemptId,
            "releasing",
          );
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
            current.attempt_id !== result.attemptId ||
            (
              current.status !== "running" &&
              current.status !== "completed"
            )
          ) {
            throw new PilotError("job_attempt_lost", 409);
          }
          if (current.status === "running") {
            await renewJobLease(
              this.env,
              jobId,
              result.attemptId,
              "verifying",
            );
          }
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
          if (current.status === "running") {
            await renewJobLease(
              this.env,
              jobId,
              result.attemptId,
              "publishing",
            );
          }
          await completeJob(
            this.env,
            config,
            jobId,
            result.attemptId,
            result,
          );
          return { published: true };
        },
      );

      let publishedCheckpointCleanupComplete = false;
      try {
        await step.do(
          "remove published checkpoints",
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
            if (
              current.status !== "completed" ||
              current.attempt_id !== result.attemptId
            ) {
              throw new PilotError("job_attempt_lost", 409);
            }
            const checkpoint = await getJobCheckpoint(
              this.env,
              jobId,
            );
            if (!checkpoint) {
              // A callback can crash after the immutable R2 PUT but before the
              // D1 pointer CAS. Sweep that bounded job prefix even when no
              // checkpoint is currently committed.
              await deleteCheckpointObjects(this.env, current);
              return { cleaned: true, checkpoint: false };
            }
            await deleteCheckpointObjects(this.env, current);
            const cleared = await clearJobCheckpoint(
              this.env,
              jobId,
              result.attemptId,
              checkpoint,
            );
            if (!cleared || cleared.key !== checkpoint.key) {
              throw new PilotError("job_checkpoint_conflict", 409);
            }
            return { cleaned: true, checkpoint: true };
          },
        );
        publishedCheckpointCleanupComplete = true;
      } catch {
        console.warn(
          JSON.stringify({ event: "successful_checkpoint_cleanup_deferred" }),
        );
      }

      if (publishedCheckpointCleanupComplete) {
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
              if (
                current.status !== "completed" ||
                current.attempt_id !== result.attemptId
              ) {
                throw new PilotError("job_attempt_lost", 409);
              }
              if (!this.env.DOCUMENTS) {
                throw new PilotError("runner_storage_unavailable", 503);
              }
              if (current.input_key) {
                await this.env.DOCUMENTS.delete(current.input_key);
              }
              await finalizeInputDeletion(
                this.env,
                jobId,
                result.attemptId,
              );
              return { cleaned: true };
            },
          );
        } catch {
          console.warn(
            JSON.stringify({ event: "successful_input_cleanup_deferred" }),
          );
        }
      } else {
        // Retain the input pointer as a durable cleanup-pending marker. The
        // hourly reconciler selects completed jobs with an input pointer,
        // sweeps even pointerless checkpoint objects, and only then removes
        // the input. Advancing this deletion after a failed prefix sweep could
        // otherwise strand sensitive crash-before-D1 checkpoint objects.
        console.warn(
          JSON.stringify({ event: "successful_input_cleanup_waiting_for_checkpoint_sweep" }),
        );
      }

      return { status: "completed", jobId };
    } catch (error) {
      const errorCode = workflowErrorCode(error);
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
            const failure = await failCurrentWorkflowAttempt(
              this.env,
              jobId,
              event.instanceId,
              errorCode,
            );
            if (!failure.owned) {
              return { cleaned: false, preserved: true };
            }
            const failureAttemptId = failure.attemptId;
            await container.destroy();
            const job = await getInternalJob(this.env, jobId);
            if (
              job.attempt_id !== failureAttemptId ||
              (
                job.status !== "failed" &&
                job.status !== "cancelled"
              )
            ) {
              return { cleaned: false, preserved: true };
            }
            if (this.env.DOCUMENTS) {
              await this.env.DOCUMENTS.delete(
                [
                  job.input_key,
                  job.result_key,
                  job.report_key,
                  job.checkpoint_key,
                ].filter(
                  (key): key is string => Boolean(key),
                ),
              );
              await deleteCheckpointObjects(this.env, job);
            }
            await finalizeInputDeletion(
              this.env,
              jobId,
              failureAttemptId,
            );
            await clearTerminalArtifacts(
              this.env,
              jobId,
              failureAttemptId,
            );
            return { cleaned: true };
          },
        );
      } catch {
        try {
          const failure = await failCurrentWorkflowAttempt(
            this.env,
            jobId,
            event.instanceId,
            errorCode,
          );
          if (failure.owned) {
            await container.destroy();
          }
        } catch {}
      }
      throw new PilotError(errorCode, 500);
    }
  }
}
