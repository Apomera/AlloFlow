import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-mission-clarity-2026-10-03';
const baseline = process.env.DISSECTION_MISSION_BASELINE === '1';
const harness = new GlHarness({ toolFile: process.env.DISSECTION_MISSION_RENDERER || 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const initial = { specimen: 'pig', _dissLoadedSpec: 'pig', activeLayer: 'organs', anatomicalView: 'internal', selectedOrgan: null, exploredOrgans: { 'pig|heart_p': true }, organNotes: { 'pig|heart_p': 'Keep this saved heart observation.' }, organConfidence: { 'pig|heart_p': 3 }, verifiedIdentifications: { 'pig|heart_p': { status: 'verified', at: 88 } }, revealedLayers: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', reducedMotion: true, soundEnabled: false, sceneDetail: false };

test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

async function mount(page: Page, state: any = {}, width = 390, available = width, expandOverview = true) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
  if (expandOverview) await page.locator('.diss-mission__overview > summary').click();
}
function mission(page: Page) { return page.locator('[data-dissection-mission]'); }
async function proof(page: Page) {
  return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { specimen: d.specimen, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, explored: d.exploredOrgans, notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, revealed: d.revealedLayers, procedures: d.procedureByLayer, scores: [d.quizScore, d.quizTotal], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] }; });
}
async function inventory(p: Locator) {
  return p.evaluate(el => ({ title: el.querySelector('h2')?.textContent, copy: Array.from(el.querySelectorAll('p')).map(n => n.textContent), steps: Array.from(el.querySelectorAll('.diss-workflow li')).map(n => ({ label: n.textContent, state: n.getAttribute('data-state'), current: n.getAttribute('aria-current') })), stats: Array.from(el.querySelectorAll('.diss-stat')).map(n => ({ label: n.querySelector('.diss-stat__label')?.textContent, value: n.querySelector('.diss-stat__value')?.textContent })), actions: Array.from(el.querySelectorAll('button')).map(n => n.textContent) }));
}
async function metrics(p: Locator) {
  return p.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, width: el.getBoundingClientRect().width, workflowColumns: getComputedStyle(el.querySelector('.diss-workflow')!).gridTemplateColumns.split(' ').length, statColumns: getComputedStyle(el.querySelector('.diss-mission__stats')!).gridTemplateColumns.split(' ').length,
    text: Array.from(el.querySelectorAll('h2,p,.diss-workflow li,.diss-workflow__number,.diss-stat__label,.diss-stat__value,button')).map(n => ({ text: n.textContent, font: parseFloat(getComputedStyle(n).fontSize), clipped: n.scrollWidth > n.clientWidth + 1, nowrap: getComputedStyle(n).whiteSpace === 'nowrap' })),
    controls: Array.from(el.querySelectorAll('button')).map(n => ({ text: n.textContent, height: n.getBoundingClientRect().height })),
    steps: Array.from(el.querySelectorAll('.diss-workflow li')).map(n => ({ current: n.getAttribute('aria-current') === 'step', border: parseFloat(getComputedStyle(n).borderTopWidth), clipped: n.scrollWidth > n.clientWidth + 1 })) }));
}

for (const c of [
  { name: 'phone', width: 320, available: 320 },
  { name: 'tablet', width: 768, available: 768 },
  { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-medium', width: 1440, available: 520 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  { name: 'forced-colors', width: 390, available: 390, forced: true },
]) test(`mission header ${c.name} shows complete status and keyboard shortcuts`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  if (c.forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, { largeText: !!c.large, highContrast: !!c.contrast }, c.width, c.available);
  const p = mission(page), before = await proof(page), items = await inventory(p), m = await metrics(p);
  const prefix = baseline ? 'before' : 'after';
  await writeFile(`${out}/${prefix}-${c.name}-metrics.json`, JSON.stringify(m, null, 2));
  await writeFile(`${out}/${prefix}-${c.name}-inventory.json`, JSON.stringify(items, null, 2));
  await page.mouse.move(c.width - 1, 0);
  await p.screenshot({ path: `${out}/${prefix}-${c.name}.png`, style: '.diss-next-action {position:static!important;}' });
  if (baseline) return;
  await expect(p.getByRole('group', { name: 'Current lab status', exact: true })).toHaveCount(1);
  expect(m.width).toBeLessThanOrEqual(c.available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1);
  expect(m.statColumns).toBe(c.available <= 440 ? 1 : c.available <= 700 ? 2 : 3);
  expect(m.workflowColumns).toBe(c.available <= 520 ? 2 : c.available <= 980 ? 3 : 6);
  for (const n of m.text) { expect(n.font, n.text || '').toBeGreaterThanOrEqual(c.large ? 15.9 : 13.9); expect(n.clipped, n.text || '').toBe(false); expect(n.nowrap, n.text || '').toBe(false); }
  for (const n of m.controls) expect(n.height, n.text || '').toBeGreaterThanOrEqual(47.9);
  expect(m.steps.filter(n => n.current)).toHaveLength(1);
  expect(m.steps.find(n => n.current)!.border).toBeGreaterThanOrEqual(2.9);
  expect(m.steps.filter(n => !n.current).every(n => n.border < 2)).toBe(true);
  await expect(p.locator('.diss-stat__value').first()).toContainText('Fetal Pig (Sus scrofa)');
  await expect(p.locator('.diss-stat__value').nth(1)).toContainText('Visceral Organs');
  await expect(p.locator('.diss-stat__value').nth(2)).toHaveText('1 of 27');
  const directory = p.getByRole('button', { name: 'Structures and notes', exact: true });
  await directory.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(directory).toBeFocused();
  const focus = await directory.evaluate(el => { const b = el.getBoundingClientRect(), p = el.closest('[data-dissection-mission]')!.getBoundingClientRect(), s = getComputedStyle(el), pad = parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset); return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), inside: b.left - pad >= p.left && b.right + pad <= p.right && b.top - pad >= p.top && b.bottom + pad <= p.bottom }; });
  expect(focus.style).toBe('solid'); expect(focus.width).toBeGreaterThanOrEqual(2.9); expect(focus.inside).toBe(true);
  await p.screenshot({ path: `${out}/focus-${c.name}.png`, style: '.diss-next-action {position:static!important;}' });
  await page.keyboard.press('Enter'); await expect(page.locator('#diss-organ-search')).toBeFocused(); expect(await proof(page)).toEqual(before);
  await p.getByRole('button', { name: 'Go to specimen', exact: true }).focus(); await page.keyboard.press('Space'); await expect(page.locator('#diss-canvas')).toBeFocused(); expect(await proof(page)).toEqual(before);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-dissection-mission]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${c.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]); expect(audit.incomplete.filter((r: any) => r.id !== 'color-contrast')).toEqual([]); expect(errors).toEqual([]);
});

