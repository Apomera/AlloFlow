// KWL carry-over: the "Import my earlier KWL notes" offer must be reachable.
//
// The reader for `alloflow_kwl_notes_<hash>` shipped with NOTHING writing that
// key - one getItem in the whole repo, no setItem - so the import button could
// never appear. A KWL revisited in a later session starts empty because the
// draft key (organizerReflectionKey) includes sessionCode, which is exactly the
// gap this offer exists to bridge.
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

const RESOURCE = {
  id: 'res-kwl-1',
  type: 'outline',
  data: {
    structureType: 'KWL Chart',
    main: 'Volcanoes',
    branches: [
      { title: 'What I know', items: [] },
      { title: 'What I want to know', items: [] },
      { title: 'What I learned', items: [] },
    ],
  },
};

function mount(props = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  roots.push({ root, host });
  act(() => {
    root.render(React.createElement(window.AlloModules.ViewRenderers.OrganizerReflectionBoard, {
      resource: RESOURCE, learnerId: 'stu-1', sessionCode: 'S1', isTeacherMode: false, t: null, ...props,
    }));
  });
  return host;
}
const textareas = (host) => Array.from(host.querySelectorAll('textarea'));
const type = (el, value) => act(() => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const kwlKeys = () => Object.keys(window.localStorage).filter(k => k.startsWith('alloflow_kwl_notes_'));

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

describe('KWL carry-over between sessions', () => {
  it('exposes the reflection board', () => {
    expect(window.AlloModules.ViewRenderers?.OrganizerReflectionBoard).toBeTruthy();
  });

  it('writes topic-scoped notes as the student types', () => {
    const host = mount();
    expect(kwlKeys()).toHaveLength(0);
    type(textareas(host)[0], 'Lava is hot');
    expect(kwlKeys()).toHaveLength(1);
    expect(JSON.parse(window.localStorage.getItem(kwlKeys()[0]))[0]).toBe('Lava is hot');
  });

  it('offers the import in a LATER session, which is the gap it exists for', () => {
    const first = mount({ sessionCode: 'S1' });
    type(textareas(first)[0], 'Lava is hot');
    type(textareas(first)[1], 'Why do they erupt?');
    act(() => { roots.pop().root.unmount(); });

    // Different sessionCode => different draft key => empty fields.
    const later = mount({ sessionCode: 'S2' });
    expect(textareas(later).every(el => el.value === '')).toBe(true);
    const importBtn = Array.from(later.querySelectorAll('button')).find(b => /import/i.test(b.textContent));
    expect(importBtn, 'import offer should appear in the later session').toBeTruthy();

    act(() => { importBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    const values = textareas(later).map(el => el.value);
    expect(values[0]).toBe('Lava is hot');
    expect(values[1]).toBe('Why do they erupt?');
  });

  it('does not offer an import when nothing was written before', () => {
    const host = mount({ sessionCode: 'S9' });
    const importBtn = Array.from(host.querySelectorAll('button')).find(b => /import/i.test(b.textContent));
    expect(importBtn).toBeFalsy();
  });

  it('a teacher preview never seeds a student import', () => {
    const preview = mount({ isTeacherMode: true, sessionCode: 'T1' });
    type(textareas(preview)[0], 'Teacher sample answer');
    expect(kwlKeys(), 'teacher preview must not write carry-over notes').toHaveLength(0);
  });
});
