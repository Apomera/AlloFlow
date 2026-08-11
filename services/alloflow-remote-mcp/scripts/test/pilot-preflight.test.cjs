"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  ACCEPTANCE_VERSION,
  parseJsonc,
  validatePilotConfig,
} = require("../pilot-preflight.cjs");

const templatePath = path.resolve(
  __dirname,
  "..",
  "..",
  "wrangler.pilot.example.jsonc",
);

function configuredTemplate() {
  const raw = fs
    .readFileSync(templatePath, "utf8")
    .replaceAll(
      "mcp-staging.REPLACE_WITH_INSTITUTION_DOMAIN",
      "mcp-staging.district.example",
    )
    .replace(
      "REPLACE_WITH_OPAQUE_INSTITUTION_ID",
      "district_opaque_01",
    )
    .replace(
      "https://REPLACE_WITH_ACCESS_AUTHORIZATION_ENDPOINT",
      "https://district.cloudflareaccess.com/authorize",
    )
    .replace(
      "https://REPLACE_WITH_ACCESS_TOKEN_ENDPOINT",
      "https://district.cloudflareaccess.com/token",
    )
    .replace(
      "https://REPLACE_WITH_ACCESS_JWKS_ENDPOINT",
      "https://district.cloudflareaccess.com/jwks",
    )
    .replace(
      "https://REPLACE_WITH_PINNED_ACCESS_ISSUER",
      "https://district.cloudflareaccess.com/issuer",
    )
    .replace("REPLACE_WITH_ACCESS_CLIENT_ID", "access-client-id")
    .replace(
      "REPLACE_WITH_64_HEX_ACCESS_APPLICATION_AUDIENCE",
      "a".repeat(64),
    )
    .replace(
      "REPLACE_WITH_CHATGPT_APP_REDIRECT_URI",
      "https://chatgpt.com/connector/oauth/callback_123",
    )
    .replace(
      "REPLACE_WITH_INSTITUTION_APPROVED_MODEL",
      "gemini-approved-model",
    )
    .replace(
      "REPLACE_WITH_INSTITUTION_KV_ID",
      "1".repeat(32),
    )
    .replace(
      "REPLACE_WITH_INSTITUTION_D1_ID",
      "2".repeat(32),
    );
  return { raw, config: parseJsonc(raw) };
}

test("the example remains intentionally non-deployable", () => {
  const raw = fs.readFileSync(templatePath, "utf8");
  const errors = validatePilotConfig(parseJsonc(raw), raw);
  assert.ok(errors.some((error) => error.includes("REPLACE_WITH_")));
});

test("a fully isolated staging copy passes offline preflight", () => {
  const { raw, config } = configuredTemplate();
  assert.deepEqual(validatePilotConfig(config, raw), []);
});

test("release metadata and privacy-safe metrics bindings are mandatory", () => {
  const missingMetrics = configuredTemplate();
  delete missingMetrics.config.analytics_engine_datasets;
  assert.ok(
    validatePilotConfig(missingMetrics.config, missingMetrics.raw).some(
      (error) => error.includes("PILOT_METRICS"),
    ),
  );

  const missingVersion = configuredTemplate();
  delete missingVersion.config.version_metadata;
  assert.ok(
    validatePilotConfig(missingVersion.config, missingVersion.raw).some(
      (error) => error.includes("CF_VERSION_METADATA"),
    ),
  );
});

test("synthetic acceptance requires an explicit second switch", () => {
  const { raw, config } = configuredTemplate();
  config.vars.PILOT_ACCEPTANCE_VERSION = ACCEPTANCE_VERSION;
  assert.ok(
    validatePilotConfig(config, raw).some((error) =>
      error.includes("--allow-synthetic-acceptance"),
    ),
  );
  assert.deepEqual(
    validatePilotConfig(config, raw, {
      allowSyntheticAcceptance: true,
    }),
    [],
  );
});

test("ChatGPT callback must exactly match an app-managed HTTPS URL", () => {
  const invalidRedirects = [
    undefined,
    "https://chatgpt.com/connector/oauth/*",
    "https://chatgpt.com/connector/oauth/callback_123?tenant=one",
    "https://chatgpt.com/connector/oauth/callback_123#fragment",
    "http://chatgpt.com/connector/oauth/callback_123",
    "https://user@chatgpt.com/connector/oauth/callback_123",
    "https://example.com/connector/oauth/callback_123",
    "https://chatgpt.com/connector/oauth/callback_123/extra",
  ];

  for (const invalidRedirect of invalidRedirects) {
    const { raw, config } = configuredTemplate();
    config.vars.CHATGPT_REDIRECT_URI = invalidRedirect;
    expectChatGptRedirectError(validatePilotConfig(config, raw));
  }
});

