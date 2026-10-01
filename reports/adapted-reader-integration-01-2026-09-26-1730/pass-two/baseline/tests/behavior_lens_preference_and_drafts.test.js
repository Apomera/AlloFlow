// Behavior Lens: the preference assessment wizard, and three drafts that were overwritten.
//
// WHY: until 2026-09-23
// - The preference wizard kept nothing: a finished assessment, its results and the AI
//   summary were lost on close. The BIP generator read a storage key only the demo
//   sandbox ever wrote, so every BIP said "No formal preference assessment generated."
//   MSWO results listed the last two items twice (again as "Tied - Unselected").
// - Choosing another target in the definition builder replaced an unsaved definition.
// - "AI Suggest" in the replacement planner replaced typed fields, and said "applied"
//   when the reply had no replacement.
// - The observation coach showed "7/10/10" for a reply of "7/10".
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  behaviorLensRuntime();
});
const flush = () => new Promise(r => setTimeout(r, 0));
const byLabel = (q, label) => q.all(n => n.props['aria-label'] === label)[0];
function confirmEnv(answer) {
  const asked = [];
  return { asked, env: { askBehaviorLensConfirmation: async (m, o) => { asked.push(o.title); return answer; }, DualLabel: text => text, InfoTooltip: 'span' } };
}

describe('preference assessment wizard', () => {
  function mswo(extra = {}) {
    const log = [];
    const q = componentHarness('PreferenceAssessmentWizard', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} },
      { DualLabel: text => text, InfoTooltip: 'span', __durableLog: log, __durable: Object.assign({ prefWizardMode: 'mswo', prefWizardItems: ['iPad', 'Blocks', 'Music'] }, extra) });
    return { q, log };
  }
  it('an MSWO run lists each item once and is summarised for the BIP', () => {
    const { q, log } = mswo();
    q.all(n => n.type === 'button' && /Start/i.test(q.text(n)) && n.props.onClick)[0].props.onClick(); q.render();
    const pick = name => q.all(n => n.type === 'button' && q.text(n).includes(name))[0].props.onClick();
    pick('iPad'); q.render();
    pick('Music'); q.render(true); q.render(true);
    const text = q.text();
    expect(text).not.toContain('Tied - Unselected');                 // listed twice before
    expect(text.indexOf('iPad')).toBeLessThan(text.indexOf('Music'));
    const summary = log.filter(([k]) => k === 'preferenceAssessmentSummary').pop();
    expect(summary[1].text).toMatch(/^MSWO preference assessment \(\d{4}-\d{2}-\d{2}\): 1\. iPad; 2\. Music; 3\. Blocks$/);
    expect(log.some(([k]) => k === 'prefWizardMswoRanked')).toBe(true);   // kept with the student
  });
  it('the results come back after closing', () => {
    const { q } = mswo({ prefWizardStep: 'results', prefWizardMswoRanked: ['Music', 'iPad', 'Blocks'], prefWizardMswoRemaining: [] });
    const text = q.text();
    expect(text).toContain('Assessment Results');
    expect(text.indexOf('Music')).toBeLessThan(text.indexOf('iPad'));
  });
  it('a new assessment asks first', async () => {
    const { asked, env } = confirmEnv(false);
    const q = componentHarness('PreferenceAssessmentWizard', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} },
      { ...env, __durable: { prefWizardMode: 'mswo', prefWizardItems: ['iPad', 'Blocks', 'Music'], prefWizardStep: 'results', prefWizardMswoRanked: ['Music', 'iPad', 'Blocks'] } });
    await byLabel(q, 'New Assessment').props.onClick(); q.render();
    expect(asked).toEqual(['Start a new preference assessment']);
    expect(q.text()).toContain('Assessment Results');
  });
  it('the free-operant clock is saved as it runs and comes back', () => {
    const log = [];
    const q = componentHarness('PreferenceAssessmentWizard', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} },
      { DualLabel: text => text, InfoTooltip: 'span', __durableLog: log, __durable: { prefWizardMode: 'free', prefWizardItems: ['iPad', 'Blocks', 'Music'] } });
    q.all(n => n.type === 'button' && /Start/i.test(q.text(n)) && n.props.onClick)[0].props.onClick(); q.render();
    expect(log.filter(([k]) => k === 'prefWizardFreeClock').pop()[1].active).toBe(null);
    q.all(n => n.props['data-fo-item'] === 'Blocks')[0].props.onClick(); q.render();
    expect(log.filter(([k]) => k === 'prefWizardFreeClock').pop()[1].active).toBe('Blocks');
    const back = componentHarness('PreferenceAssessmentWizard', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} },
      { DualLabel: text => text, InfoTooltip: 'span', __durable: { prefWizardMode: 'free', prefWizardItems: ['iPad', 'Blocks', 'Music'], prefWizardStep: 'results', prefWizardFreeClock: { start: 0, end: 120000, active: null, since: null, ms: { iPad: 90000, Blocks: 30000, Music: 0 } } } });
    expect(back.text()).toContain('1:30');
    expect(back.text()).toContain('0:30');
  });
  it('the paired and free-operant summaries', () => {
    const { preferenceHierarchy, preferenceSummaryText } = window.AlloModules.BehaviorLensPreferenceWizard;
    const paired = preferenceHierarchy('paired', ['A', 'B'], [], [], { A: { selected: 3, presented: 4 }, B: { selected: 1, presented: 4 } });
    expect(preferenceSummaryText('paired', paired, '2026-09-23')).toBe('Paired stimulus preference assessment (2026-09-23): 1. A 75% (3/4); 2. B 25% (1/4)');
    expect(preferenceHierarchy('paired', ['A', 'C'], [], [], { A: { selected: 1, presented: 1 } }).map(r => r.item)).toEqual(['A', 'C']);   // a missing item no longer crashes
  });
  it('the BIP generator uses the saved assessment', async () => {
    let sent = '';
    const q = componentHarness('BIPGenerator', { studentName: 'Kestrel', studentKey: null, abcEntries: [], callGemini: async p => { sent = p; return 'plan'; }, t: () => undefined, addToast: () => {} },
      { DualLabel: text => text, __durable: { preferenceAssessmentSummary: { mode: 'mswo', text: 'MSWO preference assessment (2026-09-23): 1. iPad; 2. Music' } } });
    await q.all(n => n.type === 'button' && /Generate/i.test(q.text(n)) && n.props.onClick)[0].props.onClick(); await flush();
    expect(sent).toContain('Preference Assessment Data: MSWO preference assessment (2026-09-23): 1. iPad; 2. Music');
  });
});

