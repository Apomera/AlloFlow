// The assessment-plan count is a requested setting, not a nearest menu preset.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, root, host;
beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('math_fluency_module.js');
});
afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  delete window.__alloFluencyPendingConfig;
  delete window.MATH_PROBE_BANKS;
  vi.restoreAllMocks();
});

async function mount(pending) {
  window.__alloFluencyPendingConfig = { operation: 'add', at: Date.now(), ...pending };
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const addToast = vi.fn();
  await act(async () => root.render(React.createElement(window.AlloModules.MathFluency, {
    gradeLevel: '3', t: key => key, addToast, onProbeComplete: () => {}, handleScoreUpdate: () => {},
  })));
  return addToast;
}
const countSelect = () => host.querySelector('select[aria-label="Number of problems"]');
const start = () => host.querySelector('button[aria-label="Start practice"]');
async function change(el, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, String(value));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function click(el) {
  await act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

describe('assessment handoff counts', () => {
  it.each([1, 3, 25, 35, 100, 199, 200])('keeps the requested count %i selected and starts exactly that many problems', async count => {
    await mount({ problemCount: count });
    expect(countSelect().value).toBe(String(count));
    expect(Array.from(countSelect().options).some(option => option.value === String(count))).toBe(true);
    expect(start().disabled).toBe(false);
    await click(start());
    expect(host.querySelector('.mf-problem-card').getAttribute('aria-label')).toBe(`Problem 1 of ${count}`);
  });

  it.each([0, -1, 201, 500, 3.5, Infinity, NaN, true, null, 'invalid'])('requires a deliberate supported choice for invalid count %s', async count => {
    const toast = await mount({ problemCount: count });
    expect(start().disabled).toBe(true);
    expect(countSelect().value).toBe('');
    expect(countSelect().getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#mf-session-preview').textContent).not.toContain('Ready to start');
    expect(host.querySelector('#mf-session-preview').textContent).not.toContain('120 facts');
    expect(host.querySelector('#mf-handoff-count-issue').textContent).toContain('1 to 200');
    expect(toast.mock.calls.some(([message]) => message.includes('were applied'))).toBe(false);
    await click(start());
    expect(host.querySelector('.mf-problem-card')).toBeNull();
    await change(countSelect(), 120);
    expect(start().disabled).toBe(false);
    expect(host.querySelector('#mf-handoff-count-issue')).toBeNull();
    await click(start());
    expect(host.querySelector('.mf-problem-card').getAttribute('aria-label')).toBe('Problem 1 of 120');
  });

  it('accepts an integer serialized as a string without rounding', async () => {
    await mount({ problemCount: '3' });
    expect(countSelect().value).toBe('3');
  });

  it('does not block a handoff that does not specify a count', async () => {
    await mount({});
    expect(countSelect().value).toBe('120');
    expect(start().disabled).toBe(false);
  });

  it('replaces an earlier custom count on a repeated mounted handoff', async () => {
    await mount({ problemCount: 3 });
    await act(async () => {
      window.__alloFluencyPendingConfig = { problemCount: 7, at: Date.now() };
      window.dispatchEvent(new CustomEvent('alloflow:fluency-pending-config'));
    });
    expect(countSelect().value).toBe('7');
    expect(window.__alloFluencyPendingConfig).toBeUndefined();
    await click(start());
    expect(host.querySelector('.mf-problem-card').getAttribute('aria-label')).toBe('Problem 1 of 7');
  });

  it('does not treat fixed-form benchmark counts as editable practice counts', async () => {
    await mount({ mode: 'benchmark', problemCount: 500, grade: '3', form: 'A' });
    expect(countSelect().disabled).toBe(true);
    expect(host.querySelector('#mf-handoff-count-issue')).toBeNull();
  });

  it('ignores stale handoffs', async () => {
    await mount({ problemCount: 3, at: Date.now() - 120001 });
    expect(countSelect().value).toBe('120');
  });
});

describe('supported generator counts', () => {
  it('retains the count for every existing practice set and operation', () => {
    let seed = 123456789;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    });
    const generate = window.AlloModules.MathFluencyInternals.generatePracticeProblems;
    for (const operation of ['add', 'sub', 'mul', 'div', 'mixed']) {
      for (const set of ['recommended', 'basic', 'extended', 'mixed', 'within10', 'facts5']) {
        for (const count of [1, 3, 25, 199, 200]) {
          expect(generate(operation, set, '3', count).length, `${operation}/${set}/${count}`).toBe(count);
        }
      }
    }
  });
});
