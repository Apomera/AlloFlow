import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab',
  width: 900, height: 1000, layout: 'document',
});
const canvas = 'canvas[role=application]';
const burn = '[data-hud=burn]';
const errors = new WeakMap<Page, string[]>();

async function mount(page: Page, species = 'humboldtSquid', mode = 'free', phone = false) {
  if (phone) await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { cephalopodLab: {
    activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: species,
    huntMode: mode, huntSeed: 2741, huntQuality: 'low', _threeLoaded: true,
  } });
  await page.evaluate(phone => {
    const w = window as any;
    w.__scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
    w.__player = w.__scene.getObjectByName('cl-player');
    w.__testStep = 0;
    w.THREE.Clock.prototype.getDelta = function () {
      const dt = w.__testStep; w.__testStep = 0; return dt;
    };
    // Keep the actual movement and metabolism; remove unrelated encounters.
    w.__scene.children.forEach((o: any) => {
      if (o.userData.substrate === 'rock') {
        o.position.set(w.__player.position.x - 18, o.position.y, w.__player.position.z - 18);
        o.userData.substrateRadius = 0;
      }
      if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9;
    });
    if (phone) { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); }
    w.__scene.updateMatrixWorld(true);
  }, phone);
  await page.locator(canvas).focus();
  await advance(page, 3);
}

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let i = 0; i < count; i++) {
      w.__testStep = 0.05;
      do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
      while (w.__testStep !== 0);
    }
  }, frames);
}

test.describe.configure({ timeout: 150000, retries: 0 });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => {
  const events: string[] = []; errors.set(page, events);
  page.on('pageerror', e => events.push(e.message));
  page.on('console', m => { if (m.type() === 'error') events.push(m.text()); });
});
test.afterEach(async ({ page }) => {
  await harness.destroy(page);
  expect(errors.get(page)).toEqual([]);
});

test('squid propulsion names hovering, swimming and effective vertical motion with actual energy rates', async ({ page }) => {
  await mount(page);
  await expect(page.locator(burn)).toHaveText('Hovering · 1.0 energy/s');
  await page.keyboard.down('KeyW'); await advance(page, 4);
  await expect(page.locator(burn)).toHaveText('Swimming · 1.6 energy/s');
  await page.keyboard.down('KeyQ'); await advance(page, 4);
  await expect(page.locator(burn)).toHaveText('Rising · 1.6 energy/s');
  await page.keyboard.up('KeyQ'); await page.keyboard.down('KeyZ'); await advance(page, 4);
  await expect(page.locator(burn)).toHaveText('Diving · 1.6 energy/s');
  await page.keyboard.up('KeyZ'); await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyA'); await advance(page, 4);
  await expect(page.locator(burn)).toHaveText('Turning · 1.6 energy/s');
  await page.keyboard.up('KeyA'); await advance(page, 3);
  await expect(page.locator(burn)).toHaveText('Hovering · 1.0 energy/s');
  await page.keyboard.press('Escape');
  await expect(page.locator(burn)).toHaveText('Paused');
});

test('held jet exhaustion reports the existing 24-stamina recovery and clears when jetting resumes or is released', async ({ page }) => {
  await mount(page);
  await page.keyboard.down('KeyW'); await page.keyboard.down('Space'); await advance(page, 4);
  await expect(page.locator(burn)).toHaveText('Jetting · 4.0 energy/s');
  await advance(page, 36);
  await expect(page.locator(burn)).toContainText(/Swimming · Jet recovering \d+\/24 stamina · 1\.6 energy\/s/);
  const stamina = Number(await page.locator('[data-hud=stamina]').innerText());
  expect(stamina).toBeLessThan(24);
  // Original regeneration is 18/s: wait just past the existing latch threshold.
  await advance(page, Math.ceil((24 - stamina) / 0.9) + 4);
  await expect(page.locator(burn)).toHaveText('Jetting · 4.0 energy/s');
  await advance(page, 8);
  await expect(page.locator(burn)).toContainText('Jet recovering');
  await page.keyboard.up('Space'); await advance(page, 3);
  await expect(page.locator(burn)).toHaveText('Swimming · 1.6 energy/s');
  await page.keyboard.up('KeyW');
});

