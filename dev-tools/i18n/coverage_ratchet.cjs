'use strict';

// Missing-translation RATCHET for the pack-coverage audits (2026-10-16).
//
// audit_ui_pack_coverage and audit_runtime_pack_coverage --gate demand ZERO missing
// entries in all 63 packs. The catalog has never met that: when both were wired
// into verify:gate on 2026-08-25 there were millions of missing UI entries and
// hundreds of thousands of runtime ones, so the blocking gate went red and stayed
// red, and a genuinely new gap could not change its colour.
//
// --ratchet keeps every check that IS at zero as a hard failure (invalid types,
// placeholder mismatches, mirror drift, read errors; the callers enforce those)
// and lets the missing count only go DOWN, per pack and per top-level namespace,
// against a committed baseline. A new English key that ships untranslated grows
// its namespace by one per pack and fails here, naming the namespace.
//
//   --ratchet                     compare against the baseline (exit 1 on growth)
//   --update-ratchet              rewrite the baseline; refuses growth unless
//   --allow-increase              is also passed (a deliberate, recorded decision)
//   --ratchet-baseline=<path>     alternate baseline (tests / mutation checks)

const fs = require('node:fs');
const path = require('node:path');

function argValue(argv, name) {
  const hit = argv.find((arg) => arg.startsWith(name + '='));
  return hit ? hit.slice(name.length + 1).trim() : null;
}

function readBaseline(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
}

function sum(map) {
  return Object.values(map).reduce((a, b) => a + b, 0);
}

// current: { perPack: { slug: missing }, perNamespace: { ns: missing } }
function compare(baseline, current) {
  const growth = [];
  const improved = [];
  for (const [scope, label] of [['perPack', 'pack'], ['perNamespace', 'namespace']]) {
    const was = baseline[scope] || {};
    const now = current[scope] || {};
    for (const [name, count] of Object.entries(now)) {
      const allowed = Object.prototype.hasOwnProperty.call(was, name) ? was[name] : 0;
      if (count > allowed) growth.push({ label, name, allowed, count });
      else if (count < allowed) improved.push({ label, name, allowed, count });
    }
    for (const [name, allowed] of Object.entries(was)) {
      if (!Object.prototype.hasOwnProperty.call(now, name) && allowed > 0) improved.push({ label, name, allowed, count: 0 });
    }
  }
  growth.sort((a, b) => (b.count - b.allowed) - (a.count - a.allowed));
  return { growth, improved };
}

// Returns the process exit code contribution: 1 on growth or an unusable baseline.
function run({ argv, tool, defaultBaseline, current, missingSamples }) {
  const baselinePath = path.resolve(argValue(argv, '--ratchet-baseline') || defaultBaseline);
  const update = argv.includes('--update-ratchet');
  const allowIncrease = argv.includes('--allow-increase');
  const quiet = argv.includes('--quiet');
  const baseline = readBaseline(baselinePath);
  if (!Object.keys(current.perPack).length) {
    // Zero packs scanned is an unusable run, never a pass.
    console.error(`${tool}: ratchet saw no packs; refusing to report a result.`);
    return 1;
  }
  if (update) {
    if (baseline && !allowIncrease) {
      const { growth } = compare(baseline, current);
      if (growth.length) {
        console.error(`${tool}: refusing --update-ratchet, ${growth.length} count(s) went UP. Pass --allow-increase only as a deliberate, recorded decision.`);
        return 1;
      }
    }
    fs.writeFileSync(baselinePath, JSON.stringify({
      note: `Missing-entry ratchet for ${tool}. Counts may only go down; see dev-tools/i18n/coverage_ratchet.cjs.`,
      updated: new Date().toISOString().slice(0, 10),
      totalMissing: sum(current.perPack),
      perPack: current.perPack,
      perNamespace: current.perNamespace,
    }, null, 1) + '\n');
    console.log(`${tool}: ratchet baseline written (${sum(current.perPack)} missing across ${Object.keys(current.perPack).length} packs).`);
    return 0;
  }
  if (!baseline) {
    console.error(`${tool}: no ratchet baseline at ${path.relative(process.cwd(), baselinePath)}; run with --update-ratchet once.`);
    return 1;
  }
  const { growth, improved } = compare(baseline, current);
  if (growth.length) {
    console.error(`❌ ${tool}: missing translations GREW (${sum(baseline.perPack || {})} -> ${sum(current.perPack)}).`);
    for (const g of growth.slice(0, 25)) {
      const sample = g.label === 'pack' && missingSamples && missingSamples[g.name] ? `  e.g. ${missingSamples[g.name].slice(0, 3).join(', ')}` : '';
      console.error(`  ${g.label} ${g.name}: ${g.allowed} -> ${g.count} (+${g.count - g.allowed})${sample}`);
    }
    if (growth.length > 25) console.error(`  ...and ${growth.length - 25} more`);
    console.error('  A namespace growing by one per pack is a new English key with no translations: add them, or');
    console.error('  re-baseline with --update-ratchet --allow-increase as a recorded decision.');
    return 1;
  }
  if (!quiet) {
    console.log(`✓ ${tool}: missing translations did not grow (${sum(current.perPack)} vs baseline ${sum(baseline.perPack || {})}).`);
    if (improved.length) console.log(`  improved in ${improved.length} pack/namespace count(s): run --update-ratchet to lock the win in.`);
  }
  return 0;
}

module.exports = { run, compare };
