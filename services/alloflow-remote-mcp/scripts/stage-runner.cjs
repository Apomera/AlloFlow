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
const destination = path.join(serviceRoot, '.runner-context');
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
const vendorFiles = vendorManifest.files.map((entry) => {
  if (!entry || typeof entry.path !== 'string' || entry.path.startsWith('/') || entry.path.includes('..') || !/^[A-Za-z0-9._/-]+$/u.test(entry.path)) {
    throw new Error(`${vendorManifestSource} contains an unsafe path: ${JSON.stringify(entry)}`);
  }
  return path.join('desktop/mcp/vendor', entry.path);
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
      const source = sourcePaths.get(relative);
      return fileRecord(relative, fs.readFileSync(source));
    }),
  };
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
    const source = fs.readFileSync(sourcePaths.get(relative));
    const staged = fs.readFileSync(path.resolve(destination, relative));
    if (!source.equals(staged)) {
      throw new Error(`Runner context dependency is stale: ${relative}`);
    }
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
    const bytes = fs.readFileSync(target);
    manifest.files.push(fileRecord(relative, bytes));
  }

  fs.writeFileSync(
    path.join(temporary, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { encoding: 'utf8', flag: 'wx', mode: 0o600 },
  );

  fs.rmSync(destination, { recursive: true, force: true });
  fs.renameSync(temporary, destination);
} catch (error) {
  fs.rmSync(temporary, { recursive: true, force: true });
  throw error;
}

process.stdout.write(`Staged ${manifest.files.length} runner dependencies in ${destination}\n`);
for (const file of manifest.files) {
  process.stdout.write(`${file.sha256}  ${file.path}\n`);
}
