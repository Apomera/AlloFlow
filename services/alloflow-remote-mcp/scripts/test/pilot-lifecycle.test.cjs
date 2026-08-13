"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  DEFAULT_POLICY_PATH,
  EXPECTED_POLICY,
  applyLifecyclePolicy,
  buildApplyCommand,
  normalizeLifecyclePolicy,
  readLifecyclePolicy,
  readRemoteLifecyclePolicy,
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

test("remote lifecycle readback is exact, normalized, bounded, and authenticated", async () => {
  const config = {
    r2_buckets: [
      { binding: "DOCUMENTS", bucket_name: "pilot-documents", jurisdiction: "eu" },
    ],
  };
  let observed;
  const readback = await readRemoteLifecyclePolicy(
    config,
    "pilot-documents",
    {
      accountId: "a".repeat(32),
      token: "token-that-is-long-enough",
      fetchImpl: async (url, init) => {
        observed = { url, init };
        return Response.json({
          success: true,
          result: { rules: [...EXPECTED_POLICY.rules].reverse() },
        });
      },
    },
  );
  assert.deepEqual(readback, normalizeLifecyclePolicy(EXPECTED_POLICY));
  assert.equal(observed.init.headers.Authorization, "Bearer token-that-is-long-enough");
  assert.equal(observed.init.headers["cf-r2-jurisdiction"], "eu");
  assert.ok(!observed.url.includes("token-that-is-long-enough"));

  const drifted = structuredClone(readback);
  drifted.rules[0].conditions.prefix = "";
  assert.equal(validateLifecyclePolicy(drifted).length, 1);
  await assert.rejects(
    readRemoteLifecyclePolicy(config, "pilot-documents", {
      accountId: "a".repeat(32),
      token: "token-that-is-long-enough",
      fetchImpl: async () => new Response("x".repeat(256 * 1024 + 1)),
    }),
    /readback_too_large/u,
  );
});

test("a successful lifecycle set still fails closed unless post-set readback matches", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "alloflow-lifecycle-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const configPath = path.join(directory, "pilot.jsonc");
  const raw = fs.readFileSync(exampleConfigPath, "utf8")
    .replaceAll("mcp-staging.REPLACE_WITH_INSTITUTION_DOMAIN", "mcp-staging.district.example")
    .replace("REPLACE_WITH_OPAQUE_INSTITUTION_ID", "district_opaque_01")
    .replace("https://REPLACE_WITH_ACCESS_AUTHORIZATION_ENDPOINT", "https://district.cloudflareaccess.com/authorize")
    .replace("https://REPLACE_WITH_ACCESS_TOKEN_ENDPOINT", "https://district.cloudflareaccess.com/token")
    .replace("https://REPLACE_WITH_ACCESS_JWKS_ENDPOINT", "https://district.cloudflareaccess.com/jwks")
    .replace("https://REPLACE_WITH_PINNED_ACCESS_ISSUER", "https://district.cloudflareaccess.com/issuer")
    .replace("REPLACE_WITH_ACCESS_CLIENT_ID", "access-client-id")
    .replace("REPLACE_WITH_64_HEX_ACCESS_APPLICATION_AUDIENCE", "a".repeat(64))
    .replace("REPLACE_WITH_CHATGPT_APP_REDIRECT_URI", "https://chatgpt.com/connector/oauth/callback_123")
    .replace("REPLACE_WITH_INSTITUTION_APPROVED_MODEL", "gemini-approved-model")
    .replace("REPLACE_WITH_INSTITUTION_KV_ID", "1".repeat(32))
    .replace("REPLACE_WITH_INSTITUTION_D1_ID", "2".repeat(32));
  fs.writeFileSync(configPath, raw, "utf8");
  let sets = 0;
  const options = {
    accountId: "a".repeat(32),
    token: "token-that-is-long-enough",
    spawnSync: () => {
      sets += 1;
      return { status: 0 };
    },
    fetchImpl: async () => Response.json({
      success: true,
      result: { rules: EXPECTED_POLICY.rules },
    }),
  };
  await assert.doesNotReject(
    applyLifecyclePolicy(configPath, DEFAULT_POLICY_PATH, options),
  );
  assert.equal(sets, 1);

  const drifted = structuredClone(EXPECTED_POLICY);
  drifted.rules[0].conditions.prefix = "";
  await assert.rejects(
    applyLifecyclePolicy(configPath, DEFAULT_POLICY_PATH, {
      ...options,
      fetchImpl: async () => Response.json({
        success: true,
        result: { rules: drifted.rules },
      }),
    }),
    /readback_mismatch/u,
  );
  assert.equal(sets, 2, "both writes completed before mandatory readback");
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
    assert.match(script, /pilot-deploy\.cjs/u);
    assert.doesNotMatch(script, /admission:pause:staging/u);
  }
  const wrapper = fs.readFileSync(
    path.join(serviceRoot, "scripts", "pilot-deploy.cjs"),
    "utf8",
  );
  assert.ok(wrapper.indexOf("pilot-lifecycle.cjs") < wrapper.indexOf('"deploy"'));
  assert.match(wrapper, /finally/u);
  assert.match(wrapper, /ADMISSIONS REMAIN CLOSED/u);
  assert.match(wrapper, /"assert-owned"/u);
});
