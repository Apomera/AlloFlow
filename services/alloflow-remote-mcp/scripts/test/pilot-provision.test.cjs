"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { parseJsonc } = require("../pilot-preflight.cjs");
const {
  buildProvisionPlan,
  confirmationPhrase,
  desiredResources,
  parseJsonArray,
  parseR2List,
  provisionCommands,
  reconciledConfig,
  runProvision,
  validateProvisioningShape,
} = require("../pilot-provision.cjs");

const serviceRoot = path.resolve(__dirname, "..", "..");
const examplePath = path.join(serviceRoot, "wrangler.pilot.example.jsonc");

function example() {
  const raw = fs.readFileSync(examplePath, "utf8");
  return { raw, config: parseJsonc(raw) };
}

function inventoryFor(config) {
  const desired = desiredResources(config);
  return {
    kv: [{ title: desired.kv.name, id: "1".repeat(32) }],
    d1: [{ name: desired.d1.name, uuid: "2".repeat(32) }],
    r2: [{ name: desired.r2.name }],
  };
}

test("provisioning shape permits resource placeholders but remains staging-only", () => {
  const { config } = example();
  assert.deepEqual(validateProvisioningShape(config), []);
  config.vars.PILOT_ACCEPTANCE_VERSION = "institution-pilot-synthetic-v2";
  assert.ok(
    validateProvisioningShape(config).some((error) =>
      error.toLowerCase().includes("acceptance"),
    ),
  );
  delete config.vars.PILOT_ACCEPTANCE_VERSION;
  config.name = "alloflow-production";
  assert.ok(
    validateProvisioningShape(config).some((error) =>
      error.includes("institution staging"),
    ),
  );
});

test("an empty account produces an explicit create-only plan", () => {
  const { config } = example();
  const plan = buildProvisionPlan(config, { kv: [], d1: [], r2: [] });
  assert.deepEqual(
    plan.resources.map(({ kind, action }) => ({ kind, action })),
    [
      { kind: "oauth_kv", action: "create" },
      { kind: "pilot_db", action: "create" },
      { kind: "documents_r2", action: "create" },
    ],
  );
  const commands = provisionCommands(plan, "pilot.local.jsonc");
  assert.equal(commands.length, 3);
  assert.deepEqual(commands.map((args) => args.slice(0, 3)), [
    ["kv", "namespace", "create"],
    ["d1", "create", "alloflow-institution-pilot-staging"],
    ["r2", "bucket", "create"],
  ]);
  assert.ok(commands.every((args) => args.includes("--config")));
  assert.ok(commands.every((args) => args.includes("--no-update-config")));
});

test("an interrupted run adopts exact named resources and reconciles IDs", () => {
  const { config } = example();
  const plan = buildProvisionPlan(config, inventoryFor(config));
  assert.deepEqual(
    plan.resources.map((entry) => entry.action),
    ["adopt", "adopt", "keep"],
  );
  const next = reconciledConfig(config, plan);
  assert.equal(next.kv_namespaces[0].id, "1".repeat(32));
  assert.equal(next.d1_databases[0].database_id, "2".repeat(32));
  assert.ok(config.kv_namespaces[0].id.startsWith("REPLACE_WITH_"));
});

test("a configured ID cannot silently point at a differently named resource", () => {
  const { config } = example();
  config.kv_namespaces[0].id = "1".repeat(32);
  assert.throws(
    () => buildProvisionPlan(config, {
      kv: [{ title: "some-shared-kv", id: "1".repeat(32) }],
      d1: [],
      r2: [],
    }),
    /does_not_match_dedicated_name/u,
  );
});

test("plan is read-only and apply requires the exact account-scoped phrase", async () => {
  const { raw, config } = example();
  const accountId = "a".repeat(32);
  let reads = 0;
  let writes = 0;
  const readInventory = async () => {
    reads += 1;
    return inventoryFor(config);
  };
  const planned = await runProvision({
    configPath: "pilot.local.jsonc",
    raw,
    config,
    accountId,
    apply: false,
    readInventory,
    writeConfig: async () => {
      writes += 1;
    },
  });
  assert.equal(planned.applied, false);
  assert.equal(reads, 1);
  assert.equal(writes, 0);

  await assert.rejects(
    runProvision({
      configPath: "pilot.local.jsonc",
      raw,
      config,
      accountId,
      apply: true,
      confirm: "yes",
      readInventory,
    }),
    /confirmation_required/u,
  );
  assert.match(confirmationPhrase(config, accountId), /@a{32}:/u);
});

test("apply creates only missing storage then verifies before writing config", async () => {
  const { raw, config } = example();
  const accountId = "a".repeat(32);
  const inventories = [
    { kv: [], d1: [], r2: [] },
    inventoryFor(config),
  ];
  const commands = [];
  let written;
  const result = await runProvision({
    configPath: "pilot.local.jsonc",
    raw,
    config,
    accountId,
    apply: true,
    confirm: confirmationPhrase(config, accountId),
    readInventory: async () => inventories.shift(),
    run(args) {
      commands.push(args);
      return "";
    },
    async writeConfig(_path, expectedRaw, next) {
      assert.equal(expectedRaw, raw);
      written = next;
    },
  });
  assert.equal(result.applied, true);
  assert.equal(commands.length, 3);
  assert.equal(written.kv_namespaces[0].id, "1".repeat(32));
  assert.equal(written.d1_databases[0].database_id, "2".repeat(32));
});

test("Wrangler inventory parsers reject ambiguity and parse labelled R2 output", () => {
  assert.deepEqual(
    parseJsonArray("banner\n[{\"id\":\"one\"}]\n", "kv"),
    [{ id: "one" }],
  );
  assert.throws(() => parseJsonArray("not json", "kv"), /invalid_kv/u);
  assert.deepEqual(
    parseR2List(
      "Listing buckets...\nname: pilot-documents\ncreation_date: today\n\n" +
      "name: another-bucket\ncreation_date: yesterday\n",
    ),
    [{ name: "pilot-documents" }, { name: "another-bucket" }],
  );
});
