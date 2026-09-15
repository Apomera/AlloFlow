import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * The onboard rider must not pass through the ride's own scenery.
 *
 * Three things put the first-person camera inside solid geometry (2026-09-14):
 *   1. Support columns dropped straight down from the upper leg of a figure-8 or
 *      helix, through the lower leg — the rider of the lower leg went through them.
 *   2. The station is a straight 12 m platform placed along the heading at the
 *      start; a return leg bending in from that side ran through its gate posts.
 *   3. In any row but the front the camera sat between the two riders' shoulders,
 *      so in airtime their arms swung up through the lens as two flat slabs.
 *
 * The tool's `cameraClearance(s, seat, reach)` hook puts the rider's eye at arc
 * length s and casts short rays in six directions at everything but the train.
 * Any hit inside the reach is something the rider passes through. Platform
 * furniture at the boarding edge sits about 1 m from the spine by design, so the
 * assertions use a 0.9 m reach and ignore the platform's own bay plates.
 */
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_coasterlab.js', toolId: 'coasterLab', width: 1200, height: 800,
  probes: "document.head.insertAdjacentHTML('beforeend', '<style>#wrap{width:100%}.clab-root{width:100%;height:100vh!important}</style>');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const SEL = '[aria-label="Coaster Lab 3-D designer"]';
// The return leg passes 9 m under the outbound hill, then sweeps into the station from the side.
const FIG8 = { certTurnIdx: 4, propulsion: { mode: 'chain', accel: 7.5 }, points: [
  { x: 0, y: 3, z: 0, bank: 0 }, { x: 14, y: 4, z: 0, bank: 0 }, { x: 44, y: 30, z: 0, bank: 0 },
  { x: 60, y: 14, z: 0, bank: 0 }, { x: 80, y: 6, z: 0, bank: 0 }, { x: 100, y: 12, z: 6, bank: 0 },
  { x: 110, y: 10, z: 20, bank: 0 }, { x: 100, y: 8, z: 34, bank: 0 }, { x: 80, y: 5, z: 40, bank: 0 },
  { x: 60, y: 4, z: 30, bank: 0 }, { x: 44, y: 4, z: 12, bank: 0 }, { x: 30, y: 3.5, z: -14, bank: 0 },
  { x: 10, y: 3, z: -16, bank: 0 }, { x: -6, y: 3, z: -6, bank: 0 } ] };
// Three descending turns stacked over the same ground plan.
const HELIX = (() => {
  const pts: any[] = [{ x: 0, y: 3, z: 0, bank: 0 }, { x: 14, y: 4, z: 0, bank: 0 }, { x: 40, y: 30, z: 0, bank: 0 }, { x: 56, y: 26, z: 4, bank: 0 }];
  for(let k = 0; k < 18; k++){ const a = k / 6 * Math.PI * 2; pts.push({ x: +(70 + 16 * Math.sin(a)).toFixed(1), y: +(24 - k * 1.15).toFixed(1), z: +(20 - 16 * Math.cos(a)).toFixed(1), bank: 0 }); }
  pts.push({ x: 50, y: 4, z: 30, bank: 0 }, { x: 20, y: 3.5, z: 20, bank: 0 }, { x: -6, y: 3, z: 6, bank: 0 });
  return { certTurnIdx: 8, propulsion: { mode: 'chain', accel: 7.5 }, points: pts };
})();

test('the onboard rider clears supports and the station on crossing designs and every template', async ({ page }) => {
  test.setTimeout(600000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('coaster_lab_onboarding_v1', 'complete'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, {}, `document.querySelector('${SEL}')._lab`);
  const report = await page.evaluate(async ({ fig8, helix, sel }) => {
    const lab = (document.querySelector(sel) as any)._lab;
    const out: Record<string, { L: number; columns: number; intrusions: string[] }> = {};
    const sweep = async (key: string) => {
      await new Promise(r => setTimeout(r, 150));
      const L = lab.cameraClearance(0).L;
      const intrusions: string[] = [];
      for(let s = 0; s < L; s += 0.5){
        const r = lab.cameraClearance(s, 0, 0.9);
        for(const h of r.hits){
          if(h.dir === 'down' || h.name === 'station-bay-number') continue;
          intrusions.push(r.s + ':' + h.dir + ':' + h.name + '@' + h.distance);
        }
      }
      const columns = lab.supportPresentation().batches.find((b: any) => b.name === 'coaster-support-columns').count;
      out[key] = { L, columns, intrusions };
    };
    lab.loadDesignObject(fig8); await sweep('figure8');
    lab.loadDesignObject(helix); await sweep('helix');
    for(const tpl of ['looper', 'twister', 'oval']){ lab.loadTemplate(tpl); await sweep(tpl); }
    return out;
  }, { fig8: FIG8, helix: HELIX, sel: SEL });
  for(const [key, r] of Object.entries(report)){
    expect(r.intrusions, key + ' intrusions').toEqual([]);
    expect(r.columns, key + ' still has supports').toBeGreaterThan(50);
  }
  expect(errors).toEqual([]);
});

test('a rear-row rider is not drawn while the camera borrows their seat, and everyone is back for the photo', async ({ page }) => {
  test.setTimeout(300000);
  await page.addInitScript(() => { localStorage.setItem('coaster_lab_onboarding_v1', 'complete'); });
  await harness.mount(page, {}, `document.querySelector('${SEL}')._lab`);
  await page.locator('#clab-seatSel').selectOption('2');
  const state = await page.evaluate((sel) => {
    const lab = (document.querySelector(sel) as any)._lab;
    lab.loadTemplate('family');
    lab.setCam('onboard'); lab.place(87 + 2 * 2.6, 12); lab.settleCam(3);
    const onboard = lab.riderVisibility();
    const photo = lab.riderVisibility(true);      // what capturePhoto asks for
    lab.setCam('orbit'); lab.settleCam(3);
    const orbit = lab.riderVisibility();
    return { onboard, photo, orbit };
  }, SEL);
  expect(state.onboard.hiddenCar).toBe(2);
  expect(state.onboard.visible.filter((v: boolean) => !v).length).toBe(2);
  expect(state.photo.visible.every((v: boolean) => v)).toBe(true);
  expect(state.orbit.hiddenCar).toBe(-1);
  expect(state.orbit.visible.every((v: boolean) => v)).toBe(true);
});
