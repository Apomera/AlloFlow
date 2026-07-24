#!/usr/bin/env node
// v2: diff-aware df347335 contrast-regression detector.
//
// For each file in df347335:
//   1. Parse the unified diff to get (oldLine, newLine) pairs.
//   2. For each '+' line that inserted a darkened color (text-only context),
//      pair it with its '-' counterpart and confirm the original color
//      was a light shade.
//   3. Locate the changed line in CURRENT file (by content match).
//   4. Check the surrounding parent context for a dark-bg marker —
//      only look BEFORE the line (JSX parent comes first), and only
//      consider bg-* markers on plausible container elements (full-screen
//      modals, fixed/inset-0 containers, dialog/modal/overlay classes,
//      or top-level wrappers with inline background:'#0f172a'-class hex).
//
// Output: per-file JSON triage with before/after color + line number.
// Usage: node _audit_df347335_regression_v2.cjs [--json] [--canonical-only]

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Auto-chdir to project root (this file lives in _dev/contrast_audit/)
process.chdir(path.resolve(__dirname, '..', '..'));

const JSON_OUTPUT = process.argv.includes('--json');
const CANONICAL_ONLY = process.argv.includes('--canonical-only');

const COMMIT = 'df347335';

// Color mappings the commit applied (from commit message).
// "after" colors are the darkened ones we look for.
const HEX_MAP = {
  '#475569': ['#94a3b8', '#cbd5e1', '#e2e8f0'],
  '#15803d': ['#86efac'],
  '#b45309': ['#fbbf24'],
  '#7e22ce': ['#a855f7'],
};
const ALL_DARK_HEX = Object.keys(HEX_MAP).map(s => s.toLowerCase());

// Tailwind class mappings (after → possible befores)
const TW_MAP = {
  'text-slate-600':  ['text-slate-400','text-slate-300','text-slate-200'],
  'text-slate-700':  ['text-slate-400','text-slate-300','text-slate-200'],
  'text-gray-600':   ['text-gray-400','text-gray-300','text-gray-200'],
  'text-gray-700':   ['text-gray-400','text-gray-300','text-gray-200'],
  'text-amber-700':  ['text-amber-400','text-amber-300','text-amber-200'],
  'text-yellow-700': ['text-yellow-400','text-yellow-300','text-yellow-200'],
  'text-green-700':  ['text-green-400','text-green-300','text-green-200'],
  'text-emerald-700':['text-emerald-400','text-emerald-300','text-emerald-200'],
  'text-teal-700':   ['text-teal-400','text-teal-300','text-teal-200'],
  'text-red-600':    ['text-red-400','text-red-300','text-red-200'],
  'text-red-700':    ['text-red-400','text-red-300','text-red-200'],
  'text-blue-700':   ['text-blue-400','text-blue-300','text-blue-200'],
  'text-sky-700':    ['text-sky-400','text-sky-300','text-sky-200'],
  'text-cyan-700':   ['text-cyan-400','text-cyan-300','text-cyan-200'],
  'text-purple-700': ['text-purple-400','text-purple-300','text-purple-200'],
  'text-violet-700': ['text-violet-400','text-violet-300','text-violet-200'],
  'text-fuchsia-700':['text-fuchsia-400','text-fuchsia-300','text-fuchsia-200'],
  'text-pink-700':   ['text-pink-400','text-pink-300','text-pink-200'],
  'text-rose-700':   ['text-rose-400','text-rose-300','text-rose-200'],
  'text-orange-700': ['text-orange-400','text-orange-300','text-orange-200'],
};
const ALL_DARK_TW = Object.keys(TW_MAP);

const DARK_BG_HEX = [
  '#020617','#0c0a09','#0f172a','#111827','#171717','#18181b','#1c1917','#1e293b','#1f2937',
  '#262626','#27272a','#292524','#3f3f46','#404040','#44403c','#0a0a0a','#000000','#000',
];
const DARK_BG_TW = [
  'bg-slate-900','bg-slate-800','bg-slate-950',
  'bg-gray-900','bg-gray-800','bg-gray-950',
  'bg-zinc-900','bg-zinc-800','bg-zinc-950',
  'bg-neutral-900','bg-neutral-800','bg-neutral-950',
  'bg-stone-900','bg-stone-800','bg-stone-950',
  'bg-black',
];
// "Container-shaped" class fragments — increase confidence that the bg-* is a parent wrapper.
const CONTAINER_HINTS = [
  'fixed','inset-0','h-screen','min-h-screen','absolute',
  'modal','dialog','overlay','backdrop','recital','presentation','fullscreen',
  'z-[','z-50','z-40','z-30',
];

