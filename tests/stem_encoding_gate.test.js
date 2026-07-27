// Encoding gate: no CP1252-decoded UTF-8 anywhere in the STEM Lab sources.
//
// This class of corruption is invisible in a diff review and loud to a user: it shipped
// mojibake emoji in unit-converter achievement labels and scale chips, a broken star and
// cross-mark in the molecule quiz, and — worst — a garbled em dash inside an
// aria-live region in Arc City's Circuit Clash, so a screen reader ANNOUNCED it.
//
// Detection is a round trip rather than a needle list: encode a run of non-ASCII back
// through CP1252 and decode it as UTF-8. Correct text cannot survive that (a lone
// e-acute is not valid standalone UTF-8); only genuine double-encoding does. That
// makes the gate catch sequences nobody has seen yet, instead of the ones we happened
// to write down.
//
// Two deliberate exemptions, both verified by hand and both narrow:
//   * runs led by the multiplication or division sign — "5x-25x" written with a real
//     multiplication sign and an en dash round-trips into Hebrew, and is legitimate
//   * 15 comment banners in stem_tool_dissection.js that were corrupted MORE than once,
//     losing bytes; they are unrecoverable and comment-only, so they are recorded here
//     rather than guessed at

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();

// CP1252 0x80-0x9F, including the five UNDEFINED slots that lenient decoders pass
// through as the same-numbered C1 control. Leaving those five out makes recoverable
// mojibake look unrecoverable — that is what hid the star, cross, globe, ant and gear.
const CP1252_HIGH = {
  0x0081: 0x81, 0x008D: 0x8D, 0x008F: 0x8F, 0x0090: 0x90, 0x009D: 0x9D,
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F
};

const decoder = new TextDecoder('utf-8', { fatal: false });
const REPLACEMENT = String.fromCharCode(0xFFFD);
const CONTROLS = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F]');
const RUN_RE = new RegExp('[^\\u0000-\\u007F]+', 'g');

function toCp1252Bytes(str) {
  const out = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp <= 0x7F || (cp >= 0xA0 && cp <= 0xFF)) out.push(cp);
    else if (CP1252_HIGH[cp] !== undefined) out.push(CP1252_HIGH[cp]);
    else return null;
  }
  return Buffer.from(out);
}

export function looksLikeMojibake(run) {
  const lead = run.codePointAt(0);
  if (lead === 0x00D7 || lead === 0x00F7) return null;   // real operators, see header
  const bytes = toCp1252Bytes(run);
  if (!bytes) return null;
  const decoded = decoder.decode(bytes);
  if (decoded.indexOf(REPLACEMENT) >= 0) return null;
  if ([...decoded].length >= [...run].length) return null;
  if (CONTROLS.test(decoded)) return null;
  return decoded;
}

// Known-unrecoverable, comment-only. Keyed by file so a NEW bad site in the same file
// is still caught; the count is pinned so the debt cannot quietly grow.
const KNOWN_UNRECOVERABLE = { 'stem_tool_dissection.js': 15 };

// DEFERRED, not exempt. These two were left out of the 2026-07-26 sweep because other
// sessions had substantial in-flight edits in them at the time (a ~561-line shared 3D
// viewer shell in the module, ~793 lines in probability), and repairing a file someone
// is actively rewriting entangles a mechanical fix with their work. Counts are pinned
// exactly, so the debt cannot grow and cannot be forgotten: when those lanes land, run
// the repair over these two files and delete this map.
const DEFERRED = { 'stem_lab_module.js': 12, 'stem_tool_probability.js': 28 };

// Scanning a directory of multi-megabyte tool sources is not cheap, and each
// directory is asked about twice. Memoize so the second question is free.
const SCAN_CACHE = new Map();
function scan(dir) {
  if (SCAN_CACHE.has(dir)) return SCAN_CACHE.get(dir);
  const findings = scanUncached(dir);
  SCAN_CACHE.set(dir, findings);
  return findings;
}

// Fast necessary condition: a UTF-8 lead byte (0xC2-0xF4) rendered through CP1252 always
// lands in U+00C0-U+00FF, so a file with no character in that range cannot contain
// mojibake. One regex test skips the per-line work for almost every file, which is the
// difference between a gate that runs in a second and one nobody keeps enabled.
const LEAD_HINT = new RegExp('[\\u00C0-\\u00FF]');

function scanUncached(dir) {
  const findings = new Map();
  for (const name of readdirSync(resolve(ROOT, dir))) {
    if (!name.endsWith('.js')) continue;
    const src = readFileSync(resolve(ROOT, dir, name), 'utf8');
    if (!LEAD_HINT.test(src)) continue;
    const hits = [];
    src.split('\n').forEach((line, i) => {
      for (const run of line.match(RUN_RE) || []) {
        if (looksLikeMojibake(run)) hits.push({ line: i + 1, run: run, text: line.trim().slice(0, 90) });
      }
    });
    if (hits.length) findings.set(name, hits);
  }
  return findings;
}

describe('STEM Lab source encoding', () => {
  for (const dir of ['stem_lab', 'desktop/web-app/public/stem_lab']) {
    it('has no repairable mojibake in ' + dir, () => {
      const findings = scan(dir);
      const report = [...findings.entries()]
        .filter(([file]) => DEFERRED[file] === undefined)
        .map(([file, hits]) =>
          file + ' x' + hits.length + '  first: line ' + hits[0].line + ' ' + JSON.stringify(hits[0].run) +
          ' -> ' + JSON.stringify(looksLikeMojibake(hits[0].run)));
      expect(report, 'repair with:  node dev-tools/fix_mojibake.cjs --apply <files>').toEqual([]);
    }, 60000);

    it('holds the deferred files at exactly their known count in ' + dir, () => {
      const findings = scan(dir);
      const actual = {};
      for (const [file, hits] of findings) if (DEFERRED[file] !== undefined) actual[file] = hits.length;
      expect(actual, 'deferred mojibake debt moved — repair the file and drop it from DEFERRED').toEqual(DEFERRED);
    }, 60000);
  }

  it('pins the unrecoverable comment banners so the debt cannot grow silently', () => {
    // These lost bytes to a second round of corruption, so no round trip recovers them.
    // Counted with the raw needle they still contain rather than the round-trip test.
    const needle = String.fromCharCode(0x00E2, 0x20AC, 0x201D);
    for (const [file, expected] of Object.entries(KNOWN_UNRECOVERABLE)) {
      const src = readFileSync(resolve(ROOT, 'stem_lab', file), 'utf8');
      const count = src.split('\n').filter((l) => l.includes(needle)).length;
      expect(count, file + ' unrecoverable-banner count changed').toBe(expected);
    }
  });

  it('the detector accepts correct text and rejects double-encoding', () => {
    const cc = (...c) => String.fromCharCode(...c);
    expect(looksLikeMojibake(cc(0x00E2, 0x20AC, 0x201D))).toBe(cc(0x2014));       // em dash
    expect(looksLikeMojibake(cc(0x00F0, 0x0178, 0x201C, 0x00A6))).toBe(cc(0xD83D, 0xDCE6));
    expect(looksLikeMojibake(cc(0x2014))).toBeNull();                              // real em dash
    expect(looksLikeMojibake(cc(0x00E9))).toBeNull();                              // real e-acute
    expect(looksLikeMojibake(cc(0xD83D, 0xDCE6))).toBeNull();                      // real emoji
    expect(looksLikeMojibake(cc(0x00D7, 0x2013))).toBeNull();                      // "5x-25x"
    expect(looksLikeMojibake(cc(0x4F60, 0x597D))).toBeNull();                      // CJK
  });
});
