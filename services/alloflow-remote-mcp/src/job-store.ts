import type {
  PilotConfig,
  PilotEnv,
  PilotPrincipal,
} from "./pilot-env";
import {
  PilotError,
  nowSeconds,
  opaqueId,
  randomToken,
  sha256Base64Url,
} from "./security";

export type UploadStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "processing"
  | "rejected"
  | "deleting"
  | "deleted";

export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelling"
  | "cancelled"
  | "deleting"
  | "deleted";

export type RemediationEffort = "standard" | "thorough";

export type JobRunStage =
  | "claimed"
  | "starting"
  | "receiving"
  | "running"
  | "validating"
  | "uploading"
  | "releasing"
  | "verifying"
  | "publishing"
  | "completed"
  | "cancelling"
  | "cancelled"
  | "failed"
  | "deleting"
  | "deleted";

export type RemediationJobOptions = {
  targetScore: number;
  fixPasses: number;
  effortProfile: RemediationEffort;
  ocrLanguage: string;
  polishPasses: number;
  autoContinueRounds: number;
};

export type UploadRow = {
  id: string;
  institution_id: string;
  owner_id: string;
  object_key: string;
  status: UploadStatus;
  content_type: "application/pdf";
  size_bytes: number | null;
  grant_expires_at: number | null;
  created_at: number;
  updated_at: number;
  uploaded_at: number | null;
  input_expires_at: number;
  deleted_at: number | null;
};

export type JobRow = {
  id: string;
  upload_id: string;
  institution_id: string;
  owner_id: string;
  workflow_id: string;
  status: JobStatus;
  input_key: string | null;
  result_key: string | null;
  report_key: string | null;
  result_content_type: string | null;
  result_size_bytes: number | null;
  result_sha256: string | null;
  before_score: number | null;
  after_score: number | null;
  target_score: number;
  fix_passes: number;
  effort_profile: RemediationEffort;
  ocr_language: string;
  polish_passes: number;
  auto_continue_rounds: number;
  auto_continue_rounds_run: number | null;
  report_size_bytes: number | null;
  report_sha256: string | null;
  error_code: string | null;
  attempt_id: string | null;
  attempt_number: number | null;
  heartbeat_at: number | null;
  lease_expires_at: number | null;
  run_stage: JobRunStage | null;
  checkpoint_seq: number | null;
  checkpoint_key: string | null;
  checkpoint_sha256: string | null;
  checkpoint_size_bytes: number | null;
  checkpoint_stage: string | null;
  checkpoint_schema: string | null;
  checkpoint_input_sha256: string | null;
  checkpoint_options_sha256: string | null;
  checkpoint_engine_sha256: string | null;
  checkpoint_created_at: number | null;
  created_at: number;
  updated_at: number;
  started_at: number | null;
  completed_at: number | null;
  output_expires_at: number | null;
  downloaded_at: number | null;
  deleted_at: number | null;
};

export type RunnerResult = {
  resultSizeBytes: number;
  resultSha256: string;
  autoContinueRoundsRun: number;
  reportSizeBytes: number;
  reportSha256: string;
  beforeScore?: number;
  afterScore?: number;
};

export type JobCheckpoint = {
  seq: number;
  key: string;
  sha256: string;
  sizeBytes: number;
  stage: string;
  schema: string;
  inputSha256: string;
  optionsSha256: string;
  engineSha256: string;
  createdAt: number;
};

export type JobCheckpointCommit = Omit<JobCheckpoint, "createdAt">;

export type JobCheckpointIdentity = Pick<JobCheckpoint, "seq" | "key">;

export type JobCheckpointCommitResult = {
  checkpoint: JobCheckpoint;
  supersededCheckpoint: JobCheckpoint | null;
};

export const RUNNING_JOB_LEASE_SECONDS = 5 * 60;

export type JobArtifactKeys = {
  resultKey: string;
  reportKey: string;
};

type ArtifactKeyJob = Pick<JobRow, "id" | "institution_id">;
type CheckpointKeyJob = Pick<JobRow, "id" | "institution_id">;

const SHA256_HEX_RE = /^[0-9a-f]{64}$/u;
const CHECKPOINT_KEY_SUFFIX_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u;
const CHECKPOINT_CLEARABLE_STATUSES = new Set<JobStatus>([
  "running",
  "completed",
  "failed",
  "cancelling",
  "cancelled",
  "deleting",
]);

export function jobArtifactKeysForAttempt(
  job: ArtifactKeyJob,
  attemptNumber: number,
): JobArtifactKeys {
  if (
    !Number.isSafeInteger(attemptNumber) ||
    attemptNumber < 1 ||
    attemptNumber > 100
  ) {
    throw new Error("invalid_job_attempt_number");
  }
  const prefix =
    `tenant/${job.institution_id}/output/${job.id}/attempt-${attemptNumber}`;
  return {
    resultKey: `${prefix}/tagged.pdf`,
    reportKey: `${prefix}/report.json`,
  };
}

export function jobCheckpointKey(
  job: CheckpointKeyJob,
  seq: number,
  sha256: string,
): string {
  if (
    !Number.isSafeInteger(seq) ||
    seq < 1 ||
    seq > 1_000_000 ||
    !SHA256_HEX_RE.test(sha256)
  ) {
    throw new Error("invalid_job_checkpoint_key");
  }
  return (
    `tenant/${job.institution_id}/checkpoint/${job.id}/` +
    `seq-${seq}-${sha256}.json.gz`
  );
}

function validAttemptId(attemptId: string): boolean {
  return attemptId.length >= 1 && attemptId.length <= 255;
}

export function jobCheckpointPrefix(job: CheckpointKeyJob): string {
  return `tenant/${job.institution_id}/checkpoint/${job.id}/`;
}

function validCheckpointKey(
  job: CheckpointKeyJob,
  key: string,
): boolean {
  const prefix = jobCheckpointPrefix(job);
  const suffix = key.slice(prefix.length);
  return (
    key.length <= 1024 &&
    key.startsWith(prefix) &&
    CHECKPOINT_KEY_SUFFIX_RE.test(suffix) &&
    !suffix.includes("//") &&
    !suffix.split("/").includes("..")
  );
}

function validCheckpointText(value: string, maximumLength: number): boolean {
  return (
    value.length >= 1 &&
    value.length <= maximumLength &&
    value === value.trim()
  );
}

