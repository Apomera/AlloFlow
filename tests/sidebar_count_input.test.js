// Glossary Tier 2 / Tier 3 boxes: clearing the box to type a new number must not
// snap it to 0, and the saved number comes back if the box is left empty.
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
let React, createRoot, act, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; globalThis.React = window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  new Function(readFileSync(resolve(process.env.SIDEBAR_CANDIDATE || 'view_sidebar_panels_module.js'), 'utf8'))();
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });

function mount(setTier2) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const props = { InfoTooltip: () => null, expandedTools: ['glossary'], glossaryTier2Count: 4, glossaryTier3Count: 6, glossaryDefinitionLevel: 'Same as Source Text',
    setGlossaryTier2Count: setTier2, setGlossaryTier3Count: vi.fn(), setGlossaryDefinitionLevel: vi.fn(), setIncludeEtymology: vi.fn(), setAutoRemoveWords: vi.fn(),
    setGlossaryCustomInstructions: vi.fn(), handleGenerate: vi.fn(), hasSourceOrAnalysis: true, isProcessing: false, selectedLanguages: [], t: () => '' };
  act(() => root.render(React.createElement(window.AlloModules.GlossaryPanel, props)));
  return host.querySelector('input[type="number"]');
}
const type = (input, value) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});

it('lets the box be empty while typing and saves only whole numbers', () => {
  const setTier2 = vi.fn();
  const input = mount(setTier2);
  expect(input.value).toBe('4');
  type(input, '');
  expect(input.value).toBe('');
  expect(setTier2).not.toHaveBeenCalledWith(0);
  type(input, '8');
  expect(setTier2).toHaveBeenLastCalledWith(8);
  type(input, '25');
  expect(setTier2).toHaveBeenLastCalledWith(20);
});

it('shows the saved number again when left empty', () => {
  const setTier2 = vi.fn();
  const input = mount(setTier2);
  type(input, '');
  act(() => { input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); input.dispatchEvent(new FocusEvent('blur')); });
  expect(input.value).toBe('4');
  expect(setTier2).not.toHaveBeenCalled();
});
