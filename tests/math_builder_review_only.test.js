import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, Modal, update;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  window.React = globalThis.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('generation_helpers_module.js'); loadAlloModule('math_create_module.js');
  Modal = window.AlloModules.MathCreate.MathCreateModal;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  function Harness() {
    const [props, setProps] = React.useState({ showAssessmentBuilder: true, mathSubject: 'Math', gradeLevel: '3', t: k => k,
      leveledTextLanguage: 'English', currentUiLanguage: 'English', translationMode: 'none',
      assessmentBlocks: [{ id: 'a', type: 'custom', quantity: 2, directive: 'Simplify variables' }], ...extra });
    update = changed => setProps(previous => ({ ...previous, ...changed }));
    return React.createElement(Modal, props);
  }
  await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Harness))));
}
const generate = () => host.querySelector('button[aria-label="Generate assessment problems"]');
const unsupported = JSON.stringify({ problems: [
  { question: 'Simplify x+x', expression: 'x+x', answer: '2x' },
  { question: 'Simplify y+y', expression: 'y+y', answer: '2y' }
] });
describe('Assessment Builder review-only completion', () => {
  it('opens complete unsupported content for review without offering another provider call', async () => {
    const callGemini = vi.fn().mockResolvedValue(unsupported), setGeneratedContent = vi.fn();
    await mount({ callGemini, setGeneratedContent });
    await act(async () => generate().click());
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(generate().textContent).toContain('Prepared - open to review');
    expect(generate().disabled).toBe(true);
    await act(async () => generate().click());
    expect(callGemini).toHaveBeenCalledTimes(1);
    const open = [...host.querySelectorAll('button')].find(button => button.textContent === 'Open prepared assessment');
    expect(open.disabled).toBe(false);
    await act(async () => open.click());
    expect(setGeneratedContent).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ problems: expect.any(Array) }) }));
    expect(host.textContent).not.toContain('review or retry needed');
  });
  it.each([
    { gradeLevel: '4' }, { mathSubject: 'Algebra' }, { leveledTextLanguage: 'Spanish' },
    { translationMode: 'bilingual' }, { currentUiLanguage: 'Spanish' },
    { assessmentBlocks: [{ id: 'a', type: 'custom', quantity: 2, directive: 'Use different variables' }] }
  ])('enables new generation when settings change: %j', async settings => {
    const callGemini = vi.fn().mockResolvedValue(unsupported);
    await mount({ callGemini });
    await act(async () => generate().click());
    expect(generate().disabled).toBe(true);
    await act(async () => update(settings));
    expect(generate().disabled).toBe(false);
    expect(generate().textContent).toContain('Generate All');
    await act(async () => generate().click());
    expect(callGemini).toHaveBeenCalledTimes(2);
  });
  it('keeps a complete but known incorrect answer eligible for retry', async () => {
    const callGemini = vi.fn().mockResolvedValue(JSON.stringify({ problems: [
      { question: '18+27', expression: '18+27', answer: '46' },
      { question: '2+3', expression: '2+3', answer: '5' }
    ] }));
    await mount({ callGemini });
    await act(async () => generate().click());
    expect(generate().disabled).toBe(false);
    expect(generate().textContent).toContain('Retry incomplete sections');
    await act(async () => generate().click());
    expect(callGemini).toHaveBeenCalledTimes(2);
  });
});
