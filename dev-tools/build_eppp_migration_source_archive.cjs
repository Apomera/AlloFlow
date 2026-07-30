#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  ARCHIVE_ID,
  ARCHIVE_ROOT_RELATIVE,
  ARCHIVE_SCHEMA_VERSION,
  EXECUTION_PLAN_GROUPS,
  MANIFEST_FILENAME,
  METADATA_PATHS,
  archivePayloadSha256,
  openEpppMigrationSourceArchive,
  sha256,
} = require('./eppp_migration_source_archive.cjs');

const workspaceRoot = path.resolve(__dirname, '..');
const historicalRoot = path.join(workspaceRoot, 'test_prep', 'eppp_legacy');
const archiveRoot = path.join(workspaceRoot, ...ARCHIVE_ROOT_RELATIVE.split('/'));
const creationFlag = '--create-from-legacy';
const allowedArguments = new Set([creationFlag, '--verify']);
const unknownArguments = process.argv.slice(2).filter((argument) => !allowedArguments.has(argument));
if (unknownArguments.length) throw new Error(`Unknown argument(s): ${unknownArguments.join(', ')}`);

const originNote = `# EPPP native-migration source archive

This versioned archive contains only the historical JavaScript data inputs required to
reproduce AlloFlow's native EPPP learning-library projection and raw-question audit.
It intentionally excludes the former standalone HTML/CSS UI, runtime renderers,
deployment wrappers, analytics, review ledgers, adjudication files, curation reports,
and other mutable QA evidence.

Origin: \`test_prep/eppp_legacy\` in this repository.

The files remain governed by the accompanying proprietary LICENSE. Archiving them for
an internal reproducible migration does not expand, replace, or waive those terms.

Immutability rule: never refresh this directory in place. If a different historical
source snapshot must be preserved, create a new version directory and manifest.
`;

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function scriptPathsFromHistoricalIndex() {
  const html = fs.readFileSync(path.join(historicalRoot, 'index.html'), 'utf8');
  return Array.from(
    html.matchAll(/<script\s+src=["']([^"']+\.js)(?:\?[^"']*)?["']/gi),
    (match) => match[1].replace(/\\/g, '/'),
  );
}

function buildExecutionPlans(scriptPaths) {
  const execution = {
    learningLibrary: {
      baseData: scriptPaths.filter((entry) => entry === 'js/data.js'),
      flashcards: scriptPaths.filter((entry) => /^js\/flashcards_(?:data|batch\d+)\.js$/i.test(entry)),
      memoryAids: scriptPaths.filter((entry) => entry === 'js/memory_aids.js'),
      chapters: scriptPaths.filter((entry) => /^js\/textbook_ch(?:\d+|\d+_\d+)\.js$/i.test(entry)),
      diagrams: scriptPaths.filter((entry) => entry === 'js/textbook_diagrams.js'),
      glossary: scriptPaths.filter((entry) => entry === 'js/textbook_term_defs.js'),
    },
    questionAudit: {
      baseData: scriptPaths.filter((entry) => entry === 'js/data.js'),
      questionBank: scriptPaths.filter((entry) => entry === 'js/questions_bank.js'),
      dataBatches: scriptPaths.filter((entry) => /^js\/data_batch\d+\.js$/i.test(entry)),
      rationaleEnhancements: scriptPaths.filter((entry) => /^js\/rationale_enhancements\d*\.js$/i.test(entry)),
      referenceOverlays: scriptPaths.filter((entry) => /^js\/references_overlay\d+\.js$/i.test(entry)),
    },
  };
  for (const [planName, groups] of Object.entries(EXECUTION_PLAN_GROUPS)) {
    const selected = groups.flatMap((group) => execution[planName][group]);
    if (new Set(selected).size !== selected.length) {
      throw new Error(`Historical EPPP ${planName} source selection contains duplicate paths.`);
    }
    if (groups.some((group) => !execution[planName][group].length)) {
      throw new Error(`Historical EPPP ${planName} source selection is incomplete.`);
    }
  }
  if (
    execution.learningLibrary.baseData.length !== 1
    || execution.learningLibrary.memoryAids.length !== 1
    || execution.learningLibrary.diagrams.length !== 1
    || execution.learningLibrary.glossary.length !== 1
    || execution.questionAudit.baseData.length !== 1
    || execution.questionAudit.questionBank.length !== 1
  ) {
    throw new Error('Historical EPPP singleton migration-source selection is invalid.');
  }
  return execution;
}

function createArchive() {
  if (fs.existsSync(archiveRoot)) {
    throw new Error(
      `Refusing to overwrite immutable EPPP migration-source archive: ${ARCHIVE_ROOT_RELATIVE}`,
    );
  }
  const execution = buildExecutionPlans(scriptPathsFromHistoricalIndex());
  const sourceByPath = new Map();
  const selectedPaths = Object.entries(EXECUTION_PLAN_GROUPS).flatMap(
    ([planName, groups]) => groups.flatMap((group) => execution[planName][group]),
  );
  for (const relativePath of new Set(selectedPaths)) {
    sourceByPath.set(relativePath, fs.readFileSync(
      path.join(historicalRoot, ...relativePath.split('/')),
    ));
  }
  sourceByPath.set('LICENSE', fs.readFileSync(path.join(historicalRoot, 'LICENSE')));
  sourceByPath.set('ORIGIN.md', Buffer.from(originNote, 'utf8'));

  const files = [...sourceByPath.entries()]
    .map(([relativePath, bytes]) => ({
      path: relativePath,
      bytes: bytes.length,
      sha256: sha256(bytes),
    }))
    .sort((left, right) => compareText(left.path, right.path));
  const manifest = {
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
    archiveId: ARCHIVE_ID,
    frozenFrom: {
      historicalRoot: 'test_prep/eppp_legacy',
      selection: 'native-regeneration-inputs-only',
    },
    immutability: 'append-only-versioned-archive; replace by creating a new version directory',
    metadataPaths: [...METADATA_PATHS],
    execution,
    files,
  };
  manifest.payloadSha256 = archivePayloadSha256(manifest);

  fs.mkdirSync(archiveRoot, { recursive: true });
  for (const [relativePath, bytes] of sourceByPath) {
    const targetPath = path.join(archiveRoot, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, bytes, { flag: 'wx' });
  }
  fs.writeFileSync(
    path.join(archiveRoot, MANIFEST_FILENAME),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { encoding: 'utf8', flag: 'wx' },
  );
}

if (process.argv.includes(creationFlag)) createArchive();
const archive = openEpppMigrationSourceArchive({ workspaceRoot });
console.log(
  `Verified ${archive.manifest.files.length} EPPP migration-source archive files `
  + `(${archive.manifest.execution.learningLibrary.chapters.length} chapter scripts, `
  + `${archive.manifest.execution.questionAudit.dataBatches.length} question batches); `
  + `payload SHA-256 ${archive.payloadSha256}.`,
);
