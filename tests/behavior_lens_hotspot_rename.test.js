// Behavior Lens routine hotspot matrix.
//
// WHY: until 2026-09-23 renaming "Math" to "Math " (a trailing space) set the tally
// under the trimmed name, which is "Math" again, and then deleted "Math": the count
// was gone. Renaming a routine onto another routine's name overwrote that routine's
// count and left two rows sharing one key. The tallies were lost when the panel
// closed, every name button was "Start Edit", and the AI was told the tallies were
// "observations".
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

const routines = ['Math', 'Lunch'];
function mount(extra = {}) {
  const toasts = [];
  const q = componentHarness('HotspotMatrix', { abcEntries: [], studentName: 'Kestrel', callGemini: extra.callGemini || null, t: () => undefined, addToast: (m, k) => toasts.push([m, k]) },
    { __durable: { hotspotRoutines: routines, hotspotMatrix: { Math: 4, Lunch: 1 } } });
  return { q, toasts };
}
const count = (q, routine) => {
  const label = q.all(n => typeof n.props['aria-label'] === 'string' && n.props['aria-label'].startsWith('Increment ' + routine + ' hotspot count'))[0];
  return label && /currently (\d+)/.exec(label.props['aria-label'])[1];
};
function rename(q, from, to) {
  q.all(n => n.props['aria-label'] === 'Rename ' + from)[0].props.onClick(); q.render();
  q.all(n => n.props['aria-label'] === 'Edit routine name')[0].props.onChange({ target: { value: to } }); q.render();
  q.all(n => n.props['aria-label'] === 'Edit routine name')[0].props.onBlur(); q.render();
}

describe('renaming a routine', () => {
  it('a trailing space keeps the tally (it was deleted)', () => {
    const { q, toasts } = mount();
    expect(count(q, 'Math')).toBe('4');
    rename(q, 'Math', 'Math ');
    expect(count(q, 'Math')).toBe('4');
    expect(toasts).toEqual([]);          // the same name: no rename and no "already exists" warning
  });
  it('onto another routine is refused rather than overwriting its count', () => {
    const { q, toasts } = mount();
    rename(q, 'Math', 'Lunch');
    expect(count(q, 'Math')).toBe('4');
    expect(count(q, 'Lunch')).toBe('1');
    expect(toasts.pop()).toEqual(['There is already a routine called Lunch. Choose another name.', 'warning']);
  });
  it('to a new name carries the tally', () => {
    const { q } = mount();
    rename(q, 'Math', 'Math block');
    expect(count(q, 'Math block')).toBe('4');
  });
  it('the AI is told these are tallied incidents', async () => {
    let sent = '';
    const { q } = mount({ callGemini: async p => { sent = p; return '{"summary":"s","peakRoutines":[],"recommendations":[],"possibleTriggers":[]}'; } });
    await q.all(n => n.type === 'button' && /Analy/.test(q.text(n)))[0].props.onClick();
    expect(sent).toContain('Math: 4 tallied incidents');
  });
});
