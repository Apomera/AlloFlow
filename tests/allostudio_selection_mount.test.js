// AlloStudio REAL-REACT mount smoke, plus an honest note about its ceiling.
//
// Context: the 188 pure-core AlloStudio tests all passed while shipping a crash
// that unmounted the whole editor. `var colorField = function ...` was assigned
// ~110 lines BELOW a render path that called it, so selecting a text or shape
// object threw "colorField is not a function".
//
// WHAT THIS FILE COVERS: the module registers, mounts under real React 18, and
// gets through the template picker without a caught render error.
//
// WHAT IT DOES NOT COVER: the properties panel, which is where the crash lived.
// Reaching it needs a SELECTED object, and selection in this editor happens
// through pointer math on absolutely-positioned canvas children — jsdom reports
// every element as zero-sized, so the hit-testing never resolves. Driving that
// is a real piece of work, not a step, and a test that merely LOOKS like it
// selects something is worse than none: this exact test passed against the
// broken module before the assertion was removed.
//
// The guard that actually covers the defect class is the static scan in
// tests/studio_var_use_before_assign.test.js, which finds the real bug in the
// pre-fix file and reports clean after it.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const roots = [];
let AlloStudio;

beforeAll(() => {
  globalThis.React = React;
  globalThis.window.React = React;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'studio_module.js'), 'utf8'))();
  AlloStudio = window.AlloModules.AlloStudio;
  if (typeof AlloStudio !== 'function') throw new Error('AlloStudio did not register as a component');
});

afterEach(() => {
  for (const { root, host } of roots.splice(0)) {
    act(() => root.unmount());
    host.remove();
  }
});

// React swallows render throws into the console at error level, so anything
// logged there is a failure even when a boundary hides the crash.
function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const errors = [];
  const realError = console.error;
  console.error = (...args) => { errors.push(args.map(String).join(' ')); };
  const root = ReactDOMClient.createRoot(host);
  try {
    act(() => {
      root.render(React.createElement(AlloStudio, { t: (key) => key, addToast: () => {}, onClose: () => {} }));
    });
  } finally {
    console.error = realError;
  }
  roots.push({ root, host });
  return { host, errors, restoreOff: realError };
}

const buttons = (host) => Array.from(host.querySelectorAll('button'));

function clickCapturingErrors(el) {
  const realError = console.error;
  const seen = [];
  console.error = (...args) => { seen.push(args.map(String).join(' ')); };
  try {
    act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
  } finally {
    console.error = realError;
  }
  return seen;
}

describe('AlloStudio real-React mount', () => {
  it('mounts and renders its template picker', () => {
    const { host, errors } = mount();
    expect(buttons(host).length).toBeGreaterThan(20);
    expect(errors.filter((e) => /is not a function|Cannot read propert/.test(e))).toEqual([]);
  });

  it('loads a template without a caught render error', () => {
    const { host } = mount();
    const use = buttons(host).find((b) => /use_template/.test(b.textContent || ''));
    expect(use, 'no "use template" button found — the picker markup changed').toBeTruthy();
    const errors = clickCapturingErrors(use);
    expect(errors.filter((e) => /is not a function|Cannot read propert/.test(e))).toEqual([]);
    // Taking a template moves past the picker into the editor chrome.
    expect(buttons(host).length).toBeGreaterThan(60);
  });
});
