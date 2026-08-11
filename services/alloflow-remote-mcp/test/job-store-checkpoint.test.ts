import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import {
  claimJobAttempt,
  clearJobCheckpoint,
  commitJobCheckpoint,
  getInternalJob,
  getJobCheckpoint,
  jobCheckpointKey,
  jobCheckpointPrefix,
  markJobRunning,
  type JobCheckpointCommit,
  type JobRow,
} from "../src/job-store";
import type { PilotEnv } from "../src/pilot-env";
import { PilotError, nowSeconds } from "../src/security";

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
const institutionId = "district_opaque_01";
const jobId = `job_${"1".repeat(32)}`;
const uploadId = `upl_${"2".repeat(32)}`;
const workflowId = jobId;
const firstAttempt = `${jobId}:run-1:attempt-1`;
const secondAttempt = `${jobId}:run-1:attempt-2`;

function testDatabase(): {
  env: PilotEnv;
  db: SqliteD1Database;
} {
  const sqlite = new DatabaseSync(":memory:");
  for (const migration of [
    "0001_institution_pilot.sql",
    "0002_remediation_effort_and_admission.sql",
    "0003_upload_attempt_admission.sql",
    "0004_job_attempt_leases.sql",
    "0005_job_checkpoints.sql",
  ]) {
    sqlite.exec(readFileSync(`${migrationDirectory}${migration}`, "utf8"));
  }
  databases.push(sqlite);
  const db = new SqliteD1Database(sqlite);
  return {
    env: { PILOT_DB: db as unknown as D1Database },
    db,
  };
}

function seedQueuedJob(db: SqliteD1Database): void {
  const now = nowSeconds();
  db.sqlite
    .prepare(
      `INSERT INTO uploads (
        id, institution_id, owner_id, object_key, status, content_type,
        created_at, updated_at, input_expires_at
      ) VALUES (?, ?, 'owner_opaque_01', ?, 'processing',
                'application/pdf', ?, ?, ?)`,
    )
    .run(
      uploadId,
      institutionId,
      `tenant/${institutionId}/input/${uploadId}.pdf`,
      now,
      now,
      now + 3600,
    );
  db.sqlite
    .prepare(
      `INSERT INTO jobs (
        id, upload_id, institution_id, owner_id, workflow_id, status,
        input_key, target_score, fix_passes, created_at, updated_at
      ) VALUES (?, ?, ?, 'owner_opaque_01', ?, 'queued', ?, 95, 2, ?, ?)`,
    )
    .run(
      jobId,
      uploadId,
      institutionId,
      workflowId,
      `tenant/${institutionId}/input/${uploadId}.pdf`,
      now,
      now,
    );
}

async function claimAttempt(
  env: PilotEnv,
  db: SqliteD1Database,
  attemptId = firstAttempt,
  attemptNumber = 1,
): Promise<JobRow> {
  if (attemptNumber === 1) {
    seedQueuedJob(db);
    await markJobRunning(env, jobId, workflowId);
  }
  return (
    await claimJobAttempt(
      env,
      jobId,
      workflowId,
      attemptId,
      attemptNumber,
    )
  ).job;
}

