# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-route-clarity.spec.ts >> route rail forced-colors shows readable controls and preserved workspace detail
- Location: tests\e2e\dissection-route-clarity.spec.ts:36:8

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 2.9
Received:    1
```

# Test source

```ts
  1  | import { test, expect, type Page, type Locator } from '@playwright/test';
  2  | import { mkdir, writeFile } from 'node:fs/promises';
  3  | import { GlHarness } from './helpers/stem_gl_harness';
  4  | 
  5  | const out = 'reports/dissection-route-clarity-2026-10-03';
  6  | const baseline = process.env.DISSECTION_ROUTE_BASELINE === '1';
  7  | const harness = new GlHarness({ toolFile: process.env.DISSECTION_ROUTE_RENDERER || 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  8  | const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', selectedOrgan: null, revealedLayers: { skin: true }, exploredOrgans: { 'frog|nictitating': true }, organNotes: { 'frog|nictitating': 'Preserve this saved membrane observation.' }, organConfidence: { 'frog|nictitating': 3 }, verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } }, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', reducedMotion: true, soundEnabled: false, sceneDetail: false };
  9  | 
  10 | test.describe.configure({ retries: 0 });
  11 | test.use({ video: 'off' });
  12 | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  13 | test.afterAll(async () => { await harness.stop(); });
  14 | test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });
  15 | 
  16 | async function mount(page: Page, state: any = {}, width = 320, available = width) {
  17 |   await page.setViewportSize({ width, height: 1000 });
  18 |   await harness.mount(page, { dissection: { ...initial, ...state } }, undefined, { expectCanvas: false });
  19 |   await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  20 |   await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
  21 | }
  22 | function rail(page: Page) { return page.getByRole('toolbar', { name: 'Learning route', exact: true }); }
  23 | async function evidence(page: Page) { return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { specimen: d.specimen, layer: d.activeLayer, view: d.anatomicalView, selected: d.selectedOrgan, instrument: d.activeInstrument, explored: d.exploredOrgans, notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, revealed: d.revealedLayers, procedures: d.procedureByLayer, scores: [d.quizScore, d.quizTotal] }; }); }
  24 | async function position(page: Page) { return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending], quiz: [d.quizMode, d.quizIdx, d.quizComplete], study: [d.toolbarStudyOpen, d.flashcardMode, d.compareMode, d.practicalMode] }; }); }
  25 | async function inventory(p: Locator) { return p.evaluate(el => Array.from(el.querySelectorAll('button')).map(n => ({ text: n.textContent, name: n.getAttribute('aria-label'), pressed: n.getAttribute('aria-pressed'), active: n.getAttribute('data-active'), disabled: n.disabled, title: n.title }))); }
  26 | async function metrics(p: Locator) { return p.evaluate(el => { const routes = Array.from(el.querySelectorAll('.diss-route-button')) as HTMLElement[]; return { client: el.clientWidth, scroll: el.scrollWidth, width: el.getBoundingClientRect().width, routeColumns: new Set(routes.map(n => Math.round(n.getBoundingClientRect().left))).size, controls: Array.from(el.querySelectorAll('button')).map(n => { const b = n.getBoundingClientRect(), s = getComputedStyle(n); return { text: n.textContent, font: parseFloat(s.fontSize), height: b.height, left: b.left, right: b.right, top: b.top, clipped: n.scrollWidth > n.clientWidth + 1, nowrap: s.whiteSpace === 'nowrap', border: parseFloat(s.borderTopWidth), underline: s.textDecorationLine.includes('underline'), pressed: n.getAttribute('aria-pressed') === 'true', disabled: n.disabled, opacity: parseFloat(s.opacity) }; }) }; }); }
