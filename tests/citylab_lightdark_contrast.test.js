// City Lab, light and dark: the coach's yellow frame sat ON TOP of the corner plate on the fields it marks, so a student
// looking for "the fields I can build on" could not read the land-use code of exactly those fields. The frame is 5 px of
// inset shadow, painted over the code (45% of the code's box read frame yellow at 6x, 2026-11-05).
// Both spans are absolute with no z-index, so tree order decides what paints on top. jsdom cannot paint; this pins that
// rule on the real render. Pixel readings: see the lightdark report.
// CITYLAB_FILE=<path> runs against another copy, to show the failure on the old file.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CITYLAB_FILE || 'stem_lab/stem_tool_citylab.js';

function framedButtons() {
  window.localStorage.removeItem('allo_citylab_plan_v1');
  const host = document.createElement('div');
  host.innerHTML = renderTool('cityLab', { cityLab: {} });
  return [...host.querySelectorAll('[data-citylab-coach-tint]')].map((f) => f.parentElement);
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'cityLab');
});

describe('City Lab coach frame and the plate letter', () => {
  it('the first screen frames fields on the map', () => {
    expect(framedButtons().length).toBeGreaterThan(0);
  });

  it('paints the plate letter above the frame on every framed field', () => {
    for (const btn of framedButtons()) {
      const kids = [...btn.children];
      const frame = kids.findIndex((k) => k.hasAttribute('data-citylab-coach-tint'));
      const plate = kids.findIndex((k) => k.classList.contains('top-0') && k.classList.contains('left-0') && k.classList.contains('leading-none'));
      expect(plate, 'no plate in ' + btn.id).toBeGreaterThanOrEqual(0);
      expect(plate > frame, btn.id + ': the frame is painted over the code').toBe(true);
    }
  });

  it('still shows the frame: the plate covers one corner, not the field', () => {
    const btn = framedButtons()[0];
    const frame = btn.querySelector('[data-citylab-coach-tint]');
    expect(frame.className).toContain('inset-0');
    expect(frame.getAttribute('style')).toContain('#facc15');
  });
});
