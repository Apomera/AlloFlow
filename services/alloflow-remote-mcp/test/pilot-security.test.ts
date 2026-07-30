import { describe, expect, it, vi } from "vitest";
import { SignJWT, exportJWK, generateKeyPair } from "jose";

vi.mock("@cloudflare/workers-oauth-provider", () => ({
  OAuthError: class OAuthError extends Error {
    constructor(
      readonly code: string,
      readonly description?: string,
    ) {
      super(description ?? code);
    }
  },
}));

import {
  handleAuthorizationRequest,
  requireTransferPrincipal,
  validateClientRegistration,
} from "../src/access-auth";
import {
  handleDocumentTransfer,
  resultObjectMatchesJob,
} from "../src/document-transfer";
import {
  REQUIRED_PILOT_ACCEPTANCE_VERSION,
  getPilotConfig,
  pilotReadiness,
  type PilotEnv,
} from "../src/pilot-env";
import { principalIsBoundToEnvironment } from "../src/principal-binding";
import {
  constantTimeEqual,
  randomToken,
  readJson,
  sha256Base64Url,
} from "../src/security";

function completePilotEnv(
  overrides: Partial<PilotEnv> = {},
): PilotEnv {
  return {
    PILOT_ENABLED: "true",
    PUBLIC_ORIGIN: "https://mcp.district.example",
    INSTITUTION_ID: "district_opaque_01",
    CHATGPT_REDIRECT_URI:
      "https://chatgpt.com/connector/oauth/callback_123",
    PILOT_ACCEPTANCE_VERSION: REQUIRED_PILOT_ACCEPTANCE_VERSION,
    ACCESS_AUTHORIZATION_URL:
      "https://district.cloudflareaccess.com/authorize",
    ACCESS_TOKEN_URL:
      "https://district.cloudflareaccess.com/token",
    ACCESS_JWKS_URL:
      "https://district.cloudflareaccess.com/jwks",
    ACCESS_ISSUER:
      "https://district.cloudflareaccess.com/issuer",
    ACCESS_CLIENT_ID: "public-client-id",
    ACCESS_CLIENT_SECRET: "0123456789abcdef0123456789abcdef",
    GEMINI_API_KEY: "0123456789abcdef0123456789abcdef",
    GEMINI_MODEL: "gemini-approved-model",
    RUNNER_AUTH_SECRET:
      "0123456789abcdef0123456789abcdef0123456789abcdef",
    TRANSFER_ACCESS_AUDIENCE:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    OAUTH_KV: {} as KVNamespace,
    PILOT_DB: {} as D1Database,
    DOCUMENTS: {} as R2Bucket,
    REMEDIATION_WORKFLOW: {} as Workflow<{ jobId: string }>,
    REMEDIATION_CONTAINER:
      {} as PilotEnv["REMEDIATION_CONTAINER"],
    DCR_RATE_LIMITER: {
      limit: vi.fn(async () => ({ success: true })),
    } as unknown as RateLimit,
    ...overrides,
  };
}