function validCheckpointCommit(
  job: CheckpointKeyJob,
  checkpoint: JobCheckpointCommit,
): boolean {
  return (
    Number.isSafeInteger(checkpoint.seq) &&
    checkpoint.seq >= 1 &&
    checkpoint.seq <= 1_000_000 &&
    SHA256_HEX_RE.test(checkpoint.sha256) &&
    validCheckpointKey(job, checkpoint.key) &&
    checkpoint.key ===
      jobCheckpointKey(job, checkpoint.seq, checkpoint.sha256) &&
    Number.isSafeInteger(checkpoint.sizeBytes) &&
    checkpoint.sizeBytes >= 1 &&
    validCheckpointText(checkpoint.stage, 64) &&
    validCheckpointText(checkpoint.schema, 128) &&
    SHA256_HEX_RE.test(checkpoint.inputSha256) &&
    SHA256_HEX_RE.test(checkpoint.optionsSha256) &&
    SHA256_HEX_RE.test(checkpoint.engineSha256)
  );
}

function jobCheckpointFromRow(job: JobRow): JobCheckpoint | null {
  const values = [
    job.checkpoint_seq,
    job.checkpoint_key,
    job.checkpoint_sha256,
    job.checkpoint_size_bytes,
    job.checkpoint_stage,
    job.checkpoint_schema,
    job.checkpoint_input_sha256,
    job.checkpoint_options_sha256,
    job.checkpoint_engine_sha256,
    job.checkpoint_created_at,
  ];
  if (values.every((value) => value === null)) {
    return null;
  }
  if (values.some((value) => value === null)) {
    throw new PilotError("job_checkpoint_corrupt", 500);
  }
  const checkpoint: JobCheckpoint = {
    seq: job.checkpoint_seq as number,
    key: job.checkpoint_key as string,
    sha256: job.checkpoint_sha256 as string,
    sizeBytes: job.checkpoint_size_bytes as number,
    stage: job.checkpoint_stage as string,
    schema: job.checkpoint_schema as string,
    inputSha256: job.checkpoint_input_sha256 as string,
    optionsSha256: job.checkpoint_options_sha256 as string,
    engineSha256: job.checkpoint_engine_sha256 as string,
    createdAt: job.checkpoint_created_at as number,
  };
  if (
    !validCheckpointCommit(job, checkpoint) ||
    !Number.isSafeInteger(checkpoint.createdAt) ||
    checkpoint.createdAt < 1
  ) {
    throw new PilotError("job_checkpoint_corrupt", 500);
  }
  return checkpoint;
}

function checkpointsMatch(
  existing: JobCheckpoint,
  candidate: JobCheckpointCommit,
): boolean {
  return (
    existing.seq === candidate.seq &&
    existing.key === candidate.key &&
    existing.sha256 === candidate.sha256 &&
    existing.sizeBytes === candidate.sizeBytes &&
    existing.stage === candidate.stage &&
    existing.schema === candidate.schema &&
    existing.inputSha256 === candidate.inputSha256 &&
    existing.optionsSha256 === candidate.optionsSha256 &&
    existing.engineSha256 === candidate.engineSha256
  );
}

function database(env: PilotEnv): D1Database {
  if (!env.PILOT_DB) {
    throw new PilotError("pilot_not_configured", 503);
  }
  return env.PILOT_DB;
}

function ownerWhere(principal: PilotPrincipal): [string, string] {
  return [principal.institutionId, principal.ownerId];
}

function jobOptionsMatch(
  job: JobRow,
  options: RemediationJobOptions,
): boolean {
  return (
    job.target_score === options.targetScore &&
    job.fix_passes === options.fixPasses &&
    job.effort_profile === options.effortProfile &&
    job.ocr_language === options.ocrLanguage &&
    job.polish_passes === options.polishPasses &&
    job.auto_continue_rounds === options.autoContinueRounds
  );
}

function replayJob(
  job: JobRow,
  options: RemediationJobOptions,
): { job: JobRow; created: false } {
  if (!jobOptionsMatch(job, options)) {
    throw new PilotError("job_options_conflict", 409);
  }
  return { job, created: false };
}

export async function createUpload(
  env: PilotEnv,
  config: PilotConfig,
  principal: PilotPrincipal,
): Promise<{
  upload: UploadRow;
  grant: string;
}> {
  const id = opaqueId("upl");
  const grant = randomToken();
  const grantHash = await sha256Base64Url(grant);
  const now = nowSeconds();
  const dailyCutoff = now - 24 * 60 * 60;
  const grantExpiresAt = now + config.uploadTtlSeconds;
  const inputExpiresAt = now + config.unstartedInputTtlSeconds;
  const objectKey = `tenant/${config.institutionId}/input/${id}.pdf`;

  const inserted = await database(env)
    .prepare(
      `INSERT INTO uploads (
        id, institution_id, owner_id, object_key, status, content_type,
        grant_hash, grant_expires_at, created_at, updated_at, input_expires_at
      )
      SELECT ?, ?, ?, ?, 'pending', 'application/pdf', ?, ?, ?, ?, ?
      WHERE (
        SELECT COUNT(*)
        FROM uploads
        WHERE institution_id = ?
          AND owner_id = ?
          AND (
            (status = 'pending' AND grant_expires_at > ?)
            OR status IN (
              'uploading', 'uploaded', 'processing', 'deleting'
            )
          )
          AND deleted_at IS NULL
      ) < ?
      AND (
        SELECT COUNT(*)
        FROM uploads
        WHERE institution_id = ?
          AND owner_id = ?
          AND created_at >= ?
      ) < ?
      AND (
        SELECT COUNT(*)
        FROM uploads
        WHERE institution_id = ?
          AND created_at >= ?
      ) < ?`,
    )
    .bind(
      id,
      principal.institutionId,
      principal.ownerId,
      objectKey,
      grantHash,
      grantExpiresAt,
      now,
      now,
      inputExpiresAt,
      principal.institutionId,
      principal.ownerId,
      now,
      config.maxOpenUploadsPerOwner,
      principal.institutionId,
      principal.ownerId,
      dailyCutoff,
      config.maxUploadAttemptsPerOwner24h,
      principal.institutionId,
      dailyCutoff,
      config.maxUploadAttemptsPerInstitution24h,
    )
    .run();
  if (inserted.meta.changes !== 1) {
    throw new PilotError("upload_quota_exceeded", 429);
  }

  const upload = await getUploadForOwner(env, id, principal);
  return { upload, grant };
}