describe('definition builder', () => {
  it('asks before another target replaces an unsaved definition', async () => {
    const { asked, env } = confirmEnv(false);
    const q = componentHarness('OperationalDefinitionBuilder', { studentName: 'Kestrel', studentProfile: {}, targetBehaviors: [{ id: 't1', label: 'Elopement', operationalDefinition: 'Leaves the room without permission', measurement: 'count' }], setTargetBehaviors: () => {}, onRecord: () => {}, onMeasure: () => {}, callGemini: null, t: () => undefined, addToast: () => {} },
      { ...env, __durable: { operationalDefinitionDraft: { targetId: '', label: 'Calling out', rawDesc: '', definition: 'Typed but not saved', examples: '', nonExamples: '', measurement: 'count' } } });
    await q.all(n => n.props.id === 'bl-definition-target')[0].props.onChange({ target: { value: 't1' } }); q.render();
    expect(asked).toEqual(['Discard unsaved definition']);
    expect(q.all(n => n.props.value === 'Typed but not saved')).toHaveLength(1);
  });
});

describe('replacement planner AI suggest', () => {
  function mount(answer, reply) {
    const { asked, env } = confirmEnv(answer); const toasts = []; let calls = 0;
    const q = componentHarness('ReplacementBehaviorPlanner', { abcEntries: [], t: () => undefined, addToast: (m, k) => toasts.push([m, k]), callGemini: async () => { calls++; return reply; } }, env);
    const field = label => q.all(n => typeof n.props.onChange === 'function' && typeof n.props.placeholder === 'string' && label.test(n.props.placeholder))[0];
    field(/target|behavior/i).props.onChange({ target: { value: 'Elopement' } }); q.render();
    return { q, asked, toasts, calls: () => calls, field };
  }
  const suggest = q => q.all(n => n.type === 'button' && /AI Suggest/.test(q.text(n)))[0].props.onClick();
  it('asks before replacing typed fields', async () => {
    const { q, asked, calls, field } = mount(false, '{"replacement":"Ask for a break"}');
    field(/replacement/i).props.onChange({ target: { value: 'Typed replacement' } }); q.render();
    await suggest(q); q.render();
    expect(asked).toEqual(['Replace with AI suggestion']);
    expect(calls()).toBe(0);
    expect(q.all(n => n.props.value === 'Typed replacement')).toHaveLength(1);
  });
  it('a reply with no replacement is an error, not "applied"', async () => {
    const { q, toasts } = mount(true, '{"teachingStrategy":"Model it"}');
    await suggest(q); await flush(); q.render();
    expect(toasts.pop()).toEqual(['AI suggestion failed', 'error']);
  });
});

describe('observation coach score', () => {
  it('reads "7/10" as 7', async () => {
    const { coachScore } = window.AlloModules.BehaviorLensCoach;
    expect([coachScore('7/10'), coachScore(8), coachScore('11'), coachScore('good'), coachScore(null)]).toEqual([7, 8, null, null, null]);
    const entries = Array.from({ length: 12 }, (_, i) => ({ id: 'e' + i, antecedent: 'A', behavior: 'B', consequence: 'C', intensity: 2, occurredAt: '2026-09-1' + (i % 9) + 'T14:00:00Z' }));
    const q = componentHarness('ObservationCoach', { abcEntries: entries, observationSessions: [], callGemini: async () => '{"overallScore":"7/10","overallFeedback":"Good detail.","strengths":[],"improvements":[]}', t: () => undefined, addToast: () => {} }, { DualLabel: text => text });
    await q.all(n => n.type === 'button' && n.props.onClick && /Coach|Tips|Analy/i.test(q.text(n)))[0].props.onClick(); await flush(); q.render();
    expect(q.text()).toContain('7/10');
    expect(q.text()).not.toContain('7/10/10');
    expect(q.text()).toContain('Based on the 10 most recent of 12 entries.');
  });
});
