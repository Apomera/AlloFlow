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

  // 1. Correct ids that differ only by case, and ids that were renamed. The prose on the
  //    row is left exactly as its author wrote it.
  for (const sec of secs) {
    for (const r of rowIds(lines, sec)) {
      // The document writes some ids in snake_case where the registry uses camelCase
      // (llm_literacy / llmLiteracy). Compare on letters and digits alone so those resolve
      // rather than reading as a tool that no longer exists.
      const bare = function (s) { return String(s).toLowerCase().replace(new RegExp('[^a-z0-9]', 'g'), ''); };
      const exact = byLower.get(r.id.toLowerCase()) || byBare.get(bare(r.id));
      if (exact) {
        seen.add(exact.id.toLowerCase());
        if (exact.id !== r.id) {
          lines[r.line] = lines[r.line].replace(TICK + r.id + TICK, TICK + exact.id + TICK);
          renamed.push(r.id + ' -> ' + exact.id);
        }
        continue;
      }
      // Absent under any casing: accept a successor only when exactly one id starts with
      // the old one. Two candidates means a guess, and a guess in an inventory is worse
      // than a gap someone can see.
      const succ = st.reg.filter(function (t) {
        return t.id.toLowerCase().indexOf(r.id.toLowerCase()) === 0;
      });
      if (succ.length === 1) {
        seen.add(succ[0].id.toLowerCase());
        lines[r.line] = lines[r.line].replace(TICK + r.id + TICK, TICK + succ[0].id + TICK);
        renamed.push(r.id + ' -> ' + succ[0].id);
      } else {
        renamed.push(r.id + ' -> UNRESOLVED (' + succ.length + ' candidates; left as written)');
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
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(PRE_RE);
    if (m && Number(m[1]) !== total) {
      lines[i] = lines[i].replace(m[1], String(total));
      counts.push('preamble: ' + total);
    }
  }

  const out = lines.join(NL);
  const stale = out !== st.doc;
  console.log('renamed ids   : ' + renamed.length);
  renamed.forEach(function (r) { console.log('    ' + r); });
  console.log('appended rows : ' + (appended.length ? appended.join(', ') : 'none'));
  console.log('counts fixed  : ' + (counts.length ? counts.join(', ') : 'none'));
  console.log('documented    : ' + total + ' of ' + st.reg.length + ' registered tools');
  if (CHECK) {
    if (stale) {
      console.error(NL + 'FEATURE_INVENTORY.md tool tables are stale. Run this with --apply.');
      process.exit(1);
    }
    console.log(NL + 'OK - the tool tables match the registry.');
    return;
  }
  if (APPLY) {
    fs.writeFileSync(DOC, out);
    console.log(NL + 'wrote FEATURE_INVENTORY.md');
  } else {
    console.log(NL + (stale ? 'DRY RUN - pass --apply to write.' : 'nothing to change.'));
  }
}

main();
