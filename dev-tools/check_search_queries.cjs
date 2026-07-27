#!/usr/bin/env node
/*
 * check_search_queries.cjs (2026-07-27) — every search-grounded callGemini call
 * site must supply its own web query.
 *
 * WHY THIS GATE EXISTS
 * Under Google's `google_search` grounding, Gemini formulated the search query
 * itself from the whole prompt. Gemini Canvas cannot use that tool, so the app
 * fetches results client-side (WebSearchProvider) and injects them. That
 * silently moved responsibility for the query from the model to the caller —
 * and no call site was updated.
 *
 * WebSearchProvider._extractSearchQuery then regex-scrapes the prompt as a
 * fallback, which produced real, shipped bugs:
 *
 *   Find standards   searched "main ideas"          (lost grade + framework)
 *                    -> dictionary.com, a speech blog; zero standard codes,
 *                       so the button returned an empty list.
 *   Timeline verify  searched "chronological order" (lost the events)
 *                    -> worse than useless: it still attached sources, so the
 *                       UI implied the dates had been checked.
 *   Cinematic scene  searched "comparison"          (the scene TYPE)
 *
 * The failures are invisible: search "succeeds", returns irrelevant results,
 * and the model quietly produces nothing useful — or worse, something that
 * looks sourced.
 *
 * THE RULE
 * A call of the form callGemini(prompt, jsonMode, true, ...) must pass a 5th
 * argument (searchQuery). Sites that deliberately rely on the extractor must be
 * listed in ALLOWED_EXTRACTION below with a reason — which forces the decision
 * to be explicit and reviewable rather than accidental.
 *
 * Usage: node dev-tools/check_search_queries.cjs [--verbose]
 * Exits 1 if any grounded call site omits the query without justification.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

// Files to scan: first-party sources + built modules at the repo root, plus the
// Canvas host. Deliberately skips desktop/ mirrors (byte copies) and vendor.
const SCAN_GLOBS = [
  (f) => /_source\.jsx$/.test(f),
  (f) => /_module\.js$/.test(f),
  (f) => f === 'AlloFlowANTI.txt',
];

// Call sites that intentionally let WebSearchProvider extract the query.
// Each entry must say WHY it is safe — i.e. which prompt pattern the extractor
// matches and why that yields the subject.
const ALLOWED_EXTRACTION = {
  'content_engine_source.jsx': 'researchPrompt leads with `Topic: "<subject>"`, which the extractor matches exactly.',
  'content_engine_module.js': 'Built from content_engine_source.jsx — same prompt.',
  'AlloFlowANTI.txt': 'handleAiUrlSearch prompt is `…resources about: <query>.` — the extractor matches "resources about" and the prompt is otherwise only the query.',
  'quickstart_source.jsx': 'Wizard resource search uses the same `resources about:` shape.',
  'quickstart_module.js': 'Built from quickstart_source.jsx — same prompt.',
  'audit_remediator_module.js': 'verifyClaimsBatch prompt is a numbered list of the claims themselves; the extracted claim IS the thing to verify.',
};

// callGemini( arg1 , arg2 , arg3 [, arg4 [, arg5 …]])
// We only need to know whether a 5th argument exists when arg3 is `true`.
const CALL_RE = /callGemini\s*\(/g;

function splitTopLevelArgs(src, openIdx) {
  // openIdx points at '('. Walk to the matching ')' tracking depth + strings.
  let depth = 0;
  let i = openIdx;
  let args = [];
  let cur = '';
  let str = null;
  let esc = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (str) {
      cur += ch;
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === str) str = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { str = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') { depth++; if (depth > 1) cur += ch; continue; }
    if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) { args.push(cur); return { args, end: i }; }
      cur += ch;
      continue;
    }
    if (ch === ',' && depth === 1) { args.push(cur); cur = ''; continue; }
    cur += ch;
  }
  return null; // unbalanced (e.g. truncated file)
}

const offenders = [];
const okSites = [];

function scanFile(rel) {
  const abs = path.join(REPO, rel);
  let src;
  try { src = fs.readFileSync(abs, 'utf8'); } catch (_) { return; }
  if (!src.includes('callGemini')) return;

  CALL_RE.lastIndex = 0;
  let m;
  while ((m = CALL_RE.exec(src))) {
    const openIdx = m.index + m[0].length - 1;
    const parsed = splitTopLevelArgs(src, openIdx);
    if (!parsed) continue;
    const args = parsed.args.map((a) => a.trim());
    if (args.length < 3) continue;

    // arg3 === useSearch. Only literal `true` counts as definitely grounded.
    if (args[2] !== 'true') continue;

    const line = src.slice(0, m.index).split('\n').length;
    const hasQuery = args.length >= 5 && args[4] !== '' && args[4] !== 'null' && args[4] !== 'undefined';

    if (hasQuery) {
      okSites.push({ rel, line, query: args[4] });
    } else if (ALLOWED_EXTRACTION[rel]) {
      okSites.push({ rel, line, query: '(extractor — allowlisted)' });
    } else {
      offenders.push({ rel, line, call: `callGemini(${args.slice(0, 4).join(', ')}${args.length > 4 ? ', …' : ''})` });
    }
  }
}

const entries = fs.readdirSync(REPO, { withFileTypes: true })
  .filter((d) => d.isFile())
  .map((d) => d.name)
  .filter((f) => SCAN_GLOBS.some((g) => g(f)));

entries.forEach(scanFile);

if (VERBOSE) {
  console.log('Grounded call sites that DO supply a query:');
  okSites.forEach((s) => console.log(`  ${s.rel}:${s.line}  ${s.query}`));
  console.log('');
}

if (offenders.length) {
  console.error(`\n✗ check_search_queries: ${offenders.length} search-grounded call site(s) do not supply a web query:\n`);
  offenders.forEach((o) => {
    console.error(`  ${o.rel}:${o.line}`);
    console.error(`      ${o.call}`);
  });
  console.error('\n  Pass an explicit 5th argument (searchQuery) built from the SUBJECT —');
  console.error('  the grade, framework, topic, or entities the search should actually find.');
  console.error('  Without it WebSearchProvider regex-scrapes the prompt and can search for');
  console.error('  an instruction ("chronological order") instead of the content.');
  console.error('  If extraction is genuinely correct here, add the file to ALLOWED_EXTRACTION');
  console.error('  in dev-tools/check_search_queries.cjs with the reason.\n');
  process.exit(1);
}

console.log(`✓ check_search_queries: ${okSites.length} grounded call site(s) supply a web query (or are allowlisted).`);
