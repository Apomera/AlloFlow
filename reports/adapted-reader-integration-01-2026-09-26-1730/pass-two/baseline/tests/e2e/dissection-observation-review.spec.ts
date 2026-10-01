import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-enhancement-2026-09-08';
const state = { specimen: 'sheepEye', _dissLoadedSpec: 'sheepEye', activeLayer: 'skin', anatomicalView: 'dorsal', reducedMotion: true, soundEnabled: false,
  exploredOrgans: { 'sheepEye|cornea': true, 'sheepEye|lens': true }, organNotes: { 'sheepEye|lens': 'I observed two curved faces. The structure was behind the iris.' },
  organConfidence: { 'sheepEye|lens': 1 }, revealedLayers: {}, quizScore: 1, quizTotal: 2 };
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
async function evidence(page: any) { return page.evaluate(() => {
  const d = (window as any).__ctx.toolData.dissection;
  return { explored: d.exploredOrgans, notes: d.organNotes, confidence: d.organConfidence, revealed: d.revealedLayers, score: d.quizScore, total: d.quizTotal };
}); }

test('review filters across layers preserve evidence and keep locked notes read-only', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  const before = await evidence(page);
  const panel = page.locator('[data-observation-review]');
  await panel.locator('#diss-observation-review-title').click();
  await expect(panel.locator('[data-observation-entry]')).toHaveCount(2);
  await panel.locator('[data-observation-filter="uncertain"]').focus();
  await page.keyboard.press('Enter');
  await expect(panel.locator('[data-observation-entry]')).toHaveCount(1);
  const lens = panel.locator('[data-observation-entry="lens"]');
  await expect(lens.locator('button')).toHaveCount(0);
  await expect(lens.locator('[data-observation-locked]')).toBeVisible();
  await lens.getByText('Read saved note', { exact: true }).click();
  await expect(lens.locator('.diss-observation-review__note')).toHaveText(state.organNotes['sheepEye|lens']);
  await panel.locator('[data-observation-filter="unfinished"]').click();
  await expect(panel.locator('[data-observation-entry="cornea"]')).toBeVisible();
  expect(await evidence(page)).toEqual(before);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).toBe('skin');
  await panel.screenshot({ path: out + '/observation-review-desktop.png' });
  expect(errors).toEqual([]);
});

test('cross-layer note review returns to the list and reflects a deliberate confidence revision', async ({ page }) => {
  await harness.mount(page, { dissection: { ...state, revealedLayers: { skin: true } } }, undefined, { expectCanvas: false });
  const before = await evidence(page);
  const panel = page.locator('[data-observation-review]');
  await panel.locator('#diss-observation-review-title').click();
  await panel.locator('[data-observation-filter="uncertain"]').click();
  await panel.getByRole('button', { name: 'Review note: Crystalline Lens', exact: true }).click();
  await expect(page.locator('#diss-note-lens')).toBeFocused();
  await expect(page.locator('#diss-note-lens')).toHaveValue(state.organNotes['sheepEye|lens']);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).toBe('organs');
  expect(await evidence(page)).toEqual(before);
  await page.getByRole('radio', { name: /Confidence 2 of 3/ }).check();
  await page.getByRole('button', { name: 'Review all observations', exact: true }).click();
  await expect(panel.locator('#diss-observation-review-title')).toBeFocused();
  await expect(panel.locator('[data-observation-review-empty]')).toContainText('No observations match');
  await panel.locator('[data-observation-filter="all"]').click();
  await expect(panel.locator('[data-observation-entry="lens"]')).toContainText('Confidence 2 of 3');
  expect(await evidence(page)).toEqual({ ...before, confidence: { 'sheepEye|lens': 2 } });
});

test('phone review wraps saved notes and passes scoped accessibility checks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  const panel = page.locator('[data-observation-review]');
  await panel.locator('#diss-observation-review-title').click();
  await panel.getByText('Read saved note', { exact: true }).click();
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-observation-review]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  expect(await panel.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await panel.screenshot({ path: out + '/observation-review-mobile.png' });
});

test('summary preview, clipboard and downloaded text match the current filter without changing evidence', async ({ page }) => {
  const note = '  Two curved faces.\nUnicode: α & <tag> is literal.  ';
  await harness.mount(page, { dissection: { ...state, organNotes: { ...state.organNotes, 'sheepEye|lens': note } } }, undefined, { expectCanvas: false });
  const before = await evidence(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as any).__observationCopy = text; } } });
    const originalCreate = URL.createObjectURL.bind(URL), originalRevoke = URL.revokeObjectURL.bind(URL);
    (window as any).__observationUrls = []; (window as any).__observationRevoked = [];
    URL.createObjectURL = blob => { const url = originalCreate(blob); (window as any).__observationUrls.push(url); return url; };
    URL.revokeObjectURL = url => { (window as any).__observationRevoked.push(url); originalRevoke(url); };
  });
  const panel = page.locator('[data-observation-review]');
  await panel.locator('#diss-observation-review-title').click();
  await panel.locator('[data-observation-export] > summary').click();
  const preview = panel.locator('#diss-observation-summary');
  await expect(preview).toHaveValue(/Scope: All inspected · 2 of 2/);
  await panel.locator('[data-observation-filter="uncertain"]').click();
  await expect(preview).toBeVisible();
  await expect(preview).toHaveValue(/Scope: Low confidence · 1 of 2/);
  const expected = await preview.inputValue();
  expect(expected).toContain(note);
  expect(expected).not.toContain('1. Cornea');
  await panel.getByRole('button', { name: 'Copy summary', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__observationCopy)).toBe(expected);
  const downloadPromise = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download text', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('sheepEye_observations_uncertain.txt');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString('utf8')).toBe(expected);
  await expect.poll(() => page.evaluate(() => (window as any).__observationRevoked.length)).toBe(1);
  expect(await page.evaluate(() => (window as any).__observationRevoked[0])).toBe(await page.evaluate(() => (window as any).__observationUrls[0]));
  expect(await evidence(page)).toEqual(before);
});

