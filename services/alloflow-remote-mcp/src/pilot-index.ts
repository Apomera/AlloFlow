import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { getContainer } from "@cloudflare/containers";
export { ContainerProxy } from "@cloudflare/containers";
import { createMcpHandler } from "agents/mcp/server";

import {
  handleAuthorizationRequest,
  isTransferAccessConfigured,
  revalidateAccessGrant,
  validateClientRegistration,
} from "./access-auth";
import { handleDocumentTransfer } from "./document-transfer";
import {
  REMOTE_MCP_VERSION,
  getRemoteCapabilities,
} from "./pilot-capabilities";
import { checkDatabaseReleaseReadiness } from "./database-release";
import {
  PILOT_CHECKPOINT_SCHEMA_VERSION,
  PILOT_DATABASE_SCHEMA_VERSION,
  PILOT_RUNNER_PROTOCOL_VERSION,
  PILOT_SCOPES,
  getPilotConfig,
  pilotReadiness,
  type PilotEnv,
} from "./pilot-env";
import { emitPilotMetric, workerRelease } from "./pilot-telemetry";
import {
  cleanupInstitutionPilot,
} from "./pilot-operations";
import { createServer } from "./pilot-server";
import { RemediationContainer } from "./remediation-container";
export { RemediationContainer };
export { RemediationWorkflow } from "./remediation-workflow";
import {
  assessRunnerCompatibility,
  type RunnerBuildIdentity,
} from "./release-contract";
import { expectedRunnerBuildForModel } from "./runner-release-contract";
import { guardClientRegistration } from "./registration-guard";
import { boundProtocolRequest } from "./request-bounds";
import {
  constantTimeEqual,
  jsonError,
  noStoreHeaders,
} from "./security";

const AUTHORIZATION_SERVER_METADATA_PATH =
  "/.well-known/oauth-authorization-server";
const RELEASE_CANARY_CONTAINER_ID = "release-canary-v1";

function releaseInfo(env: PilotEnv) {
  return {
    workerVersionId: workerRelease(env),
    workerVersionTag: env.CF_VERSION_METADATA?.tag || "local",
    workerVersionTimestamp:
      env.CF_VERSION_METADATA?.timestamp || null,
    databaseSchema: PILOT_DATABASE_SCHEMA_VERSION,
    checkpointSchema: PILOT_CHECKPOINT_SCHEMA_VERSION,
    runnerProtocol: PILOT_RUNNER_PROTOCOL_VERSION,
  };
}

function releaseCanaryAuthorized(
  request: Request,
  env: PilotEnv,
): boolean {
  const authorization = request.headers.get("Authorization") || "";
  const prefix = "Bearer ";
  const secret = env.RELEASE_CANARY_SECRET || "";
  return (
    secret.length >= 32 &&
    authorization.length <= 512 &&
    authorization.startsWith(prefix) &&
    constantTimeEqual(authorization.slice(prefix.length), secret)
  );
}

async function runnerReleaseReadiness(env: PilotEnv): Promise<{
  ok: boolean;
  issues: string[];
  runner: ReturnType<typeof assessRunnerCompatibility>["runner"];
}> {
  if (!env.REMEDIATION_CONTAINER || !env.GEMINI_MODEL) {
    return {
      ok: false,
      issues: ["runner_not_configured"],
      runner: null,
    };
  }
  const expectedBuild = (await expectedRunnerBuildForModel(
    env.GEMINI_MODEL,
  )) satisfies RunnerBuildIdentity;
  const container = getContainer<RemediationContainer>(
    env.REMEDIATION_CONTAINER as DurableObjectNamespace<RemediationContainer>,
    RELEASE_CANARY_CONTAINER_ID,
  );
  const health = await container.probeRunnerHealth();
  return assessRunnerCompatibility(health, expectedBuild);
}

async function enforcePublicClientDiscoveryMetadata(
  request: Request,
  response: Response,
): Promise<Response> {
  if (
    new URL(request.url).pathname !==
      AUTHORIZATION_SERVER_METADATA_PATH ||
    request.method === "OPTIONS" ||
    !response.ok
  ) {
    return response;
  }

  const metadata = (await response.json()) as unknown;
  if (
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return Response.json(
      { ok: false, error: "oauth_metadata_invalid" },
      { status: 500, headers: noStoreHeaders() },
    );
  }

  const headers = new Headers(response.headers);
  headers.set("Content-Type", "application/json");
  return new Response(
    JSON.stringify({
      ...metadata,
      token_endpoint_auth_methods_supported: ["none"],
    }),
    {
      status: response.status,
      statusText: response.statusText,
      headers,
    },
  );
}

