#!/usr/bin/env node
// check_silent_catch_risky.cjs — triage tool for the silent-catch backlog.
//
// `check_silent_catch.cjs` flags every empty `catch(e){}` block (1,200+).
// Most are legitimate cleanup patterns:
//   try { localStorage.setItem(k,v); } catch(e) {}   // private mode is fine
//   try { URL.revokeObjectURL(u); } catch(e) {}      // cleanup, can't matter
//   try { window.speechSynthesis.cancel(); } catch(e) {}   // optional teardown
//
// The dangerous ones are those where the try-body does real work that
// can fail in ways the user cares about — and the silent catch hides it.
// Examples:
//   try { JSON.parse(userInput) } catch(e) {}         // bad input silently dropped
//   try { await fetch(url) } catch(e) {}              // network failure invisible
//   try { await callGemini(prompt) } catch(e) {}      // AI call silently lost
//
// This script flags ONLY the high-risk subset, keyed by what's in the
// try body. The intent is a manageable backlog for review/fix, not a
// blanket flag of every empty catch.
//
// Usage:
//   node dev-tools/check_silent_catch_risky.cjs           # human-readable report
//   node dev-tools/check_silent_catch_risky.cjs --quiet   # silent unless flagged
//   node dev-tools/check_silent_catch_risky.cjs --json    # machine output
//
// Exit codes:
//   0 — always (this is a triage tool, not a gate)

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const JSON_OUT = args.includes('--json');

function log(s) { if (!QUIET) console.log(s); }

// Patterns that mark a try body as "doing real work" — silent failure
// here is usually a bug, not deliberate cleanup.
const RISKY_PATTERNS = [
  { name: 'JSON.parse',         pattern: /\bJSON\.parse\s*\(/ },
  { name: 'await fetch',        pattern: /\bawait\s+fetch\s*\(/ },
  { name: 'await callGemini',   pattern: /\bawait\s+callGemini\b/ },
  { name: 'await callImagen',   pattern: /\bawait\s+callImagen\b/ },
  { name: 'await callTTS',      pattern: /\bawait\s+callTTS\b/ },
  { name: 'await callGeminiVision', pattern: /\bawait\s+callGeminiVision\b/ },
  { name: 'await callGeminiImageEdit', pattern: /\bawait\s+callGeminiImageEdit\b/ },
  { name: 'parseInt without radix', pattern: /\bparseInt\s*\(\s*[^,)]+\s*\)/ },
];

// Patterns that mark a try body as obvious cleanup or graceful-default —
// never risky. JSON.parse(localStorage.getItem(...)) is included here
// because corrupt storage falling back to default is the intended UX,
// not a bug. Same for sessionStorage.
const CLEANUP_PATTERNS = [
  /\blocalStorage\.(setItem|removeItem|clear)/,
  /\bsessionStorage\.(setItem|removeItem|clear)/,
  /\bURL\.revokeObjectURL\b/,
  /\.parentNode\.removeChild\b/,
  /\b\.remove\(\)\s*;?\s*}/,
  /\bspeechSynthesis\.cancel\b/,
  /\bspeechSynthesis\.pause\b/,
  /\bspeechSynthesis\.resume\b/,
  /\b\.stop\(\)\s*;?\s*}/,
  /\b\.pause\(\)\s*;?\s*}/,
  /\b\.cancel\(\)\s*;?\s*}/,
  /\b\.disconnect\(\)\s*;?\s*}/,
  /\bclearTimeout\b/,
  /\bclearInterval\b/,
  /\bcancelAnimationFrame\b/,
];

