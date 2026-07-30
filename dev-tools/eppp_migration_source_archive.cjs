'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  EPPP_ARCHIVE_ROOT_RELATIVE,
  assertArchiveRelativePath,
} = require('./eppp_archive_paths.cjs');

const ARCHIVE_SCHEMA_VERSION = 1;
const ARCHIVE_ID = 'eppp-native-migration-source-v1';
const ARCHIVE_ROOT_RELATIVE = EPPP_ARCHIVE_ROOT_RELATIVE;
const MANIFEST_FILENAME = 'manifest.json';
const METADATA_PATHS = Object.freeze(['LICENSE', 'ORIGIN.md']);
const EXECUTION_PLAN_GROUPS = Object.freeze({
  learningLibrary: Object.freeze([
    'baseData',
    'flashcards',
    'memoryAids',
    'chapters',
    'diagrams',
    'glossary',
  ]),
  questionAudit: Object.freeze([
    'baseData',
    'questionBank',
    'dataBatches',
    'rationaleEnhancements',
    'referenceOverlays',
  ]),
});

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort(compareText).map(
      (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
    ).join(',')}}`;
  }
  return JSON.stringify(value);
}

function archivePayload(manifest) {
  const payload = { ...manifest };
  delete payload.payloadSha256;
  return payload;
}

function archivePayloadSha256(manifest) {
  return sha256(Buffer.from(canonicalJson(archivePayload(manifest)), 'utf8'));
}

function assertSafeRelativePath(relativePath) {
  assertArchiveRelativePath(relativePath);
}

function walkFiles(directory, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...walkFiles(path.join(directory, entry.name), relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      throw new Error(`Unsupported EPPP migration-source archive entry: ${relativePath}`);
    }
  }
  return files.sort(compareText);
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('EPPP migration-source archive manifest must be an object.');
  }
  const expectedKeys = [
    'archiveId',
    'execution',
    'files',
    'frozenFrom',
    'immutability',
    'metadataPaths',
    'payloadSha256',
    'schemaVersion',
  ].sort(compareText);
  if (JSON.stringify(Object.keys(manifest).sort(compareText)) !== JSON.stringify(expectedKeys)) {
    throw new Error('EPPP migration-source archive manifest has unsupported or missing fields.');
  }
  if (manifest.schemaVersion !== ARCHIVE_SCHEMA_VERSION || manifest.archiveId !== ARCHIVE_ID) {
    throw new Error('Unsupported EPPP migration-source archive identity or schema version.');
  }
  if (
    !manifest.frozenFrom
    || manifest.frozenFrom.historicalRoot !== 'test_prep/eppp_legacy'
    || manifest.frozenFrom.selection !== 'native-regeneration-inputs-only'
  ) {
    throw new Error('EPPP migration-source archive origin metadata is invalid.');
  }
  if (
    manifest.immutability !== 'append-only-versioned-archive; replace by creating a new version directory'
  ) {
    throw new Error('EPPP migration-source archive immutability policy is invalid.');
  }
  if (JSON.stringify(manifest.metadataPaths) !== JSON.stringify(METADATA_PATHS)) {
    throw new Error('EPPP migration-source archive metadata paths are invalid.');
  }
  if (!manifest.execution || typeof manifest.execution !== 'object') {
    throw new Error('EPPP migration-source archive execution plans are missing.');
  }
  const planNames = Object.keys(EXECUTION_PLAN_GROUPS);
  if (
    JSON.stringify(Object.keys(manifest.execution).sort(compareText))
    !== JSON.stringify([...planNames].sort(compareText))
  ) {
    throw new Error('EPPP migration-source archive execution plans are invalid.');
  }

  const executionPaths = [];
  for (const planName of planNames) {
    const plan = manifest.execution[planName];
    const groups = EXECUTION_PLAN_GROUPS[planName];
    if (!plan || typeof plan !== 'object'
      || JSON.stringify(Object.keys(plan).sort(compareText))
        !== JSON.stringify([...groups].sort(compareText))) {
      throw new Error(`EPPP migration-source archive execution plan ${planName} is invalid.`);
    }
    const planPaths = [];
    for (const group of groups) {
      const paths = plan[group];
      if (!Array.isArray(paths) || !paths.length) {
        throw new Error(`EPPP migration-source archive execution group ${planName}.${group} is empty.`);
      }
      for (const relativePath of paths) {
        assertSafeRelativePath(relativePath);
        if (!relativePath.startsWith('js/') || !relativePath.endsWith('.js')) {
          throw new Error(`EPPP migration-source executable is outside the inert JS input set: ${relativePath}`);
        }
        planPaths.push(relativePath);
        executionPaths.push(relativePath);
      }
    }
    if (new Set(planPaths).size !== planPaths.length) {
      throw new Error(`EPPP migration-source execution plan ${planName} contains duplicate paths.`);
    }
  }
  const learning = manifest.execution.learningLibrary;
  const audit = manifest.execution.questionAudit;
  if (learning.baseData.length !== 1
    || learning.memoryAids.length !== 1
    || learning.diagrams.length !== 1
    || learning.glossary.length !== 1
    || audit.baseData.length !== 1
    || audit.questionBank.length !== 1) {
    throw new Error('EPPP migration-source archive singleton execution groups are invalid.');
  }

  if (!Array.isArray(manifest.files) || !manifest.files.length) {
    throw new Error('EPPP migration-source archive file inventory is empty.');
  }
  const inventoryPaths = [];
  for (const record of manifest.files) {
    if (
      !record
      || typeof record !== 'object'
      || JSON.stringify(Object.keys(record).sort(compareText))
        !== JSON.stringify(['bytes', 'path', 'sha256'])
      || !Number.isSafeInteger(record.bytes)
      || record.bytes < 0
      || !/^[a-f0-9]{64}$/.test(record.sha256)
    ) {
      throw new Error('EPPP migration-source archive contains an invalid file record.');
    }
    assertSafeRelativePath(record.path);
    inventoryPaths.push(record.path);
  }
  if (new Set(inventoryPaths).size !== inventoryPaths.length) {
    throw new Error('EPPP migration-source archive inventory contains duplicate paths.');
  }
  if (JSON.stringify(inventoryPaths) !== JSON.stringify([...inventoryPaths].sort(compareText))) {
    throw new Error('EPPP migration-source archive inventory must be path-sorted.');
  }
  const expectedPayloadPaths = [...new Set([...executionPaths, ...METADATA_PATHS])].sort(compareText);
  if (JSON.stringify(inventoryPaths) !== JSON.stringify(expectedPayloadPaths)) {
    throw new Error('EPPP migration-source archive inventory and execution plan do not match.');
  }
  if (!/^[a-f0-9]{64}$/.test(manifest.payloadSha256)
    || archivePayloadSha256(manifest) !== manifest.payloadSha256) {
    throw new Error('EPPP migration-source archive manifest payload digest mismatch.');
  }
  return manifest;
}

function openEpppMigrationSourceArchive(options = {}) {
  const workspaceRoot = options.workspaceRoot
    ? path.resolve(options.workspaceRoot)
    : path.resolve(__dirname, '..');
  const archiveRoot = options.archiveRoot
    ? path.resolve(options.archiveRoot)
    : path.join(workspaceRoot, ...ARCHIVE_ROOT_RELATIVE.split('/'));
  const manifestPath = path.join(archiveRoot, MANIFEST_FILENAME);
  const manifestBytes = fs.readFileSync(manifestPath);
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch (error) {
    throw new Error(`Invalid EPPP migration-source archive manifest JSON: ${error.message}`);
  }
  validateManifest(manifest);

  const verifiedFiles = new Map();
  for (const record of manifest.files) {
    const filePath = path.resolve(archiveRoot, ...record.path.split('/'));
    const relativeCheck = path.relative(archiveRoot, filePath);
    if (!relativeCheck || relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) {
      throw new Error(`EPPP migration-source archive path escaped its root: ${record.path}`);
    }
    const bytes = fs.readFileSync(filePath);
    if (bytes.length !== record.bytes) {
      throw new Error(`EPPP migration-source archive byte-length mismatch: ${record.path}`);
    }
    if (sha256(bytes) !== record.sha256) {
      throw new Error(`EPPP migration-source archive SHA-256 mismatch: ${record.path}`);
    }
    verifiedFiles.set(record.path, bytes);
  }

  const actualPaths = walkFiles(archiveRoot)
    .filter((relativePath) => relativePath !== MANIFEST_FILENAME);
  const expectedPaths = manifest.files.map((record) => record.path);
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error('EPPP migration-source archive contains missing or unmanifested files.');
  }

  function readBuffer(relativePath) {
    assertSafeRelativePath(relativePath);
    const bytes = verifiedFiles.get(relativePath);
    if (!bytes) throw new Error(`Unmanifested EPPP migration-source archive read: ${relativePath}`);
    return Buffer.from(bytes);
  }

  return Object.freeze({
    archiveRoot,
    archiveRootRelative: ARCHIVE_ROOT_RELATIVE,
    manifestPath,
    manifest,
    manifestSha256: sha256(manifestBytes),
    payloadSha256: manifest.payloadSha256,
    readBuffer,
    readText(relativePath) {
      return readBuffer(relativePath).toString('utf8');
    },
  });
}

module.exports = {
  ARCHIVE_ID,
  ARCHIVE_ROOT_RELATIVE,
  ARCHIVE_SCHEMA_VERSION,
  EXECUTION_PLAN_GROUPS,
  MANIFEST_FILENAME,
  METADATA_PATHS,
  archivePayloadSha256,
  canonicalJson,
  openEpppMigrationSourceArchive,
  sha256,
  validateManifest,
};
