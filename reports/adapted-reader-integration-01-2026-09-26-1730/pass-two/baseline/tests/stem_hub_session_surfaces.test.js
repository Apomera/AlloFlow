import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Four hub-level defects, each pinned by running the SHIPPED code rather than
// a restatement of it:
//   1. station saves had no try/catch, so a failed write lost the station
//      silently and left the builder open
//   2. the XP panel's inline cream gradient survived the dark remap while its
//      text did not, giving 1.29:1
//   3. Escape ignored every overlay and closed the whole Lab
//   4. the announced XP could exceed the credited XP near the cap

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

// ── 1. Station persistence ────────────────────────────────────────────────
describe('station saves report failure', () => {
  function loadPersist(failWrite) {
    const toasts = [], announced = [], warned = [];
    const sandbox = {
      localStorage: {
        store: {},
        setItem(k, v) {
          if (failWrite) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
          this.store[k] = v;
        }
      },
      addToast: (m) => toasts.push(m),
      announceToSR: (m) => announced.push(m),
      console: { warn: (...a) => warned.push(a.join(' ')) },
      JSON
    };
    runInNewContext(extractFunction(source(), '_persistStations') + '\nthis.persist=_persistStations;', sandbox);
    return { sandbox, toasts, announced, warned };
  }

  it('returns true and writes when storage works', () => {
    const { sandbox } = loadPersist(false);
    expect(sandbox.persist([{ id: 'a', name: 'A' }])).toBe(true);
    expect(sandbox.localStorage.store['alloflow_stem_stations']).toContain('"id":"a"');
  });

  it('returns false when the write throws', () => {
    const { sandbox } = loadPersist(true);
    expect(sandbox.persist([{ id: 'a', name: 'A' }])).toBe(false);
  });

  it('tells the user, on screen AND to a screen reader', () => {
    const { sandbox, toasts, announced } = loadPersist(true);
    sandbox.persist([{ id: 'a' }], 'Could not save "Rocks".');
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toBe('Could not save "Rocks".');
    // A silent failure is the actual bug; the announcement is not optional.
    expect(announced).toEqual(['Could not save "Rocks".']);
  });

  it('logs for the developer without throwing out of the click handler', () => {
    const { sandbox, warned } = loadPersist(true);
    expect(() => sandbox.persist([{ id: 'a' }])).not.toThrow();
    expect(warned.join(' ')).toMatch(/stations not saved/i);
  });

  it('has no unguarded station write left in the hub', () => {
    const src = source();
    const unguarded = src
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => line.includes("localStorage.setItem('alloflow_stem_stations'"));
    // Every remaining direct write must be inside _persistStations itself.
    expect(unguarded).toHaveLength(1);
  });

  it('only closes the builder after a successful write', () => {
    const src = source();
    const at = src.indexOf('Save STEM station');
    const handler = src.slice(at, at + 2200);
    const guard = handler.indexOf('if (!_persistStations(');
    const close = handler.indexOf('_setShowStationBuilder(false)');
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(close).toBeGreaterThan(guard);
    expect(handler.slice(guard, close)).toContain('return');
  });
});

