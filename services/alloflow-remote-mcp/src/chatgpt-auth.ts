import {
  OAuthError,
  OAuthErrorCode,
  bearerAuthChallengeResponse,
  getOAuthProtectedResourceMetadataUrl,
  type McpServer,
} from "@modelcontextprotocol/server";

import { PILOT_TOOL_NAMES } from "./pilot-capabilities";
import {
  getPilotConfig,
  type PilotEnv,
  type PilotScope,
} from "./pilot-env";
import { PilotError } from "./security";

type PilotToolName = (typeof PILOT_TOOL_NAMES)[number];
type ToolSecurityScheme =
  | { type: "noauth" }
  | { type: "oauth2"; scopes: readonly PilotScope[] };

export const PILOT_TOOL_SECURITY_SCHEMES = {
  remediation_capabilities: [{ type: "noauth" }],
  create_document_upload: [
    { type: "oauth2", scopes: ["documents:upload"] },
  ],
  start_remediation: [
    { type: "oauth2", scopes: ["documents:remediate"] },
  ],
  get_remediation_status: [
    { type: "oauth2", scopes: ["documents:read"] },
  ],
  get_remediation_report: [
    { type: "oauth2", scopes: ["documents:read"] },
  ],
  get_remediation_result: [
    { type: "oauth2", scopes: ["documents:read"] },
  ],
  cancel_remediation: [
    { type: "oauth2", scopes: ["documents:remediate"] },
  ],
  delete_remediation: [
    { type: "oauth2", scopes: ["documents:delete"] },
  ],
} as const satisfies Record<
  PilotToolName,
  readonly ToolSecurityScheme[]
>;

export function toolSecurityMeta(toolName: PilotToolName) {
  return {
    securitySchemes: PILOT_TOOL_SECURITY_SCHEMES[toolName],
  };
}

type WireToolDescriptor = {
  name: string;
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
};

type WireListToolsResult = {
  tools: WireToolDescriptor[];
  [key: string]: unknown;
};

type WireListToolsHandler = (
  request: unknown,
  context: unknown,
) => WireListToolsResult | Promise<WireListToolsResult>;

/**
 * @modelcontextprotocol/server 2.0.0 accepts `_meta.securitySchemes`, but its
 * high-level registerTool path does not yet accept or serialize the required
 * top-level `securitySchemes` field. Decorate only the SDK's own tools/list
 * handler so its schema conversion, enable/disable behavior, and protocol-era
 * projection remain authoritative. Remove this shim once the pinned SDK emits
 * both fields itself.
 */
export function installToolSecuritySchemesWireCompatibility(
  server: McpServer,
): void {
  const protocol = server.server;
  const originalSetRequestHandler =
    protocol.setRequestHandler.bind(protocol) as (
      method: string,
      ...args: unknown[]
    ) => void;

  protocol.setRequestHandler = ((
    method: string,
    ...args: unknown[]
  ): void => {
    if (
      method !== "tools/list" ||
      args.length !== 1 ||
      typeof args[0] !== "function"
    ) {
      originalSetRequestHandler(method, ...args);
      return;
    }

    const sdkHandler = args[0] as WireListToolsHandler;
    originalSetRequestHandler(
      method,
      async (
        request: unknown,
        context: unknown,
      ): Promise<WireListToolsResult> => {
        const result = await sdkHandler(request, context);
        if (!result || !Array.isArray(result.tools)) {
          throw new Error("invalid_tools_list_result");
        }

        return {
          ...result,
          tools: result.tools.map((tool) => {
            if (
              !tool ||
              typeof tool.name !== "string" ||
              !Object.prototype.hasOwnProperty.call(
                PILOT_TOOL_SECURITY_SCHEMES,
                tool.name,
              )
            ) {
              throw new Error("missing_tool_security_schemes");
            }
            const securitySchemes =
              PILOT_TOOL_SECURITY_SCHEMES[
                tool.name as PilotToolName
              ];
            return {
              ...tool,
              securitySchemes,
              _meta: {
                ...(tool._meta || {}),
                securitySchemes,
              },
            };
          }),
        };
      },
    );
  }) as typeof protocol.setRequestHandler;
}

function authenticationChallenge(
  error: PilotError,
  env: PilotEnv,
  requiredScopes: readonly PilotScope[],
): string | undefined {
  if (
    requiredScopes.length === 0 ||
    (error.code !== "authentication_required" &&
      error.code !== "insufficient_scope")
  ) {
    return undefined;
  }

  const oauthError =
    error.code === "insufficient_scope"
      ? new OAuthError(
          OAuthErrorCode.InsufficientScope,
          "The access token does not grant the required scope.",
        )
      : new OAuthError(
          OAuthErrorCode.InvalidToken,
          "Authentication is required for this tool.",
        );
  const config = getPilotConfig(env);
  return bearerAuthChallengeResponse(oauthError, {
    requiredScopes: [...requiredScopes],
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(
      new URL(`${config.origin}/mcp`),
    ),
  }).headers.get("WWW-Authenticate") ?? undefined;
}

export function pilotToolFailure(
  error: unknown,
  env: PilotEnv,
  requiredScopes: readonly PilotScope[] = [],
) {
  const publicError =
    error instanceof PilotError
      ? error
      : new PilotError("operation_failed", 500);
  const payload = {
    ok: false,
    error: publicError.code,
    status: publicError.status,
  };
  const challenge = authenticationChallenge(
    publicError,
    env,
    requiredScopes,
  );

  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload),
      },
    ],
    ...(challenge
      ? {
          _meta: {
            "mcp/www_authenticate": [challenge],
          },
        }
      : {}),
  };
}
