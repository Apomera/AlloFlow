#!/usr/bin/env node
/**
 * Add scope= to <th> elements that lack it (SCOPE-001, WCAG 1.3.1).
 *
 * PLAN mode by default — writes nothing. Pass --apply to write.
 * Optional args filter to matching file paths.
 *
 * WHY THIS SCANS RATHER THAN READING audit-report.json
 * The report's line numbers went stale inside ten minutes: birdlab's headers
 * moved 22 lines when a concurrent session edited the file, so every line the
 * report gave pointed at unrelated code. In a tree with another session writing
 * to it, an offset recorded minutes ago is not a location. This finds the calls
 * itself, so it is always working against the bytes on disk.
 *
 * WHY col VS row IS DECIDED, NOT DEFAULTED
 * scope="col" on a row header announces the header against the wrong axis —
 * worse than the missing attribute it replaces. The signal is which section
 * encloses the cell: <thead> heads a column, <tbody> heads its row.
 *
 * The section marker must be NEAR. raptorhunt builds headers in a helper —
 *   function statusHeader(key, label) { return h('th', {...}) }
 * — which sits 4,700 lines from any table. Its nearest marker was a <tbody>,
 * so an unbounded search would have labelled a sortable COLUMN header as a row
 * header. Anything without a marker close above is SKIPPED, not guessed.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));

/** How far above a <th> a thead/tbody marker may sit and still be its section. */
const MAX_SECTION_DISTANCE_LINES = 40;

function lineOf(src, idx) { return src.slice(0, idx).split('\n').length; }

function sectionFor(src, idx) {
  const h = Math.max(src.lastIndexOf("'thead'", idx), src.lastIndexOf('"thead"', idx));
  const b = Math.max(src.lastIndexOf("'tbody'", idx), src.lastIndexOf('"tbody"', idx));
  const nearest = Math.max(h, b);
  if (nearest === -1) return null;
  const line = lineOf(src, idx);
  if (line - lineOf(src, nearest) > MAX_SECTION_DISTANCE_LINES) return null;
  return h > b ? 'col' : 'row';
}

const TH_RE = /(?:createElement|(?:^|[\s,(])(?:e|h))\(\s*(['"])th\1\s*,/g;

const files = fs.readdirSync(path.join(ROOT, 'stem_lab'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => 'stem_lab/' + f)
  .filter((f) => !only.length || only.some((o) => f.includes(o)));

let planned = 0;
let skipped = 0;
let already = 0;

for (const rel of files) {
  const abs = path.join(ROOT, rel);
  let src = fs.readFileSync(abs, 'utf8');
  const edits = [];
  let m;
  TH_RE.lastIndex = 0;
  while ((m = TH_RE.exec(src)) !== null) {
    const propsAt = m.index + m[0].length;
    const ahead = src.slice(propsAt, propsAt + 400);
    // Already scoped: leave it alone.
    if (/^\s*\{[^}]*\bscope\s*:/.test(ahead)) { already += 1; continue; }
    const form = /^\s*\{/.test(ahead) ? 'object' : (/^\s*null/.test(ahead) ? 'null' : null);
    if (!form) { edits.push({ line: lineOf(src, m.index), skip: 'props neither object nor null' }); continue; }
    const scope = sectionFor(src, m.index);
    if (!scope) { edits.push({ line: lineOf(src, m.index), skip: 'no thead/tbody within ' + MAX_SECTION_DISTANCE_LINES + ' lines' }); continue; }
    edits.push({ line: lineOf(src, m.index), scope, form, propsAt });
  }

  const doable = edits.filter((e) => !e.skip);
  if (!edits.length) continue;
  planned += doable.length;
  skipped += edits.length - doable.length;
  const cols = doable.filter((e) => e.scope === 'col').length;
  console.log(`\n${rel}`);
  console.log(`   fix ${doable.length}  (col ${cols}, row ${doable.length - cols})   skip ${edits.length - doable.length}`);
  edits.filter((e) => e.skip).forEach((e) => console.log(`     ${e.line}  SKIP  ${e.skip}`));

  if (!APPLY || !doable.length) continue;
  doable.sort((a, b) => b.propsAt - a.propsAt).forEach((e) => {
    if (e.form === 'object') {
      const brace = src.indexOf('{', e.propsAt);
      src = src.slice(0, brace + 1) + ` scope: '${e.scope}',` + src.slice(brace + 1);
    } else {
      const nullAt = src.indexOf('null', e.propsAt);
      src = src.slice(0, nullAt) + `{ scope: '${e.scope}' }` + src.slice(nullAt + 4);
    }
  });
  fs.writeFileSync(abs, src);
  console.log('   APPLIED');
}

console.log(`\n${planned} to fix, ${skipped} skipped, ${already} already scoped`
  + `${APPLY ? ' (written)' : ' (plan only)'}`);
