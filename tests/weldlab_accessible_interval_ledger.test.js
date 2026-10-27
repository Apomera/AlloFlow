import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change } from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  freshTool();
});
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; vi.restoreAllMocks(); });
const q = selector => node().querySelector(selector);
const retained = { car2_reflect: 'Keep my reflection.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };
const run = [6, 12, 24, 10, 18];
const program = [{ x: 1, y: 1, m: 'J', w: false }, { x: 4, y: 6, m: 'J', w: false }, { x: 12, y: 6, m: 'L', w: true }, { x: 12, y: 1, m: 'J', w: false }, { x: 1, y: 1, m: 'L', w: false }];
function externalFocus() { outside = document.createElement('button'); document.body.append(outside); outside.focus(); }
const modules = [
  {
    name: 'Recorded bead intervals', prefix: 'arc-interval',
    state: { ...retained, view: 'beadLab', bl_view: 'topdown', arc_handsOn: true, arc_run: run, arc_runHand: true, bl_V: 22, bl_A: 180, bl_TS: 12, bl_process: 'mig', bl_material: 'steel', bl_thickness: .25 },
    collection: 'arc_run', samples: run, panel: '[data-arc-intervals]', reading: '[data-arc-interval-values]',
    preserved: '[data-arc-verdict],[data-arc-trace]',
    check(index) {
      const model = window.__WeldLabCore.arc.beadReport(22, 180, run[index], 'mig', 'steel', .25, null);
      expect(Number(q('[data-arc-interval-position]').dataset.arcIntervalPosition)).toBe(index);
      expect(Number(q('[data-arc-interval-reading="speed"]').dataset.value)).toBe(run[index]);
      expect(Number(q('[data-arc-interval-reading="width"]').dataset.value)).toBeCloseTo(model.width, 12);
      expect(Number(q('[data-arc-interval-reading="penetration"]').dataset.value)).toBeCloseTo(model.penetration, 12);
    }
  },
  {
    name: 'Robot time ledger', prefix: 'rob-time',
    state: { ...retained, view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: program, tech2_rob_sort: { 0: 'manual' } },
    collection: 'tech2_rob_prog', samples: program, panel: '[data-rob-time-ledger]', reading: '[data-rob-time-reading]',
    preserved: '[data-robot-inspector]',
    check(index) {
      const reading = q('[data-rob-time-reading]'), segment = q('[data-rob-time-segment="' + index + '"]');
      expect(Number(reading.dataset.robTimeReading)).toBe(index);
      for (const key of ['start', 'end', 'seconds', 'mm', 'speed']) expect(Number(reading.getAttribute('data-' + key))).toBeCloseTo(Number(segment.getAttribute('data-' + key)), 12);
      expect(Number(reading.dataset.seconds)).toBeCloseTo(Number(reading.dataset.mm) / Number(reading.dataset.speed), 12);
    }
  }
];

for (const module of modules) {
  const select = () => q('[data-' + module.prefix + '-select]');
  const previous = () => q('[data-' + module.prefix + '-prev]');
  const next = () => q('[data-' + module.prefix + '-next]');
  const untouched = () => [...node().querySelectorAll(module.preserved)].map(element => element.outerHTML);
  const open = () => { const panel = q(module.panel); if (panel.tagName === 'DETAILS') panel.open = true; };

  describe(module.name + ' endpoint focus', () => {
    it.each([false, true])('retains step focus until the first/last item, then focuses the updated native selection without changing saved work, contrast=%s', async contrast => {
      const app = await mountState(module.state, contrast); open();
      const saved = structuredClone(app.latest()), writeCount = app.writes.length, before = untouched();
      expect(before.length).toBeGreaterThan(0);
      next().focus();
      for (let index = 1; index < 4; index++) {
        await click(next()); expect(select().value).toBe(String(index)); expect(next().disabled).toBe(false); expect(document.activeElement).toBe(next()); module.check(index);
      }
      await click(next()); expect(select().value).toBe('4'); expect(next().disabled).toBe(true); expect(document.activeElement).toBe(select()); module.check(4);
      previous().focus();
      for (let index = 3; index > 0; index--) {
        await click(previous()); expect(select().value).toBe(String(index)); expect(previous().disabled).toBe(false); expect(document.activeElement).toBe(previous()); module.check(index);
      }
      await click(previous()); expect(select().value).toBe('0'); expect(previous().disabled).toBe(true); expect(document.activeElement).toBe(select()); module.check(0);
      expect(untouched()).toEqual(before); expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(writeCount);
    });

    it.each([false, true])('keeps initial/direct-selection focus and consumes endpoint requests once while preserving live results, contrast=%s', async contrast => {
      externalFocus(); const app = await mountState(module.state, contrast); open();
      const saved = structuredClone(app.latest()), writeCount = app.writes.length;
      expect(document.activeElement).toBe(outside);
      const reading = q(module.reading); expect(reading.getAttribute('aria-live')).toBe('polite'); expect(reading.getAttribute('aria-atomic')).toBe('true');
      select().focus(); await change(select(), '4'); expect(document.activeElement).toBe(select()); expect(next().disabled).toBe(true); module.check(4);
      await change(select(), '1'); previous().focus(); await click(previous()); expect(document.activeElement).toBe(select());
      outside.focus(); await change(select(), '2'); expect(document.activeElement).toBe(outside); module.check(2);
      expect(q(module.reading)).toBe(reading);
      await change(select(), '3'); next().focus(); await click(next()); expect(document.activeElement).toBe(select());
      outside.focus(); await change(select(), '1'); expect(document.activeElement).toBe(outside); module.check(1);
      expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(writeCount);
    });

    it.each([false, true])('keeps empty and single-item mounts quiet and disabled actions inert, contrast=%s', async contrast => {
      externalFocus();
      let app = await mountState({ ...module.state, [module.collection]: [] }, contrast); open();
      expect(document.activeElement).toBe(outside); expect(select()).toBeNull(); expect(previous()).toBeNull(); expect(next()).toBeNull();
      expect(app.latest()[module.collection]).toEqual([]);
      await unmountState();
      app = await mountState({ ...module.state, [module.collection]: module.samples.slice(0, 1) }, contrast); open();
      const saved = structuredClone(app.latest()), writeCount = app.writes.length;
      expect(document.activeElement).toBe(outside); expect(select().value).toBe('0'); expect(previous().disabled).toBe(true); expect(next().disabled).toBe(true);
      await click(previous()); await click(next()); expect(document.activeElement).toBe(outside);
      select().focus(); await change(select(), '0'); expect(document.activeElement).toBe(select());
      expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(writeCount);
    });
  });
}
