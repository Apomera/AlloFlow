import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshTool, mountState, unmountState, node, click, pointer, button, SRC } from './helpers/weldlab_interaction_mount.js';
import { stripPlanRuler } from './helpers/weldlab_plan_ruler_restore.js';
const BASE = { view: 'ppeSafety', ps_view: 'floor', safe2_scPick: { 1: 2 }, sym2_m_score: 3 };
const panel = () => node().querySelector('[data-plan-ruler]');
const diagram = () => node().querySelector('svg[viewBox="0 0 500 300"]');
const n = (element, key) => Number(element.getAttribute(key));
beforeEach(freshTool); afterEach(unmountState);
async function mount(extra = {}, contrast = false) { return mountState({ ...BASE, ...extra }, contrast); }
async function toggle() { await click(panel().querySelector('button')); }
function assertPoint(point) {
  expect(n(panel(), 'data-x')).toBe(point.x); expect(n(panel(), 'data-y')).toBe(point.y);
  const dx = point.x - 30, dy = point.y - 28;
  expect(n(panel(), 'data-dx')).toBe(dx); expect(n(panel(), 'data-dy')).toBe(dy);
  expect(n(panel(), 'data-distance')).toBeCloseTo(Math.hypot(dx, dy), 12);
  const line = diagram().querySelector('[data-plan-ruler-direct]');
  expect(['x1', 'y1', 'x2', 'y2'].map(key => n(line, key))).toEqual([150, 140, point.x * 5, point.y * 5]);
  expect(diagram().querySelector('[data-plan-ruler-legs]').getAttribute('d')).toBe(`M150 140 H${point.x * 5} V${point.y * 5}`);
}
describe('Selected-item floor-plan ruler', () => {
  it('starts off and adds only a local neutral overlay when enabled', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest());
    expect(panel().dataset.enabled).toBe('false'); expect(node().querySelector('[data-plan-ruler-overlay]')).toBeNull();
    await toggle(); assertPoint(window.__WeldLabCore.SAFE2_PLAN_START.cardboard);
    expect(node().querySelector('[data-plan-ruler-overlay]').getAttribute('pointer-events')).toBe('none');
    expect(panel().textContent).toContain('Positive means right or down'); expect(node().textContent).not.toContain('rules met');
    await toggle(); expect(node().querySelector('[data-plan-ruler-reading]')).toBeNull();
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(0);
  });
  it('measures every original item with exact shared coordinates and no selection writes', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest()); await toggle();
    const radios = [...node().querySelector('[aria-label="Pick an item to move"]').querySelectorAll('button')];
    for (const [index, [id, point]] of Object.entries(window.__WeldLabCore.SAFE2_PLAN_START).entries()) {
      await click(radios[index]); expect(panel().dataset.planRuler).toBe(id); assertPoint(point);
      expect(panel().querySelector('[data-plan-ruler-name]').textContent.length).toBeGreaterThan(3);
    }
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(0);
  });
  it('follows live pointer previews before committing the existing plan on release', async () => {
    const app = await mount(); await toggle(); const svg = diagram(); svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 300 });
    const mark = [...svg.querySelectorAll('g')].find(element => element.style.cursor === 'grab');
    await pointer(mark, 'pointerDown', { clientX: 240, clientY: 60, pointerId: 1 });
    await pointer(svg, 'pointerMove', { clientX: 300, clientY: 200, pointerId: 1 }); assertPoint({ x: 60, y: 40 });
    expect(app.writes).toHaveLength(0); await pointer(svg, 'pointerUp', { pointerId: 1 }); assertPoint({ x: 60, y: 40 });
    expect(app.latest().safe2_plan.cardboard).toMatchObject({ x: 60, y: 40 }); expect(app.writes.map(([key]) => key)).toEqual(['safe2_plan']);
  });
  it('retains original nudging, check feedback and reset gates', async () => {
    const app = await mount(); await toggle(); await click(node().querySelector('[aria-label="Move right 5 ft"]')); assertPoint({ x: 53, y: 12 });
    expect(node().textContent).not.toContain('rules met'); await click(button('Check the plan'));
    const checks = window.__WeldLabCore.safe2CheckPlan(app.latest().safe2_plan), count = checks.rules.filter(rule => rule.ok).length;
    expect(node().textContent).toContain(`${count} of ${checks.rules.length} rules met`);
    await click(node().querySelector('[aria-label="Move down 5 ft"]')); expect(node().textContent).not.toContain('rules met');
    await click(button('Reset the shop')); assertPoint(window.__WeldLabCore.SAFE2_PLAN_START.cardboard);
    expect(app.latest().safe2_scPick).toEqual(BASE.safe2_scPick); expect(app.latest().sym2_m_score).toBe(3);
  });
  it('handles coincident endpoints and normalized hostile saved coordinates without invalid geometry', async () => {
    await mount({ safe2_plan: { cardboard: { x: 30, y: 28 }, ragBin: { x: -999, y: 999 } } }); await toggle();
    assertPoint({ x: 30, y: 28 }); expect(n(panel(), 'data-distance')).toBe(0);
    await click(node().querySelector('[aria-label="Pick an item to move"]').querySelectorAll('button')[1]); assertPoint({ x: 2, y: 58 });
    expect(panel().outerHTML).not.toMatch(/NaN|Infinity/);
  });
  it.each([false, true])('provides a named44px toggle, full HTML readings and explicit contrast (%s)', async contrast => {
    await mount({}, contrast); await toggle(); const control = panel().querySelector('button');
    expect(control.type).toBe('button'); expect(control.style.minHeight).toBe('44px'); expect(control.getAttribute('aria-pressed')).toBe('true');
    control.focus(); expect(document.activeElement).toBe(control);
    expect(panel().style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    expect(panel().querySelectorAll('[data-plan-ruler-value]')).toHaveLength(3);
    expect(panel().querySelector('style').textContent).toContain('outline:3px solid');
  });
  it('recovers the entire previous PPE lesson including original safety rules and gates', () => {
    const source = stripPlanRuler(stripWeldlabWcagFixes(readFileSync(resolve(SRC), 'utf8')));
    const region = source.slice(source.indexOf('      function PPESafetyLab() {'), source.indexOf('      function CareerPathways() {'));
    const hashes = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-sequence-region-hashes.json'), 'utf8'));
    expect(createHash('sha256').update(region).digest('hex')).toBe(hashes.ppe);
  });
});
