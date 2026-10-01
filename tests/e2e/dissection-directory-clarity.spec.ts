import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-directory-clarity-2026-09-29';
const baseline = process.env.DISSECTION_DIRECTORY_BASELINE === '1';
const captureStyle = '.diss-next-action { position: static !important; }';
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', selectedOrgan: null, revealedLayers: { skin: true }, exploredOrgans: { 'frog|ventral_skin': true, 'frog|tympanum': true }, verifiedIdentifications: { 'frog|ventral_skin': true }, organNotes: { 'frog|ventral_skin': 'I observed the thinner skin on the ventral surface.' }, organConfidence: { 'frog|ventral_skin': 2 }, quizScore: 1, quizTotal: 2, workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false, sceneDetail: false };

test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

async function mount(page: Page, state = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: `#wrap { width:100% !important; max-width:${available}px; }` });
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, score: d.quizScore, total: d.quizTotal, revealed: d.revealedLayers, selected: d.selectedOrgan, layer: d.activeLayer };
  });
}

const cases = [
  { name: 'phone', width: 320, available: 320 },
  { name: 'tablet', width: 768, available: 768 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  { name: 'desktop', width: 1440, available: 1180 },
  { name: 'forced-colors', width: 390, available: 390, forced: true },
];

for (const { name, width, available, large, contrast, forced } of cases) {
  test(`directory layout ${name} is readable and supports navigation without recording progress`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    if (forced) await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, { largeText: !!large, highContrast: !!contrast }, width, available);
    const directory = page.locator('[data-dissection-directory]');
    const before = await evidence(page);
    await directory.screenshot({ path: `${out}/${baseline ? 'before' : 'after'}-${name}.png`, style: captureStyle });
    if (baseline) return;
    const metrics = await directory.evaluate(el => ({ width: el.getBoundingClientRect().width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
      buttons: Array.from(el.querySelectorAll('[data-exposure-state], [data-directory-filter]')).map(node => ({ label: node.getAttribute('aria-label'), height: node.getBoundingClientRect().height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, row: node.hasAttribute('data-exposure-state') })),
      texts: Array.from(el.querySelectorAll('.diss-directory-item__name, .diss-directory-item .diss-directory-progress, .diss-directory-item__state, .diss-directory-keyboard-help, .diss-directory-status')).map(node => parseFloat(getComputedStyle(node).fontSize)),
      names: Array.from(el.querySelectorAll('.diss-directory-item__name')).map(node => parseFloat(getComputedStyle(node).fontSize)) }));
    await writeFile(`${out}/${name}.json`, JSON.stringify(metrics, null, 2));
    expect(metrics.width).toBeLessThanOrEqual(available);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.texts.every(size => size >= 13.9)).toBe(true);
    expect(metrics.names.every(size => size >= (large ? 15.9 : 15.1))).toBe(true);
    for (const button of metrics.buttons) {
      expect(button.height).toBeGreaterThanOrEqual(button.row ? 71.9 : 47.9);
      expect(button.scrollWidth, button.label || '').toBeLessThanOrEqual(button.clientWidth + 1);
    }
    const search = directory.locator('#diss-organ-search');
    const rows = directory.locator('#diss-directory-results > button[data-exposure-state]');
    await search.focus(); await search.press('ArrowDown'); await expect(rows.nth(0)).toBeFocused();
    await rows.nth(0).screenshot({ path: `${out}/focus-${name}.png`, style: captureStyle });
    await page.keyboard.press('ArrowDown'); await expect(rows.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowUp'); await expect(rows.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowDown'); await expect(rows.nth(1)).toBeFocused();
    await page.keyboard.press('End'); await expect(rows.nth(3)).toBeFocused();
    await page.keyboard.press('Home'); await expect(rows.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowUp'); await expect(search).toBeFocused();
    expect(await evidence(page)).toEqual(before);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-dissection-directory]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('keyboard activation inspects a chosen visible result and restores directory focus', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page);
  const before = await evidence(page);
  const search = page.locator('#diss-organ-search');
  await search.fill('nictitating'); await search.press('ArrowDown');
  await expect(page.locator('#diss-organ-nictitating')).toBeFocused();
  expect(await evidence(page)).toEqual(before);
  await page.keyboard.press('Enter');
  await expect(page.locator('#diss-selection-title')).toBeFocused();
  expect(await evidence(page)).toEqual({ ...before, selected: 'nictitating', explored: { ...before.explored, 'frog|nictitating': true } });
  await page.getByRole('button', { name: 'Back to structure directory', exact: true }).click();
  await expect(page.locator('#diss-organ-nictitating')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(search).toBeFocused(); await expect(search).toHaveValue('');
  await expect(page.locator('[data-directory-filter="all"]')).toHaveAttribute('aria-pressed', 'true');
  expect((await evidence(page)).notes).toEqual(before.notes);
});

