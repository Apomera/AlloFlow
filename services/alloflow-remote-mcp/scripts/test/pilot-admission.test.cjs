"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const test = require("node:test");

const {
  DRAIN_STATUS_SQL,
  acquireAdmissions,
  admissionAcquireSql,
  admissionReleaseSql,
  drainAdmissions,
  forceResumeSql,
  ownedDrainStatusSql,
  releaseAdmissions,
  resultRows,
} = require("../pilot-admission.cjs");
const {
  RECOVERY_COMMAND,
  runPausedRelease,
} = require("../pilot-deploy.cjs");

const releaseToken = "880e8400-e29b-41d4-a716-446655440000";

test("pause acquire and release are atomic, audited, and token fenced", () => {
  const pause = admissionAcquireSql("operator'o", "release drain", releaseToken);
  assert.match(pause, /admissions_open = 0/u);
  assert.match(pause, /changed_at = unixepoch\(\)/u);
  assert.match(pause, /changed_by = 'operator''o'/u);
  assert.match(pause, /change_reason = 'release drain'/u);
  assert.match(pause, /AND admissions_open = 1/u);
  assert.match(pause, /AND pause_token IS NULL/u);
  assert.match(pause, new RegExp(releaseToken, "u"));

  const release = admissionReleaseSql(
    "operator'o",
    "release drain",
    "release done",
    releaseToken,
  );
  assert.match(release, /admissions_open = 1/u);
  assert.match(release, /paused_at = NULL/u);
  assert.match(release, /pause_token = NULL/u);
  assert.match(release, /AND changed_by = 'operator''o'/u);
  assert.match(release, /AND change_reason = 'release drain'/u);
  assert.match(release, new RegExp(`AND pause_token = '${releaseToken}'`, "u"));
  assert.match(forceResumeSql("operator", "approved recovery"), /admissions_open = 0/u);
  assert.throws(() => admissionAcquireSql("", "reason", releaseToken), /invalid_operator/u);
  assert.throws(
    () => admissionAcquireSql("operator", "x".repeat(257), releaseToken),
    /invalid_reason/u,
  );
  assert.throws(
    () => admissionAcquireSql("operator", "reason", "not-a-token"),
    /invalid_pause_token/u,
  );
});

test("pre-paused acquisition and changed ownership fail closed", async () => {
  await assert.rejects(
    acquireAdmissions("pilot.jsonc", "operator", "release", releaseToken, {
      executeSql: async () => [],
    }),
    /pause_not_acquired/u,
  );
  await assert.rejects(
    releaseAdmissions(
      "pilot.jsonc",
      "operator",
      "release",
      "done",
      releaseToken,
      { executeSql: async () => [] },
    ),
    /pause_ownership_lost/u,
  );
  const owned = ownedDrainStatusSql("operator", "release", releaseToken);
  assert.match(owned, /AND changed_by = 'operator'/u);
  assert.match(owned, /AND change_reason = 'release'/u);
  assert.match(owned, new RegExp(releaseToken, "u"));
});

test("SQLite CAS preserves a pre-existing or replacement pause owner", async () => {
  const database = new DatabaseSync(":memory:");
  const executeSql = async (_configPath, sql) => database.prepare(sql).all();
  const replacementToken = "990e8400-e29b-41d4-a716-446655440000";
  try {
    database.exec(fs.readFileSync(
      path.resolve(__dirname, "..", "..", "migrations", "0007_admission_control.sql"),
      "utf8",
    ));
    await acquireAdmissions(
      "pilot.jsonc",
      "release-operator",
      "release drain",
      releaseToken,
      { executeSql },
    );
    await assert.rejects(
      acquireAdmissions(
        "pilot.jsonc",
        "other-operator",
        "incident pause",
        replacementToken,
        { executeSql },
      ),
      /pause_not_acquired/u,
    );
    database.exec(`UPDATE pilot_admission_control
      SET changed_by = 'incident-operator',
          change_reason = 'incident pause',
          pause_token = '${replacementToken}'
      WHERE singleton = 1`);
    await assert.rejects(
      releaseAdmissions(
        "pilot.jsonc",
        "release-operator",
        "release drain",
        "release done",
        releaseToken,
        { executeSql },
      ),
      /pause_ownership_lost/u,
    );
    assert.deepEqual(
      { ...database.prepare(
        "SELECT admissions_open, changed_by, pause_token FROM pilot_admission_control",
      ).get() },
      {
        admissions_open: 0,
        changed_by: "incident-operator",
        pause_token: replacementToken,
      },
    );
  } finally {
    database.close();
  }
});

