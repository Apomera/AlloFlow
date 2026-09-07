import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * ui_strings.js OVERRIDES the English fallback written at the call site, so the
 * text a user sees is the one in ui_strings — not the one anybody reviewed in
 * the source. When the two drift, nothing throws and no gate notices.
 *
 * Found by checking this by hand:
 *   - a landmark shipped as "Leaning Tower of Shanghai", which is not a
 *     building; the source said "Shanghai Tower", and the record's own height
 *     (2,073 ft) is Shanghai Tower's;
 *   - the canvas description for screen-reader users had been extended in the
 *     source to mention the flap brackets and the X wheel brake, while
 *     ui_strings still shipped the older, shorter control list;
 *   - two keys were each used with two DIFFERENT English strings — one as an
 *     aria-label and one as a visible caption with a leading emoji — so the
 *     screen reader announced the emoji;
 *   - 47 call sites had no ui_strings entry at all: correct in English, but
 *     invisible to every language pack;
 *   - six keys outlived their call sites, two of them holding text that had
 *     been replaced precisely because it was factually wrong.
 */
const SRC = 'stem_lab/stem_tool_flightsim.js';
const UI = 'ui_strings.js';
// ui_strings.js is mirrored four times and the mirrors are what the desktop and
// build targets actually serve. Checking only the root let three of them fall 19
// keys behind unnoticed.
const UI_MIRRORS = [
  'desktop/web-app/public/ui_strings.js',
  'desktop/web-app/build/ui_strings.js',
  'desktop/app-build/ui_strings.js',
];

const findSection = (o, n) => {
  if (!o || typeof o !== 'object') return null;
  if (o[n] && typeof o[n] === 'object') return o[n];
  for (const k of Object.keys(o)) { const r = findSection(o[k], n); if (r) return r; }
  return null;
};

const source = readFileSync(SRC, 'utf8');
const section = findSection(JSON.parse(readFileSync(UI, 'utf8')), 'flightsim');

// __alloT('stem.flightsim.KEY', 'FALLBACK' | "FALLBACK")
const callSites = () => {
  const re = /__alloT\(\s*'stem\.flightsim\.([A-Za-z0-9_]+)'\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*\)/g;
  const out = [];
  let m;
  while ((m = re.exec(source))) {
    // eslint-disable-next-line no-eval
    let fb; try { fb = eval(m[2]); } catch (e) { continue; }
    out.push({ key: m[1], fallback: fb });
  }
  return out;
};

// Some keys are COMPOSED at the call site — 'stem.flightsim.' + ch.id + '_desc'
// — so a literal scan cannot see them. Collect the suffixes and treat matching
// keys as reachable; without this the orphan check reports every challenge and
// lesson string as dead.
const dynamicSuffixes = () => {
  const out = new Set();
  const re = /__alloT\(\s*'stem\.flightsim\.'\s*\+\s*\(?[A-Za-z0-9_.]+\)?\s*\+\s*'([A-Za-z0-9_]+)'/g;
  let m;
  while ((m = re.exec(source))) out.add(m[1]);
  return Array.from(out);
};

describe('flightsim ui_strings consistency', () => {
  const sites = callSites();

  it('parses a meaningful number of call sites (the scanner itself must not go blind)', () => {
    expect(section, 'no flightsim section in ui_strings').toBeTruthy();
    expect(sites.length, 'the __alloT scan matched almost nothing — check the pattern')
      .toBeGreaterThan(400);
  });

  it('never uses one key for two different English strings', () => {
    const seen = new Map();
    const clashes = [];
    for (const s of sites) {
      if (!seen.has(s.key)) { seen.set(s.key, s.fallback); continue; }
      if (seen.get(s.key) !== s.fallback) {
        clashes.push(`${s.key}: "${seen.get(s.key)}" vs "${s.fallback}"`);
      }
    }
    expect(clashes, 'one key cannot hold two different strings — ui_strings keeps only one')
      .toEqual([]);
  });

  it('registers every call site, with the same text the source shows', () => {
    const missing = [];
    const drifted = [];
    for (const s of sites) {
      if (!(s.key in section)) { missing.push(s.key); continue; }
      if (section[s.key] !== s.fallback) {
        drifted.push(`${s.key}\n      source : ${s.fallback}\n      shipped: ${section[s.key]}`);
      }
    }
    expect(missing, 'these keys ship their fallback and cannot be translated').toEqual([]);
    expect(drifted, 'ui_strings overrides the fallback, so these render text the source does not say')
      .toEqual([]);
  });

  it('keeps no key that no call site can reach', () => {
    const used = new Set(sites.map((s) => s.key));
    const suffixes = dynamicSuffixes();
    expect(suffixes.length, 'the dynamic-key scan found nothing — it would report live keys as dead')
      .toBeGreaterThan(0);
    const orphans = Object.keys(section).filter(
      (k) => !used.has(k) && !suffixes.some((sfx) => k.endsWith(sfx)),
    );
    expect(orphans, 'dead keys are still handed to every language pack to translate').toEqual([]);
  });

  it('keeps all four ui_strings copies in step', () => {
    for (const rel of UI_MIRRORS) {
      const mirror = findSection(JSON.parse(readFileSync(rel, 'utf8')), 'flightsim');
      expect(mirror, `${rel}: no flightsim section`).toBeTruthy();
      const missing = Object.keys(section).filter((k) => !(k in mirror));
      const extra = Object.keys(mirror).filter((k) => !(k in section));
      const differs = Object.keys(section).filter((k) => k in mirror && mirror[k] !== section[k]);
      expect(missing, `${rel} is behind the root copy`).toEqual([]);
      expect(extra, `${rel} holds keys the root copy dropped`).toEqual([]);
      expect(differs, `${rel} ships different text from the root copy`).toEqual([]);
    }
  });
});
