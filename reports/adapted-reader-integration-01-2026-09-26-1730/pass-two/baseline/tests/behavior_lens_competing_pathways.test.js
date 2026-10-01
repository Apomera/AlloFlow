// Behavior Lens competing behavior pathways.
//
// WHY: in the competing behavior model (O'Neill et al., 1997) there are three
// pathways: the problem behavior, the DESIRED behavior staff ultimately want (e.g.
// finishing the task), and an ALTERNATIVE (replacement) behavior that is functionally
// equivalent to the problem behavior (e.g. asking for a break). Until 2026-09-23 this
// tool labelled the functionally equivalent replacement "Desired" and the desired
// behavior (its own placeholder: "Compliant task completion") "Competing", in the
// form, the diagram and the text that Copy Model puts into BIPs. The model was also
// lost when the panel closed.
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

const model = { targetBehavior: 'Tears worksheet', settingEvent: 'Poor sleep', antecedent: 'Math worksheet', consequence: 'Sent to hallway (escapes task)', function: 'Escape',
  replacementBehavior: 'Hands a break card', desiredConsequence: '2-minute break', competingBehavior: 'Completes the worksheet', competingConsequence: 'Teacher praise' };

describe('the pathways panel', () => {
  it('calls the functionally equivalent behavior the replacement, and the wanted behavior desired', () => {
    const q = componentHarness('CompetingPathways', { abcEntries: [], callGemini: null, t: () => undefined, addToast: () => {} }, { __durable: { competingPathwaysModel: model } });
    expect(q.text(q.byAttr('data-pathway', 'replacement')[0])).toContain('Replacement (Alternative) Pathway');   // old: "Desired Pathway"
    expect(q.text(q.byAttr('data-pathway', 'desired')[0])).toContain('Desired Behavior Pathway');               // old: "Competing Pathway"
    expect(q.all(n => n.props['aria-label'] === 'Desired Behavior')[0].props.value).toBe('Completes the worksheet');
    expect(q.all(n => n.props['aria-label'] === 'Competing Behavior')).toHaveLength(0);
  });
  it('the copied text and the diagram say the same', async () => {
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async v => { copied = v; } }, configurable: true });
    const q = componentHarness('CompetingPathways', { abcEntries: [], callGemini: null, t: () => undefined, addToast: () => {} }, { __durable: { competingPathwaysModel: model } });
    const copy = q.all(n => n.type === 'button' && /Copy/.test(q.text(n)))[0];
    await copy.props.onClick();
    expect(copied).toContain('REPLACEMENT (ALTERNATIVE) PATHWAY, SAME FUNCTION');
    expect(copied).toContain('Desired Behavior: Completes the worksheet');
    expect(copied).not.toContain('═══ COMPETING PATHWAY ═══');         // the old section header (the model title stays)
    q.all(n => n.type === 'button' && /Show Visual Diagram/.test(q.text(n)))[0].props.onClick(); q.render();
    const svg = q.all(n => n.type === 'svg')[0];
    expect(svg.props['aria-label']).toContain('Replacement pathway: Hands a break card');
    expect(svg.props['aria-label']).toContain('Desired behavior pathway: Completes the worksheet');
  });
});