// ── 2. XP panel contrast ──────────────────────────────────────────────────
describe('XP panel contrast in every theme', () => {
  const ch = (v) => { const n = v / 255; return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4); };
  const lum = (hex) => {
    const h = hex.replace('#', '');
    return 0.2126 * ch(parseInt(h.slice(0, 2), 16)) + 0.7152 * ch(parseInt(h.slice(2, 4), 16)) + 0.0722 * ch(parseInt(h.slice(4, 6), 16));
  };
  const ratio = (a, b) => { const x = Math.max(lum(a), lum(b)), y = Math.min(lum(a), lum(b)); return (x + 0.05) / (y + 0.05); };

  // Read the shipped background for each theme out of the render, so a change
  // to those colors re-runs the real WCAG maths instead of passing silently.
  function panelBackgrounds() {
    const src = source();
    const at = src.indexOf('React.createElement("div", { className: "p-4 max-w-4xl mx-auto"');
    expect(at, 'XP panel container moved').toBeGreaterThanOrEqual(0);
    const region = src.slice(at, at + 700);
    const hexes = region.match(/#[0-9a-fA-F]{6}/g) || [];
    return hexes;
  }

  it('no longer hardcodes only the cream gradient', () => {
    const region = source();
    const at = region.indexOf('React.createElement("div", { className: "p-4 max-w-4xl mx-auto"');
    const slice = region.slice(at, at + 700);
    expect(slice).toContain('isContrast');
    expect(slice).toContain('isDark');
  });

  it('every theme background clears 4.5:1 against its remapped text', () => {
    const backgrounds = panelBackgrounds();
    // The dark remap sends .text-amber-700/800 to #fcd34d, contrast to #facc15.
    const src = source();
    expect(src).toContain('.text-amber-800, [data-stem-lab] .text-amber-700');
    const failures = [];
    for (const bg of backgrounds) {
      const isLightBg = lum(bg) > 0.5;
      const text = isLightBg ? '#92400e' : (bg === '#000000' ? '#facc15' : '#fcd34d');
      const r = ratio(text, bg);
      if (r < 4.5) failures.push(bg + ' vs ' + text + ' = ' + r.toFixed(2) + ':1');
    }
    expect(failures).toEqual([]);
  });

  it('the cream gradient never pairs with the dark-remap yellow again', () => {
    // The exact defect: #fcd34d on #fef3c7 was 1.29:1.
    expect(ratio('#fcd34d', '#fef3c7')).toBeLessThan(4.5);
    const src = source();
    const at = src.indexOf('React.createElement("div", { className: "p-4 max-w-4xl mx-auto"');
    const slice = src.slice(at, at + 700);
    // Cream may still appear, but only on the light branch.
    if (slice.includes('#fef3c7')) {
      const creamAt = slice.indexOf('#fef3c7');
      const darkAt = slice.indexOf('isDark');
      expect(darkAt).toBeGreaterThanOrEqual(0);
      expect(creamAt).toBeGreaterThan(darkAt);
    }
  });
});

