import { PILOT_DATABASE_SCHEMA_VERSION } from "./pilot-env";

export const DATABASE_SCHEMA_SENTINEL_SQL = `
  SELECT
    jobs.attempt_id,
    jobs.attempt_number,
    jobs.heartbeat_at,
    jobs.lease_expires_at,
    jobs.run_stage,
    jobs.throttle_wait_until,
    jobs.verification_state,
    jobs.checkpoint_seq,
    jobs.checkpoint_key,
    jobs.checkpoint_sha256,
    jobs.checkpoint_size_bytes,
    jobs.checkpoint_stage,
    jobs.checkpoint_schema,
    jobs.checkpoint_input_sha256,
    jobs.checkpoint_options_sha256,
    jobs.checkpoint_engine_sha256,
    jobs.checkpoint_created_at,
    admission.admissions_open,
    admission.changed_at,
    admission.changed_by,
    admission.change_reason,
    admission.paused_at,
    admission.pause_token
  FROM jobs
  CROSS JOIN pilot_admission_control AS admission
  WHERE admission.singleton = 1
  LIMIT 0
`;

export const ADMISSION_CONTROL_SENTINEL_SQL = `
  SELECT admissions_open, changed_at, changed_by, change_reason, paused_at,
         pause_token
  FROM pilot_admission_control
  WHERE singleton = 1
`;

export interface DatabaseReleaseReadiness {
  ok: boolean;
  schema: number | null;
  admissionsOpen: boolean | null;
  issues: string[];
}

export async function checkDatabaseReleaseReadiness(
  database: D1Database | undefined,
): Promise<DatabaseReleaseReadiness> {
  if (!database) {
    return {
      ok: false,
      schema: null,
      admissionsOpen: null,
      issues: ["database_not_configured"],
    };
  }
  try {
    await database.prepare(DATABASE_SCHEMA_SENTINEL_SQL).all();
    const admission = await database
      .prepare(ADMISSION_CONTROL_SENTINEL_SQL)
      .first<{
        admissions_open: number;
        changed_at: number;
        changed_by: string;
        change_reason: string;
        paused_at: number | null;
        pause_token: string | null;
      }>();
    if (
      !admission ||
      ![0, 1].includes(admission.admissions_open) ||
      !Number.isSafeInteger(admission.changed_at) ||
      admission.changed_at < 0 ||
      typeof admission.changed_by !== "string" ||
      admission.changed_by.length < 1 ||
      admission.changed_by.length > 128 ||
      typeof admission.change_reason !== "string" ||
      admission.change_reason.length < 1 ||
      admission.change_reason.length > 256 ||
      (admission.admissions_open === 1 &&
        (admission.paused_at !== null || admission.pause_token !== null)) ||
      (admission.admissions_open === 0 &&
        (!Number.isSafeInteger(admission.paused_at) ||
          (admission.paused_at as number) < 0 ||
          typeof admission.pause_token !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
            admission.pause_token,
          )))
    ) {
      throw new Error("admission_control_incompatible");
    }
    return {
      ok: true,
      schema: PILOT_DATABASE_SCHEMA_VERSION,
      admissionsOpen: admission.admissions_open === 1,
      issues: [],
    };
  } catch {
    return {
      ok: false,
      schema: null,
      admissionsOpen: null,
      issues: ["database_schema_incompatible"],
    };
  }
}