test("drain requires a pause, polls to zero, and has a bounded timeout", async () => {
  assert.match(DRAIN_STATUS_SQL, /status IN \('queued', 'running', 'cancelling', 'deleting'\)/u);
  let calls = 0;
  const drained = await drainAdmissions("pilot.jsonc", {
    timeoutSeconds: 10,
    pollSeconds: 1,
    now: () => calls * 1000,
    sleep: async () => undefined,
    executeSql: async () => [{
      admissions_open: 0,
      active_jobs: calls++ === 0 ? 2 : 0,
    }],
  });
  assert.equal(Number(drained.active_jobs), 0);
  assert.equal(calls, 2);

  await assert.rejects(
    drainAdmissions("pilot.jsonc", {
      timeoutSeconds: 1,
      pollSeconds: 1,
      now: () => 1000,
      executeSql: async () => [{ admissions_open: 1, active_jobs: 0 }],
    }),
    /drain_requires_pause/u,
  );
  let timeoutClock = 0;
  await assert.rejects(
    drainAdmissions("pilot.jsonc", {
      timeoutSeconds: 1,
      pollSeconds: 1,
      now: () => (timeoutClock += 2000),
      sleep: async () => undefined,
      executeSql: async () => [{ admissions_open: 0, active_jobs: 1 }],
    }),
    /timed_out_with_1_active_jobs/u,
  );
});

test("D1 JSON parsing rejects missing result rows", () => {
  assert.deepEqual(resultRows([{ results: [{ admissions_open: 0 }] }]), [
    { admissions_open: 0 },
  ]);
  assert.throws(() => resultRows({ success: true }), /invalid_d1/u);
});

test("release wrapper pauses before drain and resumes after release steps", async () => {
  const events = [];
  await runPausedRelease({
    configPath: "pilot.jsonc",
    steps: [["drain", []], ["deploy", []]],
    operator: "release-operator",
    releaseToken,
    async pause(ownership) {
      assert.equal(ownership.token, releaseToken);
      events.push("pause");
    },
    async assertOwned() {
      events.push("owned");
    },
    async run(command) {
      events.push(command);
    },
    async resume() {
      events.push("resume");
    },
  });
  assert.deepEqual(events, [
    "pause",
    "owned",
    "drain",
    "owned",
    "deploy",
    "resume",
  ]);
});

test("release failure after a successful pause always attempts resume", async () => {
  const steps = [["one", []], ["two", []]];
  const calls = [];
  let resumed = 0;
  await assert.rejects(
    runPausedRelease({
      configPath: "pilot.jsonc",
      steps,
      operator: "release-operator",
      releaseToken,
      async pause() {
        calls.push("pause");
      },
      async assertOwned() {},
      run(command) {
        calls.push(command);
        if (command === "two") throw new Error("deploy failed");
      },
      async resume() {
        resumed += 1;
      },
    }),
    /deploy failed/u,
  );
  assert.deepEqual(calls, ["pause", "one", "two"]);
  assert.equal(resumed, 1);
  assert.equal(RECOVERY_COMMAND, "npm run admission:resume:staging");
});

test("release wrapper does not resume when pause itself fails", async () => {
  const calls = [];
  let resumed = 0;
  await assert.rejects(
    runPausedRelease({
      configPath: "pilot.jsonc",
      steps: [["drain", []]],
      operator: "release-operator",
      releaseToken,
      async pause() {
        throw new Error("pause failed");
      },
      async run(command) {
        calls.push(command);
      },
      async resume() {
        resumed += 1;
      },
    }),
    /pause failed/u,
  );
  assert.deepEqual(calls, []);
  assert.equal(resumed, 0);
});

test("resume failure emits the manual recovery command", async () => {
  let stderr = "";
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => {
    stderr += String(chunk);
    return true;
  };
  try {
    await assert.rejects(
      runPausedRelease({
        configPath: "pilot.jsonc",
        steps: [],
        operator: "release-operator",
        releaseToken,
        async pause() {},
        async resume() {
          throw new Error("resume failed");
        },
      }),
      /resume failed/u,
    );
  } finally {
    process.stderr.write = originalWrite;
  }
  assert.match(stderr, /ADMISSIONS REMAIN CLOSED/u);
  assert.ok(stderr.includes(RECOVERY_COMMAND));
});

test("ownership changed mid-release blocks later steps and cannot reopen the gate", async () => {
  const events = [];
  let checks = 0;
  let stderr = "";
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => {
    stderr += String(chunk);
    return true;
  };
  try {
    await assert.rejects(
      runPausedRelease({
        configPath: "pilot.jsonc",
        steps: [["first", []], ["remote-mutation", []]],
        operator: "release-operator",
        releaseToken,
        async pause() {
          events.push("pause");
        },
        async assertOwned() {
          checks += 1;
          if (checks === 2) throw new Error("admission_pause_ownership_lost");
        },
        async run(command) {
          events.push(command);
        },
        async resume() {
          events.push("fenced-resume");
          throw new Error("admission_pause_ownership_lost");
        },
      }),
      /pause_ownership_lost/u,
    );
  } finally {
    process.stderr.write = originalWrite;
  }
  assert.deepEqual(events, ["pause", "first", "fenced-resume"]);
  assert.match(stderr, /OWNERSHIP WAS LOST/u);
  assert.match(stderr, /ADMISSIONS REMAIN CLOSED/u);
});

test("documented recovery command is an explicit force override", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "..", "..", "package.json"), "utf8"),
  );
  assert.equal(RECOVERY_COMMAND, "npm run admission:resume:staging");
  assert.match(packageJson.scripts["admission:resume:staging"], /resume --force/u);
  assert.match(
    packageJson.scripts["admission:resume:staging"],
    /operator-approved-recovery/u,
  );
});
