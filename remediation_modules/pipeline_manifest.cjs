'use strict';

/**
 * Generated-compatibility modular manifest for doc_pipeline_source.jsx.
 *
 * The 9 ordered slices under remediation_modules/pipeline/ partition
 * doc_pipeline_source.jsx along AST-verified statement boundaries (verified by
 * dev-tools/verify_remediation_modularization.cjs). Concatenating them in order
 * reproduces doc_pipeline_source.jsx 100% byte-identically so all existing
 * tests, build scripts, and integrity checks remain seamlessly compatible.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const DOC_PIPELINE_TARGET = 'doc_pipeline_source.jsx';

const DOC_PIPELINE_PARTS = Object.freeze([
  'remediation_modules/pipeline/01_pure_helpers_and_policies.js',
  'remediation_modules/pipeline/01b_core_orchestration_head.js',
  'remediation_modules/pipeline/02_office_and_pdf_extractors.js',
  'remediation_modules/pipeline/02b_core_audit_and_batch.js',
  'remediation_modules/pipeline/03_auditors_and_deterministic_fixers.js',
  'remediation_modules/pipeline/03b_core_fix_loop.js',
  'remediation_modules/pipeline/04_reports_and_inplace_tagging.js',
  'remediation_modules/pipeline/05_resource_and_pack_generators.js',
  'remediation_modules/pipeline/06_core_lock_and_exports.js',
]);

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function resolveRoot(rootDir) {
  return rootDir ? path.resolve(rootDir) : DEFAULT_ROOT;
}

function assembleDocPipelineBuffer(rootDir = DEFAULT_ROOT) {
  const root = resolveRoot(rootDir);
  const buffers = [];
  for (const relPart of DOC_PIPELINE_PARTS) {
    const absPart = path.join(root, relPart);
    if (!fs.existsSync(absPart)) {
      throw new Error(`[DocPipelineManifest] Missing modular part: ${relPart} (expected at ${absPart})`);
    }
    buffers.push(fs.readFileSync(absPart));
  }
  return Buffer.concat(buffers);
}

function assembleDocPipelineSource(rootDir = DEFAULT_ROOT) {
  return assembleDocPipelineBuffer(rootDir).toString('utf8');
}

function checkDocPipelineSync(rootDir = DEFAULT_ROOT) {
  const root = resolveRoot(rootDir);
  const assembledBuf = assembleDocPipelineBuffer(root);
  const assembledSha256 = sha256Buffer(assembledBuf);
  const targetPath = path.join(root, DOC_PIPELINE_TARGET);
  const exists = fs.existsSync(targetPath);
  const targetBuf = exists ? fs.readFileSync(targetPath) : null;
  const inSync = Boolean(exists && targetBuf.equals(assembledBuf));

  return {
    ok: inSync,
    inSync,
    exists,
    targetPath,
    partCount: DOC_PIPELINE_PARTS.length,
    assembledBytes: assembledBuf.length,
    targetBytes: targetBuf ? targetBuf.length : 0,
    assembledSha256,
    targetSha256: targetBuf ? sha256Buffer(targetBuf) : null,
  };
}

function writeAtomicBuffer(targetPath, buf) {
  const tempPath = `${targetPath}.sync-${process.pid}-${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempPath, buf);
    fs.renameSync(tempPath, targetPath);
  } finally {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (_) {
      // Ignore cleanup failures after successful rename.
    }
  }
}

function syncDocPipelineSource(rootDir = DEFAULT_ROOT) {
  const root = resolveRoot(rootDir);
  const assembledBuf = assembleDocPipelineBuffer(root);
  const assembledSha256 = sha256Buffer(assembledBuf);
  const targetPath = path.join(root, DOC_PIPELINE_TARGET);
  const exists = fs.existsSync(targetPath);
  const unchanged = exists && fs.readFileSync(targetPath).equals(assembledBuf);

  if (!unchanged) {
    writeAtomicBuffer(targetPath, assembledBuf);
  }

  return {
    ok: true,
    changed: !unchanged,
    written: !unchanged,
    targetPath,
    partCount: DOC_PIPELINE_PARTS.length,
    bytes: assembledBuf.length,
    sha256: assembledSha256,
    source: assembledBuf.toString('utf8'),
  };
}

module.exports = {
  DOC_PIPELINE_PARTS,
  assembleDocPipelineSource,
  checkDocPipelineSync,
  syncDocPipelineSource,
};
