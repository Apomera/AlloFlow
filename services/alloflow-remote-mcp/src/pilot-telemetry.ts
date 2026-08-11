import type { PilotEnv } from "./pilot-env";

export type PilotMetricFields = {
  outcome?: string;
  stage?: string;
  release?: string;
  count?: number;
  durationMs?: number;
  bytes?: number;
  queueAgeMs?: number;
  leaseSlackMs?: number;
  retryAfterMs?: number;
  checkpointSequence?: number;
  remaining?: number;
  jobId?: string;
  attemptId?: string;
};

function finite(value: number | undefined): number {
  return Number.isFinite(value) ? (value as number) : 0;
}

function label(value: string | undefined, fallback = "none"): string {
  if (!value) return fallback;
  return value.replace(/[^A-Za-z0-9._:-]/gu, "_").slice(0, 160);
}

export function workerRelease(env: PilotEnv): string {
  return label(env.CF_VERSION_METADATA?.id, "local");
}

export function emitPilotMetric(
  env: PilotEnv,
  event: string,
  fields: PilotMetricFields = {},
): void {
  const release = fields.release || workerRelease(env);
  const record = {
    event: label(event, "unknown"),
    outcome: label(fields.outcome),
    stage: label(fields.stage),
    release,
    count: finite(fields.count ?? 1),
    durationMs: finite(fields.durationMs),
    bytes: finite(fields.bytes),
    queueAgeMs: finite(fields.queueAgeMs),
    leaseSlackMs: finite(fields.leaseSlackMs),
    retryAfterMs: finite(fields.retryAfterMs),
    checkpointSequence: finite(fields.checkpointSequence),
    remaining: finite(fields.remaining),
    // Job and attempt IDs are already opaque random identifiers. They are
    // useful in logs for correlation but are intentionally excluded from the
    // Analytics Engine dimensions to keep metrics privacy-safe.
    ...(fields.jobId ? { jobId: label(fields.jobId) } : {}),
    ...(fields.attemptId ? { attemptId: label(fields.attemptId) } : {}),
  };
  const serialized = JSON.stringify(record);
  if (record.outcome === "failed") {
    console.error(serialized);
  } else if (
    record.outcome === "degraded" ||
    record.outcome === "retrying" ||
    record.event.includes("throttled") ||
    record.event.includes("deferred")
  ) {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }

  try {
    env.PILOT_METRICS?.writeDataPoint({
      // Analytics Engine currently supports exactly one sampling index.
      indexes: [label(env.INSTITUTION_ID, "unconfigured")],
      blobs: [record.event, record.outcome, record.stage, record.release],
      doubles: [
        record.count,
        record.durationMs,
        record.bytes,
        record.queueAgeMs,
        record.leaseSlackMs,
        record.retryAfterMs,
        record.checkpointSequence,
        record.remaining,
      ],
    });
  } catch {
    // Telemetry is observational. A binding outage must never change a job,
    // cleanup, readiness, or release-canary outcome.
  }
}
