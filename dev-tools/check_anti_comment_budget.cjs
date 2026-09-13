#!/usr/bin/env node
'use strict';

// Comment-byte budget for AlloFlowANTI.txt (2026-09-13).
//
// WHY: the host is pasted into Gemini Canvas as-is, so every comment byte ships.
// Comments here are agent-to-agent regression notes and are worth keeping —
// but they grow without bound (336 KB / 12.6% of the file when this gate was
// added; a previous full strip regrew). This is a RATCHET, the same shape as
// the __alloT key gate: the total may only go down. To add a note, condense or
// remove another. Write "why", not "what": the code already says what.
//
// Usage: node dev-tools/check_anti_comment_budget.cjs [--quiet] [--update] [--allow-increase]
//   exit 1 when comment bytes exceed the baseline; --update re-baselines DOWN
//   to the current total (an increase needs --allow-increase and a reason).

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const ROOT = path.resolve(__dirname, '..');
const HOST = path.join(ROOT, 'AlloFlowANTI.txt');
const BASELINE = path.join(__dirname, 'anti_comment_budget_baseline.json');
const QUIET = process.argv.includes('--quiet');
const UPDATE = process.argv.includes('--update');
const ALLOW_INCREASE = process.argv.includes('--allow-increase');

function measure(source) {
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'], attachComment: true });
  let bytes = 0;
  for (const c of ast.comments) bytes += Buffer.byteLength(source.slice(c.start, c.end), 'utf8');
  return { bytes, count: ast.comments.length, total: Buffer.byteLength(source, 'utf8') };
}

function main() {
  const source = fs.readFileSync(HOST, 'utf8');
  const now = measure(source);
  const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null;
  const pct = (100 * now.bytes / now.total).toFixed(1);
  const log = (m) => { if (!QUIET) console.log(m); };
  log(`AlloFlowANTI.txt comments: ${now.bytes.toLocaleString()} bytes in ${now.count} comments (${pct}% of ${now.total.toLocaleString()} bytes)`);
  if (UPDATE) {
    if (baseline && now.bytes > baseline.bytes && !ALLOW_INCREASE) {
      console.error(`refusing to raise the budget ${baseline.bytes.toLocaleString()} -> ${now.bytes.toLocaleString()} without --allow-increase`);
      process.exit(1);
    }
    fs.writeFileSync(BASELINE, JSON.stringify({ bytes: now.bytes, comments: now.count, hostBytes: now.total, set: new Date().toISOString().slice(0, 10) }, null, 2) + '\n');
    console.log(`baseline set to ${now.bytes.toLocaleString()} bytes`);
    return;
  }
  if (!baseline) { console.error('no baseline: run with --update once'); process.exit(1); }
  if (now.bytes > baseline.bytes) {
    console.error(`✗ AlloFlowANTI.txt comment budget exceeded: ${now.bytes.toLocaleString()} > ${baseline.bytes.toLocaleString()} bytes (+${(now.bytes - baseline.bytes).toLocaleString()}).`);
    console.error('  Comments in the host ship to every Canvas paste. Condense or remove a note to add one');
    console.error('  (write why, not what), or re-baseline deliberately: node dev-tools/check_anti_comment_budget.cjs --update --allow-increase');
    process.exit(1);
  }
  const slack = baseline.bytes - now.bytes;
  log(`  ✓ within budget (${baseline.bytes.toLocaleString()} bytes, ${slack.toLocaleString()} under)`);
  if (slack > 2048) log('  ↓ ratchet down with: node dev-tools/check_anti_comment_budget.cjs --update');
}

main();
