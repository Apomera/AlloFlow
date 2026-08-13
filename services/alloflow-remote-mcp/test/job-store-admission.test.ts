import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import {
  claimJobAttempt,
  claimUploadGrant,
  completeJob,
  createJob,
  createUpload,
  failJob,
  failCurrentWorkflowAttempt,
  getInternalJob,
  listCleanupJobs,
  markJobRunning,
  markJobThrottleWait,
  rejectUpload,
  renewJobLease,
  type RemediationJobOptions,
  type RunnerResult,
} from "../src/job-store";
import type {
  PilotConfig,
  PilotEnv,
  PilotPrincipal,
} from "../src/pilot-env";
import {
  PilotError,
  nowSeconds,
  sha256Base64Url,
} from "../src/security";

type SqlValue = null | number | string | Uint8Array;

class SqliteD1Statement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly values: SqlValue[] = [],
  ) {}

  bind(...values: SqlValue[]): SqliteD1Statement {
    return new SqliteD1Statement(this.db, this.sql, values);
  }

  async run(): Promise<{ meta: { changes: number } }> {
    const result = this.db.prepare(this.sql).run(...this.values);
    return { meta: { changes: Number(result.changes) } };
  }

  async first<T>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...this.values) as T | undefined) ??
      null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    return {
      results: this.db.prepare(this.sql).all(...this.values) as T[],
    };
  }
}

class SqliteD1Database {
  constructor(readonly sqlite: DatabaseSync) {}

  prepare(sql: string): SqliteD1Statement {
    return new SqliteD1Statement(this.sqlite, sql);
  }

