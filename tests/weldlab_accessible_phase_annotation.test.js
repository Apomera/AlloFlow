import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, change } from './helpers/weldlab_interaction_mount.js';

beforeEach(freshTool);
afterEach(unmountState);
const query = selector => node().querySelector(selector);
const plot = () => query('svg[aria-label^="Iron-carbon diagram"]');
const num = (element, attribute) => Number(element.getAttribute(attribute));
const retained = { car2_reflect: 'Keep my project notes.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };
const callouts = [
  ['liquid', 1, 1.5, 1560, 9], ['mushy', 2, 1.45, 1338, 9], ['delta', 3, .045, 1468, 7],
  ['austenite', 4, 1, 1080, 9], ['ferrite_austenite', 5, .25, 783, 9],
  ['austenite_cementite', 6, 1.6, 870, 9], ['ferrite_pearlite', 7, .6, 640, 9], ['pearlite_cementite', 8, 1.45, 620, 9]
];
const x = c => 50 + c / 2.1 * 416;
const y = t => 318 - (t - 400) / 1200 * 306;

function expectMarkerClip() {
  const selected = query('[data-fec-selected-marker]');
  expect(selected.getAttribute('clip-path')).toBe('url(#met2-fec-marker-clip)');
  const clip = plot().querySelector('defs clipPath#met2-fec-marker-clip');
  expect(clip).toBeTruthy(); expect(clip.children).toHaveLength(1);
  const rect = clip.querySelector('rect');
  expect(['x', 'y', 'width', 'height'].map(attribute => num(rect, attribute))).toEqual([50, 12, 416, 306]);
  expect(rect.getAttribute('transform')).toBeNull(); expect(selected.getAttribute('transform')).toBeNull();
  // Only marker paint is clipped: phase fields, boundaries and numbered labels retain their geometry.
  expect(plot().querySelectorAll('[clip-path]')).toHaveLength(1);
  for (const field of plot().querySelectorAll('polygon, polyline, [data-fec-callout]')) expect(field.closest('[clip-path]')).toBeNull();
  return rect;
}

describe('Fe-C selected marker and numbered phase labels', () => {
  for (const contrast of [false, true]) {
    it.each(callouts)('preserves both selected coordinates and original %s badge at an exact overlap, contrast=' + contrast, async (id, number, carbon, temperature, radius) => {
      const app = await mountState({ ...retained, view: 'metallurgy', met_sect: 'phase', met2_fecC: carbon, met2_fecT: temperature }, contrast);
      const selected = query('[data-fec-selected-marker]');
      expectMarkerClip();
      expect(selected.getAttribute('data-collision')).toBe('true');
      const rings = [...selected.querySelectorAll('circle')];
      expect(rings).toHaveLength(2);
      for (const ring of rings) {
        expect(num(ring, 'cx')).toBeCloseTo(x(carbon), 10); expect(num(ring, 'cy')).toBeCloseTo(y(temperature), 10);
        expect(ring.getAttribute('fill')).toBe('none');
        // A larger ring cannot be entirely concealed by an unchanged badge at the same coordinate.
        expect(num(ring, 'r') - num(ring, 'stroke-width') / 2).toBeGreaterThan(radius + .625);
      }
      const badge = query('[data-fec-callout="' + id + '"]'), ground = badge.querySelector('circle');
      expect(num(ground, 'cx')).toBeCloseTo(x(carbon), 10); expect(num(ground, 'cy')).toBeCloseTo(y(temperature), 10);
      expect(num(ground, 'r')).toBe(radius); expect(ground.getAttribute('fill')).toBe('#0f172a');
      expect(badge.querySelector('text').textContent).toBe(String(number));
      expect(badge.querySelector('text').getAttribute('fill')).toBe('#f8fafc');
      expect(selected.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(plot().querySelectorAll('[data-fec-callout]')).toHaveLength(8);
      expect([...plot().children].slice(-8).every(child => child.hasAttribute('data-fec-callout'))).toBe(true);
      expect(app.latest()).toMatchObject({ ...retained, met2_fecC: carbon, met2_fecT: temperature });
    });
  }

  it.each([false, true])('keeps a near-collision ring at the actual coordinate and restores the dot after leaving the badge, contrast=%s', async contrast => {
    const app = await mountState({ ...retained, view: 'metallurgy', met_sect: 'phase', met2_fecC: 1.04, met2_fecT: 1080 }, contrast);
    const saved = structuredClone(app.latest()), writes = app.writes.length;
    const badge = query('[data-fec-callout="austenite"] circle');
    const originalClip = expectMarkerClip().outerHTML;
    const marker = () => query('[data-fec-selected-marker]');
    expect(marker().getAttribute('data-collision')).toBe('true');
    for (const circle of marker().querySelectorAll('circle')) {
      expect(num(circle, 'cx')).toBeCloseTo(x(1.04), 10); expect(num(circle, 'cy')).toBeCloseTo(y(1080), 10);
      expect(num(circle, 'cx')).not.toBe(num(badge, 'cx'));
    }
    expect(num(badge, 'cx')).toBeCloseTo(x(1), 10); expect(num(badge, 'cy')).toBeCloseTo(y(1080), 10);
    const carbon = query('#met2-fec-c'); carbon.focus(); await change(carbon, '1.15');
    expect(document.activeElement).toBe(carbon); expect(marker().getAttribute('data-collision')).toBe('false');
    expect(expectMarkerClip().outerHTML).toBe(originalClip);
    const dot = marker().querySelector('circle');
    expect(num(dot, 'cx')).toBeCloseTo(x(1.15), 10); expect(num(dot, 'cy')).toBeCloseTo(y(1080), 10);
    expect(num(dot, 'r')).toBe(8); expect(dot.getAttribute('fill')).toBe('#fde047');
    expect(num(query('[data-fec-callout="austenite"] circle'), 'cx')).toBeCloseTo(x(1), 10);
    expect(app.latest()).toEqual({ ...saved, met2_fecC: 1.15 }); expect(app.writes).toHaveLength(writes + 1);
    expect(app.latest()).toMatchObject(retained);
  });

  it.each([false, true])('retains the familiar filled marker away from field labels and keeps native readings and phase speech, contrast=%s', async contrast => {
    const app = await mountState({ ...retained, view: 'metallurgy', met_sect: 'phase', met2_fecC: .4, met2_fecT: 850 }, contrast);
    const shapes = [...plot().querySelectorAll('polygon, polyline')].map(shape => shape.getAttribute('points'));
    const originalClip = expectMarkerClip().outerHTML;
    expect(query('[data-fec-selected-marker]').getAttribute('data-collision')).toBe('false');
    const point = query('[data-fec-selected-marker] circle');
    expect(point.getAttribute('fill')).toBe('#fde047'); expect(num(point, 'r')).toBe(8);
    expect(num(point, 'cx')).toBeCloseTo(x(.4), 10); expect(num(point, 'cy')).toBeCloseTo(y(850), 10);
    const carbon = query('#met2-fec-c'), temperature = query('#met2-fec-t');
    const saved = structuredClone(app.latest()), writes = app.writes.length;
    carbon.focus(); await change(carbon, '.5');
    expect(document.activeElement).toBe(carbon); expect(carbon.getAttribute('aria-valuetext')).toBe('0.50 % C');
    expect(app.latest()).toEqual({ ...saved, met2_fecC: .5 }); expect(app.writes).toHaveLength(writes + 1);
    temperature.focus(); await change(temperature, '600');
    expect(document.activeElement).toBe(temperature); expect(temperature.getAttribute('aria-valuetext')).toBe('600 °C (1112 °F)');
    expect(app.latest()).toEqual({ ...saved, met2_fecC: .5, met2_fecT: 600 }); expect(app.writes).toHaveLength(writes + 2);
    expect(plot().getAttribute('aria-label')).toContain('0.50 % carbon and 600 °C: Ferrite + pearlite');
    expect(document.getElementById('allo-live-weldlab').textContent).toContain('Now in: Ferrite + pearlite');
    expect([...plot().querySelectorAll('polygon, polyline')].map(shape => shape.getAttribute('points'))).toEqual(shapes);
    expect(expectMarkerClip().outerHTML).toBe(originalClip);
    expect(app.latest()).toMatchObject(retained);
  });
});

describe('Fe-C preset labels above movable guides', () => {
  it.each([false, true])('keeps every preset name, tick and selected coordinate visible, contrast=%s', async contrast => {
    const app = await mountState({ ...retained, view: 'metallurgy', met_sect: 'phase', met2_fecC: 1, met2_fecT: 1080 }, contrast);
    const presets = [['a36', 'A36', .2], ['4140', '4140', .4], ['1095', '1095', .95]];
    const marker = () => query('[data-fec-selected-marker]');
    const tickLines = () => [...plot().querySelectorAll('line[stroke="#f8fafc"][stroke-width="1.5"]')];
    const shapes = [...plot().querySelectorAll('polygon, polyline')].map(shape => shape.getAttribute('points'));
    expect(tickLines()).toHaveLength(3);
    const originalTicks = tickLines().map(line => line.outerHTML);
    const labels = [...plot().querySelectorAll('[data-fec-preset-label]')];
    expect(labels.map(label => label.getAttribute('data-fec-preset-label'))).toEqual(['a36', '4140', '1095']);
    for (const [index, [id, name, carbon]] of presets.entries()) {
      const label = query('[data-fec-preset-label="' + id + '"]'), text = label.querySelector('text'), ground = label.querySelector('rect'), tick = tickLines()[index];
      expect(text.textContent).toBe(name);
      expect([...plot().querySelectorAll('text')].filter(element => element.textContent === name)).toHaveLength(1);
      expect(num(text, 'x')).toBeCloseTo(x(carbon), 10); expect(num(text, 'y')).toBe(292);
      expect(text.getAttribute('font-size')).toBe('10'); expect(text.getAttribute('font-weight')).toBe('700');
      expect(text.getAttribute('fill')).toBe('#f8fafc'); expect(text.getAttribute('text-anchor')).toBe('middle');
      expect(ground.getAttribute('fill')).toBe('#0f172a'); expect(ground.closest('[opacity]')).toBeNull();
      expect(num(ground, 'x') + num(ground, 'width') / 2).toBeCloseTo(x(carbon), 10);
      expect(num(ground, 'width')).toBeGreaterThanOrEqual(name.length * 6);
      expect(num(ground, 'y')).toBeLessThanOrEqual(280); expect(num(ground, 'y') + num(ground, 'height')).toBeGreaterThanOrEqual(296);
      expect(tick.closest('[clip-path]')).toBeNull(); expect(label.closest('[clip-path]')).toBeNull();
      expect(['x1', 'y1', 'x2', 'y2'].map(attribute => num(tick, attribute))).toEqual([x(carbon), 318, x(carbon), y(450)]);
      expect(tick.compareDocumentPosition(marker()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(marker().compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(label.compareDocumentPosition(query('[data-fec-callout]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    const saved = structuredClone(app.latest()), writes = app.writes.length;
    const labelMarkup = labels.map(label => label.outerHTML);
    const carbon = query('#met2-fec-c'), temperature = query('#met2-fec-t');
    carbon.focus(); await change(carbon, '.95');
    temperature.focus(); await change(temperature, '515');
    expect(document.activeElement).toBe(temperature);
    expect(marker().getAttribute('data-collision')).toBe('true');
    const selected = marker().querySelector('circle:last-child'), backing = query('[data-fec-preset-label="1095"] rect');
    expect(num(selected, 'cx')).toBeCloseTo(x(.95), 10); expect(num(selected, 'cy')).toBeCloseTo(y(515), 10);
    expect(selected.getAttribute('fill')).toBe('none');
    // The ring protrudes above and below the opaque label; its selected coordinate stays exact.
    const innerRadius = num(selected, 'r') - num(selected, 'stroke-width') / 2;
    expect(num(selected, 'cy') - innerRadius).toBeLessThan(num(backing, 'y'));
    expect(num(selected, 'cy') + innerRadius).toBeGreaterThan(num(backing, 'y') + num(backing, 'height'));
    expect([...plot().querySelectorAll('[data-fec-preset-label]')].map(label => label.outerHTML)).toEqual(labelMarkup);
    expect(tickLines().map(line => line.outerHTML)).toEqual(originalTicks);
    expect([...plot().querySelectorAll('polygon, polyline')].map(shape => shape.getAttribute('points'))).toEqual(shapes);
    expect(app.latest()).toEqual({ ...saved, met2_fecC: .95, met2_fecT: 515 }); expect(app.writes).toHaveLength(writes + 2);
    expect(app.latest()).toMatchObject(retained);
  });
});
