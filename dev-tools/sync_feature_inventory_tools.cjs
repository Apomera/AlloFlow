#!/usr/bin/env node
'use strict';
// sync_feature_inventory_tools.cjs - keep FEATURE_INVENTORY.md's STEM tool tables honest
// about which tools exist, without discarding what a person wrote.
//
// WHY (2026-09-22)
//   Part 4 said '92 self-contained interactive tools' while its own nine tables listed 95
//   rows and the registry held 150. 63 registered tools appeared NOWHERE in the document:
//   Coaster Lab, Dino Lab, Butterfly Habitat Lab, Access Lens, Arc City and 58 more. 13
//   rows named ids that no longer exist (dna -> dnaLab, pets -> petsLab). A reader using
//   this to understand the product would have missed 42% of it.
//
// WHAT IT WILL NOT DO
//   All 92 hand rows carry a grade band that exists in NO registry, and 79 of 92 carry a
//   purpose worded better than the harvested description. Regenerating the tables
//   wholesale would destroy that. So:
//     - an existing row is never rewritten; its wording is the author's
//     - a renamed id is corrected in place, keeping the prose beside it
//     - a missing tool is APPENDED with its registry description and a grade band of
//       'unreviewed', which is honest rather than invented
//   Counts in each heading and in the preamble ARE recomputed: a number is the one thing
//   here that can be wrong rather than merely differently put.
//
// USAGE
//   node dev-tools/sync_feature_inventory_tools.cjs            report what would change
//   node dev-tools/sync_feature_inventory_tools.cjs --out=F    write the result to F for review
//   node dev-tools/sync_feature_inventory_tools.cjs --apply    write it
//   node dev-tools/sync_feature_inventory_tools.cjs --check    exit 1 if stale (for CI)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOC = path.join(ROOT, 'FEATURE_INVENTORY.md');
const REGISTRY = path.join(ROOT, 'tool_index.json');
const APPLY = process.argv.indexOf('--apply') !== -1;
const CHECK = process.argv.indexOf('--check') !== -1;
const TICK = String.fromCharCode(96);
const NL = String.fromCharCode(10);

// Registry section -> the part-4 section that already covers it. A registry section with
// no home here lands in 4.9, where the document already puts cross-domain tools.
const SECTION_MAP = {
  'Math Fundamentals': '4.1',
  'Advanced Math': '4.1',
  'Geometry & Measurement': '4.1',
  'Data, Statistics & Probability': '4.1',
  'Life Science & Genetics': '4.2',
  'Ecology, Environment & Animals': '4.2',
  'Human Body, Health & Safety': '4.2',
  'Physics & Chemistry': '4.5',
  'Earth & Space Science': '4.4',
  'Engineering & Design': '4.6',
  'Arts & Music': '4.7',
  'Computing, AI & Digital Literacy': '4.8',
  'Strategy Games': '4.8',
  'Life Skills, Careers & Economics': '4.9',
  'Learning & Behavioral Science': '4.9',
  'Sports & Movement Science': '4.9'
};

const ROW_RE = new RegExp('^\\|\\s*' + TICK + '([A-Za-z0-9_]+)' + TICK + '\\s*\\|');
const HEAD_RE = new RegExp('^### 4\\.\\d+ ');
const NUM_RE = new RegExp('4\\.(\\d+)');
const SUB_RE = new RegExp('^#{2,3} ');
const COUNT_RE = new RegExp('\\((\\d+) tools?\\)');
const PRE_RE = new RegExp('^(\\d+) self-contained interactive tools');
const PIPE_RE = new RegExp('\\|', 'g');
const WS_RE = new RegExp('\\s+', 'g');

function load() {
  const doc = fs.readFileSync(DOC, 'utf8');
  const reg = JSON.parse(fs.readFileSync(REGISTRY, 'utf8')).tools;
  return { doc: doc, lines: doc.split(NL), reg: reg };
}

// Locate each 4.x section and the span of its table rows.
function sections(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!HEAD_RE.test(lines[i])) continue;
    const num = (lines[i].match(NUM_RE) || [])[0];
    let last = i;
    for (let j = i + 1; j < lines.length; j++) {
      if (SUB_RE.test(lines[j])) break;
      if (ROW_RE.test(lines[j])) last = j;
    }
    out.push({ num: num, head: i, lastRow: last });
  }
  return out;
}

