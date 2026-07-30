import { describe, expect, it } from "vitest";

import {
  PILOT_TOOL_SECURITY_SCHEMES,
  pilotToolFailure,
} from "../src/chatgpt-auth";
import {
  getPilotConfig,
  validateChatGptRedirectUri,
  type PilotEnv,
} from "../src/pilot-env";
import { PilotError } from "../src/security";

const CHATGPT_REDIRECT_URI =
  "https://chatgpt.com/connector/oauth/callback_123";

function authEnv(): PilotEnv {
  return {
    PUBLIC_ORIGIN: "https://mcp.district.example",
    INSTITUTION_ID: "district_opaque_01",
    CHATGPT_REDIRECT_URI,
  };
}

describe("ChatGPT MCP authentication compatibility", () => {
  it("requires the exact app-managed ChatGPT redirect URL", () => {
    expect(validateChatGptRedirectUri(CHATGPT_REDIRECT_URI)).toBe(
      CHATGPT_REDIRECT_URI,
    );
    expect(getPilotConfig(authEnv()).chatGptRedirectUri).toBe(
      CHATGPT_REDIRECT_URI,
    );

    for (const invalidRedirect of [
      undefined,
      "https://chatgpt.com/connector/oauth/*",
      "https://chatgpt.com/connector/oauth/callback_123?tenant=one",
      "https://chatgpt.com/connector/oauth/callback_123#fragment",
      "http://chatgpt.com/connector/oauth/callback_123",
      "https://user@chatgpt.com/connector/oauth/callback_123",
      "https://example.com/connector/oauth/callback_123",
      "https://chatgpt.com/connector/oauth",
      "https://chatgpt.com/connector/oauth/callback_123/extra",
      "https://CHATGPT.com/connector/oauth/callback_123",
      "https://chatgpt.com:443/connector/oauth/callback_123",
    ] satisfies Array<string | undefined>) {
      expect(() =>
        validateChatGptRedirectUri(invalidRedirect),
      ).toThrow("invalid_pilot_configuration");
    }
  });

  it("publishes least-privilege security schemes for every tool", () => {
    expect(PILOT_TOOL_SECURITY_SCHEMES).toEqual({
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
    });
  });

  it("returns a linking challenge when authentication is absent", () => {
    const result = pilotToolFailure(
      new PilotError("authentication_required", 401),
      authEnv(),
      ["documents:read"],
    );

    expect(result).toMatchObject({
      isError: true,
      _meta: {
        "mcp/www_authenticate": [expect.stringContaining("Bearer ")],
      },
    });
    const challenge = (
      result as {
        _meta: { "mcp/www_authenticate": string[] };
      }
    )._meta["mcp/www_authenticate"][0];
    expect(challenge).toContain('error="invalid_token"');
    expect(challenge).toContain("error_description=");
    expect(challenge).toContain('scope="documents:read"');
    expect(challenge).toContain(
      'resource_metadata="https://mcp.district.example/.well-known/oauth-protected-resource/mcp"',
    );
  });

  it("returns an insufficient-scope linking challenge", () => {
    const result = pilotToolFailure(
      new PilotError("insufficient_scope", 403),
      authEnv(),
      ["documents:delete"],
    );
    const challenge = (
      result as {
        _meta: { "mcp/www_authenticate": string[] };
      }
    )._meta["mcp/www_authenticate"][0];

    expect(result).toMatchObject({ isError: true });
    expect(challenge).toContain('error="insufficient_scope"');
    expect(challenge).toContain('scope="documents:delete"');
  });

  it("does not present account linking for non-auth failures", () => {
    const result = pilotToolFailure(
      new PilotError("operation_failed", 500),
      authEnv(),
      ["documents:read"],
    );

    expect(result).toMatchObject({ isError: true });
    expect(result).not.toHaveProperty("_meta");
  });
});
