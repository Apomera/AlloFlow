// Behavior Lens: escalation cycle, reinforcer ranks, reinforcement inventory, GAS
// rubric, student check-in streak and the instructional-time impact calculator.
//
// WHY: until 2026-09-23
// - the escalation cycle keyed its AI personalization by the TRANSLATED phase name
//   while the AI replied with English names, so outside English it never showed;
//   Reset and a second "Personalize" wiped edits without asking.
// - four reinforcers all rated 5 stars were numbered 1, 2, 3 and the fourth left out.
// - "10 favorites found" was the capped chip count (14 favorites); a custom item named
//   like a listed one shared its rating and was counted twice; ratings, the GAS goal,
//   check-ins and the impact inputs were lost when the panel closed.
// - "AI Generate" replaced GAS descriptors staff had typed; a reply keyed "+1" never showed.
// - the check-in streak compared midnights by elapsed ms (the 25-hour fall-back day
//   broke a real streak), and a streak that ended weeks ago still showed as current.
// - the impact calculator used 36 weeks x the days entered for time lost but 180 days
//   for cost per minute (a 4-day week understated cost by a fifth), turned $0 and 0 days
//   into $15,000 and 5 days, and never said it assumed a 6.5-hour day.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
});
const ns = name => window.AlloModules[name];
const flush = () => new Promise(r => setTimeout(r, 0));

describe('escalation cycle', () => {
  const reply = JSON.stringify({ Calm: { signs: 'Hums while working', response: 'Praise the humming quietly' }, Peak: { signs: 'Throws chair', response: 'Clear the room' }, Bogus: { signs: 'x' }, Triggers: 'not an object' });
  const entries = [{ antecedent: 'Math', behavior: 'Yelling', consequence: 'Break', intensity: null, timestamp: '2026-09-20T14:00:00Z' }, { antecedent: 'Math', behavior: 'Yelling', consequence: 'Break', intensity: 4, timestamp: '2026-09-21T14:00:00Z' }];
  const spanish = { 'behavior_lens.cycle_calm': 'Calma', 'behavior_lens.cycle_peak': 'Pico' };
  function mount({ durable = {}, confirm = true, callGemini } = {}) {
    const asked = []; const toasts = []; let sent = '';
    const q = componentHarness('EscalationCycle', { abcEntries: entries, aiAnalysis: null, studentName: 'Kestrel', callGemini: callGemini || (async p => { sent = p; return reply; }), t: () => undefined, addToast: (m, k) => toasts.push([m, k]) },
      { __durable: durable, DualLabel: () => null, tt: (key, en) => spanish[key] || en, askBehaviorLensConfirmation: async (msg, o) => { asked.push(o.title); return confirm; } });
    return { q, asked, toasts, sent: () => sent };
  }
  const personalize = async q => { await q.all(n => n.type === 'button' && /Personalize/.test(q.text(n)))[0].props.onClick(); await flush(); q.render(); };

  it('keeps only the seven phases, as text', () => {
    expect(ns('BehaviorLensEscalation').cleanEscalationReply(JSON.parse(reply))).toEqual({ Calm: { signs: 'Hums while working', response: 'Praise the humming quietly' }, Peak: { signs: 'Throws chair', response: 'Clear the room' } });
  });
  it('shows the personalization when the phase names are translated (it never did)', async () => {
    const { q, sent } = mount();
    await personalize(q);
    const text = q.text();
    expect(text).toContain('1. Calma');
    expect(text).toContain('Hums while working');
    expect(text).toContain('Throws chair');
    expect(sent()).toContain('Intensity=not rated');
    expect(sent()).toContain('Intensity=4/5');
    expect(sent()).not.toContain('null/5');
  });
  it('a second personalize asks before replacing, and a no stops it', async () => {
    let calls = 0;
    const { q, asked } = mount({ durable: { escalationCycle: { Calm: { signs: 'Typed by staff' } } }, confirm: false, callGemini: async () => { calls++; return reply; } });
    await personalize(q);
    expect(asked).toEqual(['Replace escalation cycle']);
    expect(calls).toBe(0);
    expect(q.text()).toContain('Typed by staff');
  });
  it('Reset asks first', async () => {
    const { q, asked } = mount({ durable: { escalationCycle: { Calm: { signs: 'Typed by staff' } } }, confirm: false });
    await q.all(n => n.props['aria-label'] === 'Reset escalation cycle')[0].props.onClick(); q.render();
    expect(asked).toEqual(['Reset escalation cycle']);
    expect(q.text()).toContain('Typed by staff');
  });
  it('a reply with no phases is an error, not an empty cycle', async () => {
    const { q, toasts } = mount({ callGemini: async () => '{}' });
    await personalize(q);
    expect(toasts.pop()).toEqual(['Personalization failed', 'error']);
  });
});

