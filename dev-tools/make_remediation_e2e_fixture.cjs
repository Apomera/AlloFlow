#!/usr/bin/env node
// Writes tests/e2e/artifacts/remediation-e2e.source.pdf when it is missing.
//
// tests/e2e/artifacts/ is gitignored. The file is normally a by-product of
// tests/e2e/remediation_corpus_golden.spec.ts (its clean 2-page text fixture), so on a
// developer machine it exists and on a fresh CI checkout it does not: six MCP Vitest files
// (mcp_driver_scripted_e2e, mcp_driver_provider_e2e, mcp_agent_bridge_vision_pages,
// mcp_artifact_resources_live, mcp_batch_audit_e2e, mcp_checkpoint_document_digest) then
// failed with ENOENT before testing anything.
//
// This builds the SAME document the corpus golden builds (same text, fonts, page sizes),
// with the committed, manifest-pinned pdf-lib in desktop/mcp/vendor, so no network and no
// browser are needed. An existing file is left alone unless --force is passed.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
const OUT = outArg ? path.resolve(outArg.slice('--out='.length)) : path.join(ROOT, 'tests', 'e2e', 'artifacts', 'remediation-e2e.source.pdf');
const force = process.argv.includes('--force');

async function main() {
  if (fs.existsSync(OUT) && !force) {
    console.log('remediation e2e fixture present: ' + path.relative(ROOT, OUT));
    return;
  }
  const { PDFDocument, StandardFonts } = require(path.join(ROOT, 'desktop', 'mcp', 'vendor', 'pdf-lib.min.js'));
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const p1 = doc.addPage([612, 792]);
  p1.drawText('Photosynthesis Study Guide', { x: 50, y: 740, size: 22, font });
  p1.drawText('Plants convert light energy into chemical energy stored as glucose.', { x: 50, y: 700, size: 12, font });
  const p2 = doc.addPage([612, 792]);
  p2.drawText('Review Questions', { x: 50, y: 740, size: 18, font });
  p2.drawText('Explain the role of chlorophyll in the light reactions.', { x: 50, y: 700, size: 12, font });
  const bytes = await doc.save();
  if (!bytes || bytes.length < 500 || Buffer.from(bytes.subarray(0, 5)).toString('latin1') !== '%PDF-') {
    throw new Error('generated fixture is not a PDF (' + (bytes ? bytes.length : 0) + ' bytes)');
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, bytes);
  console.log('wrote remediation e2e fixture: ' + path.relative(ROOT, OUT) + ' (' + bytes.length + ' bytes)');
}

main().catch((err) => {
  console.error('make_remediation_e2e_fixture: ' + (err && err.stack || err));
  process.exit(1);
});
