#!/usr/bin/env node
// Apply reverts for df347335 contrast regressions identified by
// _audit_df347335_regression_v2.cjs --json --canonical-only.
//
// Strategy: for each (file, lineNumber, beforeColor, afterColor) triple,
// open the file, swap `after → before` on that exact line. Skip if the
// line content no longer matches the expected pattern (defensive — keeps
// us from corrupting unrelated edits).
//
// Usage:
//   node _fix_df347335_regressions.cjs              # dry-run
//   node _fix_df347335_regressions.cjs --apply      # actually write

const fs = require('fs');
const { execSync } = require('child_process');

const APPLY = process.argv.includes('--apply');
const USE_V3 = process.argv.includes('--v3');
const HIGH_ONLY = process.argv.includes('--high-only'); // only confidence === 3 (★)

// Get triage from detector (v2 or v3)
const detectorScript = USE_V3 ? '_audit_df347335_regression_v3.cjs' : '_audit_df347335_regression_v2.cjs';
const raw = execSync(`node ${detectorScript} --canonical-only --json`, { encoding: 'utf8', maxBuffer: 64*1024*1024 });
let triage = JSON.parse(raw);

if (HIGH_ONLY) {
  const filtered = {};
  for (const [file, hits] of Object.entries(triage)) {
    const high = hits.filter(h => h.confidence === 3);
    if (high.length) filtered[file] = high;
  }
  triage = filtered;
}

const files = Object.keys(triage);
let totalProposed = 0;
let totalApplied = 0;
let totalSkipped = 0;
const skips = [];

for (const file of files) {
  const hits = triage[file];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let modified = false;

  // Group hits by line number, then apply oldest-first (each line might have 1+ swap).
  // Sort descending by line so we don't shift later edits (we're not adding/removing lines,
  // but safer regardless).
  hits.sort((a, b) => b.currentLine - a.currentLine);

  // De-dupe identical (line, after, before) tuples — the detector emits 1 per diff hit,
  // and a line that had two colors swapped may produce two hits; we want both applied,
  // but the same (after,before) pair twice doesn't make sense unless the color appears 2x.
  // Treat each hit independently but only apply if after-color still present.

  for (const h of hits) {
    totalProposed++;
    const idx = h.currentLine - 1;
    if (idx < 0 || idx >= lines.length) {
      totalSkipped++; skips.push(`${file}:${h.currentLine} → out of range`); continue;
    }
    let line = lines[idx];

    if (h.kind === 'hex') {
      // The after is a hex like '#475569' used inside color: '...' context
      // Be precise: only swap inside color:'...' or color:"..." or color:`...`
      // to avoid touching borderColor/backgroundColor on same line.
      const safeAfter = h.after.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
      const re = new RegExp("(color\\s*:\\s*['\"`])" + safeAfter + "(['\"`])", 'gi');
      if (!re.test(line)) {
        totalSkipped++; skips.push(`${file}:${h.currentLine} → after ${h.after} not found in 'color:' context`); continue;
      }
      // Reset lastIndex after test
      re.lastIndex = 0;
      const newLine = line.replace(re, "$1" + h.before + "$2");
      if (newLine === line) {
        totalSkipped++; skips.push(`${file}:${h.currentLine} → replacement no-op`); continue;
      }
      lines[idx] = newLine;
      modified = true;
      totalApplied++;
    } else if (h.kind === 'tw') {
      // Tailwind class swap. Token-boundary match.
      const safeAfter = h.after.replace(/-/g, '\\-');
      const re = new RegExp('(^|[\\s"\'`{])' + safeAfter + '($|[\\s"\'`}:])');
      if (!re.test(line)) {
        totalSkipped++; skips.push(`${file}:${h.currentLine} → after ${h.after} not found at word boundary`); continue;
      }
      // Replace ONE occurrence at the boundary
      const newLine = line.replace(re, (_m, pre, post) => pre + h.before + post);
      if (newLine === line) {
        totalSkipped++; skips.push(`${file}:${h.currentLine} → replacement no-op`); continue;
      }
      lines[idx] = newLine;
      modified = true;
      totalApplied++;
    }
  }

  if (modified && APPLY) {
    fs.writeFileSync(file, lines.join('\n'));
  }
}

console.log('═══════════════════════════════════════════════════════════════════');
console.log(` df347335 REVERT — ${APPLY ? 'APPLIED' : 'DRY RUN'}`);
console.log('═══════════════════════════════════════════════════════════════════');
console.log(` Files: ${files.length}`);
console.log(` Proposed reverts: ${totalProposed}`);
console.log(` Applied: ${totalApplied}`);
console.log(` Skipped: ${totalSkipped}`);
if (skips.length) {
  console.log(' ─── Skips ───');
  for (const s of skips) console.log('   • ' + s);
}
if (!APPLY) {
  console.log('\n (dry run — pass --apply to actually write files)');
}
