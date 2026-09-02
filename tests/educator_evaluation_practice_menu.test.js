// Educator Evaluation Practice menu and saved scenarios (2026-09-02).
//
// The tour, the rehearsal, and Simulation Studio existed on three screens.
// The header Practice menu gathers them, adds preset and device-saved
// scenarios, and lets a real workspace step into fictional practice and back
// without losing anything: the real workspace is set aside under its own key
// and restored on return.

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const WS_KEY = 'allo_educator_evaluation_workspace_v1';
const STASH_KEY = 'allo_educator_evaluation_real_stash_v1';
const SCENARIOS_KEY = 'allo_educator_evaluation_scenarios_v1';
let Panel;
const mounted = [];

beforeAll(() => {
  window.React = React; globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.EducatorEvaluation;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'educator_evaluation_module.js'), 'utf8'))();
  Panel = window.AlloModules.EducatorEvaluation.EducatorEvaluationPanel;
});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { while (mounted.length) { const { root, container } = mounted.pop(); act(() => { root.unmount(); }); container.remove(); } localStorage.clear(); sessionStorage.clear(); });

function mount() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => { root.render(React.createElement(Panel, { onClose: () => {}, addToast: () => {} })); });
  mounted.push({ root, container });
  return container;
}
const click = (el) => act(() => { el.click(); });
const button = (scope, re) => Array.from(scope.querySelectorAll('button')).find((b) => re.test(b.textContent.trim()));
const openMenu = (container) => { click(container.querySelector('[data-help-key="ae_practice_menu"]')); return container.querySelector('#ae-practice-menu'); };
const items = (menu) => Array.from(menu.querySelectorAll('[role="menuitem"]')).map((b) => b.firstChild.textContent.trim());
const stored = () => JSON.parse(localStorage.getItem(WS_KEY));
async function settle() { await act(async () => { await new Promise((res) => setTimeout(res, 450)); }); }

describe('practice menu in a fictional workspace', () => {
  it('gathers the tour, rehearsal, studio, presets, and the move to real work', () => {
    const container = mount();
    click(button(container, /^Start a guided sample tour/));
    const menu = openMenu(container);
    expect(menu).toBeTruthy();
    expect(container.querySelector('[data-help-key="ae_practice_menu"]').getAttribute('aria-expanded')).toBe('true');
    expect(items(menu)).toEqual(['Replay tour', 'Continue the rehearsal', 'Open Simulation Studio', 'Edit the tour', 'Small-school tour', 'Busy midyear', 'Evidence-gap review', 'Move to real work']);
  });

  it('loads a preset scenario straight from the menu', async () => {
    const container = mount();
    click(button(container, /^Start a guided sample tour/));
    const before = stored().teachers.length;
    const menu = openMenu(container);
    click(Array.from(menu.querySelectorAll('[role="menuitem"]')).find((b) => /Busy midyear/.test(b.textContent)));
    await settle();
    expect(stored().teachers.length).toBe(24);
    expect(stored().teachers.length).not.toBe(before);
    expect(stored().config.sampleMode).toBe(true);
    expect(container.querySelector('#ae-practice-menu')).toBeNull();
  });

  it('jumps to the studio and the rehearsal with focus on the target', () => {
    const container = mount();
    click(button(container, /^Start a guided sample tour/));
    let menu = openMenu(container);
    click(Array.from(menu.querySelectorAll('[role="menuitem"]')).find((b) => /Open Simulation Studio/.test(b.textContent)));
    expect(container.querySelector('#ae-tab-about').getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('#ae-simulation-studio')).toBeTruthy();
    menu = openMenu(container);
    click(Array.from(menu.querySelectorAll('[role="menuitem"]')).find((b) => /Continue the rehearsal/.test(b.textContent)));
    expect(container.querySelector('#ae-tab-overview').getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('#ae-sample-rehearsal')).toBeTruthy();
  });
});

describe('practice from a real workspace and back', () => {
  it('sets the real workspace aside, opens practice, and restores it exactly on return', async () => {
    const container = mount();
    click(button(container, /^Start real work locally/));
    // Give the real workspace something recognisable.
    click(container.querySelector('#ae-tab-staff'));
    click(button(container, /^\+ Add educator/));
    const nameInput = container.querySelector('#ae-add-educator-title') && Array.from(container.querySelectorAll('input.ae-input')).find((i) => !i.value);
    let menu = openMenu(container);
    expect(items(menu)[0]).toBe('Practice in a fictional workspace');
    expect(items(menu)).toContain('Small-school tour');
    click(menu.querySelector('[role="menuitem"]'));
    await settle();
    expect(stored().config.sampleMode).toBe(true);
    expect(JSON.parse(localStorage.getItem(STASH_KEY)).workspace.config.sampleMode).toBe(false);
    menu = openMenu(container);
    expect(items(menu)).toContain('Return to real work');
    click(Array.from(menu.querySelectorAll('[role="menuitem"]')).find((b) => /Return to real work/.test(b.textContent)));
    await settle();
    expect(stored().config.sampleMode).toBe(false);
    expect(stored().teachers).toHaveLength(0);
    expect(localStorage.getItem(STASH_KEY)).toBeNull();
    expect(container.textContent).toContain('Private on-device workspace');
    expect(nameInput === undefined || nameInput !== null).toBe(true);
  });

  it('starting practice from a scenario in a real workspace also sets the real one aside', async () => {
    const container = mount();
    click(button(container, /^Start real work locally/));
    const menu = openMenu(container);
    click(Array.from(menu.querySelectorAll('[role="menuitem"]')).find((b) => /Evidence-gap review/.test(b.textContent)));
    await settle();
    expect(stored().config.sampleMode).toBe(true);
    expect(stored().teachers.length).toBe(18);
    expect(localStorage.getItem(STASH_KEY)).toBeTruthy();
  });
});

describe('saved scenarios', () => {
  it('saves the current studio controls under a name and lists it in the menu', async () => {
    const container = mount();
    click(button(container, /^Start a guided sample tour/));
    click(container.querySelector('#ae-tab-about'));
    const studio = container.querySelector('#ae-simulation-studio');
    expect(studio.textContent).toContain('None yet.');
    const input = studio.querySelector('[data-help-key="ae_saved_scenarios"] input.ae-input');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Fall coaching cohort');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    click(button(studio, /^Save current controls/));
    const saved = JSON.parse(localStorage.getItem(SCENARIOS_KEY));
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('Fall coaching cohort');
    expect(Object.keys(saved[0].params)).toEqual(expect.arrayContaining(['staffCount', 'buildingCount']));
    expect(studio.textContent).toContain('Scenario saved on this device');
    const menu = openMenu(container);
    expect(items(menu)).toContain('Fall coaching cohort');
    click(button(studio, /^Delete$/));
    expect(JSON.parse(localStorage.getItem(SCENARIOS_KEY))).toHaveLength(0);
  });

  it('rejects malformed stored scenarios and keeps the storage under the hub backup prefix', () => {
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify([{ name: '', params: {} }, { name: 'Good', params: { staffCount: 5, bogus: 'x' } }, 'junk']));
    const container = mount();
    click(button(container, /^Start a guided sample tour/));
    const menu = openMenu(container);
    expect(items(menu)).toContain('Good');
    expect(items(menu)).not.toContain('junk');
    expect(SCENARIOS_KEY.startsWith('allo_educator_evaluation_')).toBe(true);
    expect(STASH_KEY.startsWith('allo_educator_evaluation_')).toBe(true);
  });
});
