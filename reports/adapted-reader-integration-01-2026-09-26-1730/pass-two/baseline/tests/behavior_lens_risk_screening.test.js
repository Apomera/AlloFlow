// Behavior Lens Risk Screening: the level it shows, and when it shows it.
//
// WHY: until 2026-09-23 the level counted only "Yes" answers on the high items and
// appeared only once all ten items were answered:
//   - "Yes" to "expressed thoughts of harming themselves" alone read ELEVATED,
//     "Monitor closely... team check-in within the week". School suicide-prevention
//     policy (AFSP/ASCA/NASP/Trevor Project Model School District Policy on Suicide
//     Prevention) calls for a same-day risk assessment by a school mental-health
//     professional.
//   - "Unsure" was read as "No": "Unsure" about a specific plan could read LOW.
//   - a "Yes" on "communicated a specific plan" showed NO banner until every other
//     item was answered.
// The tool remains a reflection checklist, not a validated instrument; these tests
// pin that it never under-reads what the teacher entered.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let Risk;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  Risk = window.AlloModules && window.AlloModules.BehaviorLensRiskScreening;
  if (!Risk) throw new Error('BehaviorLensRiskScreening did not register');
});

const ALL = ['harm_self', 'harm_others', 'weapon', 'escalation', 'withdrawn', 'peer_conflict', 'home_change', 'substance', 'hopeless', 'plan'];
const allNo = (over = {}) => Object.assign(Object.fromEntries(ALL.map(id => [id, 'no'])), over);

describe('assess: the level follows the most serious answer', () => {
  it('covers every item the component asks', () => {
    expect(Risk.items.map(it => it.id).sort()).toEqual([...ALL].sort());
  });
  it('all "No" is LOW, and only then', () => {
    expect(Risk.assess(allNo())).toMatchObject({ level: 'low', complete: true, reasons: [] });
  });
  it('"Yes" to self-harm thoughts alone means act today (was ELEVATED)', () => {
    const r = Risk.assess(allNo({ harm_self: 'yes' }));
    expect(r.level).toBe('critical');
    expect(r.reasons).toEqual(['harm_self:yes']);
  });
  it('each safety "Yes" is critical on its own', () => {
    for (const id of ['plan', 'harm_self', 'harm_others', 'weapon']) expect(Risk.assess(allNo({ [id]: 'yes' })).level, id).toBe('critical');
  });
  it('"Unsure" about a plan is never LOW (was LOW)', () => {
    const r = Risk.assess(allNo({ plan: 'unsure' }));
    expect(r.level).toBe('high');
    expect(r.reasons).toEqual(['plan:unsure']);
  });
  it('hopelessness is a 24-hour consult, not a weekly check-in', () => {
    expect(Risk.assess(allNo({ hopeless: 'yes' })).level).toBe('high');
  });
  it('medium concerns and non-safety "Unsure" answers are ELEVATED (all five mediums used to read LOW)', () => {
    expect(Risk.assess(allNo({ escalation: 'yes', withdrawn: 'yes', peer_conflict: 'yes', home_change: 'yes', substance: 'yes' })).level).toBe('elevated');
    expect(Risk.assess(allNo({ substance: 'unsure' }))).toMatchObject({ level: 'elevated', unsure: ['substance'] });
  });
});

describe('assess: when a level is shown', () => {
  it('a safety "Yes" shows before the other items are answered', () => {
    expect(Risk.assess({ plan: 'yes' })).toMatchObject({ level: 'critical', complete: false, answered: 1 });
    expect(Risk.assess({ weapon: 'unsure' })).toMatchObject({ level: 'high', complete: false });
  });
  it('LOW and ELEVATED wait for every answer: blanks are not "No"', () => {
    expect(Risk.assess({ harm_self: 'no', plan: 'no' }).level).toBeNull();
    expect(Risk.assess({ escalation: 'yes' }).level).toBeNull();
  });
});

describe('the rendered checklist', () => {
  const mount = () => componentHarness('RiskScreening', { studentName: 'Kestrel', abcEntries: [], callGemini: null, t: () => undefined, addToast: () => {} },
    { RISK_SCREENING_ITEMS: Risk.items, assessRiskScreening: Risk.assess });
  const answer = (q, item, value) => {
    const group = q.byAttr('data-risk-item', item)[0];
    expect(group, item).toBeTruthy();
    const button = group.children.find(child => child.props['data-risk-answer'] === value);
    button.props.onClick();
    q.render();
  };

  it('shows the act-today banner as soon as a plan is reported, with its guidance', () => {
    const q = mount();
    expect(q.byAttr('data-risk-level', 'critical')).toHaveLength(0);
    answer(q, 'plan', 'yes');
    const banner = q.byAttr('data-risk-level', 'critical')[0];
    expect(banner, 'no banner after "Yes" on a specific plan').toBeTruthy();
    expect(banner.props.role).toBe('alert');
    expect(q.text(banner)).toMatch(/Do not leave the student alone/);
  });

  it('answer buttons are named by their visible text inside a group labelled by the question', () => {
    const q = mount();
    const group = q.byAttr('data-risk-item', 'harm_self')[0];
    expect(group.props.role).toBe('group');
    expect(group.props['aria-labelledby']).toBe('risk-q-harm_self');
    for (const b of group.children) {
      expect(b.props['aria-label'], 'a generic aria-label would hide the visible answer').toBeUndefined();
      expect(b.props['aria-pressed']).toBe('false');
    }
    answer(q, 'harm_self', 'unsure');
    const pressed = q.byAttr('data-risk-item', 'harm_self')[0].children.filter(b => b.props['aria-pressed'] === 'true');
    expect(pressed.map(b => b.props['data-risk-answer'])).toEqual(['unsure']);
  });
});
