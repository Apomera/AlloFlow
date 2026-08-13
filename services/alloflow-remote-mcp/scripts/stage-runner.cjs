#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  assertRegularSourceFile,
  isInside,
} = require('./staging-paths.cjs');

const serviceRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(serviceRoot, '..', '..');
const {
  normalizeVendorAssetBytes,
  NORMALIZED_VENDOR_TEXT_PATHS,
} = require(path.join(repoRoot, 'desktop', 'mcp', 'remediation_headless_driver.cjs'));
const normalizedVendorTextPaths = new Set(NORMALIZED_VENDOR_TEXT_PATHS);
const destination = path.join(serviceRoot, '.runner-context');
const runnerServerPath = path.join(serviceRoot, 'runner', 'server.cjs');
const runnerDockerfilePath = path.join(serviceRoot, 'runner', 'Dockerfile');
const releaseContractPath = path.join(serviceRoot, 'src', 'runner-release-contract.ts');
const {
  SERVICE_NAME,
  SERVICE_VERSION,
  RUN_SCHEMA,
  CHECKPOINT_SCHEMA,
  CHECKPOINT_ENGINE_ABI,
} = require(runnerServerPath);
const baseSourceFiles = [
  'desktop/mcp/remediation_headless_driver.cjs',
  'desktop/mcp/zip_writer.cjs',
  'verification_policy_module.js',
  'doc_builder_renderer_module.js',
  'view_pdf_validator_module.js',
  'doc_pipeline_module.js',
];
const validatorSourceFiles = [
  'verapdf/verapdf-cli.jar',
  'verapdf/THIRD_PARTY_NOTICES.md',
];
const vendorManifestSource = 'desktop/mcp/vendor/manifest.json';
let vendorManifest;
try { vendorManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, vendorManifestSource), 'utf8')); } catch (error) {
  throw new Error(`Unable to read ${vendorManifestSource}: ${error.message}`);
}
if (!vendorManifest || vendorManifest.schema !== 1 || !Array.isArray(vendorManifest.files) || !vendorManifest.files.length) {
  throw new Error(`${vendorManifestSource} must contain a non-empty schema-1 files array`);
}
const vendorEntriesBySource = new Map();
const vendorFiles = vendorManifest.files.map((entry) => {
  if (!entry || typeof entry.path !== 'string' || entry.path.startsWith('/') || entry.path.includes('..') || !/^[A-Za-z0-9._/-]+$/u.test(entry.path)
    || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[a-f0-9]{64}$/u.test(entry.sha256)) {
    throw new Error(`${vendorManifestSource} contains an unsafe path: ${JSON.stringify(entry)}`);
  }
  if (entry.normalization !== undefined) {
    if (!normalizedVendorTextPaths.has(entry.path) || entry.normalization !== 'lf') {
      throw new Error(`${vendorManifestSource} contains an unsupported normalization policy: ${entry.path}`);
    }
  } else if (normalizedVendorTextPaths.has(entry.path)) {
    throw new Error(`${vendorManifestSource} must declare normalization for text asset: ${entry.path}`);
  }
  const relative = path.join('desktop/mcp/vendor', entry.path);
  if (vendorEntriesBySource.has(relative)) {
    throw new Error(`${vendorManifestSource} contains a duplicate path: ${entry.path}`);
  }
  vendorEntriesBySource.set(relative, entry);
  return relative;
});
const sourceFiles = [...baseSourceFiles, ...validatorSourceFiles, vendorManifestSource, ...vendorFiles];

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--check') || args.filter((arg) => arg === '--check').length > 1) {
  throw new Error('Usage: node scripts/stage-runner.cjs [--check]');
}
const checkOnly = args.includes('--check');

if (!isInside(serviceRoot, destination) || path.basename(destination) !== '.runner-context') {
  throw new Error(`Refusing unsafe staging destination: ${destination}`);
}

const sourcePaths = new Map(sourceFiles.map((relative) => [
  relative,
  assertRegularSourceFile(repoRoot, relative),
]));

