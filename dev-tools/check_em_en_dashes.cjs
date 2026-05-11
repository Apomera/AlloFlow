#!/usr/bin/env node
// check_em_en_dashes.cjs — Flag em (—) and en (–) dashes in user-facing writing.
//
// Why this exists:
//   Aaron prefers commas / periods / colons / semicolons / parentheses to
//   em and en dashes in any prose he sends to another person (emails,
//   letters, conference proposals, outreach). The dashes read as stylized
//   to him, not natural. He will ask to have them removed.
//
//   Scope is intentionally narrow: this rule applies to OUTBOUND PROSE,
//   not to:
//     - In-app UI text (en/em dashes are fine in tool copy, status text)
//     - Code comments, code identifiers
//     - Internal documentation (architecture.md, FEATURE_INVENTORY.md, READMEs)
//     - This audit itself, dev-tools/ scripts
//   Memory: feedback_no_em_en_dashes.md (confirmed Apr 26 2026 after a
//   false-positive over-application to status indicator text in aquarium tool).
//
// What it flags:
//   - U+2014 em dash (—)
//   - U+2013 en dash (–)
//   Hyphens (U+002D, -) are NOT flagged — those are fine in compound
//   adjectives like "grade-level", "screen-reader", "text-to-speech".
//
// Default scope (file patterns that look like outbound prose):
//   - outreach_*.md
//   - letter_*.md / letter_to_*.md
//   - email_*.md / email_to_*.md
//   - *proposal*.md
//   - *pitch*.md
//   - knowbility_*.md
//   - Any .md file passed explicitly via --file
//
// Usage:
//   node dev-tools/check_em_en_dashes.cjs
//   node dev-tools/check_em_en_dashes.cjs --verbose      (show full match context)
//   node dev-tools/check_em_en_dashes.cjs --file foo.md  (check one specific file)
//   node dev-tools/check_em_en_dashes.cjs --quiet
//
// Exit codes:
//   0 — no em/en dashes found in any outbound-prose file
//   1 — at least one em/en dash flagged
//   2 — usage error

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

function log(s) { if (!QUIET) console.log(s); }

// Build the file list
const fileFlagIdx = args.indexOf('--file');
let files = [];
if (fileFlagIdx >= 0 && args[fileFlagIdx + 1]) {
  files = [path.resolve(ROOT, args[fileFlagIdx + 1])];
} else {
  // Default scope: known outbound-prose patterns
  const patterns = [
    /^outreach_.+\.md$/,
    /^letter(_to)?_.+\.md$/,
    /^email(_to)?_.+\.md$/,
    /proposal.*\.md$/i,
    /pitch.*\.md$/i,
    /^knowbility_.+\.md$/,
  ];
  const entries = fs.readdirSync(ROOT);
  files = entries
    .filter(name => patterns.some(p => p.test(name)))
    .map(name => path.join(ROOT, name));
}

if (files.length === 0) {
  log('  No outbound-prose .md files matched. Pass --file <path> to check a specific file.');
  process.exit(0);
}

log('');
log('Em / en dash audit (outbound-prose only)');
log('────────────────────────────────────────');
log('  Scanning ' + files.length + ' file(s)…');
log('');

const EM_DASH = '—';
const EN_DASH = '–';

let totalEm = 0;
let totalEn = 0;
const fileFindings = [];

for (const fp of files) {
  if (!fs.existsSync(fp)) {
    log('  ⚠ Skipping (not found): ' + path.relative(ROOT, fp));
    continue;
  }
  const src = fs.readFileSync(fp, 'utf8');
  const lines = src.split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const emCount = (line.match(new RegExp(EM_DASH, 'g')) || []).length;
    const enCount = (line.match(new RegExp(EN_DASH, 'g')) || []).length;
    if (emCount + enCount > 0) {
      hits.push({ line: i + 1, emCount, enCount, text: line });
      totalEm += emCount;
      totalEn += enCount;
    }
  }
  if (hits.length > 0) {
    fileFindings.push({ file: path.relative(ROOT, fp), hits });
  }
}

if (fileFindings.length === 0) {
  log('  ✅ No em or en dashes found in ' + files.length + ' outbound-prose file(s).');
  log('');
  process.exit(0);
}

log('  ✗ Found ' + totalEm + ' em dash(es) and ' + totalEn + ' en dash(es) across ' + fileFindings.length + ' file(s):');
log('');

for (const { file, hits } of fileFindings) {
  log('  ' + file + '  (' + hits.length + ' line' + (hits.length === 1 ? '' : 's') + ')');
  for (const h of hits) {
    const flags = [];
    if (h.emCount) flags.push(h.emCount + ' em');
    if (h.enCount) flags.push(h.enCount + ' en');
    if (VERBOSE) {
      // Show context: line with dashes highlighted
      const highlighted = h.text
        .replace(new RegExp(EM_DASH, 'g'), '[—]')
        .replace(new RegExp(EN_DASH, 'g'), '[–]');
      const truncated = highlighted.length > 100 ? highlighted.slice(0, 97) + '...' : highlighted;
      log('     L' + h.line + '  (' + flags.join(', ') + ')  ' + truncated);
    } else {
      log('     L' + h.line + '  (' + flags.join(', ') + ')');
    }
  }
  log('');
}

log('  Fix: replace with commas (most common), periods (when independent clause follows),');
log('       colons (for lists / amplification), semicolons (for related clauses),');
log('       or parentheses (for brief asides).');
log('  Hyphens (-) in compound adjectives are fine — only — and – need replacing.');
log('  Run with --verbose to see surrounding text for each match.');
log('');

process.exit(1);
