import { getContainer } from "@cloudflare/containers";

import {
  beginCancel,
  beginDelete,
  clearJobCheckpoint,
  clearDispatchPending,
  clearTerminalArtifacts,
  completionNeedsReview,
  createDownloadGrant,
  createJob,
  createUpload,
  finalizeCancel,
  finalizeDelete,
  finalizeInputDeletion,
  getInternalJob,
  getJobForOwner,
  jobArtifactKeysForAttempt,
  jobCheckpointPrefix,
  listCleanupJobs,
  listDispatchPendingJobs,
  listExpiredUploads,
  markDispatchPending,
  markUploadDeleted,
  purgeOldMetadata,
  type JobRow,
} from "./job-store";
import {
  assertPilotBindings,
  type PilotEnv,
  type PilotPrincipal,
} from "./pilot-env";
import { resolveRemediationOptions } from "./remediation-options";
import { RemediationContainer } from "./remediation-container";
import {
  RemediationReportError,
  sanitizeRemediationReport,
  type PublicRemediationReport,
} from "./remediation-report";
import {
  PilotError,
  isOpaqueId,
  nowSeconds,
  toIso,
} from "./security";

export type PublicJob = {
  jobId: string;
  uploadId: string;
  status:
    | "queued"
    | "running"
    | "completed"
    | "completed_with_review"
    | "failed"
    | "cancelling"
    | "cancelled"
    | "deleting"
    | "deleted";
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  targetScore: number;
  fixPasses: number;
  effort: "standard" | "thorough";
  polishPasses: number;
  autoContinueRoundsRequested: number;
  autoContinueRoundsRun?: number;
  ocrLanguage?: string;
  beforeScore?: number;
  afterScore?: number;
  resultAvailable: boolean;
  reportAvailable: boolean;
  verificationState?: JobRow["verification_state"];
  requiresReview: boolean;
  resultExpiresAt?: string;
  errorCode?: string;
};

export function publicJob(job: JobRow): PublicJob {
  const requiresReview =
    job.status === "completed" &&
    completionNeedsReview(job.verification_state);
  const outputAvailable =
    job.status === "completed" &&
    Boolean(job.output_expires_at) &&
    (job.output_expires_at as number) > nowSeconds();
  return {
    jobId: job.id,
    uploadId: job.upload_id,
    status: requiresReview ? "completed_with_review" : job.status,
    createdAt: toIso(job.created_at),
    updatedAt: toIso(job.updated_at),
    startedAt: job.started_at ? toIso(job.started_at) : undefined,
    completedAt: job.completed_at ? toIso(job.completed_at) : undefined,
    targetScore: job.target_score,
    fixPasses: job.fix_passes,
    effort: job.effort_profile,
    polishPasses: job.polish_passes,
    autoContinueRoundsRequested: job.auto_continue_rounds,
    autoContinueRoundsRun:
      job.auto_continue_rounds_run ?? undefined,
    ocrLanguage: job.ocr_language || undefined,
    beforeScore: job.before_score ?? undefined,
    afterScore: job.after_score ?? undefined,
    resultAvailable:
      outputAvailable && Boolean(job.result_key),
    reportAvailable:
      outputAvailable &&
      Boolean(job.report_key) &&
      Boolean(job.report_sha256),
    verificationState:
      job.verification_state ??
      (job.status === "completed" ? "unavailable" : undefined),
    requiresReview,
    resultExpiresAt: job.output_expires_at
      ? toIso(job.output_expires_at)
      : undefined,
    errorCode:
      job.status === "failed" || job.status === "cancelled"
        ? job.error_code || undefined
        : undefined,
  };
}

async function dispatchWorkflow(
  env: PilotEnv,
  job: JobRow,
): Promise<boolean> {
  if (!env.REMEDIATION_WORKFLOW) {
    throw new PilotError("pilot_not_configured", 503);
  }
  try {
    await env.REMEDIATION_WORKFLOW.create({
      id: job.workflow_id,
      params: { jobId: job.id },
      retention: {
        successRetention: "1 day",
        errorRetention: "7 days",
      },
    });
    await clearDispatchPending(env, job.id);
    return true;
  } catch {
    try {
      const instance = await env.REMEDIATION_WORKFLOW.get(job.workflow_id);
      const status = await instance.status();
      if (status.status !== "unknown") {
        await clearDispatchPending(env, job.id);
        return true;
      }
    } catch {
      // Reconciliation below records a stable public state and retries later.
    }
    await markDispatchPending(env, job.id);
    return false;
  }
}

