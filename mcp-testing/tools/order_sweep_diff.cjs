#!/usr/bin/env node
// Compare two order_sweep.cjs runs.
//
//   node mcp-testing/tools/order_sweep_diff.cjs <before.json> <after.json> [--eps 0.005]
//
// Reports every page whose column count or bigram agreement moved, and totals
// better / worse / neutral. A change that improves reading order shows up as
// MORE shared adjacent pairs with the content-stream referee; a change that
// merely shuffles content shows up as fewer. The point of the eps floor is to
// keep pages whose score wobbles in the fifth decimal out of the verdict.
'use strict';
const fs = require('fs');

const [, , beforePath, afterPath] = process.argv;
const epsArg = process.argv.indexOf('--eps');
const EPS = epsArg > 0 ? Number(process.argv[epsArg + 1]) : 0.005;
if (!beforePath || !afterPath) {
  console.error('usage: order_sweep_diff.cjs <before.json> <after.json> [--eps 0.005]');
  process.exit(2);
}
const A = JSON.parse(fs.readFileSync(beforePath, 'utf8')).results;
const B = JSON.parse(fs.readFileSync(afterPath, 'utf8')).results;

let better = 0, worse = 0, colsOnly = 0, pages = 0;
const rows = [];
// Pages the referee cannot score at all. __alloCsPageTexts returns nothing for
// some documents, and a page with no content-stream text is not evidence of
// anything in either direction — counting it as "unchanged" would quietly pad
// the verdict, so it is reported on its own line instead.
const unrefereed = {};
for (const doc of Object.keys(A)) {
  if (!B[doc]) { console.log(`! ${doc}: missing from after`); continue; }
  const bi = new Map(B[doc].map((r) => [r.page, r]));
  for (const a of A[doc]) {
    const b = bi.get(a.page);
    if (!b) continue;
    if (a.agree === null || b.agree === null) unrefereed[doc] = (unrefereed[doc] || 0) + 1;
    pages++;
    const dAgree = (b.agree ?? 0) - (a.agree ?? 0);
    const dCols = b.cols !== a.cols;
    if (Math.abs(dAgree) < EPS && !dCols) continue;
    if (Math.abs(dAgree) < EPS) colsOnly++;
    else if (dAgree > 0) better++;
    else worse++;
    rows.push({ doc, page: a.page, cols: `${a.cols}->${b.cols}`, agree: `${(a.agree ?? 0).toFixed(4)}->${(b.agree ?? 0).toFixed(4)}`, d: dAgree });
  }
}
rows.sort((p, q) => p.d - q.d);
for (const r of rows) {
  const tag = Math.abs(r.d) < EPS ? 'cols ' : (r.d > 0 ? 'BETTER' : 'WORSE ');
  console.log(`${tag} ${r.doc} p${String(r.page).padStart(4)}  cols ${r.cols.padEnd(8)} agree ${r.agree}  (${r.d >= 0 ? '+' : ''}${r.d.toFixed(4)})`);
}
console.log(`\n${pages} pages compared, ${rows.length} changed: ${better} better, ${worse} worse, ${colsOnly} column-count only (agreement within ${EPS})`);
const un = Object.keys(unrefereed);
if (un.length) {
  const total = un.reduce((s, d) => s + unrefereed[d], 0);
  console.log(`${total} of those pages have NO content-stream text, so the referee cannot score them: ${un.map((d) => `${d} (${unrefereed[d]})`).join(', ')}`);
}
