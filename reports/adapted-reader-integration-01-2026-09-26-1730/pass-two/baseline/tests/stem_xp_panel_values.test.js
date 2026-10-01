import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// ctx.awardXP is exposed to every tool plugin. A plugin computing points from
// a division, a parse or a missing field hands over NaN, and Math.min(NaN, n)
// is NaN, so `earned += NaN` poisoned that activity PERMANENTLY -- no later
// award could repair it, because every sum with NaN is NaN.
//
// `typeof x === 'number'` is true for NaN and Infinity, so the XP panel's
// discovery loop admitted both. The tile then rendered the label
// "NaN / 100 XP" with style width:"NaN%" (an invalid declaration browsers
// drop) or "Infinity / 100 XP" shown as maxed.

const HUB = 'stem_lab/stem_lab_module.js';
const source = () => readFileSync(HUB, 'utf8');

function extractBalanced(src, openAt, openChar, closeChar) {
  let depth = 0, quote = null, lineComment = false, blockComment = false;
  for (let i = openAt; i < src.length; i++) {
    const char = src[i], next = src[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) { if (char === '\\') { i++; continue; } if (char === quote) quote = null; continue; }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === openChar) depth++;
    if (char === closeChar) { depth--; if (depth === 0) return src.slice(openAt, i + 1); }
  }
  throw new Error('Could not find balanced ' + openChar + closeChar);
}

function extractFunction(src, name) {
  const declaration = new RegExp('function ' + name + '\\s*\\(').exec(src);
  expect(declaration, 'hub no longer declares ' + name).not.toBeNull();
  const openAt = src.indexOf('{', declaration.index);
  return src.slice(declaration.index, openAt) + extractBalanced(src, openAt, '{', '}');
}

// The shipped getStemXP plus the shipped discovery loop.
function buildPanel(stemXpData) {
  const src = source();
  const sandbox = { stemXpData, Object, String, Math, isFinite, Number };
  runInNewContext([
    extractFunction(src, 'getStemXP'),
    'var _xpActivities = [];',
    'Object.keys(stemXpData).forEach(function(key) {',
    "  if (key === '_total') return;",
    '  if (!stemXpData[key]) return;',
    '  if (getStemXP(key) <= 0) return;',
    '  _xpActivities.push(key);',
    '});',
    'this.acts = _xpActivities; this.getXP = getStemXP;'
  ].join('\n'), sandbox);
  return sandbox;
}

const HOSTILE = {
  _total: 50,
  good: { earned: 40 },
  nullEntry: null,
  stringEntry: 'ready',
  numberEntry: 7,
  arrayEntry: [1, 2],
  negative: { earned: -20 },
  nan: { earned: NaN },
  infinite: { earned: Infinity },
  huge: { earned: 999999 },
  noEarned: { log: [] },
  fractional: { earned: 12.7 },
  numericString: { earned: '55' }
};

describe('stored XP is normalised before it is shown', () => {
  it('never yields a value outside 0-100', () => {
    const p = buildPanel(HOSTILE);
    for (const key of Object.keys(HOSTILE)) {
      if (key === '_total') continue;
      const xp = p.getXP(key);
      expect(Number.isFinite(xp), key).toBe(true);
      expect(xp, key).toBeGreaterThanOrEqual(0);
      expect(xp, key).toBeLessThanOrEqual(100);
    }
  });

  it('treats a stored NaN as zero', () => {
    // The permanent-poisoning case.
    expect(buildPanel(HOSTILE).getXP('nan')).toBe(0);
  });

  it('treats a stored Infinity as zero rather than maxed', () => {
    expect(buildPanel(HOSTILE).getXP('infinite')).toBe(0);
  });

  it('clamps a huge stored value to the cap', () => {
    expect(buildPanel(HOSTILE).getXP('huge')).toBe(100);
  });

  it('floors a fractional value', () => {
    expect(buildPanel(HOSTILE).getXP('fractional')).toBe(12);
  });

  it('reports zero for a negative value instead of a negative bar width', () => {
    // width:"-20%" was reaching the DOM.
    expect(buildPanel(HOSTILE).getXP('negative')).toBe(0);
  });

  it('leaves an ordinary value alone', () => {
    expect(buildPanel(HOSTILE).getXP('good')).toBe(40);
  });
});

describe('the activity list only shows real progress', () => {
  it('omits NaN and Infinity entries', () => {
    const { acts } = buildPanel(HOSTILE);
    expect(acts).not.toContain('nan');
    expect(acts).not.toContain('infinite');
  });

  it('omits entries with no usable earned value', () => {
    const { acts } = buildPanel(HOSTILE);
    for (const key of ['nullEntry', 'stringEntry', 'numberEntry', 'arrayEntry', 'noEarned', 'negative']) {
      expect(acts, key).not.toContain(key);
    }
  });

  it('keeps entries that do have progress', () => {
    const { acts } = buildPanel(HOSTILE);
    expect(acts).toContain('good');
    expect(acts).toContain('huge');
  });

  it('no longer guards with a bare typeof number', () => {
    // typeof NaN === 'number' is what admitted the bad rows.
    const src = source();
    expect(src).not.toContain("typeof stemXpData[key].earned !== 'number' || stemXpData[key].earned <= 0");
  });

  it('shows nothing when no activity has progress', () => {
    const { acts } = buildPanel({ _total: 0, a: { earned: NaN }, b: null });
    expect(acts).toEqual([]);
  });
});

describe('awardStemXP rejects unusable points', () => {
  const guard = () => {
    const src = source();
    const at = src.indexOf('var _points = Math.floor(Number(points));');
    expect(at, 'awardStemXP input guard is gone').toBeGreaterThanOrEqual(0);
    return src.slice(at, at + 300);
  };

  it('normalises before any arithmetic', () => {
    const src = source();
    const guardAt = src.indexOf('var _points = Math.floor(Number(points));');
    const useAt = src.indexOf('var _awardedPts = Math.min(points,');
    // The guard must run BEFORE the value is used, or NaN still propagates.
    expect(guardAt).toBeLessThan(useAt);
  });

  it('rejects non-finite and non-positive points', () => {
    expect(guard()).toContain('!isFinite(_points)');
    expect(guard()).toContain('_points <= 0');
  });

  it('still tells a caller that nothing was credited', () => {
    // Callers that word their own message must hear the zero.
    expect(guard()).toContain('onCredited(0)');
  });
});

describe('the total XP bar says what it measures', () => {
  it('states the 1000 XP target it fills against', () => {
    const src = source();
    expect(src).toContain("totalStemXP + ' / 1000 Total XP'");
  });

  it('marks the milestone once passed', () => {
    const src = source();
    expect(src).toContain('1000 reached');
  });

  it('exposes the bar to assistive tech with the same scale', () => {
    const src = source();
    const at = src.indexOf("'aria-label': 'Total STEAM Lab XP'");
    expect(at, 'total XP bar has no accessible role').toBeGreaterThanOrEqual(0);
    const region = src.slice(at - 400, at + 60);
    expect(region).toContain("role: 'progressbar'");
    expect(region).toContain("'aria-valuemax': 1000");
    // valuenow must not exceed valuemax.
    expect(region).toContain("'aria-valuenow': Math.min(1000, totalStemXP)");
  });

  it('normalises the stored total too', () => {
    const src = source();
    const at = src.indexOf('var totalStemXP = (function ()');
    expect(at, 'totalStemXP is no longer normalised').toBeGreaterThanOrEqual(0);
    const region = src.slice(at, at + 220);
    expect(region).toContain('isFinite(n)');
  });
});
