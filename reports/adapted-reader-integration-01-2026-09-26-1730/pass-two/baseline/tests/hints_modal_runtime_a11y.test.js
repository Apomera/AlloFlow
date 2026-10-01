import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let axe;
let HintsModal;
let root;
let host;
let opener;
let outside;

const labels = {
  'common.close': 'Close hints',
  'hints.title': 'Teaching hints',
  'hints.synthesizing': 'Generating lesson ideas',
  'hints.empty_state': 'No hints yet',
  'hints.save_to_history': 'Save to history',
  'hints.apply_brainstorm_tooltip': 'Apply this brainstorm',
  'hints.apply_brainstorm': 'Apply brainstorm',
  'hints.generate_extensions': 'Generate lesson ideas',
};
const t = (key) => labels[key] || key;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_hints_modal_module.js');
  HintsModal = window.AlloModules.HintsModal.HintsModal;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  for (const node of [host, opener, outside]) node?.remove();
  host = opener = outside = null;
  window.__alloFocusTrapStack = [];
});

function createFixture() {
  opener = document.createElement('button');
  opener.type = 'button';
  opener.textContent = 'Open hints';
  document.body.appendChild(opener);
  opener.focus();

  outside = document.createElement('button');
  outside.type = 'button';
  outside.textContent = 'Outside control';
  document.body.appendChild(outside);

  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
}

describe('Hints modal runtime accessibility', () => {
  it('contains focus, preserves visible action names, passes axe, and restores its opener', async () => {
    createFixture();

    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open ? React.createElement(HintsModal, {
        handleApplyHint: vi.fn(),
        handleGenerateLessonIdeas: vi.fn(),
        handleSaveExtensionToHistory: vi.fn(),
        handleSetShowHintsModalToFalse: () => setOpen(false),
        hintHistory: [
          { id: 'extension', isExtension: true, tool: 'Extension', text: 'Try a visual timeline.', timestamp: Date.now() },
          { id: 'brainstorm', isExtension: false, tool: 'Brainstorm', text: 'Invite student examples.', timestamp: Date.now() },
        ],
        history: [{ id: 'lesson' }],
        isGeneratingExtension: false,
        renderFormattedText: (text) => text,
        t,
      }) : null;
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="dialog"]');
    const controls = Array.from(dialog.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    const save = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent.includes('Save to history'));
    expect(document.activeElement).toBe(first);
    expect(save.getAttribute('aria-label')).toBeNull();
    expect(save.textContent).toContain('Save to history');
    expect(dialog.querySelector('[role="region"]').getAttribute('aria-label')).toBe('Teaching hints');

    const axeResults = await axe.run(dialog, { rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    } });
    const serious = axeResults.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`);
    expect(serious).toEqual([]);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', shiftKey: true, bubbles: true,
    })));
    expect(document.activeElement).toBe(last);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', bubbles: true,
    })));
    expect(document.activeElement).toBe(first);

    outside.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', bubbles: true,
    })));
    expect(document.activeElement).toBe(first);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true,
    })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(window.__alloFocusTrapStack).toEqual([]);
  });
});