describe('reinforcer ranks share ties', () => {
  it('four items at 5 stars are all rank 1 and all shown', () => {
    const { rankWithTies, topRanked } = ns('BehaviorLensReinforcers');
    const r = { Legos: 5, Music: 5, Drawing: 5, Tablet: 5, Snack: 3 };
    expect(rankWithTies(r).map(x => x.rank)).toEqual([1, 1, 1, 1, 5]);
    expect(topRanked(r, 3).map(x => x.item).sort()).toEqual(['Drawing', 'Legos', 'Music', 'Tablet']);
  });
  it('5, 4, 4, 2 ranks 1, 2, 2, 4', () => {
    const { rankWithTies, topRanked } = ns('BehaviorLensReinforcers');
    expect(rankWithTies({ a: 5, b: 4, c: 4, d: 2, e: 0 }).map(x => [x.item, x.rank])).toEqual([['a', 1], ['b', 2], ['c', 2], ['d', 4]]);
    expect(topRanked({ a: 5, b: 4, c: 4, d: 2 }, 3).map(x => x.item)).toEqual(['a', 'b', 'c']);
  });
  it('the assessment shows the shared ranks', () => {
    const q = componentHarness('ReinforcerAssessment', { studentName: 'Kestrel', studentKey: 'k', aiAnalysis: null, callGemini: null, t: () => undefined, addToast: () => {} },
      { __durable: { reinforcerRatings: { Legos: 5, Music: 5, Drawing: 5, Tablet: 5, Snack: 3 } }, DualLabel: text => text });
    expect(q.all(n => n.props['data-reinforcer-rank'] !== undefined).map(n => n.props['data-reinforcer-rank'])).toEqual([1, 1, 1, 1]);
    expect(q.all(n => n.props['data-pref-rank'] !== undefined).map(n => n.props['data-pref-rank'])).toEqual([1, 1, 1, 1, 5]);
  });
});

describe('reinforcement inventory', () => {
  function mount(durable) {
    const toasts = [];
    const q = componentHarness('ReinforcementInventory', { studentName: 'Kestrel', t: () => undefined, addToast: (m, k) => toasts.push([m, k]) }, { __durable: durable, DualLabel: text => text });
    return { q, toasts };
  }
  it('counts every favorite, not the 10 chips', () => {
    const responses = {}; for (let i = 0; i < 14; i++) responses['Item ' + i] = 2 + (i % 2);
    responses['Meh'] = 1;
    const { q } = mount({ reinforcementInventoryResponses: responses });
    expect(q.all(n => n.props['data-favorites'] !== undefined)[0].props['data-favorites']).toBe(14);
    expect(q.text()).toContain('14 favorites found');
  });
  it('refuses a custom item already on the list, in any case', () => {
    const { q, toasts } = mount({ reinforcementInventoryCustom: ['Slime'] });
    const input = () => q.all(n => n.props['aria-label'] === 'Add a custom reinforcer')[0];
    const add = () => q.all(n => n.props['aria-label'] === 'Add custom reinforcer')[0].props.onClick();
    const listed = () => q.all(n => typeof n.props['aria-label'] === 'string' && /: Love$/.test(n.props['aria-label'])).length;
    const before = listed();
    input().props.onChange({ target: { value: ' slime ' } }); q.render(); add(); q.render();
    expect(toasts.pop()).toEqual(['slime is already on the list.', 'warning']);
    expect(listed()).toBe(before);
    input().props.onChange({ target: { value: 'Kinetic sand' } }); q.render(); add(); q.render();
    expect(listed()).toBe(before + 1);
    expect(toasts).toEqual([]);
  });
});

describe('GAS rubric', () => {
  it('reads "+1" keys and drops what is not a level', () => {
    expect(ns('BehaviorLensGas').cleanGasReply({ '+1': ' Stays 20 min ', '-2': 'Leaves seat', '3': 'x', '0': {}, ' +2 ': 'Stays all period' })).toEqual({ '1': 'Stays 20 min', '-2': 'Leaves seat', '2': 'Stays all period' });
  });
  function mount(durable, confirm, reply) {
    const asked = []; let calls = 0;
    const q = componentHarness('GasRubric', { studentName: 'Kestrel', abcEntries: [], aiAnalysis: null, callGemini: async () => { calls++; return reply; }, t: () => undefined, addToast: () => {} },
      { __durable: durable, askBehaviorLensConfirmation: async (m, o) => { asked.push(o.title); return confirm; } });
    return { q, asked, calls: () => calls };
  }
  const level = (q, s) => q.all(n => typeof n.props['aria-label'] === 'string' && n.props['aria-label'].startsWith('Descriptor for ' + s + ','))[0].props.value;
  it('asks before replacing typed descriptors', async () => {
    const { q, asked, calls } = mount({ gasGoalText: 'Stay in seat', gasDescriptors: { '0': 'Typed by staff' } }, false, '{"0":"AI"}');
    await q.button('AI Generate GAS Descriptors').props.onClick(); q.render();
    expect(asked).toEqual(['Replace GAS descriptors']);
    expect(calls()).toBe(0);
    expect(level(q, '0')).toBe('Typed by staff');
  });
  it('a "+2" reply fills the +2 row', async () => {
    const { q, asked } = mount({ gasGoalText: 'Stay in seat' }, true, '{"+2":"Stays all period","0":"Stays 15 min"}');
    await q.button('AI Generate GAS Descriptors').props.onClick(); q.render();
    expect(asked).toEqual([]);
    expect(level(q, '+2')).toBe('Stays all period');
    expect(level(q, '0')).toBe('Stays 15 min');
  });
});