export async function createDocumentUpload(
  env: PilotEnv,
  principal: PilotPrincipal,
): Promise<{
  uploadId: string;
  uploadUrl: string;
  expiresAt: string;
  maxBytes: number;
  contentType: "application/pdf";
}> {
  const config = assertPilotBindings(env);
  const { upload, grant } = await createUpload(env, config, principal);
  return {
    uploadId: upload.id,
    uploadUrl: `${config.origin}/upload/${upload.id}#grant=${grant}`,
    expiresAt: toIso(upload.grant_expires_at as number),
    maxBytes: config.uploadMaxBytes,
    contentType: "application/pdf",
  };
}

export async function startRemediation(
  env: PilotEnv,
  principal: PilotPrincipal,
  input: {
    uploadId: string;
    targetScore?: number;
    fixPasses?: number;
    effort: "standard" | "thorough";
    ocrLanguage?: string;
  },
): Promise<{ job: PublicJob; created: boolean; dispatched: boolean }> {
  if (!isOpaqueId(input.uploadId, "upl")) {
    throw new PilotError("not_found", 404);
  }
  const config = assertPilotBindings(env);
  const options = resolveRemediationOptions(input);
  const { job, created } = await createJob(
    env,
    config,
    principal,
    input.uploadId,
    options,
  );
  const dispatched =
    created || (job.status === "queued" && job.error_code === "dispatch_pending")
      ? await dispatchWorkflow(env, job)
      : true;
  return { job: publicJob(job), created, dispatched };
}

export async function remediationStatus(
  env: PilotEnv,
  principal: PilotPrincipal,
  jobId: string,
): Promise<PublicJob> {
  assertPilotBindings(env);
  if (!isOpaqueId(jobId, "job")) {
    throw new PilotError("not_found", 404);
  }
  return publicJob(await getJobForOwner(env, jobId, principal));
}

