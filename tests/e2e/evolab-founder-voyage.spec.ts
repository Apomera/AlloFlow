import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
const range = async (page: any, id: string, value: number) => page.locator(id).evaluate((input: HTMLInputElement, v: number) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v)); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }, value);
async function fixture(page: any, rounds = 2, seed = 21) {
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const w = await page.evaluate(({ rounds, seed }) => { const m = (window as any).StemLab.evoArchipelagoModel; let w = m.create(seed); w.settings.migration = .4; w.settings.mutation = .05; for (let i = 0; i < rounds; i++) w = m.step(w); return w; }, { rounds, seed });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: w } }); return w;
}
async function expectTrail(passport: any, trail: any) {
  await expect(passport.locator('[data-passport-generation]')).toHaveCount(trail.steps.length);
  for (const s of trail.steps) {
    const row = passport.locator('[data-passport-generation="' + s.generation + '"]'); await expect(row).toHaveAttribute('data-passport-id', String(s.id)); await expect(row).toHaveAttribute('data-passport-copy', String(s.copy)); expect(Number(await row.getAttribute('data-passport-value'))).toBe(s.value);
  }
  await expect(passport.locator('[data-passport-founder]')).toHaveAttribute('data-passport-founder', String(trail.founder.id));
}

test('founder boats grow real private cohorts, reveal ancestry and gene flow, preserve full evidence and replay saved voyages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const w = await fixture(page), original = JSON.stringify(w), panel = page.locator('[data-founder-voyage]');
  await page.getByRole('button', { name: 'Investigate founders', exact: true }).click(); await expect(page.locator('#ea-founders-title')).toBeFocused();
  await panel.locator('#ea-founders-prediction').fill('Growing the population may not restore lost founder copies.'); await panel.getByRole('button', { name: 'Draw founder boats', exact: true }).click();
  for (const key of ['small', 'large']) await expect(panel.locator('[data-founder-world="' + key + '"] [data-founder-size]')).toHaveText(key === 'small' ? '6' : '24');
  await expect(panel.locator('[data-founder-history] tbody tr')).toHaveCount(1);
  await panel.getByRole('button', { name: 'Grow the private populations', exact: true }).click(); await expect(panel.locator('[data-founder-generation]')).toHaveText('G1 / G5');
  for (const key of ['small', 'large']) await expect(panel.locator('[data-founder-world="' + key + '"] [data-founder-size]')).toHaveText('24');
  await expect(panel.locator('[data-founder-history] tbody tr')).toHaveCount(2);
  await range(page, '#ea-founders-generation', 5);
  const expected = await page.evaluate(() => { const m = (window as any).StemLab.evoArchipelagoModel, a = m.founderStudy(21); return { small: m.stats(a.worlds.small.history[5].demes[2].birds), large: m.stats(a.worlds.large.history[5].demes[2].birds), census: m.founderCensus(a.worlds.small, 5, 2, 'birds'), trail: m.alleleTrail(a.worlds.small, a.worlds.small.history[5].demes[2].birds[0].id, 0, 'marker') }; });
  for (const key of ['small', 'large'] as const) expect(Number(await panel.locator('[data-founder-world="' + key + '"] [data-founder-frequency]').getAttribute('data-founder-frequency'))).toBe(expected[key].p);
  expect(Number(await panel.locator('[data-founder-world="small"] [data-founder-local]').getAttribute('data-founder-local'))).toBe(expected.census.localRepresented);
  const passport = panel.locator('[data-allele-passport="ea-founder-small"]'); await passport.locator('summary').click(); await expectTrail(passport, expected.trail);
  await panel.locator('#ea-founders-linked').check();
  const linked = await page.evaluate(() => { const m = (window as any).StemLab.evoArchipelagoModel; return m.founderCensus(m.founderStudy(21, { migration: .3 }).worlds.small, 5, 2, 'birds'); });
  expect(linked.origins[0] + linked.origins[1]).toBeGreaterThan(0); await expect(panel.locator('[data-founder-world="small"] [data-founder-outside]')).toHaveAttribute('data-founder-outside', String(linked.origins[0] + linked.origins[1]));
  await panel.screenshot({ path: report + '/founder-voyage-desktop.png' });
  const reasoning = 'Follow the copies, distinguish ancestry from allele letters. '.repeat(65).slice(0, 3800) + ' END OF FINDING'; await panel.locator('#ea-founders-reasoning').fill(reasoning);
  await panel.getByRole('button', { name: 'Save founder evidence to journal', exact: true }).click();
  const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoFounders.text); expect(note).toContain(reasoning); expect(note).toContain('not a distinct allele type'); expect(note).toContain('founder-copy origins Ember/Tide/Mist');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.archipelago))).toBe(original);
  await page.getByRole('button', { name: '← Living Island primer', exact: true }).click(); await page.getByRole('button', { name: 'Explore Island Connections · advanced →', exact: true }).click();
  await expect(panel.locator('[data-founder-generation]')).toHaveText('G5 / G5'); await expect(panel.locator('#ea-founders-linked')).toBeChecked(); await expect(panel.locator('#ea-founders-reasoning')).toHaveValue(reasoning);
  await panel.getByRole('button', { name: 'Draw another founder voyage', exact: true }).click(); await expect(panel.locator('[data-founder-batch]')).toHaveAttribute('data-founder-batch', '1'); await expect(panel.locator('[data-founder-generation]')).toHaveText('G0 / G5');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.archipelago))).toBe(original);
  const contexts = (await harness.glContexts(page)).filter(c => c.connected && !c.lost); expect(contexts).toHaveLength(1); expect(contexts[0].draws).toBeGreaterThan(0); expect(errors).toEqual([]);
});