test('empty-state actions preserve a query when removing a filter and reset an unsuccessful search', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page);
  const before = await evidence(page);
  const search = page.locator('#diss-organ-search');
  await search.fill('ventral'); await page.locator('[data-directory-filter="needs-record"]').click();
  const empty = page.locator('.diss-directory-empty');
  await expect(empty).toContainText('No structures match this progress filter');
  await empty.screenshot({ path: `${out}/empty-filter.png`, style: captureStyle });
  await empty.locator('[data-directory-recovery="filter"]').click();
  await expect(search).toBeFocused(); await expect(search).toHaveValue('ventral');
  await expect(page.locator('#diss-directory-results > button[data-exposure-state]')).toHaveCount(1);
  expect(await evidence(page)).toEqual(before);
  await search.fill('no such anatomy');
  await expect(empty).toContainText('No structures match');
  await empty.screenshot({ path: `${out}/empty-search.png`, style: captureStyle });
  await empty.locator('[data-directory-recovery="reset"]').click();
  await expect(search).toBeFocused(); await expect(search).toHaveValue('');
  await expect(page.locator('#diss-directory-results > button[data-exposure-state]')).toHaveCount(4);
  expect(await evidence(page)).toEqual(before);
  await search.fill('heart');
  await expect(page.locator('[data-layer-search-result="heart"]')).toHaveAttribute('data-layer-access', 'locked');
  await expect(page.locator('[data-layer-search-result="heart"] button')).toHaveCount(0);
  expect(await evidence(page)).toEqual(before);
});

test('activating hidden anatomy offers recovery without selecting it or awarding credit', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page);
  const before = await evidence(page);
  const search = page.locator('#diss-organ-search');
  await search.fill('dorsal'); await search.press('ArrowDown');
  const row = page.locator('#diss-organ-dorsal_skin');
  await expect(row).toBeFocused(); await expect(row).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(row).toBeFocused();
  expect(await evidence(page)).toEqual(before);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback.message)).toContain('Change to the dorsal view');
  await page.keyboard.press('Escape'); await expect(search).toBeFocused(); await expect(search).toHaveValue('');
  expect(await evidence(page)).toEqual(before);
});

test('directory controls stay unavailable during assessment', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page, { quizMode: true });
  await expect(page.locator('[data-dissection-directory]')).toHaveCount(0);
});

test('keyboard navigation brings the last result of a long layer into view without inspecting it', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page, { activeLayer: 'organs', anatomicalView: 'internal', revealedLayers: { skin: true, muscle: true, organs: true } }, 320);
  const before = await evidence(page);
  const search = page.locator('#diss-organ-search');
  const rows = page.locator('#diss-directory-results > button[data-exposure-state]');
  await expect(rows).toHaveCount(12);
  await search.focus(); await search.press('ArrowDown');
  await page.keyboard.press('End'); await expect(rows.last()).toBeFocused();
  const bounds = await rows.last().evaluate(el => {
    const row = el.getBoundingClientRect(), list = el.parentElement!.getBoundingClientRect();
    return { top: row.top, bottom: row.bottom, listTop: list.top, listBottom: list.bottom };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(bounds.listTop - 1);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.listBottom + 1);
  expect(await evidence(page)).toEqual(before);
  await page.keyboard.press('Home'); await expect(rows.first()).toBeFocused();
  await page.keyboard.press('ArrowUp'); await expect(search).toBeFocused();
});
