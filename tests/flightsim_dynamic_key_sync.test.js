import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Dynamically-composed keys must not drift from the source they came from.
 *
 * Most strings are looked up with a literal key, so the ui_strings consistency
 * test can pair them with their call site. A few are COMPOSED instead:
 *
 *   __alloT('stem.flightsim.' + ch.id + '_desc', ch.desc)          // CHALLENGES
 *   __alloT('stem.flightsim.' + route.id + '_desc', route.desc)    // SPRINT_ROUTES
 *   __alloT('stem.flightsim.' + selectedLesson + '_content', ...)  // LESSONS
 *
 * A literal scan cannot see those, so the sync tooling protects them from
 * deletion — and therefore never updates their values either. Since ui_strings
 * OVERRIDES the fallback, editing the source object silently changes nothing
 * that ships. Two real cases found this way:
 *
 *   - "Capitals only — can you get all 20?" survived a source correction,
 *     because only ui_strings is rendered;
 *   - europe_desc shipped "in 90 seconds!" long after the timer became
 *     (places.length - 1) * 20, i.e. 140 s for that route. The number was not
 *     merely unreviewed, it was wrong.
 *
 * Aircraft and achievement `desc` fields are NOT included: they render raw
 * (no __alloT), so they have no key by design. An earlier version of this check
 * reported all 23 of them as "missing", which was a false positive.
 */
const SRC = 'stem_lab/stem_tool_flightsim.js';
const UI = 'ui_strings.js';

const findSection = (o, n) => {
  if (!o || typeof o !== 'object') return null;
  if (o[n] && typeof o[n] === 'object') return o[n];
  for (const k of Object.keys(o)) { const r = findSection(o[k], n); if (r) return r; }
  return null;
};

const src = readFileSync(SRC, 'utf8');
const section = findSection(JSON.parse(readFileSync(UI, 'utf8')), 'flightsim');

const arrayBlock = (name) => {
  const start = src.indexOf(`var ${name} = [`);
  if (start < 0) return '';
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (!depth) return src.slice(start, i + 1); }
  }
  return '';
};

// [array, field, key suffix] — every family whose key is composed at the call
// site. Aircraft desc uses _acdesc to avoid colliding with the CHALLENGES and
// ACHIEVEMENTS _desc families, which share the same id namespace.
const FAMILIES = [
  ['CHALLENGES', 'name', '_name'],
  ['CHALLENGES', 'desc', '_desc'],
  ['SPRINT_ROUTES', 'name', '_name'],
  ['SPRINT_ROUTES', 'desc', '_desc'],
  ['AIRCRAFT', 'desc', '_acdesc'],
  ['ACHIEVEMENTS', 'name', '_name'],
  ['ACHIEVEMENTS', 'desc', '_desc'],
];

const dynamicPairs = () => {
  const pairs = [];
  for (const [name, field, suffix] of FAMILIES) {
    const block = arrayBlock(name);
    const re = new RegExp(`\\{\\s*id:\\s*'([A-Za-z0-9_]+)'[\\s\\S]*?${field}:\\s*('(?:[^'\\\\]|\\\\.)*')`, 'g');
    let m;
    while ((m = re.exec(block))) {
      // eslint-disable-next-line no-eval
      let v; try { v = eval(m[2]); } catch (e) { continue; }
      pairs.push({ key: `${m[1]}${suffix}`, source: v, from: `${name}.${field}` });
    }
  }
  // Every lesson entry opens with `short:`, not `title:` — an earlier version of
  // this regex required `title:` immediately after the brace and so paired ZERO
  // lessons while the suite stayed green. Anchor on the key, then take `content:`
  // wherever it falls in the entry.
  const lre = /^\s{4}([a-z_]+):\s*\{[\s\S]*?content:\s*("(?:[^"\\]|\\.)*")/gm;
  let m;
  while ((m = lre.exec(src))) {
    // eslint-disable-next-line no-eval
    let v; try { v = eval(m[2]); } catch (e) { continue; }
    pairs.push({ key: `${m[1]}_content`, source: v, from: 'LESSONS' });
  }
  return pairs;
};

describe('flightsim dynamic key sync', () => {
  const pairs = dynamicPairs();

  // A total-only count hides a single family going blind: the seven array
  // families alone clear any round number, so the lesson regex could pair zero
  // and the check would still pass. Assert per family instead.
  const EXPECTED = {
    'CHALLENGES.name': 8,
    'CHALLENGES.desc': 8,
    'SPRINT_ROUTES.name': 6,
    'SPRINT_ROUTES.desc': 6,
    'AIRCRAFT.desc': 7,
    'ACHIEVEMENTS.name': 16,
    'ACHIEVEMENTS.desc': 16,
    LESSONS: 6,
  };

  it('pairs every family (a family that pairs nothing is checked vacuously)', () => {
    const counted = {};
    for (const p of pairs) counted[p.from] = (counted[p.from] || 0) + 1;
    const short = Object.entries(EXPECTED)
      .filter(([k, n]) => (counted[k] || 0) < n)
      .map(([k, n]) => `${k}: paired ${counted[k] || 0}, expected at least ${n}`);
    expect(short, 'the source shape changed and these are no longer being checked')
      .toEqual([]);
  });

  it('ships exactly what the source says for every composed key', () => {
    const drift = pairs
      .filter((p) => p.key in section && section[p.key] !== p.source)
      .map((p) => `${p.key}\n      source : ${p.source}\n      shipped: ${section[p.key]}`);
    expect(drift, 'ui_strings overrides the fallback, so these render text the source does not say')
      .toEqual([]);
  });

  it('registers every composed key', () => {
    const missing = pairs.filter((p) => !(p.key in section)).map((p) => `${p.key} (${p.from})`);
    expect(missing, 'these fall back to English and cannot be translated').toEqual([]);
  });
});
