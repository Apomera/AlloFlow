#!/usr/bin/env node
// Update lang packs where 4 specific i18n keys still hold OLD ENGLISH text
// (i.e., passthrough packs that never got hand-translated). Leave real
// translations alone — those need a translator, not a regex.
//
// Triggered by Word Sounds clinical-label pass 1: the underlying English
// meaning of these 4 keys changed, so passthrough packs (which carry
// English values for un-translated keys) need refreshing.
//
// Usage:
//   node _dev/relabel_passthrough_update.cjs                # dry-run
//   node _dev/relabel_passthrough_update.cjs --apply        # write
//
// Heuristic: case-insensitive equality between the lang pack's current
// value and a known OLD English string. If match → update. Otherwise log
// what's there so a translator can decide.

const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const PROJECT_ROOT = path.resolve(__dirname, '..');
process.chdir(PROJECT_ROOT);

// key → { oldEnglishVariants (case-insensitive match), newEnglish }
const RELABELS = {
  'benchmark_probe_results': {
    old: ['Benchmark Probe Results'],
    new: 'Practice probe results',
  },
  'configure_rti_thresholds': {
    old: ['Configure RTI Thresholds'],
    new: 'Configure group cutoffs',
  },
  'export_rti_progress_report_as_csv': {
    old: ['Export RTI Progress Report as CSV', 'Export RTI progress report as CSV'],
    new: 'Export practice grouping (CSV)',
  },
  'benchmark_vs': {
    old: ['vs. Benchmark', 'vs Benchmark'],
    new: 'vs. Target',
  },
};

const langDir = path.join(PROJECT_ROOT, 'lang');
const langFiles = fs.readdirSync(langDir).filter(f => f.endsWith('.js'));

const summary = { updated: {}, kept: {}, missing: {} };
for (const k of Object.keys(RELABELS)) {
  summary.updated[k] = [];
  summary.kept[k] = [];
  summary.missing[k] = [];
}

for (const file of langFiles) {
  const filePath = path.join(langDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const [key, { old, new: newVal }] of Object.entries(RELABELS)) {
    // Match: "key": "..." with capture on the value (allowing escaped quotes inside)
    const re = new RegExp(`("${key}"\\s*:\\s*)"((?:[^"\\\\]|\\\\.)*)"`, 'g');
    const matches = [...content.matchAll(re)];
    if (matches.length === 0) {
      summary.missing[key].push(file);
      continue;
    }
    for (const m of matches) {
      const currentValue = m[2];
      // Unescape for comparison
      const unescaped = currentValue.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      const isOldEnglish = old.some(o => unescaped.trim().toLowerCase() === o.toLowerCase());
      if (isOldEnglish) {
        // Update: replace just this match
        const escapedNew = newVal.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const replacement = `${m[1]}"${escapedNew}"`;
        content = content.replace(m[0], replacement);
        modified = true;
        summary.updated[key].push(file);
      } else {
        summary.kept[key].push({ file, value: unescaped.slice(0, 60) });
      }
    }
  }

  if (modified && APPLY) {
    fs.writeFileSync(filePath, content);
  }
}

console.log('═══════════════════════════════════════════════════════════════════');
console.log(` Lang-pack passthrough updater — ${APPLY ? 'APPLIED' : 'DRY RUN'}`);
console.log('═══════════════════════════════════════════════════════════════════');
console.log(` Scanned: ${langFiles.length} lang packs`);
console.log('');
for (const [key, { new: newVal }] of Object.entries(RELABELS)) {
  console.log(`🔑 ${key}  →  "${newVal}"`);
  console.log(`   updated: ${summary.updated[key].length}, kept (translated): ${summary.kept[key].length}, missing key: ${summary.missing[key].length}`);
  if (summary.updated[key].length) {
    console.log(`   ✓ updated in: ${summary.updated[key].slice(0, 12).join(', ')}${summary.updated[key].length > 12 ? ` +${summary.updated[key].length - 12} more` : ''}`);
  }
  if (summary.kept[key].length) {
    console.log(`   · kept (looks translated):`);
    for (const k of summary.kept[key].slice(0, 6)) {
      console.log(`     ${k.file}: "${k.value}"`);
    }
    if (summary.kept[key].length > 6) console.log(`     +${summary.kept[key].length - 6} more`);
  }
  if (summary.missing[key].length) {
    console.log(`   ✗ key absent from ${summary.missing[key].length} packs`);
  }
  console.log('');
}
if (!APPLY) console.log(' (dry run — pass --apply to write files)');