  async batch(
    statements: SqliteD1Statement[],
  ): Promise<Array<{ meta: { changes: number } }>> {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

const migrationDirectory = fileURLToPath(
  new URL("../migrations/", import.meta.url),
);
const databases: DatabaseSync[] = [];

const principal: PilotPrincipal = {
  institutionId: "district_opaque_01",
  ownerId: "owner_opaque_01",
  scopes: [
    "documents:upload",
    "documents:remediate",
    "documents:read",
    "documents:delete",
  ],
  upstreamSubject: "subject_opaque_01",
};

const standardOptions: RemediationJobOptions = {
  targetScore: 95,
  fixPasses: 2,
  effortProfile: "standard",
  ocrLanguage: "",
  polishPasses: 0,
  autoContinueRounds: 0,
};

function config(
  overrides: Partial<PilotConfig> = {},
): PilotConfig {
  return {
    origin: "https://mcp.district.example",
    institutionId: principal.institutionId,
    uploadMaxBytes: 25 * 1024 * 1024,
    uploadTtlSeconds: 600,
    unstartedInputTtlSeconds: 7200,
    outputTtlSeconds: 86400,
    downloadGraceSeconds: 3600,
    metadataTtlSeconds: 604800,
    remediationMaxRunMinutes: 25,
    maxOpenUploadsPerOwner: 20,
    maxUploadAttemptsPerOwner24h: 20,
    maxUploadAttemptsPerInstitution24h: 100,
    maxActiveJobsPerOwner: 2,
    maxActiveJobsPerInstitution: 2,
    maxJobsPerOwner24h: 20,
    maxJobsPerInstitution24h: 100,
    ...overrides,
  };
}

function testDatabase(): {
  env: PilotEnv;
  db: SqliteD1Database;
} {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(`${migrationDirectory}0001_institution_pilot.sql`, "utf8"),
  );
  sqlite.exec(
    readFileSync(
      `${migrationDirectory}0002_remediation_effort_and_admission.sql`,
      "utf8",
    ),
  );
  sqlite.exec(
    readFileSync(
      `${migrationDirectory}0003_upload_attempt_admission.sql`,
      "utf8",
    ),
  );
  sqlite.exec(
    readFileSync(
      `${migrationDirectory}0004_job_attempt_leases.sql`,
      "utf8",
    ),
  );
  sqlite.exec(
    readFileSync(
      `${migrationDirectory}0005_job_checkpoints.sql`,
      "utf8",
    ),
  );
  sqlite.exec(
    readFileSync(
      `${migrationDirectory}0006_throttle_wait_and_verification.sql`,
      "utf8",
    ),
  );
  sqlite.exec(
    readFileSync(
      `${migrationDirectory}0007_admission_control.sql`,
      "utf8",
    ),
  );
  databases.push(sqlite);
  const db = new SqliteD1Database(sqlite);
  return {
    env: {
      PILOT_DB: db as unknown as D1Database,
    },
    db,
  };
}

async function createUploadedInput(
  env: PilotEnv,
  db: SqliteD1Database,
  limits: PilotConfig,
): Promise<string> {
  const { upload } = await createUpload(env, limits, principal);
  db.sqlite
    .prepare(
      `UPDATE uploads
       SET status = 'uploaded', size_bytes = 128, uploaded_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(nowSeconds(), nowSeconds(), upload.id);
  return upload.id;
}

async function expectPilotError(
  operation: Promise<unknown>,
  code: string,
  status: number,
): Promise<void> {
  try {
    await operation;
    throw new Error("expected_pilot_error");
  } catch (error) {
    expect(error).toBeInstanceOf(PilotError);
    expect(error).toMatchObject({ code, status });
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close();
  }
});

describe("D1 workload admission and immutable remediation options", () => {
  it("migration 7 defaults open and atomically pauses new uploads and jobs", async () => {
    const { env, db } = testDatabase();
    const limits = config();
    const state = db.sqlite
      .prepare(
        `SELECT admissions_open, changed_by, change_reason, paused_at, pause_token
         FROM pilot_admission_control WHERE singleton = 1`,
      )
      .get();
    expect(state).toMatchObject({
      admissions_open: 1,
      changed_by: "migration-0007",
      change_reason: "default-open admission control",
      paused_at: null,
      pause_token: null,
    });

    const uploadId = await createUploadedInput(env, db, limits);
    db.sqlite
      .prepare(
        `UPDATE pilot_admission_control
         SET admissions_open = 0,
             changed_at = unixepoch(),
             changed_by = 'release-operator',
             change_reason = 'staging deploy',
             paused_at = unixepoch(),
             pause_token = '880e8400-e29b-41d4-a716-446655440000'
         WHERE singleton = 1`,
      )
      .run();

    await expectPilotError(
      createUpload(env, limits, principal),
      "admissions_paused",
      503,
    );
    await expectPilotError(
      createJob(env, limits, principal, uploadId, standardOptions),
      "admissions_paused",
      503,
    );

    db.sqlite
      .prepare(
        `UPDATE pilot_admission_control
         SET admissions_open = 1,
             changed_at = unixepoch(),
             changed_by = 'release-operator',
             change_reason = 'deploy complete',
             paused_at = NULL,
             pause_token = NULL
         WHERE singleton = 1`,
      )
      .run();
    await expect(createJob(
      env,
      limits,
      principal,
      uploadId,
      standardOptions,
    )).resolves.toMatchObject({ created: true });
  });

  it("atomically denies a fourth open upload at an owner cap of three", async () => {
    const { env } = testDatabase();
    const limits = config({ maxOpenUploadsPerOwner: 3 });

    await createUpload(env, limits, principal);
    await createUpload(env, limits, principal);
    await createUpload(env, limits, principal);

    await expectPilotError(
      createUpload(env, limits, principal),
      "upload_quota_exceeded",
      429,
    );
  });

  it("does not count an expired unusable pending grant as open", async () => {
    const { env, db } = testDatabase();
    const limits = config({ maxOpenUploadsPerOwner: 3 });

    const expired = await createUpload(env, limits, principal);
    await createUpload(env, limits, principal);
    await createUpload(env, limits, principal);
    db.sqlite
      .prepare(
        `UPDATE uploads
         SET grant_expires_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(nowSeconds() - 1, nowSeconds(), expired.upload.id);

    const replacement = await createUpload(env, limits, principal);
    expect(replacement.upload.status).toBe("pending");
  });

