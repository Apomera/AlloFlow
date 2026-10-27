// ctx.awardXP is awardStemXP(activityId, points, reason, onCredited). At least a dozen tools were written for
// an older bridge and call awardXP(points[, reason[, activityId]]); every one of those awards was read as
// "activity 10, points undefined" and credited nothing, with no error. The host now reads the legacy order.
// These tests run the SHIPPED function, extracted from the source, against stub host state.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const SOURCE = readFileSync('stem_lab/stem_lab_module.js', 'utf8');

function extract(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('missing ' + name);
  let depth = 0, i = src.indexOf('{', start);
  for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}' && --depth === 0) break; }
  return src.slice(start, i + 1);
}

// Build awardStemXP over a fake store and run its timers synchronously.
function host(toolId, startXp) {
  const store = { labToolData: { _stemXP: startXp || {} } };
  const toasts = [], announced = [], credited = [];
  const ctx = {
    Object, Date, Math, isFinite, Number,
    stemLabTool: toolId,
    stemXpData: store.labToolData._stemXP,
    getStemXP: id => { const v = store.labToolData._stemXP[id]; return v && Number.isFinite(v.earned) ? v.earned : 0; },
    setLabToolData: fn => { store.labToolData = fn(store.labToolData); },
    setTimeout: fn => fn(),
    addToast: m => toasts.push(m), announceToSR: m => announced.push(m), stemBeep: () => {},
    t: () => '* ', _reduceMotion: true,
    _stemXpPopupCounter: { current: 0 }, _stemXpPopups: { current: [] }, _setXpPopupTick: () => {}, _setXpBadgePulse: () => {}
  };
  const award = runInNewContext('(function(){ ' + extract(SOURCE, 'normalizeStemXpCall') + '\n' + extract(SOURCE, 'awardStemXP') + '\n return awardStemXP; })()', ctx);
  return { award, store, toasts, announced, credited, xp: id => (store.labToolData._stemXP[id] || {}).earned || 0 };
}

describe('legacy awardXP(points, reason) calls now credit the open tool', () => {
  it('awardXP(points) credits the points under the current tool id', () => {
    const h = host('bridgeLab');
    h.award(15);
    expect(h.xp('bridgeLab')).toBe(15);
    expect(h.xp('15')).toBe(0);
  });

  it('awardXP(points, reason) keeps the reason in the log and the toast', () => {
    const h = host('bakingScience');
    h.award(10, 'Mixed a leavening reaction');
    expect(h.xp('bakingScience')).toBe(10);
    expect(h.store.labToolData._stemXP.bakingScience.log[0].reason).toBe('Mixed a leavening reaction');
    expect(h.toasts[0]).toContain('Mixed a leavening reaction');
  });

  it('awardXP(points, reason, activityId) uses the id the tool asked for', () => {
    const h = host('optics');
    h.award(10, 'OpticsLab — TIR triggered', 'opticsLab');
    expect(h.xp('opticsLab')).toBe(10);
    expect(h.xp('optics')).toBe(0);
  });

  it('leaves the documented (activityId, points, reason) order exactly as it was', () => {
    const h = host('astronomy');
    h.award('astronomyQuiz', 30, 'Night Sky quiz');
    expect(h.xp('astronomyQuiz')).toBe(30);
    const n = host('astronomy');
    n.award('kitchenLab', 5, 'x');
    expect(n.xp('kitchenLab')).toBe(5);
  });

  it('still refuses junk and still honours the 100 XP cap', () => {
    const h = host('rocks');
    h.award(NaN); h.award(0); h.award(-5); h.award('rocks', 'lots');
    expect(h.store.labToolData._stemXP.rocks).toBeUndefined();
    const c = host('rocks', { rocks: { earned: 95, log: [] } });
    c.award(20, 'Quiz answer correct!');
    expect(c.xp('rocks')).toBe(100);
    expect(c.toasts[0]).toContain('5');
  });

  it('falls back to a generic id when no tool is open', () => {
    const h = host(null);
    h.award(4);
    expect(h.xp('stemActivity')).toBe(4);
  });
});

describe('every legacy-shaped call site in the tools is one the host now understands', () => {
  // A call whose first argument is a number literal or arithmetic on one (awardXP(3), awardXP(c * 5),
  // awardStemXP(10, 'why')) is legacy. Its points must survive normalisation as a finite number.
  const { normalize } = runInNewContext('(function(){ ' + extract(SOURCE, 'normalizeStemXpCall') + '\n return { normalize: normalizeStemXpCall }; })()', { isFinite });
  const files = readdirSync('stem_lab').filter(f => /^stem_tool_.+\.js$/.test(f));
  const sites = [];
  for (const f of files) {
    const s = readFileSync('stem_lab/' + f, 'utf8');
    const bind = /(?:var|let|const)\s+(\w+)\s*=\s*ctx\.awardXP\b/.exec(s);
    if (!bind) continue;
    const re = new RegExp('(?<![\\w.$])' + bind[1] + '\\(\\s*(\\d+(?:\\.\\d+)?)\\s*(?:,\\s*(\'[^\']*\'|"[^"]*"))?', 'g');
    let m;
    while ((m = re.exec(s))) sites.push({ f, points: Number(m[1]), reason: m[2] ? m[2].slice(1, -1) : undefined });
  }

  it('finds the legacy call sites (so this check is not vacuous)', () => {
    expect(sites.length).toBeGreaterThan(30);
    expect(new Set(sites.map(x => x.f)).size).toBeGreaterThan(5);
  });

  it('turns each into a credit of the same points under a string id', () => {
    for (const site of sites) {
      const call = normalize(site.points, site.reason, undefined, 'someTool');
      expect(typeof call.activityId, site.f).toBe('string');
      expect(call.points, site.f).toBe(site.points);
    }
  });
});
