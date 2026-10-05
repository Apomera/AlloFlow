# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-objective-clarity.spec.ts >> learning objectives desktop remain readable with distinct evidence states
- Location: tests\e2e\dissection-objective-clarity.spec.ts:30:324

# Error details

```
Error: Learning objectivesProgress from your lab evidence

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 13.9
Received:    11.52
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | import { mkdir, writeFile, readFile } from 'node:fs/promises';
  3  | import { GlHarness } from './helpers/stem_gl_harness';
  4  | 
  5  | const out = 'reports/dissection-objective-clarity-2026-10-03';
  6  | const baseline = process.env.DISSECTION_OBJECTIVE_BASELINE === '1';
  7  | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  8  | const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'organs', anatomicalView: 'internal', selectedOrgan: null, exploredOrgans: { 'frog|heart': true, 'frog|lungs': true }, organNotes: { 'frog|heart': 'Two atria feed a shared ventricle.' }, organConfidence: { 'frog|heart': 3 }, verifiedIdentifications: { 'frog|heart': { status: 'verified', at: 88 } }, revealedLayers: {}, quizScore: 1, quizTotal: 2, procedureScenario: 'structure-trace', scenarioStartedAt: 100, scenarioCompletedAt: 200, workspaceMode: 'essentials', reducedMotion: true, soundEnabled: false, sceneDetail: false };
  9  | 
  10 | test.describe.configure({ retries: 0 });
  11 | test.use({ video: 'off' });
  12 | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  13 | test.afterAll(async () => { await harness.stop(); });
  14 | test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });
  15 | 
  16 | async function mount(page: Page, state: any = {}, width = 390, available = width) {
  17 |   await page.setViewportSize({ width, height: 1000 });
  18 |   await harness.mount(page, { dissection: { ...initial, ...state } }, undefined, { expectCanvas: false });
  19 |   await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  20 |   await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
  21 | }
  22 | function panel(page: Page) { return page.locator('summary').filter({ hasText: 'Learning objectives' }).locator('..'); }
  23 | async function open(page: Page) { const p = panel(page); await p.locator(':scope > summary').click(); return p; }
  24 | async function proof(page: Page) { return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { specimen: d.specimen, layer: d.activeLayer, view: d.anatomicalView, selected: d.selectedOrgan, explored: d.exploredOrgans, notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, assessment: d.assessmentEvidence, revealed: d.revealedLayers, scores: [d.quizScore, d.quizTotal], procedures: d.procedureByLayer, scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioCompletedAt] }; }); }
  25 | async function inventory(p: ReturnType<typeof panel>) { return p.locator('.diss-objective-item').evaluateAll(nodes => nodes.map(n => ({ title: n.querySelector('.diss-objective-item__head > :first-child')?.textContent, status: n.getAttribute('data-objective-status'), label: n.querySelector('.diss-objective-item__status')?.textContent, progress: n.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'), copy: Array.from(n.querySelectorAll('p')).map(p => p.textContent) }))); }
  26 | async function metrics(p: ReturnType<typeof panel>) { return p.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, width: el.getBoundingClientRect().width, summary: el.querySelector('summary')!.getBoundingClientRect().height,
  27 |   text: Array.from(el.querySelectorAll('summary, summary strong, summary span, .diss-objective-item__head > :first-child, .diss-objective-item__status, p, .diss-objective-item__progress-label, .diss-objective-item__percent')).map(n => ({ text: n.textContent, font: parseFloat(getComputedStyle(n).fontSize), clipped: n.scrollWidth > n.clientWidth + 1 })),
  28 |   cards: Array.from(el.querySelectorAll('.diss-objective-item')).map(n => { const title = n.querySelector('.diss-objective-item__head > :first-child')!.getBoundingClientRect(), status = n.querySelector('.diss-objective-item__status')!.getBoundingClientRect(), meter = n.querySelector('[role="progressbar"]')!.getBoundingClientRect(); return { width: n.getBoundingClientRect().width, client: n.clientWidth, scroll: n.scrollWidth, statusTop: status.top, titleBottom: title.bottom, overlaps: title.left < status.right && title.right > status.left && title.top < status.bottom && title.bottom > status.top, meter: meter.height }; }) })); }
  29 | 
  30 | for (const c of [{ name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 }, { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true }]) test(`learning objectives ${c.name} remain readable with distinct evidence states`, async ({ page }) => {
  31 |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); if (c.forced) await page.emulateMedia({ forcedColors: 'active' });
  32 |   await mount(page, { largeText: !!c.large, highContrast: !!c.contrast }, c.width, c.available); const before = await proof(page), p = await open(page), m = await metrics(p), items = await inventory(p);
  33 |   await writeFile(`${out}/${baseline ? 'before' : 'after'}-${c.name}-metrics.json`, JSON.stringify(m, null, 2)); await writeFile(`${out}/${baseline ? 'before' : 'after'}-${c.name}-inventory.json`, JSON.stringify(items, null, 2)); await page.mouse.move(c.width - 1, 0);
  34 |   await p.screenshot({ path: `${out}/${baseline ? 'before' : 'after'}-${c.name}.png`, style: '.diss-next-action {position:static!important;}' }); if (baseline) return;
  35 |   expect(items).toEqual(JSON.parse(await readFile(`${out}/before-${c.name}-inventory.json`, 'utf8'))); expect(items.map(i => i.status)).toEqual(expect.arrayContaining(['not-started', 'developing', 'demonstrated']));
  36 |   expect(m.width).toBeLessThanOrEqual(c.available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1); expect(m.summary).toBeGreaterThanOrEqual(47.9);
> 37 |   for (const n of m.text) { expect(n.font, n.text || '').toBeGreaterThanOrEqual(c.large ? 15.9 : 13.9); expect(n.clipped, n.text || '').toBe(false); }
     |                                                          ^ Error: Learning objectivesProgress from your lab evidence
  38 |   for (const card of m.cards) { expect(card.scroll).toBeLessThanOrEqual(card.client + 1); expect(card.overlaps).toBe(false); expect(card.meter).toBeGreaterThanOrEqual(9.9); if (c.available <= 640) expect(card.statusTop).toBeGreaterThanOrEqual(card.titleBottom - 1); }
  39 |   const cards = p.locator('.diss-objective-item'); for (let i = 0; i < items.length; i++) { const card = cards.nth(i); await expect(card.getByRole('heading', { level: 4 })).toHaveText(items[i].title!); await expect(card.getByRole('progressbar')).toHaveAccessibleName(`Evidence progress for objective ${i + 1}: ${items[i].title}`); await expect(card.locator('.diss-objective-item__percent')).toHaveText(`${items[i].progress}%`); }
  40 |   await p.locator(':scope > summary').focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(p.locator(':scope > summary')).toBeFocused(); const focus = await p.locator(':scope > summary').evaluate(el => ({ style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth), offset: parseFloat(getComputedStyle(el).outlineOffset) })); expect(focus.style).toBe('solid'); expect(focus.width).toBeGreaterThanOrEqual(2.9);
  41 |   await p.screenshot({ path: `${out}/focus-${c.name}.png`, style: '.diss-next-action {position:static!important;}' }); await page.keyboard.press('Space'); await expect(p).not.toHaveAttribute('open', ''); await page.keyboard.press('Enter'); await expect(p).toHaveAttribute('open', ''); expect(await proof(page)).toEqual(before);
  42 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['.diss-objectives']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })); await writeFile(`${out}/${c.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]); expect(errors).toEqual([]);
  43 | });
  44 | 
  45 | test('learning objectives reflow in an embedded lab while preserving focus and saved evidence', async ({ page }) => {
  46 |   await mount(page, { largeText: true }, 1440, 1180); const p = await open(page), before = await proof(page); await p.locator(':scope > summary').focus(); await page.addStyleTag({ content: '#wrap {max-width:320px!important;}' }); await expect(p.locator(':scope > summary')).toBeFocused(); await expect(p).toHaveAttribute('open', ''); const m = await metrics(p); expect(m.scroll).toBeLessThanOrEqual(m.client + 1); for (const card of m.cards) { expect(card.statusTop).toBeGreaterThanOrEqual(card.titleBottom - 1); expect(card.overlaps).toBe(false); } expect(await proof(page)).toEqual(before);
  47 | });
  48 | 
  49 | test('learning objective percentages follow inspected, recorded and verified evidence', async ({ page }) => {
  50 |   await mount(page, { exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {} }); const p = await open(page), card = p.locator('.diss-objective-item').first(); await expect(card).toHaveAttribute('data-objective-status', 'not-started'); await expect(card.locator('.diss-objective-item__percent')).toHaveText('0%');
  51 |   await page.evaluate(() => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, dissection: { ...prev.dissection, exploredOrgans: { 'frog|heart': true } } }))); await expect(card).toHaveAttribute('data-objective-status', 'developing'); await expect(card.locator('.diss-objective-item__percent')).toHaveText('33%');
  52 |   await page.evaluate(() => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, dissection: { ...prev.dissection, organNotes: { 'frog|heart': 'Two atria feed a shared ventricle.' }, organConfidence: { 'frog|heart': 3 } } }))); await expect(card.locator('.diss-objective-item__percent')).toHaveText('67%'); await expect(card).toContainText('Next: verify Heart');
  53 |   await page.evaluate(() => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, dissection: { ...prev.dissection, verifiedIdentifications: { 'frog|heart': { status: 'verified' } } } }))); await expect(card).toHaveAttribute('data-objective-status', 'demonstrated'); await expect(card.locator('.diss-objective-item__percent')).toHaveText('100%'); await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100'); await expect(card).toContainText('Evidence demonstrated'); await p.screenshot({ path: `${out}/completed-heart.png`, style: '.diss-next-action {position:static!important;}' });
  54 | });
  55 | 
  56 | for (const specimen of ['pig', 'sheepEye', 'sheepHeart']) test(`${specimen} objective text fits a narrow lab with large text`, async ({ page }) => {
  57 |   await mount(page, { specimen, _dissLoadedSpec: specimen, activeLayer: 'skin', anatomicalView: 'ventral', largeText: true, exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {} }, 1440, 320); const p = await open(page), before = await proof(page), m = await metrics(p); expect(m.scroll).toBeLessThanOrEqual(m.client + 1); for (const n of m.text) { expect(n.font, n.text || '').toBeGreaterThanOrEqual(15.9); expect(n.clipped, n.text || '').toBe(false); } for (const card of m.cards) expect(card.overlaps).toBe(false); expect(await proof(page)).toEqual(before); await p.screenshot({ path: `${out}/${specimen}-large.png`, style: '.diss-next-action {position:static!important;}' });
  58 | });
  59 | 
```