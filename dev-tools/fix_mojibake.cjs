#!/usr/bin/env node
// fix_mojibake.cjs - repair UTF-8 bytes that were once decoded as CP1252 and re-saved.
//
// Usage:
//   node dev-tools/fix_mojibake.cjs <files...>            dry run, prints every proposed change
//   node dev-tools/fix_mojibake.cjs --apply <files...>    rewrite in place
//
// The matching detector lives in tests/stem_encoding_gate.test.js, which fails if any
// repairable mojibake is present. Keep the two CP1252 tables in step.
//
// Method, and why it is safe to run over source files full of legitimate non-ASCII:
// take each maximal run of non-ASCII characters, encode it back to bytes through
// CP1252, and decode those bytes as strict UTF-8. A run is rewritten only when ALL
// of these hold:
//
//   * every character in the run is CP1252-encodable     (else it was never CP1252)
//   * the bytes decode as UTF-8 with no U+FFFD           (mojibake always does)
//   * the decoded text is SHORTER than the run           (mojibake is always longer)
//   * the decoded text has no C0/C1 control characters   (paranoia)
//
// Correct text fails these. "e-acute" alone encodes to the single byte 0xE9, which is
// not valid standalone UTF-8, so it is rejected. A real em dash beside an accent gives
// [0xE9,0x97] - also invalid. Only genuine double-encoding round-trips cleanly.
//
// Every non-ASCII value below is written as a \u escape, and files are read/written
// explicitly as utf8, so neither a shell argument nor a pipe can corrupt the repair
// itself. See feedback_shell_mangles_unicode_args + feedback_powershell_pipe_mangles_files.

const fs = require('fs');

// CP1252 0x80-0x9F: the range where CP1252 differs from latin-1. Undefined slots omitted.
const CP1252_HIGH = {
  // CP1252 leaves 0x81, 0x8D, 0x8F, 0x90 and 0x9D UNDEFINED. Lenient decoders pass
  // those bytes through as the same-numbered C1 control, so a mojibake run can
  // legitimately contain them - and without these five identities the round trip
  // fails and a genuinely recoverable icon looks unrecoverable. This is what was
  // hiding a broken star, cross-mark, globe, ant and gear behind an otherwise
  // clean sweep.
  0x0081: 0x81, 0x008D: 0x8D, 0x008F: 0x8F, 0x0090: 0x90, 0x009D: 0x9D,
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F
};

function toCp1252Bytes(str) {
  const out = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp <= 0x7F || (cp >= 0xA0 && cp <= 0xFF)) out.push(cp);
    else if (CP1252_HIGH[cp] !== undefined) out.push(CP1252_HIGH[cp]);
    else return null;                         // not representable => never was CP1252
  }
  return Buffer.from(out);
}

const decoder = new TextDecoder('utf-8', { fatal: false });
const REPLACEMENT = String.fromCharCode(0xFFFD);
const CONTROLS = new RegExp('[\u0000-\u001F\u007F-\u009F]');
const RUN_RE = new RegExp('[^\u0000-\u007F]+', 'g');

function repairRun(run) {
  // A run must not START with a character that is ALSO a legitimate standalone
  // symbol in this corpus. The multiplication and division signs are UTF-8 lead
  // bytes (0xD7 / 0xF7) as well as real operators, so "5x-25x" written with a
  // real multiplication sign and an en dash round-trips into Hebrew. Genuine
  // mojibake of those operators leads with A-tilde instead (0xC3), which is
  // unaffected by this guard.
  const lead = run.codePointAt(0);
  if (lead === 0x00D7 || lead === 0x00F7) return null;
  const bytes = toCp1252Bytes(run);
  if (!bytes) return null;
  const decoded = decoder.decode(bytes);
  if (decoded.indexOf(REPLACEMENT) >= 0) return null;
  if ([...decoded].length >= [...run].length) return null;
  if (CONTROLS.test(decoded)) return null;
  return decoded;
}

function repairText(text) {
  const changes = [];
  const out = text.replace(RUN_RE, (run) => {
    const fixed = repairRun(run);
    if (fixed == null) return run;
    changes.push({ from: run, to: fixed });
    return fixed;
  });
  return { out: out, changes: changes };
}

module.exports = { repairRun: repairRun, repairText: repairText };

if (require.main === module) {
const apply = process.argv.includes('--apply');
const files = process.argv.slice(2).filter((a) => a !== '--apply');
let totalSites = 0, totalFiles = 0;
const tally = new Map();

for (const file of files) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  const r = repairText(src);
  if (!r.changes.length) continue;
  totalFiles += 1;
  totalSites += r.changes.length;
  for (const c of r.changes) tally.set(c.from, (tally.get(c.from) || 0) + 1);
  console.log((apply ? 'FIX   ' : 'WOULD ') + file + '  (' + r.changes.length + ' run(s))');
  if (apply) fs.writeFileSync(file, r.out, 'utf8');
}

console.log('\ndistinct mojibake sequences and what they decode to:');
[...tally.entries()].sort((a, b) => b[1] - a[1]).forEach((entry) => {
  const from = entry[0];
  const to = repairRun(from);
  const cps = [...to].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
  console.log('  x' + String(entry[1]).padStart(3) + '  ' + JSON.stringify(from) + '  ->  ' + JSON.stringify(to) + '  ' + cps);
});
console.log('\n' + (apply ? 'repaired ' : 'would repair ') + totalSites + ' run(s) across ' + totalFiles + ' file(s)');
}
