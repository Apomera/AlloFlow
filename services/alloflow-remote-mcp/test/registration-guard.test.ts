import { describe, expect, it, vi } from "vitest";

import type { PilotEnv } from "../src/pilot-env";
import { guardClientRegistration } from "../src/registration-guard";

function limiter(
  implementation: () => Promise<{ success: boolean }>,
): RateLimit {
  return {
    limit: vi.fn(implementation),
  } as unknown as RateLimit;
}

describe("OAuth dynamic client registration guard", () => {
  it("does not consume quota for other routes or methods", async () => {
    const rateLimit = limiter(async () => ({ success: true }));
    const env: PilotEnv = {
      INSTITUTION_ID: "district_opaque_01",
      DCR_RATE_LIMITER: rateLimit,
    };

    await expect(
      guardClientRegistration(
        new Request("https://mcp.example/register"),
        env,
      ),
    ).resolves.toBeUndefined();
    await expect(
      guardClientRegistration(
        new Request("https://mcp.example/token", { method: "POST" }),
        env,
      ),
    ).resolves.toBeUndefined();
    expect(rateLimit.limit).not.toHaveBeenCalled();
  });

  it("returns 429 with no-store and retry guidance when exhausted", async () => {
    const rateLimit = limiter(async () => ({ success: false }));
    const response = await guardClientRegistration(
      new Request("https://mcp.example/register", { method: "POST" }),
      {
        INSTITUTION_ID: "district_opaque_01",
        DCR_RATE_LIMITER: rateLimit,
      },
    );

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("60");
    expect(response?.headers.get("Cache-Control")).toContain("no-store");
    await expect(response?.json()).resolves.toEqual({
      ok: false,
      error: "registration_rate_limited",
    });
    expect(rateLimit.limit).toHaveBeenCalledWith({
      key: "dcr:district_opaque_01:claude-public-client",
    });
  });

  it("fails closed when the binding is absent or unavailable", async () => {
    const request = () =>
      new Request("https://mcp.example/register", { method: "POST" });

    const missing = await guardClientRegistration(request(), {
      INSTITUTION_ID: "district_opaque_01",
    });
    expect(missing?.status).toBe(503);

    const failed = await guardClientRegistration(request(), {
      INSTITUTION_ID: "district_opaque_01",
      DCR_RATE_LIMITER: limiter(async () => {
        throw new Error("simulated");
      }),
    });
    expect(failed?.status).toBe(503);
  });
});