function rowIds(lines, sec) {
  const ids = [];
  for (let i = sec.head + 1; i <= sec.lastRow; i++) {
    const m = lines[i].match(ROW_RE);
    if (m) ids.push({ line: i, id: m[1] });
  }
  return ids;
}

function main() {
  const st = load();
  const lines = st.lines.slice();
  const byLower = new Map(st.reg.map(function (t) { return [t.id.toLowerCase(), t]; }));
  const byBare = new Map(st.reg.map(function (t) {
    return [t.id.toLowerCase().replace(new RegExp('[^a-z0-9]', 'g'), ''), t];
  }));
  const secs = sections(lines);
  const renamed = [];
  const appended = [];
  const counts = [];
  const seen = new Set();

  // 1. Resolve every row to AT MOST ONE registry tool, and mark it seen at that moment.
  //    The first version resolved in one pass and counted "missing" in another, so a row
  //    it could not resolve left its tool unseen, the tool was appended as well, and the
  //    report read "152 of 150 registered tools" - two tools documented twice.
  //
  //    Evidence, strongest first. The prose on the row is never changed; only its id is.
  //      a. the id itself, ignoring case and separators (llm_literacy / llmLiteracy)
  //      b. the row's DISPLAY NAME as an id ("Geo Quiz" is geoQuiz): the author wrote
  //         the tool's name beside the stale id, and that name disambiguates what a
  //         prefix cannot - five registry ids start with "geo"
  //      c. the display name against registry LABELS, ignoring plurals ("Fractions
  //         Lab" is the tool now labelled "Fraction Lab")
  //      d. the id as a prefix, only when exactly one tool starts with it
  //    Anything else stays UNRESOLVED and is reported, never guessed.
  const bare = function (s) { return String(s).toLowerCase().replace(new RegExp('[^a-z0-9]', 'g'), ''); };
  const words = function (s) {
    return String(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
      .map(function (w) { return w.length > 3 ? w.replace(/s$/, '') : w; }).sort().join(' ');
  };
  const byLabelWords = new Map();
  for (const t of st.reg) {
    const k = words(t.label);
    byLabelWords.set(k, byLabelWords.has(k) ? null : t);   // null = ambiguous, never used
  }
  const unresolved = [];
  const duplicates = [];
  for (const sec of secs) {
    for (const r of rowIds(lines, sec)) {
      const display = (lines[r.line].split('|')[2] || '').trim();
      let hit = byLower.get(r.id.toLowerCase()) || byBare.get(bare(r.id)) || null;
      let how = 'id';
      if (!hit && display) { hit = byBare.get(bare(display)) || null; how = 'display name'; }
      if (!hit && display) { hit = byLabelWords.get(words(display)) || null; how = 'label'; }
      if (!hit) {
        const succ = st.reg.filter(function (t) { return bare(t.id).indexOf(bare(r.id)) === 0; });
        if (succ.length === 1) { hit = succ[0]; how = 'unique prefix'; }
      }
      if (!hit) {
        unresolved.push(r.id + ' ("' + display + '")');
        continue;
      }
      const key = hit.id.toLowerCase();
      if (seen.has(key)) duplicates.push(r.id + ' -> ' + hit.id + ' (already documented by another row)');
      seen.add(key);
      if (hit.id !== r.id) {
        lines[r.line] = lines[r.line].replace(TICK + r.id + TICK, TICK + hit.id + TICK);
        renamed.push(r.id + ' -> ' + hit.id + (how === 'id' ? '' : '   [by ' + how + ']'));
      }
    }
  }

  // 2. Append the tools no row mentions, into the section their registry entry implies.
  const missing = st.reg.filter(function (t) { return !seen.has(t.id.toLowerCase()); });
  const bySection = {};
  for (const t of missing) {
    const target = SECTION_MAP[t.section] || '4.9';
    (bySection[target] = bySection[target] || []).push(t);
  }
  // Bottom-up, so an insertion never invalidates the line numbers above it.
  const targets = Object.keys(bySection).sort().reverse();
  for (const target of targets) {
    const sec = secs.filter(function (s) { return s.num === target; })[0];
    if (!sec) continue;
    const add = bySection[target]
      .sort(function (a, b) { return a.id.localeCompare(b.id); })
      .map(function (t) {
        const purpose = String(t.desc || '').replace(PIPE_RE, '/').replace(WS_RE, ' ').trim();
        return '| ' + TICK + t.id + TICK + ' | ' + t.label + ' | ' + (purpose || 'See the tool.') + ' | unreviewed |';
      });
    lines.splice(sec.lastRow + 1, 0, ...add);
    appended.push(target + ': ' + add.length);
  }

  // 3. Recompute every heading count and the part-4 preamble.
  const after = sections(lines);
  let total = 0;
  for (const sec of after) {
    const n = rowIds(lines, sec).length;
    total += n;
    const before = lines[sec.head];
    const next = before.replace(COUNT_RE, '(' + n + ' tools)');
    if (next !== before) { lines[sec.head] = next; counts.push(sec.num + ': ' + n); }
  }
  // The count the reader sees must come from the tables as WRITTEN, not from the
  // bookkeeping that wrote them: re-read every row and count the distinct registered tools
  // it names. That is what turned "152 of 150" from a quiet wrong number into a failure.
  const regIds = new Set(st.reg.map(function (t) { return t.id; }));
  const documented = new Set();
  let rowsTotal = 0;
  for (const sec of after) {
    for (const r of rowIds(lines, sec)) {
      rowsTotal++;
      if (regIds.has(r.id)) documented.add(r.id);
    }
  }
  const absent = st.reg.filter(function (t) { return !documented.has(t.id); }).map(function (t) { return t.id; });
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(PRE_RE);
    if (m && Number(m[1]) !== documented.size) {
      lines[i] = lines[i].replace(m[1], String(documented.size));
      counts.push('preamble: ' + documented.size);
    }
  }

  const out = lines.join(NL);
  const stale = out !== st.doc;
  console.log('renamed ids   : ' + renamed.length);
  renamed.forEach(function (r) { console.log('    ' + r); });
  console.log('appended rows : ' + (appended.length ? appended.join(', ') : 'none'));
  console.log('counts fixed  : ' + (counts.length ? counts.join(', ') : 'none'));
  console.log('unresolved    : ' + (unresolved.length ? unresolved.join('; ') : 'none'));
  console.log('duplicates    : ' + (duplicates.length ? duplicates.join('; ') : 'none'));
  console.log('documented    : ' + documented.size + ' of ' + st.reg.length + ' registered tools, in ' + rowsTotal + ' rows');

  // Invariants. Each is a way this tool could quietly report a wrong number.
  const problems = [];
  if (documented.size > st.reg.length) problems.push('more tools documented than exist');
  if (absent.length) problems.push(absent.length + ' registered tool(s) still absent: ' + absent.join(', '));
  if (rowsTotal !== documented.size + unresolved.length + duplicates.length) {
    problems.push('row count ' + rowsTotal + ' is not documented + unresolved + duplicates (' +
      documented.size + ' + ' + unresolved.length + ' + ' + duplicates.length + ')');
  }
  if (problems.length) {
    console.error(NL + 'INVARIANT FAILED - nothing written:');
    problems.forEach(function (p) { console.error('  - ' + p); });
    process.exit(2);
  }

  if (CHECK) {
    // Unresolved or duplicate rows are drift a person must settle, so --check fails on
    // them as well as on a plain stale table.
    if (stale || unresolved.length || duplicates.length) {
      console.error(NL + 'FEATURE_INVENTORY.md tool tables are stale. Run this with --apply, then settle any unresolved or duplicate rows by hand.');
      process.exit(1);
    }
    console.log(NL + 'OK - the tool tables match the registry.');
    return;
  }
  // --out=<file> writes the result somewhere else so a person can review the diff before
  // the shared document changes; it never touches FEATURE_INVENTORY.md.
  const outArg = process.argv.filter(function (a) { return a.indexOf('--out=') === 0; })[0];
  if (outArg) {
    const target = outArg.slice('--out='.length);
    fs.writeFileSync(target, out);
    console.log(NL + 'wrote preview to ' + target + ' (FEATURE_INVENTORY.md unchanged)');
  } else if (APPLY) {
    fs.writeFileSync(DOC, out);
    console.log(NL + 'wrote FEATURE_INVENTORY.md');
  } else {
    console.log(NL + (stale ? 'DRY RUN - pass --apply to write.' : 'nothing to change.'));
  }
}

main();
