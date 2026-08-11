import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";

import {
  beginCancel,
  claimJobAttempt,
  clearJobCheckpoint,
  commitJobCheckpoint,
  getJobCheckpoint,
  jobCheckpointKey,
  markJobRunning,
  type JobCheckpoint,
  type JobRow,
} from "../src/job-store";
import type {
  PilotEnv,
  PilotPrincipal,
} from "../src/pilot-env";
import {
  PilotError,
  nowSeconds,
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

type StoredCheckpointObject = {
  body: Buffer;
  sha256: string;
};

class FaultBucket {
  readonly objects = new Map<string, StoredCheckpointObject>();

  putImmutable(key: string, body: Buffer): void {
    const sha256 = digest(body);
    const existing = this.objects.get(key);
    if (existing && !existing.body.equals(body)) {
      throw new Error("immutable_object_conflict");
    }
    this.objects.set(key, { body: Buffer.from(body), sha256 });
  }

  corrupt(key: string): void {
    const current = this.objects.get(key);
    if (!current) {
      throw new Error("checkpoint_not_found");
    }
    const corrupt = Buffer.from(current.body);
    corrupt[Math.max(0, corrupt.length - 1)] ^= 0xff;
    this.objects.set(key, {
      body: corrupt,
      sha256: digest(corrupt),
    });
  }
}

type Fixture = {
  env: PilotEnv;
  db: SqliteD1Database;
  bucket: FaultBucket;
  job: JobRow;
  jobId: string;
  workflowId: string;
  attemptId: string;
};

type CheckpointEnvelope = {
  schema: 1;
  sequence: number;
  stage: "primary" | "round";
  inputSha256: string;
  optionsSha256: string;
  engineSha256: string;
  snapshot: {
    schema: 1;
    stage: "primary" | "round";
    nextRound: number;
    roundsRun: number;
    remediation: { html: string };
  };
};

const migrationDirectory = fileURLToPath(
  new URL("../migrations/", import.meta.url),
);
const databases: DatabaseSync[] = [];
const institutionId = "district_opaque_01";
const ownerId = "owner_opaque_01";
const inputSha256 = "1".repeat(64);
const optionsSha256 = "2".repeat(64);
const engineSha256 = "3".repeat(64);
const checkpointSchema = "alloflow-remediation-checkpoint/v1";

const principal: PilotPrincipal = {
  institutionId,
  ownerId,
  scopes: [
    "documents:upload",
    "documents:remediate",
    "documents:read",
    "documents:delete",
  ],
  upstreamSubject: "subject_opaque_01",
};

function digest(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function envelope(
  sequence: number,
  roundsRun: number,
): CheckpointEnvelope {
  return {
    schema: 1,
    sequence,
    stage: roundsRun === 0 ? "primary" : "round",
    inputSha256,
    optionsSha256,
    engineSha256,
    snapshot: {
      schema: 1,
      stage: roundsRun === 0 ? "primary" : "round",
      nextRound: roundsRun,
      roundsRun,
      remediation: {
        html: `<main data-rounds="${roundsRun}">accepted</main>`,
      },
    },
  };
}

function checkpointArtifact(
  job: JobRow,
  sequence: number,
  roundsRun: number,
): {
  body: Buffer;
  commit: Parameters<typeof commitJobCheckpoint>[3];
} {
  const body = gzipSync(
    Buffer.from(JSON.stringify(envelope(sequence, roundsRun)), "utf8"),
  );
  const sha256 = digest(body);
  return {
    body,
    commit: {
      seq: sequence,
      key: jobCheckpointKey(job, sequence, sha256),
      sha256,
      sizeBytes: body.length,
      stage: "accepted_round",
      schema: checkpointSchema,
      inputSha256,
      optionsSha256,
      engineSha256,
    },
  };
}

function readEnvelope(
  bucket: FaultBucket,
  checkpoint: JobCheckpoint,
): CheckpointEnvelope | null {
  const object = bucket.objects.get(checkpoint.key);
  if (
    !object ||
    object.body.length !== checkpoint.sizeBytes ||
    digest(object.body) !== checkpoint.sha256
  ) {
    return null;
  }
  try {
    return JSON.parse(
      gunzipSync(object.body).toString("utf8"),
    ) as CheckpointEnvelope;
  } catch {
    return null;
  }
}

function testDatabase(): SqliteD1Database {
  const sqlite = new DatabaseSync(":memory:");
  for (let version = 1; version <= 5; version += 1) {
    const filename = `${String(version).padStart(4, "0")}${[
      "_institution_pilot.sql",
      "_remediation_effort_and_admission.sql",
      "_upload_attempt_admission.sql",
      "_job_attempt_leases.sql",
      "_job_checkpoints.sql",
    ][version - 1]}`;
    sqlite.exec(readFileSync(`${migrationDirectory}${filename}`, "utf8"));
  }
  databases.push(sqlite);
  return new SqliteD1Database(sqlite);
}

async function fixture(): Promise<Fixture> {
  const db = testDatabase();
  const env: PilotEnv = {
    PILOT_DB: db as unknown as D1Database,
  };
  const now = nowSeconds();
  const uploadId = "upl_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const jobId = "job_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const workflowId = "workflow_checkpoint_faults_01";
  const attemptId = `${jobId}:run-1:attempt-1`;
  db.sqlite
    .prepare(
      `INSERT INTO uploads (
         id, institution_id, owner_id, object_key, status,
         content_type, size_bytes, created_at, updated_at,
         uploaded_at, input_expires_at
       ) VALUES (?, ?, ?, ?, 'processing', 'application/pdf', 128, ?, ?, ?, ?)`,
    )
    .run(
      uploadId,
      institutionId,
      ownerId,
      `tenant/${institutionId}/input/${uploadId}.pdf`,
      now,
      now,
      now,
      now + 3600,
    );
  db.sqlite
    .prepare(
      `INSERT INTO jobs (
         id, upload_id, institution_id, owner_id, workflow_id,
         status, input_key, target_score, fix_passes,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 'queued', ?, 95, 2, ?, ?)`,
    )
    .run(
      jobId,
      uploadId,
      institutionId,
      ownerId,
      workflowId,
      `tenant/${institutionId}/input/${uploadId}.pdf`,
      now,
      now,
    );

  await markJobRunning(env, jobId, workflowId);
  const claimed = await claimJobAttempt(
    env,
    jobId,
    workflowId,
    attemptId,
    1,
  );
  return {
    env,
    db,
    bucket: new FaultBucket(),
    job: claimed.job,
    jobId,
    workflowId,
    attemptId,
  };
}

async function expectPilotError(
  operation: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await operation;
    throw new Error("expected_pilot_error");
  } catch (error) {
    expect(error).toBeInstanceOf(PilotError);
    expect(error).toMatchObject({ code, status: 409 });
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close();
  }
});