function checkpoint(
  job: JobRow,
  seq: number,
  sha256 = "a".repeat(64),
): JobCheckpointCommit {
  return {
    seq,
    key: jobCheckpointKey(job, seq, sha256),
    sha256,
    sizeBytes: 512 + seq,
    stage: seq === 1 ? "extracted" : "accepted_round",
    schema: "alloflow-remediation-checkpoint/v1",
    inputSha256: "b".repeat(64),
    optionsSha256: "c".repeat(64),
    engineSha256: "d".repeat(64),
  };
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

describe("D1 remediation checkpoint pointers", () => {
  it("commits complete immutable pointers monotonically and idempotently", async () => {
    const { env, db } = testDatabase();
    const job = await claimAttempt(env, db);
    const first = checkpoint(job, 1);

    expect(jobCheckpointPrefix(job)).toBe(
      `tenant/${institutionId}/checkpoint/${jobId}/`,
    );
    await expect(getJobCheckpoint(env, jobId)).resolves.toBeNull();

    const committed = await commitJobCheckpoint(
      env,
      jobId,
      firstAttempt,
      first,
    );
    expect(committed).toMatchObject({
      checkpoint: first,
      supersededCheckpoint: null,
    });
    expect(committed.checkpoint.createdAt).toBeGreaterThan(0);
    await expect(getJobCheckpoint(env, jobId)).resolves.toEqual(
      committed.checkpoint,
    );

    await expect(
      commitJobCheckpoint(env, jobId, firstAttempt, first),
    ).resolves.toEqual({
      checkpoint: committed.checkpoint,
      supersededCheckpoint: null,
    });

    const second = checkpoint(job, 2, "e".repeat(64));
    const advanced = await commitJobCheckpoint(
      env,
      jobId,
      firstAttempt,
      second,
    );
    expect(advanced.supersededCheckpoint).toEqual(committed.checkpoint);
    expect(advanced.checkpoint).toMatchObject(second);
    expect((await getInternalJob(env, jobId)).lease_expires_at).toBeGreaterThan(
      nowSeconds() + 290,
    );
  });

  it("retains the last-good pointer across retries and fences stale attempts", async () => {
    const { env, db } = testDatabase();
    const firstJob = await claimAttempt(env, db);
    const first = checkpoint(firstJob, 1);
    const committed = await commitJobCheckpoint(
      env,
      jobId,
      firstAttempt,
      first,
    );

    const secondJob = await claimAttempt(env, db, secondAttempt, 2);
    await expect(getJobCheckpoint(env, jobId)).resolves.toEqual(
      committed.checkpoint,
    );
    const second = checkpoint(secondJob, 2, "e".repeat(64));

    await expectPilotError(
      commitJobCheckpoint(env, jobId, firstAttempt, second),
      "job_attempt_lost",
      409,
    );
    await expectPilotError(
      clearJobCheckpoint(env, jobId, firstAttempt),
      "job_attempt_lost",
      409,
    );
    await expect(
      commitJobCheckpoint(env, jobId, secondAttempt, second),
    ).resolves.toMatchObject({
      supersededCheckpoint: committed.checkpoint,
    });
  });

  it("rejects key mismatches, same-sequence conflicts, and regressions", async () => {
    const { env, db } = testDatabase();
    const job = await claimAttempt(env, db);
    const first = checkpoint(job, 1);
    const wrongKey = {
      ...first,
      key: jobCheckpointKey(job, 2, first.sha256),
    };

    await expectPilotError(
      commitJobCheckpoint(env, jobId, firstAttempt, wrongKey),
      "invalid_job_checkpoint",
      500,
    );
    await commitJobCheckpoint(env, jobId, firstAttempt, first);
    await expectPilotError(
      commitJobCheckpoint(env, jobId, firstAttempt, {
        ...first,
        sizeBytes: first.sizeBytes + 1,
      }),
      "job_checkpoint_conflict",
      409,
    );
    await commitJobCheckpoint(
      env,
      jobId,
      firstAttempt,
      checkpoint(job, 2, "e".repeat(64)),
    );
    await expectPilotError(
      commitJobCheckpoint(env, jobId, firstAttempt, first),
      "job_checkpoint_conflict",
      409,
    );
  });

  it("never clears a newer pointer than the caller observed", async () => {
    const { env, db } = testDatabase();
    const job = await claimAttempt(env, db);
    const first = await commitJobCheckpoint(
      env,
      jobId,
      firstAttempt,
      checkpoint(job, 1),
    );
    const second = await commitJobCheckpoint(
      env,
      jobId,
      firstAttempt,
      checkpoint(job, 2, "e".repeat(64)),
    );

    await expect(
      clearJobCheckpoint(
        env,
        jobId,
        firstAttempt,
        first.checkpoint,
      ),
    ).resolves.toBeNull();
    await expect(getJobCheckpoint(env, jobId)).resolves.toEqual(
      second.checkpoint,
    );
    await expect(
      clearJobCheckpoint(
        env,
        jobId,
        firstAttempt,
        second.checkpoint,
      ),
    ).resolves.toEqual(second.checkpoint);
  });

  it("enforces complete tuples and supports fenced terminal cleanup", async () => {
    const { env, db } = testDatabase();
    const job = await claimAttempt(env, db);

    expect(() => {
      db.sqlite
        .prepare("UPDATE jobs SET checkpoint_seq = 1 WHERE id = ?")
        .run(jobId);
    }).toThrow();

    const committed = await commitJobCheckpoint(
      env,
      jobId,
      firstAttempt,
      checkpoint(job, 1),
    );
    db.sqlite
      .prepare(
        `UPDATE jobs
         SET status = 'completed', lease_expires_at = NULL,
             run_stage = 'completed'
         WHERE id = ?`,
      )
      .run(jobId);

    await expect(
      clearJobCheckpoint(env, jobId, firstAttempt),
    ).resolves.toEqual(committed.checkpoint);
    await expect(getJobCheckpoint(env, jobId)).resolves.toBeNull();
    await expect(
      clearJobCheckpoint(env, jobId, firstAttempt),
    ).resolves.toBeNull();
  });
});