// A try-body that JSON.parses a *Storage.getItem result is graceful-
// degradation, not a bug — corrupt persisted state should fall back to
// defaults rather than crash. Recognise this pattern explicitly.
const GRACEFUL_RESTORE_PATTERN = /JSON\.parse\s*\(\s*(?:localStorage|sessionStorage)\.getItem\s*\(|JSON\.parse\s*\(\s*safeGetItem\s*\(|JSON\.parse\s*\(\s*(?:raw|saved|stored)\s*\)/;

// Files we should scan: js/jsx in root + sel_hub + stem_lab + prismflow-deploy/src.
// Skip node_modules, prismflow-deploy/build (it mirrors), prismflow-deploy/public
// (mirror of root), _archive, dev-tools (audit tools themselves).
const SCAN_DIRS = [
  { dir: ROOT, recursive: false },
  { dir: path.join(ROOT, 'sel_hub'), recursive: false },
  { dir: path.join(ROOT, 'stem_lab'), recursive: false },
  { dir: path.join(ROOT, 'prismflow-deploy', 'src'), recursive: false },
];
function listFiles() {
  const all = [];
  for (const { dir, recursive } of SCAN_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && /\.(js|jsx|txt)$/.test(e.name)) {
        all.push(path.join(dir, e.name));
      }
    }
  }
  return all;
}

// Scan a single file. For each `try { ... } catch(...) {}` block where the
// catch body is empty (only whitespace), capture the try body and classify.
function scanFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const findings = [];
  // Regex: try block opening to corresponding catch with empty body.
  // We use a slightly loose pattern then check the catch body literally.
  // Catch the try body via brace-counting (simpler than recursive regex).
  let i = 0;
  while (i < src.length) {
    const tryIdx = src.indexOf('try', i);
    if (tryIdx === -1) break;
    // Validate this is a `try` keyword (preceded by non-word) and followed by `{`
    const before = tryIdx === 0 ? ' ' : src[tryIdx - 1];
    if (/\w/.test(before)) { i = tryIdx + 3; continue; }
    let j = tryIdx + 3;
    while (j < src.length && /\s/.test(src[j])) j++;
    if (src[j] !== '{') { i = tryIdx + 3; continue; }
    // Brace-match the try body
    const tryBodyStart = j;
    let depth = 0, inStr = null, k = j;
    while (k < src.length) {
      const c = src[k];
      if (inStr) {
        if (c === '\\') { k += 2; continue; }
        if (c === inStr) inStr = null;
        k++; continue;
      }
      if (c === "'" || c === '"' || c === '`') { inStr = c; k++; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) break; }
      k++;
    }
    if (k >= src.length) { i = tryIdx + 3; continue; }
    const tryBodyEnd = k + 1;
    // After the try block, expect `catch (e) {` or `catch (e){` or `catch{`
    let m = tryBodyEnd;
    while (m < src.length && /\s/.test(src[m])) m++;
    if (src.slice(m, m + 5) !== 'catch') { i = tryIdx + 3; continue; }
    m += 5;
    while (m < src.length && /[\s(]/.test(src[m])) m++;
    // Skip the catch parameter list to find the `{`
    let parenDepth = 0;
    if (src[m - 1] === '(') {
      parenDepth = 1;
      while (m < src.length && parenDepth > 0) {
        if (src[m] === '(') parenDepth++;
        else if (src[m] === ')') parenDepth--;
        m++;
      }
    }
    while (m < src.length && /\s/.test(src[m])) m++;
    if (src[m] !== '{') { i = tryIdx + 3; continue; }
    const catchBodyStart = m;
    depth = 0;
    while (m < src.length) {
      const c = src[m];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) break; }
      m++;
    }
    const catchBodyEnd = m + 1;
    const catchBody = src.slice(catchBodyStart + 1, m).trim();
    if (catchBody !== '' && catchBody !== '/* swallow */' && catchBody !== '// swallow') {
      i = tryBodyEnd;
      continue;  // not silent
    }
    // Silent catch — classify the try body
    const tryBody = src.slice(tryBodyStart + 1, tryBodyEnd - 1);
    const matchedRisky = RISKY_PATTERNS.filter(p => p.pattern.test(tryBody));
    const matchedCleanup = CLEANUP_PATTERNS.some(p => p.test(tryBody));
    const isGracefulRestore = GRACEFUL_RESTORE_PATTERN.test(tryBody);
    // Skip graceful-restore patterns even when JSON.parse is present —
    // these are intentional defaults, not silent bugs.
    if (isGracefulRestore && matchedRisky.length === 1 && matchedRisky[0].name === 'JSON.parse') {
      i = catchBodyEnd;
      continue;
    }
    if (matchedRisky.length > 0) {
      // Line number for reporting
      const line = src.slice(0, tryIdx).split('\n').length;
      findings.push({
        file: path.relative(ROOT, filePath).replace(/\\/g, '/'),
        line: line,
        riskyPatterns: matchedRisky.map(p => p.name),
        looksLikeCleanup: matchedCleanup,
        snippet: tryBody.length > 120 ? tryBody.slice(0, 117).replace(/\s+/g, ' ') + '...' : tryBody.replace(/\s+/g, ' ').trim(),
      });
    }
    i = catchBodyEnd;
  }
  return findings;
}

const files = listFiles();
const allFindings = [];
for (const f of files) {
  try {
    const fs2 = scanFile(f);
    allFindings.push(...fs2);
  } catch (e) {
    // Skip files that can't be parsed (e.g., binary or non-JS .txt)
  }
}
allFindings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

if (JSON_OUT) {
  console.log(JSON.stringify({ count: allFindings.length, findings: allFindings }, null, 2));
  process.exit(0);
}

log('');
log('Silent catch() — risky subset triage');
log('────────────────────────────────────');
log('  Files scanned:        ' + files.length);
log('  Risky-pattern catches: ' + allFindings.length);
log('');

if (allFindings.length === 0) {
  log('  ✅ No risky silent catches found. All empty catches in the codebase');
  log('     either skip the dangerous patterns (JSON.parse, await fetch,');
  log('     await call*) or are wrapped around obvious cleanup.');
  log('');
  process.exit(0);
}

// Group by file for readability
const byFile = {};
for (const f of allFindings) {
  if (!byFile[f.file]) byFile[f.file] = [];
  byFile[f.file].push(f);
}
const fileList = Object.keys(byFile).sort();

log('  Top patterns:');
const patternCounts = {};
for (const f of allFindings) {
  for (const p of f.riskyPatterns) patternCounts[p] = (patternCounts[p] || 0) + 1;
}
for (const [p, n] of Object.entries(patternCounts).sort((a, b) => b[1] - a[1])) {
  log('    ' + n.toString().padStart(4) + '  ' + p);
}
log('');
log('  Files with most risky catches:');
const fileCounts = fileList.map(f => [f, byFile[f].length]).sort((a, b) => b[1] - a[1]).slice(0, 8);
for (const [f, n] of fileCounts) {
  log('    ' + n.toString().padStart(4) + '  ' + f);
}
log('');
log('  First 20 findings:');
for (let i = 0; i < Math.min(20, allFindings.length); i++) {
  const f = allFindings[i];
  log('    ' + f.file + ':' + f.line + '  [' + f.riskyPatterns.join(', ') + ']' + (f.looksLikeCleanup ? ' (looks like cleanup too)' : ''));
  log('       ' + f.snippet);
}
if (allFindings.length > 20) log('    ... and ' + (allFindings.length - 20) + ' more (run --json to see all)');
log('');
log('  Suggested fix: replace `catch (e) {}` with `catch (e) { warnLog(\'context:\', e); }`');
log('  for each finding. The risky patterns mean silent failure hides real bugs');
log('  (parse error, network failure, AI call lost). At minimum, log so a future');
log('  console look can trace what went wrong.');
log('');
process.exit(0);
