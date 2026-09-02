// Educator Evaluation first-run weight (2026-09-02).
//
// The Google Form this tool replaces takes two minutes to start. Before this
// pass the onboarding recommended a seven-step guided sample, the Overview's
// launch card only switched to the Staff tab, and four banners stacked above
// the tabs. Now real work is the recommended, focused option; the launch card
// opens the add-educator form directly; and the mode, save state, and notices
// share one status row with a Details toggle.

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

let Panel;
const mounted = [];

beforeAll(() => {
  window.React = React;
  globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.EducatorEvaluation;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'educator_evaluation_module.js'), 'utf8'))();
  Panel = window.AlloModules.EducatorEvaluation.EducatorEvaluationPanel;
});

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => {
  while (mounted.length) { const { root, container } = mounted.pop(); act(() => { root.unmount(); }); container.remove(); }
  localStorage.clear(); sessionStorage.clear();
});

function mount() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => { root.render(React.createElement(Panel, { onClose: () => {}, addToast: () => {} })); });
  mounted.push({ root, container });
  return container;
}
function button(container, text) {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim().startsWith(text));
}
function click(el) { act(() => { el.click(); }); }

describe('onboarding', () => {
  it('keeps the same three options and labels but recommends and focuses real work', () => {
    const container = mount();
    const options = Array.from(container.querySelectorAll('.ae-onboarding-option'));
    expect(options.map((o) => o.querySelector('strong').textContent)).toEqual(['Start a guided sample tour', 'Start real work locally', 'Choose a record path']);
    expect(options[1].classList.contains('ae-onboarding-option-primary')).toBe(true);
    expect(options[1].textContent).toMatch(/Recommended · start in two minutes/);
    expect(options[0].textContent).toMatch(/Try it first with fictional data/);
    expect(options[0].textContent).not.toMatch(/Recommended/);
    // Initial focus lands on the recommended option (the shell's focus trap may
    // re-home focus in jsdom, so pin the ref in source rather than activeElement).
    const source = readFileSync(resolve(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8');
    expect(source).toContain("ref={firstRef} className=\"ae-onboarding-option ae-onboarding-option-primary\" onClick={() => onChoose('blank')}");
    expect(source).not.toContain("ref={firstRef} className=\"ae-onboarding-option\" onClick={() => onChoose('sample')}");
  });
});

describe('the launch card opens the add-educator form', () => {
  it('goes straight to a focused add form instead of just the Staff tab', () => {
    const container = mount();
    click(button(container, 'Start real work locally'));
    expect(container.textContent).toContain('Set up your first real cycle');
    // The record path is the first readiness step, so the add-educator door is
    // a standing secondary action on the launch card rather than the next-step button.
    const primary = Array.from(container.querySelectorAll('.ae-actions button')).find((b) => /Add my first educator/i.test(b.textContent));
    expect(primary, 'launch card add-educator action').toBeTruthy();
    click(primary);
    expect(container.querySelector('#ae-tab-staff').getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('#ae-add-educator-title')).toBeTruthy();
  });
});

describe('one status row', () => {
  it('shows mode and save state on one line, tucks the explanation behind Details, and carries notices inline', () => {
    const container = mount();
    click(button(container, 'Start real work locally'));
    const banner = container.querySelector('.ae-local-banner');
    expect(banner.textContent).toContain('Private on-device workspace');
    expect(banner.textContent).toMatch(/Saved on this device|Not saved yet|Saving/);
    const details = banner.querySelector('#ae-banner-details');
    expect(details.hidden).toBe(true);
    const toggle = banner.querySelector('.ae-banner-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    click(toggle);
    expect(details.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    // The start notice rides inside the row, not as a second strip.
    expect(banner.querySelector('.ae-inline-notice').textContent).toContain('Blank workspace started');
    expect(container.querySelector('.ae-operation-notice')).toBeNull();
    click(button(banner, 'Dismiss'));
    expect(banner.querySelector('.ae-inline-notice')).toBeNull();
  });

  it('never stacks more than the status row and the tour above the tabs on first run', () => {
    const container = mount();
    click(button(container, 'Start real work locally'));
    const workspace = container.querySelector('.ae-workspace');
    const tabs = workspace.querySelector('.ae-tabs');
    let strips = 0;
    for (let node = tabs.previousElementSibling; node; node = node.previousElementSibling) {
      if (node.tagName !== 'HEADER') strips += 1;
    }
    expect(strips).toBeLessThanOrEqual(1);
  });
});
