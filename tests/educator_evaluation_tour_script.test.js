// Editable guided-tour script (2026-09-02). The built-in tour is the default;
// a district can save its own steps on the device or ship them inside a
// scenario export. Invalid scripts never break the tour: they fall back.

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
const TOUR_KEY = 'allo_educator_evaluation_tour_v1';
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
const setValue = (el, value, proto) => act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });

describe('editable tour script', () => {
  it('runs a device-saved script in place of the built-in tour, with its own step count', () => {
    localStorage.setItem(TOUR_KEY, JSON.stringify([
      { tab: 'staff', title: 'Our roster', text: 'District step one: open Staff and check the caseload.' },
      { tab: 'about', title: 'Our policy', text: 'District step two: review the approved record path.' },
    ]));
    const container = mount();
    click(button(container, /^Start a guided sample tour/));
    const tour = container.querySelector('.ae-tour');
    expect(tour.textContent).toContain('1 of 2');
    expect(tour.querySelector('#ae-tour-title').textContent).toBe('Our roster');
    expect(container.querySelector('#ae-tab-staff').getAttribute('aria-selected')).toBe('true');
    click(button(tour, /^Next/));
    expect(container.querySelector('.ae-tour').querySelector('#ae-tour-title').textContent).toBe('Our policy');
    expect(container.querySelector('#ae-tab-about').getAttribute('aria-selected')).toBe('true');
  });

  it('ignores an invalid saved script and keeps the built-in seven steps', () => {
    localStorage.setItem(TOUR_KEY, JSON.stringify([{ tab: 'nowhere', title: 'x', text: 'y' }]));
    const container = mount();
    click(button(container, /^Start a guided sample tour/));
    expect(container.querySelector('.ae-tour').textContent).toContain('1 of 7');
  });

  it('saves, validates, and restores the script from Simulation Studio', () => {
    const container = mount();
    click(button(container, /^Start a guided sample tour/));
    click(container.querySelector('#ae-tab-about'));
    const editor = container.querySelector('#ae-tour-script');
    expect(editor.textContent).toContain('Built-in');
    // Form-based: one card per step, no JSON anywhere.
    expect(editor.textContent).not.toMatch(/JSON/);
    expect(editor.querySelectorAll('.ae-tour-step-card').length).toBe(7);
    while (container.querySelector('#ae-tour-script').querySelectorAll('.ae-tour-step-card').length > 1) {
      click(button(container.querySelector('#ae-tour-script').querySelectorAll('.ae-tour-step-card')[1], /^Remove/));
    }
    const card = () => container.querySelector('#ae-tour-script').querySelector('.ae-tour-step-card');
    expect(button(card(), /^Remove/).disabled).toBe(true);
    setValue(card().querySelector('input'), '', window.HTMLInputElement.prototype);
    click(button(container.querySelector('#ae-tour-script'), /^Save tour$/));
    expect(container.querySelector('#ae-simulation-studio').textContent).toContain('Step 1 needs a title and a sentence');
    expect(localStorage.getItem(TOUR_KEY)).toBeNull();
    setValue(card().querySelector('input'), 'Only step', window.HTMLInputElement.prototype);
    setValue(card().querySelector('textarea'), 'A one-step tour for a quick demo.', window.HTMLTextAreaElement.prototype);
    act(() => { const sel = card().querySelector('select'); Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, 'overview'); sel.dispatchEvent(new Event('change', { bubbles: true })); });
    click(button(container.querySelector('#ae-tour-script'), /^Save tour$/));
    expect(JSON.parse(localStorage.getItem(TOUR_KEY))).toEqual([{ tab: 'overview', title: 'Only step', text: 'A one-step tour for a quick demo.' }]);
    click(button(container.querySelector('#ae-tour-script'), /^Add a step/));
    expect(container.querySelector('#ae-tour-script').querySelectorAll('.ae-tour-step-card').length).toBe(2);
    expect(editor.textContent).toContain('Custom');
    click(button(editor, /^Restore built-in tour/));
    expect(localStorage.getItem(TOUR_KEY)).toBeNull();
    expect(editor.textContent).toContain('Built-in');
  });

  it('is reachable from the Practice menu and the export carries it', () => {
    localStorage.setItem(TOUR_KEY, JSON.stringify([{ tab: 'overview', title: 'Only step', text: 'A one-step tour for a quick demo.' }]));
    const container = mount();
    click(button(container, /^Start a guided sample tour/));
    click(container.querySelector('[data-help-key="ae_practice_menu"]'));
    const menu = container.querySelector('#ae-practice-menu');
    expect(menu.textContent).toContain('1 guided steps across the tabs.');
    click(Array.from(menu.querySelectorAll('[role="menuitem"]')).find((b) => /Edit the tour/.test(b.textContent)));
    expect(container.querySelector('#ae-tab-about').getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('#ae-tour-script')).toBeTruthy();
    const source = readFileSync(resolve(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8');
    expect(source).toContain("scenarios: saved, tour: aeReadTourOverride() || undefined");
    expect(source).toContain('aeSanitizeTourSteps(parsed.tour)');
    expect(TOUR_KEY.startsWith('allo_educator_evaluation_')).toBe(true);
  });
});
