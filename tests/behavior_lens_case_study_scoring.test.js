// Behavior Lens Case Study scoring.
//
// WHY: until 2026-09-23 the results screen said "Case Study Mastery!" at 70/100 while
// the debrief prompt called only 80+ competent (60-79 "developing competency with some
// areas needing attention"), so a 72 was told both at once. A phase whose AI feedback
// did not match "OVERALL: n/25" scored 0 without a word, and the total used the AI's
// own addition instead of the five sub-scores it listed. Expected values are worked
// by hand.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let CS;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  CS = window.AlloModules.BehaviorLensCaseStudy;
  if (!CS) throw new Error('BehaviorLensCaseStudy did not register');
});

describe('parseCaseStudyScore', () => {
  it('adds the five sub-scores rather than trusting the stated total', () => {
    expect(CS.parseCaseStudyScore('SCORES: 4/5, 4/5, 3/5, 5/5, 4/5\nOVERALL: 25/25\n\nFEEDBACK: ...')).toBe(20);
  });
  it('falls back to the stated total, in any case', () => {
    expect(CS.parseCaseStudyScore('Overall: 18 / 25\nFeedback')).toBe(18);
  });
  it('an unreadable reply is not scored (it was 0)', () => {
    expect(CS.parseCaseStudyScore('Great work overall, about eighteen out of twenty-five.')).toBe(null);
    expect(CS.parseCaseStudyScore('OVERALL: 40/25')).toBe(null);
  });
});

describe('caseStudyTotals', () => {
  const phases = [1, 2, 3, 4].map(n => ({ id: 'p' + n, label: 'Phase ' + n }));
  it('72 of 100 is developing, the same band the debrief is told', () => {
    const ev = { p1: { score: 18 }, p2: { score: 18 }, p3: { score: 18 }, p4: { score: 18 } };
    expect(CS.caseStudyTotals(phases, ev)).toMatchObject({ total: 72, max: 100, pct: 72, band: 'developing', complete: true });
  });
  it('an unscored phase is left out of the total and named', () => {
    const ev = { p1: { score: 20 }, p2: { score: 20 }, p3: { score: 20 }, p4: { score: null } };
    expect(CS.caseStudyTotals(phases, ev)).toMatchObject({ total: 60, max: 75, pct: 80, complete: false, unscored: ['Phase 4'] });
  });
});

describe('the case study screen', () => {
  const CASE = '=== CASE NARRATIVE ===\nJordan, 8.\n=== ABC DATA ===\n1 | Room | Math | Leaves seat | Redirect | 2 min\n=== SESSION DATA ===\nSession 1: 4';
  async function run(phaseReplies) {
    let debriefPrompt = '';
    let phase = 0;
    const callGemini = async prompt => {
      if (/creating a realistic case study/.test(prompt)) return CASE;
      if (/end-of-case reflection/.test(prompt)) { debriefPrompt = prompt; return 'Debrief text.'; }
      return phaseReplies[phase++];
    };
    const q = componentHarness('CaseStudyEngine', { callGemini, t: () => undefined, addToast: () => {} });
    q.all(n => n.type === 'button' && /Guided/.test(q.text(n)))[0].props.onClick(); q.render();
    q.all(n => n.type === 'button' && /Escape-Maintained Behavior/.test(q.text(n)))[0].props.onClick(); q.render();
    await q.all(n => n.props['aria-label'] === 'Generate Case')[0].props.onClick(); q.render();
    for (let i = 0; i < phaseReplies.length; i += 1) {
      q.all(n => n.type === 'textarea')[0].props.onChange({ target: { value: 'My answer ' + i } }); q.render();
      await q.all(n => n.props['aria-label'] === 'Evaluate Phase')[0].props.onClick(); q.render();
      const next = q.all(n => n.type === 'button' && /^Next Phase: /.test(q.text(n)))[0];
      if (next) { next.props.onClick(); q.render(); }
    }
    await q.all(n => n.props['aria-label'] === 'Generate Debrief')[0].props.onClick(); q.render();
    return { q, debriefPrompt: () => debriefPrompt };
  }
  const reply18 = 'SCORES: 4/5, 4/5, 3/5, 4/5, 3/5\nOVERALL: 18/25\n\nFEEDBACK:\nGood.';
  it('the phase stepper names each phase (all four were "Toggle current phase")', async () => {
    const q = componentHarness('CaseStudyEngine', { callGemini: async () => CASE, t: () => undefined, addToast: () => {} });
    q.all(n => n.type === 'button' && /Guided/.test(q.text(n)))[0].props.onClick(); q.render();
    q.all(n => n.type === 'button' && /Escape-Maintained Behavior/.test(q.text(n)))[0].props.onClick(); q.render();
    await q.all(n => n.props['aria-label'] === 'Generate Case')[0].props.onClick(); q.render();
    expect(q.all(n => /^Phase \d: /.test(n.props['aria-label'] || '')).map(n => [n.props['aria-label'].slice(0, 8), n.props['aria-current']]))
      .toEqual([['Phase 1:', 'step'], ['Phase 2:', undefined], ['Phase 3:', undefined], ['Phase 4:', undefined]]);
    expect(q.all(n => n.props['aria-label'] === 'Toggle current phase')).toHaveLength(0);
  });
  it('72 of 100 does not claim mastery (it said "Case Study Mastery!")', async () => {
    const { q, debriefPrompt } = await run([reply18, reply18, reply18, reply18]);
    expect(q.text()).not.toContain('Case Study Mastery!');
    expect(q.text()).toContain('Developing: Keep Practicing');
    expect(q.text(q.byAttr('data-case-total', 'true')[0])).toBe('72/100 (72%)');
    expect(debriefPrompt()).toContain('developing competency with some areas needing attention');
  });
  it('a phase whose feedback has no score says so, and is not counted as 0', async () => {
    const { q, debriefPrompt } = await run([reply18, reply18, reply18, 'FEEDBACK:\nA thoughtful answer.']);
    expect(q.text(q.byAttr('data-case-total', 'true')[0])).toBe('54/75 (72%)');   // old: 54/100 (54%)
    expect(q.text(q.byAttr('data-case-unscored', 'true')[0])).toContain('Not scored: ');
    expect(debriefPrompt()).toContain('Not every phase was scored, so do not judge overall competency');
  });
});
