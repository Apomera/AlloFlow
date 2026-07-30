import {
  getPilotConfig,
  type PilotEnv,
  type PilotPrincipal,
} from "./pilot-env";
import {
  constantTimeEqual,
  sha256Base64Url,
} from "./security";

export async function principalIsBoundToEnvironment(
  principal: Pick<
    PilotPrincipal,
    "institutionId" | "ownerId" | "upstreamSubject"
  >,
  env: PilotEnv,
): Promise<boolean> {
  const config = getPilotConfig(env);
  if (
    principal.institutionId !== config.institutionId ||
    typeof principal.upstreamSubject !== "string" ||
    principal.upstreamSubject.length < 1 ||
    principal.upstreamSubject.length > 512
  ) {
    return false;
  }
  const expectedOwnerId = await sha256Base64Url(
    `${config.institutionId}\u0000${principal.upstreamSubject}`,
  );
  return constantTimeEqual(principal.ownerId, expectedOwnerId);
}
