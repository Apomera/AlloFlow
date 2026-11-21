"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const SERVICE_ROOT = path.resolve(__dirname, "..");
const ADMISSION_SCRIPT = path.join(__dirname, "pilot-admission.cjs");
const RECOVERY_COMMAND = "npm run admission:resume:staging";

function resolveNpmStep(npmArgs) {
  const envNpmExecPath = process.env.npm_execpath;
  if (
    typeof envNpmExecPath === "string" &&
    /\.(?:c|m)?js$/iu.test(envNpmExecPath) &&
    fs.existsSync(envNpmExecPath)
  ) {
    return [process.execPath, [envNpmExecPath, ...npmArgs]];
  }
  const bundledNpmCli = path.join(
    path.dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );
  if (fs.existsSync(bundledNpmCli)) {
    return [process.execPath, [bundledNpmCli, ...npmArgs]];
  }
  return ["npm", npmArgs];
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: SERVICE_ROOT,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`release_step_failed_${result.status ?? "signal"}`);
  }
}

function releaseSteps(configPath, accepted, ownership) {
  const node = process.execPath;
  const wrangler = path.join(SERVICE_ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
  return [
    [node, [
      ADMISSION_SCRIPT,
      "drain",
      "--config",
      configPath,
      "--timeout-seconds",
      "2100",
      "--operator",
      ownership.operator,
      "--reason",
      ownership.reason,
      "--token",
      ownership.token,
    ]],
    [node, [path.join(__dirname, "stage-runner.cjs")]],
    resolveNpmStep(["run", "check"]),
    resolveNpmStep(["run", "runner:check"]),
    [node, [path.join(__dirname, "pilot-preflight.cjs"), "--config", configPath, ...(accepted ? ["--allow-synthetic-acceptance"] : [])]],
    [node, [wrangler, "deploy", "--dry-run", "--config", configPath, "--outdir", ".wrangler-build/pilot"]],
    [node, [wrangler, "check", "startup", "--config", configPath, "--outfile", ".wrangler-build/pilot-startup.cpuprofile"]],
    [node, [path.join(__dirname, "pilot-lifecycle.cjs"), "--config", configPath, "--apply"]],
    [node, [wrangler, "deploy", "--config", configPath]],
    [node, [path.join(__dirname, "pilot-release-canary.cjs"), "--config", configPath]],
  ];
}

async function runPausedRelease(options) {
  const run = options.run || runCommand;
  const operator = options.operator || process.env.ALLOFLOW_RELEASE_OPERATOR;
  if (
    typeof operator !== "string" ||
    !operator.trim() ||
    operator !== operator.trim() ||
    operator.length > 128
  ) {
    throw new Error("invalid_release_operator");
  }
  const ownership = Object.freeze({
    operator,
    reason: options.pauseReason || "staging release",
    token: options.releaseToken || randomUUID(),
  });
  const pause = options.pause || (() => run(
    process.execPath,
    [
      ADMISSION_SCRIPT,
      "pause",
      "--config",
      options.configPath,
      "--operator",
      ownership.operator,
      "--reason",
      ownership.reason,
      "--token",
      ownership.token,
    ],
  ));
  const resume = options.resume || (() => run(
    process.execPath,
    [
      ADMISSION_SCRIPT,
      "resume",
      "--config",
      options.configPath,
      "--operator",
      ownership.operator,
      "--acquired-reason",
      ownership.reason,
      "--reason",
      "staging release finished",
      "--token",
      ownership.token,
    ],
  ));
  const assertOwned = options.assertOwned || (() => run(
    process.execPath,
    [
      ADMISSION_SCRIPT,
      "assert-owned",
      "--config",
      options.configPath,
      "--operator",
      ownership.operator,
      "--reason",
      ownership.reason,
      "--token",
      ownership.token,
    ],
  ));
  const steps = typeof options.steps === "function"
    ? options.steps(ownership)
    : options.steps;
  let paused = false;
  let releaseError;
  let resumeError;
  try {
    await pause(ownership);
    paused = true;
    for (const [command, args] of steps) {
      await assertOwned(ownership);
      await run(command, args);
    }
  } catch (error) {
    releaseError = error;
  } finally {
    if (paused) {
      try {
        await resume(ownership);
      } catch (error) {
        resumeError = error;
        process.stderr.write(
          `ADMISSION PAUSE RELEASE FAILED OR OWNERSHIP WAS LOST; ` +
          `ADMISSIONS REMAIN CLOSED. RECOVERY: ${RECOVERY_COMMAND}\n`,
        );
      }
    }
  }
  if (resumeError) {
    if (releaseError) {
      process.stderr.write(
        `deploy: release step also failed before resume error: ${releaseError instanceof Error ? releaseError.message : "failed"}\n`,
      );
    }
    throw resumeError;
  }
  if (releaseError) throw releaseError;
}

async function main(argv) {
  const configIndex = argv.indexOf("--config");
  const configPath = path.resolve(
    configIndex >= 0 && argv[configIndex + 1]
      ? argv[configIndex + 1]
      : "wrangler.pilot.local.jsonc",
  );
  if (/\.example\./iu.test(path.basename(configPath))) {
    throw new Error("refusing_to_deploy_example_configuration");
  }
  await runPausedRelease({
    configPath,
    steps: (ownership) => releaseSteps(
      configPath,
      argv.includes("--allow-synthetic-acceptance"),
      ownership,
    ),
  });
}

module.exports = { RECOVERY_COMMAND, releaseSteps, runPausedRelease };

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`deploy: ${error instanceof Error ? error.message : "failed"}\n`);
    process.exitCode = 1;
  });
}
