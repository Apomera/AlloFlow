#!/usr/bin/env node
// Why a tranche's recall can be "low" and still be perfect.
//
// This rebuild authors a block WHOLE at its starting page when it spans a page
// break, so the receiving page's tranche never contains it. A per-page recall
// check on the receiving page is then structurally unable to see that content
// and reports every word of it as uncovered. Session 25 scored 0.9642 and
// session 26 scored 0.9366 for exactly this reason, with nothing missing.
//
// So: check the shortfall against WHAT THE PREVIOUS TRANCHE CARRIED, not
// against zero.
//
//   node mcp-testing/tools/carried_block_check.cjs //     <receiving-tranche.json> <carrying-tranche.json> <receiving page number>
//
// Reports the shortfall split three ways - words that appear in the carrying
// tranche, page furniture, and anything left over. Left over is the only part
// that needs investigating.
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const REPO = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const [recvPath, carryPath, pageArg] = process.argv.slice(2);

const out = execSync(
  `node "${REPO}/mcp-testing/tools/tranche_recall.cjs" ` +
  `"${REPO}/mcp-testing/corpus/born-digital/irs-i1040-instructions.pdf" "${recvPath}" --top 400`,
  { encoding: 'utf8', maxBuffer: 1 << 26 });
console.log(out.split('\n').slice(0, 6).join('\n'));

const rows = [];
for (const line of out.split('\n')) {
  const m = line.match(/^\s*-\s*(\d+)\s+(\S+)\s+src=(\d+)\s+plan=(\d+)/);
  if (m) rows.push({ missing: +m[1], tok: m[2] });
}

// vocabulary of the blocks the PREVIOUS tranche authored for the spanning page
const carry = JSON.parse(fs.readFileSync(carryPath, 'utf8'));
const tokens = (raw) => raw.toLowerCase().replace(/[’']/g, "'").replace(/-\s*/g, '')
  .replace(/[^a-z0-9$%'.,]+/g, ' ').split(/\s+/).map((t) => t.replace(/^[.,']+|[.,']+$/g, '')).filter(Boolean);
const carried = new Set();
for (const b of carry.blocks) {
  const parts = [b.text, b.caption, ...(b.items || [])].filter(Boolean).join(' ');
  for (const t of tokens(parts)) carried.add(t);
}

const FURNITURE = new Set(['need', 'more', 'information', 'forms', 'visit', 'irs.gov', 'page', '126', String(pageArg)]);
let inCarried = 0, furniture = 0;
const leftover = [];
for (const r of rows) {
  if (FURNITURE.has(r.tok)) furniture += r.missing;
  else if (carried.has(r.tok)) inCarried += r.missing;
  else leftover.push(r);
}
const total = rows.reduce((a, r) => a + r.missing, 0);
console.log(`\nshortfall instances: ${total}`);
console.log(`  words present in the CARRIED block(s) : ${inCarried}`);
console.log(`  page furniture                        : ${furniture}`);
console.log(`  UNEXPLAINED                           : ${leftover.reduce((a, r) => a + r.missing, 0)}`);
for (const r of leftover) console.log(`      ${r.tok}  missing=${r.missing}`);
