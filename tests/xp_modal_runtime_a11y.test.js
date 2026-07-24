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
let XPModal;
let root;
let host;
let opener;
let outside;

const t = (key) => ({
  'common.close': 'Close level progress',
  'common.progress': 'Level progress',
  'student_dashboard.level_abbr': 'Level',
  'student_dashboard.level_progress': 'Level progress',
  'student_dashboard.total_xp': 'Total XP',
  'student_dashboard.no_activities': 'No recent activities',
}[key] || key);

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_xp_modal_module.js');
  XPModal = window.AlloModules.XPModal.XPModal;
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
  opener.textContent = 'Open level progress';
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

describe('XP modal runtime accessibility', () => {
  it('contains focus, yields to a nested trap, passes axe, and restores its opener', async () => {
    createFixture();

    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open ? React.createElement(XPModal, {
        currentLevelXP: 125,
        globalLevel: 3,
        globalPoints: 625,
        globalProgress: 50,
        globalXPNext: 250,
        handleSetShowXPModalToFalse: () => setOpen(false),
        pointHistory: [{ id: 'earned-1', activity: 'Completed lesson', points: 25, timestamp: Date.now() }],
        t,
      }) : null;
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="dialog"]');
    const close = dialog.querySelector('button[aria-label]');
    const history = dialog.querySelector('ul');
    expect(document.activeElement).toBe(close);
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(dialog);

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
    expect(document.activeElement).toBe(history);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', bubbles: true,
    })));
    expect(document.activeElement).toBe(close);

    outside.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', bubbles: true,
    })));
    expect(document.activeElement).toBe(close);

    const nestedTrap = { root: document.createElement('div') };
    window.__alloFocusTrapStack.push(nestedTrap);
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true,
    })));
    expect(host.querySelector('[role="dialog"]')).toBe(dialog);

    window.__alloFocusTrapStack.pop();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true,
    })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(window.__alloFocusTrapStack).toEqual([]);
  });
});
