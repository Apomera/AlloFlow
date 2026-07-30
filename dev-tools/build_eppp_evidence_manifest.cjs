#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  artifacts,
  evidenceRoot,
  evidencePath,
  familyFiles,
  provenanceRoot,
  workspaceRoot,
} = require('./eppp_evidence_paths.cjs');
const { openEpppMigrationSourceArchive } = require('./eppp_migration_source_archive.cjs');

const manifestPath = path.join(evidenceRoot, 'manifest.json');
const relocationBaselinePath = path.join(provenanceRoot, 'relocation_baseline_v1.json');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function writeIfChanged(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === contents) return false;
  fs.writeFileSync(filePath, contents, 'utf8');
  return true;
}

const expectedPaths = new Set(artifacts.map(({ family, file }) => path.normalize(evidencePath(family, file))));
const actualPaths = fs.existsSync(evidenceRoot)
  ? fs.readdirSync(evidenceRoot, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(entry.parentPath || entry.path, entry.name))
      .filter((filePath) => path.normalize(filePath) !== path.normalize(manifestPath))
  : [];
const unexpected = actualPaths.filter((filePath) => !expectedPaths.has(path.normalize(filePath)));
if (unexpected.length) {
  throw new Error(`Unexpected files in EPPP evidence root:\n${unexpected.map((filePath) => path.relative(workspaceRoot, filePath)).join('\n')}`);
}

const relocationBaselineBytes = fs.readFileSync(relocationBaselinePath);
const relocationBaseline = JSON.parse(relocationBaselineBytes.toString('utf8'));
if (relocationBaseline.schemaVersion !== 1
  || relocationBaseline.baselineId !== 'eppp-evidence-relocation-v1'
  || relocationBaseline.artifactCount !== artifacts.length
  || !/^[a-f0-9]{40}$/.test(relocationBaseline.sourceCommit)
  || !Array.isArray(relocationBaseline.artifacts)
  || relocationBaseline.artifacts.length !== artifacts.length) {
  throw new Error('Invalid EPPP evidence relocation baseline.');
}
const baselineByArtifact = new Map(relocationBaseline.artifacts.map((record) => [`${record.family}/${record.file}`, record]));

const records = artifacts.map(({ family, file }) => {
  const filePath = evidencePath(family, file);
  if (!fs.existsSync(filePath)) throw new Error(`Missing EPPP evidence artifact: ${path.relative(workspaceRoot, filePath)}`);
  const bytes = fs.readFileSync(filePath);
  const baseline = baselineByArtifact.get(`${family}/${file}`);
  const expectedHistoricalSource = `test_prep/eppp_legacy/${file}`;
  const expectedHistoricalPublic = `desktop/web-app/public/test_prep/eppp_legacy/${file}`;
  if (!baseline
    || baseline.historicalSourcePath !== expectedHistoricalSource
    || baseline.historicalPublicPath !== expectedHistoricalPublic
    || !Number.isSafeInteger(baseline.originalBytes)
    || baseline.originalBytes < 0
    || !/^[a-f0-9]{64}$/.test(baseline.originalSha256)
    || typeof baseline.preservationPath !== 'string'
    || !baseline.preservationPath.startsWith('quality/eppp_provenance/')) {
    throw new Error(`Invalid relocation baseline record: ${family}/${file}`);
  }
  const preservationPath = path.resolve(workspaceRoot, ...baseline.preservationPath.split('/'));
  const relativePreservation = path.relative(provenanceRoot, preservationPath);
  if (!relativePreservation || relativePreservation.startsWith('..') || path.isAbsolute(relativePreservation)) {
    throw new Error(`Relocation preservation path escaped provenance root: ${family}/${file}`);
  }
  const originalBytes = fs.readFileSync(preservationPath);
  if (originalBytes.length !== baseline.originalBytes || sha256(originalBytes) !== baseline.originalSha256) {
    throw new Error(`Original relocation bytes failed verification: ${family}/${file}`);
  }
  return {
    family,
    file,
    repositoryPath: path.relative(workspaceRoot, filePath).replaceAll(path.sep, '/'),
    bytes: bytes.length,
    sha256: sha256(bytes),
    relocationOriginal: {
      historicalSourcePath: baseline.historicalSourcePath,
      historicalPublicPath: baseline.historicalPublicPath,
      bytes: baseline.originalBytes,
      sha256: baseline.originalSha256,
      preservationPath: baseline.preservationPath,
      liveArtifactMayAdvance: baseline.liveArtifactMayAdvance === true,
    },
  };
});

const sourceArchive = openEpppMigrationSourceArchive({ workspaceRoot });
const manifest = {
  schemaVersion: 2,
  purpose: 'Deterministic integrity manifest for non-runtime EPPP QA, curation, adjudication, and review evidence.',
  provenanceRoot: path.relative(workspaceRoot, provenanceRoot).replaceAll(path.sep, '/'),
  evidenceRoot: path.relative(workspaceRoot, evidenceRoot).replaceAll(path.sep, '/'),
  relocationBaseline: {
    baselineId: relocationBaseline.baselineId,
    path: path.relative(workspaceRoot, relocationBaselinePath).replaceAll(path.sep, '/'),
    sourceCommit: relocationBaseline.sourceCommit,
    artifactCount: relocationBaseline.artifactCount,
    sha256: sha256(relocationBaselineBytes),
  },
  migrationSourceArchive: {
    archiveId: sourceArchive.manifest.archiveId,
    root: sourceArchive.archiveRootRelative,
    payloadSha256: sourceArchive.payloadSha256,
  },
  runtimePublished: false,
  artifactCount: records.length,
  families: Object.fromEntries(Object.entries(familyFiles).map(([family, files]) => [family, files.length])),
  artifacts: records,
};

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
const changed = writeIfChanged(manifestPath, serialized);
const persisted = fs.readFileSync(manifestPath);
if (sha256(persisted) !== sha256(Buffer.from(serialized))) throw new Error('EPPP evidence manifest write verification failed.');

console.log(`EPPP evidence manifest: ${records.length} artifacts; ${changed ? 'updated' : 'unchanged'}.`);