function checksumHex(value: ArrayBuffer | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function remediationReport(
  env: PilotEnv,
  principal: PilotPrincipal,
  jobId: string,
): Promise<{
  job: PublicJob;
  report: PublicRemediationReport;
}> {
  assertPilotBindings(env);
  if (!isOpaqueId(jobId, "job")) {
    throw new PilotError("not_found", 404);
  }
  const job = await getJobForOwner(env, jobId, principal);
  if (
    job.status !== "completed" ||
    !job.report_key ||
    !job.report_size_bytes ||
    !job.report_sha256 ||
    !job.result_size_bytes ||
    !job.result_sha256 ||
    !job.output_expires_at ||
    job.output_expires_at <= nowSeconds()
  ) {
    throw new PilotError("report_not_ready", 409);
  }
  if (!env.DOCUMENTS) {
    throw new PilotError("pilot_not_configured", 503);
  }
  const object = await env.DOCUMENTS.get(job.report_key);
  if (
    !object ||
    object.size !== job.report_size_bytes ||
    object.size > 1024 * 1024 ||
    object.httpMetadata?.contentType !== "application/json" ||
    checksumHex(object.checksums.sha256) !== job.report_sha256
  ) {
    throw new PilotError("remediation_report_invalid", 502);
  }
  let value: unknown;
  try {
    value = JSON.parse(await object.text());
  } catch {
    throw new PilotError("remediation_report_invalid", 502);
  }
  try {
    return {
      job: publicJob(job),
      report: sanitizeRemediationReport(value, {
        jobId: job.id,
        resultSizeBytes: job.result_size_bytes,
        resultSha256: job.result_sha256,
        targetScore: job.target_score,
        fixPasses: job.fix_passes,
        effortProfile: job.effort_profile,
        ocrLanguage: job.ocr_language,
        polishPasses: job.polish_passes,
        autoContinueRounds: job.auto_continue_rounds,
        autoContinueRoundsRun: job.auto_continue_rounds_run ?? 0,
        beforeScore: job.before_score,
        afterScore: job.after_score,
      }),
    };
  } catch (error) {
    if (error instanceof RemediationReportError) {
      throw new PilotError("remediation_report_invalid", 502);
    }
    throw error;
  }
}

export async function remediationResult(
  env: PilotEnv,
  principal: PilotPrincipal,
  jobId: string,
): Promise<{
  job: PublicJob;
  downloadUrl: string;
  downloadLinkExpiresAt: string;
  sha256: string;
  sizeBytes: number;
}> {
  const config = assertPilotBindings(env);
  if (!isOpaqueId(jobId, "job")) {
    throw new PilotError("not_found", 404);
  }
  const { job, grant, expiresAt } = await createDownloadGrant(
    env,
    config,
    principal,
    jobId,
  );
  if (!job.result_sha256 || !job.result_size_bytes) {
    throw new PilotError("result_not_ready", 409);
  }
  return {
    job: publicJob(job),
    downloadUrl: `${config.origin}/result/${job.id}#grant=${grant}`,
    downloadLinkExpiresAt: toIso(expiresAt),
    sha256: job.result_sha256,
    sizeBytes: job.result_size_bytes,
  };
}

function containerFor(env: PilotEnv, jobId: string) {
  if (!env.REMEDIATION_CONTAINER) {
    throw new PilotError("pilot_not_configured", 503);
  }
  return getContainer(
    env.REMEDIATION_CONTAINER as DurableObjectNamespace<RemediationContainer>,
    jobId,
  );
}

const TERMINAL_WORKFLOW_STATES = new Set([
  "complete",
  "errored",
  "terminated",
  "unknown",
]);

function workflowIsStopped(status: string): boolean {
  return TERMINAL_WORKFLOW_STATES.has(status);
}

async function confirmWorkflowStopped(
  env: PilotEnv,
  job: JobRow,
): Promise<boolean> {
  if (!env.REMEDIATION_WORKFLOW) {
    return false;
  }
  try {
    const instance = await env.REMEDIATION_WORKFLOW.get(job.workflow_id);
    let status = await instance.status();
    if (workflowIsStopped(status.status)) {
      return true;
    }
    try {
      await instance.terminate({ rollback: false });
    } catch {
      // The instance can race to a terminal state between status and terminate.
    }
    status = await instance.status();
    return workflowIsStopped(status.status);
  } catch {
    return false;
  }
}

async function confirmContainerStopped(
  env: PilotEnv,
  jobId: string,
): Promise<boolean> {
  try {
    await containerFor(env, jobId).destroy();
    return true;
  } catch {
    try {
      const state = await containerFor(env, jobId).getState();
      return state.status === "stopped" || state.status === "stopped_with_code";
    } catch {
      return false;
    }
  }
}

async function stopExecution(
  env: PilotEnv,
  job: JobRow,
): Promise<boolean> {
  const [workflowStopped, containerStopped] = await Promise.all([
    confirmWorkflowStopped(env, job),
    confirmContainerStopped(env, job.id),
  ]);
  return workflowStopped && containerStopped;
}

async function deleteCheckpointObjects(
  bucket: R2Bucket,
  job: Pick<JobRow, "id" | "institution_id">,
): Promise<void> {
  const prefix = jobCheckpointPrefix(job);
  let cursor: string | undefined;
  do {
    const page = await bucket.list({
      prefix,
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });
    if (page.objects.length > 0) {
      await bucket.delete(page.objects.map((object) => object.key));
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

async function deleteArtifacts(env: PilotEnv, job: JobRow): Promise<void> {
  const current = await getInternalJob(env, job.id);
  if (current.attempt_id !== job.attempt_id) {
    return;
  }
  if (!env.DOCUMENTS) {
    throw new PilotError("pilot_not_configured", 503);
  }
  const keys = new Set<string>(
    [current.input_key, current.result_key, current.report_key].filter(
      (key): key is string => Boolean(key),
    ),
  );
  keys.add(
    `tenant/${current.institution_id}/output/${current.id}/tagged.pdf`,
  );
  keys.add(
    `tenant/${current.institution_id}/output/${current.id}/report.json`,
  );
  for (
    let attemptNumber = 1;
    attemptNumber <= (current.attempt_number ?? 0);
    attemptNumber += 1
  ) {
    const attemptKeys = jobArtifactKeysForAttempt(
      current,
      attemptNumber,
    );
    keys.add(attemptKeys.resultKey);
    keys.add(attemptKeys.reportKey);
  }
  if (keys.size > 0) {
    await env.DOCUMENTS.delete([...keys]);
  }
  await deleteCheckpointObjects(env.DOCUMENTS, current);
}

export async function cancelRemediation(
  env: PilotEnv,
  principal: PilotPrincipal,
  jobId: string,
): Promise<PublicJob> {
  assertPilotBindings(env);
  if (!isOpaqueId(jobId, "job")) {
    throw new PilotError("not_found", 404);
  }
  const job = await beginCancel(env, jobId, principal);
  if (
    job.status !== "cancelling" &&
    job.status !== "queued" &&
    job.status !== "running"
  ) {
    return publicJob(job);
  }
  if (!(await stopExecution(env, job))) {
    return publicJob(await getJobForOwner(env, jobId, principal));
  }
  await deleteArtifacts(env, job);
  await finalizeCancel(env, jobId, job.attempt_id);
  await clearTerminalArtifacts(env, jobId, job.attempt_id);
  return publicJob(await getJobForOwner(env, jobId, principal));
}

export async function deleteRemediation(
  env: PilotEnv,
  principal: PilotPrincipal,
  jobId: string,
): Promise<
  | { jobId: string; deleted: true }
  | { jobId: string; deleted: false; status: "deleting" }
> {
  assertPilotBindings(env);
  if (!isOpaqueId(jobId, "job")) {
    throw new PilotError("not_found", 404);
  }
  const job = await beginDelete(env, jobId, principal);
  if (job.status !== "deleted") {
    if (!(await stopExecution(env, job))) {
      return { jobId, deleted: false, status: "deleting" };
    }
    await deleteArtifacts(env, job);
    await finalizeDelete(env, jobId, job.attempt_id);
  }
  return { jobId, deleted: true };
}

export async function cleanupInstitutionPilot(
  env: PilotEnv,
): Promise<{
  jobsCleaned: number;
  jobsPendingStop: number;
  uploadsCleaned: number;
  jobsRedispatched: number;
}> {
  const config = assertPilotBindings(env);
  let jobsCleaned = 0;
  let jobsPendingStop = 0;
  let uploadsCleaned = 0;
  let jobsRedispatched = 0;

  for (const job of await listDispatchPendingJobs(env)) {
    if (await dispatchWorkflow(env, job)) {
      jobsRedispatched += 1;
    }
  }

  for (const job of await listCleanupJobs(env, config)) {
    if (!(await stopExecution(env, job))) {
      jobsPendingStop += 1;
      continue;
    }
    const outputExpired =
      !job.output_expires_at || job.output_expires_at <= nowSeconds();
    if (job.status === "completed" && !outputExpired) {
      if (!env.DOCUMENTS) {
        throw new PilotError("pilot_not_configured", 503);
      }
      const current = await getInternalJob(env, job.id);
      if (
        current.status !== "completed" ||
        current.attempt_id !== job.attempt_id ||
        current.input_key !== job.input_key ||
        current.checkpoint_key !== job.checkpoint_key
      ) {
        jobsPendingStop += 1;
        continue;
      }
      if (current.checkpoint_key && !current.attempt_id) {
        jobsPendingStop += 1;
        continue;
      }
      if (current.input_key) {
        await env.DOCUMENTS.delete(current.input_key);
      }
      // Always sweep the bounded checkpoint prefix before removing the input.
      // A runner can crash after its immutable R2 PUT but before the D1 pointer
      // CAS, so checkpoint_key === null does not prove the prefix is empty.
      await deleteCheckpointObjects(env.DOCUMENTS, current);
      if (current.input_key) {
        await finalizeInputDeletion(
          env,
          current.id,
          current.attempt_id,
        );
      }
      if (current.checkpoint_key && current.attempt_id) {
        await clearJobCheckpoint(
          env,
          current.id,
          current.attempt_id,
        );
      }
      jobsCleaned += 1;
      continue;
    }
    await deleteArtifacts(env, job);
    if (job.status === "cancelling") {
      await finalizeCancel(env, job.id, job.attempt_id);
      await clearTerminalArtifacts(env, job.id, job.attempt_id);
    } else if (job.status === "failed" || job.status === "cancelled") {
      await clearTerminalArtifacts(env, job.id, job.attempt_id);
    } else {
      await finalizeDelete(env, job.id, job.attempt_id);
    }
    jobsCleaned += 1;
  }

  for (const upload of await listExpiredUploads(env)) {
    if (env.DOCUMENTS) {
      await env.DOCUMENTS.delete(upload.object_key);
    }
    await markUploadDeleted(env, upload.id);
    uploadsCleaned += 1;
  }

  await purgeOldMetadata(env, config);
  return {
    jobsCleaned,
    jobsPendingStop,
    uploadsCleaned,
    jobsRedispatched,
  };
}
