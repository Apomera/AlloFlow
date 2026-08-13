import { describe, expect, it, vi } from "vitest";

import {
  ADMISSION_CONTROL_SENTINEL_SQL,
  DATABASE_SCHEMA_SENTINEL_SQL,
  checkDatabaseReleaseReadiness,
} from "../src/database-release";

function databaseWithAll(
  result: unknown,
  admission: unknown = {
    admissions_open: 1,
    changed_at: 1,
    changed_by: "migration-0007",
    change_reason: "default-open admission control",
    paused_at: null,
    pause_token: null,
  },
): D1Database {
  return {
    prepare: vi.fn((sql: string) =>
      sql === DATABASE_SCHEMA_SENTINEL_SQL
        ? { all: vi.fn(async () => result) }
        : { first: vi.fn(async () => admission) },
    ),
  } as unknown as D1Database;
}

describe("database release readiness", () => {
  it("probes lease, checkpoint, verification, and admission columns before reporting schema 7", async () => {
    for (const column of [
      "attempt_id",
      "lease_expires_at",
      "throttle_wait_until",
      "verification_state",
      "checkpoint_key",
      "checkpoint_engine_sha256",
      "checkpoint_created_at",
      "admission.admissions_open",
      "admission.changed_by",
      "admission.paused_at",
      "admission.pause_token",
    ]) {
      expect(DATABASE_SCHEMA_SENTINEL_SQL).toContain(column);
    }
    const database = databaseWithAll({ results: [] });
    await expect(checkDatabaseReleaseReadiness(database)).resolves.toEqual({
      ok: true,
      schema: 7,
      admissionsOpen: true,
      issues: [],
    });
    expect(database.prepare).toHaveBeenCalledWith(DATABASE_SCHEMA_SENTINEL_SQL);
  });

  it("fails closed when the binding is absent or any sentinel column is missing", async () => {
    await expect(checkDatabaseReleaseReadiness(undefined)).resolves.toEqual({
      ok: false,
      schema: null,
      admissionsOpen: null,
      issues: ["database_not_configured"],
    });
    const database = databaseWithAll(Promise.reject(new Error("no such column")));
    await expect(checkDatabaseReleaseReadiness(database)).resolves.toEqual({
      ok: false,
      schema: null,
      admissionsOpen: null,
      issues: ["database_schema_incompatible"],
    });
  });

  it("requires the singleton admission row while accepting an intentional pause", async () => {
    await expect(
      checkDatabaseReleaseReadiness(databaseWithAll({ results: [] }, null)),
    ).resolves.toEqual({
      ok: false,
      schema: null,
      admissionsOpen: null,
      issues: ["database_schema_incompatible"],
    });
    const paused = databaseWithAll({ results: [] }, {
      admissions_open: 0,
      changed_at: 2,
      changed_by: "release-operator",
      change_reason: "deploy drain",
      paused_at: 2,
      pause_token: "880e8400-e29b-41d4-a716-446655440000",
    });
    await expect(checkDatabaseReleaseReadiness(paused)).resolves.toEqual({
      ok: true,
      schema: 7,
      admissionsOpen: false,
      issues: [],
    });
    expect(paused.prepare).toHaveBeenCalledWith(ADMISSION_CONTROL_SENTINEL_SQL);
  });
});