export async function claimUploadGrant(
  env: PilotEnv,
  uploadId: string,
  grantHash: string,
): Promise<UploadRow> {
  const now = nowSeconds();
  const result = await database(env)
    .prepare(
      `UPDATE uploads
       SET status = 'uploading', updated_at = ?
       WHERE id = ?
         AND status = 'pending'
         AND grant_hash = ?
         AND grant_expires_at > ?
         AND deleted_at IS NULL`,
    )
    .bind(now, uploadId, grantHash, now)
    .run();
  if (result.meta.changes !== 1) {
    throw new PilotError("invalid_or_expired_upload_grant", 401);
  }
  const upload = await database(env)
    .prepare(
      `SELECT id, institution_id, owner_id, object_key, status, content_type,
              size_bytes, grant_expires_at, created_at, updated_at, uploaded_at,
              input_expires_at, deleted_at
       FROM uploads
       WHERE id = ? AND status = 'uploading'`,
    )
    .bind(uploadId)
    .first<UploadRow>();
  if (!upload) {
    throw new PilotError("invalid_or_expired_upload_grant", 401);
  }
  return upload;
}

export async function releaseUploadGrant(
  env: PilotEnv,
  uploadId: string,
): Promise<void> {
  const now = nowSeconds();
  await database(env)
    .prepare(
      `UPDATE uploads
       SET status = 'pending', updated_at = ?
       WHERE id = ?
         AND status = 'uploading'
         AND grant_expires_at > ?
         AND deleted_at IS NULL`,
    )
    .bind(now, uploadId, now)
    .run();
}

export async function completeUpload(
  env: PilotEnv,
  uploadId: string,
  sizeBytes: number,
): Promise<void> {
  const now = nowSeconds();
  const result = await database(env)
    .prepare(
      `UPDATE uploads
       SET status = 'uploaded',
           size_bytes = ?,
           grant_hash = NULL,
           grant_used_at = ?,
           uploaded_at = ?,
           updated_at = ?
       WHERE id = ? AND status = 'uploading' AND deleted_at IS NULL`,
    )
    .bind(sizeBytes, now, now, now, uploadId)
    .run();
  if (result.meta.changes !== 1) {
    throw new PilotError("upload_state_conflict", 409);
  }
}

export async function rejectUpload(
  env: PilotEnv,
  uploadId: string,
): Promise<void> {
  const now = nowSeconds();
  await database(env)
    .prepare(
      `UPDATE uploads
       SET status = 'rejected',
           grant_hash = NULL,
           grant_used_at = ?,
           updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(now, now, uploadId)
    .run();
}

export async function getUploadForOwner(
  env: PilotEnv,
  uploadId: string,
  principal: PilotPrincipal,
): Promise<UploadRow> {
  const upload = await database(env)
    .prepare(
      `SELECT id, institution_id, owner_id, object_key, status, content_type,
              size_bytes, grant_expires_at, created_at, updated_at, uploaded_at,
              input_expires_at, deleted_at
       FROM uploads
       WHERE id = ?
         AND institution_id = ?
         AND owner_id = ?
         AND deleted_at IS NULL`,
    )
    .bind(uploadId, ...ownerWhere(principal))
    .first<UploadRow>();
  if (!upload) {
    throw new PilotError("not_found", 404);
  }
  return upload;
}

export async function createJob(
  env: PilotEnv,
  config: PilotConfig,
  principal: PilotPrincipal,
  uploadId: string,
  options: RemediationJobOptions,
): Promise<{ job: JobRow; created: boolean }> {
  const existing = await database(env)
    .prepare(
      `SELECT *
       FROM jobs
       WHERE upload_id = ? AND institution_id = ? AND owner_id = ?
         AND deleted_at IS NULL`,
    )
    .bind(uploadId, ...ownerWhere(principal))
    .first<JobRow>();
  if (existing) {
    return replayJob(existing, options);
  }

  const now = nowSeconds();
  const dailyCutoff = now - 24 * 60 * 60;
  const jobId = opaqueId("job");
  const resultKey = `tenant/${config.institutionId}/output/${jobId}/tagged.pdf`;
  const reportKey = `tenant/${config.institutionId}/output/${jobId}/report.json`;
  const db = database(env);
  const [inserted, claimed] = await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO jobs (
          id, upload_id, institution_id, owner_id, workflow_id, status,
          input_key, result_key, report_key, target_score, fix_passes,
          effort_profile, ocr_language, polish_passes, auto_continue_rounds,
          created_at, updated_at
        )
        SELECT ?, upload.id, upload.institution_id, upload.owner_id, ?,
               'queued', upload.object_key, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        FROM uploads AS upload
        WHERE upload.id = ?
          AND upload.institution_id = ?
          AND upload.owner_id = ?
          AND upload.status = 'uploaded'
          AND upload.input_expires_at > ?
          AND upload.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM jobs WHERE jobs.upload_id = upload.id
          )
          AND (
            SELECT COUNT(*)
            FROM jobs
            WHERE institution_id = upload.institution_id
              AND owner_id = upload.owner_id
              AND status IN ('queued', 'running', 'cancelling', 'deleting')
              AND deleted_at IS NULL
          ) < ?
          AND (
            SELECT COUNT(*)
            FROM jobs
            WHERE institution_id = upload.institution_id
              AND status IN ('queued', 'running', 'cancelling', 'deleting')
              AND deleted_at IS NULL
          ) < ?
          AND (
            SELECT COUNT(*)
            FROM jobs
            WHERE institution_id = upload.institution_id
              AND owner_id = upload.owner_id
              AND created_at >= ?
          ) < ?
          AND (
            SELECT COUNT(*)
            FROM jobs
            WHERE institution_id = upload.institution_id
              AND created_at >= ?
          ) < ?`,
      )
      .bind(
        jobId,
        jobId,
        resultKey,
        reportKey,
        options.targetScore,
        options.fixPasses,
        options.effortProfile,
        options.ocrLanguage,
        options.polishPasses,
        options.autoContinueRounds,
        now,
        now,
        uploadId,
        ...ownerWhere(principal),
        now,
        config.maxActiveJobsPerOwner,
        config.maxActiveJobsPerInstitution,
        dailyCutoff,
        config.maxJobsPerOwner24h,
        dailyCutoff,
        config.maxJobsPerInstitution24h,
      ),
    db
      .prepare(
        `UPDATE uploads
         SET status = 'processing', updated_at = ?
         WHERE id = ?
           AND institution_id = ?
           AND owner_id = ?
           AND status = 'uploaded'
           AND deleted_at IS NULL
           AND EXISTS (
             SELECT 1
             FROM jobs
             WHERE jobs.id = ?
               AND jobs.upload_id = uploads.id
           )`,
      )
      .bind(now, uploadId, ...ownerWhere(principal), jobId),
  ]);

  if (inserted.meta.changes !== 1 || claimed.meta.changes !== 1) {
    const raced = await db
      .prepare(
        `SELECT *
         FROM jobs
         WHERE upload_id = ? AND institution_id = ? AND owner_id = ?
           AND deleted_at IS NULL`,
      )
      .bind(uploadId, ...ownerWhere(principal))
      .first<JobRow>();
    if (raced) {
      return replayJob(raced, options);
    }
    const uploadReady = await db
      .prepare(
        `SELECT 1
         FROM uploads
         WHERE id = ?
           AND institution_id = ?
           AND owner_id = ?
           AND status = 'uploaded'
           AND input_expires_at > ?
           AND deleted_at IS NULL`,
      )
      .bind(uploadId, ...ownerWhere(principal), now)
      .first<Record<string, number>>();
    if (uploadReady) {
      throw new PilotError("remediation_quota_exceeded", 429);
    }
    throw new PilotError("upload_not_ready", 409);
  }

  return {
    job: await getJobForOwner(env, jobId, principal),
    created: true,
  };
}