test('phone learners can explore founder copies with keyboard controls, reduced motion and no WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any; });
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const w = await page.evaluate(() => (window as any).StemLab.evoArchipelagoModel.create(21)); await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: w } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  const panel = page.locator('[data-founder-voyage]'); await panel.getByRole('button', { name: 'Draw founder boats', exact: true }).focus(); await page.keyboard.press('Enter');
  await panel.locator('#ea-founders-generation').focus(); await page.keyboard.press('End'); await expect(panel.locator('[data-founder-generation]')).toHaveText('G5 / G5');
  await panel.locator('#ea-founders-linked').focus(); await page.keyboard.press('Space'); await expect(panel.locator('#ea-founders-linked')).toBeChecked();
  const passport = panel.locator('[data-allele-passport="ea-founder-small"]'); await passport.locator('summary').focus(); await page.keyboard.press('Enter');
  await passport.locator('#ea-founder-small-copy').focus(); await page.keyboard.press('End'); await expect(passport.locator('#ea-founder-small-copy')).toHaveValue('1'); await expect(passport.locator('[data-passport-generation]')).toHaveCount(6);
  await passport.locator('.ea-passport-route').focus(); await page.keyboard.press('End'); await expect(passport.locator('.ea-passport-route')).toBeFocused();
  await panel.locator('#ea-founders-species').selectOption('plants'); await panel.locator('#ea-founders-response').selectOption('H');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))); expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true); await panel.screenshot({ path: report + '/founder-voyage-phone.png' });
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(w);
});

test('the main expedition passport follows exact marker and trait copies across eight generations without consuming randomness', async ({ page }) => {
  const w = await fixture(page, 8, 7), original = JSON.stringify(w);
  const expected = await page.evaluate(() => { const m = (window as any).StemLab.evoArchipelagoModel, w = (window as any).__toolData.evoLab.archipelago; const o = w.history[8].demes[0].birds.find((o: any) => m.alleleTrail(w, o.id, 0, 'marker').crossings > 0 && m.alleleTrail(w, o.id, 0, 'trait').mutationEvents > 0); return o && { id: o.id, marker: m.alleleTrail(w, o.id, 0, 'marker'), trait: m.alleleTrail(w, o.id, 0, 'trait'), second: m.alleleTrail(w, o.id, 1, 'trait') }; }); expect(expected).toBeTruthy();
  await page.locator('#ea-resident').selectOption(String(expected.id)); const passport = page.locator('[data-allele-passport="ea-main-passport"]'); await passport.locator('summary').click(); await expectTrail(passport, expected.marker);
  await passport.locator('#ea-main-passport-locus').selectOption('trait'); await expectTrail(passport, expected.trait); await expect(passport).toContainText('Recorded trait mutation draw'); await passport.locator('#ea-main-passport-copy').selectOption('1'); await expectTrail(passport, expected.second);
  await passport.locator('#ea-main-passport-copy').selectOption('0'); await passport.locator('.ea-passport-route').focus(); await page.keyboard.press('End');
  await passport.screenshot({ path: report + '/allele-passport.png' }); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.archipelago))).toBe(original);
});
