// Reflection prompts must fit the organizer a student is looking at.
//
// Ten of the fifteen organizer types fell through to one generic set -
// "Item or relationship / My placement / Evidence and explanation" - so a Venn
// Diagram and a Story Map asked the same structure-blind question. Each type
// teaches a different move; the reflection should ask for that move.
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

const GENERIC_LABEL = 'Item or relationship';

function mountFor(structureType) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  roots.push({ root, host });
  act(() => {
    root.render(React.createElement(window.AlloModules.ViewRenderers.OrganizerReflectionBoard, {
      resource: { id: 'r-' + structureType, type: 'outline', data: { structureType, main: 'Topic', branches: [
        { title: 'A', items: ['x'] }, { title: 'B', items: ['y'] }, { title: 'C', items: ['z'] }] } },
      learnerId: 'stu', sessionCode: 'S', isTeacherMode: false, t: null,
    }));
  });
  return host;
}
const labels = (host) => Array.from(host.querySelectorAll('textarea')).map(el => el.getAttribute('aria-label'));

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

// Types that must NOT show the generic set, with one label that proves the
// right set rendered.
const TAILORED = [
  ['Venn Diagram', 'What they share'],
  ['T-Chart', 'One column'],
  ['Fishbone', 'The effect'],
  ['Structured Outline', 'A main point'],
  ['Key Concept Map', 'A concept'],
  ['Mind Map', 'A concept'],
  ['Flow Chart', 'A step'],
  ['Process Flow / Sequence', 'A step'],
  ['Problem Solution', 'The problem'],
  ['Story Map', 'A key moment'],
  ['KWL Chart', 'What I know'],
  ['Claim-Evidence-Reasoning', 'My claim'],
  ['Cause and Effect', 'Cause and linked effect'],
  ['Frayer Model', 'My own example'],
  ['See-Think-Wonder', 'I observe'],
];

describe('reflection prompts fit the organizer', () => {
  it.each(TAILORED)('%s asks its own question', (structureType, expectedLabel) => {
    const host = mountFor(structureType);
    const seen = labels(host);
    expect(seen.length).toBe(3);
    expect(seen, structureType + ' should not use the generic prompt set').not.toContain(GENERIC_LABEL);
    expect(seen[0]).toBe(expectedLabel);
  });

  it('a Venn and a Story Map no longer ask the same question', () => {
    expect(labels(mountFor('Venn Diagram'))).not.toEqual(labels(mountFor('Story Map')));
  });

  it('keeps a generic fallback for an unrecognised organizer', () => {
    const seen = labels(mountFor('Some Future Organizer'));
    expect(seen.length).toBe(3);
    expect(seen).toContain(GENERIC_LABEL);
  });

  it('every tailored set still has exactly three writable fields', () => {
    for (const [structureType] of TAILORED) {
      expect(mountFor(structureType).querySelectorAll('textarea').length, structureType).toBe(3);
    }
  });
});
