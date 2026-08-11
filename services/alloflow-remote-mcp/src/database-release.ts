import { PILOT_DATABASE_SCHEMA_VERSION } from "./pilot-env";

export const DATABASE_SCHEMA_SENTINEL_SQL = `
  SELECT
    attempt_id,
    attempt_number,
    heartbeat_at,
    lease_expires_at,
    run_stage,
    checkpoint_seq,
    checkpoint_key,
    checkpoint_sha256,
    checkpoint_size_bytes,
    checkpoint_stage,
    checkpoint_schema,
    checkpoint_input_sha256,
    checkpoint_options_sha256,
    checkpoint_engine_sha256,
    checkpoint_created_at
  FROM jobs
  LIMIT 0
`;

export interface DatabaseReleaseReadiness {
  ok: boolean;
  schema: number | null;
  issues: string[];
}

export async function checkDatabaseReleaseReadiness(
  database: D1Database | undefined,
): Promise<DatabaseReleaseReadiness> {
  if (!database) {
    return {
      ok: false,
      schema: null,
      issues: ["database_not_configured"],
    };
  }
  try {
    await database.prepare(DATABASE_SCHEMA_SENTINEL_SQL).all();
    return {
      ok: true,
      schema: PILOT_DATABASE_SCHEMA_VERSION,
      issues: [],
    };
  } catch {
    return {
      ok: false,
      schema: null,
      issues: ["database_schema_incompatible"],
    };
  }
}