test('mission header reflows in place without changing keyboard focus or saved evidence', async ({ page }) => {
  await mount(page, { largeText: true }, 1440, 1180); const p = mission(page), before = await proof(page), items = await inventory(p), target = p.getByRole('button', { name: 'Structures and notes', exact: true });
  await target.focus(); await page.addStyleTag({ content: '#wrap {max-width:320px!important;}' }); await expect(target).toBeFocused();
  const m = await metrics(p); expect(m.statColumns).toBe(1); expect(m.workflowColumns).toBe(2); expect(m.scroll).toBeLessThanOrEqual(m.client + 1); expect(m.text.every(n => !n.clipped)).toBe(true); expect(await inventory(p)).toEqual(items); expect(await proof(page)).toEqual(before);
});

test('mission workflow preserves the Guided investigation position', async ({ page }) => {
  await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'] }, 320);
  const p = mission(page), before = await proof(page); await expect(p.locator('[aria-current="step"]')).toHaveCount(1); await expect(p.locator('[aria-current="step"]')).toContainText('Identify');
  await p.getByRole('button', { name: 'Go to specimen', exact: true }).click(); await expect(page.locator('#diss-canvas')).toBeFocused(); expect(await proof(page)).toEqual(before);
  await p.screenshot({ path: `${out}/guided.png`, style: '.diss-next-action {position:static!important;}' });
});

test('mission assessment shortcut focuses its summary while preserving assessment evidence', async ({ page }) => {
  await mount(page, { quizMode: true, quizComplete: true, quizScore: 2, quizTotal: 2 }, 390);
  const p = mission(page), before = await proof(page); await expect(p.locator('[aria-current="step"]')).toHaveCount(1); await expect(p.locator('[aria-current="step"]')).toContainText('Review');
  await p.getByRole('button', { name: 'Go to assessment', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(page.locator('#diss-assessment-summary')).toBeFocused(); expect(await proof(page)).toEqual(before);
  await p.screenshot({ path: `${out}/assessment.png`, style: '.diss-next-action {position:static!important;}' });
});

test('mission continue shortcut focuses the planning checkpoint without performing a technique action', async ({ page }) => {
  await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {} }, 320);
  const p = mission(page), before = await proof(page); await p.getByRole('button', { name: 'Continue activity', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(page.locator('#diss-learning-checkpoint')).toBeFocused(); expect(await proof(page)).toEqual(before);
});

test('Essentials keeps the overview compact and keyboard expansion preserves learner work', async ({ page }) => {
  await mount(page, {}, 390, 390, false);
  const p = mission(page), overview = p.locator('.diss-mission__overview'), before = await proof(page);
  await expect(overview).not.toHaveAttribute('open');
  await expect(p.locator('.diss-mission__context')).toContainText('Fetal Pig');
  await expect(p.getByRole('button', { name: 'Continue activity', exact: true })).toBeVisible();
  const collapsedHeight = await p.evaluate(el => el.getBoundingClientRect().height);
  await overview.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(overview).toHaveAttribute('open', '');
  await expect(p.getByRole('group', { name: 'Current lab status', exact: true })).toBeVisible();
  expect(await p.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(collapsedHeight + 150);
  expect(await proof(page)).toEqual(before);
  await p.getByRole('button', { name: 'Continue activity', exact: true }).click();
  await expect(overview).toHaveAttribute('open', '');
  expect(await proof(page)).toEqual(before);
});
