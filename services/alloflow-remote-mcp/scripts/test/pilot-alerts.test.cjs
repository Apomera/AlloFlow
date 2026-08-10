"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  buildAlertQuery,
  evaluateAlerts,
  fetchAlertRows,
} = require("../pilot-alerts.cjs");

test("alert query is sampling-aware and uses the fixed metric mapping", () => {
  const query = buildAlertQuery("alloflow_institution_pilot_metrics", 15);
  assert.match(query, /SUM\(_sample_interval \* double1\)/u);
  assert.match(query, /blob1 AS event/u);
  assert.match(query, /blob2 AS outcome/u);
  assert.match(query, /INTERVAL '15' MINUTE/u);
  assert.match(query, /FORMAT JSON/u);
  assert.throws(
    () => buildAlertQuery("dataset; DROP TABLE x", 15),
    /invalid_analytics_dataset/u,
  );
});

test("critical failures and sustained degradation cross explicit gates", () => {
  const alerts = evaluateAlerts([
    { event: "cleanup", outcome: "failed", event_count: "1" },
    {
      event: "lease_renewal",
      outcome: "degraded",
      event_count: 99,
    },
    {
      event: "lease_renewal",
      outcome: "deferred",
      event_count: 3,
    },
    { event: "model_throttled", outcome: "retryable", event_count: 9 },
    { event: "model_throttled", outcome: "terminal", event_count: 1 },
    {
      event: "checkpoint_resume_pointer",
      outcome: "unavailable",
      event_count: 1,
    },
    { event: "lease_renewal", outcome: "fatal", event_count: 1 },
  ]);
  assert.deepEqual(
    alerts.map((alert) => [alert.severity, alert.reason]),
    [
      ["critical", "durable_resume_unavailable"],
      ["critical", "pilot_operation_failed"],
      ["critical", "lease_expired_during_runner"],
      ["warning", "lease_store_degraded"],
      ["warning", "provider_throttle_sustained"],
    ],
  );
});

test("release canary alerts only after the production retry budget is exhausted", () => {
  assert.deepEqual(
    evaluateAlerts([
      { event: "release_canary", outcome: "failed", event_count: "1" },
    ]),
    [],
  );
  assert.deepEqual(
    evaluateAlerts([
      { event: "release_canary", outcome: "failed", event_count: "3" },
    ]),
    [],
  );
  assert.deepEqual(
    evaluateAlerts([
      { event: "release_canary", outcome: "failed", event_count: "4" },
    ]),
    [
      {
        severity: "critical",
        event: "release_canary",
        outcome: "failed",
        count: 4,
        reason: "release_canary_retries_exhausted",
      },
    ],
  );
});

test("checked alert names and outcomes are bound to production emitters", () => {
  const workflow = fs.readFileSync(
    path.resolve(__dirname, "..", "..", "src", "remediation-workflow.ts"),
    "utf8",
  );
  const entrypoint = fs.readFileSync(
    path.resolve(__dirname, "..", "..", "src", "pilot-index.ts"),
    "utf8",
  );
  for (const token of [
    '"lease_renewal"',
    'outcome: "deferred"',
    'outcome: "fatal"',
    '"model_throttled"',
    '"checkpoint_resume_pointer"',
    'outcome: "unavailable"',
  ]) {
    assert.ok(workflow.includes(token), `missing Workflow metric token ${token}`);
  }
  assert.ok(entrypoint.includes('"release_canary"'));
  assert.ok(entrypoint.includes('outcome: releaseReady ? "success" : "failed"'));
});

test("SQL client never places the token in the URL or query", async () => {
  const token = "secret-token-that-must-remain-in-header";
  let observed;
  const rows = await fetchAlertRows({
    accountId: "a".repeat(32),
    token,
    fetchImpl: async (url, init) => {
      observed = { url, init };
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  assert.deepEqual(rows, []);
  assert.equal(observed.init.headers.Authorization, `Bearer ${token}`);
  assert.ok(!observed.url.includes(token));
  assert.ok(!observed.init.body.includes(token));
});
