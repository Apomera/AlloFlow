#!/usr/bin/env node
// Do the source's RUN-IN HEADINGS come in more than one level on a page?
//
//   node mcp-testing/tools/runin_levels.cjs <page_items-dump.json> [--cols 42,224,406]
//
// Page 109 of the i1040 turned out to mark two levels of run-in typographically
// and in two agreeing ways at once: the outer level is set in one face and
// starts FLUSH at the column left, the inner level is set in a DIFFERENT face
// and is INDENTED by a first-line indent. A rebuild that reads only "is this
// bold?" flattens both into one heading level and loses a hierarchy the source
// drew twice over.
//
// This reports, per page, every face that appears at a line start with its
// flush/indented split, so the question "does this page have one run-in level
// or two?" is answered from measurement instead of from reading the page.
//
// WHY LINE STARTS AND NOT ALL ITEMS. A run-in heading is by definition the
// first thing on its line; a bold phrase in the middle of a sentence is not a
// heading. Restricting to line starts is what separates the two, and it is why
// this cannot be answered by a face histogram alone.
//
// READ IT WITH THE BODY FACE IN MIND. The face carrying most line starts is
// the body text; the interesting rows are the rare faces. A face that appears
// BOTH flush and indented is usually one level whose members happen to fall at
// paragraph starts, not two levels — check the sample text before splitting it.
'use strict';
const fs = require('fs');

const argv = process.argv.slice(2);
const dumpPath = argv[0];
if (!dumpPath) {
  console.error('usage: runin_levels.cjs <page_items-dump.json> [--cols 42,224,406]');
  process.exit(2);
}
const colsArg = argv.includes('--cols') ? argv[argv.indexOf('--cols') + 1] : '42,224,406';
const COLS = colsArg.split(',').map(Number);

const doc = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
for (const page of doc.pages) {
  const items = page.items.filter((i) => String(i.text || '').trim());
  // Line starts: leftmost item on each (column, y-band).
  const starts = [];
  for (const col of COLS) {
    const inCol = items.filter((i) => i.x >= col - 4 && i.x < col + 178);
    const byY = new Map();
    for (const i of inCol) {
      const k = i.y.toFixed(1);
      if (!byY.has(k) || i.x < byY.get(k).x) byY.set(k, i);
    }
    for (const i of byY.values()) starts.push({ item: i, indent: i.x - col });
  }
  const byFace = new Map();
  for (const s of starts) {
    if (!byFace.has(s.item.face)) byFace.set(s.item.face, { flush: [], indented: [] });
    (s.indent > 4 ? byFace.get(s.item.face).indented : byFace.get(s.item.face).flush).push(s);
  }
  // Totals per face across ALL items, not just line starts. This is what
  // separates a run-in heading face from an italic cross-reference face: a
  // run-in only ever BEGINS a line, while an italic reference happens wherever
  // the sentence puts it, so most of its items are mid-line. Judging on line
  // starts alone flagged 17 of 22 i1040 pages as two-level, including ones
  // verified by hand to have a single level — the italic and icon-label faces
  // were being counted as heading levels.
  const totalByFace = new Map();
  const sizeByFace = new Map();
  for (const i of items) {
    totalByFace.set(i.face, (totalByFace.get(i.face) || 0) + 1);
    if (!sizeByFace.has(i.face)) sizeByFace.set(i.face, []);
    sizeByFace.get(i.face).push(i.size);
  }
  const median = (a) => { const s = a.slice().sort((p, q) => p - q); return s[Math.floor(s.length / 2)] || 0; };
  const rows = [...byFace.entries()].sort((a, b) => (b[1].flush.length + b[1].indented.length) - (a[1].flush.length + a[1].indented.length));
  const bodyFace = rows.length ? rows[0][0] : null;
  const bodySize = bodyFace ? median(sizeByFace.get(bodyFace) || [10]) : 10;
  console.log(`\n=== page ${page.page}: ${starts.length} line starts, body face ${bodyFace} @${bodySize}pt`);
  const runins = [];
  for (const [face, g] of rows) {
    if (face === bodyFace) continue;
    const nStart = g.flush.length + g.indented.length;
    const nTotal = totalByFace.get(face) || nStart;
    const startFrac = nStart / nTotal;
    const size = median(sizeByFace.get(face) || [0]);
    const sample = (g.flush[0] || g.indented[0]);
    const txt = sample ? String(sample.item.text).slice(0, 40) : '';
    // A run-in heading: body-sized, and its items essentially only ever start
    // a line. Display headings are larger; icon labels are much smaller;
    // italic references are mostly mid-line.
    const isRunin = nStart >= 2 && Math.abs(size - bodySize) <= 1 && startFrac >= 0.5;
    if (isRunin) runins.push([face, g]);
    console.log(`   ${face} @${size}pt  flush=${String(g.flush.length).padStart(2)} indented=${String(g.indented.length).padStart(2)}  startFrac=${startFrac.toFixed(2)}  ${isRunin ? 'RUN-IN ' : '       '}e.g. ${JSON.stringify(txt)}`);
  }
  const flushy = runins.filter(([, g]) => g.flush.length > g.indented.length);
  const indenty = runins.filter(([, g]) => g.indented.length > g.flush.length);
  if (flushy.length && indenty.length) {
    console.log(`   >>> TWO RUN-IN LEVELS: flush ${flushy.map((r) => r[0]).join('/')} vs indented ${indenty.map((r) => r[0]).join('/')}`);
  } else if (runins.length) {
    console.log(`   (one run-in level: ${runins.map((r) => r[0]).join('/')})`);
  }
}