> 27 | async function readable(p: Locator, available: number, large = false) { const m = await metrics(p); expect(m.width).toBeLessThanOrEqual(available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1); expect(m.routeColumns).toBe(available <= 440 ? 1 : available <= 980 ? 2 : 4); for (const c of m.controls) { expect(c.font, c.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(c.height, c.text || '').toBeGreaterThanOrEqual(47.9); expect(c.clipped, c.text || '').toBe(false); expect(c.nowrap, c.text || '').toBe(false); if (c.pressed) { expect(c.border).toBeGreaterThanOrEqual(2.9); expect(c.underline).toBe(true); } } return m; }
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  28 | 
  29 | for (const c of [
  30 |   { name: 'phone', width: 320, available: 320 },
  31 |   { name: 'tablet', width: 768, available: 768 },
  32 |   { name: 'desktop', width: 1440, available: 1180 },
  33 |   { name: 'embedded-medium', width: 1440, available: 520 },
  34 |   { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  35 |   { name: 'forced-colors', width: 390, available: 390, forced: true },
  36 | ]) test(`route rail ${c.name} shows readable controls and preserved workspace detail`, async ({ page }) => {
  37 |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  38 |   if (c.forced) await page.emulateMedia({ forcedColors: 'active' });
  39 |   await mount(page, { largeText: !!c.large, highContrast: !!c.contrast }, c.width, c.available);
  40 |   const p = rail(page), before = await evidence(page), state = await position(page), items = await inventory(p), m = await metrics(p), prefix = baseline ? 'before' : 'after';
  41 |   await writeFile(`${out}/${prefix}-${c.name}-metrics.json`, JSON.stringify(m, null, 2));
  42 |   await writeFile(`${out}/${prefix}-${c.name}-inventory.json`, JSON.stringify(items, null, 2));
  43 |   await p.screenshot({ path: `${out}/${prefix}-${c.name}.png`, style: '.diss-next-action {position:static!important;}' });
  44 |   if (baseline) return;
  45 |   await readable(p, c.available, !!c.large);
  46 |   await expect(p.locator('.diss-route-button[aria-pressed="true"]')).toHaveCount(1);
  47 |   const detail = p.getByRole('group', { name: 'Workspace detail', exact: true });
  48 |   await expect(detail.locator('button[aria-pressed="true"]')).toHaveCount(1);
  49 |   const explore = p.getByRole('button', { name: 'Procedure practice', exact: true }), guided = p.getByRole('button', { name: 'Guided investigation', exact: true }), advanced = detail.getByRole('button', { name: 'Advanced workspace', exact: true });
  50 |   await explore.focus(); await page.keyboard.press('ArrowRight'); await expect(guided).toBeFocused();
  51 |   const focus = await guided.evaluate(el => { const b = el.getBoundingClientRect(), s = getComputedStyle(el), pad = parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset); return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, offset: parseFloat(s.outlineOffset), inside: pad <= 0 && b.width > 2 * Math.abs(pad) && b.height > 2 * Math.abs(pad) }; });
  52 |   expect(focus.width).toBeGreaterThanOrEqual(2.9); expect(focus.style).toBe('solid'); expect(focus.inside).toBe(true);
  53 |   await p.screenshot({ path: `${out}/focus-${c.name}.png`, style: '.diss-next-action {position:static!important;}' });
  54 |   await page.keyboard.press('End'); await expect(advanced).toBeFocused(); await page.keyboard.press('Home'); await expect(explore).toBeFocused(); await page.keyboard.press('ArrowLeft'); await expect(advanced).toBeFocused();
  55 |   expect(await position(page)).toEqual(state); expect(await evidence(page)).toEqual(before);
  56 |   await page.keyboard.press('Enter'); await expect(advanced).toHaveAttribute('aria-pressed', 'true'); await expect(p.getByRole('button', { name: 'Free explore', exact: true })).toHaveAttribute('aria-pressed', 'true');
  57 |   expect(await evidence(page)).toEqual(before); expect(await position(page)).toEqual(state);
  58 |   const essentials = detail.getByRole('button', { name: 'Essentials workspace', exact: true }); await essentials.focus(); await page.keyboard.press('Space'); await expect(essentials).toHaveAttribute('aria-pressed', 'true');
  59 |   expect(await evidence(page)).toEqual(before); expect(await inventory(p)).toEqual(items);
  60 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  61 |   const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-dissection-workspace-mode]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  62 |   await writeFile(`${out}/${c.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]); expect(audit.incomplete.filter((r: any) => r.id !== 'color-contrast')).toEqual([]); expect(errors).toEqual([]);
  63 | });
  64 | 
  65 | test('route rail reflows without activating another learning route', async ({ page }) => {
  66 |   await mount(page, { largeText: true }, 1440, 1180); const p = rail(page), before = await evidence(page), state = await position(page), items = await inventory(p), guided = p.getByRole('button', { name: 'Guided investigation', exact: true });
  67 |   await guided.focus(); await page.addStyleTag({ content: '#wrap {max-width:320px!important;}' }); await expect(guided).toBeFocused(); await readable(p, 320, true); expect(await evidence(page)).toEqual(before); expect(await position(page)).toEqual(state); expect(await inventory(p)).toEqual(items);
  68 | });
  69 | 
  70 | test('route rail keyboard activation starts Guided investigation with saved evidence intact', async ({ page }) => {
  71 |   await mount(page); const p = rail(page), before = await evidence(page), explore = p.getByRole('button', { name: 'Procedure practice', exact: true });
  72 |   await explore.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  73 |   await expect(p.getByRole('button', { name: 'Guided investigation', exact: true })).toHaveAttribute('aria-pressed', 'true'); expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.guidedMode)).toBe(true); expect(await evidence(page)).toEqual(before);
  74 |   await p.screenshot({ path: `${out}/guided.png`, style: '.diss-next-action {position:static!important;}' });
  75 | });
  76 | 
  77 | test('route rail keeps practical route locks readable and keyboard navigation skips disabled routes', async ({ page }) => {
  78 |   await mount(page, { quizMode: true, practicalMode: true, practicalTimer: 300, practicalEndsAt: Date.now() + 300000, practicalTargetIds: ['ventral_skin', 'tympanum'], labelMode: 'hidden', highContrast: true }, 320);
  79 |   const p = rail(page), before = await evidence(page), study = p.getByRole('button', { name: 'Study tools', exact: true });
  80 |   await expect(p.locator('.diss-route-button:disabled')).toHaveCount(3); await expect(study).toBeEnabled(); await expect(study).toHaveAttribute('aria-pressed', 'true'); const m = await readable(p, 320); expect(m.controls.filter(c => c.disabled).every(c => c.opacity === 1)).toBe(true);
  81 |   const advanced = p.getByRole('button', { name: 'Advanced workspace', exact: true }); await advanced.focus(); await page.keyboard.press('Home'); await expect(study).toBeFocused(); await page.keyboard.press('End'); await expect(advanced).toBeFocused(); expect(await evidence(page)).toEqual(before);
  82 |   await p.screenshot({ path: `${out}/practical.png`, style: '.diss-next-action {position:static!important;}' });
  83 | });
  84 | 
  85 | test('route rail retains full labels with increased text spacing', async ({ page }) => {
  86 |   await mount(page, { largeText: true }, 1440, 320); const p = rail(page), before = await evidence(page), items = await inventory(p);
  87 |   await page.addStyleTag({ content: '.diss-mode-rail button {letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important;}' });
  88 |   await readable(p, 320, true); expect(await inventory(p)).toEqual(items); expect(await evidence(page)).toEqual(before); await p.screenshot({ path: `${out}/text-spacing.png`, style: '.diss-next-action {position:static!important;}' });
  89 | });
  90 | 
```