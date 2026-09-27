import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-observation-reader-2026-09-27';
const note = '  I observed two curved faces.\nBehind the iris: α <not a tag> & details.  ';
const state = {
  specimen: 'sheepEye', _dissLoadedSpec: 'sheepEye', activeLayer: 'skin', anatomicalView: 'dorsal', reducedMotion: true, soundEnabled: false,
  exploredOrgans: { 'sheepEye|cornea': true, 'sheepEye|lens': true, 'frog|heart': true, 'sheepEye|missing': true },
  organNotes: { 'sheepEye|lens': note, 'sheepEye|retina': 'Uninspected draft', 'frog|heart': 'Other specimen' },
  organConfidence: { 'sheepEye|lens': 1 }, revealedLayers: {}, quizScore: 1, quizTotal: 2,
};
const snapshot = (page: any) => page.evaluate(() => {
  const d = (window as any).__ctx.toolData.dissection;
  return { specimen: d.specimen, layer: d.activeLayer, selected: d.selectedOrgan, explored: d.exploredOrgans, notes: d.organNotes,
    confidence: d.organConfidence, revealed: d.revealedLayers, score: d.quizScore, total: d.quizTotal };
});
async function review(page: any) {
  await page.locator('#diss-observation-review-title').click();
  return page.locator('[data-observation-review]');
}
async function openReader(page: any) {
  await page.locator('[data-observation-reader-open]').click();
  const dialog = page.getByRole('dialog', { name: /Observation reading view/ });
  await expect(dialog).toBeVisible();
  return dialog;
}
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ retries: 0 });

test('reads only inspected observations with honest empty states, keyboard navigation, and unchanged evidence', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  const before = await snapshot(page);
  await review(page);
  const opener = page.locator('[data-observation-reader-open]');
  await opener.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  const close = dialog.getByRole('button', { name: 'Close reading view' });
  await expect(close).toBeFocused();
  await expect(dialog).toContainText('2 of 2 inspected structures');
  await expect(dialog.locator('[data-observation-reader-entry]')).toHaveAttribute('data-observation-reader-entry', 'cornea');
  await expect(dialog).toContainText('No evidence note recorded.');
  await expect(dialog).toContainText('Confidence not recorded');
  await expect(dialog.getByRole('button', { name: 'Previous observation' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Next observation' }).click();
  await expect(dialog.getByRole('heading', { name: 'Crystalline Lens', exact: true })).toBeFocused();
  await expect(dialog.locator('[data-observation-reader-position]')).toHaveText('Observation 2 of 2');
  expect(await dialog.getByRole('region', { name: 'Your recorded note' }).textContent()).toBe(note);
  await expect(dialog).toContainText('Self-reported confidence: 1 of 3');
  await expect(dialog.locator('[data-observation-reader-locked]')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Return to edit this note' })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Next observation' })).toBeDisabled();
  await expect(dialog).not.toContainText('Uninspected draft');
  await expect(dialog).not.toContainText('Other specimen');
  await dialog.getByRole('button', { name: 'Larger text' }).click();
  await expect(dialog.locator('[data-observation-reader-entry]')).toHaveAttribute('data-large-text', 'true');
  await dialog.getByRole('region', { name: 'Your recorded note' }).focus();
  await page.keyboard.press('Tab'); await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('region', { name: 'Your recorded note' })).toBeFocused();
  await dialog.screenshot({ path: out + '/reader-desktop.png' });
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
  expect(await snapshot(page)).toEqual(before);
  await openReader(page); await expect(page.locator('[data-observation-reader-position]')).toHaveText('Observation 1 of 2');
  await page.getByRole('button', { name: 'Close reading view' }).click(); await expect(opener).toBeFocused();
  expect(errors).toEqual([]);
});

