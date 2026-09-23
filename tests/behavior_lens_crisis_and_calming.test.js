// Behavior Lens crisis plan, calming tools and the traffic-light poster.
//
// WHY: until 2026-09-23 "AI Draft Crisis Plan" asked the model for emergency contacts
// (its example phone was "555-0000") and REPLACED the contacts staff had typed, with no
// question, although removing one contact by hand asks first. It overwrote typed plan
// text too, and the old "Last reviewed" date then sat on text nobody had read. The
// traffic-light poster crashed when the model returned zone items as a list, lost the
// poster when the panel closed, and printed green and yellow text at about 2:1
// contrast. The self-regulation toolkit was lost on close. "4-4-6 box breathing" is not
// box breathing (4-4-4-4), and the calming tools were all named "Toggle active tool".
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let CR, TL;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  CR = window.AlloModules.BehaviorLensCrisis;
  TL = window.AlloModules.BehaviorLensTrafficLight;
  if (!CR || !TL) throw new Error('crisis / traffic-light helpers did not register');
});

const empty = { triggers: '', staffActions: '', communication: '' };
const AI_PLAN = JSON.stringify({
  prevention: { triggers: 'AI triggers', staffActions: 'AI actions', communication: 'AI comms' },
  deescalation: { triggers: 'AI d-triggers', staffActions: 'AI d-actions', communication: 'AI d-comms' },
  emergency: { triggers: 'AI e-triggers', staffActions: 'AI e-actions', communication: 'AI e-comms' },
  emergencyContacts: [{ name: 'Name', role: 'Role', phone: '555-0000' }],
});

describe('the crisis plan AI draft', () => {
  const mount = (confirmAnswer, sent) => componentHarness('CrisisIntervention',
    { studentName: 'Kestrel', studentKey: k => k, abcEntries: [], aiAnalysis: null, callGemini: async p => { sent.push(p); return AI_PLAN; }, t: () => undefined, addToast: () => {} },
    { askBehaviorLensConfirmation: async () => confirmAnswer, __durable: {
      crisisContacts: [{ id: 'c1', name: 'Ms. Rivera', role: 'Principal', phone: '412-555-1212' }],
      crisisPlan: { prevention: { triggers: 'Loud transitions', staffActions: '', communication: '' }, deescalation: { ...empty }, emergency: { ...empty } },
      crisisLastReviewed: '2026-09-01T15:00:00.000Z' } });
  const value = (q, label) => q.all(n => n.props['aria-label'] === label)[0].props.value;
  const draft = async q => { await q.all(n => n.type === 'button' && /AI Draft Crisis Plan/.test(q.text(n)))[0].props.onClick(); q.render(); };

  it('never touches the contacts, and does not ask the model for any', async () => {
    const sent = [];
    const q = mount(true, sent);
    await draft(q);
    expect([value(q, 'Contact name'), value(q, 'Contact phone')]).toEqual(['Ms. Rivera', '412-555-1212']);   // old: "Name", "555-0000"
    expect(sent[0]).not.toContain('emergencyContacts');
    expect(sent[0]).toContain('never invent names or phone numbers');
  });
  it('keeps typed text unless staff choose to replace it', async () => {
    const keep = mount(false, []);
    await draft(keep);
    expect(value(keep, 'Triggers and signs for Prevention')).toBe('Loud transitions');     // old: overwritten
    expect(value(keep, 'Staff actions for Prevention')).toBe('AI actions');               // empty boxes are filled
    const replace = mount(true, []);
    await draft(replace);
    expect(value(replace, 'Triggers and signs for Prevention')).toBe('AI triggers');
  });
  it('reads as an unreviewed draft until Save Plan', async () => {
    const q = mount(false, []);
    await draft(q);
    expect(q.text(q.byAttr('data-crisis-draft', 'true')[0])).toBe('AI draft, not reviewed yet. Read and correct every box, then press Save Plan.');
    expect(q.text()).not.toContain('Last reviewed:');          // old: September's date on the new draft
    q.all(n => n.props['aria-label'] === 'Save Plan')[0].props.onClick(); q.render();
    expect(q.byAttr('data-crisis-draft', 'true')).toHaveLength(0);
    expect(q.text()).toContain('Last reviewed:');
  });
  it('mergeCrisisDraft fills only empty fields when keeping', () => {
    const plan = { prevention: { triggers: 'mine', staffActions: '', communication: '' } };
    const out = CR.mergeCrisisDraft(plan, JSON.parse(AI_PLAN), false);
    expect(out.prevention).toEqual({ triggers: 'mine', staffActions: 'AI actions', communication: 'AI comms' });
    expect(out.emergency.triggers).toBe('AI e-triggers');
  });
});

