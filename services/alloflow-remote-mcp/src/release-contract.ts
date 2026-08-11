import {
  RUNNER_RELEASE_CONTRACT as STAGED_RUNNER_RELEASE,
} from "./runner-release-contract";

const SHA256_RE = /^[a-f0-9]{64}$/u;

export const RUNNER_HEALTH_CONTRACT = Object.freeze({
  service: STAGED_RUNNER_RELEASE.service,
  version: STAGED_RUNNER_RELEASE.version,
  runSchema: STAGED_RUNNER_RELEASE.protocol.runSchema,
  checkpointSchema: STAGED_RUNNER_RELEASE.protocol.checkpointSchema,
  checkpointEngineAbi:
    STAGED_RUNNER_RELEASE.protocol.checkpointEngineAbi,
});

export type RunnerBuildIdentity = {
  manifestSha256: string;
  runnerBuildSha256: string;
  modelConfigSha256: string;
  checkpointEngineSha256: string;
};

export type RunnerHealth = {
  ok: boolean;
  service: string;
  version: string;
  active: string | null;
  protocol: {
    runSchema: number;
    checkpointSchema: number;
    checkpointEngineAbi: number;
  };
  build: RunnerBuildIdentity;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseRunnerHealth(value: unknown): RunnerHealth | null {
  if (!isRecord(value) || !isRecord(value.protocol) || !isRecord(value.build)) {
    return null;
  }
  const protocol = value.protocol;
  const build = value.build;
  const buildNames: Array<keyof RunnerBuildIdentity> = [
    "manifestSha256",
    "runnerBuildSha256",
    "modelConfigSha256",
    "checkpointEngineSha256",
  ];
  if (
    value.ok !== true ||
    typeof value.service !== "string" ||
    typeof value.version !== "string" ||
    (value.active !== null && typeof value.active !== "string") ||
    typeof protocol.runSchema !== "number" ||
    typeof protocol.checkpointSchema !== "number" ||
    typeof protocol.checkpointEngineAbi !== "number" ||
    buildNames.some(
      (name) =>
        typeof build[name] !== "string" ||
        !SHA256_RE.test(build[name] as string),
    )
  ) {
    return null;
  }
  return {
    ok: true,
    service: value.service,
    version: value.version,
    active: value.active,
    protocol: {
      runSchema: protocol.runSchema,
      checkpointSchema: protocol.checkpointSchema,
      checkpointEngineAbi: protocol.checkpointEngineAbi,
    },
    build: {
      manifestSha256: build.manifestSha256 as string,
      runnerBuildSha256: build.runnerBuildSha256 as string,
      modelConfigSha256: build.modelConfigSha256 as string,
      checkpointEngineSha256:
        build.checkpointEngineSha256 as string,
    },
  };
}

export function assessRunnerCompatibility(
  value: unknown,
  expectedBuild: RunnerBuildIdentity,
): {
  ok: boolean;
  issues: string[];
  runner: RunnerHealth | null;
} {
  const runner = parseRunnerHealth(value);
  if (!runner) {
    return {
      ok: false,
      issues: ["runner_health_invalid"],
      runner: null,
    };
  }
  const issues: string[] = [];
  if (
    runner.service !== RUNNER_HEALTH_CONTRACT.service ||
    runner.version !== RUNNER_HEALTH_CONTRACT.version
  ) {
    issues.push("runner_identity_mismatch");
  }
  if (runner.active !== null) {
    issues.push("runner_canary_not_idle");
  }
  if (
    runner.protocol.runSchema !== RUNNER_HEALTH_CONTRACT.runSchema ||
    runner.protocol.checkpointSchema !==
      RUNNER_HEALTH_CONTRACT.checkpointSchema ||
    runner.protocol.checkpointEngineAbi !==
      RUNNER_HEALTH_CONTRACT.checkpointEngineAbi
  ) {
    issues.push("runner_protocol_mismatch");
  }
  for (const name of Object.keys(expectedBuild) as Array<
    keyof RunnerBuildIdentity
  >) {
    if (runner.build[name] !== expectedBuild[name]) {
      issues.push(`runner_${name}_mismatch`);
    }
  }
  return { ok: issues.length === 0, issues, runner };
}
