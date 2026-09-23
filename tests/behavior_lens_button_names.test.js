// Behavior Lens button names.
//
// WHY: until 2026-09-23, 102 buttons carried a generated aria-label such as
// "Toggle selected behavior", "Toggle mode", "Set Ioa Method" or "Toggle rating". An
// aria-label replaces the visible text, so a screen reader heard "Toggle selected
// behavior" instead of the behavior's name, every quiz option was "Answer", every
// reinforcer rating was "Rate", and the "+" that adds a custom reinforcer was "Rate"
// too. Buttons with visible text now use it; icon-only ones have real names.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
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

const src = readFileSync('behavior_lens_module.js', 'utf8');

describe('the source', () => {
  it('has no generated "Toggle ..." / "Set ..." button names left', () => {
    expect(src.match(/"aria-label": "(?:Toggle|Set) [^"]*"/g) || []).toEqual([]);
  });
  it('quiz options and reinforcer ratings are not all named the same', () => {
    expect(src.match(/"aria-label": "(?:Answer|Rate)"/g) || []).toEqual([]);
  });
});

describe('icon-only buttons have real names', () => {
  it('reinforcer ratings say which item and which rating, with the pressed one marked', () => {
    const q = componentHarness('ReinforcementInventory', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} }, { DualLabel: text => text });
    const loves = q.all(n => typeof n.props['aria-label'] === 'string' && / Love$/.test(n.props['aria-label']));
    expect(loves.length).toBeGreaterThan(3);
    expect(loves[0].props['aria-label']).toMatch(/^.+: Love$/);
    expect(q.all(n => n.props['aria-label'] === 'Add custom reinforcer')).toHaveLength(1);
  });
  it('quiz options are named by their text', () => {
    const q = componentHarness('ABAQuiz', { t: () => undefined, addToast: () => {} });
    const opt = q.all(n => n.type === 'button' && q.text(n) === 'Behavior')[0];
    expect(opt).toBeTruthy();
    expect(opt.props['aria-label']).toBeUndefined();
  });
});