function createStatelessHandler(env: PilotEnv) {
  const readiness = pilotReadiness(env);
  const config = readiness.configured ? getPilotConfig(env) : undefined;
  const hostname = config ? new URL(config.origin).hostname : undefined;
  return createMcpHandler(createServer, {
    route: "/mcp",
    legacy: "stateless",
    responseMode: "auto",
    allowedHostnames: hostname ? [hostname] : undefined,
    allowedOriginHostnames: hostname
      ? [hostname, "claude.ai", "claude.com", "chatgpt.com"]
      : undefined,
    onerror(error) {
      console.error(
        JSON.stringify({
          event: "mcp_request_failed",
          errorType: error.name || "Error",
        }),
      );
    },
  });
}

async function publicResponse(
  request: Request,
  env: PilotEnv,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  const baseCapabilities = getRemoteCapabilities(env);
  const transferIdentityReady = isTransferAccessConfigured(env);
  const capabilities = transferIdentityReady
    ? baseCapabilities
    : {
        ...baseCapabilities,
        documentRemediationConfigured: false,
        documentToolsEnabled: false,
        documentIntake: "not-configured" as const,
        note: baseCapabilities.documentRemediationConfigured
          ? "The pilot is fail-closed until a path-scoped Cloudflare Access application audience is configured for browser transfers."
          : baseCapabilities.note,
      };

  if (request.method === "GET" && url.pathname === "/healthz") {
    return Response.json(
      {
        ok: true,
        service: "alloflow-remediation-remote-mcp",
        version: REMOTE_MCP_VERSION,
        release: releaseInfo(env),
        protocol: "mcp-streamable-http",
        protocolState: "stateless",
        documentRemediationConfigured:
          capabilities.documentRemediationConfigured,
        documentToolsEnabled:
          capabilities.documentToolsEnabled,
      },
      { headers: noStoreHeaders() },
    );
  }

  if (
    request.method === "GET" &&
    url.pathname === "/readyz" &&
    !url.search
  ) {
    if (!releaseCanaryAuthorized(request, env)) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        {
          status: 401,
          headers: noStoreHeaders({
            "WWW-Authenticate": 'Bearer realm="release-canary"',
          }),
        },
      );
    }
    const [database, runnerResult] = await Promise.all([
      checkDatabaseReleaseReadiness(env.PILOT_DB),
      runnerReleaseReadiness(env).catch(() => ({
        ok: false,
        issues: ["runner_probe_failed"],
        runner: null,
      })),
    ]);
    const releaseReady = database.ok && runnerResult.ok;
    const releaseIssues = [...database.issues, ...runnerResult.issues];
    emitPilotMetric(env, "release_canary", {
      outcome: releaseReady ? "success" : "failed",
      stage: database.ok ? "runner" : "database",
    });
    return Response.json(
      {
        ok: releaseReady,
        service: "alloflow-remediation-remote-mcp",
        version: REMOTE_MCP_VERSION,
        release: releaseInfo(env),
        database: {
          ok: database.ok,
          schema: database.schema,
          admissionsOpen: database.admissionsOpen,
        },
        runner: runnerResult.runner,
        compatibility: {
          ok: releaseReady,
          issues: releaseIssues,
        },
      },
      {
        status: releaseReady ? 200 : 503,
        headers: noStoreHeaders(),
      },
    );
  }

  if (request.method === "GET" && url.pathname === "/") {
    return Response.json(
      {
        service: "AlloFlow Remediation Remote MCP",
        mcpEndpoint: "/mcp",
        healthEndpoint: "/healthz",
        ...capabilities,
      },
      { headers: noStoreHeaders() },
    );
  }

  if (request.method === "GET" && url.pathname === "/robots.txt") {
    return new Response("User-agent: *\nDisallow: /\n", {
      headers: noStoreHeaders({
        "Content-Type": "text/plain; charset=utf-8",
      }),
    });
  }

  return undefined;
}

function defaultHandler() {
  return {
    async fetch(
      request: Request,
      env: PilotEnv,
      _ctx: ExecutionContext,
    ): Promise<Response> {
      try {
        const authorization = await handleAuthorizationRequest(
          request,
          env,
        );
        if (authorization) {
          return authorization;
        }
        const transfer = await handleDocumentTransfer(request, env);
        if (transfer) {
          return transfer;
        }
        const publicResult = await publicResponse(request, env);
        if (publicResult) {
          return publicResult;
        }
        return Response.json(
          { ok: false, error: "not_found" },
          { status: 404, headers: noStoreHeaders() },
        );
      } catch (error) {
        return jsonError(error);
      }
    },
  } satisfies ExportedHandler<PilotEnv>;
}

