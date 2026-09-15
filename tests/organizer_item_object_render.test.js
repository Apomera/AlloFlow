// Visual-organizer branch items are text by the time a renderer sees them (2026-09-15).
//
// The Curriculum Audit crashed on 2026-09-13 because an AI list entry arrived as an object and
// React throws on an object child. The same shape reaches the organizer renderers: several sites
// render `{item}` as a list-item child, and a model that returns `{text: "…"}` entries would take
// the organizer down through the content-viewer boundary. `normalizeVisualOrganizerData` now
// coerces every branch item to text; this test drives the REAL cause-and-effect renderer under
// real react-dom with that shape, and proves the same markup crashes without the coercion.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const renderer = readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');

const normalizerStart = renderer.indexOf('const VISUAL_ORGANIZER_SECTION_SPECS');
const normalizerEnd = renderer.indexOf('const FlowTopologyBoard', normalizerStart);
if (normalizerStart < 0 || normalizerEnd < 0) throw new Error('normalizeVisualOrganizerData not found');
const normalize = new Function(renderer.slice(normalizerStart, normalizerEnd) + '\nreturn normalizeVisualOrganizerData;')();

let React;
let ReactDOMClient;
let act;
let host;
let root;
const realConsoleError = console.error;

const ORGANIZER = {
  main: 'Why the river flooded',
  structureType: 'Cause and Effect',
  branches: [
    { title: 'Causes', items: ['Three days of heavy rain', { text: 'Frozen ground shed the water' }, { label: 'Storm drains were blocked' }] },
    { title: 'Effects', items: [{ text: 'The low road closed' }, 'Two schools shut for a day'] },
  ],
};

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null, has: () => true });
  window.AlloLanguageContext = React.createContext({ t: (key) => key });
  loadAlloModule('view_renderers_module.js');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  console.error = realConsoleError;
});

const mount = (element) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(element));
};

// The cause-and-effect static view, rendered through the module's own renderOutlineContent.
const organizerElement = (data) => {
  const renderOutlineContent = window.AlloModules.ViewRenderers.renderOutlineContent;
  const Outline = () => renderOutlineContent({
    t: (key) => key,
    generatedContent: { type: 'outline', id: 'org-1', data },
    isTeacherMode: true,
    isEditingOutline: false,
    isProcessing: false,
    ErrorBoundary: ({ children }) => children,
    handleGenerate: vi.fn(),
    handleToggleIsEditingOutline: vi.fn(),
    setIsInteractiveMap: vi.fn(),
    setIsInteractiveVenn: vi.fn(),
    setIsVennPlaying: vi.fn(),
    setMapAddInput: vi.fn(),
    addToast: vi.fn(),
  });
  return React.createElement(Outline);
};

describe('visual organizer renders object-shaped branch items as text', () => {
  it('coerces the items before any renderer sees them', () => {
    const out = normalize(ORGANIZER, 'Cause and Effect');
    expect(out.branches[0].items).toEqual(['Three days of heavy rain', 'Frozen ground shed the water', 'Storm drains were blocked']);
    expect(out.branches[1].items).toEqual(['The low road closed', 'Two schools shut for a day']);
  });

  it('mounts the real cause-and-effect view without throwing, and shows every item', () => {
    expect(() => mount(organizerElement(ORGANIZER))).not.toThrow();
    const text = host.textContent;
    for (const item of ['Three days of heavy rain', 'Frozen ground shed the water', 'Storm drains were blocked', 'The low road closed', 'Two schools shut for a day']) {
      expect(text, item).toContain(item);
    }
    expect(text).not.toContain('[object Object]');
  });

  it('the same object child still crashes React, which is what the coercion prevents', () => {
    console.error = () => {};
    expect(() => mount(React.createElement('ul', null, React.createElement('li', null, { text: 'Frozen ground shed the water' }))))
      .toThrow(/Objects are not valid as a React child/);
  });
});
