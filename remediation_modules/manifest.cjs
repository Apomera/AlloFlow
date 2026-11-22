'use strict';

/**
 * Unified remediation modularization manifest facade.
 *
 * Re-exports the doc_pipeline manifest helpers from ./pipeline_manifest.cjs and
 * lazily delegates view_pdf_audit manifest helpers to ./view_manifest.cjs so
 * Phase 2A (pipeline) and Phase 2B (view) remain decoupled during parallel work
 * and expose a single entry point for dev-tools/verify_remediation_modularization.cjs.
 */

const fs = require('fs');
const path = require('path');

const pipelineManifest = require('./pipeline_manifest.cjs');

const VIEW_MANIFEST_PATH = path.join(__dirname, 'view_manifest.cjs');

function loadViewManifest(required) {
  if (!fs.existsSync(VIEW_MANIFEST_PATH)) {
    if (required) {
      throw new Error(
        `[RemediationManifest] remediation_modules/view_manifest.cjs is not present yet (expected at ${VIEW_MANIFEST_PATH})`
      );
    }
    return null;
  }
  return require(VIEW_MANIFEST_PATH);
}

function assembleViewPdfAuditSource(rootDir) {
  const viewManifest = loadViewManifest(true);
  return viewManifest.assembleViewPdfAuditSource(rootDir);
}

function checkViewPdfAuditSync(rootDir) {
  const viewManifest = loadViewManifest(true);
  return viewManifest.checkViewPdfAuditSync(rootDir);
}

function syncViewPdfAuditSource(rootDir) {
  const viewManifest = loadViewManifest(true);
  return viewManifest.syncViewPdfAuditSource(rootDir);
}

const manifestExports = {
  DOC_PIPELINE_PARTS: pipelineManifest.DOC_PIPELINE_PARTS,
  assembleDocPipelineSource: pipelineManifest.assembleDocPipelineSource,
  checkDocPipelineSync: pipelineManifest.checkDocPipelineSync,
  syncDocPipelineSource: pipelineManifest.syncDocPipelineSource,
  assembleViewPdfAuditSource,
  checkViewPdfAuditSync,
  syncViewPdfAuditSource,
};

Object.defineProperty(manifestExports, 'VIEW_PDF_AUDIT_PARTS', {
  enumerable: true,
  configurable: true,
  get() {
    const viewManifest = loadViewManifest(false);
    return viewManifest ? viewManifest.VIEW_PDF_AUDIT_PARTS : null;
  },
});

module.exports = manifestExports;
