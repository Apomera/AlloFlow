import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 26 (2026-09-03): the regional atlas held every inactive step layer at opacity .1.
// Their words were unreadable yet still smudged across the anatomy drawing, and twice during
// this review they were mistaken for a rendering fault. They are aria-hidden, so hiding them
// loses nothing; the numbered step buttons already show that other steps exist.

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const OLDER = { gradeLevel: '9' };

function parse(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

function renderAtlas(filePath, step) {
  loadTool(filePath, 'anatomy');
  return parse(renderTool('anatomy', {
    anatomy: {
      system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'explore',
      selectedStructure: 'patella', _regionalAtlasOpen: 'patella', _regionalAtlasStep: step,
    },
  }, OLDER));
}

beforeEach(() => { resetStemLab(); });

describe('Anatomy regional atlas step layers', () => {
  it.each(ANATOMY_PATHS)('hides inactive step layers instead of smudging them in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('.anatomy-mechanism-layer.is-muted{opacity:0;pointer-events:none;}');
    expect(source).not.toContain('.anatomy-mechanism-layer.is-muted{opacity:.1;}');
    // The active layer stays fully visible.
    expect(source).toContain('.anatomy-mechanism-layer.is-active{opacity:1;');
  });

  it.each(ANATOMY_PATHS)('marks exactly one layer active and hides them all from the reader in %s', (filePath) => {
    for (const step of [0, 1, 2, 3]) {
      const root = renderAtlas(filePath, step);
      const layers = [...root.querySelectorAll('.anatomy-mechanism-layer')];
      expect(layers.length, 'step ' + step).toBeGreaterThan(1);

      const active = layers.filter((n) => n.classList.contains('is-active'));
      const muted = layers.filter((n) => n.classList.contains('is-muted'));
      expect(active.length, 'step ' + step).toBe(1);
      expect(muted.length, 'step ' + step).toBe(layers.length - 1);

      // Decorative: the step narration below the diagram carries the words for the reader.
      for (const layer of layers) expect(layer.getAttribute('aria-hidden'), 'step ' + step).toBe('true');
    }
  }, 60_000);
});