function isLightTextColor(str) {
  const lower = str.toLowerCase();
  if (Object.values(HEX_MAP).flat().some(h => lower.includes(h.toLowerCase()))) return true;
  if (Object.values(TW_MAP).flat().some(c => new RegExp('(^|[\\s"\'`{])' + c.replace(/-/g,'\\-') + '($|[\\s"\'`}:])').test(str))) return true;
  return false;
}

// Get list of files in commit
const files = execSync(`git show --name-only ${COMMIT}`, { encoding: 'utf8' })
  .split('\n')
  .filter(l => /\.(js|jsx)$/.test(l))
  .filter(l => fs.existsSync(l));

const triage = {}; // file -> [{currentLine, before, after, snippet, bgContext}]

for (const file of files) {
  if (CANONICAL_ONLY && file.startsWith('desktop/web-app/')) continue;

  // Get unified diff for this file from the commit, with no context (we walk hunks ourselves)
  let diff;
  try {
    diff = execSync(`git show ${COMMIT} -- "${file}"`, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  } catch (e) { continue; }

  // Collect (oldLine, newLine) pairs from diff hunks.
  // For our purposes, we only care about CHANGE pairs: a '-' immediately followed by a '+' (1:1 within hunk).
  // Tailwind/hex changes are typically same-shape; word_sounds had 1:1 line swaps.
  const lines = diff.split('\n');
  let i = 0;
  const pairs = []; // {oldText, newText}
  while (i < lines.length) {
    if (lines[i].startsWith('@@')) { i++; continue; }
    if (lines[i].startsWith('---') || lines[i].startsWith('+++') || lines[i].startsWith('diff') || lines[i].startsWith('index')) {
      i++; continue;
    }
    if (lines[i].startsWith('-') && i+1 < lines.length && lines[i+1].startsWith('+')) {
      const oldText = lines[i].slice(1);
      const newText = lines[i+1].slice(1);
      pairs.push({ oldText, newText });
      i += 2;
      continue;
    }
    i++;
  }

  if (pairs.length === 0) continue;

  // Read current file lines.
  let currentLines;
  try { currentLines = fs.readFileSync(file, 'utf8').split('\n'); }
  catch { continue; }

  // For each pair where the change darkened a text color, locate the +line in current file by content match.
  for (const { oldText, newText } of pairs) {
    // Confirm this pair represents a text-color darkening.
    // Find which darkened color appears in newText but not oldText.
    let darkened = null;
    // Hex
    for (const after of Object.keys(HEX_MAP)) {
      const afterColorRe = new RegExp("color\\s*:\\s*['\"`]" + after + "['\"`]", 'i');
      if (afterColorRe.test(newText) && !afterColorRe.test(oldText)) {
        // Confirm oldText had one of the "before" candidates in same color: context.
        for (const before of HEX_MAP[after]) {
          const beforeColorRe = new RegExp("color\\s*:\\s*['\"`]" + before + "['\"`]", 'i');
          if (beforeColorRe.test(oldText)) {
            darkened = { kind: 'hex', after, before };
            break;
          }
        }
        if (darkened) break;
      }
    }
    if (!darkened) {
      // Tailwind class
      for (const after of Object.keys(TW_MAP)) {
        const afterRe = new RegExp('(^|[\\s"\'`{])' + after.replace(/-/g,'\\-') + '($|[\\s"\'`}:])');
        if (afterRe.test(newText) && !afterRe.test(oldText)) {
          for (const before of TW_MAP[after]) {
            const beforeRe = new RegExp('(^|[\\s"\'`{])' + before.replace(/-/g,'\\-') + '($|[\\s"\'`}:])');
            if (beforeRe.test(oldText)) {
              darkened = { kind: 'tw', after, before };
              break;
            }
          }
          if (darkened) break;
        }
      }
    }
    if (!darkened) continue;

    // Locate current file line that matches newText.
    // Use exact whole-line match first; fallback to contains-newText if exact fails.
    let foundLineIdx = -1;
    for (let j = 0; j < currentLines.length; j++) {
      if (currentLines[j] === newText) {
        foundLineIdx = j;
        break;
      }
    }
    if (foundLineIdx === -1) {
      // Loose match — line still contains the darkened token (file may have shifted due to other edits)
      const trimmedNew = newText.trim();
      for (let j = 0; j < currentLines.length; j++) {
        if (currentLines[j].trim() === trimmedNew) { foundLineIdx = j; break; }
      }
    }
    if (foundLineIdx === -1) continue; // line no longer present (subsequent edit removed it)

    // Parent context check: look at lines 0..foundLineIdx-1 within a 80-line window for a dark-bg marker.
    // Higher confidence if the marker is on a container-hinted element.
    const CTX_WINDOW = 80;
    const start = Math.max(0, foundLineIdx - CTX_WINDOW);
    let bgFoundAt = -1;
    let bgConfidence = 0; // 0..3
    let bgDetail = '';
    for (let j = foundLineIdx - 1; j >= start; j--) {
      const ctx = currentLines[j];
      // bg via inline style
      const bgHexMatch = ctx.match(/background(?:Color)?\s*:\s*['"`](#[0-9a-fA-F]{3,8})['"`]/);
      if (bgHexMatch && DARK_BG_HEX.some(h => h.toLowerCase() === bgHexMatch[1].toLowerCase())) {
        bgFoundAt = j; bgDetail = `bg ${bgHexMatch[1]} @L${j+1}`;
        bgConfidence = CONTAINER_HINTS.some(h => ctx.includes(h)) ? 3 : 2;
        break;
      }
      // bg via Tailwind class
      const twHit = DARK_BG_TW.find(c => new RegExp('(^|[\\s"\'`{])' + c.replace(/-/g,'\\-') + '($|[\\s"\'`}:])').test(ctx));
      if (twHit) {
        bgFoundAt = j; bgDetail = `${twHit} @L${j+1}`;
        bgConfidence = CONTAINER_HINTS.some(h => ctx.includes(h)) ? 3 : (ctx.match(/bg-/g)?.length === 1 ? 2 : 1);
        break;
      }
    }
    if (bgFoundAt === -1) continue;

    // Skip very-low confidence hits to control FP.
    if (bgConfidence < 2) continue;

    if (!triage[file]) triage[file] = [];
    triage[file].push({
      currentLine: foundLineIdx + 1,
      kind: darkened.kind,
      before: darkened.before,
      after: darkened.after,
      bg: bgDetail,
      confidence: bgConfidence,
      snippet: newText.trim().slice(0, 160),
    });
  }
}

if (JSON_OUTPUT) {
  console.log(JSON.stringify(triage, null, 2));
  process.exit(0);
}

const sortedFiles = Object.keys(triage).sort((a,b) => triage[b].length - triage[a].length);
const totalHits = Object.values(triage).reduce((s, arr) => s + arr.length, 0);

console.log('═══════════════════════════════════════════════════════════════════');
console.log(' df347335 CONTRAST REGRESSION SWEEP — v2 (diff-aware)');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(` Mode: ${CANONICAL_ONLY ? 'canonical-only (desktop/web-app/ excluded)' : 'all files'}`);
console.log(` Files with confirmed regressions: ${sortedFiles.length}`);
console.log(` Total confirmed regressions: ${totalHits}`);
console.log('───────────────────────────────────────────────────────────────────');

for (const file of sortedFiles) {
  const hits = triage[file];
  console.log(`\n📄 ${file}  (${hits.length})`);
  for (const h of hits) {
    const marker = h.confidence === 3 ? '★' : '·';
    console.log(`   ${marker} L${String(h.currentLine).padStart(5)}  ${h.kind === 'hex' ? h.after.padEnd(10) : h.after.padEnd(20)} ← ${h.before.padEnd(20)} (parent: ${h.bg})`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log(` ★ = high-confidence (container-hint match)  · = medium-confidence`);
console.log('═══════════════════════════════════════════════════════════════════');