describe('the traffic-light poster', () => {
  it('takes zone items given as a list (it crashed) and keeps a zone the model left out', () => {
    const current = { green: { title: 'G', items: 'a' }, yellow: { title: 'Y', items: 'b' }, red: { title: 'R', items: 'c' } };
    expect(TL.normalizeTrafficZones(current, { green: { title: 'Ready', items: ['Sit', ' Listen ', ''] }, red: { title: 'Stop', items: 'Ask for help' } })).toEqual({
      green: { title: 'Ready', items: 'Sit; Listen' }, yellow: { title: 'Y', items: 'b' }, red: { title: 'Stop', items: 'Ask for help' } });
  });
  it('renders after an AI reply with lists, and is kept with the workspace', async () => {
    const reply = JSON.stringify({ green: { title: 'Ready', items: ['Sit', 'Listen'] }, yellow: { title: 'Slow', items: ['Fidget'] }, red: { title: 'Stop', items: ['Leave'] } });
    const q = componentHarness('TrafficLightVisual', { studentName: 'Kestrel', aiAnalysis: null, callGemini: async () => reply, t: () => undefined, addToast: () => {} });
    await q.all(n => n.type === 'button' && /AI Generate Expectations/.test(q.text(n)))[0].props.onClick();
    expect(() => q.render()).not.toThrow();
    expect(q.all(n => n.props['aria-label'] === 'Green zone items, separated by semicolons')[0].props.value).toBe('Sit; Listen');
    const kept = componentHarness('TrafficLightVisual', { studentName: 'Kestrel', aiAnalysis: null, callGemini: null, t: () => undefined, addToast: () => {} },
      { __durable: { trafficLightZones: { green: { title: 'Our green', items: 'x' }, yellow: { title: 'y', items: '' }, red: { title: 'r', items: '' } } } });
    expect(kept.all(n => n.props['aria-label'] === 'Green zone title')[0].props.value).toBe('Our green');
  });
  it('every zone text colour reads at 4.5:1 or better on its background', () => {
    const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const q = componentHarness('TrafficLightVisual', { studentName: 'Kestrel', aiAnalysis: null, callGemini: null, t: () => undefined, addToast: () => {} });
    const zones = q.all(n => n.type === 'div' && n.props.style && n.props.style.background && n.props.style.borderColor && n.children.length >= 2);
    expect(zones).toHaveLength(3);
    zones.forEach(z => {
      const title = z.children[0].children[1];            // the title input carries the zone colour
      expect(ratio(title.props.style.color, z.props.style.background)).toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe('the calming tools', () => {
  it('say what each tool is, call 4-4-6 what it is, and respect reduced motion', () => {
    const q = componentHarness('DeEscalationToolkit', { t: () => undefined }, { DualLabel: text => text });
    expect(q.all(n => n.props['aria-label'] === 'Toggle active tool')).toHaveLength(0);
    expect(q.text()).not.toContain('box breathing');
    q.all(n => n.type === 'button' && /Breathing Exercise/.test(q.text(n)))[0].props.onClick(); q.render();
    const circle = q.all(n => typeof n.props.className === 'string' && n.props.className.includes('duration-[4000ms]'))[0];
    expect(circle.props.className).toContain('motion-reduce:transition-none');
  });
  it('the self-regulation toolkit is kept with the workspace', () => {
    const q = componentHarness('SelfRegulationToolkit', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} },
      { __durable: { selfRegulationToolkit: { high_unpleasant: ['Squeeze fists and release'], high_pleasant: [], low_unpleasant: [], low_pleasant: [] } } });
    expect(q.text()).toContain('View My Toolkit Card (1 strategies)');   // old: every strategy gone after closing the panel
  });
});
