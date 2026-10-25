#!/usr/bin/env node
"use strict";

// Local-only Firestore rules verification. No firebase login, deploy, cloud
// project lookup, package installation, or production configuration is used.
// The cached JAR is the same binary recorded in the installed Firebase CLI's
// manifest. Reuse a separately captured baseline to demonstrate the regression:
// node dev-tools/security/run_session_metadata_rules.cjs --baseline path/to/baseline.rules
// References: https://firebase.google.com/docs/rules/unit-tests
// https://firebase.google.com/docs/emulator-suite/connect_firestore

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const http = require("node:http");
const crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const projectId = "demo-alloflow-session-metadata";
const suites = {
  metadata: path.join(root, "tests/firebase_session_metadata_rules.cjs"),
  expiry: path.join(root, "tests/firebase_session_expiry_rules.cjs"),
  retention: path.join(root, "tests/school_firestore_retention.emulator.cjs"),
};
let suite = suites.metadata;
const regressionSuite = path.join(root, "tests/firebase_rules_security.test.cjs");
const host = "127.0.0.1";
let activeEmulator;
let activeSuite;

function parseArgs() {
  const parsed = { candidate: path.join(root, "firestore.rules"), suite: "metadata" };
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i];
    if (!["--baseline", "--candidate", "--suite"].includes(key) || !process.argv[i + 1]) {
      throw new Error("Usage: run_session_metadata_rules.cjs [--baseline rules-path] [--candidate rules-path] [--suite metadata|expiry|retention]");
    }
    if (key === "--suite") {
      if (!Object.prototype.hasOwnProperty.call(suites, process.argv[i + 1])) throw new Error("Choose the metadata, expiry or retention suite.");
      parsed.suite = process.argv[i + 1];
    } else parsed[key.slice(2)] = path.resolve(process.cwd(), process.argv[i + 1]);
  }
  return parsed;
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function installedTools() {
  const candidates = [
    path.join(root, "desktop/web-app/node_modules/firebase-tools"),
    path.join(root, "dev-tools/security/node_modules/firebase-tools"),
    path.join(root, "node_modules/firebase-tools"),
    path.join(process.env.APPDATA || "", "npm/node_modules/firebase-tools"),
    path.join(os.homedir(), ".npm-global/lib/node_modules/firebase-tools"),
    "/usr/local/lib/node_modules/firebase-tools",
    "/usr/lib/node_modules/firebase-tools",
  ];
  const cliRoot = candidates.find(p => fs.existsSync(path.join(p, "lib/emulator/downloadableEmulatorInfo.json")));
  if (!cliRoot) throw new Error("An installed Firebase CLI emulator manifest is required; this runner does not install tools.");
  const manifest = JSON.parse(fs.readFileSync(path.join(cliRoot, "lib/emulator/downloadableEmulatorInfo.json"), "utf8")).firestore;
  const cacheRoot = process.env.FIREBASE_EMULATORS_PATH || path.join(os.homedir(), ".cache/firebase/emulators");
  const jar = path.join(cacheRoot, manifest.downloadPathRelativeToCacheDir);
  if (!fs.existsSync(jar)) throw new Error("Cached Firestore emulator JAR is absent; no automatic download is performed.");
  if (!manifest.expectedChecksumSHA256 || sha256(jar) !== manifest.expectedChecksumSHA256.toLowerCase()) {
    throw new Error("Cached emulator SHA256 differs from the installed Firebase CLI manifest.");
  }
  return {
    jar,
    jarVersion: manifest.version,
    jarSha256: sha256(jar),
    firebaseTools: JSON.parse(fs.readFileSync(path.join(cliRoot, "package.json"), "utf8")).version,
    rulesUnitTesting: JSON.parse(fs.readFileSync(path.join(root, "desktop/web-app/node_modules/@firebase/rules-unit-testing/package.json"), "utf8")).version,
    firebase: JSON.parse(fs.readFileSync(path.join(root, "desktop/web-app/node_modules/firebase/package.json"), "utf8")).version,
  };
}

// Pass only process/runtime plumbing. Credentials, proxy configuration, SDK
// project settings, NODE_OPTIONS, and JAVA_TOOL_OPTIONS are not inherited.
function localEnv(dir) {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (["path", "systemroot", "windir", "comspec", "pathext", "lang", "lc_all"].includes(key.toLowerCase())) env[key] = value;
  }
  return { ...env, TEMP: dir, TMP: dir, TMPDIR: dir, CI: "true", NODE_ENV: "test" };
}

async function reservePort() {
  // Stay below the usual outbound ephemeral range so readiness probes do not
  // claim another just-released emulator listener port during Java startup.
  for (let attempt = 0; attempt < 40; attempt++) {
    const server = net.createServer();
    const port = crypto.randomInt(16000, 28000);
    try {
      await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, host, resolve); });
      return { port, close: () => new Promise(resolve => server.close(resolve)) };
    } catch (error) { if (error.code !== "EADDRINUSE") throw error; }
  }
  throw new Error("Could not reserve three unused loopback emulator ports.");
}

function exited(child) {
  return new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
}