export async function markDispatchPending(
  env: PilotEnv,
  jobId: string,
): Promise<void> {
  await database(env)
    .prepare(
      `UPDATE jobs
       SET error_code = 'dispatch_pending', updated_at = ?
       WHERE id = ? AND status = 'queued' AND deleted_at IS NULL`,
    )
    .bind(nowSeconds(), jobId)
    .run();
}

export async function clearDispatchPending(
  env: PilotEnv,
  jobId: string,
): Promise<void> {
  await database(env)
    .prepare(
      `UPDATE jobs
       SET error_code = NULL, updated_at = ?
       WHERE id = ? AND status = 'queued' AND deleted_at IS NULL`,
    )
    .bind(nowSeconds(), jobId)
    .run();
}

export async function getJobForOwner(
  env: PilotEnv,
  jobId: string,
  principal: PilotPrincipal,
  includeDeleted = false,
): Promise<JobRow> {
  const job = await database(env)
    .prepare(
      `SELECT *
       FROM jobs
       WHERE id = ? AND institution_id = ? AND owner_id = ?
         ${includeDeleted ? "" : "AND deleted_at IS NULL"}`,
    )
    .bind(jobId, ...ownerWhere(principal))
    .first<JobRow>();
  if (!job) {
    throw new PilotError("not_found", 404);
  }
  return job;
}