function createOAuthProvider(env: PilotEnv) {
  const config = getPilotConfig(env);
  const mcp = createStatelessHandler(env);
  const apiHandler = {
    fetch(
      request: Request,
      innerEnv: PilotEnv,
      ctx: ExecutionContext,
    ): Promise<Response> {
      return mcp(request, innerEnv, ctx);
    },
  } satisfies ExportedHandler<PilotEnv>;

  return new OAuthProvider<PilotEnv>({
    apiRoute: `${config.origin}/mcp`,
    apiHandler,
    defaultHandler: defaultHandler(),
    authorizeEndpoint: "/authorize",
    tokenEndpoint: "/token",
    clientRegistrationEndpoint: "/register",
    scopesSupported: [...PILOT_SCOPES],
    accessTokenTTL: 60 * 60,
    refreshTokenTTL: 7 * 24 * 60 * 60,
    clientRegistrationTTL: 30 * 24 * 60 * 60,
    allowImplicitFlow: false,
    allowPlainPKCE: false,
    allowTokenExchangeGrant: false,
    disallowPublicClientRegistration: false,
    clientIdMetadataDocumentEnabled: false,
    resourceMatchOriginOnly: false,
    resourceMetadata: {
      resource: `${config.origin}/mcp`,
      authorization_servers: [config.origin],
      scopes_supported: [...PILOT_SCOPES],
      bearer_methods_supported: ["header"],
      resource_name: "AlloFlow Remediation",
    },
    clientRegistrationCallback({ clientMetadata }) {
      return validateClientRegistration(clientMetadata, env);
    },
    tokenExchangeCallback(options) {
      return revalidateAccessGrant(options, env);
    },
    onError({ code, status }) {
      console.warn(
        JSON.stringify({
          event: "oauth_request_rejected",
          code,
          status,
        }),
      );
    },
  });
}

const worker = {
  async fetch(
    request: Request,
    env: PilotEnv,
    ctx: ExecutionContext,
  ): Promise<Response> {
    try {
      request = await boundProtocolRequest(request);
    } catch (error) {
      return jsonError(error);
    }

    const readiness = pilotReadiness(env);

    if (!readiness.enabled) {
      const publicResult = await publicResponse(request, env);
      if (publicResult) {
        return publicResult;
      }
      const handler = createStatelessHandler(env);
      return handler(request, env, ctx);
    }

    if (!readiness.configured) {
      const publicResult = await publicResponse(request, env);
      if (publicResult) {
        return publicResult;
      }
      return Response.json(
        { ok: false, error: "pilot_not_configured" },
        { status: 503, headers: noStoreHeaders() },
      );
    }

    if (!isTransferAccessConfigured(env)) {
      const publicResult = await publicResponse(request, env);
      if (publicResult) {
        return publicResult;
      }
      return Response.json(
        {
          ok: false,
          error: "pilot_transfer_identity_not_configured",
        },
        { status: 503, headers: noStoreHeaders() },
      );
    }

    const registrationGuard = await guardClientRegistration(request, env);
    if (registrationGuard) {
      return registrationGuard;
    }

    const oauthResponse = await createOAuthProvider(env).fetch(
      request,
      env,
      ctx,
    );
    return enforcePublicClientDiscoveryMetadata(
      request,
      oauthResponse,
    );
  },

  scheduled(
    _controller: ScheduledController,
    env: PilotEnv,
    ctx: ExecutionContext,
  ): void {
    if (!pilotReadiness(env).configured) {
      console.warn(
        JSON.stringify({ event: "pilot_cleanup_skipped" }),
      );
      return;
    }
    const startedAt = Date.now();
    ctx.waitUntil(
      Promise.allSettled([
        createOAuthProvider(env).purgeExpiredData(env, {
          batchSize: 50,
        }),
        cleanupInstitutionPilot(env),
      ]).then(([oauthResult, pilotResult]) => {
        if (oauthResult.status === "rejected") {
          console.error(
            JSON.stringify({
              event: "oauth_cleanup_failed",
              errorType:
                oauthResult.reason instanceof Error
                  ? oauthResult.reason.name
                  : "UnknownError",
            }),
          );
        }
        if (pilotResult.status === "rejected") {
          emitPilotMetric(env, "pilot_cleanup_failed", {
            outcome: "failed",
            durationMs: Date.now() - startedAt,
          });
          return;
        }
        const pilot = pilotResult.value;
        emitPilotMetric(env, "pilot_cleanup_complete", {
          outcome:
            oauthResult.status === "fulfilled"
              ? "complete"
              : "pilot_only",
          durationMs: Date.now() - startedAt,
        });
        if (oauthResult.status === "fulfilled") {
          const oauth = oauthResult.value;
          console.info(
            JSON.stringify({
              event: "pilot_cleanup_complete",
              oauth: {
                grantsPurged: oauth.grantsPurged,
                tokensPurged: oauth.tokensPurged,
              },
              pilot,
            }),
          );
        }
      }),
    );
  },
} satisfies ExportedHandler<PilotEnv>;

export default worker;
