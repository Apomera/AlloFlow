import type { PilotEnv } from "./pilot-env";
import { noStoreHeaders } from "./security";

const REGISTRATION_PATH = "/register";
const RETRY_AFTER_SECONDS = 60;

function registrationResponse(
  error: string,
  status: number,
  retryAfter?: number,
): Response {
  const headers = noStoreHeaders();
  if (retryAfter !== undefined) {
    headers.set("Retry-After", String(retryAfter));
  }
  return Response.json(
    { ok: false, error },
    { status, headers },
  );
}

/**
 * DCR is intentionally public for Claude's OAuth public client, but it writes
 * 30-day client records. Bound the anonymous write surface before delegating
 * to OAuthProvider. Cloudflare's limiter is per-location/eventually
 * consistent, so the runbook also requires a zone-level rate-limit rule.
 */
export async function guardClientRegistration(
  request: Request,
  env: PilotEnv,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (
    request.method !== "POST" ||
    url.pathname !== REGISTRATION_PATH
  ) {
    return undefined;
  }

  if (!env.DCR_RATE_LIMITER || !env.INSTITUTION_ID) {
    return registrationResponse(
      "registration_temporarily_unavailable",
      503,
    );
  }

  try {
    const { success } = await env.DCR_RATE_LIMITER.limit({
      key: `dcr:${env.INSTITUTION_ID}:claude-public-client`,
    });
    return success
      ? undefined
      : registrationResponse(
          "registration_rate_limited",
          429,
          RETRY_AFTER_SECONDS,
        );
  } catch {
    return registrationResponse(
      "registration_temporarily_unavailable",
      503,
    );
  }
}
