import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, Modal;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  window.React = globalThis.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('generation_helpers_module.js'); loadAlloModule('math_create_module.js');
  Modal = window.AlloModules.MathCreate.MathCreateModal;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); });
async function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Modal, {
    showAssessmentBuilder: true, mathSubject: 'Math', gradeLevel: '3', t: k => k,
    assessmentBlocks: [{ id: 'a', type: 'computation', quantity: 2, directive: 'addition' }], ...props
  }))));
}
const response = n => JSON.stringify({ problems: Array.from({ length: n }, (_, i) => ({ question: `${i}+1`, expression: `${i}+1`, answer: String(i+1) })) });
describe('Assessment Builder runtime recovery', () => {
  it('blocks repeated clicks, shows partial counts, retries and opens the updated artifact', async () => {
    let resolveFirst, history = [];
    const callGemini = vi.fn().mockImplementationOnce(() => new Promise(r => { resolveFirst = r; })).mockResolvedValueOnce(response(2));
    const setHistory = update => { history = update(history); };
    const setGeneratedContent = vi.fn(), setActiveView = vi.fn(), onClose = vi.fn();
    await mount({ callGemini, setHistory, setGeneratedContent, setActiveView, onClose });
    const button = host.querySelector('button[aria-label="Generate assessment problems"]');
    await act(async () => { button.click(); button.click(); });
    expect(callGemini).toHaveBeenCalledTimes(1); expect(button.disabled).toBe(true);
    await act(async () => { resolveFirst(response(1)); await Promise.resolve(); });
    expect(host.textContent).toContain('1/2 ready'); expect(host.textContent).toContain('Retry incomplete');
    expect(history).toHaveLength(1); const id = history[0].id;
    await act(async () => button.click());
    expect(callGemini).toHaveBeenCalledTimes(2); expect(history).toHaveLength(1);
    expect(history[0].id).toBe(id); expect(history[0].data.problems).toHaveLength(2);
    const open = [...host.querySelectorAll('button')].find(b => b.textContent === 'Open prepared assessment');
    await act(async () => open.click());
    expect(setGeneratedContent).toHaveBeenCalledWith(expect.objectContaining({ id, type: 'math' }));
    expect(setActiveView).toHaveBeenCalledWith('math'); expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('does not publish a stale result after the modal closes', async () => {
    let release; const setHistory = vi.fn();
    await mount({ callGemini: () => new Promise(r => { release = r; }), setHistory });
    await act(async () => host.querySelector('button[aria-label="Generate assessment problems"]').click());
    await act(async () => { root.unmount(); root = null; release(response(2)); await Promise.resolve(); });
    expect(setHistory).not.toHaveBeenCalled();
  });
});
