import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1100, height: 900, layout: 'document', appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, data: object = {}) {
  await page.addInitScript(() => {
    let id = 0, now = 1000; const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    (window as any).__trialTick = () => { now += 1000 / 60; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
  });
  await harness.mount(page, { physics: { investigationOpen: true, simSpeed: 1, ...data } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
}
async function patch(page: Page, values: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), values);
  await page.waitForTimeout(40);
}
async function finish(page: Page) {
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any; let count = 0;
    while (cv._launched && count++ < 10000) (window as any).__trialTick();
    if (cv._launched) throw Error('Guided trial flight did not land');
  });
  await page.waitForTimeout(40);
}
async function collect(page: Page, trial: number) {
  await page.locator(`[data-physics-investigation-trial="${trial}"]`).click();
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await finish(page);
}
async function choose(page: Page, activity = 'speed_squared') {
  await page.locator('[data-physics-investigation-activity]').selectOption(activity);
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics;
    return { ball: cv._ball, log: d.runLog, lastFlight: d.lastFlight, trails: (cv._trails || []).map((t: any) => ({ points: [...t], run: t.run, parameters: t.parameters, modelVersion: t.modelVersion, apex: t.apex })) };
  });
}
const matched = (page: Page, trial: number) => page.locator(`[data-physics-investigation-trial-evidence="${trial}"]`);
const pairButton = (page: Page) => page.locator('[data-physics-investigation-select-trials]');

for (const activity of ['speed_squared', 'inverse_gravity', 'mass_drag', 'horizontal_motion']) test(`${activity} identifies actual completed trials and selects their measured evidence`, async ({ page }) => {
  await mount(page); await choose(page, activity);
  await expect(page.locator('[data-physics-investigation-activity-title]')).toHaveText((await page.locator('[data-physics-investigation-activity] option:checked').textContent())!);
  await page.locator('#physics-investigation-prediction').fill('Keep my prediction while collecting evidence.');
  await expect(pairButton(page)).toBeDisabled();
  await collect(page, 1);
  await expect(matched(page, 1)).toHaveAttribute('data-matched-run', '1');
  await expect(matched(page, 2)).not.toHaveAttribute('data-matched-run');
  await expect(pairButton(page)).toBeDisabled();
  await collect(page, 2);
  await expect(matched(page, 2)).toHaveAttribute('data-matched-run', '2');
  await expect(page.locator('[data-physics-investigation-trial-progress]')).toContainText('2/2');
  const original = await evidence(page);
  await pairButton(page).click();
  const draft = await page.evaluate(() => (window as any).__toolData.physics.investigationDraft);
  expect(draft.selectedRunIds).toEqual([1,2]);
  expect(draft.prediction).toBe('Keep my prediction while collecting evidence.');
  await expect(page.locator('[data-physics-investigation-comparison]')).toHaveAttribute('data-reference-run', '1');
  expect(await evidence(page)).toEqual(original);
  const a = original.log[0], b = original.log[1];
  if (activity === 'speed_squared') expect(b.range / a.range).toBeCloseTo(4, 8);
  if (activity === 'inverse_gravity') expect(b.range / a.range).toBeCloseTo(2, 8);
  if (activity === 'mass_drag') expect(b.range).toBeGreaterThan(a.range);
  if (activity === 'horizontal_motion') { expect(b.time).toBeCloseTo(a.time, 10); expect(b.range / a.range).toBeCloseTo(2, 8); expect(a.maxH).toBe(10); }
});

test('repeated trials use the latest captured match even after controls and notes change', async ({ page }) => {
  await mount(page); await choose(page);
  await collect(page, 1); await collect(page, 2); await collect(page, 1);
  await patch(page, { velocity: 5, gravity: 1, mass: 9, launchHeight: 30, airResist: true });
  await page.locator('#physics-investigation-observation').fill('Keep this observation.');
  await expect(matched(page, 1)).toHaveAttribute('data-matched-run', '3');
  await expect(matched(page, 1)).toHaveAttribute('data-controls-match', 'false');
  await expect(matched(page, 2)).toHaveAttribute('data-controls-match', 'false');
  const original = await evidence(page);
  await pairButton(page).click();
  const state = await page.evaluate(() => (window as any).__toolData.physics);
  expect(state.investigationDraft.selectedRunIds).toEqual([3,2]);
  expect(state.investigationDraft.observation).toBe('Keep this observation.');
  expect(state).toMatchObject({ velocity: 5, gravity: 1, mass: 9, launchHeight: 30, airResist: true });
  expect(await evidence(page)).toEqual(original);
});

