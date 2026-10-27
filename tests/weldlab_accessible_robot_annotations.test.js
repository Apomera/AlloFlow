import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change } from './helpers/weldlab_interaction_mount.js';

let matchMedia;
beforeEach(() => {
  matchMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  freshTool();
});
afterEach(async () => { await unmountState(); window.matchMedia = matchMedia; vi.restoreAllMocks(); });
const q = selector => node().querySelector(selector);
const n = (element, attr) => Number(element.getAttribute(attr));
const plot = () => q('[data-robot-workcell]');
const torch = () => q('[data-robot-torch]');
const progress = () => q('[data-robot-inspect-progress]');
const select = () => q('[data-robot-inspect-select]');
const px = value => 8 + (value + .5) * 24;
const retained = { car2_reflect: 'Keep my reflection.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true }, tech2_rob_sort: { 0: 'manual' } };
const program = [{ x: 4, y: 6, m: 'J', w: false }, { x: 12, y: 6, m: 'L', w: true }, { x: 12, y: 1, m: 'J', w: false }, { x: 1, y: 2, m: 'J', w: false }];
const seed = (points = program) => ({ ...retained, view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: points });
const labels = () => [...plot().querySelectorAll('[data-robot-home-label],[data-robot-point-label]')].map(el => el.outerHTML);
function foregroundLabel(index, x, y, bad = false) {
  const label = index === 'home' ? q('[data-robot-home-label]') : q('[data-robot-point-label="' + index + '"]');
  expect(torch().compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const text = label.querySelector('text');
  expect(text.textContent).toBe(index === 'home' ? 'H' : String(index));
  expect(n(text, 'x')).toBe(px(x)); expect(n(text, 'y')).toBe(px(y) + (index === 'home' ? 4 : 3.5));
  expect(text.getAttribute('fill')).toBe('#f8fafc');
  if (index !== 'home') { expect(n(label.querySelector('circle'), 'r')).toBe(7); expect(label.querySelector('circle').getAttribute('fill')).toBe(bad ? '#7f1d1d' : '#0f172a'); }
}
function hollowMarker(x, y, arc) {
  expect(torch().dataset.labelOverlap).toBe('true'); expect(torch().dataset.arc).toBe(arc);
  expect(n(torch(), 'data-x')).toBeCloseTo(x, 10); expect(n(torch(), 'data-y')).toBeCloseTo(y, 10);
  const rings = [...torch().querySelectorAll('circle')]; expect(rings).toHaveLength(2);
  for (const ring of rings) { expect(n(ring, 'cx')).toBeCloseTo(px(x), 10); expect(n(ring, 'cy')).toBeCloseTo(px(y), 10); expect(n(ring, 'r')).toBe(14); expect(ring.getAttribute('fill')).toBe('none'); }
  expect(rings[0].getAttribute('stroke')).toBe('#0f172a'); expect(n(rings[0], 'stroke-width')).toBe(6);
  expect(rings[1].getAttribute('stroke')).toBe(arc === 'on' ? '#fde047' : '#f8fafc'); expect(n(rings[1], 'stroke-width')).toBe(3);
  expect(rings[1].getAttribute('stroke-dasharray')).toBe(arc === 'on' ? null : '3 2');
  // The visible ring extends beyond the unchanged r7 point badge and Home's 16px box.
  expect(n(rings[1], 'r') - n(rings[1], 'stroke-width') / 2).toBeGreaterThan(Math.sqrt(8 * 8 * 2));
  expect(torch().querySelector('line')).toBeNull();
}

describe('Robot torch and taught-point annotation layering', () => {
  it.each([false, true])('keeps arc-on torch coordinates and both endpoint numbers legible without changing saved work, contrast=%s', async contrast => {
    const app = await mountState(seed(), contrast), original = labels(), saved = structuredClone(app.latest());
    expect(torch()).toBeNull(); await change(select(), '1');
    for (const [value, point, x] of [[0, 1, 4], [100, 2, 12]]) {
      progress().focus(); await change(progress(), String(value)); expect(document.activeElement).toBe(progress());
      hollowMarker(x, 6, 'on'); foregroundLabel(point, x, 6); expect(labels()).toEqual(original);
      expect(n(q('[data-robot-inspect-position]'), 'data-x-mm')).toBe(x * 5);
      expect(progress().getAttribute('aria-valuetext')).toContain(value + ' percent');
    }
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('keeps Home and air-move endpoint annotations above a distinct dashed off marker, contrast=%s', async contrast => {
    const app = await mountState(seed(), contrast), saved = structuredClone(app.latest());
    await change(select(), '0'); await change(progress(), '0'); hollowMarker(1, 1, 'off'); foregroundLabel('home', 1, 1);
    await change(progress(), '100'); hollowMarker(4, 6, 'off'); foregroundLabel(1, 4, 6);
    expect(q('[data-robot-inspect-arc]').dataset.robotInspectArc).toBe('off');
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('keeps a near-overlap marker at its real interpolated coordinate and restores the original dot away from labels, contrast=%s', async contrast => {
    const app = await mountState(seed(), contrast), original = labels(); await change(select(), '1');
    await change(progress(), '96'); hollowMarker(11.68, 6, 'on'); foregroundLabel(2, 12, 6);
    expect(n(torch().querySelector('circle'), 'cx')).not.toBe(n(q('[data-robot-point-label="2"] circle'), 'cx'));
    await change(progress(), '50'); expect(torch().dataset.labelOverlap).toBe('false');
    const circles = [...torch().querySelectorAll('circle')]; expect(circles.map(c => n(c, 'r'))).toEqual([10, 6]);
    expect(circles[0].getAttribute('fill')).toBe('none'); expect(circles[1].getAttribute('fill')).toBe('#fde047');
    expect(n(torch(), 'data-x')).toBe(8); expect(n(torch(), 'data-y')).toBe(6); expect(labels()).toEqual(original);
    await change(select(), '2'); expect(torch().dataset.labelOverlap).toBe('false');
    expect(torch().querySelector('line')).toBeTruthy(); expect(torch().querySelector('circle').getAttribute('fill')).toBe('#0f172a');
    expect(app.latest()).toMatchObject(retained); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('retains the completed-run endpoint and verdict while keeping its numbered target visible, contrast=%s', async contrast => {
    const app = await mountState(seed(), contrast);
    const check = window.__WeldLabCore.tech2.checkProgram(program);
    const run = [...node().querySelectorAll('button')].find(button => button.textContent.trim() === '▶ Run program');
    await click(run); expect(torch().dataset.source).toBe('run'); hollowMarker(1, 2, 'off'); foregroundLabel(4, 1, 2, check.segments[3].bad);
    expect(node().textContent).toContain(check.pass ? 'Weld complete: seam fully covered, no faults.' : 'The program needs work.');
    expect(q('[data-robot-inspector]').dataset.robotInspector).toBe('paused');
    expect(app.latest().tech2_rob_prog).toEqual(program); expect(app.latest()).toMatchObject(retained);
    expect(q('[data-robot-inspect-issues]')).toBeNull();
  });

  it.each([false, true])('keeps all point centers and enlarged endpoint rings inside the unchanged workcell bounds, contrast=%s', async contrast => {
    const edgeProgram = [{ x: 0, y: 0, m: 'L', w: false }, { x: 15, y: 9, m: 'L', w: false }];
    const app = await mountState(seed(edgeProgram), contrast); expect(plot().getAttribute('viewBox')).toBe('0 0 400 256');
    for (const [index, point] of edgeProgram.entries()) {
      await change(select(), String(index)); await change(progress(), '100'); hollowMarker(point.x, point.y, 'off'); foregroundLabel(index + 1, point.x, point.y);
      for (const ring of torch().querySelectorAll('circle')) { const r = n(ring, 'r') + n(ring, 'stroke-width') / 2; expect(n(ring, 'cx') - r).toBeGreaterThanOrEqual(0); expect(n(ring, 'cy') - r).toBeGreaterThanOrEqual(0); expect(n(ring, 'cx') + r).toBeLessThanOrEqual(400); expect(n(ring, 'cy') + r).toBeLessThanOrEqual(256); }
    }
    expect(app.latest().tech2_rob_prog).toEqual(edgeProgram); expect(app.writes).toHaveLength(0);
  });
});