// ── 3. Escape layering ────────────────────────────────────────────────────
describe('Escape closes the innermost layer', () => {
  const escapeBlock = () => {
    const src = source();
    const at = src.indexOf("if (e.key === 'Escape') {");
    expect(at).toBeGreaterThanOrEqual(0);
    return src.slice(at, src.indexOf("if (e.key === 'Tab')", at));
  };

  it('checks every overlay before closing the lab', () => {
    const block = escapeBlock();
    for (const ref of ['_showControlsRef', '_showKeyHelpRef', '_showXpPanelRef', '_showStationBuilderRef']) {
      expect(block, ref + ' not consulted').toContain(ref + '.current');
    }
  });

  it('closes the lab only as the last resort', () => {
    const block = escapeBlock();
    const lab = block.indexOf('setShowStemLab(false)');
    for (const ref of ['_showControlsRef', '_showKeyHelpRef', '_showXpPanelRef', '_showStationBuilderRef']) {
      expect(block.indexOf(ref + '.current')).toBeLessThan(lab);
    }
    // The open tool is still closed before the lab itself.
    expect(block.indexOf('setStemLabTool(null)')).toBeLessThan(lab);
  });

  it('reads overlay state through refs, not a stale closure', () => {
    const src = source();
    // The listener is bound on these deps only; direct reads would go stale.
    expect(src).toContain('}, [stemLabTool, stemLabTab, _showKeyHelp]);');
    expect(src).toContain('_showStationBuilderRef.current = _showStationBuilder;');
  });

  it('confirms before discarding a filled-in station builder', () => {
    const block = escapeBlock();
    expect(block).toContain('_stationBuilderDirtyRef.current');
    expect(block).toMatch(/confirm\(/);
  });

  it('treats the default time estimate as NOT dirty on its own', () => {
    const src = source();
    const at = src.indexOf('_stationBuilderDirtyRef.current = !!(');
    const expr = src.slice(at, src.indexOf(');', at) + 2);
    // _stationTimeEst defaults to '20'; counting it would make every freshly
    // opened builder prompt on Escape.
    expect(expr).not.toContain('_stationTimeEst');
    expect(expr).toContain('_stationName');
    expect(expr).toContain('_stationTools');
  });

  it('the help panel no longer documents the old behaviour', () => {
    const src = source();
    expect(src).not.toContain('"Close tool / Close lab"');
  });
});

// ── 4. XP announced === XP credited ───────────────────────────────────────
describe('XP feedback reports what was actually credited', () => {
  it('records the credited amount inside the updater', () => {
    const src = source();
    const fn = extractFunction(src, 'awardStemXP');
    expect(fn).toContain('_creditedRef');
    // The announcement must not use the pre-computed snapshot value.
    const feedbackAt = fn.indexOf('addToast(');
    expect(feedbackAt).toBeGreaterThanOrEqual(0);
    const feedback = fn.slice(feedbackAt);
    expect(feedback).not.toContain('_awardedPts');
  });

  it('zeroes the record when the cap absorbs the award', () => {
    const fn = extractFunction(source(), 'awardStemXP');
    expect(fn).toMatch(/_creditedRef\.pts = 0;\s*return prev;/);
  });

  it('stays silent when nothing was credited', () => {
    const fn = extractFunction(source(), 'awardStemXP');
    expect(fn).toMatch(/if \(pts <= 0\) return;/);
  });

  it('drives the floating popup from the credited amount', () => {
    const fn = extractFunction(source(), 'awardStemXP');
    expect(fn).toContain('pts: pts,');
  });

  // Behavioural: run the SHIPPED updater twice against the same starting
  // state, the way React applies batched updates, and compare what it recorded
  // as credited against what it actually stored.
  function runUpdaterTwice(startEarned, points) {
    const fn = extractFunction(source(), 'awardStemXP');
    const body = fn.slice(fn.indexOf('setLabToolData('));
    const inner = body.slice(body.indexOf('function (prev)'));
    const expr = extractFunctionExpression(inner);

    let state = { _stemXP: { act: { earned: startEarned, log: [] }, _total: startEarned } };
    const announced = [];
    for (let i = 0; i < 2; i++) {
      const creditedRef = { pts: 0 };
      const updater = runInNewContext('(' + expr + ')', {
        Object, Date,
        activityId: 'act', points, reason: 'r',
        _creditedRef: creditedRef
      });
      state = updater(state);
      announced.push(creditedRef.pts);
    }
    return { announced, finalEarned: state._stemXP.act.earned, startEarned };
  }

  it('records exactly what each batched award credited', () => {
    // 80 + 15 + 15 against a cap of 100: the second award can only take 5.
    const { announced, finalEarned, startEarned } = runUpdaterTwice(80, 15);
    expect(finalEarned).toBe(100);
    expect(announced).toEqual([15, 5]);
    // The invariant that was broken: announced total === credited total.
    expect(announced.reduce((a, b) => a + b, 0)).toBe(finalEarned - startEarned);
  });

  it('records zero once the cap is already reached', () => {
    const { announced, finalEarned } = runUpdaterTwice(100, 15);
    expect(finalEarned).toBe(100);
    expect(announced).toEqual([0, 0]);
  });

  it('never credits past the cap', () => {
    for (const start of [0, 50, 90, 99, 100]) {
      const { finalEarned } = runUpdaterTwice(start, 40);
      expect(finalEarned).toBeLessThanOrEqual(100);
      expect(finalEarned).toBeGreaterThanOrEqual(start);
    }
  });
});

// Pull the leading `function (prev) { ... }` expression out of a slice.
function extractFunctionExpression(slice) {
  const openAt = slice.indexOf('{');
  return slice.slice(0, openAt) + extractBalanced(slice, openAt, '{', '}');
}
