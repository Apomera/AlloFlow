'use strict';

/**
 * Generated-compatibility source manifest for view_pdf_audit_source.jsx.
 *
 * Concatenating VIEW_PDF_AUDIT_PARTS in order reproduces view_pdf_audit_source.jsx
 * byte-for-byte (100% SHA-256 parity). Boundaries match the AST-verified seams
 * in dev-tools/verify_remediation_modularization.cjs.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const VIEW_PDF_AUDIT_TARGET = 'view_pdf_audit_source.jsx';

const VIEW_PDF_AUDIT_PARTS = Object.freeze([
  'remediation_modules/view/01_security_and_verification_helpers.jsx',
  'remediation_modules/view/02_docx_odt_pptx_exporters.js',
  'remediation_modules/view/03_epub_daisy_braille_narration.js',
  'remediation_modules/view/04_doc_modes_and_diagnostics.jsx',
  'remediation_modules/view/05_pdf_audit_view_core.jsx',
]);

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function writeAtomic(filePath, buf) {
  const tempPath = filePath + '.sync-' + process.pid + '-' + Date.now() + '.tmp';
  try {
    fs.writeFileSync(tempPath, buf);
    fs.renameSync(tempPath, filePath);
  } finally {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (_) {}
  }
}

function assembleViewPdfAuditBuffer(rootDir = DEFAULT_ROOT) {
  const base = rootDir ? path.resolve(rootDir) : DEFAULT_ROOT;
  const chunks = [];
  for (const relPath of VIEW_PDF_AUDIT_PARTS) {
    const absPath = path.join(base, relPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`[view_manifest] Missing view_pdf_audit part: ${relPath} (${absPath})`);
    }
    chunks.push(fs.readFileSync(absPath));
  }
  return Buffer.concat(chunks);
}

function assembleViewPdfAuditSource(rootDir = DEFAULT_ROOT) {
  return assembleViewPdfAuditBuffer(rootDir).toString('utf8');
}

function checkViewPdfAuditSync(rootDir = DEFAULT_ROOT) {
  const base = rootDir ? path.resolve(rootDir) : DEFAULT_ROOT;
  const targetPath = path.join(base, VIEW_PDF_AUDIT_TARGET);
  const assembledBuf = assembleViewPdfAuditBuffer(base);
  const assembledSha256 = sha256Buffer(assembledBuf);
  const exists = fs.existsSync(targetPath);
  const currentBuf = exists ? fs.readFileSync(targetPath) : null;
  const currentSha256 = currentBuf ? sha256Buffer(currentBuf) : null;
  const inSync = Boolean(exists && currentBuf && assembledBuf.equals(currentBuf));

  return {
    ok: inSync,
    inSync,
    exists,
    targetPath,
    assembledSha256,
    currentSha256,
    assembledBytes: assembledBuf.length,
    currentBytes: currentBuf ? currentBuf.length : 0,
    partCount: VIEW_PDF_AUDIT_PARTS.length,
    parts: VIEW_PDF_AUDIT_PARTS,
  };
}

function syncViewPdfAuditSource(rootDir = DEFAULT_ROOT) {
  const base = rootDir ? path.resolve(rootDir) : DEFAULT_ROOT;
  const targetPath = path.join(base, VIEW_PDF_AUDIT_TARGET);
  const assembledBuf = assembleViewPdfAuditBuffer(base);
  const assembledSha256 = sha256Buffer(assembledBuf);
  const exists = fs.existsSync(targetPath);
  const currentBuf = exists ? fs.readFileSync(targetPath) : null;
  const alreadyIdentical = Boolean(exists && currentBuf && assembledBuf.equals(currentBuf));

  if (!alreadyIdentical) {
    writeAtomic(targetPath, assembledBuf);
  }

  return {
    targetPath,
    written: !alreadyIdentical,
    changed: !alreadyIdentical,
    sha256: assembledSha256,
    bytes: assembledBuf.length,
    partCount: VIEW_PDF_AUDIT_PARTS.length,
    source: assembledBuf.toString('utf8'),
  };
}

module.exports = {
  VIEW_PDF_AUDIT_PARTS,
  assembleViewPdfAuditSource,
  checkViewPdfAuditSync,
  syncViewPdfAuditSource,
};
