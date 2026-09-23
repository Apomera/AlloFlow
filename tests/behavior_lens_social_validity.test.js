// Behavior Lens Social Validity scoring.
//
// WHY: until 2026-09-23 every measure was scored 0..k-1 against one home-grown rule
// (>= 70% of maximum "Acceptable", >= 50% "Marginally Acceptable"), and the IRP-15 was
// presented on a 7-point scale with a Neutral point. The published IRP-15 (Martens,
// Witt, Elliott & Darveaux, 1985) is a 6-point scale, totals 15-90, and a total above
// 52.5 is read as acceptable. All-"Slightly Agree" is 15 x 4 = 60: acceptable, which
// the old scoring called "Marginally Acceptable". The adapted TARF and custom surveys
// have no published cutoff, so none is claimed. Rating buttons were all named
// "Toggle responses". Expected values are worked by hand.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let SV;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  SV = window.AlloModules.BehaviorLensSocialValidity;
  if (!SV) throw new Error('BehaviorLensSocialValidity did not register');
});

const IRP = { name: 'IRP-15', shortName: 'IRP-15', items: Array.from({ length: 15 }, (_, i) => 'item ' + i), scale: ['SD', 'D', 'SlD', 'SlA', 'A', 'SA'], reverseItems: [], cutoffTotal: 52.5 };
const all = (n, index) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, index]));

describe('scoreSocialValidity', () => {
  it('IRP-15, all "Slightly Agree": 60 of 90, above 52.5, acceptable (old: "Marginally Acceptable")', () => {
    expect(SV.scoreSocialValidity(IRP, all(15, 3))).toMatchObject({ total: 60, mean: 4, interpretation: 'Acceptable by the published criterion' });
  });
  it('IRP-15, all "Slightly Disagree": 45, below the criterion', () => {
    expect(SV.scoreSocialValidity(IRP, all(15, 2)).interpretation).toBe('Below the published acceptability criterion');
  });
  it('the criterion needs all 15 items', () => {
    expect(SV.scoreSocialValidity(IRP, all(14, 5)).interpretation).toMatch(/^Incomplete/);
  });
  it('reverse items score k + 1 - s, and a measure without a cutoff claims none', () => {
    const tarf = { name: 'TARF', items: Array.from({ length: 10 }, (_, i) => 'q' + i), scale: ['1', '2', '3', '4', '5', '6', '7'], reverseItems: [5, 8] };
    const r = SV.scoreSocialValidity(tarf, all(10, 6));   // "Very much" on everything
    expect(r.total).toBe(8 * 7 + 2 * 1);
    expect(r.mean).toBeCloseTo(5.8, 10);
    expect(r.interpretation).toBe('No published cutoff: mean 5.80 of 7 (higher = more acceptable)');
  });
});

describe('the Social Validity panel', () => {
  it('scores the IRP-15 on its 6-point scale with named, grouped options', () => {
    const q = componentHarness('SocialValidityMeasures', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} });
    q.all(n => n.type === 'button' && q.text(n).includes('IRP-15'))[0].props.onClick(); q.render();
    const groups = q.all(n => n.props['data-sv-item'] !== undefined);
    expect(groups).toHaveLength(15);
    expect(groups[0].props.role).toBe('group');
    expect(groups[0].children).toHaveLength(6);
    expect(groups[0].children.map(b => q.text(b))).not.toContain('Neutral');
    for (const b of groups[0].children) expect(b.props['aria-label']).toBeUndefined();
    for (let i = 0; i < 15; i += 1) {
      q.all(n => n.props['data-sv-item'] === i)[0].children.find(b => b.props['data-sv-option'] === 3).props.onClick();
      q.render();
    }
    q.all(n => n.props['aria-label'] === 'Score')[0].props.onClick(); q.render();
    const verdict = q.all(n => n.props['data-sv-verdict'])[0];
    expect(verdict.props['data-sv-verdict']).toBe('Acceptable by the published criterion');
  });
});
