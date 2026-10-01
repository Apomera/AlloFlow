// The Learning Web Explorer modal rendered with no visible surface inside Gemini
// Canvas: its contents appeared on top of the still-open page with nothing behind
// them. Cause was not geometry (position/inset/z-index were correct and are covered
// by learning_web_explorer.test.js). The module was the only one in AlloFlow styled
// with shadcn design tokens (--background, --card, --foreground, --primary, --border,
// --accent, --muted-foreground). AlloFlow defines none of them, so standalone the
// inline fallbacks applied and it looked fine. The embedding shell DOES define them,
// so embedded it inherited the host palette and the overlay painted no surface.
//
// These pins keep the modal's surface self-defined.
import { beforeAll, describe, expect, it, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
// jsdom normalises hex to rgb(), so pin the normalised form.
const OPAQUE_SURFACE = 'rgb(248, 250, 252)'; // #f8fafc
const OPAQUE_TEXT = 'rgb(15, 23, 42)';      // #0f172a
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let Explorer;
let root;
let host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('learning_web_explorer_module.js');
  Explorer = window.AlloModules.LearningWebExplorer;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove();
  host = null;
});

const mountModal = async (hostTokens) => {
  host = document.createElement('div');
  // Reproduce the embedding shell: a page that defines the same token names.
  if (hostTokens) {
    for (const [name, value] of Object.entries(hostTokens)) {
      host.style.setProperty(name, value);
    }
  }
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Explorer.View, {
      graph: { version: 'acg/v1', nodes: [], edges: [] },
      scopeId: 'tokens-test',
      currentResourceId: '',
      isModal: true,
      openableResourceIds: [],
      onOpenResource: () => {},
      onClose: () => {},
      t: () => undefined,
    }));
  });
  return host.querySelector('[data-learning-web-modal-overlay="true"]');
};

describe('Learning Web Explorer surface is self-defined', () => {
  it('never resolves its colours through host-defined design tokens', () => {
    const source = readFileSync(resolve(process.cwd(), 'learning_web_explorer_module.js'), 'utf8');
    // Any var(--x) here is inherited from whatever page embeds the module.
    const inherited = source.match(/var\(--[a-z-]+/g) || [];
    expect(inherited, `module must not read host CSS custom properties, found: ${inherited.join(', ')}`).toEqual([]);
  });

  it('paints an opaque modal surface', async () => {
    const dialog = await mountModal(null);
    expect(dialog).toBeTruthy();
    expect(dialog.style.background).toBe(OPAQUE_SURFACE);
    expect(dialog.style.color).toBe(OPAQUE_TEXT);
  });

  it('keeps its own surface when the embedding page defines the same token names', async () => {
    // This is the Gemini Canvas case that produced the invisible modal.
    const dialog = await mountModal({
      '--background': 'transparent',
      '--foreground': 'transparent',
      '--card': 'transparent',
    });
    expect(dialog).toBeTruthy();
    expect(dialog.style.background).toBe(OPAQUE_SURFACE);
    expect(dialog.style.background).not.toContain('transparent');
    expect(dialog.style.color).toBe(OPAQUE_TEXT);
  });

  it('gives diagram shapes concrete SVG fill and stroke attributes', async () => {
    // Separate failure mode from the modal surface. nodeShapeElement spreads fill and
    // stroke as SVG PRESENTATION ATTRIBUTES onto circle/polygon/path/rect, and SVG
    // attributes cannot parse var() at all: it is not a bad value, it is ignored
    // outright, so the nodes fell back to the SVG default fill (black) with no usable
    // stroke. dev-tools/scan_canvas_var_colors.cjs already catches this class but only
    // walks stem_lab/, so it never saw this module.
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(Explorer.View, {
        graph: {
          version: 'acg/v1',
          nodes: [{ id: 'n1', type: 'standard', label: 'Node one' }],
          edges: [],
        },
        scopeId: 'svg-test',
        isModal: true,
        onClose: () => {},
        t: () => undefined,
      }));
    });
    const shapes = Array.from(host.querySelectorAll('svg circle, svg rect, svg polygon, svg path'))
      .filter((el) => el.hasAttribute('fill') || el.hasAttribute('stroke'));
    expect(shapes.length).toBeGreaterThan(0);
    for (const shape of shapes) {
      for (const attr of ['fill', 'stroke']) {
        const value = shape.getAttribute(attr);
        if (value === null) continue;
        expect(value, `${shape.tagName} ${attr} must be a concrete colour, got "${value}"`).not.toContain('var(');
      }
    }
  });

  it('still covers the viewport above the page it opened over', async () => {
    const dialog = await mountModal(null);
    expect(dialog.style.position).toBe('fixed');
    expect(dialog.style.inset).toMatch(/^0(?:px)?$/);
    expect(Number(dialog.style.zIndex)).toBeGreaterThan(1000000);
  });
});
