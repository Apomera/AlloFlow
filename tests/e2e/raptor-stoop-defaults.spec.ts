import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * The Stoop Calculator's terminal-velocity model is correct, but its opening
 * frontal area was 0.018 m² — the tucked cross-section of a stooping peregrine is
 * ~0.006–0.008 m². So the page opened at 153 mph while the surrounding lab states
 * a peregrine stoop reaches ~242 mph in seven separate places, and while this
 * page's own "Load presets" button produced 0.0065 m² → 255 mph. A student who
 * never pressed that button read a headline figure ~37% below what the text taught.
 *
 * Nothing here is arithmetically wrong, so no sweep finds it: the formula checks
 * out at every input. Only comparing the default's OUTPUT against the claims made
 * around it exposes the gap, which is what these checks do.
 */
test.describe('Raptor Lab stoop calculator defaults', () => {
  test.describe.configure({ mode: 'serial' });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1280, height: 900, appStyles: true });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });
  test.beforeEach(async ({ page }) => {
    await harness.mount(page, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block;padding:16px}' });
    await page.evaluate(() => {
      const d = (window as any).__toolData;
      d.raptorHunt = Object.assign({}, d.raptorHunt, { activeSection: 'stoop' });
      (window as any).__rerender();
    });
    await page.waitForSelector('[id="rh-panel-stoop"] input[type=range]');
  });

  const readouts = async (page: any) =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('[id="rh-panel-stoop"] .text-3xl'))
        .map((n) => Number((n.textContent || '').replace(/[^\d.]/g, ''))));

  test('opens on a speed consistent with the ~242 mph the lab teaches', async ({ page }) => {
    const [mph, , joules] = await readouts(page);
    // Published peregrine stoop speeds cluster around 240-250 mph. Accept a band
    // rather than a point, but exclude the old 153 mph and any runaway value.
    expect(mph, `opening terminal velocity was ${mph} mph`).toBeGreaterThan(200);
    expect(mph).toBeLessThan(300);
    // The page's own impact-energy scale says "a peregrine at terminal velocity:
    // ~5,000 J". The opening state must land near that, not at less than half.
    expect(joules).toBeGreaterThan(4000);
    expect(joules).toBeLessThan(9000);
  });

  test('the opening state matches what the species preset produces', async ({ page }) => {
    const before = await readouts(page);
    await page.getByRole('button', { name: /Load active species presets/i }).click();
    await page.waitForTimeout(250);
    const after = await readouts(page);
    // The default and the preset are two routes to "a peregrine stoop". They
    // disagreeing by 100 mph is what made the old default wrong, so pin them
    // together: whichever moves, the other has to follow.
    expect(Math.abs(after[0] - before[0]), `default ${before[0]} mph vs preset ${after[0]} mph`).toBeLessThanOrEqual(5);
  });

  test('the frontal-area hint agrees with the value the page actually uses', async ({ page }) => {
    const area = await page.locator('[id="rh-panel-stoop"] input[aria-label*="Frontal"]').inputValue();
    const hint = await page.locator('[id="rh-panel-stoop"] .text-\\[10px\\]').filter({ hasText: /frontal area/i }).first().textContent();
    expect(hint, 'the hint should say what kind of area this is').toMatch(/tucked/i);
    // The hint quotes a peregrine figure; it must be the one the slider holds,
    // not a different number stated as fact (it used to claim 0.018).
    const quoted = (hint || '').match(/([\d.]+)\s*m/);
    expect(quoted, `no peregrine figure found in the hint: ${hint}`).not.toBeNull();
    expect(Math.abs(Number(quoted![1]) - Number(area)), `hint says ${quoted![1]} m², slider holds ${area}`)
      .toBeLessThanOrEqual(0.002);
  });

  test('the whole slider range stays physically sane', async ({ page }) => {
    const slider = page.locator('[id="rh-panel-stoop"] input[aria-label*="Frontal"]');
    const min = await slider.getAttribute('min');
    const max = await slider.getAttribute('max');
    for (const v of [min!, max!]) {
      await slider.evaluate((el: any, value: string) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, v);
      await page.waitForTimeout(200);
      const [mph, secs, joules] = await readouts(page);
      expect(Number.isFinite(mph) && mph > 0, `area ${v} gave ${mph} mph`).toBeTruthy();
      expect(Number.isFinite(secs) && secs > 0).toBeTruthy();
      expect(Number.isFinite(joules) && joules > 0).toBeTruthy();
      // Smaller frontal area must mean a faster fall, never the reverse.
      if (v === min) expect(mph).toBeGreaterThan(100);
      if (v === max) expect(mph).toBeLessThan(100);
    }
  });
});