export async function getInternalJob(
  env: PilotEnv,
  jobId: string,
): Promise<JobRow> {
  const job = await database(env)
    .prepare(
      `SELECT *
       FROM jobs
       WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(jobId)
    .first<JobRow>();
  if (!job) {
    throw new PilotError("not_found", 404);
  }
  return job;
}

export async function markJobRunning(
  env: PilotEnv,
  jobId: string,
  workflowInstanceId: string,
): Promise<JobRow> {
  if (!validAttemptId(workflowInstanceId)) {
    throw new PilotError("job_not_runnable", 409);
  }
  const now = nowSeconds();
  const changed = await database(env)
    .prepare(
      `UPDATE jobs
       SET status = 'running',
           started_at = COALESCE(started_at, ?),
           error_code = NULL,
           heartbeat_at = ?,
           lease_expires_at = ?,
           run_stage = 'claimed',
           updated_at = ?
       WHERE id = ?
         AND workflow_id = ?
         AND status IN ('queued', 'running')
         AND deleted_at IS NULL`,
    )
    .bind(
      now,
      now,
      now + RUNNING_JOB_LEASE_SECONDS,
      now,
      jobId,
      workflowInstanceId,
    )
    .run();
  const job = await getInternalJob(env, jobId);
  if (
    changed.meta.changes !== 1 ||
    job.status !== "running" ||
    job.workflow_id !== workflowInstanceId
  ) {
    throw new PilotError("job_not_runnable", 409);
  }
  return job;
}

export type JobAttemptClaim = {
  job: JobRow;
  supersededArtifactKeys: string[];
};

export async function claimJobAttempt(
  env: PilotEnv,
  jobId: string,
  workflowInstanceId: string,
  attemptId: string,
  attemptNumber: number,
): Promise<JobAttemptClaim> {
  if (
    !validAttemptId(workflowInstanceId) ||
    !validAttemptId(attemptId) ||
    !Number.isSafeInteger(attemptNumber) ||
    attemptNumber < 1 ||
    attemptNumber > 100
  ) {
    throw new PilotError("invalid_job_attempt", 500);
  }

  const previous = await getInternalJob(env, jobId);
  if (
    previous.status !== "running" ||
    previous.workflow_id !== workflowInstanceId ||
    (
      previous.attempt_number !== null &&
      (
        previous.attempt_number > attemptNumber ||
        (
          previous.attempt_number === attemptNumber &&
          previous.attempt_id !== attemptId
        )
      )
    )
  ) {
    throw new PilotError("job_attempt_lost", 409);
  }

  const keys = jobArtifactKeysForAttempt(previous, attemptNumber);
  const now = nowSeconds();
  const changed = await database(env)
    .prepare(
      `UPDATE jobs
       SET attempt_id = ?,
           attempt_number = ?,
           result_key = ?,
           report_key = ?,
           heartbeat_at = ?,
           lease_expires_at = ?,
           run_stage = 'starting',
           error_code = NULL,
           updated_at = ?
       WHERE id = ?
         AND workflow_id = ?
         AND status = 'running'
         AND deleted_at IS NULL
         AND (
           attempt_number IS NULL
           OR attempt_number < ?
           OR (
             attempt_number = ?
             AND attempt_id = ?
           )
         )`,
    )
    .bind(
      attemptId,
      attemptNumber,
      keys.resultKey,
      keys.reportKey,
      now,
      now + RUNNING_JOB_LEASE_SECONDS,
      now,
      jobId,
      workflowInstanceId,
      attemptNumber,
      attemptNumber,
      attemptId,
    )
    .run();

  const job = await getInternalJob(env, jobId);
  if (
    changed.meta.changes !== 1 ||
    job.status !== "running" ||
    job.attempt_id !== attemptId ||
    job.attempt_number !== attemptNumber
  ) {
    throw new PilotError("job_attempt_lost", 409);
  }

  const supersededArtifactKeys =
    previous.attempt_id === attemptId
      ? []
      : [previous.result_key, previous.report_key].filter(
          (key): key is string =>
            Boolean(key) &&
            key !== keys.resultKey &&
            key !== keys.reportKey,
        );
  return { job, supersededArtifactKeys };
}

export async function renewJobLease(
  env: PilotEnv,
  jobId: string,
  attemptId: string,
  stage: JobRunStage,
): Promise<void> {
  if (!validAttemptId(attemptId)) {
    throw new PilotError("invalid_job_attempt", 500);
  }
  const now = nowSeconds();
  const changed = await database(env)
    .prepare(
      `UPDATE jobs
       SET heartbeat_at = ?,
           lease_expires_at = ?,
           run_stage = ?,
           updated_at = ?
       WHERE id = ?
         AND status = 'running'
         AND attempt_id = ?
         AND deleted_at IS NULL`,
    )
    .bind(
      now,
      now + RUNNING_JOB_LEASE_SECONDS,
      stage,
      now,
      jobId,
      attemptId,
    )
    .run();
  if (changed.meta.changes !== 1) {
    throw new PilotError("job_attempt_lost", 409);
  }
}

export async function getJobCheckpoint(
  env: PilotEnv,
  jobId: string,
): Promise<JobCheckpoint | null> {
  return jobCheckpointFromRow(await getInternalJob(env, jobId));
}

export async function commitJobCheckpoint(
  env: PilotEnv,
  jobId: string,
  attemptId: string,
  checkpoint: JobCheckpointCommit,
): Promise<JobCheckpointCommitResult> {
  if (!validAttemptId(attemptId)) {
    throw new PilotError("invalid_job_attempt", 500);
  }

  const current = await getInternalJob(env, jobId);
  if (current.status !== "running" || current.attempt_id !== attemptId) {
    throw new PilotError("job_attempt_lost", 409);
  }
  if (!validCheckpointCommit(current, checkpoint)) {
    throw new PilotError("invalid_job_checkpoint", 500);
  }

  const previous = jobCheckpointFromRow(current);
  if (previous && previous.seq === checkpoint.seq) {
    if (checkpointsMatch(previous, checkpoint)) {
      return { checkpoint: previous, supersededCheckpoint: null };
    }
    throw new PilotError("job_checkpoint_conflict", 409);
  }
  if (previous && previous.seq > checkpoint.seq) {
    throw new PilotError("job_checkpoint_conflict", 409);
  }

  const expectedSeq = previous?.seq ?? null;
  const now = nowSeconds();
  const changed = await database(env)
    .prepare(
      `UPDATE jobs
       SET checkpoint_seq = ?,
           checkpoint_key = ?,
           checkpoint_sha256 = ?,
           checkpoint_size_bytes = ?,
           checkpoint_stage = ?,
           checkpoint_schema = ?,
           checkpoint_input_sha256 = ?,
           checkpoint_options_sha256 = ?,
           checkpoint_engine_sha256 = ?,
           checkpoint_created_at = ?,
           heartbeat_at = ?,
           lease_expires_at = ?,
           updated_at = ?
       WHERE id = ?
         AND status = 'running'
         AND attempt_id = ?
         AND deleted_at IS NULL
         AND (
           (? IS NULL AND checkpoint_seq IS NULL)
           OR checkpoint_seq = ?
         )`,
    )
    .bind(
      checkpoint.seq,
      checkpoint.key,
      checkpoint.sha256,
      checkpoint.sizeBytes,
      checkpoint.stage,
      checkpoint.schema,
      checkpoint.inputSha256,
      checkpoint.optionsSha256,
      checkpoint.engineSha256,
      now,
      now,
      now + RUNNING_JOB_LEASE_SECONDS,
      now,
      jobId,
      attemptId,
      expectedSeq,
      expectedSeq,
    )
    .run();

  if (changed.meta.changes !== 1) {
    const latest = await getInternalJob(env, jobId);
    if (latest.status !== "running" || latest.attempt_id !== attemptId) {
      throw new PilotError("job_attempt_lost", 409);
    }
    const latestCheckpoint = jobCheckpointFromRow(latest);
    if (
      latestCheckpoint &&
      checkpointsMatch(latestCheckpoint, checkpoint)
    ) {
      return {
        checkpoint: latestCheckpoint,
        supersededCheckpoint: null,
      };
    }
    throw new PilotError("job_checkpoint_conflict", 409);
  }

  return {
    checkpoint: { ...checkpoint, createdAt: now },
    supersededCheckpoint: previous,
  };
}

export async function clearJobCheckpoint(
  env: PilotEnv,
  jobId: string,
  attemptId: string,
  expected?: JobCheckpointIdentity,
): Promise<JobCheckpoint | null> {
  if (!validAttemptId(attemptId)) {
    throw new PilotError("invalid_job_attempt", 500);
  }

  const current = await getInternalJob(env, jobId);
  if (
    current.attempt_id !== attemptId ||
    !CHECKPOINT_CLEARABLE_STATUSES.has(current.status)
  ) {
    throw new PilotError("job_attempt_lost", 409);
  }
  const checkpoint = jobCheckpointFromRow(current);
  if (!checkpoint) {
    return null;
  }
  if (
    expected &&
    (expected.seq !== checkpoint.seq || expected.key !== checkpoint.key)
  ) {
    return null;
  }

  const changed = await database(env)
    .prepare(
      `UPDATE jobs
       SET checkpoint_seq = NULL,
           checkpoint_key = NULL,
           checkpoint_sha256 = NULL,
           checkpoint_size_bytes = NULL,
           checkpoint_stage = NULL,
           checkpoint_schema = NULL,
           checkpoint_input_sha256 = NULL,
           checkpoint_options_sha256 = NULL,
           checkpoint_engine_sha256 = NULL,
           checkpoint_created_at = NULL,
           updated_at = ?
       WHERE id = ?
         AND attempt_id = ?
         AND status IN (
           'running', 'completed', 'failed', 'cancelling', 'cancelled',
           'deleting'
         )
         AND checkpoint_seq = ?
         AND checkpoint_key = ?
         AND deleted_at IS NULL`,
    )
    .bind(
      nowSeconds(),
      jobId,
      attemptId,
      checkpoint.seq,
      checkpoint.key,
    )
    .run();
  if (changed.meta.changes === 1) {
    return checkpoint;
  }

  const latest = await getInternalJob(env, jobId);
  if (
    latest.attempt_id !== attemptId ||
    !CHECKPOINT_CLEARABLE_STATUSES.has(latest.status)
  ) {
    throw new PilotError("job_attempt_lost", 409);
  }
  if (jobCheckpointFromRow(latest) === null) {
    return null;
  }
  throw new PilotError("job_checkpoint_conflict", 409);
}

export async function completeJob(
  env: PilotEnv,
  config: PilotConfig,
  jobId: string,
  attemptId: string,
  result: RunnerResult,
): Promise<void> {
  if (!validAttemptId(attemptId)) {
    throw new PilotError("invalid_job_attempt", 500);
  }
  const currentBeforeCompletion = await getInternalJob(env, jobId);
  if (
    !Number.isSafeInteger(result.autoContinueRoundsRun) ||
    result.autoContinueRoundsRun < 0 ||
    result.autoContinueRoundsRun >
      currentBeforeCompletion.auto_continue_rounds ||
    !Number.isSafeInteger(result.reportSizeBytes) ||
    result.reportSizeBytes <= 0 ||
    !/^[0-9a-f]{64}$/u.test(result.reportSha256)
  ) {
    throw new PilotError("invalid_runner_result", 502);
  }
  const now = nowSeconds();
  const db = database(env);
  const [changed] = await db.batch([
    db
      .prepare(
        `UPDATE jobs
       SET status = 'completed',
           result_content_type = 'application/pdf',
           result_size_bytes = ?,
           result_sha256 = ?,
           auto_continue_rounds_run = ?,
           report_size_bytes = ?,
           report_sha256 = ?,
           before_score = ?,
           after_score = ?,
           completed_at = ?,
           output_expires_at = ?,
           error_code = NULL,
           heartbeat_at = ?,
           lease_expires_at = NULL,
           run_stage = 'completed',
           updated_at = ?
         WHERE id = ?
           AND status = 'running'
           AND attempt_id = ?
           AND deleted_at IS NULL`,
      )
      .bind(
        result.resultSizeBytes,
        result.resultSha256,
        result.autoContinueRoundsRun,
        result.reportSizeBytes,
        result.reportSha256,
        result.beforeScore ?? null,
        result.afterScore ?? null,
        now,
        now + config.outputTtlSeconds,
        now,
        now,
        jobId,
        attemptId,
      ),
    db
      .prepare(
        `UPDATE uploads
         SET status = 'deleting', updated_at = ?
         WHERE id = (
           SELECT upload_id
           FROM jobs
           WHERE id = ?
             AND status = 'completed'
             AND attempt_id = ?
         )
           AND status = 'processing'`,
      )
      .bind(now, jobId, attemptId),
  ]);
  if (changed.meta.changes !== 1) {
    const current = await getInternalJob(env, jobId);
    const replayMatches =
      current.status === "completed" &&
      current.attempt_id === attemptId &&
      current.result_content_type === "application/pdf" &&
      current.result_size_bytes === result.resultSizeBytes &&
      current.result_sha256 === result.resultSha256 &&
      current.auto_continue_rounds_run === result.autoContinueRoundsRun &&
      current.report_size_bytes === result.reportSizeBytes &&
      current.report_sha256 === result.reportSha256 &&
      current.before_score === (result.beforeScore ?? null) &&
      current.after_score === (result.afterScore ?? null) &&
      current.completed_at !== null &&
      current.output_expires_at !== null;
    if (!replayMatches) {
      throw new PilotError("job_state_conflict", 409);
    }
  }
}

export async function finalizeInputDeletion(
  env: PilotEnv,
  jobId: string,
  attemptId: string | null,
): Promise<void> {
  if (attemptId !== null && !validAttemptId(attemptId)) {
    throw new PilotError("invalid_job_attempt", 500);
  }
  const now = nowSeconds();
  const db = database(env);
  await db.batch([
    db
      .prepare(
        `UPDATE jobs
         SET input_key = NULL, updated_at = ?
         WHERE id = ?
           AND status IN ('completed', 'failed', 'cancelled')
           AND (
             attempt_id = ?
             OR (attempt_id IS NULL AND ? IS NULL)
           )`,
      )
      .bind(now, jobId, attemptId, attemptId),
    db
      .prepare(
        `UPDATE uploads
         SET status = 'deleted', deleted_at = ?, updated_at = ?
         WHERE id = (
           SELECT upload_id
           FROM jobs
           WHERE id = ?
             AND status IN ('completed', 'failed', 'cancelled')
             AND (
               attempt_id = ?
               OR (attempt_id IS NULL AND ? IS NULL)
             )
         )
           AND status IN ('deleting', 'processing')`,
      )
      .bind(now, now, jobId, attemptId, attemptId),
  ]);
}

export async function failJob(
  env: PilotEnv,
  jobId: string,
  attemptId: string | null,
  errorCode: string,
): Promise<boolean> {
  if (attemptId !== null && !validAttemptId(attemptId)) {
    throw new PilotError("invalid_job_attempt", 500);
  }
  const now = nowSeconds();
  const changed = await database(env)
    .prepare(
      `UPDATE jobs
       SET status = CASE
             WHEN status IN ('cancelling', 'cancelled') THEN 'cancelled'
             ELSE 'failed'
           END,
           error_code = ?,
           run_stage = CASE
             WHEN status IN ('cancelling', 'cancelled') THEN 'cancelled'
             ELSE 'failed'
           END,
           completed_at = COALESCE(completed_at, ?),
           lease_expires_at = NULL,
           updated_at = ?
       WHERE id = ?
         AND status IN (
           'queued', 'running', 'cancelling', 'failed', 'cancelled'
         )
         AND (
           attempt_id = ?
           OR (attempt_id IS NULL AND ? IS NULL)
         )
         AND deleted_at IS NULL`,
    )
    .bind(errorCode, now, now, jobId, attemptId, attemptId)
    .run();
  return changed.meta.changes === 1;
}

export async function createDownloadGrant(
  env: PilotEnv,
  config: PilotConfig,
  principal: PilotPrincipal,
  jobId: string,
): Promise<{ job: JobRow; grant: string; expiresAt: number }> {
  const job = await getJobForOwner(env, jobId, principal);
  const now = nowSeconds();
  if (
    job.status !== "completed" ||
    !job.result_key ||
    !job.output_expires_at ||
    job.output_expires_at <= now
  ) {
    throw new PilotError("result_not_ready", 409);
  }
  const grant = randomToken();
  const hash = await sha256Base64Url(grant);
  const expiresAt = Math.min(
    now + config.uploadTtlSeconds,
    job.output_expires_at,
  );
  await database(env)
    .prepare(
      `UPDATE jobs
       SET download_grant_hash = ?,
           download_grant_expires_at = ?,
           download_grant_used_at = NULL,
           updated_at = ?
       WHERE id = ?
         AND institution_id = ?
         AND owner_id = ?
         AND status = 'completed'
         AND deleted_at IS NULL`,
    )
    .bind(hash, expiresAt, now, jobId, ...ownerWhere(principal))
    .run();
  return {
    job: await getJobForOwner(env, jobId, principal),
    grant,
    expiresAt,
  };
}

export async function consumeDownloadGrant(
  env: PilotEnv,
  jobId: string,
  grantHash: string,
): Promise<JobRow> {
  const now = nowSeconds();
  const result = await database(env)
    .prepare(
      `UPDATE jobs
       SET download_grant_used_at = ?, updated_at = ?
       WHERE id = ?
         AND status = 'completed'
         AND download_grant_hash = ?
         AND download_grant_used_at IS NULL
         AND download_grant_expires_at > ?
         AND output_expires_at > ?
         AND deleted_at IS NULL`,
    )
    .bind(now, now, jobId, grantHash, now, now)
    .run();
  if (result.meta.changes !== 1) {
    throw new PilotError("invalid_or_expired_download_grant", 401);
  }
  return getInternalJob(env, jobId);
}

export async function noteDownload(
  env: PilotEnv,
  config: PilotConfig,
  jobId: string,
): Promise<void> {
  const now = nowSeconds();
  await database(env)
    .prepare(
      `UPDATE jobs
       SET downloaded_at = COALESCE(downloaded_at, ?),
           output_expires_at = MIN(output_expires_at, ?),
           download_grant_hash = NULL,
           updated_at = ?
       WHERE id = ? AND status = 'completed'`,
    )
    .bind(now, now + config.downloadGraceSeconds, now, jobId)
    .run();
}

export async function beginCancel(
  env: PilotEnv,
  jobId: string,
  principal: PilotPrincipal,
): Promise<JobRow> {
  await getJobForOwner(env, jobId, principal);
  const now = nowSeconds();
  await database(env)
    .prepare(
      `UPDATE jobs
       SET status = 'cancelling',
           lease_expires_at = NULL,
           run_stage = 'cancelling',
           updated_at = ?
       WHERE id = ? AND institution_id = ? AND owner_id = ?
         AND status IN ('queued', 'running') AND deleted_at IS NULL`,
    )
    .bind(now, jobId, ...ownerWhere(principal))
    .run();
  return getJobForOwner(env, jobId, principal);
}

export async function finalizeCancel(
  env: PilotEnv,
  jobId: string,
  attemptId: string | null,
): Promise<void> {
  if (attemptId !== null && !validAttemptId(attemptId)) {
    throw new PilotError("invalid_job_attempt", 500);
  }
  const now = nowSeconds();
  await database(env)
    .prepare(
      `UPDATE jobs
       SET status = 'cancelled',
           error_code = COALESCE(error_code, 'cancelled_by_user'),
           input_key = NULL,
           result_key = NULL,
           report_key = NULL,
           report_size_bytes = NULL,
           report_sha256 = NULL,
           checkpoint_seq = NULL,
           checkpoint_key = NULL,
           checkpoint_sha256 = NULL,
           checkpoint_size_bytes = NULL,
           checkpoint_stage = NULL,
           checkpoint_schema = NULL,
           checkpoint_input_sha256 = NULL,
           checkpoint_options_sha256 = NULL,
           checkpoint_engine_sha256 = NULL,
           checkpoint_created_at = NULL,
           completed_at = COALESCE(completed_at, ?),
           lease_expires_at = NULL,
           run_stage = 'cancelled',
           updated_at = ?
       WHERE id = ?
         AND status IN ('cancelling', 'cancelled')
         AND (
           attempt_id = ?
           OR (attempt_id IS NULL AND ? IS NULL)
         )`,
    )
    .bind(now, now, jobId, attemptId, attemptId)
    .run();
  await database(env)
    .prepare(
      `UPDATE uploads
       SET status = 'deleted', deleted_at = COALESCE(deleted_at, ?), updated_at = ?
       WHERE id = (
         SELECT upload_id
         FROM jobs
         WHERE id = ?
           AND status = 'cancelled'
           AND (
             attempt_id = ?
             OR (attempt_id IS NULL AND ? IS NULL)
           )
       )
         AND status <> 'deleted'`,
    )
    .bind(now, now, jobId, attemptId, attemptId)
    .run();
}

export async function beginDelete(
  env: PilotEnv,
  jobId: string,
  principal: PilotPrincipal,
): Promise<JobRow> {
  const job = await getJobForOwner(env, jobId, principal, true);
  if (job.status === "deleted") {
    return job;
  }
  const now = nowSeconds();
  await database(env)
    .prepare(
      `UPDATE jobs
       SET status = 'deleting',
           lease_expires_at = NULL,
           run_stage = 'deleting',
           updated_at = ?
       WHERE id = ? AND institution_id = ? AND owner_id = ?
         AND status <> 'deleted'`,
    )
    .bind(now, jobId, ...ownerWhere(principal))
    .run();
  return getJobForOwner(env, jobId, principal, true);
}

export async function finalizeDelete(
  env: PilotEnv,
  jobId: string,
  attemptId: string | null,
): Promise<void> {
  if (attemptId !== null && !validAttemptId(attemptId)) {
    throw new PilotError("invalid_job_attempt", 500);
  }
  const now = nowSeconds();
  await database(env)
    .prepare(
      `UPDATE jobs
       SET status = 'deleted',
           input_key = NULL,
           result_key = NULL,
           report_key = NULL,
           result_content_type = NULL,
           result_size_bytes = NULL,
           result_sha256 = NULL,
           report_size_bytes = NULL,
           report_sha256 = NULL,
           download_grant_hash = NULL,
           checkpoint_seq = NULL,
           checkpoint_key = NULL,
           checkpoint_sha256 = NULL,
           checkpoint_size_bytes = NULL,
           checkpoint_stage = NULL,
           checkpoint_schema = NULL,
           checkpoint_input_sha256 = NULL,
           checkpoint_options_sha256 = NULL,
           checkpoint_engine_sha256 = NULL,
           checkpoint_created_at = NULL,
           deleted_at = COALESCE(deleted_at, ?),
           lease_expires_at = NULL,
           run_stage = 'deleted',
           updated_at = ?
       WHERE id = ?
         AND status IN ('completed', 'deleting', 'deleted')
         AND (
           attempt_id = ?
           OR (attempt_id IS NULL AND ? IS NULL)
         )`,
    )
    .bind(now, now, jobId, attemptId, attemptId)
    .run();
  await database(env)
    .prepare(
      `UPDATE uploads
       SET status = 'deleted',
           grant_hash = NULL,
           deleted_at = COALESCE(deleted_at, ?),
           updated_at = ?
       WHERE id = (
         SELECT upload_id
         FROM jobs
         WHERE id = ?
           AND status = 'deleted'
           AND (
             attempt_id = ?
             OR (attempt_id IS NULL AND ? IS NULL)
           )
       )`,
    )
    .bind(now, now, jobId, attemptId, attemptId)
    .run();
}

export async function clearTerminalArtifacts(
  env: PilotEnv,
  jobId: string,
  attemptId: string | null,
): Promise<void> {
  if (attemptId !== null && !validAttemptId(attemptId)) {
    throw new PilotError("invalid_job_attempt", 500);
  }
  const now = nowSeconds();
  await database(env)
    .prepare(
      `UPDATE jobs
       SET input_key = NULL,
           result_key = NULL,
           report_key = NULL,
           result_content_type = NULL,
           result_size_bytes = NULL,
           result_sha256 = NULL,
           report_size_bytes = NULL,
           report_sha256 = NULL,
           download_grant_hash = NULL,
           checkpoint_seq = NULL,
           checkpoint_key = NULL,
           checkpoint_sha256 = NULL,
           checkpoint_size_bytes = NULL,
           checkpoint_stage = NULL,
           checkpoint_schema = NULL,
           checkpoint_input_sha256 = NULL,
           checkpoint_options_sha256 = NULL,
           checkpoint_engine_sha256 = NULL,
           checkpoint_created_at = NULL,
           updated_at = ?
       WHERE id = ?
         AND status IN ('failed', 'cancelled')
         AND (
           attempt_id = ?
           OR (attempt_id IS NULL AND ? IS NULL)
         )`,
    )
    .bind(now, jobId, attemptId, attemptId)
    .run();
  await database(env)
    .prepare(
      `UPDATE uploads
       SET status = 'deleted',
           grant_hash = NULL,
           deleted_at = COALESCE(deleted_at, ?),
           updated_at = ?
       WHERE id = (
         SELECT upload_id
         FROM jobs
         WHERE id = ?
           AND status IN ('failed', 'cancelled')
           AND (
             attempt_id = ?
             OR (attempt_id IS NULL AND ? IS NULL)
           )
       )`,
    )
    .bind(now, now, jobId, attemptId, attemptId)
    .run();
}

export async function listCleanupJobs(
  env: PilotEnv,
  config: PilotConfig,
  limit = 50,
): Promise<JobRow[]> {
  const now = nowSeconds();
  const queuedCutoff = now - config.unstartedInputTtlSeconds;
  const legacyRunningCutoff =
    now - Math.max(30, config.remediationMaxRunMinutes + 10) * 60;
  await database(env)
    .prepare(
      `UPDATE jobs
       SET status = 'cancelling',
           error_code = 'job_queue_expired',
           lease_expires_at = NULL,
           run_stage = 'cancelling',
           updated_at = ?
       WHERE status = 'queued'
         AND created_at <= ?
         AND deleted_at IS NULL`,
    )
    .bind(now, queuedCutoff)
    .run();
  await database(env)
    .prepare(
      `UPDATE jobs
       SET status = 'cancelling',
           error_code = 'job_lease_expired',
           lease_expires_at = NULL,
           run_stage = 'cancelling',
           updated_at = ?
       WHERE status = 'running'
         AND (
           lease_expires_at <= ?
           OR (
             lease_expires_at IS NULL
             AND COALESCE(heartbeat_at, updated_at) <= ?
           )
         )
         AND deleted_at IS NULL`,
    )
    .bind(now, now, legacyRunningCutoff)
    .run();

  const result = await database(env)
    .prepare(
      `SELECT *
       FROM jobs
       WHERE (
         (
           status = 'completed'
           AND (
             input_key IS NOT NULL
             OR output_expires_at IS NULL
             OR output_expires_at <= ?
             OR checkpoint_key IS NOT NULL
           )
         )
         OR status = 'deleting'
         OR status = 'cancelling'
         OR (
           status IN ('failed', 'cancelled')
           AND (
             input_key IS NOT NULL
             OR result_key IS NOT NULL
             OR report_key IS NOT NULL
             OR checkpoint_key IS NOT NULL
           )
         )
       )
       ORDER BY updated_at ASC
       LIMIT ?`,
    )
    .bind(now, limit)
    .all<JobRow>();
  return result.results;
}

export async function listExpiredUploads(
  env: PilotEnv,
  limit = 50,
): Promise<UploadRow[]> {
  const now = nowSeconds();
  const result = await database(env)
    .prepare(
      `SELECT id, institution_id, owner_id, object_key, status, content_type,
              size_bytes, grant_expires_at, created_at, updated_at, uploaded_at,
              input_expires_at, deleted_at
       FROM uploads
       WHERE (
         status IN ('pending', 'uploading', 'uploaded', 'rejected', 'deleting')
         OR (
           status = 'processing'
           AND NOT EXISTS (
             SELECT 1
             FROM jobs
             WHERE jobs.upload_id = uploads.id
               AND jobs.deleted_at IS NULL
           )
         )
       )
         AND input_expires_at <= ?
       ORDER BY updated_at ASC
       LIMIT ?`,
    )
    .bind(now, limit)
    .all<UploadRow>();
  return result.results;
}

export async function markUploadDeleted(
  env: PilotEnv,
  uploadId: string,
): Promise<void> {
  const now = nowSeconds();
  await database(env)
    .prepare(
      `UPDATE uploads
       SET status = 'deleted',
           grant_hash = NULL,
           deleted_at = COALESCE(deleted_at, ?),
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(now, now, uploadId)
    .run();
}

export async function listDispatchPendingJobs(
  env: PilotEnv,
  limit = 25,
): Promise<JobRow[]> {
  const result = await database(env)
    .prepare(
      `SELECT *
       FROM jobs
       WHERE status = 'queued' AND deleted_at IS NULL
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .bind(limit)
    .all<JobRow>();
  return result.results;
}

export async function purgeOldMetadata(
  env: PilotEnv,
  config: PilotConfig,
): Promise<void> {
  const cutoff = nowSeconds() - config.metadataTtlSeconds;
  await database(env)
    .prepare(
      `DELETE FROM jobs
       WHERE checkpoint_key IS NULL
         AND (
           (deleted_at IS NOT NULL AND deleted_at <= ?)
           OR (
             status IN ('failed', 'cancelled')
             AND completed_at IS NOT NULL
             AND completed_at <= ?
           )
         )`,
    )
    .bind(cutoff, cutoff)
    .run();
  await database(env)
    .prepare(
      `DELETE FROM uploads
       WHERE deleted_at IS NOT NULL
         AND deleted_at <= ?
         AND NOT EXISTS (SELECT 1 FROM jobs WHERE jobs.upload_id = uploads.id)`,
    )
    .bind(cutoff)
    .run();
}
