// Encoding gate: no CP1252-decoded UTF-8 in the source trees that ship.
//
// This class of corruption is invisible in a diff review and loud to a user. It shipped
// mojibake emoji in unit-converter achievement labels, a broken star and cross-mark in
// the molecule quiz, garbled reorder buttons in the word-sounds panel, and — worst — a
// mangled em dash inside an aria-live region in Arc City, so a screen reader ANNOUNCED
// it. studio_module.js had been corrupted THREE times over, leaving 179 template
// descriptions and toolbar icons unreadable.
//
// Detection is a round trip, not a needle list: encode a run of non-ASCII back through
// CP1252 and decode as UTF-8, then repeat until it stops changing. Correct text cannot
// survive even one pass (a lone e-acute is not valid standalone UTF-8), so this catches
// sequences nobody has written down yet.
//
// Keep in step with dev-tools/fix_mojibake.cjs, which repairs what this finds.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();

// CP1252 0x80-0x9F, INCLUDING the five undefined slots that lenient decoders pass
// through as the same-numbered C1 control. Omitting those five makes recoverable
// mojibake look unrecoverable — that is what hid a star, cross, globe, ant and gear.
const CP1252_HIGH = {
  0x0081: 0x81, 0x008D: 0x8D, 0x008F: 0x8F, 0x0090: 0x90, 0x009D: 0x9D,
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F
};

// Lead-character whitelist, evidence-based for this corpus. Every CP1252 rendering of a
// UTF-8 lead byte is also an ordinary letter somewhere in Europe, so structure alone
// cannot separate mojibake from prose. Grouping every proposed repair by its lead
// settled it: these five produced 511 genuine repairs, while six others produced 42 that
// were all real text — German "Spass haben" (sharp-s + no-break space decodes to NKO),
// the Bulfinch pronunciation guide (AE + acute to Latin-B), French prose (e-acute +
// guillemet to CJK), and "5x-25x" magnification (times + en dash to Hebrew).
const LEAD_OK = { 0x00C2: 1, 0x00C3: 1, 0x00CE: 1, 0x00E2: 1, 0x00F0: 1 };

const PASSTHROUGH_SET = { 0x81: 1, 0x8D: 1, 0x8F: 1, 0x90: 1, 0x9D: 1 };
const decoder = new TextDecoder('utf-8', { fatal: false });
const REPLACEMENT = String.fromCharCode(0xFFFD);
const RUN_RE = new RegExp('[^\\u0000-\\u007F]+', 'g');
// A UTF-8 lead byte rendered through CP1252 always lands in U+00C0-U+00FF, so a file
// with no character in that range cannot contain mojibake. Skipping the per-line work
// for almost every file is the difference between a gate that runs in seconds and one
// nobody keeps enabled.
const LEAD_HINT = new RegExp('[\\u00C0-\\u00FF]');

function isControl(cp) { return cp <= 0x1F || (cp >= 0x7F && cp <= 0x9F); }

function onlyPassthroughControls(text) {
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (isControl(cp) && !PASSTHROUGH_SET[cp]) return false;
  }
  return true;
}

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

function peelOnce(run) {
  if (!LEAD_OK[run.codePointAt(0)]) return null;
  const bytes = toCp1252Bytes(run);
  if (!bytes) return null;
  const decoded = decoder.decode(bytes);
  if (decoded.indexOf(REPLACEMENT) >= 0) return null;
  if ([...decoded].length >= [...run].length) return null;
  // Intermediate peels of multi-encoded text legitimately carry the five CP1252
  // passthrough controls; the END state is checked separately, below.
  if (!onlyPassthroughControls(decoded)) return null;
  return decoded;
}

export function looksLikeMojibake(run) {
  let cur = run, peels = 0;
  while (peels < 6) {
    const next = peelOnce(cur);
    if (next == null || next === cur) break;
    cur = next; peels += 1;
  }
  if (!peels) return null;
  for (const ch of cur) if (isControl(ch.codePointAt(0))) return null;   // end must be real text
  return cur;
}

// Trees whose contents ship. Fossils are excluded by filename below rather than by
// directory, because they sit alongside live files.
const DIRS = ['stem_lab', 'desktop/web-app/public/stem_lab', 'src', 'desktop/command-center',
  '.', 'desktop/web-app/public'];

// Not scanned, each for a stated reason:
//   stem_tool_*.js outside stem_lab/ — fossils. The ANTI loader references every tool
//                                      with a stem_lab/ prefix (129 of 129), so these
//                                      stale duplicates at the repo root and the public
//                                      root are loaded by nothing; gating them is noise.
//   AGENT_HANDOFF.md                 — the coordination file every session writes; it
//                                      changes between any two tool calls.
//   _fix_*.js, *_scan.txt            — one-off scratch artifacts.
// The fossil rule applies ONLY outside the stem_lab trees. Applying it everywhere made
// the stem_lab scans skip every tool file and pass vacuously — caught by the pinned
// deferred count, which is exactly what a pinned number is for.
const STEM_DIRS = ['stem_lab', 'desktop/web-app/public/stem_lab'];
function skipFile(dir, name) {
  if (name === 'AGENT_HANDOFF.md') return true;
  if (/^_fix_.*\.js$/.test(name) || /_scan\.txt$/.test(name)) return true;
  if (STEM_DIRS.indexOf(dir) === -1 && /^stem_tool_.*\.js$/.test(name)) return true;
  return false;
}

