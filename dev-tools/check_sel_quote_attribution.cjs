#!/usr/bin/env node
/*
 * check_sel_quote_attribution.cjs — attribution gate for SEL Hub quotes.
 *
 * WHY: several SEL tools present quotations attributed to named, real, often
 * living people (activists, researchers, authors) with on-record citations
 * beside them. On 2026-09-14 an audit of sel_tool_disabilityvoices.js found
 * THREE of its eight advocate quotes were not in their cited sources:
 *
 *   - Kupferstein: "...This is data, not opinion." — that sentence is in
 *     neither the paper nor its abstract. A paraphrase with an editorial
 *     flourish appended, set in quotation marks.
 *   - Milton: a fair summary of his argument, but not his text.
 *   - Berne: paraphrased; the working draft says "no body/mind is left behind".
 *
 * A fourth defect lived in sel_tool_upstander.js: "Be the change you wish to
 * see in the world" credited to Gandhi, who never said or wrote it.
 *
 * Putting invented words in a named living person's mouth is the worst defect
 * available to a hub built on "nothing about us without us", and NO existing
 * gate can see it: the string looks like a quote and has a citation next to it.
 *
 * WHAT THIS CAN AND CANNOT DO: it cannot prove a quote is real — only a primary
 * source does that. It catches the failure SHAPES already found here, so a
 * reviewer checks the risky entries first:
 *
 *   1. known-misattribution   — a quote paired with a name known to be wrong.
 *   2. conflicting-attribution— one sentence credited to two different people.
 *   3. editorial-tell         — a writer's flourish inside the quotation marks.
 *   4. long-paraphrase-shape  — long, multi-clause, argument-shaped (advisory).
 *
 * Entries that hedge honestly ("(paraphrase)", "attributed to", "Common
 * saying", "Theodore Parker / MLK Jr.") are NOT flagged — that is the behaviour
 * we want to encourage.
 *
 * Usage:  node dev-tools/check_sel_quote_attribution.cjs [--quiet] [--json]
 * Exit:   non-zero on any BLOCKING finding (kinds 1-3). Kind 4 is advisory.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const QUIET = process.argv.includes('--quiet');
const AS_JSON = process.argv.includes('--json');

const FILES = [
  'sel_hub/sel_tool_advocacy.js',
  'sel_hub/sel_tool_digitalwellbeing.js',
  'sel_hub/sel_tool_upstander.js',
  'sel_hub/sel_tool_disabilityvoices.js',
];

// Keys that name whoever the quote is credited to, in priority order.
const ATTR_KEYS = ['mentor', 'author', 'name', 'speaker', 'who', 'person', 'source'];
const NAME_KEYS = ['mentor', 'author', 'name', 'speaker', 'who', 'person'];

// A quote that already admits it is second-hand is doing the honest thing.
const HEDGES = ['paraphrase', 'attributed', 'common saying', 'proverb', 'variously',
  'often quoted', '/', 'movement', 'traditional', 'adapted'];

// quote prefix -> names that make it WRONG, plus the correction.
const KNOWN_MISATTRIBUTIONS = [
  { starts: 'be the change you wish to see in the world', wrong: ['gandhi'],
    why: 'Gandhi never said or wrote this; it is a later paraphrase of an Indian Opinion (1913) passage.' },
  { starts: 'be the change that you wish to see in the world', wrong: ['gandhi'],
    why: 'Gandhi never said or wrote this.' },
  { starts: 'the only thing necessary for the triumph of evil', wrong: ['burke'],
    why: 'Not traceable to Burke in this form.' },
  { starts: 'first they came for the socialists', wrong: ['king', 'gandhi', 'bonhoeffer'],
    why: 'Martin Niemoller wrote this; the list of groups also varies between versions.' },
  { starts: 'insanity is doing the same thing over and over', wrong: ['einstein'],
    why: 'Not Einstein; no source predates the 1980s.' },
  { starts: 'well-behaved women rarely make history', wrong: ['monroe', 'roosevelt'],
    why: 'Laurel Thatcher Ulrich wrote this.' },
  { starts: 'i disapprove of what you say but i will defend', wrong: ['voltaire'],
    why: 'Evelyn Beatrice Hall summarising Voltaire, not Voltaire himself.' },
  { starts: 'our deepest fear is not that we are inadequate', wrong: ['mandela'],
    why: 'Marianne Williamson wrote this; Mandela never used it in an address.' },
  { starts: 'if you are neutral in situations of injustice', wrong: ['king', 'gandhi'],
    why: 'Desmond Tutu said this.' },
];

const EDITORIAL_TELLS = [
  'this is data, not opinion',
  'and that is a fact',
  'make no mistake',
];

function unescape(s) {
  return s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

// Walk back to the '{' that opens the record holding `pos`, then forward to its
// match. Reading only that object's keys avoids bleeding an attribution across
// adjacent records (which a naive proximity window does, inventing findings).
function enclosingObject(src, pos) {
  let depth = 0;
  let start = -1;
  for (let i = pos; i >= 0; i -= 1) {
    const c = src[i];
    if (c === '}') depth += 1;
    else if (c === '{') {
      if (depth === 0) { start = i; break; }
      depth -= 1;
    }
  }
  if (start === -1) return null;
  depth = 0;
  const limit = Math.min(src.length, start + 6000);
  for (let j = start; j < limit; j += 1) {
    const c = src[j];
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  return null;
}

function collectQuotes() {
  const rows = [];
  for (const rel of FILES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const src = fs.readFileSync(abs, 'utf8');
    const re = /\bquote:\s*'((?:[^'\\]|\\.)*)'/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const obj = enclosingObject(src, m.index);
      if (!obj) continue;
      const attr = {};
      for (const k of ATTR_KEYS) {
        const km = new RegExp('\\b' + k + ":\\s*'((?:[^'\\\\]|\\\\.)*)'").exec(obj);
        if (km) attr[k] = unescape(km[1]);
      }
      if (Object.keys(attr).length === 0) continue;
      rows.push({
        file: path.basename(rel),
        line: src.slice(0, m.index).split('\n').length,
        quote: unescape(m[1]),
        attr,
      });
    }
  }
  return rows;
}

const whoOf = (r) => {
  for (const k of NAME_KEYS) if (r.attr[k]) return r.attr[k];
  return '';
};
const isHedged = (r) => {
  const blob = Object.values(r.attr).join(' ').toLowerCase();
  return HEDGES.some((h) => blob.includes(h));
};
const norm = (s) => s.toLowerCase().replace(/[^a-z ]/g, '').trim();

// A movement slogan credited to the movement AND to someone who popularised it
// is consistent, not contradictory. Collapse those to one root.
function attributionRoot(name) {
  const n = name.toLowerCase();
  if (/disability|movement|asan|ne'eman|neeman/.test(n)) return 'disability-rights movement';
  return n;
}

function audit(rows) {
  const findings = [];

  const byText = new Map();
  for (const r of rows) {
    const key = norm(r.quote);
    if (!byText.has(key)) byText.set(key, []);
    byText.get(key).push(r);
  }
  for (const group of byText.values()) {
    const names = [...new Set(group.map(whoOf).filter(Boolean))];
    const roots = new Set(names.map(attributionRoot));
    if (roots.size > 1) {
      findings.push({
        kind: 'conflicting-attribution',
        detail: 'same sentence credited to: ' + names.sort().join(' | '),
        quote: group[0].quote.slice(0, 120),
        where: group.map((r) => `${r.file}:${r.line}`),
      });
    }
  }

  for (const r of rows) {
    const q = norm(r.quote);
    const who = whoOf(r).toLowerCase();
    if (isHedged(r)) continue;
    for (const rule of KNOWN_MISATTRIBUTIONS) {
      if (!q.startsWith(norm(rule.starts).slice(0, 45))) continue;
      if (rule.wrong.some((n) => who.includes(n))) {
        findings.push({
          kind: 'known-misattribution',
          detail: rule.why,
          quote: r.quote.slice(0, 120),
          where: [`${r.file}:${r.line} (${whoOf(r)})`],
        });
      }
    }
  }

  for (const r of rows) {
    const low = r.quote.toLowerCase();
    for (const tell of EDITORIAL_TELLS) {
      if (low.includes(tell)) {
        findings.push({
          kind: 'editorial-tell',
          detail: `contains "${tell}" — reads as a writer's flourish, not transcribed speech`,
          quote: r.quote.slice(0, 120),
          where: [`${r.file}:${r.line} (${whoOf(r)})`],
        });
      }
    }
  }

  for (const r of rows) {
    const q = r.quote;
    if (q.length > 200 && (q.match(/\./g) || []).length >= 2 && !isHedged(r)) {
      findings.push({
        kind: 'long-paraphrase-shape',
        detail: `${q.length} chars — verify verbatim against the source`,
        quote: q.slice(0, 120),
        where: [`${r.file}:${r.line} (${whoOf(r)})`],
      });
    }
  }

  const order = {
    'known-misattribution': 0,
    'conflicting-attribution': 1,
    'editorial-tell': 2,
    'long-paraphrase-shape': 3,
  };
  findings.sort((a, b) => order[a.kind] - order[b.kind]);
  return findings;
}

const BLOCKING = new Set(['known-misattribution', 'conflicting-attribution', 'editorial-tell']);

const rows = collectQuotes();
const findings = audit(rows);
const blocking = findings.filter((f) => BLOCKING.has(f.kind));

if (AS_JSON) {
  console.log(JSON.stringify({ audited: rows.length, findings }, null, 2));
} else {
  for (const f of findings) {
    if (QUIET && !BLOCKING.has(f.kind)) continue;
    console.log(`[${f.kind.toUpperCase()}] ${f.detail}`);
    console.log(`    "${f.quote}"`);
    for (const w of f.where) console.log('      - ' + w);
    console.log();
  }
  if (!QUIET) {
    console.log(`quotes audited : ${rows.length}`);
    console.log(`advisory       : ${findings.length - blocking.length}`);
  }
  if (blocking.length === 0) {
    console.log(`✓ check_sel_quote_attribution: no blocking attribution defects across ${rows.length} attributed quotes.`);
  } else {
    console.log(`✗ check_sel_quote_attribution: ${blocking.length} blocking finding(s).`);
  }
}

process.exit(blocking.length ? 1 : 0);