test('keeps search and filter scope through editing and reads the revised original note', async ({ page }) => {
  await harness.mount(page, { dissection: { ...state, revealedLayers: { skin: true } } }, undefined, { expectCanvas: false });
  const before = await snapshot(page);
  const panel = await review(page);
  await panel.getByRole('searchbox').fill('curved');
  await panel.locator('[data-observation-filter="uncertain"]').click();
  const dialog = await openReader(page);
  await expect(dialog).toContainText('Low confidence · 1 of 2 inspected structures');
  await expect(dialog).toContainText('Search: curved');
  await expect(dialog.getByRole('button', { name: 'Previous observation' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Next observation' })).toBeDisabled();
  expect(await snapshot(page)).toEqual(before);
  await dialog.getByRole('button', { name: 'Return to edit this note' }).click();
  await expect(dialog).toHaveCount(0);
  const field = page.locator('#diss-note-lens'); await expect(field).toBeFocused(); await expect(field).toHaveValue(note);
  expect(await snapshot(page)).toEqual({ ...before, layer: 'organs', selected: 'lens' });
  const revision = note + '\nI will check the curved outline again.';
  await field.fill(revision);
  await page.getByRole('button', { name: 'Review all observations', exact: true }).click();
  await expect(panel.getByRole('searchbox')).toHaveValue('curved');
  await expect(panel.locator('[data-observation-filter="uncertain"]')).toHaveAttribute('aria-pressed', 'true');
  await openReader(page);
  expect(await dialog.getByRole('region', { name: 'Your recorded note' }).textContent()).toBe(revision);
  expect(await snapshot(page)).toEqual({ ...before, layer: 'organs', selected: 'lens', notes: { ...before.notes, 'sheepEye|lens': revision } });
});

test('reader stays current after a parent render and releases modality for empty results or another activity', async ({ page }) => {
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  await review(page); let dialog = await openReader(page);
  await dialog.getByRole('button', { name: 'Next observation' }).click();
  await page.evaluate(() => {
    const ctx = (window as any).__ctx;
    ctx.update('dissection', 'organNotes', { ...ctx.toolData.dissection.organNotes, 'sheepEye|lens': 'Updated while the reader is open.' });
  });
  await expect(dialog.getByRole('region', { name: 'Your recorded note' })).toHaveText('Updated while the reader is open.');
  await expect(dialog.locator('[data-observation-reader-position]')).toHaveText('Observation 2 of 2');
  await page.evaluate(() => (window as any).__ctx.update('dissection', '_observationReviewSearch', 'no matches'));
  await expect(dialog).toHaveCount(0); await expect(page.locator('[data-observation-reader-open]')).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search your observations' }).fill('');
  dialog = await openReader(page);
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'quizMode', true));
  await expect(dialog).toHaveCount(0); await expect(page.locator('[data-observation-reader-open]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'quizMode', false));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('#diss-observation-review-title').click();
  await page.locator('[data-observation-reader-open]').focus(); await expect(page.locator('[data-observation-reader-open]')).toBeFocused();
});

test('phone reading view wraps long notes and supports larger text and accessible controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const longNote = 'لاحظت سطحًا منحنيًا بالقرب من القزحية.\n' + 'A'.repeat(180) + '\n' + ('I will check this relationship again.\n').repeat(18);
  await harness.mount(page, { dissection: { ...state, organNotes: { 'sheepEye|lens': longNote }, _observationReviewFilter: 'uncertain' } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  const before = await snapshot(page); await review(page); const dialog = await openReader(page);
  await dialog.getByRole('button', { name: 'Larger text' }).click();
  const text = dialog.getByRole('region', { name: 'Your recorded note' });
  expect(await text.textContent()).toBe(longNote);
  await expect(text).toHaveAttribute('dir', 'auto');
  const bounds = await dialog.evaluate(el => ({ left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, overflow: el.scrollWidth - el.clientWidth }));
  expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320); expect(bounds.overflow).toBeLessThanOrEqual(1);
  expect(await text.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-observation-reader]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  await dialog.screenshot({ path: out + '/reader-phone.png' });
  await dialog.locator('.diss-observation-reader__hint').scrollIntoViewIfNeeded();
  await expect(dialog.getByRole('button', { name: 'Close reading view' })).toBeInViewport();
  await dialog.getByRole('button', { name: 'Close reading view' }).click();
  await expect(page.locator('[data-observation-reader-open]')).toBeFocused(); expect(await snapshot(page)).toEqual(before);
});

test('failed native opening keeps notes available and permits retry', async ({ page }) => {
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  const before = await snapshot(page); const panel = await review(page);
  await page.evaluate(() => {
    const original = HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal = function () { HTMLDialogElement.prototype.showModal = original; throw new Error('Unavailable fixture'); };
  });
  await panel.locator('[data-observation-reader-open]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(panel.locator('[data-observation-reader-open]')).toBeFocused();
  await expect(panel.getByRole('status').filter({ hasText: 'could not open' })).toBeVisible();
  await panel.getByText('Read saved note', { exact: true }).click();
  expect(await panel.locator('.diss-observation-review__note').textContent()).toBe(note);
  await openReader(page); await page.keyboard.press('Escape'); expect(await snapshot(page)).toEqual(before);
});
