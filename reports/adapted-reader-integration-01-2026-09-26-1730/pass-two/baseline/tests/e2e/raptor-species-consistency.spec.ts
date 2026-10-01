import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Every SPECIES record stores mass, wing area and wingspan AND two figures derived
 * from them: wingLoading (mass/area) and aspectRatio (span²/area). Nothing forced
 * them to agree, and the Harpy Eagle's did not: it stated AR 5.6 while its own
 * span and area gave 8.4. The stated 5.6 is exactly 2.05²/0.75, so the two derived
 * figures had been computed from DIFFERENT wing areas and the record kept the
 * wrong one.
 *
 * This is invisible on screen — every number looks plausible in isolation, and the
 * Wing-Loading Predictor happily places a bird using whichever figure it reads.
 * Only checking each record against itself exposes it.
 */
test.describe('Raptor Lab species data consistency', () => {
  test.describe.configure({ mode: 'serial' });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1280, height: 900, appStyles: true });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });
  test.beforeEach(async ({ page }) => {
    await harness.mount(page, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
  });

  test('every species roster row is internally consistent', async ({ page }) => {
    await page.evaluate(() => {
      const d = (window as any).__toolData;
      d.raptorHunt = Object.assign({}, d.raptorHunt, { activeSection: 'roster' });
      (window as any).__rerender();
    });
    // The roster opens on Cards; the per-species figures live in Compare.
    await page.getByRole('button', { name: /Compare/ }).first().click();
    await page.waitForSelector('[id="rh-panel-roster"] tbody tr');

    // The roster prints mass, wingspan, wing loading and aspect ratio per bird.
    // Wing area is not a column, but it is shared by both derived figures:
    //   loading = mass / area  and  AR = span² / area
    // so area = mass / loading, and AR must equal span² / that area. The Harpy
    // Eagle failed exactly this: its AR came from a 0.75 m² area while the record
    // stored 0.50, which no single-value check would catch.
    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[id="rh-panel-roster"] tbody tr')).map((tr) => {
        const cells = Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent || '').trim());
        return { name: cells[0], mass: Number(cells[1]), span: Number(cells[2]), loading: Number(cells[3]), ar: Number(cells[4]) };
      }).filter((r) => Number.isFinite(r.mass) && Number.isFinite(r.span) && r.loading > 0 && r.ar > 0));

    expect(rows.length, 'no roster rows parsed').toBeGreaterThan(15);

    const bad: string[] = [];
    for (const r of rows) {
      const impliedArea = r.mass / r.loading;
      const impliedAr = (r.span * r.span) / impliedArea;
      const driftPct = Math.abs(impliedAr - r.ar) / r.ar * 100;
      // Every other bird in the roster agrees to within ~2%; the harpy was out
      // by 50%. 12% leaves room for the published rounding in these figures.
      if (driftPct > 12) bad.push(`${r.name}: stated AR ${r.ar}, but mass/loading/span imply ${impliedAr.toFixed(2)} (${driftPct.toFixed(0)}% off)`);
    }
    expect(bad, 'species whose stated figures cannot describe one bird').toEqual([]);
  });

  test('the predictor places a designed bird beside a real one consistently', async ({ page }) => {
    await page.evaluate(() => {
      const d = (window as any).__toolData;
      d.raptorHunt = Object.assign({}, d.raptorHunt, { activeSection: 'predictor' });
      (window as any).__rerender();
    });
    await page.waitForSelector('[id="rh-panel-predictor"] input[type=range]');

    // Dial in the harpy's own published dimensions. The nearest real species
    // must then be the harpy itself — that only holds if its stored wingLoading
    // and aspectRatio are the ones its mass/area/span actually produce.
    const set = async (label: string, value: string) => {
      const el = page.locator(`[id="rh-panel-predictor"] input[aria-label*="${label}"]`);
      await el.evaluate((node: any, v: string) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        setter.call(node, v);
        node.dispatchEvent(new Event('input', { bubbles: true }));
      }, value);
    };
    await set('Body mass', '7.5');
    await set('Wingspan', '2.05');
    await set('Wing area', '0.75');
    await page.waitForTimeout(300);

    const readouts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[id="rh-panel-predictor"] .text-3xl, [id="rh-panel-predictor"] .text-2xl'))
        .map((n) => (n.textContent || '').trim()));
    // mass/area = 10.0 and span²/area = 5.6 for these inputs.
    expect(readouts.some((r) => /^10(\.0)?$/.test(r)), `wing loading readouts: ${JSON.stringify(readouts)}`).toBeTruthy();
    expect(readouts.some((r) => /^5\.6$/.test(r)), `aspect ratio readouts: ${JSON.stringify(readouts)}`).toBeTruthy();

    const panel = await page.locator('[id="rh-panel-predictor"]').innerText();
    expect(panel, 'a bird built to harpy dimensions should match the harpy').toMatch(/Harpy/i);
  });

  test('the wing-area hint quotes figures the roster actually holds', async ({ page }) => {
    await page.evaluate(() => {
      const d = (window as any).__toolData;
      d.raptorHunt = Object.assign({}, d.raptorHunt, { activeSection: 'predictor' });
      (window as any).__rerender();
    });
    await page.waitForSelector('[id="rh-panel-predictor"] input[type=range]');
    const hints = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[id="rh-panel-predictor"] .text-\\[10px\\]'))
        .map((n) => (n.textContent || '').trim()).filter((t) => /harpy/i.test(t)));
    const areaHint = hints.find((h) => /0\.\d\d/.test(h) && /harpy/i.test(h));
    expect(areaHint, `no wing-area hint found in ${JSON.stringify(hints)}`).toBeTruthy();
    // The harpy's wing area is 0.75 m². The hint used to say 0.50, which is the
    // value that made its stored aspect ratio impossible.
    expect(areaHint).toContain('0.75');
    expect(areaHint).not.toContain('0.50');
  });
});