async function stop(child) {
  if (!child || !child.pid || child.exitCode !== null || child.signalCode !== null) return;
  const done = exited(child);
  child.kill("SIGTERM");
  const stopped = await Promise.race([done.then(() => true), new Promise(resolve => setTimeout(() => resolve(false), 5000))]);
  if (!stopped) { child.kill("SIGKILL"); await done; }
}

async function waitForPort(port, child) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (!child.pid) throw new Error("Firestore emulator process could not be started.");
    if (child.exitCode !== null || child.signalCode !== null) throw new Error("Firestore emulator exited before it was ready.");
    const ready = await new Promise(resolve => {
      const socket = net.createConnection({ host, port });
      socket.setTimeout(250);
      const finish = value => { socket.destroy(); resolve(value); };
      socket.once("connect", () => finish(true));
      socket.once("error", () => finish(false));
      socket.once("timeout", () => finish(false));
    });
    if (ready) return;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error("Firestore emulator did not bind its local port within 45 seconds.");
}

async function captureCoverage(port, phaseDir) {
  // Official emulator report endpoint; fixed loopback/project, no redirects.
  // https://firebase.google.com/docs/rules/emulator-reports
  return new Promise(resolve => {
    let finished = false;
    const finish = result => {
      if (finished) return;
      finished = true; clearTimeout(timeout); resolve(result);
    };
    const request = http.get({ hostname: host, port,
      path: `/emulator/v1/projects/${projectId}:ruleCoverage` }, response => {
      if (response.statusCode !== 200) {
        response.resume(); finish({ error: `Local coverage returned HTTP ${response.statusCode}` }); return;
      }
      const chunks = [];
      let bytes = 0;
      response.on("data", chunk => {
        bytes += chunk.length;
        if (bytes > 64 * 1024 * 1024) { request.destroy(new Error("Local coverage exceeded 64 MiB")); return; }
        chunks.push(chunk);
      });
      response.once("error", error => finish({ error: error.message }));
      response.once("end", () => {
        if (finished) return;
        try {
          const body = Buffer.concat(chunks);
          JSON.parse(body.toString("utf8"));
          const file = path.join(phaseDir, "rule-coverage.json");
          fs.writeFileSync(file, body);
          finish({ file, bytes, sha256: sha256(file) });
        } catch (error) { finish({ error: error.message }); }
      });
    });
    const timeout = setTimeout(() => request.destroy(new Error("Local coverage timed out after 20 seconds")), 20000);
    request.once("error", error => finish({ error: error.message }));
  });
}

async function executeSuite(file, fd, env) {
  activeSuite = spawn(process.execPath, [file], { cwd: root, env, windowsHide: true, stdio: ["ignore", fd, fd] });
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { activeSuite.kill("SIGTERM"); reject(new Error("Rules suite exceeded five minutes.")); }, 300000);
    activeSuite.once("error", error => { clearTimeout(timeout); reject(error); });
    activeSuite.once("exit", (code, signal) => { clearTimeout(timeout); resolve({ code, signal }); });
  });
  activeSuite = null;
  return result;
}

