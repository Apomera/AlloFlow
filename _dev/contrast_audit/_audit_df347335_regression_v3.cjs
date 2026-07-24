#!/usr/bin/env node
// v3: hybrid contrast-regression detector.
//
// v2 was too strict (required exact diff +line match, missed lines re-edited
// after df347335). v1 was too permissive (30-line window, no container hint,
// flagged white cards inside dark pages).
//
// v3 strategy:
//   1. Enumerate all current lines with a "darkened text color" pattern
//      (text colors the commit's mapping targets — text-{c}-600/700 or
//      specific hex like #475569).
//   2. Find the nearest PARENT dark-bg marker by walking BACKWARDS from
//      the line, with a container-hint confidence boost.
//   3. Require confidence >= 2 to emit (so a bg-slate-800 on a leaf-ish
//      button doesn't propagate to siblings).
//   4. Tag whether the line is also present in df347335's +lines (badge,
//      not a filter) — high-trust where it overlaps with diff.
//
// Use this when post-commit edits have shifted line content and v2 misses.

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Auto-chdir to project root (this file lives in _dev/contrast_audit/)
process.chdir(path.resolve(__dirname, '..', '..'));

const JSON_OUTPUT = process.argv.includes('--json');
const CANONICAL_ONLY = process.argv.includes('--canonical-only');

const COMMIT = 'df347335';

// "Before" candidates per "after" — used both for reverts and detection
const HEX_MAP = {
  '#475569': ['#94a3b8', '#cbd5e1', '#e2e8f0'],
  '#15803d': ['#86efac'],
  '#b45309': ['#fbbf24'],
  '#7e22ce': ['#a855f7'],
};
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
const CONTAINER_HINTS = [
  'fixed','inset-0','h-screen','min-h-screen','absolute',
  'modal','dialog','overlay','backdrop','recital','presentation','fullscreen',
  'z-[','z-50','z-40','z-30','z-[400]','z-[100]','z-[200]',
];

const files = execSync(`git show --name-only ${COMMIT}`, { encoding: 'utf8' })
  .split('\n')
  .filter(l => /\.(js|jsx)$/.test(l))
  .filter(l => fs.existsSync(l));

// Build set of df347335 +lines (trimmed) per file for diff-overlap tagging.
const diffPlusByFile = {};
for (const file of files) {
  let diff;
  try { diff = execSync(`git show ${COMMIT} -- "${file}"`, { encoding: 'utf8', maxBuffer: 16*1024*1024 }); }
  catch { continue; }
  const set = new Set();
  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) set.add(line.slice(1).trim());
  }
  diffPlusByFile[file] = set;
}

const triage = {}; // file -> [{currentLine, after, beforeCandidate, bg, confidence, inDiff, snippet}]

for (const file of files) {
  if (CANONICAL_ONLY && file.startsWith('desktop/web-app/')) continue;
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
  const lines = content.split('\n');
  const diffSet = diffPlusByFile[file] || new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Hits per line: (kind, after, beforeCandidate)
    const hits = [];

    // Hex: only in color: '...' context
    for (const [after, befores] of Object.entries(HEX_MAP)) {
      const safe = after.replace(/[\\^$.*+?()[\]{}|]/g,'\\$&');
      const re = new RegExp("color\\s*:\\s*['\"`]" + safe + "['\"`]", 'gi');
      const matches = [...line.matchAll(re)];
      for (const _ of matches) {
        // Pick the most-common "before" — middle of the list (slate-300 / cbd5e1)
        const before = befores[Math.min(1, befores.length-1)];
        hits.push({ kind:'hex', after, before });
      }
    }
    // Tailwind classes: token-boundary
    for (const [after, befores] of Object.entries(TW_MAP)) {
      const safe = after.replace(/-/g,'\\-');
      const re = new RegExp('(^|[\\s"\'`{])' + safe + '($|[\\s"\'`}:])', 'g');
      const matches = [...line.matchAll(re)];
      for (const _ of matches) {
        const before = befores[1] || befores[0]; // prefer -300
        hits.push({ kind:'tw', after, before });
      }
    }

    if (hits.length === 0) continue;

    // Walk backwards to find parent dark-bg marker, with confidence.
    const CTX = 80;
    const start = Math.max(0, i - CTX);
    let bgFound = -1, bgDetail = '', bgConf = 0;
    for (let j = i-1; j >= start; j--) {
      const ctx = lines[j];
      // skip closing-tag-only lines
      if (/^\s*\)?,?\s*\)?\s*,?\s*$/.test(ctx)) continue;

      const bgHexMatch = ctx.match(/background(?:Color)?\s*:\s*['"`](#[0-9a-fA-F]{3,8})['"`]/);
      if (bgHexMatch && DARK_BG_HEX.some(h => h.toLowerCase() === bgHexMatch[1].toLowerCase())) {
        bgFound = j;
        bgDetail = `bg ${bgHexMatch[1]} @L${j+1}`;
        bgConf = CONTAINER_HINTS.some(h => ctx.includes(h)) ? 3 : 2;
        break;
      }
      const twHit = DARK_BG_TW.find(c => new RegExp('(^|[\\s"\'`{])' + c.replace(/-/g,'\\-') + '($|[\\s"\'`}:])').test(ctx));
      if (twHit) {
        bgFound = j;
        bgDetail = `${twHit} @L${j+1}`;
        // Container-hint match = 3; clear single-bg class = 2; multi-bg ambiguous = 1
        const bgClassCount = (ctx.match(/\bbg-/g) || []).length;
        if (CONTAINER_HINTS.some(h => ctx.includes(h))) bgConf = 3;
        else if (bgClassCount === 1) bgConf = 2;
        else bgConf = 1;
        break;
      }
    }

    if (bgFound === -1) continue;
    if (bgConf < 2) continue;

    if (!triage[file]) triage[file] = [];
    const inDiff = diffSet.has(line.trim());
    for (const h of hits) {
      triage[file].push({
        currentLine: i+1,
        kind: h.kind,
        after: h.after,
        before: h.before,
        bg: bgDetail,
        confidence: bgConf,
        inDiff,
        snippet: line.trim().slice(0, 160),
      });
    }
  }
}

if (JSON_OUTPUT) {
  console.log(JSON.stringify(triage, null, 2));
  process.exit(0);
}

const sortedFiles = Object.keys(triage).sort((a,b) => triage[b].length - triage[a].length);
const total = Object.values(triage).reduce((s, arr) => s + arr.length, 0);

console.log('═══════════════════════════════════════════════════════════════════');
console.log(' df347335 CONTRAST REGRESSION SWEEP — v3 (hybrid)');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(` Mode: ${CANONICAL_ONLY ? 'canonical-only' : 'all files'}`);
console.log(` Files with regressions: ${sortedFiles.length}`);
console.log(` Total regressions: ${total}`);
console.log('───────────────────────────────────────────────────────────────────');

for (const file of sortedFiles) {
  const hits = triage[file];
  console.log(`\n📄 ${file}  (${hits.length})`);
  for (const h of hits) {
    const marker = h.confidence === 3 ? '★' : '·';
    const diffTag = h.inDiff ? '◯' : ' ';
    console.log(`   ${marker}${diffTag} L${String(h.currentLine).padStart(5)}  ${h.kind === 'hex' ? h.after.padEnd(10) : h.after.padEnd(20)} → ${h.before.padEnd(20)} (parent: ${h.bg})`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log(` ★ = container-hint match  · = clear single-bg context`);
console.log(` ◯ = line exact-matches a df347335 +line  (blank = line edited since)`);
console.log('═══════════════════════════════════════════════════════════════════');
