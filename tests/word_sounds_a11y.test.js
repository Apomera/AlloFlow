// WCAG audit gate for Word Sounds: mount every activity live (effects
// running, prepared pack, sound-only default) and run axe-core. Gates on
// zero serious/critical violations per activity.
//
// HONEST SCOPE: axe in jsdom covers the automatable slice of WCAG —
// names/roles/values, ARIA validity, image alts, nesting, tabindex. It
// CANNOT verify color contrast (no layout engine), focus order, SR timing,
// reflow, or touch-target size; those need the live-browser pass.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, ACTIVITIES } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, act, axe, WordSoundsModal;

const ALL_ACTIVITIES = [...ACTIVITIES, 'word_scramble', 'missing_letter'];

// Rules that need a real layout engine or a full document context — noise in
// jsdom component mounts. Everything else (button-name, image-alt, aria-*,
// nested-interactive, duplicate ids, list semantics...) stays ON.
const AXE_OPTIONS = {
  rules: {
    'color-contrast': { enabled: false },       // no layout in jsdom
    'region': { enabled: false },               // modal fragment, host owns landmarks
    'page-has-heading-one': { enabled: false }, // host page concern
    'landmark-one-main': { enabled: false },    // host page concern
    'scrollable-region-focusable': { enabled: false }, // needs layout to detect scrollability
  },
};

const mounted = [];

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  axe = require(resolve(MODULES_DIR, 'axe-core'));
  if (!global.requestAnimationFrame) global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = (id) => clearTimeout(id);
  installCanvasStub();
  const api = setupWordSounds();
  WordSoundsModal = api.WordSoundsModal;
});

afterEach(() => {
  while (mounted.length) {
    const { host, root } = mounted.pop();
    try { act(() => { root.unmount(); }); } catch (_) { /* already gone */ }
    host.remove();
  }
});

async function auditActivity(activity) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(WordSoundsModal, studentProps(activity, []))); });
  mounted.push({ host, root });
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  const results = await axe.run(host, AXE_OPTIONS);
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

describe('word sounds a11y (axe, live mounts, sound-only default)', () => {
  for (const activity of ALL_ACTIVITIES) {
    it(`${activity}: no serious/critical axe violations`, async () => {
      const violations = await auditActivity(activity);
      const summary = violations.map((v) =>
        `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.slice(0, 3).map((n) => n.html.slice(0, 120)).join(' | ')}`,
      );
      expect(summary).toEqual([]);
    });
  }
});