test('paused and interrupted trajectories do not count as completed trial measurements', async ({ page }) => {
  await mount(page); await choose(page);
  await patch(page, { simSpeed: 0 });
  await page.locator('[data-physics-investigation-trial="1"]').click();
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await expect(matched(page, 1)).toHaveAttribute('data-controls-match', 'true');
  await expect(matched(page, 1)).not.toHaveAttribute('data-matched-run');
  await page.getByRole('button', { name: 'Advance 0.035 seconds (available when paused)', exact: true }).click();
  await page.evaluate(() => (window as any).__trialTick());
  await expect(pairButton(page)).toBeDisabled();
  await page.locator('[data-physics-investigation-trial="2"]').click();
  await patch(page, { simSpeed: 1 });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click(); await finish(page);
  await expect(matched(page, 1)).not.toHaveAttribute('data-matched-run');
  await expect(matched(page, 2)).toHaveAttribute('data-matched-run', '1');
  expect((await evidence(page)).log).toHaveLength(1);
});

test('matching current controls and legacy summaries cannot substitute for compatible recorded trials', async ({ page }) => {
  const a = { n: 10, angle: 45, vel: 15, grav: 9.8, mass: 1, launchHeight: 0, drag: false, range: 23, maxH: 6, time: 2.2, modelVersion: 'projectile-v3' };
  const old = { ...a, n: 11, vel: 30, range: 92, maxH: 23, time: 4.3, modelVersion: 'projectile-v2' };
  await mount(page, { velocity: 30, angle: 45, gravity: 9.8, mass: 1, runLog: [a,old,{ ...old, n: 12, mass: 2, modelVersion: 'projectile-v3' }], investigationDraft: { activityId: 'speed_squared', title: 'Check the records', selectedRunIds: [] } });
  await expect(matched(page, 1)).toHaveAttribute('data-matched-run', '10');
  await expect(matched(page, 2)).toHaveAttribute('data-controls-match', 'true');
  await expect(matched(page, 2)).not.toHaveAttribute('data-matched-run');
  await expect(pairButton(page)).toBeDisabled();
  await patch(page, { runLog: [a,{ ...old, modelVersion: 'projectile-v3' }] });
  await expect(pairButton(page)).toBeEnabled(); await pairButton(page).click();
  expect(await page.evaluate(() => (window as any).__toolData.physics.investigationDraft.selectedRunIds)).toEqual([10,11]);
});

for (const drag of [undefined, null, 'false', 'true']) test(`restoration rejects malformed captured drag flag ${String(drag)} instead of matching a trial`, async ({ page }) => {
  const a = { n: 1, angle: 45, vel: 15, grav: 9.8, mass: 1, launchHeight: 0, drag, range: 23, maxH: 6, time: 2.2, modelVersion: 'projectile-v3' };
  const b = { ...a, n: 2, vel: 30, drag: false, range: 92, maxH: 23, time: 4.3 };
  await mount(page, { velocity: 15, angle: 45, gravity: 9.8, mass: 1, runLog: [a,b], lastFlight: a, investigationDraft: { activityId: 'speed_squared', title: 'Do not invent settings', selectedRunIds: [] } });
  await expect(matched(page, 1)).toHaveAttribute('data-controls-match', 'true');
  await expect(matched(page, 1)).not.toHaveAttribute('data-matched-run');
  await expect(matched(page, 2)).toHaveAttribute('data-matched-run', '2');
  await expect(pairButton(page)).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'Run 1', exact: true })).toHaveCount(0);
  const normalized = await page.evaluate(() => (window as any).StemLab._physics.normalizeState((window as any).__toolData.physics));
  expect(normalized.lastFlight).toBeNull(); expect(normalized.runLog.map((r: any) => r.n)).toEqual([2]);
});

test('reference selection updates draft comparisons and report order while saved evidence stays immutable', async ({ page }) => {
  await mount(page); await choose(page); await collect(page, 1); await collect(page, 2); await pairButton(page).click();
  await patch(page, { velocity: 20 });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click(); await finish(page);
  await page.getByRole('checkbox', { name: 'Run 3', exact: true }).check();
  const original = await evidence(page);
  await page.locator('[data-physics-investigation-reference]').selectOption('3');
  expect(await page.evaluate(() => (window as any).__toolData.physics.investigationDraft.selectedRunIds)).toEqual([3,1,2]);
  await expect(page.locator('[data-physics-investigation-comparison]')).toHaveAttribute('data-reference-run', '3');
  await page.locator('[data-physics-investigation-save]').click();
  const report = await page.locator('[data-physics-investigation-report]').innerText();
  expect(report).toContain('## Run 3 → Run 1'); expect(report).toContain('## Run 3 → Run 2');
  await page.locator('[data-physics-investigation-reference]').selectOption('1');
  await expect(page.locator('[data-physics-investigation-comparison]')).toHaveAttribute('data-reference-run', '1');
  await expect(page.locator('[data-physics-investigation-archived-evidence]')).toHaveAttribute('data-reference-run', '3');
  await expect(page.locator('[data-physics-investigation-report]')).toHaveText(report);
  expect(await evidence(page)).toEqual(original);
});

