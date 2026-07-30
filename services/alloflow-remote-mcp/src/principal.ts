import { getMcpAuthContext } from "agents/mcp/server";

import {
  PILOT_SCOPES,
  type PilotEnv,
  type PilotPrincipal,
  type PilotScope,
} from "./pilot-env";
import { principalIsBoundToEnvironment } from "./principal-binding";
import { PilotError } from "./security";

const PILOT_SCOPE_SET = new Set<string>(PILOT_SCOPES);

function isPrincipal(value: unknown): value is PilotPrincipal {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PilotPrincipal>;
  return (
    typeof candidate.institutionId === "string" &&
    /^[A-Za-z0-9_-]{8,80}$/u.test(candidate.institutionId) &&
    typeof candidate.ownerId === "string" &&
    /^[A-Za-z0-9_-]{20,80}$/u.test(candidate.ownerId) &&
    typeof candidate.upstreamSubject === "string" &&
    candidate.upstreamSubject.length > 0 &&
    candidate.upstreamSubject.length <= 512 &&
    Array.isArray(candidate.scopes) &&
    candidate.scopes.every(
      (scope) => typeof scope === "string" && PILOT_SCOPE_SET.has(scope),
    )
  );
}

export async function requirePrincipal(
  requiredScope: PilotScope,
  env: PilotEnv,
): Promise<PilotPrincipal> {
  const context = getMcpAuthContext();
  if (!isPrincipal(context?.props)) {
    throw new PilotError("authentication_required", 401);
  }
  if (!context.props.scopes.includes(requiredScope)) {
    throw new PilotError("insufficient_scope", 403);
  }
  if (!(await principalIsBoundToEnvironment(context.props, env))) {
    throw new PilotError("authentication_required", 401);
  }
  return context.props;
}

