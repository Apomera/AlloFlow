import { describe, expect, it } from "vitest";

import {
  RUNNER_HEALTH_CONTRACT,
  assessRunnerCompatibility,
  type RunnerBuildIdentity,
} from "../src/release-contract";

const expected: RunnerBuildIdentity = {
  manifestSha256: "a".repeat(64),
  runnerBuildSha256: "b".repeat(64),
  modelConfigSha256: "c".repeat(64),
  checkpointEngineSha256: "d".repeat(64),
};

function health() {
  return {
    ok: true,
    service: RUNNER_HEALTH_CONTRACT.service,
    version: RUNNER_HEALTH_CONTRACT.version,
    active: null as string | null,
    protocol: {
      runSchema: 1,
      checkpointSchema: 1,
      checkpointEngineAbi: 1,
    },
    build: { ...expected },
    ignoredUntrustedField: "never returned",
  };
}

describe("runner release contract", () => {
  it("accepts and sanitizes the exact staged release", () => {
    const result = assessRunnerCompatibility(health(), expected);
    expect(result).toEqual({
      ok: true,
      issues: [],
      runner: {
        ok: true,
        service: RUNNER_HEALTH_CONTRACT.service,
        version: RUNNER_HEALTH_CONTRACT.version,
        active: null,
        protocol: {
          runSchema: 1,
          checkpointSchema: 1,
          checkpointEngineAbi: 1,
        },
        build: expected,
      },
    });
    expect(JSON.stringify(result)).not.toContain("ignoredUntrustedField");
  });

  it("fails closed for protocol, activity, or any build drift", () => {
    const stale = health();
    stale.active = "remediating";
    stale.protocol.checkpointSchema = 2;
    stale.build.manifestSha256 = "e".repeat(64);
    const result = assessRunnerCompatibility(stale, expected);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      "runner_canary_not_idle",
      "runner_protocol_mismatch",
      "runner_manifestSha256_mismatch",
    ]);
  });

  it("rejects malformed or non-digest health data", () => {
    const malformed = health();
    malformed.build.runnerBuildSha256 = "nope";
    expect(assessRunnerCompatibility(malformed, expected)).toEqual({
      ok: false,
      issues: ["runner_health_invalid"],
      runner: null,
    });
  });
});