async function runPhase(name, rulesPath, tools, runDir, legacy) {
  const phaseDir = path.join(runDir, name);
  fs.mkdirSync(phaseDir);
  const snapshot = path.join(phaseDir, "firestore.rules");
  fs.copyFileSync(rulesPath, snapshot);
  const ports = await Promise.all([reservePort(), reservePort(), reservePort()]);
  const [firestore, webchannel, websocket] = ports.map(p => p.port);
  fs.writeFileSync(path.join(phaseDir, "firebase.local.json"), JSON.stringify({
    firestore: { rules: "firestore.rules" },
    emulators: { firestore: { host, port: firestore }, ui: { enabled: false }, singleProjectMode: true },
  }, null, 2) + "\n");
  const args = ["-Duser.language=en", "-jar", tools.jar, "--host", host, "--port", String(firestore),
    "--webchannel_port", String(webchannel), "--websocket_port", String(websocket), "--project_id", projectId,
    "--single_project_mode", "--single_project_mode_error", "--rules", snapshot];
  const receipt = { name, legacyNegativeControl: legacy, rulesPath, rulesSha256: sha256(snapshot), projectId, host, firestorePort: firestore, webchannelPort: webchannel, websocketPort: websocket, emulatorArgs: args };
  const emulatorFd = fs.openSync(path.join(phaseDir, "firestore.log"), "w");
  const suiteFd = fs.openSync(path.join(phaseDir, "suite.log"), "w");
  const regressionFd = fs.openSync(path.join(phaseDir, "regression.log"), "w");
  const start = Date.now();
  try {
    await Promise.all(ports.map(p => p.close()));
    activeEmulator = spawn("java", args, { cwd: phaseDir, env: localEnv(phaseDir), windowsHide: true, stdio: ["ignore", emulatorFd, emulatorFd] });
    let spawnError;
    activeEmulator.once("error", error => { spawnError = error; });
    await waitForPort(firestore, activeEmulator);
    if (spawnError) throw spawnError;
    const env = { ...localEnv(phaseDir),
      FIRESTORE_EMULATOR_HOST: `${host}:${firestore}`, GCLOUD_PROJECT: projectId,
      GOOGLE_CLOUD_PROJECT: projectId, PROJECT_ID: projectId, FIREBASE_PROJECT_ID: projectId,
      FIREBASE_CONFIG: JSON.stringify({ projectId }), FIRESTORE_RULES_PATH: snapshot,
      FIREBASE_RULES_TEST_PROJECT_ID: projectId,
      SESSION_METADATA_EXPECT_LEGACY: legacy ? "1" : "0",
      SESSION_EXPIRY_EXPECT_LEGACY: legacy ? "1" : "0",
    };
    const result = await executeSuite(suite, suiteFd, env);
    receipt.suiteExit = result;
    if (result.code !== 0) throw new Error(`${name} rules suite failed (${result.code ?? result.signal}). See ${path.join(phaseDir, "suite.log")}`);
    if (!legacy) {
      const regression = await executeSuite(regressionSuite, regressionFd, env);
      receipt.regressionExit = regression;
      if (regression.code !== 0) throw new Error(`Existing regression rules suite failed (${regression.code ?? regression.signal}). See ${path.join(phaseDir, "regression.log")}`);
    }
    receipt.passed = true;
  } catch (error) {
    receipt.passed = false;
    receipt.error = error.message;
    throw error;
  } finally {
    await stop(activeSuite); activeSuite = null;
    if (activeEmulator?.pid && activeEmulator.exitCode === null && activeEmulator.signalCode === null) {
      receipt.coverage = await captureCoverage(firestore, phaseDir);
    }
    await stop(activeEmulator); activeEmulator = null;
    fs.closeSync(emulatorFd); fs.closeSync(suiteFd); fs.closeSync(regressionFd);
    receipt.durationMs = Date.now() - start;
    receipt.expressionLimitMessageLines = Object.fromEntries(["suite.log", "regression.log", "firestore.log"].map(file => [file,
      fs.readFileSync(path.join(phaseDir, file), "utf8").split(/\r?\n/)
        .filter(line => /maximum of 1000 expressions|maximum number of expressions|evaluation[- ]limit/i.test(line)).length,
    ]));
    const budgetMessages = Object.values(receipt.expressionLimitMessageLines).reduce((a, b) => a + b, 0);
    receipt.expressionLimitPolicy = { enforced: !legacy, passed: legacy ? null : budgetMessages === 0 };
    let budgetError;
    if (!legacy && budgetMessages && receipt.passed) {
      receipt.passed = false;
      receipt.error = `Candidate logs contain ${budgetMessages} evaluation-limit message lines.`;
      budgetError = new Error(receipt.error);
    }
    fs.writeFileSync(path.join(phaseDir, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
    if (budgetError) throw budgetError;
  }
  console.log(`${name}: PASS (synthetic data, ${projectId}, ${host}:${firestore})`);
  return receipt;
}

async function main() {
  const args = parseArgs();
  if (args.suite === "retention" && args.baseline) throw new Error("The retention integration suite uses a synthetic SDK fixture, not baseline rule comparisons.");
  suite = suites[args.suite];
  if (!fs.existsSync(suite)) throw new Error(`Required rules suite is absent: ${suite}`);
  if (!fs.existsSync(regressionSuite)) throw new Error(`Required regression suite is absent: ${regressionSuite}`);
  for (const key of ["candidate", "baseline"]) if (args[key] && !fs.statSync(args[key]).isFile()) throw new Error("Each rules path must be a local file.");
  const tools = installedTools();
  const scratch = path.join(root, "_dev_scratch/security-district-audit/session-" + args.suite);
  fs.mkdirSync(scratch, { recursive: true });
  const runDir = fs.mkdtempSync(path.join(scratch, "run-"));
  const java = spawnSync("java", ["-version"], { env: localEnv(runDir), encoding: "utf8", timeout: 10000, windowsHide: true });
  if (java.error || java.status !== 0) throw new Error("An installed Java runtime is required; this runner does not install tools.");
  const receipt = { startedAt: new Date().toISOString(), passed: false, projectId, suite: args.suite,
    launchMode: "java-direct-cached-cli-emulator", suiteSha256: sha256(suite), runnerSha256: sha256(__filename),
    regressionSuiteSha256: sha256(regressionSuite),
    node: process.version, java: (java.stderr || java.stdout).trim(), tools, phases: [], officialReferences: [
    "https://firebase.google.com/docs/rules/unit-tests", "https://firebase.google.com/docs/emulator-suite/connect_firestore",
    "https://firebase.google.com/docs/rules/emulator-reports",
  ] };
  console.log(`Local emulator receipt: ${runDir}`);
  try {
    if (args.baseline) receipt.phases.push(await runPhase("baseline", args.baseline, tools, runDir, true));
    receipt.phases.push(await runPhase("candidate", args.candidate, tools, runDir, false));
    receipt.passed = true;
  } finally {
    receipt.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(runDir, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, async () => {
  await stop(activeSuite); await stop(activeEmulator); process.exit(130);
});
main().catch(async error => {
  await stop(activeSuite); await stop(activeEmulator);
  console.error(error.message); process.exitCode = 1;
});
