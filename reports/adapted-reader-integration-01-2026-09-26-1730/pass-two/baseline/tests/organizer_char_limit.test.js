// The 2000-character cap was silent.
//
// maxLength stops typing dead with no explanation, and a paste over the limit
// is truncated without a word - a student can lose the end of an answer and
// never be told. The counter appears only in the last 200 characters so it is
// not noise for ordinary answers, and announcement is coarse on purpose: a
// live per-keystroke count would make a screen reader read a number after
// every letter.
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
class RO { observe() {} unobserve() {} disconnect() {} }
const roots = [];
const MAX = 2000, WARN = 200;
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
const firstBox = (host) => host.querySelectorAll('textarea')[0];
const liveText = (host) => Array.from(host.querySelectorAll('.sr-only[role="status"]')).map(el => el.textContent).join(' ');

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

describe('reflection character limit is visible', () => {
  it('stays quiet for an ordinary answer', () => {
    const host = mount();
    type(firstBox(host), 'a'.repeat(100));
    expect(host.textContent).not.toMatch(/characters left/);
    expect(liveText(host)).toBe('');
  });

  it('shows the remaining count inside the warning band', () => {
    const host = mount();
    type(firstBox(host), 'a'.repeat(MAX - 50));
    expect(host.textContent).toMatch(/50 characters left/);
  });

  it('does not show the count one character before the band', () => {
    const host = mount();
    type(firstBox(host), 'a'.repeat(MAX - WARN - 1));
    expect(host.textContent).not.toMatch(/characters left/);
  });

  it('says the limit is reached, not "0 characters left"', () => {
    const host = mount();
    type(firstBox(host), 'a'.repeat(MAX));
    expect(host.textContent).toMatch(/reached the 2000-character limit/);
    expect(host.textContent).not.toMatch(/0 characters left/);
  });

  it('ties the count to its box with aria-describedby only when shown', () => {
    const host = mount();
    expect(firstBox(host).getAttribute('aria-describedby')).toBeNull();
    type(firstBox(host), 'a'.repeat(MAX - 10));
    const id = firstBox(host).getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(host.querySelector('#' + id).textContent).toMatch(/10 characters left/);
  });

  it('announces coarsely - a threshold, never a per-keystroke number', () => {
    const host = mount();
    type(firstBox(host), 'a'.repeat(MAX - 50));
    const near = liveText(host);
    expect(near).toMatch(/close to its character limit/);
    expect(near, 'the live region must not read a count').not.toMatch(/\d/);
    type(firstBox(host), 'a'.repeat(MAX));
    expect(liveText(host)).toMatch(/reached its character limit/);
  });

  it('the cap still truncates a long paste rather than accepting it', () => {
    const host = mount();
    type(firstBox(host), 'a'.repeat(MAX));
    expect(firstBox(host).value.length).toBe(MAX);
    expect(firstBox(host).getAttribute('maxlength')).toBe(String(MAX));
  });

  it('counts each box independently', () => {
    const host = mount();
    const boxes = host.querySelectorAll('textarea');
    type(boxes[0], 'a'.repeat(MAX - 5));
    expect(boxes[1].getAttribute('aria-describedby'), 'an untouched box must not warn').toBeNull();
  });
});