function digest(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function fileRecord(relative, bytes) {
  return {
    path: relative.replaceAll(path.sep, '/'),
    bytes: bytes.length,
    sha256: digest(bytes),
  };
}

// Stage exactly the bytes the production driver verifies. Runtime vendor assets remain byte-exact;
// only an explicitly allowlisted manifest text entry may request canonical LF materialization.
function canonicalSourceBytes(relative) {
  const rawBytes = fs.readFileSync(sourcePaths.get(relative));
  const entry = vendorEntriesBySource.get(relative);
  if (!entry) return rawBytes;
  const bytes = normalizeVendorAssetBytes(entry, rawBytes);
  if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256) {
    throw new Error(`${vendorManifestSource} does not match canonical source bytes: ${entry.path}`);
  }
  return bytes;
}

function listFiles(root, prefix = '') {
  const result = [];
  for (const entry of fs.readdirSync(path.resolve(root, prefix), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      throw new Error(`Runner context must not contain symbolic links: ${path.join(prefix, entry.name)}`);
    }
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFiles(root, relative));
    } else if (entry.isFile()) {
      result.push(relative.replaceAll(path.sep, '/'));
    } else {
      throw new Error(`Runner context contains an unsupported entry: ${relative}`);
    }
  }
  return result.sort();
}

function expectedManifest() {
  return {
    schema: 1,
    files: sourceFiles.map((relative) => {
      return fileRecord(relative, canonicalSourceBytes(relative));
    }),
  };
}

function runnerGeminiBase() {
  const dockerfile = fs.readFileSync(runnerDockerfilePath, 'utf8');
  const match = /(?:^|\s)ALLOFLOW_MCP_GEMINI_BASE=([^\s\\]+)/m
    .exec(dockerfile);
  if (!match) {
    throw new Error('Runner Dockerfile must pin ALLOFLOW_MCP_GEMINI_BASE');
  }
  try {
    return new URL(match[1]).toString();
  } catch {
    throw new Error('Runner Dockerfile must pin a valid ALLOFLOW_MCP_GEMINI_BASE URL');
  }
}

function expectedReleaseContract(manifest) {
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const runnerBytes = fs.readFileSync(runnerServerPath);
  return {
    schema: 1,
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    protocol: {
      runSchema: RUN_SCHEMA,
      checkpointSchema: CHECKPOINT_SCHEMA,
      checkpointEngineAbi: CHECKPOINT_ENGINE_ABI,
    },
    build: {
      runnerBuildSha256: digest(runnerBytes),
      manifestSha256: digest(manifestBytes),
    },
    modelConfig: {
      geminiBase: runnerGeminiBase(),
    },
  };
}

function releaseContractText(manifest) {
  const value = expectedReleaseContract(manifest);
  return [
    '// Generated by scripts/stage-runner.cjs. Do not edit by hand.',
    `export const RUNNER_RELEASE_CONTRACT = ${JSON.stringify(value, null, 2)} as const;`,
    '',
    'export type RunnerReleaseContract = typeof RUNNER_RELEASE_CONTRACT;',
    '',
    'async function sha256Text(value: string): Promise<string> {',
    '  const hash = await crypto.subtle.digest(',
    '    "SHA-256",',
    '    new TextEncoder().encode(value),',
    '  );',
    '  return Array.from(',
    '    new Uint8Array(hash),',
    '    (byte) => byte.toString(16).padStart(2, "0"),',
    '  ).join("");',
    '}',
    '',
    'export async function expectedRunnerBuildForModel(model: string) {',
    '  if (model.length === 0 || model.length > 256) {',
    '    throw new Error("invalid_runner_model");',
    '  }',
    '  const modelConfigSha256 = await sha256Text(JSON.stringify({',
    '    geminiBase: RUNNER_RELEASE_CONTRACT.modelConfig.geminiBase,',
    '    geminiModel: model,',
    '    geminiFallbackModel: model,',
    '  }));',
    '  const checkpointEngineSha256 = await sha256Text(',
    '    "alloflow-checkpoint-engine-abi:" +',
    '      RUNNER_RELEASE_CONTRACT.protocol.checkpointEngineAbi + "\\n" +',
    '      RUNNER_RELEASE_CONTRACT.build.manifestSha256 + "\\n" +',
    '      RUNNER_RELEASE_CONTRACT.build.runnerBuildSha256 + "\\n" +',
    '      modelConfigSha256,',
    '  );',
    '  return {',
    '    runnerBuildSha256: RUNNER_RELEASE_CONTRACT.build.runnerBuildSha256,',
    '    manifestSha256: RUNNER_RELEASE_CONTRACT.build.manifestSha256,',
    '    modelConfigSha256,',
    '    checkpointEngineSha256,',
    '  } as const;',
    '}',
    '',
  ].join('\n');
}

