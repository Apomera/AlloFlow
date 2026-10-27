import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, change, click } from './helpers/weldlab_interaction_mount.js';

beforeEach(freshTool);
afterEach(unmountState);
const query = selector => node().querySelector(selector);
const number = (element, attribute) => Number(element.getAttribute(attribute));
const retained = { car2_reflect: 'Keep my project notes.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };
const samples = [
  { name: 'thin through', tech2_hi_th: .125, hi_V: 40, hi_A: 350, hi_TS: 3 },
  { name: 'three-sixteenths', tech2_hi_th: .1875, hi_V: 22, hi_A: 180, hi_TS: 12 },
  { name: 'quarter inch', tech2_hi_th: .25, hi_V: 22, hi_A: 180, hi_TS: 12 },
  { name: 'thick shallow', tech2_hi_th: .375, hi_V: 10, hi_A: 50, hi_TS: 30 }
];
const luminance = color => color.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
const isDash = (distance, offset = 0) => ((distance + offset) % 4 + 4) % 4 < 2;

function checkGuideGeometry(sample) {
  const plot = query('svg[aria-label^="Bead cross-section"]');
  const geometry = window.__WeldLabCore.beadGeometry(sample.hi_V, sample.hi_A, sample.hi_TS, 'mig', 'steel', sample.tech2_hi_th);
  const width = geometry.width * 160, thickness = sample.tech2_hi_th * 160;
  const penetration = Math.min(geometry.penetration, sample.tech2_hi_th) * 160;
  const plateColor = plot.querySelectorAll('rect')[1].getAttribute('fill'), canvasColor = plot.querySelector('rect').getAttribute('fill');
  for (const [edge, x] of [['start', 160 - width / 2], ['end', 160 + width / 2]]) {
    const group = plot.querySelector('[data-hi-width-guide="' + edge + '"]');
    expect(group).toBeTruthy(); expect(group.querySelectorAll('line')).toHaveLength(2);
    const plate = group.querySelector('[data-hi-guide-ground="plate"]'), canvas = group.querySelector('[data-hi-guide-ground="canvas"]');
    for (const line of [plate, canvas]) {
      expect(number(line, 'x1')).toBeCloseTo(x, 12); expect(number(line, 'x2')).toBeCloseTo(x, 12);
      expect(line.getAttribute('stroke-dasharray')).toBe('2 2');
      expect(number(line, 'stroke-width')).toBeGreaterThanOrEqual(1.5);
    }
    expect(number(plate, 'y1')).toBe(50); expect(number(plate, 'y2')).toBe(50 + thickness);
    expect(number(canvas, 'y1')).toBe(number(plate, 'y2')); expect(number(canvas, 'y2')).toBe(50 + thickness + 14);
    expect(ratio(plate.getAttribute('stroke'), plateColor)).toBeGreaterThanOrEqual(3);
    expect(ratio(canvas.getAttribute('stroke'), canvasColor)).toBeGreaterThanOrEqual(3);
    // Splitting a guide at a color boundary must not restart or shift the original dash pattern.
    for (let distance = .5; distance < 14; distance += .5) {
      expect(isDash(distance, number(canvas, 'stroke-dashoffset'))).toBe(isDash(thickness + distance));
    }
  }
  const depth = plot.querySelector('[data-hi-penetration-dimension]');
  expect(number(depth, 'x1')).toBeCloseTo(160 - width / 2 - 10, 12); expect(number(depth, 'x2')).toBe(number(depth, 'x1'));
  expect(number(depth, 'y1')).toBe(50); expect(number(depth, 'y2')).toBeCloseTo(50 + penetration, 12);
  expect(ratio(depth.getAttribute('stroke'), plateColor)).toBeGreaterThanOrEqual(3);
  // The thicker guide must not overlap the existing number 3 background.
  const badge = plot.querySelector('[data-hi-preview-label="penetration"] rect');
  expect(number(badge, 'x') + number(badge, 'width')).toBeLessThan(number(depth, 'x1') - number(depth, 'stroke-width') / 2);
  expect(plot.getAttribute('aria-label')).toContain(geometry.penetration.toFixed(3) + ' inch penetration');
  expect(node().textContent).toContain(geometry.width.toFixed(3) + '"');
}

describe('Heat Input graphical dimensions retain contrast across plate and canvas', () => {
  for (const contrast of [false, true]) for (const sample of samples) {
    it(sample.name + ' retains exact physical endpoints and uninterrupted dash spacing, contrast=' + contrast, async () => {
      const app = await mountState({ ...retained, ...sample, view: 'heatInput', hi_process: 'mig' }, contrast);
      checkGuideGeometry(sample); expect(app.latest()).toMatchObject(retained); expect(app.writes).toHaveLength(0);
    });
  }
  it.each([false, true])('updates dimensions from native settings without changing focus or unrelated saved work, contrast=%s', async contrast => {
    const sample = { tech2_hi_th: .25, hi_V: 22, hi_A: 180, hi_TS: 12 };
    const app = await mountState({ ...retained, ...sample, view: 'heatInput', hi_process: 'mig' }, contrast);
    const travel = query('input[aria-label="Travel Speed"]');
    travel.focus(); await change(travel, '13'); expect(document.activeElement).toBe(travel);
    sample.hi_TS = 13; checkGuideGeometry(sample);
    const thinner = [...query('[role="radiogroup"][aria-label="Plate thickness for the bead preview"]').querySelectorAll('button')].find(button => button.textContent === '3/16"');
    thinner.focus(); await click(thinner); expect(document.activeElement).toBe(thinner); expect(thinner.getAttribute('aria-checked')).toBe('true');
    sample.tech2_hi_th = .1875; checkGuideGeometry(sample);
    expect(app.latest()).toMatchObject({ ...retained, hi_TS: 13, tech2_hi_th: .1875 }); expect(app.writes).toHaveLength(2);
  });
});
