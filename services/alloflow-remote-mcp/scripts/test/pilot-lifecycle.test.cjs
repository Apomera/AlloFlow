"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  DEFAULT_POLICY_PATH,
  EXPECTED_POLICY,
  buildApplyCommand,
  readLifecyclePolicy,
  resolveDocumentsBucket,
  validateLifecyclePolicy,
} = require("../pilot-lifecycle.cjs");
const { parseJsonc } = require("../pilot-preflight.cjs");

const serviceRoot = path.resolve(__dirname, "..", "..");
const exampleConfigPath = path.join(
  serviceRoot,
  "wrangler.pilot.example.jsonc",
);

test("checked lifecycle source covers objects and incomplete uploads", () => {
  const policy = readLifecyclePolicy(DEFAULT_POLICY_PATH);
  assert.deepEqual(policy, EXPECTED_POLICY);
  assert.deepEqual(validateLifecyclePolicy(policy), []);
  assert.equal(
    policy.rules[0].deleteObjectsTransition.condition.maxAge,
    2 * 24 * 60 * 60,
  );
  assert.equal(
    policy.rules[0].abortMultipartUploadsTransition.condition.maxAge,
    24 * 60 * 60,
  );
});

test("policy drift is rejected rather than silently widening retention", () => {
  for (const mutate of [
    (policy) => {
      policy.rules[0].conditions.prefix = "";
    },
    (policy) => {
      policy.rules[0].deleteObjectsTransition.condition.maxAge += 1;
    },
    (policy) => {
      policy.rules.push({ ...policy.rules[0], id: "unexpected" });
    },
  ]) {
    const policy = structuredClone(EXPECTED_POLICY);
    mutate(policy);
    assert.equal(validateLifecyclePolicy(policy).length, 1);
  }
});

test("apply command binds the exact configured DOCUMENTS bucket", () => {
  const config = parseJsonc(fs.readFileSync(exampleConfigPath, "utf8"));
  const bucket = resolveDocumentsBucket(config);
  const command = buildApplyCommand(
    exampleConfigPath,
    DEFAULT_POLICY_PATH,
    config,
  );
  assert.equal(bucket, "alloflow-institution-pilot-staging-documents");
  assert.equal(command.command, process.execPath);
  assert.deepEqual(command.args.slice(1, 7), [
    "r2",
    "bucket",
    "lifecycle",
    "set",
    bucket,
    "--file",
  ]);
  assert.equal(command.args.at(-1), "--force");
  assert.ok(command.args.includes(path.resolve(DEFAULT_POLICY_PATH)));
});

test("both staging deploy paths apply lifecycle before Worker deploy", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(serviceRoot, "package.json"), "utf8"),
  );
  for (const name of ["deploy:staging", "deploy:staging:accepted"]) {
    const script = packageJson.scripts[name];
    const lifecycleIndex = script.indexOf("lifecycle:apply:staging");
    const deployIndex = script.indexOf("wrangler deploy");
    assert.ok(lifecycleIndex >= 0, `${name} must apply lifecycle policy`);
    assert.ok(
      lifecycleIndex < deployIndex,
      `${name} must configure retention before code deployment`,
    );
  }
});
