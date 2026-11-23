#!/usr/bin/env node
'use strict';
// Read-only catalog image, alt-text, alt-hash, and native-profile contract audit.
// Run from the repository root. Optional first argument: report date (YYYY-MM-DD).
// Optional flag: --no-write to skip writing docs/allopack-quality-<date>/. No model calls.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const service = require('../agent_core_resource_pack_module.js');
const media = require('../agent_core_pack_media_module.js');

const HASH_REQUIRED_KINDS = new Set(['glossary', 'sort', 'panel', 'timeline', 'override']);
const COVERAGE_SPECS = [
  ['glossary', 'glossary', r => (Array.isArray(r.data) ? r.data : []), 'image'],
  ['anchor-chart', 'anchor-chart', r => (r.data && Array.isArray(r.data.sections) ? r.data.sections : []), 'iconUrl'],
  ['concept-sort', 'concept-sort', r => (r.data && Array.isArray(r.data.items) ? r.data.items : []), 'image'],
  ['timeline', 'timeline', r => (r.data && Array.isArray(r.data.items) ? r.data.items : []), 'image'],
  ['memory-aid', 'memory-aid', r => (r.data && Array.isArray(r.data.cards) ? r.data.cards : []), 'visualImage'],
  ['applied-challenge', 'applied-challenge', r => (r.data && typeof r.data === 'object' ? [r.data.visual || {}] : []), 'image'],
  ['image-panels', 'image', r => (r.data && r.data.visualPlan && Array.isArray(r.data.visualPlan.panels) ? r.data.visualPlan.panels : []), 'imageUrl'],
];

function auditPack(p, filePath) {
  const history = Array.isArray(p && p.history) ? p.history : [];
  const reviewStatus = p && p.allopack && typeof p.allopack.reviewStatus === 'string' && p.allopack.reviewStatus.trim()
    ? p.allopack.reviewStatus.trim()
    : null;
  const row = {
    file: filePath,
    resources: history.length,
    reviewStatus,
    embeddedImagePlacements: 0,
    uniqueImages: 0,
    missingAlt: [],
    staleAltHash: [],
    unknownImageFields: [],
    coverage: {},
    draftValidator: {},
    mediaValidator: {},
  };

  const slots = media.getImageSlots(p, { profile: 'native' });
  const knownSlotPaths = new Set(slots.map(s => s.path.replace(/^pack\./, '')));
  const hashes = new Set();

  function walk(node, at) {
    if (typeof node === 'string') {
      if (node.startsWith('data:image/')) {
        row.embeddedImagePlacements++;
        hashes.add(crypto.createHash('sha256').update(node).digest('hex'));
        if (!knownSlotPaths.has(at)) row.unknownImageFields.push(at);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, at + '[' + i + ']'));
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      walk(v, at + '.' + k);
    }
  }
  walk(history, 'history');
  row.uniqueImages = hashes.size;

  for (const slot of slots) {
    if (slot.skipDescription || slot.rendererDescription) continue;
    const owner = slot.owner;
    const f = slot.fields;
    const base = (slot.descriptionPath || slot.path.slice(0, -f.image.length)).replace(/^pack\./, '');
    const decorative = Boolean(f.decorative && owner[f.decorative] === true);
    if (decorative) continue;
    const alt = f.alt ? owner[f.alt] : undefined;
    if (!(typeof alt === 'string' && alt.trim())) {
      row.missingAlt.push(base + (f.alt || 'alt'));
    }
    if (f.hash) {
      const hashVal = owner[f.hash];
      const describedImage = slot.describedImage === undefined ? owner[f.image] : slot.describedImage;
      const mustCheckHash = HASH_REQUIRED_KINDS.has(slot.kind) || (hashVal !== undefined && hashVal !== '');
      if (mustCheckHash && (typeof hashVal !== 'string' || hashVal !== media.hashImage(describedImage))) {
        row.staleAltHash.push(base + f.hash);
      }
    }
  }

  for (const [label, resourceType, extract, imageKey] of COVERAGE_SPECS) {
    const entries = history.filter(r => r && r.type === resourceType).flatMap(extract);
    row.coverage[label] = {
      slots: entries.length,
      withImage: entries.filter(e => e && typeof e[imageKey] === 'string' && e[imageKey].trim()).length,
    };
  }

  try {
    const r = service.validatePack(p, { profile: 'native' });
    row.draftValidator = {
      profile: 'native',
      ok: r.ok,
      errorCodes: [...new Set((r.errors || []).map(e => e.code))],
      warningCodes: [...new Set((r.warnings || []).map(w => w.code))],
    };
  } catch (e) {
    row.draftValidator = { profile: 'native', ok: false, crash: e.message };
  }

  try {
    const m = media.validatePackMedia(p, { profile: 'native' });
    row.mediaValidator = {
      profile: 'native',
      ok: Boolean(m.ok && m.stats && m.stats.complete),
      errorCodes: [...new Set((m.errors || []).map(e => e.code))],
      warningCodes: [...new Set((m.warnings || []).map(w => w.code))],
    };
  } catch (e) {
    row.mediaValidator = { profile: 'native', ok: false, crash: e.message };
  }

  return row;
}

