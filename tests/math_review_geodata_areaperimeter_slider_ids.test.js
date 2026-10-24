import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Area & Perimeter Lab slider ids are derived from the visible label. The old
// slug kept only [a-z0-9], so any non-Latin translation turned every slider id
// into 'ap--' and each <label for> pointed at the first slider on the page.

const FILE = process.env.MATH_REVIEW_AREAPERIMETER_SRC || 'stem_lab/stem_tool_areaperimeter.js';

// A stand-in translation: every key maps to a distinct CJK string.
const cjk = (key) => key.split('').map((c) => String.fromCharCode(0x4e00 + c.charCodeAt(0))).join('');

function mount(mode, t) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('areaPerimeter', { _areaPerimeter: { mode } }, t ? { t } : undefined);
  return host;
}

function rangeWiring(host) {
  const inputs = [...host.querySelectorAll('input[type="range"]')];
  return inputs.map((input) => {
    const label = input.closest('label');
    const output = label && label.querySelector('output');
    return {
      id: input.id,
      labelFor: label && label.getAttribute('for'),
      outputFor: output && output.getAttribute('for'),
      matches: host.querySelectorAll('[id="' + input.id + '"]').length,
    };
  });
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'areaPerimeter');
});
afterEach(() => { document.body.innerHTML = ''; });

describe('Area & Perimeter slider ids under translation', () => {
  for (const mode of ['explore', 'compare', 'composite', 'investigate']) {
    it(mode + ': every slider has a unique id and its own label points at it', () => {
      const wiring = rangeWiring(mount(mode, cjk));
      expect(wiring.length, mode).toBeGreaterThan(1);
      expect(new Set(wiring.map((w) => w.id)).size, JSON.stringify(wiring)).toBe(wiring.length);
      for (const w of wiring) {
        expect(w.matches, w.id).toBe(1);
        expect(w.labelFor).toBe(w.id);
        expect(w.outputFor).toBe(w.id);
      }
    });
  }

  it('English ids are unchanged', () => {
    expect(rangeWiring(mount('explore')).map((w) => w.id)).toEqual(['ap-rectangle-width', 'ap-rectangle-height']);
    expect(rangeWiring(mount('compare')).map((w) => w.id)).toEqual(['ap-a-width', 'ap-a-height', 'ap-b-width', 'ap-b-height']);
  });
});
