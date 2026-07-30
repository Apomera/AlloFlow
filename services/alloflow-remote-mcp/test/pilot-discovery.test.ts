import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { createTestHarness } from "wrangler";

const harness = createTestHarness({
  workers: [
    {
      config: {
        name: "alloflow-pilot-discovery-test",
        main: "src/pilot-index.ts",
        compatibility_date: "2026-07-29",
        compatibility_flags: ["nodejs_compat"],
        vars: {
          PILOT_ENABLED: "true",
          PILOT_ACCEPTANCE_VERSION:
            "institution-pilot-synthetic-v2",
          PUBLIC_ORIGIN: "http://localhost",
          INSTITUTION_ID: "district_opaque_01",
          ACCESS_AUTHORIZATION_URL:
            "https://district.cloudflareaccess.com/authorize",
          ACCESS_TOKEN_URL:
            "https://district.cloudflareaccess.com/token",
          ACCESS_JWKS_URL:
            "https://district.cloudflareaccess.com/jwks",
          ACCESS_ISSUER:
            "https://district.cloudflareaccess.com/issuer",
          ACCESS_CLIENT_ID: "public-client-id",
          ACCESS_CLIENT_SECRET:
            "0123456789abcdef0123456789abcdef",
          TRANSFER_ACCESS_AUDIENCE: "0".repeat(64),
          ACCESS_SUBJECT_CLAIM: "sub",
          ALLOW_LOCAL_OAUTH: "false",
          CHATGPT_REDIRECT_URI:
            "https://chatgpt.com/connector/oauth/callback_123",
          GEMINI_API_KEY:
            "0123456789abcdef0123456789abcdef",
          GEMINI_MODEL: "gemini-approved-model",
          RUNNER_AUTH_SECRET:
            "0123456789abcdef0123456789abcdef0123456789abcdef",
        },
        kv_namespaces: [
          {
            binding: "OAUTH_KV",
            id: "00000000000000000000000000000000",
          },
        ],
        d1_databases: [
          {
            binding: "PILOT_DB",
            database_name: "pilot-test",
            database_id:
              "00000000-0000-0000-0000-000000000000",
          },
        ],
        r2_buckets: [
          {
            binding: "DOCUMENTS",
            bucket_name: "pilot-test-documents",
          },
        ],
        workflows: [
          {
            binding: "REMEDIATION_WORKFLOW",
            name: "pilot-test-workflow",
            class_name: "RemediationWorkflow",
          },
        ],
        durable_objects: {
          bindings: [
            {
              name: "REMEDIATION_CONTAINER",
              class_name: "RemediationContainer",
            },
          ],
        },
        migrations: [
          {
            tag: "v1-test",
            new_sqlite_classes: ["RemediationContainer"],
          },
        ],
        ratelimits: [
          {
            name: "DCR_RATE_LIMITER",
            namespace_id: "2026072999",
            simple: { limit: 30, period: 60 },
          },
        ],
      },
    },
  ],
});

beforeAll(async () => {
  await harness.listen();
});

afterEach(async ({ task }) => {
  if (task.result?.state === "fail") {
    harness.debug();
  }
  await harness.reset();
});

afterAll(async () => {
  await harness.close();
});

describe("institution OAuth discovery", () => {
  it("advertises only public clients with S256 PKCE", async () => {
    const response = await harness.getWorker().fetch(
      "/.well-known/oauth-authorization-server",
      {
        headers: { Origin: "https://claude.ai" },
      },
    );
    const metadata = (await response.json()) as Record<
      string,
      unknown
    >;

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://claude.ai",
    );
    expect(metadata).toMatchObject({
      authorization_endpoint: `${metadata.issuer}/authorize`,
      token_endpoint: `${metadata.issuer}/token`,
      registration_endpoint: `${metadata.issuer}/register`,
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: [
        "authorization_code",
        "refresh_token",
      ],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      client_id_metadata_document_supported: false,
    });
  });
});
