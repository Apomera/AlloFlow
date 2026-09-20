// The learner feedback panel must not appear before there is work to give
// feedback ON.
//
// It rendered on `!isTeacherMode && reflectionRequest` alone, so a student who
// had written nothing saw "Feedback on your reflections" and "No teacher
// feedback yet. You can keep revising your draft." - about a draft they had not
// started. It also started useOrganizerInbox, which polls the teacher endpoint
// every 8 seconds, for every student who merely OPENED the activity.
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
const feedbackPanel = (host) => Array.from(host.querySelectorAll('section'))
  .find(el => /Feedback on your reflections/i.test(el.getAttribute('aria-label') || ''));
const type = (el, value) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});

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

describe('learner feedback panel gating', () => {
  it('is hidden before anything is submitted', () => {
    const request = vi.fn(async () => ({ reflections: [] }));
    const host = mount({ reflectionRequest: request });
    expect(feedbackPanel(host)).toBeFalsy();
  });

  it('does not poll the teacher endpoint before a submission', () => {
    const request = vi.fn(async () => ({ reflections: [] }));
    mount({ reflectionRequest: request });
    expect(request, 'no inbox request should fire for an unsubmitted draft').not.toHaveBeenCalled();
  });

  it('typing a draft alone still does not open the panel', () => {
    const request = vi.fn(async () => ({ reflections: [] }));
    const host = mount({ reflectionRequest: request });
    type(host.querySelectorAll('textarea')[0], 'some thinking');
    expect(feedbackPanel(host)).toBeFalsy();
    expect(request).not.toHaveBeenCalled();
  });

  it('appears once a reflection has been submitted', async () => {
    const request = vi.fn(async () => ({ reflections: [] }));
    const onSubmit = vi.fn(async () => ({ ok: true, revision: 1 }));
    const host = mount({ reflectionRequest: request, onSubmit });
    type(host.querySelectorAll('textarea')[0], 'my answer');
    const submit = Array.from(host.querySelectorAll('button')).find(b => /submit reflection/i.test(b.textContent));
    expect(submit).toBeTruthy();
    await act(async () => { submit.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    expect(onSubmit).toHaveBeenCalled();
    expect(feedbackPanel(host), 'panel should appear after submitting').toBeTruthy();
  });

  it('teacher preview never shows the learner panel', () => {
    const request = vi.fn(async () => ({ reflections: [] }));
    const host = mount({ reflectionRequest: request, isTeacherMode: true });
    expect(feedbackPanel(host)).toBeFalsy();
  });
});