describe("institution pilot security primitives", () => {
  it("revalidates the final R2 PDF metadata before download", () => {
    const digest = new Uint8Array(32);
    digest.fill(0xab);
    const job = {
      result_size_bytes: 1024,
      result_sha256: "ab".repeat(32),
    };
    const object = {
      size: 1024,
      httpMetadata: { contentType: "application/pdf" },
      checksums: { sha256: digest.buffer },
    };

    expect(resultObjectMatchesJob(job, object)).toBe(true);
    expect(
      resultObjectMatchesJob(
        { ...job, result_size_bytes: 1025 },
        object,
      ),
    ).toBe(false);
    expect(
      resultObjectMatchesJob(job, {
        ...object,
        httpMetadata: { contentType: "application/octet-stream" },
      }),
    ).toBe(false);
    expect(
      resultObjectMatchesJob(job, {
        ...object,
        checksums: { sha256: new Uint8Array(32).buffer },
      }),
    ).toBe(false);
  });

  it("generates URL-safe 256-bit capability grants", () => {
    const first = randomToken();
    const second = randomToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(first).not.toBe(second);
  });

  it("hashes grants deterministically without retaining the raw value", async () => {
    expect(await sha256Base64Url("test")).toBe(
      "n4bQgYhMfWWaL-qgxVrQFaO_TxsrC4Is0V1sFbDwCgg",
    );
    expect(constantTimeEqual("same", "same")).toBe(true);
    expect(constantTimeEqual("same", "different")).toBe(false);
  });

  it("uses bounded conservative retention defaults", () => {
    expect(getPilotConfig(completePilotEnv())).toMatchObject({
      origin: "https://mcp.district.example",
      institutionId: "district_opaque_01",
      uploadMaxBytes: 25 * 1024 * 1024,
      uploadTtlSeconds: 600,
      unstartedInputTtlSeconds: 7200,
      outputTtlSeconds: 86400,
      downloadGraceSeconds: 3600,
      metadataTtlSeconds: 604800,
      remediationMaxRunMinutes: 25,
      maxOpenUploadsPerOwner: 3,
      maxUploadAttemptsPerOwner24h: 20,
      maxUploadAttemptsPerInstitution24h: 100,
      maxActiveJobsPerOwner: 1,
      maxActiveJobsPerInstitution: 2,
      maxJobsPerOwner24h: 10,
      maxJobsPerInstitution24h: 50,
    });
  });

  it("enforces bounded workload-admission quotas", () => {
    expect(
      getPilotConfig(
        completePilotEnv({
          MAX_OPEN_UPLOADS_PER_OWNER: "20",
          MAX_UPLOAD_ATTEMPTS_PER_OWNER_24H: "1000",
          MAX_UPLOAD_ATTEMPTS_PER_INSTITUTION_24H: "10000",
          MAX_ACTIVE_JOBS_PER_OWNER: "2",
          MAX_ACTIVE_JOBS_PER_INSTITUTION: "2",
          MAX_JOBS_PER_OWNER_24H: "1000",
          MAX_JOBS_PER_INSTITUTION_24H: "10000",
        }),
      ),
    ).toMatchObject({
      maxOpenUploadsPerOwner: 20,
      maxUploadAttemptsPerOwner24h: 1000,
      maxUploadAttemptsPerInstitution24h: 10000,
      maxActiveJobsPerOwner: 2,
      maxActiveJobsPerInstitution: 2,
      maxJobsPerOwner24h: 1000,
      maxJobsPerInstitution24h: 10000,
    });

    for (const overrides of [
      { MAX_OPEN_UPLOADS_PER_OWNER: "0" },
      { MAX_UPLOAD_ATTEMPTS_PER_OWNER_24H: "1001" },
      { MAX_UPLOAD_ATTEMPTS_PER_INSTITUTION_24H: "10001" },
      { MAX_ACTIVE_JOBS_PER_OWNER: "3" },
      { MAX_ACTIVE_JOBS_PER_INSTITUTION: "3" },
      { MAX_ACTIVE_JOBS_PER_INSTITUTION: "1.5" },
      { MAX_JOBS_PER_OWNER_24H: "1001" },
      { MAX_JOBS_PER_INSTITUTION_24H: "10001" },
      { UPLOAD_MAX_BYTES: String(25 * 1024 * 1024 + 1) },
      { REMEDIATION_MAX_RUN_MINUTES: "26" },
      {
        MAX_UPLOAD_ATTEMPTS_PER_OWNER_24H: "51",
        MAX_UPLOAD_ATTEMPTS_PER_INSTITUTION_24H: "50",
      },
      {
        MAX_ACTIVE_JOBS_PER_OWNER: "2",
        MAX_ACTIVE_JOBS_PER_INSTITUTION: "1",
      },
      {
        MAX_JOBS_PER_OWNER_24H: "51",
        MAX_JOBS_PER_INSTITUTION_24H: "50",
      },
    ] satisfies Array<Partial<PilotEnv>>) {
      expect(() =>
        getPilotConfig(completePilotEnv(overrides)),
      ).toThrow("invalid_pilot_configuration");
    }
  });

  it("rejects origins with credentials or a path", () => {
    expect(() =>
      getPilotConfig(
        completePilotEnv({
          PUBLIC_ORIGIN: "https://user:pass@mcp.district.example",
        }),
      ),
    ).toThrow("invalid_pilot_configuration");
    expect(() =>
      getPilotConfig(
        completePilotEnv({
          PUBLIC_ORIGIN: "https://mcp.district.example/connector",
        }),
      ),
    ).toThrow("invalid_pilot_configuration");
  });

  it("fails closed for missing or weak institution configuration", () => {
    expect(pilotReadiness({}).ready).toBe(false);
    expect(
      pilotReadiness(
        completePilotEnv({ RUNNER_AUTH_SECRET: "too-short" }),
      ),
    ).toMatchObject({
      enabled: true,
      ready: false,
      missing: ["INVALID_CONFIGURATION"],
    });
  });

  it("advertises readiness only when every boundary validates", () => {
    expect(pilotReadiness(completePilotEnv())).toEqual({
      enabled: true,
      configured: true,
      accepted: true,
      ready: true,
      missing: [],
    });
  });

  it("disables transfer routes when pilot acceptance is withdrawn", async () => {
    const uploadId = `upl_${"a".repeat(32)}`;
    const response = await handleDocumentTransfer(
      new Request(`https://mcp.district.example/upload/${uploadId}`),
      completePilotEnv({ PILOT_ACCEPTANCE_VERSION: undefined }),
    );
    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toMatchObject({
      ok: false,
      error: "pilot_acceptance_required",
    });
  });

  it("preserves Claude and allows only the configured ChatGPT callback", () => {
    const env = completePilotEnv();
    const registration = (redirectUri: string) => ({
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    });

    expect(
      validateClientRegistration(
        registration("https://claude.ai/api/mcp/auth_callback"),
        env,
      ),
    ).toBeUndefined();
    expect(
      validateClientRegistration(
        registration(
          "https://chatgpt.com/connector/oauth/callback_123",
        ),
        env,
      ),
    ).toBeUndefined();
    for (const rejected of [
      "https://chatgpt.com/connector/oauth/a-different-app",
      "https://chatgpt.com/connector/oauth/callback_123?tenant=one",
      "https://chatgpt.com/connector/oauth/*",
    ]) {
      expect(
        validateClientRegistration(registration(rejected), env),
      ).toEqual({ description: "The redirect URI is not allowed." });
    }
  });

  it.each([
    ["an omitted method", undefined],
    ["client_secret_basic", "client_secret_basic"],
    ["client_secret_post", "client_secret_post"],
  ])(
    "rejects %s at dynamic client registration",
    (_label, tokenEndpointAuthMethod) => {
      const registration: Record<string, unknown> = {
        redirect_uris: [
          "https://claude.ai/api/mcp/auth_callback",
        ],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      };
      if (tokenEndpointAuthMethod !== undefined) {
        registration.token_endpoint_auth_method =
          tokenEndpointAuthMethod;
      }

      expect(
        validateClientRegistration(
          registration,
          completePilotEnv(),
        ),
      ).toEqual({
        description:
          "The institution pilot accepts public PKCE clients only.",
      });
    },
  );

  it("fails closed when a browser transfer lacks an Access assertion", async () => {
    const uploadId = `upl_${"a".repeat(32)}`;
    const response = await handleDocumentTransfer(
      new Request(`https://mcp.district.example/upload/${uploadId}`),
      completePilotEnv(),
    );
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toMatchObject({
      ok: false,
      error: "transfer_identity_required",
    });
  });

  it("binds OAuth principals to the current institution and subject hash", async () => {
    const environment = completePilotEnv();
    const upstreamSubject = "access-user-opaque-123";
    const valid = {
      institutionId: "district_opaque_01",
      ownerId: await sha256Base64Url(
        `district_opaque_01\u0000${upstreamSubject}`,
      ),
      upstreamSubject,
    };

    await expect(
      principalIsBoundToEnvironment(valid, environment),
    ).resolves.toBe(true);
    await expect(
      principalIsBoundToEnvironment(
        { ...valid, institutionId: "district_opaque_02" },
        environment,
      ),
    ).resolves.toBe(false);
    await expect(
      principalIsBoundToEnvironment(
        { ...valid, ownerId: "a".repeat(43) },
        environment,
      ),
    ).resolves.toBe(false);
  });

  it("derives the same opaque owner from a verified Access app token", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    publicJwk.kid = "transfer-test-key";
    publicJwk.alg = "RS256";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ keys: [publicJwk] });
    try {
      const now = Math.floor(Date.now() / 1000);
      const subject = "access-user-opaque-123";
      const assertion = await new SignJWT({ type: "app" })
        .setProtectedHeader({
          alg: "RS256",
          kid: "transfer-test-key",
        })
        .setIssuer("https://district.cloudflareaccess.com/issuer")
        .setAudience(
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        )
        .setSubject(subject)
        .setIssuedAt(now)
        .setNotBefore(now)
        .setExpirationTime(now + 15 * 60)
        .sign(privateKey);
      const principal = await requireTransferPrincipal(
        new Request(
          "https://mcp.district.example/upload/upl_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          {
            headers: {
              "Cf-Access-Jwt-Assertion": assertion,
            },
          },
        ),
        completePilotEnv(),
      );
      expect(principal).toEqual({
        institutionId: "district_opaque_01",
        ownerId: await sha256Base64Url(
          `district_opaque_01\u0000${subject}`,
        ),
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("streams and parses bounded JSON responses", async () => {
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('{"ok":true,"count":2}'),
          );
          controller.close();
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    );

    await expect(
      readJson<{ ok: boolean; count: number }>(response, 64),
    ).resolves.toEqual({ ok: true, count: 2 });
  });

  it("cancels an oversized JSON stream without Content-Length", async () => {
    let cancelled = false;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"ok":'));
          controller.enqueue(new Uint8Array(32));
        },
        cancel() {
          cancelled = true;
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
    expect(response.headers.get("Content-Length")).toBeNull();

    await expect(readJson(response, 8)).rejects.toMatchObject({
      code: "response_too_large",
      status: 502,
    });
    expect(cancelled).toBe(true);
  });

  it("accepts a small consent form with a media-type parameter", async () => {
    const consentId = "a".repeat(43);
    const csrf = "b".repeat(43);
    const oauthRequest = {
      responseType: "code",
      clientId: "claude-public-client",
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      scope: ["documents:upload"],
      state: "oauth-client-state",
      codeChallenge: "pkce-challenge",
      codeChallengeMethod: "S256",
      resource: "https://mcp.district.example/mcp",
    };
    const get = vi.fn(async () => ({
      oauthRequest,
      clientName: "Claude",
      csrfHash: await sha256Base64Url(csrf),
    }));
    const deleteState = vi.fn(async () => undefined);
    const put = vi.fn(async () => undefined);
    const env = completePilotEnv({
      OAUTH_KV: {
        get,
        delete: deleteState,
        put,
      } as unknown as KVNamespace,
    });
    const response = await handleAuthorizationRequest(
      new Request("https://mcp.district.example/authorize", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: `alloflow_consent=${csrf}`,
        },
        body: new URLSearchParams({ consent_id: consentId }),
      }),
      env,
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get("Location")).toMatch(
      /^https:\/\/district\.cloudflareaccess\.com\/authorize\?/u,
    );
    expect(get).toHaveBeenCalledWith(
      `alloflow:consent:${consentId}`,
      "json",
    );
    expect(deleteState).toHaveBeenCalledWith(
      `alloflow:consent:${consentId}`,
    );
    expect(put).toHaveBeenCalledOnce();
  });

  it("cancels an oversized consent stream without Content-Length", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(4096));
        controller.enqueue(new Uint8Array(4097));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request(
      "https://mcp.district.example/authorize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        duplex: "half",
      } as RequestInit & { duplex: "half" },
    );
    expect(request.headers.get("Content-Length")).toBeNull();

    await expect(
      handleAuthorizationRequest(request, completePilotEnv()),
    ).rejects.toMatchObject({
      code: "invalid_request",
      status: 413,
    });
    expect(cancelled).toBe(true);
  });

  it("rejects content types that only prefix-match the consent media type", async () => {
    const request = new Request(
      "https://mcp.district.example/authorize",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded-malformed",
        },
        body: "consent_id=ignored",
      },
    );

    await expect(
      handleAuthorizationRequest(request, completePilotEnv()),
    ).rejects.toMatchObject({
      code: "invalid_request",
      status: 400,
    });
  });
});

