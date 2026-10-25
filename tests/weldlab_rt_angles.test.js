import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshTool, mountState, renderState, unmountState, node, click, change, SRC } from './helpers/weldlab_interaction_mount.js';
import { stripRtAnglePair } from './helpers/weldlab_rt_pair_restore.js';
const BASE = { view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'choose', insp2_ndtDemo: 'rt', insp2_rtAngle: 30, insp2_ndtAns: { 0: 1 } };
const panel = () => node().querySelector('[data-rt-angle-pair]');
const card = slot => panel().querySelector(`[data-rt-angle-reading="${slot}"]`);
const n = (element, attr) => Number(element.getAttribute(attr));
beforeEach(freshTool); afterEach(unmountState);
const mount = (extra = {}, contrast = false) => mountState({ ...BASE, ...extra }, contrast);
describe('Local radiography angle comparison', () => {
  it('starts closed with independent0/45degree probes and no changes to the original angle', async () => {
    await mount(); expect(panel().tagName).toBe('DETAILS'); expect(panel().open).toBe(false);
    expect(n(card('a'), 'data-angle')).toBe(0); expect(n(card('b'), 'data-angle')).toBe(45);
    for (const specimen of panel().querySelectorAll('svg')) {
      expect(specimen.getAttribute('viewBox')).toBe('0 0 320 220');
      expect(specimen.getAttribute('aria-label')).toContain('Teaching diagram'); expect(specimen.getAttribute('aria-label')).not.toMatch(/misses it|shows it/);
    }
  });
  it.each([0, 5, 10, 45, 90])('draws the exact existing beam-path/film model at%sdegrees', async angle => {
    const app = await mount(), saved = JSON.stringify(app.latest()); await change(panel().querySelector('[data-rt-angle-probe="a"]'), String(angle));
    const current = card('a'), path = window.__WeldLabCore.insp2RtPath(angle, .25, .004), share = path / .5;
    expect(n(current, 'data-angle')).toBe(angle); expect(n(current, 'data-path')).toBeCloseTo(path, 12); expect(n(current, 'data-share')).toBeCloseTo(share, 12);
    const svg = current.querySelector('svg'), crack = svg.querySelectorAll('line')[3], rad = angle * Math.PI / 180;
    expect(n(crack, 'x1')).toBeCloseTo(160 - 15 * Math.sin(rad), 12); expect(n(crack, 'y1')).toBeCloseTo(100 - 15 * Math.cos(rad), 12);
    const film = svg.querySelectorAll('rect')[3]; expect(n(film, 'width')).toBeCloseTo(Math.max(2, (.25 * Math.sin(rad) + .004 * Math.cos(rad)) * 120), 12);
    expect(n(film, 'fill-opacity')).toBeCloseTo(Math.min(1, share / .1), 12); expect(n(card('b'), 'data-angle')).toBe(45);
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(0);
  });
  it('can copy the existing demo angle locally while the original slider retains its original saved action', async () => {
    const app = await mount(); const original = [...node().querySelectorAll('input[type="range"]')].find(input => !input.hasAttribute('data-rt-angle-probe'));
    await change(original, '60'); expect(app.latest().insp2_rtAngle).toBe(60); const writes = app.writes.length;
    await click(panel().querySelector('[data-rt-angle-current="b"]')); expect(n(card('b'), 'data-angle')).toBe(60);
    expect(app.writes).toHaveLength(writes); expect(app.latest().insp2_ndtAns).toEqual(BASE.insp2_ndtAns);
    await change(panel().querySelector('[data-rt-angle-probe="a"]'), 'bad'); expect(n(card('a'), 'data-angle')).toBe(0);
    await change(panel().querySelector('[data-rt-angle-probe="a"]'), '999'); expect(n(card('a'), 'data-angle')).toBe(90);
  });
  it('stays outside the method assessment and all other demos', () => {
    for (const extra of [{ insp2_ndtMode: 'quiz' }, { insp2_ndtDemo: 'ut' }, { insp2_ndtDemo: 'pt' }, { insp_sect: 'bench' }]) {
      expect(renderState({ ...BASE, ...extra }).querySelector('[data-rt-angle-pair]')).toBeNull();
    }
  });
  it.each([false, true])('provides native44px controls, readable copied labels and explicit contrast (%s)', async contrast => {
    await mount({}, contrast); expect(panel().style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    for (const control of panel().querySelectorAll('input,button,summary')) expect(control.style.minHeight).toBe('44px');
    expect(panel().querySelector('style').textContent).toContain('svg text{font-size:16px}');
    for (const input of panel().querySelectorAll('input')) expect(panel().querySelector(`label[for="${input.id}"]`)).toBeTruthy();
  });
  it('recovers the original complete inspection region and renderer exactly', () => {
    const source = stripRtAnglePair(readFileSync(resolve(SRC), 'utf8'));
    const region = source.slice(source.indexOf('      function InspectionCWIPrep() {'), source.indexOf('      function ConsumablesDeepDive() {'));
    const hashes = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-sequence-region-hashes.json'), 'utf8'));
    expect(createHash('sha256').update(region).digest('hex')).toBe(hashes.inspection);
  });
});
