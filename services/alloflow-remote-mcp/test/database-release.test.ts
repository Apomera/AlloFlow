import { describe, expect, it, vi } from "vitest";

import {
  DATABASE_SCHEMA_SENTINEL_SQL,
  checkDatabaseReleaseReadiness,
} from "../src/database-release";

function databaseWithAll(result: unknown): D1Database {
  return {
    prepare: vi.fn(() => ({
      all: vi.fn(async () => result),
    })),
  } as unknown as D1Database;
}

describe("database release readiness", () => {
  it("probes every lease and checkpoint column before reporting schema 5", async () => {
    for (const column of [
      "attempt_id",
      "lease_expires_at",
      "checkpoint_key",
      "checkpoint_engine_sha256",
      "checkpoint_created_at",
    ]) {
      expect(DATABASE_SCHEMA_SENTINEL_SQL).toContain(column);
    }
    const database = databaseWithAll({ results: [] });
    await expect(checkDatabaseReleaseReadiness(database)).resolves.toEqual({
      ok: true,
      schema: 5,
      issues: [],
    });
    expect(database.prepare).toHaveBeenCalledWith(DATABASE_SCHEMA_SENTINEL_SQL);
  });

  it("fails closed when the binding is absent or any sentinel column is missing", async () => {
    await expect(checkDatabaseReleaseReadiness(undefined)).resolves.toEqual({
      ok: false,
      schema: null,
      issues: ["database_not_configured"],
    });
    const database = databaseWithAll(Promise.reject(new Error("no such column")));
    await expect(checkDatabaseReleaseReadiness(database)).resolves.toEqual({
      ok: false,
      schema: null,
      issues: ["database_schema_incompatible"],
    });
  });
});
