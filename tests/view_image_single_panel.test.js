import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const pack = JSON.parse(readFileSync('allopacks/illustrated/crew_norms_grade6_8.allopack.json', 'utf8'));
const singleton = pack.history.find((resource) => resource.type === 'image');
const panel = singleton.data.visualPlan.panels[0];
const legacyUrl = 'data:image/png;base64,bGVnYWN5';
let React, createRoot, act, root, host;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  loadAlloModule('alt_text_module.js');
  loadAlloModule('visual_panel_module.js');
  if (process.env.ALLO_SINGLE_PANEL_CANDIDATE) new Function(readFileSync(process.env.ALLO_SINGLE_PANEL_CANDIDATE, 'utf8'))();
  else loadAlloModule('view_image_module.js');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
});

function mount(resource, teacher = false) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  const props = {
    generatedContent: resource, t: () => '', isTeacherMode: teacher, leveledTextLanguage: 'English',
    singleImageFileRef: React.createRef(), imageRefinementInput: '', addToast: () => {},
    VisualPanelGrid: window.AlloModules.VisualPanelGrid,
    handleUpdateVisualPanel: () => {}, handleUpdateVisualLabel: () => {},
  };
  act(() => root.render(React.createElement(window.AlloModules.ImageView, props)));
}

describe('native single-panel image resources', () => {
  it.each([false, true])('renders the real catalog panel with its own image, alt, caption and labels (teacher=%s)', (teacher) => {
    expect(singleton.data.visualPlan.panels).toHaveLength(1);
    expect(singleton.data.imageUrl).toBeUndefined();
    mount(structuredClone(singleton), teacher);
    const figure = host.querySelector('figure.visual-panel');
    expect(figure).not.toBeNull();
    const picture = figure.querySelector('img');
    expect(picture.getAttribute('src')).toBe(panel.imageUrl);
    expect(picture.getAttribute('alt')).toBe(panel.alt);
    expect(figure.textContent).toContain(panel.caption);
    for (const label of panel.labels) expect(figure.textContent).toContain(label.text);
    expect(host.querySelector('[aria-label="Find a symbol or photo"]')).toBeNull();
  });

  it('prefers completed panel artwork over a stale top-level picture', () => {
    mount({ ...structuredClone(singleton), data: { ...structuredClone(singleton.data), imageUrl: legacyUrl, altText: 'Legacy fallback' } });
    expect(host.querySelector('figure.visual-panel img').getAttribute('src')).toBe(panel.imageUrl);
    expect([...host.querySelectorAll('img')].some((image) => image.getAttribute('src') === legacyUrl)).toBe(false);
  });

  it.each([
    ['prompt-only plan', [{ imagenPrompt: 'A new classroom diagram', labels: [] }]],
    ['empty picture', [{ imageUrl: '   ', labels: [] }]],
    ['null panel', [null]],
    ['missing panels', undefined],
    ['non-array panels', { length: 2 }],
  ])('keeps the legacy top-level picture for a %s', (_label, panels) => {
    mount({ id: 'legacy-single', type: 'image', data: { imageUrl: legacyUrl, altText: 'Existing classroom image', visualPlan: { panels } } }, true);
    expect(host.querySelector('figure.visual-panel')).toBeNull();
    const picture = host.querySelector('img');
    expect(picture.getAttribute('src')).toBe(legacyUrl);
    expect(picture.getAttribute('alt')).toBe('Existing classroom image');
    expect(host.querySelector('[aria-label="Find a symbol or photo"]')).not.toBeNull();
  });

  it('continues to render a plan with multiple populated panels', () => {
    const resource = structuredClone(singleton);
    resource.data.visualPlan.panels.push({ ...structuredClone(panel), id: 'second-panel', caption: 'A second evidence view' });
    mount(resource);
    expect(host.querySelectorAll('figure.visual-panel')).toHaveLength(2);
    expect(host.textContent).toContain('A second evidence view');
  });
});
