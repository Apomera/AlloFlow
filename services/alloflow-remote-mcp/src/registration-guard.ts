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
function normalizeRateLimitIp(rawIp: string | undefined): string {
  if (!rawIp || !/^[A-Fa-f0-9:.]{2,64}$/u.test(rawIp)) {
    return "";
  }
  if (!rawIp.includes(":")) {
    return rawIp;
  }
  // Aggregate IPv6 clients to their /64 prefix (first 4 hextets) so an
  // attacker cannot bypass the per-IP limiter by rotating host bits.
  const lower = rawIp.toLowerCase();
  const halves = lower.split("::");
  if (halves.length > 2) {
    return lower;
  }
  const left = halves[0] ? halves[0].split(":").filter(Boolean) : [];
  const right = halves.length === 2 && halves[1]
    ? halves[1].split(":").filter(Boolean)
    : [];
  const expanded: string[] = [];
  if (halves.length === 2) {
    const missing = Math.max(0, 8 - left.length - right.length);
    expanded.push(...left, ...new Array<string>(missing).fill("0"), ...right);
  } else {
    expanded.push(...left);
  }
  if (expanded.length < 4) {
    return lower;
  }
  return `${expanded.slice(0, 4).map((h) => h.padStart(4, "0")).join(":")}::/64`;
}

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
    const rawIp = request.headers
      .get("CF-Connecting-IP")
      ?.split(",", 1)[0]
      ?.trim();
    const normalizedIp = normalizeRateLimitIp(rawIp);
    const ipSegment = normalizedIp ? `:${normalizedIp}` : "";
    const { success } = await env.DCR_RATE_LIMITER.limit({
      key: `dcr:${env.INSTITUTION_ID}${ipSegment}:claude-public-client`,
    });
    if (!success) {
      return registrationResponse(
        "registration_rate_limited",
        429,
        RETRY_AFTER_SECONDS,
      );
    }
    if (ipSegment) {
      const institutionLimit = await env.DCR_RATE_LIMITER.limit({
        key: `dcr:${env.INSTITUTION_ID}:claude-public-client`,
      });
      if (!institutionLimit.success) {
        return registrationResponse(
          "registration_rate_limited",
          429,
          RETRY_AFTER_SECONDS,
        );
      }
    }
    return undefined;
  } catch {
    return registrationResponse(
      "registration_temporarily_unavailable",
      503,
    );
  }
}
