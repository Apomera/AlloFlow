// A failed submission must be announced as a failure.
//
// Success and failure both went through one role="status" aria-live="polite"
// line, so a screen-reader user heard "Submission failed. Your draft is still
// here." exactly as softly as "Reflection submitted." - no signal that anything
// had gone wrong. This component already uses role="alert" + red text for the
// storage failure; the submit notice now matches that convention.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
class RO { observe() {} unobserve() {} disconnect() {} }
const roots = [];
const RESOURCE = { id: 'r1', type: 'outline', data: { structureType: 'Venn Diagram', main: 'T', branches: [
  { title: 'A', items: ['x'] }, { title: 'B', items: ['y'] }, { title: 'C', items: ['z'] }] } };

function mount(props = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  roots.push({ root, host });
  act(() => {
    root.render(React.createElement(window.AlloModules.ViewRenderers.OrganizerReflectionBoard, {
      resource: RESOURCE, learnerId: 'stu', sessionCode: 'S1', isTeacherMode: false, t: null, ...props,
    }));
  });
  return host;
}
const type = (el, value) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const submitBtn = (host) => Array.from(host.querySelectorAll('button')).find(b => /submit reflection|submit revision|save reflection/i.test(b.textContent));
const alerts = (host) => Array.from(host.querySelectorAll('[role="alert"]')).map(el => el.textContent);
const statuses = (host) => Array.from(host.querySelectorAll('[role="status"]')).map(el => el.textContent);

beforeAll(() => {
  globalThis.ResizeObserver = RO; window.ResizeObserver = RO;
  window.React = React; globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'view_renderers_module.js'), 'utf8'))();
});
afterEach(() => {
  while (roots.length) { const { root, host } = roots.pop(); act(() => root.unmount()); host.remove(); }
  window.localStorage.clear();
});

describe('submission failure is announced as a failure', () => {
  it('a rejected submission renders role="alert"', async () => {
    const host = mount({ onSubmit: async () => { throw new Error('The class mailbox did not respond.'); } });
    type(host.querySelectorAll('textarea')[0], 'my answer');
    await act(async () => { submitBtn(host).dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    expect(alerts(host).join(' ')).toMatch(/did not respond/);
  });

  it('the failure is NOT left in a polite status line', async () => {
    const host = mount({ onSubmit: async () => { throw new Error('Network unreachable.'); } });
    type(host.querySelectorAll('textarea')[0], 'my answer');
    await act(async () => { submitBtn(host).dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    expect(statuses(host).join(' ')).not.toMatch(/Network unreachable/);
  });

  it('an ok:false result is a failure too, not a success notice', async () => {
    const host = mount({ onSubmit: async () => ({ ok: false, message: 'Your teacher ended the session.' }) });
    type(host.querySelectorAll('textarea')[0], 'my answer');
    await act(async () => { submitBtn(host).dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    expect(alerts(host).join(' ')).toMatch(/ended the session/);
  });

  it('a successful submission stays a polite status', async () => {
    const host = mount({ onSubmit: async () => ({ ok: true, revision: 1 }) });
    type(host.querySelectorAll('textarea')[0], 'my answer');
    await act(async () => { submitBtn(host).dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    expect(statuses(host).join(' ')).toMatch(/submitted/i);
    expect(alerts(host).join(' ')).not.toMatch(/submitted/i);
  });

  it('a successful retry clears the earlier alert', async () => {
    let fail = true;
    const host = mount({ onSubmit: async () => { if (fail) throw new Error('Temporary outage.'); return { ok: true, revision: 1 }; } });
    type(host.querySelectorAll('textarea')[0], 'my answer');
    await act(async () => { submitBtn(host).dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    expect(alerts(host).join(' ')).toMatch(/Temporary outage/);
    fail = false;
    await act(async () => { submitBtn(host).dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    expect(alerts(host).join(' '), 'stale failure must not persist after a good retry').not.toMatch(/Temporary outage/);
    expect(statuses(host).join(' ')).toMatch(/submitted/i);
  });

  it('the draft survives a failed submission', async () => {
    const host = mount({ onSubmit: async () => { throw new Error('Nope.'); } });
    type(host.querySelectorAll('textarea')[0], 'words I do not want to lose');
    await act(async () => { submitBtn(host).dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    expect(host.querySelectorAll('textarea')[0].value).toBe('words I do not want to lose');
  });
});