test('clearing and restoring recent evidence recomputes trial progress while preserving notes and archives', async ({ page }) => {
  await mount(page); await choose(page); await collect(page, 1); await collect(page, 2); await pairButton(page).click();
  await page.locator('#physics-investigation-observation').fill('The range increased.');
  await page.locator('[data-physics-investigation-save]').click();
  const saved = await page.locator('[data-physics-investigation-report]').innerText();
  const snapshot = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
  await page.getByRole('button', { name: 'Clear the experiment log', exact: true }).click();
  await expect(page.locator('[data-physics-investigation-trial-progress]')).toContainText('0/2');
  await expect(pairButton(page)).toBeDisabled();
  await expect(page.locator('#physics-investigation-observation')).toHaveValue('The range increased.');
  await expect(page.locator('[data-physics-investigation-report]')).toHaveText(saved);
  await page.evaluate(d => (window as any).__mount(d), snapshot);
  await expect(page.locator('[data-physics-investigation-trial-progress]')).toContainText('2/2');
  await expect(matched(page, 1)).toHaveAttribute('data-matched-run', '1');
  await expect(matched(page, 2)).toHaveAttribute('data-matched-run', '2');
  await expect(page.locator('[data-physics-investigation-reference]')).toHaveValue('1');
  await expect(page.locator('[data-physics-investigation-report]')).toHaveText(saved);
});

async function textLayout(root: Locator) {
  return root.evaluate(el => {
    const text: { font: number; contrast: number }[] = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lum = (color: string) => color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i],0);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement!; if (!node.textContent?.trim() || !parent.getClientRects().length) continue;
      const style = getComputedStyle(parent); let bg = 'rgb(255,255,255)';
      for (let p: Element | null = parent; p; p = p.parentElement) { const color = getComputedStyle(p).backgroundColor; if (/^rgb\(/.test(color)) { bg = color; break; } }
      const a = lum(style.color), b = lum(bg); text.push({ font: parseFloat(style.fontSize), contrast: (Math.max(a,b) + .05) / (Math.min(a,b) + .05) });
    }
    return { overflow: document.documentElement.scrollWidth - innerWidth, controls: [...el.querySelectorAll('button,select')].map(n => n.getBoundingClientRect().height), text };
  });
}
for (const theme of ['default','dark','contrast']) for (const width of [1100,375,320]) test(`${width}px ${theme} trial cards and reference controls support keyboard use without overflow`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page); await choose(page); await collect(page, 1); await collect(page, 2);
  await page.evaluate(t => {
    const wrap = document.getElementById('wrap')!, main = document.createElement('main'), card = document.createElement('div');
    wrap.parentElement!.insertBefore(main,wrap); main.append(card); card.append(wrap); main.className = 'main-content ' + (t === 'default' ? '' : 'theme-' + t); card.className = 'card';
    const ctx = (window as any).__ctx; ctx.isDark = t === 'dark'; ctx.isContrast = t === 'contrast'; ctx.theme = t; (window as any).__rerender();
  },theme);
  const original = await evidence(page);
  await pairButton(page).focus(); await pairButton(page).press('Enter');
  const reference = page.locator('[data-physics-investigation-reference]');
  await reference.focus(); await reference.press('ArrowDown'); await reference.press('Enter');
  await expect(reference).toHaveValue('2');
  await expect(page.locator('[data-physics-investigation-comparison]')).toHaveAttribute('data-reference-run','2');
  const root = page.locator('[data-physics-investigation-activity]').locator('..');
  const layout = await textLayout(root);
  expect(layout.overflow).toBeLessThanOrEqual(1); expect(layout.controls.every(h => h >= 44)).toBe(true);
  expect(layout.text.length).toBeGreaterThan(10); expect(layout.text.every(t => t.font >= 12 && t.contrast >= 4.5)).toBe(true);
  const link = page.locator('[data-physics-investigation-launch-link]'); await link.focus(); await link.press('Enter');
  await expect(page.locator('[data-physics-launch]')).toBeFocused();
  expect(await evidence(page)).toEqual(original); expect(errors).toEqual([]);
});