function expectChatGptRedirectError(errors) {
  assert.ok(
    errors.some((error) => error.includes("CHATGPT_REDIRECT_URI")),
  );
}

test("workload quotas are explicit, bounded, and hierarchical", () => {
  const { raw, config } = configuredTemplate();

  delete config.vars.MAX_OPEN_UPLOADS_PER_OWNER;
  assert.ok(
    validatePilotConfig(config, raw).some((error) =>
      error.includes("MAX_OPEN_UPLOADS_PER_OWNER"),
    ),
  );

  config.vars.MAX_OPEN_UPLOADS_PER_OWNER = "21";
  assert.ok(
    validatePilotConfig(config, raw).some((error) =>
      error.includes("MAX_OPEN_UPLOADS_PER_OWNER"),
    ),
  );

  config.vars.MAX_OPEN_UPLOADS_PER_OWNER = "3";
  config.vars.MAX_UPLOAD_ATTEMPTS_PER_OWNER_24H = "101";
  config.vars.MAX_UPLOAD_ATTEMPTS_PER_INSTITUTION_24H = "100";
  assert.ok(
    validatePilotConfig(config, raw).some((error) =>
      error.includes(
        "MAX_UPLOAD_ATTEMPTS_PER_INSTITUTION_24H must be at least",
      ),
    ),
  );

  config.vars.MAX_UPLOAD_ATTEMPTS_PER_OWNER_24H = "20";
  config.vars.MAX_ACTIVE_JOBS_PER_OWNER = "2";
  config.vars.MAX_ACTIVE_JOBS_PER_INSTITUTION = "1";
  assert.ok(
    validatePilotConfig(config, raw).some((error) =>
      error.includes(
        "MAX_ACTIVE_JOBS_PER_INSTITUTION must be at least",
      ),
    ),
  );

  config.vars.MAX_ACTIVE_JOBS_PER_OWNER = "1";
  config.vars.MAX_JOBS_PER_OWNER_24H = "51";
  config.vars.MAX_JOBS_PER_INSTITUTION_24H = "50";
  assert.ok(
    validatePilotConfig(config, raw).some((error) =>
      error.includes(
        "MAX_JOBS_PER_INSTITUTION_24H must be at least",
      ),
    ),
  );

  config.vars.MAX_ACTIVE_JOBS_PER_OWNER = "1";
  config.vars.MAX_ACTIVE_JOBS_PER_INSTITUTION = "2";
  config.containers[0].max_instances = 1;
  assert.ok(
    validatePilotConfig(config, raw).some((error) =>
      error.includes("cannot exceed container max_instances"),
    ),
  );

  config.vars.MAX_JOBS_PER_OWNER_24H = "10";
  config.vars.MAX_JOBS_PER_INSTITUTION_24H = "50";
  config.vars.MAX_ACTIVE_JOBS_PER_INSTITUTION = "1";
  assert.deepEqual(validatePilotConfig(config, raw), []);

  for (const invalidMaxInstances of [undefined, "2", 0, -1, 3]) {
    const isolated = configuredTemplate();
    isolated.config.containers[0].max_instances = invalidMaxInstances;
    assert.ok(
      validatePilotConfig(isolated.config, isolated.raw).some((error) =>
        error.includes("bounded staged runner"),
      ),
    );
  }
});

test("runner input and time limits cannot exceed the built image", () => {
  const { raw, config } = configuredTemplate();
  config.vars.UPLOAD_MAX_BYTES = String(25 * 1024 * 1024 + 1);
  assert.ok(
    validatePilotConfig(config, raw).some((error) =>
      error.includes("UPLOAD_MAX_BYTES"),
    ),
  );

  config.vars.UPLOAD_MAX_BYTES = String(25 * 1024 * 1024);
  config.vars.REMEDIATION_MAX_RUN_MINUTES = "26";
  assert.ok(
    validatePilotConfig(config, raw).some((error) =>
      error.includes("REMEDIATION_MAX_RUN_MINUTES"),
    ),
  );

  config.vars.REMEDIATION_MAX_RUN_MINUTES = "25";
  assert.deepEqual(validatePilotConfig(config, raw), []);
});
