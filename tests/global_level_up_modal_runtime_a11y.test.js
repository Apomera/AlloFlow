import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let axe;
let GlobalLevelUpModal;
let root;
let host;
let opener;
let outside;

const t = (key, vars) => ({
  'common.new_badge': 'New badge',
  'common.xp': 'XP',
  'feedback.level_up_title': 'Level up',
  'feedback.level_reached': `You reached level ${vars?.level}`,
  'feedback.next_milestone': 'Next milestone',
  'feedback.continue_learning': 'Continue learning',
}[key] || key);

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_global_level_up_module.js');
  GlobalLevelUpModal = window.AlloModules.GlobalLevelUpModal.GlobalLevelUpModal;
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

describe('Global level-up modal runtime accessibility', () => {
  it('owns topmost focus, passes axe, and restores its connected opener', async () => {
    opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open level celebration';
    document.body.appendChild(opener);
    opener.focus();
    outside = document.createElement('button');
    document.body.appendChild(outside);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open ? React.createElement(GlobalLevelUpModal, {
        AnimatedNumber: ({ value }) => React.createElement('span', null, value),
        ConfettiExplosion: () => React.createElement('span', null, 'confetti'),
        adventureState: { level: 4, xp: 40, xpToNextLevel: 100 },
        handleSetShowGlobalLevelUpToFalse: () => setOpen(false),
        t,
      }) : null;
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="dialog"]');
    const action = dialog.querySelector('button');
    expect(document.activeElement).toBe(action);
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(dialog);

    const axeResults = await axe.run(dialog, { rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    } });
    expect(axeResults.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical'))
      .toEqual([]);

    outside.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(action);

    window.__alloFocusTrapStack.push({ root: document.createElement('div') });
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBe(dialog);
    window.__alloFocusTrapStack.pop();

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(window.__alloFocusTrapStack).toEqual([]);
  });
});