function runAudit({ dirs = ['allopacks/current'], date = new Date().toISOString().slice(0, 10), write = true } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('Use a YYYY-MM-DD report date');
  const rows = [];
  for (const dir of dirs) {
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.allopack.json')).sort()) {
      const p = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8').replace(/^\uFEFF/, ''));
      rows.push(auditPack(p, dir + '/' + file));
    }
  }
  const report = {
    date,
    profile: 'native',
    scope: 'Native-profile schema, media container, image presence, nonempty alt-text fields, and alt-hash alignment across allopacks/current; not visual accuracy, educator approval, or full accessibility certification.',
    files: rows.length,
    embeddedImagePlacements: rows.reduce((s, r) => s + r.embeddedImagePlacements, 0),
    missingAlt: rows.reduce((s, r) => s + r.missingAlt.length, 0),
    staleAltHash: rows.reduce((s, r) => s + r.staleAltHash.length, 0),
    unknownImageFields: rows.reduce((s, r) => s + r.unknownImageFields.length, 0),
    draftValidatorPassed: rows.filter(r => r.draftValidator.ok).length,
    draftValidatorFailed: rows.filter(r => !r.draftValidator.ok).length,
    mediaValidatorPassed: rows.filter(r => r.mediaValidator.ok).length,
    mediaValidatorFailed: rows.filter(r => !r.mediaValidator.ok).length,
    educatorReviewPendingPacks: rows.filter(r => r.reviewStatus && /review pending|draft/i.test(r.reviewStatus)).length,
    educatorVisualReviewPendingPacks: rows.filter(r => (r.draftValidator.warningCodes || []).includes('native-visual-review-pending')).length,
    rows,
  };
  if (write) {
    const output = path.join('docs', 'allopack-quality-' + date);
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'image-and-draft-coverage.json'), JSON.stringify(report, null, 2) + '\n');
  }
  return report;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const write = !args.includes('--no-write');
  const dateArg = args.find(a => !a.startsWith('--'));
  const date = dateArg || new Date().toISOString().slice(0, 10);
  const report = runAudit({ date, write });
  console.log(JSON.stringify({ ...report, rows: undefined }));
  console.log(
    'Draft valid (native)',
    report.draftValidatorPassed + '/' + report.files,
    'media valid',
    report.mediaValidatorPassed + '/' + report.files,
    'crashes',
    report.rows.filter(r => r.draftValidator.crash || r.mediaValidator.crash).length
  );
  const errorCounts = report.rows.reduce((acc, r) => {
    for (const c of r.draftValidator.errorCodes || []) acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const warningCounts = report.rows.reduce((acc, r) => {
    for (const c of r.draftValidator.warningCodes || []) acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  console.log('Draft error counts', JSON.stringify(errorCounts));
  console.log('Draft warning counts (honest pending review)', JSON.stringify(warningCounts));
  if (
    report.files === 0 ||
    report.missingAlt > 0 ||
    report.staleAltHash > 0 ||
    report.unknownImageFields > 0 ||
    report.draftValidatorFailed > 0 ||
    report.mediaValidatorFailed > 0
  ) {
    process.exitCode = 1;
  }
}

module.exports = { auditPack, runAudit };
