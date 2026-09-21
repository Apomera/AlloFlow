import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// questHooks come from TOOL PLUGINS — 119 files, >1000 check() functions, most
// dereferencing their argument directly. The hub called them raw from two
// places, one of which runs during render, so a single bad hook anywhere took
// the whole STEAM Lab down. These tests run the SHIPPED quest functions against
// hooks that misbehave in the ways plugin code actually misbehaves.

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

// Load the shipped quest machinery with a registry we control.
function loadQuests(questHooks, toolId = 'circuit') {
  const warnings = [];
  const src = source();
  const sandbox = {
    window: { StemLab: { _registry: { [toolId]: { questHooks } } } },
    Object, Array, Date, Math, JSON, String,
    console: { warn: (...a) => warnings.push(a.join(' ')) }
  };
  runInNewContext([
    'var _questHookWarned = {};',
    extractFunction(src, '_getToolQuestHooks'),
    extractFunction(src, '_safeQuestHookCall'),
    extractFunction(src, '_getToolQuestState'),
    extractFunction(src, '_getQuestDisplay'),
    extractFunction(src, '_evaluateQuests'),
    'this.display=_getQuestDisplay; this.evaluate=_evaluateQuests; this.hooks=_getToolQuestHooks;'
  ].join('\n'), sandbox);
  return { sandbox, warnings };
}

const THROWING = {
  id: 'h1',
  check: function (d) { return d.deeply.nested.thing > 1; },
  progress: function (d) { return d.deeply.nested.count + '/3'; }
};
const quest = (hookId = 'h1', qid = 'q1') => ({
  qid, type: 'toolQuest', toolId: 'circuit', params: { hookId }, label: 'Build it'
});

describe('a throwing questHook cannot take down the Lab', () => {
  it('_getQuestDisplay returns a renderable row instead of throwing', () => {
    const { sandbox } = loadQuests([THROWING]);
    // This path runs during RENDER — a throw here unmounts the React tree.
    let result;
    expect(() => { result = sandbox.display(quest(), { circuit: {} }, {}, 's1'); }).not.toThrow();
    expect(result.done).toBe(false);
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('_evaluateQuests survives and keeps going', () => {
    const { sandbox } = loadQuests([THROWING]);
    const station = { id: 's1', quests: [quest()] };
    expect(() => sandbox.evaluate(station, { circuit: {} }, {})).not.toThrow();
  });

  it('one bad hook does not block a GOOD quest after it', () => {
    const good = { id: 'h2', check: () => true, progress: () => 'ok' };
    const { sandbox } = loadQuests([THROWING, good]);
    const station = { id: 's1', quests: [quest('h1', 'q1'), quest('h2', 'q2')] };
    const out = sandbox.evaluate(station, { circuit: {} }, {});
    // The whole point: the working quest still completes.
    expect(out.s1.q2.complete).toBe(true);
    expect(out.s1.q1.complete).toBeFalsy();
  });

  it('logs once per hook rather than every render', () => {
    const { sandbox, warnings } = loadQuests([THROWING]);
    for (let i = 0; i < 25; i++) sandbox.display(quest(), { circuit: {} }, {}, 's1');
    const checkWarnings = warnings.filter((w) => w.includes('.check'));
    expect(checkWarnings).toHaveLength(1);
    expect(checkWarnings[0]).toMatch(/circuit\.h1\.check/);
  });

  it('a throwing hook reads as incomplete, never as complete', () => {
    const { sandbox } = loadQuests([THROWING]);
    const out = sandbox.evaluate({ id: 's1', quests: [quest()] }, { circuit: {} }, {});
    // Failing open would hand students credit they did not earn.
    const prog = (out.s1 || {}).q1;
    expect(prog && prog.complete).toBeFalsy();
  });
});

describe('a misbehaving questHook still renders', () => {
  it('survives progress() returning an object React cannot render', () => {
    const weird = { id: 'h1', check: () => false, progress: () => ({ nope: true }) };
    const { sandbox } = loadQuests([weird]);
    const out = sandbox.display(quest(), { circuit: {} }, {}, 's1');
    expect(typeof out.text).toBe('string');
    expect(out.text).not.toBe('[object Object]');
  });

  it('survives progress() returning undefined', () => {
    const weird = { id: 'h1', check: () => true, progress: () => undefined };
    const { sandbox } = loadQuests([weird]);
    const out = sandbox.display(quest(), { circuit: {} }, {}, 's1');
    expect(typeof out.text).toBe('string');
    expect(out.text.length).toBeGreaterThan(0);
  });

  it('survives a hook entry that is null', () => {
    const { sandbox } = loadQuests([null, { id: 'h1', check: () => true, progress: () => 'ok' }]);
    expect(() => sandbox.display(quest(), { circuit: {} }, {}, 's1')).not.toThrow();
  });

  it('survives questHooks being a non-array', () => {
    const { sandbox } = loadQuests('not an array');
    expect(sandbox.hooks('circuit')).toEqual([]);
    expect(() => sandbox.display(quest(), { circuit: {} }, {}, 's1')).not.toThrow();
  });

  it('a WORKING hook is unaffected by the guard', () => {
    const good = { id: 'h1', check: (d) => (d.components || []).length >= 3, progress: (d) => (d.components || []).length + '/3' };
    const { sandbox } = loadQuests([good]);
    const done = sandbox.display(quest(), { circuit: { components: [1, 2, 3] } }, {}, 's1');
    expect(done.done).toBe(true);
    expect(done.text).toBe('3/3');
    const notYet = sandbox.display(quest(), { circuit: { components: [1] } }, {}, 's1');
    expect(notYet.done).toBe(false);
    expect(notYet.text).toBe('1/3');
  });
});

describe('quest bonus XP is announced as credited', () => {
  it('routes the quest toast through awardStemXP', () => {
    const src = source();
    const at = src.indexOf('Quest complete: ');
    expect(at).toBeGreaterThanOrEqual(0);
    const region = src.slice(Math.max(0, at - 1400), at + 400);
    // The toast must be driven by the credited callback, not by totalBonus.
    expect(region).toContain('awardStemXP(\'questBonus\'');
    expect(region).toMatch(/credited > 0 \? ' \(\+' \+ credited \+ ' XP\)' : ''/);
  });

  it('awardStemXP accepts and fires an onCredited callback', () => {
    const fn = extractFunction(source(), 'awardStemXP');
    expect(fn).toMatch(/function awardStemXP\(activityId, points, reason, onCredited\)/);
    // Both exits must report: the early cap return AND the deferred path.
    const earlyReturn = fn.slice(0, fn.indexOf('var _creditedRef'));
    expect(earlyReturn).toContain('onCredited(0)');
    expect(fn).toContain('onCredited(pts)');
  });

  it('drops only the XP clause when the cap refuses, keeping the quest toast', () => {
    const src = source();
    const at = src.indexOf('Quest complete: ');
    const region = src.slice(Math.max(0, at - 1400), at + 400);
    // The completion is still announced with an empty xpPart, so a student
    // past the cap is still told the quest is done.
    expect(region).toContain("var xpPart = credited > 0");
    expect(region).toContain("'\\uD83C\\uDFC6 Quest complete: ' + _questLabel + xpPart");
  });

  it('suppresses the streak clause too when nothing was credited', () => {
    const src = source();
    const at = src.indexOf('Quest complete: ');
    const region = src.slice(Math.max(0, at - 1400), at + 400);
    expect(region).toMatch(/streakPart = credited > 0 \? streakText : ''/);
  });
});
