'use strict';

const fs = require('fs');
const path = require('path');

const ARTIFACT_REFERENCE_FIELDS = Object.freeze([
  'reviewArtifact',
  'correctionArtifact',
  'supersedesArtifact',
]);

function learningContentRecords(catalog) {
  const source = catalog && typeof catalog === 'object' ? catalog : {};
  const chapters = Array.isArray(source.chapters) ? source.chapters : [];
  return [
    ...chapters,
    ...chapters.flatMap((chapter) => Array.isArray(chapter.sections) ? chapter.sections : []),
    ...(Array.isArray(source.knowledgeChecks) ? source.knowledgeChecks : []),
    ...(Array.isArray(source.diagrams) ? source.diagrams : []),
    ...(Array.isArray(source.diagramPlacements) ? source.diagramPlacements : []),
    ...(Array.isArray(source.flashcards) ? source.flashcards : []),
    ...(Array.isArray(source.memoryAids) ? source.memoryAids : []),
  ];
}

function safeArtifactFilename(value) {
  const filename = String(value || '').trim();
  if (!filename) return '';
  if (
    path.basename(filename) !== filename
    || path.isAbsolute(filename)
    || !/^[a-z0-9][a-z0-9._-]*\.json$/i.test(filename)
  ) {
    throw new Error(`Unsafe EPPP learning review artifact filename: ${filename}`);
  }
  return filename;
}

function collectReferencedReviewArtifacts(catalog) {
  const filenames = new Set();
  for (const record of learningContentRecords(catalog)) {
    for (const field of ARTIFACT_REFERENCE_FIELDS) {
      const filename = safeArtifactFilename(record && record[field]);
      if (filename) filenames.add(filename);
    }
  }
  return [...filenames].sort((left, right) => left.localeCompare(right));
}

function resolveReferencedReviewArtifacts({ catalog, sourceRoot }) {
  const root = path.resolve(sourceRoot);
  return collectReferencedReviewArtifacts(catalog).map((filename) => {
    const sourcePath = path.resolve(root, filename);
    if (path.dirname(sourcePath) !== root) {
      throw new Error(`EPPP learning review artifact escaped its source root: ${filename}`);
    }
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      throw new Error(`Missing EPPP learning review artifact: ${filename}`);
    }
    return { filename, sourcePath };
  });
}

function copyFileWithRetry(sourcePath, destinationPath) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      fs.copyFileSync(sourcePath, destinationPath);
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw lastError;
}

function copyReferencedReviewArtifacts({ catalog, sourceRoot, deployRoot }) {
  const artifacts = resolveReferencedReviewArtifacts({ catalog, sourceRoot });
  const destinationRoot = path.resolve(deployRoot);
  fs.mkdirSync(destinationRoot, { recursive: true });
  for (const artifact of artifacts) {
    const destinationPath = path.resolve(destinationRoot, artifact.filename);
    if (path.dirname(destinationPath) !== destinationRoot) {
      throw new Error(`EPPP learning review artifact escaped its deployment root: ${artifact.filename}`);
    }
    copyFileWithRetry(artifact.sourcePath, destinationPath);
    if (!fs.readFileSync(artifact.sourcePath).equals(fs.readFileSync(destinationPath))) {
      throw new Error(`EPPP learning review artifact deployment mismatch: ${artifact.filename}`);
    }
  }
  return artifacts.map((artifact) => artifact.filename);
}

module.exports = {
  ARTIFACT_REFERENCE_FIELDS,
  collectReferencedReviewArtifacts,
  copyReferencedReviewArtifacts,
  resolveReferencedReviewArtifacts,
  safeArtifactFilename,
};