describe('check-in streak', () => {
  const at = (y, m, d, hh = 12) => ({ timestamp: new Date(y, m - 1, d, hh).toISOString() });
  it('counts calendar days across the autumn clock change', () => {
    const { checkinStreak } = ns('BehaviorLensGamification');
    // 1 Nov 2026 is 25 hours long where clocks fall back (US Eastern on this machine).
    const c = [at(2026, 11, 2), at(2026, 11, 1), at(2026, 10, 31), at(2026, 10, 30)];
    expect(checkinStreak(c, new Date(2026, 10, 2, 18))).toBe(4);
  });
  it('several check-ins on one day count once; a gap ends the run', () => {
    const { checkinStreak } = ns('BehaviorLensGamification');
    expect(checkinStreak([at(2026, 9, 23, 9), at(2026, 9, 23, 15), at(2026, 9, 22), at(2026, 9, 20)], new Date(2026, 8, 23, 20))).toBe(2);
  });
  it('is current only through yesterday', () => {
    const { checkinStreak } = ns('BehaviorLensGamification');
    const c = [at(2026, 9, 22), at(2026, 9, 21), at(2026, 9, 20)];
    expect(checkinStreak(c, new Date(2026, 8, 23, 8))).toBe(3);
    expect(checkinStreak(c, new Date(2026, 8, 24, 8))).toBe(0);
  });
  it('a badge earned on an old streak stays', () => {
    const { longestCheckinStreak } = ns('BehaviorLensGamification');
    const c = [at(2026, 8, 3), at(2026, 8, 2), at(2026, 8, 1), at(2026, 7, 20)];
    expect(longestCheckinStreak(c)).toBe(3);
    const q = componentHarness('StudentGamification', { abcEntries: [], t: () => undefined }, { __durable: { gamificationCheckins: c }, DualLabel: text => text });
    // The badge element and the quest row, not the words: "3-Day Streak" is also in the quest title.
    expect(q.all(n => n.props.key === 'streak3')).toHaveLength(1);
    expect(q.all(n => n.props.key === 'streak7')).toHaveLength(0);
    expect(q.all(n => n.props.key === 'q2')[0].props.className).toContain('bg-green-50');
    expect(q.text()).toContain('0🔥');
  });
});

describe('impact calculator', () => {
  it('prices a minute over the same school year it counts', () => {
    const { instructionalImpact } = ns('BehaviorLensImpact');
    const four = instructionalImpact('3', '5', '4', '15000');
    expect(four.lostPerYear).toBe(2160);                       // 15 min x 4 days x 36 weeks
    expect(four.shareOfYear).toBeCloseTo(2160 / 56160, 10);    // 36 x 4 x 6.5 h x 60
    expect(four.annualCost).toBeCloseTo(576.92, 2);            // was 461.54 (divided by 180 days)
    // The share of the year, and so the cost, does not depend on the days per week.
    expect(instructionalImpact('3', '5', '5', '15000').annualCost).toBeCloseTo(576.92, 2);
  });
  it('zero means zero', () => {
    const { instructionalImpact } = ns('BehaviorLensImpact');
    expect(instructionalImpact('3', '5', '5', '0').annualCost).toBe(0);
    const none = instructionalImpact('3', '5', '0', '15000');
    expect([none.days, none.lostPerYear, none.annualCost]).toEqual([0, 0, 0]);
    expect(instructionalImpact('3', '5', '', '15000').days).toBe(5);
  });
  it('shows whole dollars and the assumptions', () => {
    const q = componentHarness('ImpactCalculator', { abcEntries: [], studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} },
      { __durable: { impactFrequency: '3', impactDuration: '5', impactSchoolDays: '4', impactCostPerPupil: '15000' } });
    expect(q.all(n => n.props['data-impact-cost'] !== undefined)[0].props['data-impact-cost']).toBe(577);
    expect(q.text()).toContain('$577');
    expect(q.text()).toContain('3.8% of the school year. Assumes 36 weeks of 4 school days and a 6.5-hour instructional day');
  });
});
