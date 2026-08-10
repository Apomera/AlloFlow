"use strict";

const {
  DEFAULT_RELEASE_CANARY_ATTEMPTS,
} = require("./pilot-release-canary.cjs");

const DATASET_RE = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/u;
const ACCOUNT_ID_RE = /^[a-f0-9]{32}$/iu;
const DEFAULT_DATASET = "alloflow_institution_pilot_metrics";
const DEFAULT_WINDOW_MINUTES = 15;

function buildAlertQuery(
  dataset = DEFAULT_DATASET,
  windowMinutes = DEFAULT_WINDOW_MINUTES,
) {
  if (!DATASET_RE.test(dataset)) {
    throw new Error("invalid_analytics_dataset");
  }
  if (
    !Number.isSafeInteger(windowMinutes) ||
    windowMinutes < 1 ||
    windowMinutes > 60
  ) {
    throw new Error("invalid_alert_window");
  }
  return `SELECT
  blob1 AS event,
  blob2 AS outcome,
  SUM(_sample_interval * double1) AS event_count,
  MAX(double4) AS max_queue_age_ms,
  MIN(double5) AS min_lease_slack_ms,
  MAX(double6) AS max_retry_after_ms
FROM ${dataset}
WHERE timestamp > NOW() - INTERVAL '${windowMinutes}' MINUTE
GROUP BY event, outcome
ORDER BY event_count DESC
FORMAT JSON`;
}

function finiteCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function evaluateAlerts(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("invalid_analytics_response");
  }
  const alerts = [];
  let throttledCount = 0;
  for (const row of rows) {
    const event = typeof row?.event === "string" ? row.event : "unknown";
    const outcome =
      typeof row?.outcome === "string" ? row.outcome : "unknown";
    const count = finiteCount(row?.event_count);
    if (count === 0) continue;
    if (event === "model_throttled") {
      throttledCount += count;
    }

    if (
      outcome === "failed" &&
      event === "release_canary" &&
      count < DEFAULT_RELEASE_CANARY_ATTEMPTS
    ) {
      continue;
    }
    if (outcome === "failed") {
      alerts.push({
        severity: "critical",
        event,
        outcome,
        count,
        reason:
          event === "release_canary"
            ? "release_canary_retries_exhausted"
            : "pilot_operation_failed",
      });
      continue;
    }
    if (
      event === "lease_renewal" &&
      outcome === "fatal"
    ) {
      alerts.push({
        severity: "critical",
        event,
        outcome,
        count,
        reason: "lease_expired_during_runner",
      });
    }
    if (
      event === "lease_renewal" &&
      outcome === "deferred" &&
      count >= 3
    ) {
      alerts.push({
        severity: "warning",
        event,
        outcome,
        count,
        reason: "lease_store_degraded",
      });
    }
    if (
      event === "checkpoint_resume_pointer" &&
      outcome === "unavailable"
    ) {
      alerts.push({
        severity: "critical",
        event,
        outcome,
        count,
        reason: "durable_resume_unavailable",
      });
    }
  }
  if (throttledCount >= 10) {
    alerts.push({
      severity: "warning",
      event: "model_throttled",
      outcome: "all",
      count: throttledCount,
      reason: "provider_throttle_sustained",
    });
  }
  return alerts.sort((left, right) =>
    left.severity === right.severity
      ? left.event.localeCompare(right.event)
      : left.severity === "critical"
        ? -1
        : 1,
  );
}

async function fetchAlertRows(options) {
  const accountId = options.accountId;
  const token = options.token;
  if (!ACCOUNT_ID_RE.test(accountId || "")) {
    throw new Error("invalid_cloudflare_account_id");
  }
  if (typeof token !== "string" || token.length < 20) {
    throw new Error("analytics_api_token_required");
  }
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const response = await fetchImpl(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: buildAlertQuery(options.dataset, options.windowMinutes),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) {
    throw new Error(`analytics_query_failed_${response.status}`);
  }
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.data)) {
    throw new Error("invalid_analytics_response");
  }
  return payload.data;
}

async function main() {
  const rows = await fetchAlertRows({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_ANALYTICS_TOKEN,
    dataset: process.env.PILOT_METRICS_DATASET || DEFAULT_DATASET,
    windowMinutes: DEFAULT_WINDOW_MINUTES,
  });
  const alerts = evaluateAlerts(rows);
  process.stdout.write(
    `${JSON.stringify({
      ok: alerts.length === 0,
      windowMinutes: DEFAULT_WINDOW_MINUTES,
      alertCount: alerts.length,
      alerts,
    })}\n`,
  );
  if (alerts.length > 0) {
    process.exitCode = 2;
  }
}

module.exports = {
  DEFAULT_DATASET,
  DEFAULT_WINDOW_MINUTES,
  buildAlertQuery,
  evaluateAlerts,
  fetchAlertRows,
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(
      `alerts: ${error instanceof Error ? error.message : "failed"}\n`,
    );
    process.exitCode = 1;
  });
}