// Comment-only and unrecoverable: corrupted more than once, losing bytes, so no round
// trip recovers them and reconstructing would be inventing content. Pinned so the debt
// cannot grow silently.
const KNOWN_UNRECOVERABLE = { 'stem_tool_dissection.js': 15 };

// DEFERRED, not exempt: other sessions were mid-feature in these when the sweep ran (a
// ~561-line shared 3D viewer shell; ~793 lines of probability work), and repairing a file
// someone is actively rewriting entangles a mechanical fix with their work. When those
// lanes land, repair these and delete the entry.
const DEFERRED = { 'stem_lab_module.js': 12, 'stem_tool_probability.js': 28 };

const SCAN_CACHE = new Map();
function scan(dir) {
  if (SCAN_CACHE.has(dir)) return SCAN_CACHE.get(dir);
  const findings = new Map();
  for (const entry of readdirSync(resolve(ROOT, dir), { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/\.(js|jsx|mjs|cjs|json|html)$/.test(entry.name)) continue;
    if (skipFile(dir, entry.name)) continue;
    let src;
    try { src = readFileSync(resolve(ROOT, dir, entry.name), 'utf8'); } catch (e) { continue; }
    if (!LEAD_HINT.test(src)) continue;
    const hits = [];
    src.split('\n').forEach((line, i) => {
      for (const run of line.match(RUN_RE) || []) {
        if (looksLikeMojibake(run)) hits.push({ line: i + 1, run: run });
      }
    });
    if (hits.length) findings.set(entry.name, hits);
  }
  SCAN_CACHE.set(dir, findings);
  return findings;
}

describe('source encoding', () => {
  for (const dir of DIRS) {
    it('has no repairable mojibake in ' + dir, () => {
      const report = [...scan(dir).entries()]
        .filter(([file]) => DEFERRED[file] === undefined)
        .map(([file, hits]) => dir + '/' + file + ' x' + hits.length + '  line ' + hits[0].line +
          ' ' + JSON.stringify(hits[0].run.slice(0, 24)) + ' -> ' + JSON.stringify(looksLikeMojibake(hits[0].run)));
      expect(report, 'repair with:  node dev-tools/fix_mojibake.cjs --apply <files>').toEqual([]);
    }, 60000);
  }

  it('holds the deferred files at exactly their known counts', () => {
    const actual = {};
    for (const dir of DIRS) {
      for (const [file, hits] of scan(dir)) {
        if (DEFERRED[file] === undefined) continue;
        actual[file] = Math.max(actual[file] || 0, hits.length);
      }
    }
    expect(actual, 'deferred debt moved — repair the file and drop it from DEFERRED').toEqual(DEFERRED);
  }, 60000);

  it('pins the unrecoverable comment banners so the debt cannot grow silently', () => {
    const needle = String.fromCharCode(0x00E2, 0x20AC, 0x201D);
    for (const [file, expected] of Object.entries(KNOWN_UNRECOVERABLE)) {
      const path = resolve(ROOT, 'stem_lab', file);
      if (!existsSync(path)) throw new Error('missing ' + file);
      const count = readFileSync(path, 'utf8').split('\n').filter((l) => l.includes(needle)).length;
      expect(count, file + ' unrecoverable-banner count changed').toBe(expected);
    }
  });

  it('accepts correct text and rejects double- and triple-encoding', () => {
    const cc = (...c) => String.fromCharCode(...c);
    expect(looksLikeMojibake(cc(0x00E2, 0x20AC, 0x201D))).toBe(cc(0x2014));                  // em dash
    expect(looksLikeMojibake(cc(0x00F0, 0x0178, 0x201C, 0x00A6))).toBe(cc(0xD83D, 0xDCE6));  // emoji
    // triple-encoded em dash from studio_module.js, which a single pass leaves broken
    expect(looksLikeMojibake(cc(0x00C3, 0x0192, 0x00C6, 0x2019, 0x00C3, 0x201A, 0x00C2, 0x00A2,
      0x00C3, 0x0192, 0x00C2, 0x00A2, 0x00C3, 0x00A2, 0x00E2, 0x201A, 0x00AC, 0x00C5, 0x00A1,
      0x00C3, 0x201A, 0x00C2, 0x00AC, 0x00C3, 0x0192, 0x00C2, 0x00A2, 0x00C3, 0x00A2, 0x00E2,
      0x20AC, 0x0161, 0x00C2, 0x00AC, 0x00C3, 0x201A, 0x00C2, 0x009D))).toBe(cc(0x2014));
    expect(looksLikeMojibake(cc(0x2014))).toBeNull();                     // real em dash
    expect(looksLikeMojibake(cc(0x00E9))).toBeNull();                     // real e-acute
    expect(looksLikeMojibake(cc(0xD83D, 0xDCE6))).toBeNull();             // real emoji
    expect(looksLikeMojibake(cc(0x00D7, 0x2013))).toBeNull();             // "5x-25x"
    expect(looksLikeMojibake(cc(0x00DF, 0x00A0))).toBeNull();             // German sharp-s + nbsp
    expect(looksLikeMojibake(cc(0x00C6, 0x00B4))).toBeNull();             // Bulfinch pronunciation
    expect(looksLikeMojibake(cc(0x4F60, 0x597D))).toBeNull();             // CJK
  });
});