function verifyStagedContext() {
  const stat = fs.statSync(destination, { throwIfNoEntry: false });
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Runner context is missing; run npm run runner:stage first: ${destination}`);
  }
  const expected = expectedManifest();
  const expectedPaths = [...expected.files.map((file) => file.path), 'manifest.json'].sort();
  const actualPaths = listFiles(destination);
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error(`Runner context file set is stale: expected ${expectedPaths.join(', ')}, found ${actualPaths.join(', ')}`);
  }
  const expectedManifestText = `${JSON.stringify(expected, null, 2)}\n`;
  const actualManifestText = fs.readFileSync(path.join(destination, 'manifest.json'), 'utf8');
  if (actualManifestText !== expectedManifestText) {
    throw new Error('Runner context manifest is stale; run npm run runner:stage');
  }
  for (const relative of sourceFiles) {
    const source = canonicalSourceBytes(relative);
    const staged = fs.readFileSync(path.resolve(destination, relative));
    if (!source.equals(staged)) {
      throw new Error(`Runner context dependency is stale: ${relative}`);
    }
  }
  const contractStat = fs.lstatSync(releaseContractPath, { throwIfNoEntry: false });
  if (!contractStat || !contractStat.isFile() || contractStat.isSymbolicLink()) {
    throw new Error('Runner release contract is missing or unsafe; run npm run runner:stage');
  }
  if (fs.readFileSync(releaseContractPath, 'utf8') !== releaseContractText(expected)) {
    throw new Error('Runner release contract is stale; run npm run runner:stage');
  }
  return expected;
}

if (checkOnly) {
  const checked = verifyStagedContext();
  process.stdout.write(`Verified ${checked.files.length} staged runner dependencies in ${destination}\n`);
  process.exit(0);
}

const temporary = `${destination}.tmp-${process.pid}`;
fs.rmSync(temporary, { recursive: true, force: true });
fs.mkdirSync(temporary, { recursive: true, mode: 0o700 });

const manifest = {
  schema: 1,
  files: [],
};

try {
  for (const relative of sourceFiles) {
    const source = sourcePaths.get(relative);
    const target = path.resolve(temporary, relative);
    if (!isInside(temporary, target)) throw new Error(`Refusing unsafe target: ${relative}`);
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    const bytes = canonicalSourceBytes(relative);
    const stagedBytes = fs.readFileSync(target);
    if (!stagedBytes.equals(bytes)) fs.writeFileSync(target, bytes);
    manifest.files.push(fileRecord(relative, bytes));
  }

  fs.writeFileSync(
    path.join(temporary, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { encoding: 'utf8', flag: 'wx', mode: 0o600 },
  );

  fs.rmSync(destination, { recursive: true, force: true });
  fs.renameSync(temporary, destination);
  fs.writeFileSync(releaseContractPath, releaseContractText(manifest), { encoding: 'utf8', mode: 0o600 });
} catch (error) {
  fs.rmSync(temporary, { recursive: true, force: true });
  throw error;
}

process.stdout.write(`Staged ${manifest.files.length} runner dependencies in ${destination}\n`);
for (const file of manifest.files) {
  process.stdout.write(`${file.sha256}  ${file.path}\n`);
}
