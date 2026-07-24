import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'prismflow-deploy/node_modules');
let React;
let ReactDOMClient;
let act;
let axe;
let LearningHubModal;
let root;
let host;
let opener;
let outside;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_learning_hub_modal_module.js');
  LearningHubModal = window.AlloModules.LearningHubModal.LearningHubModal;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  for (const node of [host, opener, outside]) node?.remove();
  host = opener = outside = null;
  window.__alloFocusTrapStack = [];
});

describe('Learning Hub modal runtime accessibility', () => {
  it('renders all launchers with visible naming, contains focus, passes axe, and restores its opener', async () => {
    opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open learning tools';
    document.body.appendChild(opener);
    opener.focus();
    outside = document.createElement('button');
    document.body.appendChild(outside);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const setter = vi.fn();

    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open ? React.createElement(LearningHubModal, {
        setIsAlloHavenOpen: setter,
        setIsLinguaPracticeOpen: setter,
        setIsOpenGrooveOpen: setter,
        setIsReadingLibraryOpen: setter,
        setIsTestPrepHubOpen: setter,
        setIsTimelineStudioOpen: setter,
        setSelHubTab: setter,
        setShowLearningHub: setOpen,
        setShowLitLab: setter,
        setShowMindMap: setter,
        setShowPoetTree: setter,
        setShowResearchHub: setter,
        setShowSelHub: setter,
        setShowStemLab: setter,
        setShowStoryForge: setter,
        setStemLabTab: setter,
        setStemLabTool: setter,
        setLabToolData: setter,
        showLearningHub: true,
        t: () => null,
      }) : null;
    }
    await act(async () => { root.render(React.createElement(Harness)); await Promise.resolve(); });

    const dialog = host.querySelector('[role="dialog"]');
    const buttons = Array.from(dialog.querySelectorAll('button'));
    expect(buttons).toHaveLength(16);
    expect(document.activeElement).toBe(buttons[0]);
    expect(dialog.getAttribute('aria-labelledby')).toBe('learning-hub-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('learning-hub-subtitle');
    expect(buttons.find((button) => button.textContent.includes('STEM Lab')).querySelector('span[aria-hidden="true"]')).toBeTruthy();

    const results = await axe.run(dialog, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(buttons.at(-1));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(buttons[0]);
    outside.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(buttons[0]);

    window.__alloFocusTrapStack.push({ root: document.createElement('div') });
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBe(dialog);
    window.__alloFocusTrapStack.pop();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
