// Math review (2026-10-18): Time & Schedule Lab clock-reading challenge and
// elapsed-time rounding fixes. Each test drives the real render function: it
// finds a control in the element tree, fires its handler against a hub-like
// store, and re-renders. MATH_REVIEW_TIMESCHEDULE_SRC lets the mutation driver
// point it at variants.
import { beforeEach, describe, expect, it } from 'vitest';
import { React, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW_TIMESCHEDULE_SRC || 'stem_lab/stem_tool_timeschedule.js';

let tool;
beforeEach(() => {
  resetStemLab();
  tool = loadTool(FILE, 'timeSchedule');
});

function walk(node, pred, out = []) {
  if (node == null || typeof node === 'boolean') return out;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, pred, out)); return out; }
  if (typeof node !== 'object' || !node.props) return out;
  if (pred(node)) out.push(node);
  walk(node.props.children, pred, out);
  return out;
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(text).join('');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node.props ? text(node.props.children) : '';
}
const buttonWithText = (tree, s) => walk(tree, (n) => n.type === 'button' && text(n).includes(s))[0];
const byId = (tree, id) => walk(tree, (n) => n.props.id === id)[0];

function harness(seed) {
  const store = { toolData: { _timeSchedule: seed }, xp: [] };
  const ctx = {
    React,
    get toolData() { return store.toolData; },
    setToolData(fn) { store.toolData = typeof fn === 'function' ? fn(store.toolData) : fn; },
    t: (key, fallback) => fallback,
    icons: {},
    awardXP(id, amount, reason) { store.xp.push({ amount, reason }); },
    announceToSR() {}, setStemLabTool() {},
  };
  return { store, render: () => tool.render(ctx), ts: () => store.toolData._timeSchedule };
}
function clockTexts(tree) {
  return {
    caption: walk(tree, (n) => n.type === 'figcaption').map(text).join(' | '),
    title: walk(tree, (n) => n.type === 'title').map(text).join(' | '),
    desc: walk(tree, (n) => n.type === 'desc').map(text).join(' | '),
  };
}
function answerChallenge(h, value) {
  byId(h.render(), 'ts-challenge-answer').props.onChange({ target: { value } });
  buttonWithText(h.render(), 'Check answer').props.onClick();
}

describe('read-the-clock challenge', () => {
  it('does not print the time while the challenge is unsolved, but still describes the hands', () => {
    const h = harness({ tab: 'challenge', challengeId: 'read-clock-0735' });
    const shown = clockTexts(h.render());
    for (const part of [shown.caption, shown.title, shown.desc]) {
      expect(part).not.toContain('7:35');
      expect(part).not.toContain('35 minutes');
    }
    expect(shown.desc).toContain('Minute hand: pointing at the 7');
    expect(shown.desc).toContain('Hour hand: between the 7 and the 8');
    expect(shown.caption).toContain('pointing at the 7');

    const solved = clockTexts(harness({ tab: 'challenge', challengeId: 'read-clock-0735',
      solvedChallenges: { 'read-clock-0735': true } }).render());
    expect(solved.caption).toContain('7:35 AM');
    expect(solved.title).toContain('7:35 AM');

    // The Clock Link tab is a linked display, not a question: it keeps the time.
    const linked = clockTexts(harness({ tab: 'clock', clockMinutes: 505 }).render());
    expect(linked.caption).toContain('Analog clock showing 8:25 AM');
    expect(linked.title).toContain('8:25 AM');
  });

  it('accepts either half of the day for a clock face, and only there', () => {
    const P = window.TimeSchedulePure;
    expect(P.checkAnswer('7:35 pm', 'time', 455, undefined, true).ok).toBe(true);
    expect(P.checkAnswer('19:35', 'time', 455, undefined, true).ok).toBe(true);
    expect(P.checkAnswer('8:35 pm', 'time', 455, undefined, true).ok).toBe(false);
    expect(P.checkAnswer('7:35 pm', 'time', 455).ok).toBe(false); // existing callers unchanged
    expect(P.checkAnswer('95', 'duration', 95, undefined, true).ok).toBe(true);

    const h = harness({ tab: 'challenge', challengeId: 'read-clock-0735' });
    answerChallenge(h, '7:35 PM');
    expect(h.ts().challengeFeedback.ok).toBe(true);
    expect(h.ts().solvedChallenges['read-clock-0735']).toBe(true);

    // A word problem that names the half of the day stays exact.
    const workshop = harness({ tab: 'challenge', challengeId: 'elapsed-workshop-end' });
    answerChallenge(workshop, '11:15 PM');
    expect(workshop.ts().challengeFeedback.ok).toBe(false);
  });
});

describe('elapsed timeline with fractional minutes', () => {
  const endpoint = (tree) => text(walk(tree, (n) => n.props['data-elapsed-result'])[0]);

  it('stores a typed 2.5 minutes as a whole number of minutes', () => {
    const P = window.TimeSchedulePure;
    const h = harness({ tab: 'elapsed', elapsedStart: 495, elapsedDuration: 0, elapsedDirection: -1 });
    const minutes = walk(h.render(), (n) => n.type === 'input' && n.props.max === 59)[0];
    minutes.props.onChange({ target: { value: '2.5' } });
    expect(h.ts().elapsedDuration).toBe(3);
    const jumps = P.makeJumps(495, 3, -1);
    expect(endpoint(h.render())).toBe(P.time12(jumps[jumps.length - 1].to));
  });

  it('an old save holding 2.5 minutes shows the endpoint the jumps land on', () => {
    const P = window.TimeSchedulePure;
    const tree = harness({ tab: 'elapsed', elapsedStart: 495, elapsedDuration: 2.5, elapsedDirection: -1 }).render();
    const jumps = P.makeJumps(495, 2.5, -1);
    expect(P.time12(jumps[jumps.length - 1].to)).toBe('8:12 AM'); // 8:15 AM back 3 minutes
    expect(endpoint(tree)).toBe('8:12 AM');
    const minutes = walk(tree, (n) => n.type === 'input' && n.props.max === 59)[0];
    expect(minutes.props.value).toBe(3);
  });
});