test('Dumbo fin boost displays its applied energy cost without jet exhaustion or a fivefold claim', async ({ page }) => {
  await mount(page, 'dumboOcto');
  const before = Number(await page.locator('[data-hud=stamina]').innerText());
  await page.keyboard.down('KeyW'); await page.keyboard.down('Space'); await advance(page, 20);
  await expect(page.locator(burn)).toHaveText('Fin boost · 1.6 energy/s');
  expect(Number(await page.locator('[data-hud=stamina]').innerText())).toBe(before);
  await expect(page.locator(burn)).not.toContainText(/recovering|5×/);
  await page.locator('.cl-hunt-stage').screenshot({ path: 'reports/cephalopod-hunter-enhancement/pass-nine/dumbo-fin-boost.png' });
  await page.keyboard.up('Space'); await page.keyboard.up('KeyW');
});

test('phone propulsion stays visible with larger text and preserves Observe and clamped-depth feedback', async ({ page }) => {
  await mount(page, 'commonOcto', 'observe', true);
  await page.getByRole('button', { name: 'Help / settings' }).click();
  await page.getByLabel('Larger text', { exact: true }).check();
  await page.getByRole('button', { name: 'Resume dive' }).click();
  await page.locator(canvas).focus();
  const energy = await page.locator('[data-hud=energy]').innerText();
  await page.keyboard.down('KeyZ'); await advance(page, 4);
  await expect(page.locator(burn)).toHaveText('Resting · Field study · energy conserved');
  await page.keyboard.up('KeyZ'); await page.keyboard.down('KeyW'); await advance(page, 4);
  await expect(page.locator(burn)).toHaveText('Crawling · Field study · energy conserved');
  await page.keyboard.up('KeyW');
  expect(await page.locator('[data-hud=energy]').innerText()).toBe(energy);
  await expect(page.locator(burn)).toBeVisible();
  const fit = await page.locator(burn).evaluate(el => {
    const row = el as HTMLElement, hud = row.closest('.cl-hunt-hud') as HTMLElement;
    const stage = row.closest('.cl-hunt-stage') as HTMLElement;
    const controls = stage.querySelector('.cl-hunt-controls') as HTMLElement;
    const r = row.getBoundingClientRect(), h = hud.getBoundingClientRect(), c = controls.getBoundingClientRect();
    return { overflow: row.scrollWidth - row.clientWidth, rowRight: r.right, hudRight: h.right, hudBottom: h.bottom, controlsTop: c.top, viewport: innerWidth };
  });
  expect(fit.overflow).toBeLessThanOrEqual(1);
  expect(fit.rowRight).toBeLessThanOrEqual(Math.min(fit.hudRight, fit.viewport) + 1);
  expect(fit.hudBottom).toBeLessThan(fit.controlsTop);
  await page.keyboard.down('KeyW'); await page.keyboard.down('Space'); await advance(page, 54);
  await expect(page.locator(burn)).toContainText(/Jet recovering \d+\/24 stamina/);
  await expect(page.locator(burn)).toContainText('Field study · energy conserved');
  const recoveryFit = await page.locator(burn).evaluate(el => {
    const row = el as HTMLElement, hud = row.closest('.cl-hunt-hud') as HTMLElement;
    const controls = row.closest('.cl-hunt-stage')!.querySelector('.cl-hunt-controls') as HTMLElement;
    return { overflow: row.scrollWidth - row.clientWidth, right: row.getBoundingClientRect().right, hudBottom: hud.getBoundingClientRect().bottom, controlsTop: controls.getBoundingClientRect().top };
  });
  expect(recoveryFit.overflow).toBeLessThanOrEqual(1);
  expect(recoveryFit.right).toBeLessThanOrEqual(391);
  expect(recoveryFit.hudBottom).toBeLessThan(recoveryFit.controlsTop);
  await page.screenshot({ path: 'reports/cephalopod-hunter-enhancement/pass-nine/propulsion-phone.png' });
  await page.keyboard.up('Space'); await page.keyboard.up('KeyW');
});
