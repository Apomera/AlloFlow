import OAuthProvider from "@cloudflare/workers-oauth-provider";
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
import {
  PILOT_SCOPES,
  getPilotConfig,
  pilotReadiness,
  type PilotEnv,
} from "./pilot-env";
import {
  cleanupInstitutionPilot,
} from "./pilot-operations";
import { createServer } from "./pilot-server";
export { RemediationContainer } from "./remediation-container";
export { RemediationWorkflow } from "./remediation-workflow";
import { guardClientRegistration } from "./registration-guard";
import { boundProtocolRequest } from "./request-bounds";
import { jsonError, noStoreHeaders } from "./security";

const AUTHORIZATION_SERVER_METADATA_PATH =
  "/.well-known/oauth-authorization-server";

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
    ctx.waitUntil(
      Promise.all([
        createOAuthProvider(env).purgeExpiredData(env, {
          batchSize: 50,
        }),
        cleanupInstitutionPilot(env),
      ])
        .then(([oauth, pilot]) => {
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
        })
        .catch((error: unknown) => {
          console.error(
            JSON.stringify({
              event: "pilot_cleanup_failed",
              errorType:
                error instanceof Error ? error.name : "UnknownError",
            }),
          );
        }),
    );
  },
} satisfies ExportedHandler<PilotEnv>;

export default worker;

