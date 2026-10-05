# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-mission-clarity.spec.ts >> mission header tablet shows complete status and keyboard shortcuts
- Location: tests\e2e\dissection-mission-clarity.spec.ts:43:8

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 767
Received:    846
```

# Test source

```ts
  1   | import { test, expect, type Page, type Locator } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | const out = 'reports/dissection-mission-clarity-2026-10-03';
  6   | const baseline = process.env.DISSECTION_MISSION_BASELINE === '1';
  7   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  8   | const initial = { specimen: 'pig', _dissLoadedSpec: 'pig', activeLayer: 'organs', anatomicalView: 'internal', selectedOrgan: null, exploredOrgans: { 'pig|heart': true }, organNotes: { 'pig|heart': 'Keep this saved heart observation.' }, organConfidence: { 'pig|heart': 3 }, verifiedIdentifications: { 'pig|heart': { status: 'verified', at: 88 } }, revealedLayers: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', reducedMotion: true, soundEnabled: false, sceneDetail: false };
  9   | 
  10  | test.describe.configure({ retries: 0 });
  11  | test.use({ video: 'off' });
  12  | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  13  | test.afterAll(async () => { await harness.stop(); });
  14  | test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });
  15  | 
  16  | async function mount(page: Page, state: any = {}, width = 390, available = width) {
  17  |   await page.setViewportSize({ width, height: 1000 });
  18  |   await harness.mount(page, { dissection: { ...initial, ...state } }, undefined, { expectCanvas: false });
  19  |   await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  20  |   await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
  21  | }
  22  | function mission(page: Page) { return page.locator('[data-dissection-mission]'); }
  23  | async function proof(page: Page) {
  24  |   return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { specimen: d.specimen, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, explored: d.exploredOrgans, notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, revealed: d.revealedLayers, procedures: d.procedureByLayer, scores: [d.quizScore, d.quizTotal], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] }; });
  25  | }
  26  | async function inventory(p: Locator) {
  27  |   return p.evaluate(el => ({ title: el.querySelector('h2')?.textContent, copy: Array.from(el.querySelectorAll('p')).map(n => n.textContent), steps: Array.from(el.querySelectorAll('.diss-workflow li')).map(n => ({ label: n.textContent, state: n.getAttribute('data-state'), current: n.getAttribute('aria-current') })), stats: Array.from(el.querySelectorAll('.diss-stat')).map(n => ({ label: n.querySelector('.diss-stat__label')?.textContent, value: n.querySelector('.diss-stat__value')?.textContent })), actions: Array.from(el.querySelectorAll('button')).map(n => n.textContent) }));
  28  | }
  29  | async function metrics(p: Locator) {
  30  |   return p.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, width: el.getBoundingClientRect().width, workflowColumns: getComputedStyle(el.querySelector('.diss-workflow')!).gridTemplateColumns.split(' ').length, statColumns: getComputedStyle(el.querySelector('.diss-mission__stats')!).gridTemplateColumns.split(' ').length,
  31  |     text: Array.from(el.querySelectorAll('h2,p,.diss-workflow li,.diss-workflow__number,.diss-stat__label,.diss-stat__value,button')).map(n => ({ text: n.textContent, font: parseFloat(getComputedStyle(n).fontSize), clipped: n.scrollWidth > n.clientWidth + 1, nowrap: getComputedStyle(n).whiteSpace === 'nowrap' })),
  32  |     controls: Array.from(el.querySelectorAll('button')).map(n => ({ text: n.textContent, height: n.getBoundingClientRect().height })),
  33  |     steps: Array.from(el.querySelectorAll('.diss-workflow li')).map(n => ({ current: n.getAttribute('aria-current') === 'step', border: parseFloat(getComputedStyle(n).borderTopWidth), clipped: n.scrollWidth > n.clientWidth + 1 })) }));
  34  | }
  35  | 
  36  | for (const c of [
  37  |   { name: 'phone', width: 320, available: 320 },
  38  |   { name: 'tablet', width: 768, available: 768 },
  39  |   { name: 'desktop', width: 1440, available: 1180 },
  40  |   { name: 'embedded-medium', width: 1440, available: 520 },
  41  |   { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  42  |   { name: 'forced-colors', width: 390, available: 390, forced: true },
  43  | ]) test(`mission header ${c.name} shows complete status and keyboard shortcuts`, async ({ page }) => {
  44  |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  45  |   if (c.forced) await page.emulateMedia({ forcedColors: 'active' });
  46  |   await mount(page, { largeText: !!c.large, highContrast: !!c.contrast }, c.width, c.available);
  47  |   const p = mission(page), before = await proof(page), items = await inventory(p), m = await metrics(p);
  48  |   const prefix = baseline ? 'before' : 'after';
  49  |   await writeFile(`${out}/${prefix}-${c.name}-metrics.json`, JSON.stringify(m, null, 2));
  50  |   await writeFile(`${out}/${prefix}-${c.name}-inventory.json`, JSON.stringify(items, null, 2));
  51  |   await page.mouse.move(c.width - 1, 0);
  52  |   await p.screenshot({ path: `${out}/${prefix}-${c.name}.png`, style: '.diss-next-action {position:static!important;}' });
  53  |   if (baseline) return;
> 54  |   expect(m.width).toBeLessThanOrEqual(c.available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1);
      |                                                                          ^ Error: expect(received).toBeLessThanOrEqual(expected)
  55  |   expect(m.statColumns).toBe(c.available <= 440 ? 1 : c.available <= 700 ? 2 : 3);
  56  |   expect(m.workflowColumns).toBe(c.available <= 520 ? 2 : c.available <= 980 ? 3 : 6);
  57  |   for (const n of m.text) { expect(n.font, n.text || '').toBeGreaterThanOrEqual(c.large ? 15.9 : 13.9); expect(n.clipped, n.text || '').toBe(false); expect(n.nowrap, n.text || '').toBe(false); }
  58  |   for (const n of m.controls) expect(n.height, n.text || '').toBeGreaterThanOrEqual(47.9);
  59  |   expect(m.steps.filter(n => n.current)).toHaveLength(1);
  60  |   expect(m.steps.find(n => n.current)!.border).toBeGreaterThanOrEqual(2.9);
  61  |   expect(m.steps.filter(n => !n.current).every(n => n.border < 2)).toBe(true);
  62  |   await expect(p.locator('.diss-stat__value').first()).toContainText('Fetal Pig (Sus scrofa)');
  63  |   await expect(p.locator('.diss-stat__value').nth(1)).toContainText('Visceral Organs');
  64  |   const directory = p.getByRole('button', { name: 'Structures and notes', exact: true });
  65  |   await directory.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(directory).toBeFocused();
  66  |   const focus = await directory.evaluate(el => { const b = el.getBoundingClientRect(), p = el.closest('[data-dissection-mission]')!.getBoundingClientRect(), s = getComputedStyle(el), pad = parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset); return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), inside: b.left - pad >= p.left && b.right + pad <= p.right && b.top - pad >= p.top && b.bottom + pad <= p.bottom }; });
  67  |   expect(focus.style).toBe('solid'); expect(focus.width).toBeGreaterThanOrEqual(2.9); expect(focus.inside).toBe(true);
  68  |   await p.screenshot({ path: `${out}/focus-${c.name}.png`, style: '.diss-next-action {position:static!important;}' });
  69  |   await page.keyboard.press('Enter'); await expect(page.locator('#diss-organ-search')).toBeFocused(); expect(await proof(page)).toEqual(before);
  70  |   await p.getByRole('button', { name: 'Go to specimen', exact: true }).focus(); await page.keyboard.press('Space'); await expect(page.locator('#diss-canvas')).toBeFocused(); expect(await proof(page)).toEqual(before);
  71  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  72  |   const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-dissection-mission]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  73  |   await writeFile(`${out}/${c.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]); expect(errors).toEqual([]);
  74  | });
  75  | 
  76  | test('mission header reflows in place without changing keyboard focus or saved evidence', async ({ page }) => {
  77  |   await mount(page, { largeText: true }, 1440, 1180); const p = mission(page), before = await proof(page), items = await inventory(p), target = p.getByRole('button', { name: 'Structures and notes', exact: true });
  78  |   await target.focus(); await page.addStyleTag({ content: '#wrap {max-width:320px!important;}' }); await expect(target).toBeFocused();
  79  |   const m = await metrics(p); expect(m.statColumns).toBe(1); expect(m.workflowColumns).toBe(2); expect(m.scroll).toBeLessThanOrEqual(m.client + 1); expect(m.text.every(n => !n.clipped)).toBe(true); expect(await inventory(p)).toEqual(items); expect(await proof(page)).toEqual(before);
  80  | });
  81  | 
  82  | test('mission workflow preserves the Guided investigation position', async ({ page }) => {
  83  |   await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'] }, 320);
  84  |   const p = mission(page), before = await proof(page); await expect(p.locator('[aria-current="step"]')).toHaveCount(1); await expect(p.locator('[aria-current="step"]')).toContainText('Identify');
  85  |   await p.getByRole('button', { name: 'Go to specimen', exact: true }).click(); await expect(page.locator('#diss-canvas')).toBeFocused(); expect(await proof(page)).toEqual(before);
  86  |   await p.screenshot({ path: `${out}/guided.png`, style: '.diss-next-action {position:static!important;}' });
  87  | });
  88  | 
  89  | test('mission assessment shortcut focuses its summary while preserving assessment evidence', async ({ page }) => {
  90  |   await mount(page, { quizMode: true, quizComplete: true, quizScore: 2, quizTotal: 2 }, 390);
  91  |   const p = mission(page), before = await proof(page); await expect(p.locator('[aria-current="step"]')).toHaveCount(1); await expect(p.locator('[aria-current="step"]')).toContainText('Review');
  92  |   await p.getByRole('button', { name: 'Go to assessment', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(page.locator('#diss-assessment-summary')).toBeFocused(); expect(await proof(page)).toEqual(before);
  93  |   await p.screenshot({ path: `${out}/assessment.png`, style: '.diss-next-action {position:static!important;}' });
  94  | });
  95  | 
  96  | test('mission continue shortcut focuses the planning checkpoint without performing a technique action', async ({ page }) => {
  97  |   await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {} }, 320);
  98  |   const p = mission(page), before = await proof(page); await p.getByRole('button', { name: 'Continue activity', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(page.locator('#diss-learning-checkpoint')).toBeFocused(); expect(await proof(page)).toEqual(before);
  99  | });
  100 | 
```