  it("counts rejected uploads against the rolling owner attempt cap", async () => {
    const { env, db } = testDatabase();
    const limits = config({
      maxOpenUploadsPerOwner: 3,
      maxUploadAttemptsPerOwner24h: 2,
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const created = await createUpload(env, limits, principal);
      db.sqlite
        .prepare(
          `UPDATE uploads
           SET status = 'rejected', updated_at = ?
           WHERE id = ?`,
        )
        .run(nowSeconds(), created.upload.id);
    }

    await expectPilotError(
      createUpload(env, limits, principal),
      "upload_quota_exceeded",
      429,
    );
  });

  it("counts upload attempts across owners at the institution cap", async () => {
    const { env, db } = testDatabase();
    const limits = config({
      maxUploadAttemptsPerOwner24h: 10,
      maxUploadAttemptsPerInstitution24h: 2,
    });
    const secondPrincipal: PilotPrincipal = {
      ...principal,
      ownerId: "owner_opaque_02",
      upstreamSubject: "subject_opaque_02",
    };

    for (const owner of [principal, secondPrincipal]) {
      const created = await createUpload(env, limits, owner);
      db.sqlite
        .prepare(
          `UPDATE uploads
           SET status = 'rejected', updated_at = ?
           WHERE id = ?`,
        )
        .run(nowSeconds(), created.upload.id);
    }

    await expectPilotError(
      createUpload(env, limits, principal),
      "upload_quota_exceeded",
      429,
    );
  });

  it("never reopens a claimed upload grant after a failed attempt", async () => {
    const { env } = testDatabase();
    const limits = config();
    const created = await createUpload(env, limits, principal);
    const grantHash = await sha256Base64Url(created.grant);

    await expect(
      claimUploadGrant(env, created.upload.id, grantHash),
    ).resolves.toMatchObject({ status: "uploading" });
    await rejectUpload(env, created.upload.id);

    await expectPilotError(
      claimUploadGrant(env, created.upload.id, grantHash),
      "invalid_or_expired_upload_grant",
      401,
    );
  });

  it("replays at the active cap but rejects changed immutable options", async () => {
    const { env, db } = testDatabase();
    const limits = config({ maxActiveJobsPerOwner: 1 });
    const uploadId = await createUploadedInput(env, db, limits);

    const first = await createJob(
      env,
      limits,
      principal,
      uploadId,
      standardOptions,
    );
    expect(first.created).toBe(true);

    const replay = await createJob(
      env,
      limits,
      principal,
      uploadId,
      standardOptions,
    );
    expect(replay).toMatchObject({
      created: false,
      job: { id: first.job.id },
    });

    await expectPilotError(
      createJob(env, limits, principal, uploadId, {
        ...standardOptions,
        targetScore: 96,
      }),
      "job_options_conflict",
      409,
    );
  });

  it("allows a new job after a terminal job frees the active slot", async () => {
    const { env, db } = testDatabase();
    const limits = config({ maxActiveJobsPerOwner: 1 });
    const firstUpload = await createUploadedInput(env, db, limits);
    const secondUpload = await createUploadedInput(env, db, limits);
    const first = await createJob(
      env,
      limits,
      principal,
      firstUpload,
      standardOptions,
    );

    await expectPilotError(
      createJob(env, limits, principal, secondUpload, standardOptions),
      "remediation_quota_exceeded",
      429,
    );

    db.sqlite
      .prepare(
        "UPDATE jobs SET status = 'completed', completed_at = ? WHERE id = ?",
      )
      .run(nowSeconds(), first.job.id);

    await expect(
      createJob(env, limits, principal, secondUpload, standardOptions),
    ).resolves.toMatchObject({ created: true });
  });

  it("counts deleted jobs against the rolling 24-hour cap", async () => {
    const { env, db } = testDatabase();
    const limits = config({
      maxActiveJobsPerOwner: 1,
      maxJobsPerOwner24h: 1,
    });
    const firstUpload = await createUploadedInput(env, db, limits);
    const secondUpload = await createUploadedInput(env, db, limits);
    const first = await createJob(
      env,
      limits,
      principal,
      firstUpload,
      standardOptions,
    );

    db.sqlite
      .prepare(
        `UPDATE jobs
         SET status = 'deleted', deleted_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(nowSeconds(), nowSeconds(), first.job.id);

    await expectPilotError(
      createJob(env, limits, principal, secondUpload, standardOptions),
      "remediation_quota_exceeded",
      429,
    );
  });
});

describe("D1 remediation attempt leases and fencing", () => {
  it("lets only a monotonically newer Workflow retry own the job", async () => {
    const { env, db } = testDatabase();
    const limits = config();
    const uploadId = await createUploadedInput(env, db, limits);
    const created = await createJob(
      env,
      limits,
      principal,
      uploadId,
      standardOptions,
    );
    const jobId = created.job.id;
    const workflowId = created.job.workflow_id;
    const firstAttempt = `${jobId}:run-1:attempt-1`;
    const secondAttempt = `${jobId}:run-1:attempt-2`;

    await markJobRunning(env, jobId, workflowId);
    const first = await claimJobAttempt(
      env,
      jobId,
      workflowId,
      firstAttempt,
      1,
    );
    expect(first.job).toMatchObject({
      attempt_id: firstAttempt,
      attempt_number: 1,
      run_stage: "starting",
    });
    expect(first.job.result_key).toContain("/attempt-1/tagged.pdf");

    const second = await claimJobAttempt(
      env,
      jobId,
      workflowId,
      secondAttempt,
      2,
    );
    expect(second.job).toMatchObject({
      attempt_id: secondAttempt,
      attempt_number: 2,
    });
    expect(second.supersededArtifactKeys).toContain(
      first.job.result_key,
    );

    await expectPilotError(
      renewJobLease(env, jobId, firstAttempt, "running"),
      "job_attempt_lost",
      409,
    );
    await expectPilotError(
      claimJobAttempt(
        env,
        jobId,
        workflowId,
        firstAttempt,
        1,
      ),
      "job_attempt_lost",
      409,
    );
    await expect(
      failJob(env, jobId, firstAttempt, "stale_attempt_failed"),
    ).resolves.toBe(false);

    await renewJobLease(env, jobId, secondAttempt, "validating");
    const owned = await getInternalJob(env, jobId);
    expect(owned).toMatchObject({
      status: "running",
      attempt_id: secondAttempt,
      run_stage: "validating",
    });
    expect(owned.lease_expires_at).toBeGreaterThan(nowSeconds() + 290);
  });

  it("keeps completion idempotent and never downgrades it to failed", async () => {
    const { env, db } = testDatabase();
    const limits = config();
    const uploadId = await createUploadedInput(env, db, limits);
    const created = await createJob(
      env,
      limits,
      principal,
      uploadId,
      standardOptions,
    );
    const jobId = created.job.id;
    const attemptId = `${jobId}:run-1:attempt-1`;
    const result: RunnerResult = {
      resultSizeBytes: 128,
      resultSha256: "a".repeat(64),
      autoContinueRoundsRun: 0,
      reportSizeBytes: 64,
      reportSha256: "b".repeat(64),
      verificationState: "complete",
      beforeScore: 70,
      afterScore: 98,
    };

    await markJobRunning(env, jobId, created.job.workflow_id);
    await claimJobAttempt(
      env,
      jobId,
      created.job.workflow_id,
      attemptId,
      1,
    );
    await completeJob(env, limits, jobId, attemptId, result);
    await expect(
      completeJob(env, limits, jobId, attemptId, result),
    ).resolves.toBeUndefined();
    await expect(
      failJob(env, jobId, attemptId, "late_attempt_failure"),
    ).resolves.toBe(false);

    expect(await getInternalJob(env, jobId)).toMatchObject({
      status: "completed",
      attempt_id: attemptId,
      result_sha256: result.resultSha256,
      verification_state: "complete",
      run_stage: "completed",
      lease_expires_at: null,
    });
  });

  it("extends a throttled attempt lease beyond provider backoff and fences stale owners", async () => {
    const { env, db } = testDatabase();
    const limits = config();
    const uploadId = await createUploadedInput(env, db, limits);
    const created = await createJob(
      env,
      limits,
      principal,
      uploadId,
      standardOptions,
    );
    const jobId = created.job.id;
    const firstAttempt = `${jobId}:run-1:attempt-1`;
    const secondAttempt = `${jobId}:run-1:attempt-2`;
    await markJobRunning(env, jobId, created.job.workflow_id);
    await claimJobAttempt(
      env,
      jobId,
      created.job.workflow_id,
      firstAttempt,
      1,
    );

    const wait = await markJobThrottleWait(
      env,
      jobId,
      firstAttempt,
      10 * 60 * 1000,
    );
    expect(wait.leaseExpiresAt).toBeGreaterThanOrEqual(
      wait.waitUntil + 2 * 60,
    );
    expect(await getInternalJob(env, jobId)).toMatchObject({
      throttle_wait_until: wait.waitUntil,
      lease_expires_at: wait.leaseExpiresAt,
    });

    await claimJobAttempt(
      env,
      jobId,
      created.job.workflow_id,
      secondAttempt,
      2,
    );
    await expectPilotError(
      markJobThrottleWait(env, jobId, firstAttempt, 15_000),
      "job_attempt_lost",
      409,
    );
    expect(await getInternalJob(env, jobId)).toMatchObject({
      attempt_id: secondAttempt,
      throttle_wait_until: null,
    });
  });

  it("resolves terminal ownership durably and never fails another workflow", async () => {
    const { env, db } = testDatabase();
    const limits = config();
    const uploadId = await createUploadedInput(env, db, limits);
    const created = await createJob(
      env,
      limits,
      principal,
      uploadId,
      standardOptions,
    );
    const attemptId = `${created.job.id}:run-1:attempt-1`;
    await markJobRunning(env, created.job.id, created.job.workflow_id);
    await claimJobAttempt(
      env,
      created.job.id,
      created.job.workflow_id,
      attemptId,
      1,
    );

    await expect(
      failCurrentWorkflowAttempt(
        env,
        created.job.id,
        "different-workflow",
        "late_failure",
      ),
    ).resolves.toEqual({ owned: false, attemptId: null });
    await expect(
      failCurrentWorkflowAttempt(
        env,
        created.job.id,
        created.job.workflow_id,
        "runner_failed",
      ),
    ).resolves.toEqual({ owned: true, attemptId });
    expect(await getInternalJob(env, created.job.id)).toMatchObject({
      status: "failed",
      attempt_id: attemptId,
      error_code: "runner_failed",
    });
  });

  it("expires queued age separately from a running idle lease", async () => {
    const { env, db } = testDatabase();
    const limits = config({
      unstartedInputTtlSeconds: 10 * 60,
      maxActiveJobsPerOwner: 2,
      maxActiveJobsPerInstitution: 2,
    });
    const runningUpload = await createUploadedInput(env, db, limits);
    const queuedUpload = await createUploadedInput(env, db, limits);
    const running = await createJob(
      env,
      limits,
      principal,
      runningUpload,
      standardOptions,
    );
    const queued = await createJob(
      env,
      limits,
      principal,
      queuedUpload,
      standardOptions,
    );
    const attemptId = `${running.job.id}:run-1:attempt-1`;
    await markJobRunning(
      env,
      running.job.id,
      running.job.workflow_id,
    );
    await claimJobAttempt(
      env,
      running.job.id,
      running.job.workflow_id,
      attemptId,
      1,
    );

    const now = nowSeconds();
    db.sqlite
      .prepare(
        `UPDATE jobs
         SET started_at = ?, updated_at = ?, heartbeat_at = ?,
             lease_expires_at = ?
         WHERE id = ?`,
      )
      .run(now - 7200, now - 7200, now - 7200, now + 120, running.job.id);
    db.sqlite
      .prepare(
        "UPDATE jobs SET created_at = ?, updated_at = ? WHERE id = ?",
      )
      .run(now - 601, now, queued.job.id);

    await listCleanupJobs(env, limits);
    expect(await getInternalJob(env, running.job.id)).toMatchObject({
      status: "running",
      attempt_id: attemptId,
    });
    expect(await getInternalJob(env, queued.job.id)).toMatchObject({
      status: "cancelling",
      error_code: "job_queue_expired",
    });

    db.sqlite
      .prepare(
        "UPDATE jobs SET lease_expires_at = ? WHERE id = ?",
      )
      .run(now - 1, running.job.id);
    await listCleanupJobs(env, limits);
    expect(await getInternalJob(env, running.job.id)).toMatchObject({
      status: "cancelling",
      error_code: "job_lease_expired",
      run_stage: "cancelling",
    });
  });
});