test('clipboard and download failures retain a selectable complete summary', async ({ page }) => {
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  const before = await evidence(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Clipboard denied')) } });
    URL.createObjectURL = () => { throw new Error('Download unavailable'); };
  });
  const panel = page.locator('[data-observation-review]');
  await panel.locator('#diss-observation-review-title').click();
  await panel.locator('[data-observation-export] > summary').click();
  await panel.getByRole('button', { name: 'Copy summary', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback.message)).toContain('Clipboard unavailable');
  await panel.getByRole('button', { name: 'Download text', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback.message)).toContain('download could not start');
  await panel.getByRole('button', { name: 'Select summary', exact: true }).click();
  const preview = panel.locator('#diss-observation-summary');
  await expect(preview).toBeFocused();
  expect(await preview.evaluate((el: HTMLTextAreaElement) => [el.selectionStart, el.selectionEnd, el.readOnly])).toEqual([0, (await preview.inputValue()).length, true]);
  expect(await evidence(page)).toEqual(before);
});

test('phone summary preview and export actions are accessible and fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  const panel = page.locator('[data-observation-review]');
  await panel.locator('#diss-observation-review-title').click();
  await panel.locator('[data-observation-export] > summary').click();
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-observation-review]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  expect(await panel.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await panel.locator('[data-observation-export]').screenshot({ path: out + '/observation-summary-mobile.png' });
});

test('searching saved notes filters counts and exported contents while preserving locks and evidence', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { dissection: { ...state, organSearch: 'separate directory query' } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  const before = await evidence(page);
  const panel = page.locator('[data-observation-review]');
  await panel.locator('#diss-observation-review-title').click();
  const search = panel.getByRole('searchbox', { name: 'Search your observations' });
  await search.fill('INTERNAL curved');
  await expect(panel.locator('[data-observation-entry]')).toHaveCount(1);
  await expect(panel.locator('[data-observation-filter="all"]')).toHaveText('All inspected (1)');
  await expect(panel.locator('[data-observation-filter="unfinished"]')).toHaveText('Needs notes (0)');
  await expect(panel.locator('[data-observation-note-match]')).toHaveText('Search words appear in your saved note.');
  await expect(panel.locator('[data-observation-locked]')).toBeVisible();
  await expect(panel.locator('[data-observation-entry] button')).toHaveCount(0);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-observation-review]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  expect(await panel.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await panel.screenshot({ path: out + '/observation-search-mobile.png' });
  await panel.locator('[data-observation-export] > summary').click();
  const expected = await panel.locator('#diss-observation-summary').inputValue();
  expect(expected).toContain('Search: "INTERNAL curved"');
  expect(expected).not.toContain('1. Cornea');
  const pendingDownload = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download text', exact: true }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe('sheepEye_observations_all_search.txt');
  const stream = await download.createReadStream(); const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString('utf8')).toBe(expected);
  await panel.locator('[data-observation-filter="uncertain"]').click();
  await search.fill('notpresent');
  await expect(panel.locator('[data-observation-export]')).toHaveCount(0);
  await expect(panel.locator('[data-observation-review-empty]')).toContainText('Clear the search');
  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(panel.locator('[data-observation-filter="uncertain"]')).toHaveAttribute('aria-pressed', 'true');
  await search.fill('curved');
  await panel.getByRole('button', { name: 'Clear observation search', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  expect(await evidence(page)).toEqual(before);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organSearch)).toBe('separate directory query');
});

test('search survives note navigation and refreshes when the original note is revised', async ({ page }) => {
  await harness.mount(page, { dissection: { ...state, revealedLayers: { skin: true } } }, undefined, { expectCanvas: false });
  const before = await evidence(page);
  const panel = page.locator('[data-observation-review]');
  await panel.locator('#diss-observation-review-title').click();
  await panel.getByRole('searchbox', { name: 'Search your observations' }).fill('curved');
  await panel.getByRole('button', { name: 'Review note: Crystalline Lens', exact: true }).click();
  await expect(page.locator('#diss-note-lens')).toBeFocused();
  const revised = 'I observed the structure behind the iris.';
  await page.locator('#diss-note-lens').fill(revised);
  await page.getByRole('button', { name: 'Review all observations', exact: true }).click();
  await expect(panel.locator('#diss-observation-review-title')).toBeFocused();
  await expect(panel.getByRole('searchbox')).toHaveValue('curved');
  await expect(panel.locator('[data-observation-review-empty]')).toBeVisible();
  await panel.getByRole('button', { name: 'Clear observation search', exact: true }).click();
  await panel.locator('[data-observation-export] > summary').click();
  await expect(panel.locator('#diss-observation-summary')).toHaveValue(new RegExp(revised.replace(/\./g, '\\.')));
  expect(await evidence(page)).toEqual({ ...before, notes: { ...before.notes, 'sheepEye|lens': revised } });
});
