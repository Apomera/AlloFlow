import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, Modal, root, host, controls, values;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('math_create_module.js');
  Modal = window.AlloModules.MathCreate.MathCreateModal;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove();
  delete window.AlloMathInput; delete window.__alloLoadPlugin;
});
async function mount(extra = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  function Harness() {
    const [state, setState] = React.useState({ mathInput: 'Simplify', showAssessmentBuilder: true,
      assessmentBlocks: [{ id: 'a', type: 'fractions', quantity: 3, directive: 'Add fractions' }], ...extra });
    const [history, setHistory] = React.useState([]);
    controls = { update: change => setState(previous => ({ ...previous, ...change })) };
    values = { ...state, history };
    const field = key => value => setState(previous => ({ ...previous, [key]: typeof value === 'function' ? value(previous[key]) : value }));
    return React.createElement(Modal, { t: key => key, mathSubject: 'Fractions', gradeLevel: '5', leveledTextLanguage: 'Spanish',
      ...state, setHistory, setMathInput: field('mathInput'), setAssessmentBlocks: field('assessmentBlocks') });
  }
  await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Harness))));
}
const click = async label => act(async () => host.querySelector(`button[aria-label="${label}"]`).click());
const deferredKeyboard = () => {
  let finish;
  window.AlloMathInput = { promptEquation: vi.fn(() => new Promise(resolve => { finish = resolve; })) };
  return value => act(async () => finish(value));
};

describe('Math Studio authoring and saved-plan identity', () => {
  it('saves a clearly labelled plan with exact directives and settings, separate from questions', async () => {
    await mount();
    await click('Save plan to Resources');
    const restored = JSON.parse(JSON.stringify(values.history[0]));
    expect(restored.title).toBe('Assessment plan - Fractions');
    expect(restored.type).toBe('stem-assessment');
    expect(restored.config).toEqual({ grade: '5', language: 'Spanish' });
    expect(restored.data).toEqual({ resourceKind: 'plan', blocks: values.assessmentBlocks,
      subject: 'Fractions', totalProblems: 3, results: null });
    expect(host.textContent).toContain('answer keys, and steps save automatically');
    expect(host.textContent).toContain('unsubmitted answers are not saved');
    await act(async () => controls.update({ assessmentBlocks: [] }));
    expect(restored.data.blocks).toHaveLength(1);
  });
  it('gives repeated plan saves distinct identities even in the same millisecond', async () => {
    await mount();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(42);
    try {
      await click('Save plan to Resources');
      await click('Save plan to Resources');
      expect(values.history).toHaveLength(2);
      expect(new Set(values.history.map(item => item.id)).size).toBe(2);
    } finally { clock.mockRestore(); }
  });
  it.each(['\\frac{1}{2}', 'x^{2}', '\\sqrt{9}'])('inserts %s using the existing prompt keyboard', async latex => {
    await mount({ showAssessmentBuilder: false });
    const finish = deferredKeyboard();
    await click('Open math keyboard for math prompt');
    expect(window.AlloMathInput.promptEquation).toHaveBeenCalledWith(expect.objectContaining({ insertLabel: 'Insert math' }));
    await finish({ latex });
    expect(values.mathInput).toBe(`Simplify \\(${latex}\\)`);
  });
  it('inserts into the selected directive without changing another block', async () => {
    await mount({ assessmentBlocks: [{ id: 'a', type: 'fractions', quantity: 3, directive: 'Add' }, { id: 'b', type: 'custom', quantity: 2, directive: 'Keep' }] });
    const finish = deferredKeyboard();
    await click('Open math keyboard for block 1 directive');
    await finish({ latex: '\\frac{1}{2}' });
    expect(values.assessmentBlocks.map(block => block.directive)).toEqual(['Add \\(\\frac{1}{2}\\)', 'Keep']);
  });
  it.each(['edited', 'removed', 'switched'])('rejects a late keyboard result when its block is %s', async change => {
    await mount();
    const finish = deferredKeyboard();
    await click('Open math keyboard for block 1 directive');
    const blocks = change === 'removed' ? [] : [{ id: change === 'switched' ? 'b' : 'a', type: 'fractions', quantity: 3, directive: 'New directive' }];
    await act(async () => controls.update({ assessmentBlocks: blocks }));
    await finish({ latex: 'x^{2}' });
    expect(values.assessmentBlocks).toEqual(blocks);
  });
  it('rejects a prompt result after editing away and back to the original value', async () => {
    await mount({ showAssessmentBuilder: false });
    const finish = deferredKeyboard();
    await click('Open math keyboard for math prompt');
    await act(async () => controls.update({ mathInput: 'Different' }));
    await act(async () => controls.update({ mathInput: 'Simplify' }));
    await finish({ latex: 'x^{2}' });
    expect(values.mathInput).toBe('Simplify');
  });
  it('does not open the keyboard if its lazy load finishes after Studio closes', async () => {
    let release;
    window.__alloLoadPlugin = vi.fn(() => new Promise(resolve => { release = resolve; }));
    await mount({ showAssessmentBuilder: false });
    await click('Open math keyboard for math prompt');
    expect(window.__alloLoadPlugin).toHaveBeenCalledWith('mathlive_loader.js');
    const promptEquation = vi.fn();
    await act(async () => { root.unmount(); root = null; window.AlloMathInput = { promptEquation }; release(); });
    expect(promptEquation).not.toHaveBeenCalled();
  });
  it('lets the nested keyboard consume Escape without closing Math Studio', async () => {
    const onClose = vi.fn();
    await mount({ onClose });
    const nested = document.createElement('input'); document.body.appendChild(nested);
    const intercept = event => { event.preventDefault(); nested.remove(); };
    document.addEventListener('keydown', intercept, { capture: true, once: true });
    nested.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(onClose).not.toHaveBeenCalled();
    host.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('cancels without edits and recovers from keyboard failure', async () => {
    const addToast = vi.fn();
    await mount({ addToast });
    window.AlloMathInput = { promptEquation: vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('offline')) };
    await click('Open math keyboard for block 1 directive');
    expect(values.assessmentBlocks[0].directive).toBe('Add fractions');
    await click('Open math keyboard for block 1 directive');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('still type LaTeX'), 'error');
    expect(host.querySelector('button[aria-label="Open math keyboard for block 1 directive"]').disabled).toBe(false);
  });
});
