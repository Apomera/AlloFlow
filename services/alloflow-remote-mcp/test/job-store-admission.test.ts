import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import {
  claimUploadGrant,
  createJob,
  createUpload,
  rejectUpload,
  type RemediationJobOptions,
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
