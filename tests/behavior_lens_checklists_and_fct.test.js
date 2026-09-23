// Behavior Lens rating checklists (Environment Audit, Feasibility) and FCT word practice.
//
// WHY: until 2026-09-23 both checklists counted an UNRATED area as 0, so one rating of
// 5 read 5/40 = 13% "Needs Improvement" (or 5/25 = 20% "Not Feasible"): a verdict after
// a single answer. The AI prompt called every unrated area "0/5" and "low". The
// Feasibility Check said "Based on Horner, Salentine, & Albin (2003)" for a homemade
// 5-item score with homemade 80/50% bands. Every rating button was "Toggle ratings".
// The FCT vocabulary had three rules for a "ready" word (a weighted 12.5 on the FBA
// card; taps + 2 x quest answers above 5, "Student can use", on the BIP card; above 3
// in the BIP prompt), so one word could be "Growing" on one screen and "Student can
// use" on the next. Expected values are worked by hand.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let RC, FCT;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  RC = window.AlloModules.BehaviorLensRatedChecklist;
  FCT = window.AlloModules.BehaviorLensFct;
  if (!RC || !FCT) throw new Error('checklist / FCT helpers did not register');
});
afterEach(() => { localStorage.clear(); });

describe('ratedChecklistScore', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  it('an unrated area is not a 0, and there is no score until all are rated', () => {
    expect(RC.ratedChecklistScore(ids, { a: 5 })).toMatchObject({ rated: 1, of: 5, total: 5, complete: false, pct: null, unrated: ['b', 'c', 'd', 'e'] });
    expect(RC.ratedChecklistScore(ids, { a: 5, b: 0 })).toMatchObject({ rated: 1 });   // a rating clicked off
    expect(RC.ratedChecklistScore(ids, { a: 5, b: 4, c: 4, d: 3, e: 4 })).toMatchObject({ complete: true, total: 20, max: 25, pct: 80 });
  });
  it('the AI is told which areas are unrated, and only rated areas can be low', () => {
    const items = [{ id: 'a', label: 'Staff Skill' }, { id: 'b', label: 'Resources' }, { id: 'c', label: 'Time' }];
    const score = RC.ratedChecklistScore(items.map(i => i.id), { a: 2, c: 4 });
    expect(RC.ratedChecklistPromptLines(items, score)).toEqual({ ratings: 'Staff Skill: 2/5, Resources: not rated, Time: 4/5', low: 'Staff Skill' });
  });
});

describe('the checklist panels', () => {
  const rate = (q, label, v) => { q.all(n => n.props['aria-label'] === `${label}: ${v} of 5`)[0].props.onClick(); q.render(); };
  it('Feasibility: one rating gives progress, not "Not Feasible"; all five give the verdict', () => {
    const q = componentHarness('FeasibilityCheck', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} });
    rate(q, 'Staff Skill', 5);
    expect(q.text()).not.toContain('Not Feasible');          // old: 5/25 = 20%, "Not Feasible"
    expect(q.text(q.byAttr('data-checklist-progress', 'feasibility')[0])).toBe('1 of 5 areas rated. Rate every area for an overall score.');
    ['Resource Availability', 'Value Alignment', 'Time Commitment', 'Administrative Support'].forEach(l => rate(q, l, 4));
    expect(q.text(q.byAttr('data-checklist-score', 'feasibility')[0])).toContain('21/25');
    expect(q.text(q.byAttr('data-checklist-score', 'feasibility')[0])).toContain('Feasible');
    expect(q.text(q.byAttr('data-feasibility-source', 'true')[0])).toContain('This 5-item version is not that instrument');
    expect(q.all(n => n.props['aria-label'] === 'Toggle ratings')).toHaveLength(0);
    expect(q.all(n => n.props['aria-label'] === 'Staff Skill: 5 of 5')[0].props['aria-pressed']).toBe('true');
  });
  it('Environment Audit: the same, over 8 areas', () => {
    const q = componentHarness('EnvironmentAudit', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} });
    rate(q, 'Classroom Structure', 5);
    expect(q.text()).not.toContain('Needs Improvement');     // old: 5/40 = 13%
    expect(q.byAttr('data-checklist-score', 'audit')).toHaveLength(0);
    expect(q.text(q.byAttr('data-checklist-progress', 'audit')[0])).toBe('1 of 8 areas rated. Rate every area for an overall score.');
  });
  it('the AI prompt is not sent unrated areas as zeros', async () => {
    let sent = '';
    const q = componentHarness('FeasibilityCheck', { studentName: 'Kestrel', callGemini: async p => { sent = p; return '{"summary":"s","recommendations":[]}'; }, t: () => undefined, addToast: () => {} });
    rate(q, 'Staff Skill', 2); rate(q, 'Resource Availability', 4); rate(q, 'Value Alignment', 5);
    await q.all(n => n.type === 'button' && /AI Recommendations/.test(q.text(n)))[0].props.onClick();
    expect(sent).toContain('Areas rated: 3 of 5. Do not treat unrated areas as low.');
    expect(sent).toContain('Low areas: Staff Skill\n');
    expect(sent).toContain('Time Commitment: not rated');
    expect(sent).not.toContain('0/5');
  });
});

describe('FCT word practice', () => {
  const fam = { break: { taps: 10, questCorrect: 2 }, help: { taps: 4, questCorrect: 1 }, stop: { taps: 2 } };
  // break: 10 + 4 = 14 (often). help: 4 + 2 = 6 (old BIP card: "Student can use"; FBA card: "Growing"). stop: 2.
  it('one rule for every screen', () => {
    expect(FCT.fctWordPractice(['break', 'help', 'stop', 'all done', 'too hard'], fam, { 'too hard': true })).toEqual({ often: ['break'], some: ['help', 'stop'], carded: ['too hard'], none: ['all done'] });
  });
  it('the FBA card and the BIP card agree, and say "practiced", not "can use"', () => {
    localStorage.setItem('alloSymbolFamiliarity', JSON.stringify(fam));
    localStorage.setItem('alloSymbolGallery', JSON.stringify([{ label: 'Too Hard' }]));
    const aiAnalysis = { hypothesizedFunction: 'Escape' };
    const fba = componentHarness('HypothesisDiagram', { abcEntries: [], aiAnalysis, studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} });
    const bip = componentHarness('InterventionPlanGenerator', { studentName: 'Kestrel', abcEntries: [], observationSessions: [], aiAnalysis, callGemini: null, t: () => undefined, addToast: () => {} }, { __durable: { interventionAiPlan: 'A plan.' } });
    for (const q of [fba, bip]) {
      const text = q.text();
      expect(text).toContain('✅ Practiced often: break');
      expect(text).toMatch(/🌿 Some practice: (stop)?help/);
      expect(text).toContain('🖼️ Card made, not practiced yet: too hard');   // from the student's picture bank
      expect(text).not.toContain('Student can use');
    }
  });
});
