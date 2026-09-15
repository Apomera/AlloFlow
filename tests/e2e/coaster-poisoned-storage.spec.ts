import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * A malformed localStorage value must not blank the tool.
 *
 * A lab-wide sweep found "unknown persisted tab id renders an empty shell" in 11 STEM
 * tools and 34 of 68 SEL tools, so Coaster Lab was audited for the same class
 * (2026-09-15). It survives: every persisted read is either allow-listed, binary-
 * branched, or sanitised by the function that consumes it, and the saved design has a
 * recovery path that backs the bad value up and falls back to the starter layout.
 * This spec keeps it that way.
 *
 * The key list is READ FROM THE SOURCE, not hand-typed: the first version of this
 * sweep used a hand-written list and missed 11 of the tool's 24 keys, including every
 * JSON-valued one (the saved design is `coaster_lab_design_v2`, not `..._design`).
 *
 * Panel TEXT LENGTH is not the assertion. Every panel carries static intro HTML, so a
 * planted `level !== 'engineer' -> return` (the empty-shell shape) left ~1.6 KB of
 * boilerplate standing and a length check passed the mutation. The assertions below
 * name the containers the tool FILLS AT RUNTIME — the Certify checkpoint list, the
 * Build node palette, the Missions list — which is what actually goes blank.
 */
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_coasterlab.js', toolId: 'coasterLab', width: 1200, height: 800,
  probes: "document.head.insertAdjacentHTML('beforeend', '<style>#wrap{width:100%}.clab-root{width:100%;height:100vh!important}</style>');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const SEL = '[aria-label="Coaster Lab 3-D designer"]';
const TOOL = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const KEYS = [...new Set([...TOOL.matchAll(/'(coaster_lab[a-z0-9_]*)'/g)].map(m => m[1]))]
  .filter(k => k !== 'coaster_lab_onboarding_v1');   // set to 'complete' so the tool opens past the intro
const TABS = ['build', 'cert', 'report', 'missions'];

test('the source still declares every key this sweep poisons', () => {
  expect(KEYS.length).toBeGreaterThanOrEqual(23);
  for(const k of ['coaster_lab_design_v2', 'coaster_lab_guided_record_v1', 'coaster_lab_missions_v1', 'coaster_lab_track_viz', 'coaster_lab_ride_topic', 'coaster_lab_level'])
    expect(KEYS, k + ' is swept').toContain(k);
});

for(const junk of ['__junk__', '', '{]', '-999999', '[]', '{"points":[]}', 'null']){
  test(`every panel still renders with every key set to ${JSON.stringify(junk)}`, async ({ page }) => {
    test.setTimeout(240000);
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    const consoleErrors: string[] = []; page.on('console', m => { if(m.type() === 'error') consoleErrors.push(m.text()); });
    await page.addInitScript(([keys, v]) => {
      localStorage.setItem('coaster_lab_onboarding_v1', 'complete');
      for(const k of keys as string[]) localStorage.setItem(k, v as string);
    }, [KEYS, junk]);
    await harness.mount(page, {}, `document.querySelector('${SEL}')._lab`);
    // the tool mounted and published its dev surface at all
    expect(await page.evaluate((sel) => !!(document.querySelector(sel) as any)?._lab, SEL)).toBe(true);
    // walk every tab; measure the containers the tool fills at runtime, not the panel's
    // static intro copy (a length check on the panel passed a planted empty-shell bug)
    for(const id of TABS){
      await page.locator('#clab-tab-' + id + '-btn').click();
      const seen = await page.evaluate((i) => {
        const panel = document.getElementById('clab-tab-' + i) as HTMLElement | null;
        if(!panel || panel.hidden) return null;
        const live: Record<string, number> = {};
        for(const sel of ['#clab-problems', '#clab-markerLegend', '#clab-elementPalette', '#clab-safetyList', '#clab-missionList', '#clab-reportBody']){
          const el = panel.querySelector(sel) as HTMLElement | null;
          if(el) live[sel] = (el.innerText || '').trim().length;
        }
        return { panelChars: (panel.innerText || '').trim().length, live };
      }, id);
      expect(seen, id + ' panel is visible').not.toBeNull();
      expect(seen!.panelChars, id + ' panel has content').toBeGreaterThan(40);
      // the runtime-filled regions of this panel must not all be empty
      const filled = Object.entries(seen!.live).filter(([, n]) => n > 0).map(([k]) => k);
      expect(filled, id + ' runtime regions filled (saw ' + JSON.stringify(seen!.live) + ')').not.toEqual([]);
    }
    // Certify renders its checkpoint work either way: Engineer problems or Explore hypotheses
    await page.locator('#clab-tab-cert-btn').click();
    const certWork = await page.evaluate(() => {
      const problems = (document.getElementById('clab-problems') as HTMLElement | null);
      return { chars: problems ? (problems.innerText || '').trim().length : -1, children: problems ? problems.children.length : -1 };
    });
    expect(certWork.chars, 'Certify checkpoint work rendered').toBeGreaterThan(120);
    expect(certWork.children, 'Certify checkpoint work has elements').toBeGreaterThan(0);
    expect(errors, 'page errors').toEqual([]);
    expect(consoleErrors, 'console errors').toEqual([]);
  });
}
