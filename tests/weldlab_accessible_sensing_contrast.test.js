import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, change, click } from './helpers/weldlab_interaction_mount.js';

beforeEach(freshTool);
afterEach(unmountState);
const q = selector => node().querySelector(selector);
const n = (element, attr) => Number(element.getAttribute(attr));
const retained = { tech2_rob_prog: [{ x: 4, y: 6, m: 'J', w: false }, { x: 12, y: 6, m: 'L', w: true }], tech2_rob_sort: { 0: 'manual' }, car2_reflect: 'Keep my project.' };
const state = { ...retained, view: 'robotic', rob_sect: 'vision' };
const line = () => q('[data-robot-sensing-projection]');
const position = () => q('[data-robot-sensing-position]');
const luminance = hex => hex.slice(1).match(/../g).map(c => parseInt(c, 16) / 255).map(v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
function checkProjection(at) {
  const laser = line();
  const torchX = 100 + 3.8 * at, focusX = torchX + 65;
  expect(n(laser, 'x1')).toBeCloseTo(focusX, 10);
  expect(n(laser, 'x2')).toBe(n(laser, 'x1'));
  expect(n(laser, 'y1')).toBe(183); expect(n(laser, 'y2')).toBe(257);
  expect(n(laser, 'stroke-width')).toBe(5);
  const outline = q('[data-robot-sensing-projection-outline]');
  const rays = q('[data-robot-sensing-laser] > path[stroke-dasharray]');
  expect(outline).toBeTruthy(); expect(rays).toBeTruthy();
  for (const attr of ['x1', 'x2', 'y1', 'y2']) expect(n(outline, attr)).toBe(n(laser, attr));
  expect(n(outline, 'stroke-width')).toBe(9);
  expect(outline.getAttribute('stroke-linecap')).toBe('round');
  expect(laser.getAttribute('stroke-linecap')).toBe('round');
  expect(rays.getAttribute('d')).toBe('M' + (torchX + 25) + ' 127 L' + focusX + ' 183 M' + (torchX + 25) + ' 127 L' + focusX + ' 257');
  expect(n(rays, 'stroke-width')).toBe(2);
  expect(rays.getAttribute('stroke-dasharray')).toBe('6 5');
  expect(rays.getAttribute('stroke')).toBe('#e2e8f0');
  // The projection remains continuous over the camera-ray endpoints.
  expect(laser.previousElementSibling).toBe(outline);
  expect(outline.previousElementSibling).toBe(rays);
  expect(ratio(laser.getAttribute('stroke'), outline.getAttribute('stroke'))).toBeGreaterThanOrEqual(3);
  expect(ratio(outline.getAttribute('stroke'), rays.getAttribute('stroke'))).toBeGreaterThanOrEqual(3);
  const plates = [...q('[data-robot-sensing-joint]').querySelectorAll('path')].filter(el => el.getAttribute('fill') !== 'none');
  expect(plates).toHaveLength(2);
  for (const plate of plates) expect(ratio(laser.getAttribute('stroke'), plate.getAttribute('fill'))).toBeGreaterThanOrEqual(3);
  expect(q('[data-robot-sensing-legend]').textContent).toContain('Red line: laser projection ahead of the torch');
  expect(q('[data-robot-sensing-diagram]').getAttribute('aria-label')).toContain('red line crosses the joint ahead of the torch');
}

describe('Robot sensing projection visibility', () => {
  it.each([false, true])('separates the projection from both plates and camera rays without moving the observation (contrast=%s)', async contrast => {
    const app = await mountState(state, contrast), saved = structuredClone(app.latest());
    const joint = q('[data-robot-sensing-joint]').outerHTML;
    for (const at of [0, 37, 50, 100]) {
      position().focus(); await change(position(), String(at));
      expect(document.activeElement).toBe(position()); checkProjection(at);
      expect(q('[data-robot-sensing-joint]').outerHTML).toBe(joint);
      expect(n(q('[data-robot-sensing-focus]'), 'data-x')).toBeCloseTo(n(line(), 'x1'), 10);
    }
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('retains the inspected position and original method-specific information when returning to laser sensing (contrast=%s)', async contrast => {
    const app = await mountState(state, contrast); await change(position(), '37');
    for (const method of ['touch', 'arc', 'map']) {
      const button = q('[data-robot-sensing-method="' + method + '"]'); button.focus(); await click(button);
      expect(document.activeElement).toBe(button); expect(line()).toBeNull();
      expect(q('[data-robot-sensing]').dataset.robotSensing).toBe(method); expect(position().value).toBe('37');
      expect(q('[data-robot-sensing-reading]').getAttribute('aria-live')).toBe('polite');
    }
    const laser = q('[data-robot-sensing-method="laser"]'); laser.focus(); await click(laser);
    expect(document.activeElement).toBe(laser); checkProjection(37);
    expect(app.latest()).toEqual(state); expect(app.writes).toHaveLength(0);
  });
});
