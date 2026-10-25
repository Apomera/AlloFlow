import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, change } from './helpers/weldlab_interaction_mount.js';

beforeEach(freshTool);
afterEach(unmountState);
const query = selector => node().querySelector(selector);
const number = (element, attribute) => Number(element.getAttribute(attribute));
const retained = { car2_reflect: 'Keep my project notes.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };
const cases = [
  { name: 'normal', hi_V: 22, hi_A: 180, hi_TS: 12, tech2_hi_th: .25 },
  { name: 'shallow', hi_V: 10, hi_A: 50, hi_TS: 30, tech2_hi_th: .375 },
  { name: 'through-thin', hi_V: 40, hi_A: 350, hi_TS: 3, tech2_hi_th: .125 },
  { name: 'through-thick', hi_V: 40, hi_A: 350, hi_TS: 3, tech2_hi_th: .375 },
];

describe('Heat Input preview labels on opaque grounds', () => {
  for (const contrast of [false, true]) for (const sample of cases) {
    it(sample.name + ' retains native readings and exact classroom section geometry (contrast=' + contrast + ')', async () => {
      const app = await mountState({ ...retained, ...sample, view: 'heatInput', hi_process: 'mig' }, contrast);
      const plot = query('svg[aria-label^="Bead cross-section"]');
      const core = window.__WeldLabCore;
      const geometry = core.beadGeometry(sample.hi_V, sample.hi_A, sample.hi_TS, 'mig', 'steel', sample.tech2_hi_th);
      const w = geometry.width * 160, r = geometry.reinf * 160, th = sample.tech2_hi_th * 160;
      const p = Math.min(geometry.penetration, sample.tech2_hi_th) * 160, x0 = 160 - w / 2, x1 = 160 + w / 2;
      const through = geometry.penetration >= sample.tech2_hi_th;
      const expectedPen = through
        ? 'M ' + x0 + ' 50 L ' + (160 - w * .22) + ' ' + (50 + th) + ' L ' + (160 + w * .22) + ' ' + (50 + th) + ' L ' + x1 + ' 50 Z'
        : 'M ' + x0 + ' 50 Q 160 ' + (50 + 2 * p) + ' ' + x1 + ' 50 Z';
      const paths = plot.querySelectorAll('path');
      expect(paths[0].getAttribute('d')).toBe(expectedPen);
      expect(paths[1].getAttribute('d')).toBe('M ' + x0 + ' 50 Q 160 ' + (50 - 2 * r) + ' ' + x1 + ' 50 Z');
      expect(plot.getAttribute('aria-label')).toContain(geometry.penetration.toFixed(3) + ' inch penetration');
      expect(node().textContent).toContain(geometry.penetration.toFixed(3) + '" (' + Math.round(100 * geometry.penetration / sample.tech2_hi_th) + '%)');
      const label = plot.querySelector('[data-hi-preview-label="penetration"]');
      expect(label.querySelector('text').textContent).toBe('3');
      expect(number(label.querySelector('text'), 'x')).toBeCloseTo(x0 - 22, 12);
      expect(number(label.querySelector('text'), 'y')).toBeCloseTo(50 + p / 2 + 4, 12);
      expect(label.querySelector('text').getAttribute('fill')).toBe('#f8fafc');
      expect(label.querySelector('rect').getAttribute('fill')).toBe('#0f172a');
      expect(number(label.querySelector('rect'), 'x') + number(label.querySelector('rect'), 'width')).toBeLessThan(x0 - 10);
      const warning = plot.querySelector('[data-hi-preview-label="through-warning"]');
      expect(!!warning).toBe(through);
      if (warning) {
        expect(warning.querySelector('text').textContent).toBe('!');
        expect(warning.querySelector('rect').getAttribute('fill')).toBe('#0f172a');
        expect(warning.querySelector('text').getAttribute('fill')).toBe('#fca5a5');
        expect(number(warning.querySelector('text'), 'x')).toBeCloseTo(x1 + 16, 12);
        expect(number(warning.querySelector('text'), 'y')).toBeCloseTo(50 + th - 4, 12);
        expect(node().textContent).toContain('Melts all the way through this plate');
      }
      expect(app.latest()).toMatchObject(retained);
      expect(app.writes).toHaveLength(0);
      const control = query('input[aria-label="Travel Speed"]');
      control.focus(); await change(control, sample.hi_TS === 30 ? '29' : String(sample.hi_TS + 1));
      expect(document.activeElement).toBe(control);
      expect(app.latest()).toMatchObject(retained);
      expect(app.writes).toHaveLength(1);
    });
  }
});