describe("durable checkpoint commit fault injection", () => {
  it("leaves the prior pointer authoritative after a crash between R2 upload and D1 commit", async () => {
    const { env, bucket, job, jobId, attemptId } = await fixture();
    const first = checkpointArtifact(job, 1, 0);
    bucket.putImmutable(first.commit.key, first.body);
    await commitJobCheckpoint(env, jobId, attemptId, first.commit);

    const second = checkpointArtifact(job, 2, 1);
    bucket.putImmutable(second.commit.key, second.body);
    // Inject the crash before commitJobCheckpoint. The second immutable object
    // may be orphaned, but it must not become resumable state.

    const committed = await getJobCheckpoint(env, jobId);
    expect(committed).toMatchObject(first.commit);
    expect(readEnvelope(bucket, committed as JobCheckpoint)).toMatchObject({
      sequence: 1,
      snapshot: { nextRound: 0, roundsRun: 0 },
    });
    expect(bucket.objects.has(second.commit.key)).toBe(true);
  });

  it("resumes the next accepted round after a crash immediately after the pointer commit", async () => {
    const { env, bucket, job, jobId, workflowId, attemptId } = await fixture();
    const accepted = checkpointArtifact(job, 2, 1);
    bucket.putImmutable(accepted.commit.key, accepted.body);
    await commitJobCheckpoint(env, jobId, attemptId, accepted.commit);
    // Inject a process crash here, after D1 accepted the pointer but before the
    // caller can observe success. A newer Workflow attempt must retain it.

    const retryAttemptId = `${jobId}:run-1:attempt-2`;
    await claimJobAttempt(
      env,
      jobId,
      workflowId,
      retryAttemptId,
      2,
    );
    const committed = await getJobCheckpoint(env, jobId);
    const resumed = readEnvelope(bucket, committed as JobCheckpoint);

    expect(committed).toMatchObject(accepted.commit);
    expect(resumed).toMatchObject({
      sequence: 2,
      stage: "round",
      snapshot: {
        nextRound: 1,
        roundsRun: 1,
        remediation: {
          html: '<main data-rounds="1">accepted</main>',
        },
      },
    });
  });

  it("rejects a stale attempt pointer advance while preserving its orphan for safe cleanup", async () => {
    const { env, bucket, job, jobId, workflowId, attemptId } = await fixture();
    const first = checkpointArtifact(job, 1, 0);
    bucket.putImmutable(first.commit.key, first.body);
    await commitJobCheckpoint(env, jobId, attemptId, first.commit);

    const staleUpload = checkpointArtifact(job, 2, 1);
    bucket.putImmutable(staleUpload.commit.key, staleUpload.body);
    const retryAttemptId = `${jobId}:run-1:attempt-2`;
    await claimJobAttempt(
      env,
      jobId,
      workflowId,
      retryAttemptId,
      2,
    );

    await expectPilotError(
      commitJobCheckpoint(
        env,
        jobId,
        attemptId,
        staleUpload.commit,
      ),
      "job_attempt_lost",
    );
    expect(await getJobCheckpoint(env, jobId)).toMatchObject(first.commit);
    expect(bucket.objects.has(staleUpload.commit.key)).toBe(true);

    await commitJobCheckpoint(
      env,
      jobId,
      retryAttemptId,
      staleUpload.commit,
    );
    expect(await getJobCheckpoint(env, jobId)).toMatchObject(
      staleUpload.commit,
    );
  });

  it("detects corrupt checkpoint bytes without treating them as resumable state", async () => {
    const { env, bucket, job, jobId, attemptId } = await fixture();
    const checkpoint = checkpointArtifact(job, 1, 0);
    bucket.putImmutable(checkpoint.commit.key, checkpoint.body);
    await commitJobCheckpoint(
      env,
      jobId,
      attemptId,
      checkpoint.commit,
    );
    const committed = await getJobCheckpoint(env, jobId);

    bucket.corrupt(checkpoint.commit.key);
    expect(readEnvelope(bucket, committed as JobCheckpoint)).toBeNull();
    expect(await getJobCheckpoint(env, jobId)).toMatchObject(
      checkpoint.commit,
    );
  });

  it("blocks late commits during cancellation and clears only the committed pointer", async () => {
    const { env, bucket, job, jobId, attemptId } = await fixture();
    const first = checkpointArtifact(job, 1, 0);
    bucket.putImmutable(first.commit.key, first.body);
    await commitJobCheckpoint(env, jobId, attemptId, first.commit);

    const late = checkpointArtifact(job, 2, 1);
    bucket.putImmutable(late.commit.key, late.body);
    await beginCancel(env, jobId, principal);
    await expectPilotError(
      commitJobCheckpoint(env, jobId, attemptId, late.commit),
      "job_attempt_lost",
    );

    const cleared = await clearJobCheckpoint(env, jobId, attemptId);
    expect(cleared).toMatchObject(first.commit);
    expect(await getJobCheckpoint(env, jobId)).toBeNull();
    expect(cleared?.key).toBe(first.commit.key);
    expect(cleared?.key).not.toBe(late.commit.key);
  });

  it("does not let a stale attempt clear the winning checkpoint", async () => {
    const { env, bucket, job, jobId, workflowId, attemptId } = await fixture();
    const first = checkpointArtifact(job, 1, 0);
    bucket.putImmutable(first.commit.key, first.body);
    await commitJobCheckpoint(env, jobId, attemptId, first.commit);

    const retryAttemptId = `${jobId}:run-1:attempt-2`;
    await claimJobAttempt(
      env,
      jobId,
      workflowId,
      retryAttemptId,
      2,
    );
    await expectPilotError(
      clearJobCheckpoint(env, jobId, attemptId),
      "job_attempt_lost",
    );
    expect(await getJobCheckpoint(env, jobId)).toMatchObject(first.commit);

    const cleared = await clearJobCheckpoint(
      env,
      jobId,
      retryAttemptId,
    );
    expect(cleared).toMatchObject(first.commit);
    expect(await getJobCheckpoint(env, jobId)).toBeNull();
  });
});
