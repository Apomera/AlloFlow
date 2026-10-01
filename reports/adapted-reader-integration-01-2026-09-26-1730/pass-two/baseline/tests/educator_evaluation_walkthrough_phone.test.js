// Educator Evaluation: phone-first walkthrough form (2026-09-02).
//
// Principals record walkthroughs standing in classrooms. Below 640px the form
// is one column, inputs are 16px (no iOS zoom) and 48px tall, evidence-tag
// rows are 44px with 24px checkboxes, quick-length presets set the duration
// with one tap, and the save bar sticks to the bottom within thumb reach.

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
const source = readFileSync(resolve(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8');
const styles = source.slice(source.indexOf('const AE_STYLES = `'), source.indexOf('`;', source.indexOf('const AE_STYLES = `')));

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

describe('phone-first walkthrough form', () => {
  it('quick-length presets set the duration with one tap and reflect the current value', () => {
    const container = mount();
    // Blank workspace: the sample's guided tour selects an educator whose cycle can be
    // finalized, which hides the form; the blank path always offers it.
    click(button(container, /^Start real work locally/));
    click(container.querySelector('#ae-tab-walkthroughs'));
    const buttons = Array.from(container.querySelectorAll('button'));
    const opener = buttons.find((b) => /Start walkthrough/.test(b.textContent));
    expect(opener, 'form opener among: ' + buttons.map((b) => b.textContent.trim().slice(0, 30)).join(' | ')).toBeTruthy();
    click(opener);
    const form = container.querySelector('.ae-walk-form');
    expect(form).toBeTruthy();
    const quick = form.querySelectorAll('.ae-walk-quick button');
    expect(Array.from(quick).map((b) => b.textContent)).toEqual(['5 min', '8 min', '10 min', '15 min']);
    const duration = form.querySelector('input[type="number"]');
    expect(duration.value).toBe('8');
    expect(quick[1].getAttribute('aria-pressed')).toBe('true');
    click(quick[3]);
    expect(duration.value).toBe('15');
    expect(quick[3].getAttribute('aria-pressed')).toBe('true');
    expect(quick[1].getAttribute('aria-pressed')).toBe('false');
    expect(duration.getAttribute('inputmode')).toBe('numeric');
    expect(form.querySelector('.ae-walk-actions')).toBeTruthy();
  });

  it('the small-screen rules give one column, 16px inputs, 44px tag rows, and a sticky save bar', () => {
    const phone = styles.slice(styles.indexOf('.ae-walk-form .ae-form-grid{grid-template-columns:1fr}'));
    expect(styles).toContain('@media(max-width:640px){.ae-walk-form .ae-form-grid{grid-template-columns:1fr}');
    expect(phone).toContain('.ae-walk-form .ae-input,.ae-walk-form .ae-select,.ae-walk-form .ae-textarea{min-height:48px;font-size:16px}');
    expect(phone).toContain('.ae-walk-form .ae-domain-component{padding:10px 0;font-size:14px;align-items:center;min-height:44px}');
    expect(phone).toContain('.ae-walk-form .ae-domain-component input{width:24px;height:24px');
    expect(phone).toContain('.ae-walk-form .ae-walk-actions{position:sticky;bottom:0;background:var(--ae-white)');
    expect(phone).toContain('.ae-walk-form .ae-walk-actions .ae-btn{flex:1 1 auto;min-height:48px}');
  });
});
