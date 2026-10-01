# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-observation-reader.spec.ts >> reads only inspected observations with honest empty states, keyboard navigation, and unchanged evidence
- Location: tests\e2e\dissection-observation-reader.spec.ts:33:5

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('[data-observation-reader-open]')
Expected: focused
Received: inactive
Timeout:  15000ms

Call log:
  - Expect "toBeFocused" with timeout 15000ms
  - waiting for locator('[data-observation-reader-open]')
    29 × locator resolved to <button type="button" aria-haspopup="dialog" data-observation-reader-open="true" class="diss-observation-reader-open">Read observations in a larger view</button>
       - unexpected value "inactive"

```

```yaml
- button "Read observations in a larger view"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { mkdir } from 'node:fs/promises';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  6   | const out = 'reports/dissection-observation-reader-2026-09-27';
  7   | const note = '  I observed two curved faces.\nBehind the iris: α <not a tag> & details.  ';
  8   | const state = {
  9   |   specimen: 'sheepEye', _dissLoadedSpec: 'sheepEye', activeLayer: 'skin', anatomicalView: 'dorsal', reducedMotion: true, soundEnabled: false,
  10  |   exploredOrgans: { 'sheepEye|cornea': true, 'sheepEye|lens': true, 'frog|heart': true, 'sheepEye|missing': true },
  11  |   organNotes: { 'sheepEye|lens': note, 'sheepEye|retina': 'Uninspected draft', 'frog|heart': 'Other specimen' },
  12  |   organConfidence: { 'sheepEye|lens': 1 }, revealedLayers: {}, quizScore: 1, quizTotal: 2,
  13  | };
  14  | const snapshot = (page: any) => page.evaluate(() => {
  15  |   const d = (window as any).__ctx.toolData.dissection;
  16  |   return { specimen: d.specimen, layer: d.activeLayer, selected: d.selectedOrgan, explored: d.exploredOrgans, notes: d.organNotes,
  17  |     confidence: d.organConfidence, revealed: d.revealedLayers, score: d.quizScore, total: d.quizTotal };
  18  | });
  19  | async function review(page: any) {
  20  |   await page.locator('#diss-observation-review-title').click();
  21  |   return page.locator('[data-observation-review]');
  22  | }
  23  | async function openReader(page: any) {
  24  |   await page.locator('[data-observation-reader-open]').click();
  25  |   const dialog = page.getByRole('dialog', { name: /Observation reading view/ });
  26  |   await expect(dialog).toBeVisible();
  27  |   return dialog;
  28  | }
  29  | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  30  | test.afterAll(async () => { await harness.stop(); });
  31  | test.describe.configure({ retries: 0 });
  32  | 
  33  | test('reads only inspected observations with honest empty states, keyboard navigation, and unchanged evidence', async ({ page }) => {
  34  |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  35  |   await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  36  |   const before = await snapshot(page);
  37  |   await review(page);
  38  |   const opener = page.locator('[data-observation-reader-open]');
  39  |   await opener.focus(); await page.keyboard.press('Enter');
  40  |   const dialog = page.getByRole('dialog');
  41  |   const close = dialog.getByRole('button', { name: 'Close reading view' });
  42  |   await expect(close).toBeFocused();
  43  |   await expect(dialog).toContainText('2 of 2 inspected structures');
  44  |   await expect(dialog.locator('[data-observation-reader-entry]')).toHaveAttribute('data-observation-reader-entry', 'cornea');
  45  |   await expect(dialog).toContainText('No evidence note recorded.');
  46  |   await expect(dialog).toContainText('Confidence not recorded');
  47  |   await expect(dialog.getByRole('button', { name: 'Previous observation' })).toBeDisabled();
  48  |   await dialog.getByRole('button', { name: 'Next observation' }).click();
  49  |   await expect(dialog.getByRole('heading', { name: 'Crystalline Lens', exact: true })).toBeFocused();
  50  |   await expect(dialog.locator('[data-observation-reader-position]')).toHaveText('Observation 2 of 2');
  51  |   expect(await dialog.getByRole('region', { name: 'Your recorded note' }).textContent()).toBe(note);
  52  |   await expect(dialog).toContainText('Self-reported confidence: 1 of 3');
  53  |   await expect(dialog.locator('[data-observation-reader-locked]')).toBeVisible();
  54  |   await expect(dialog.getByRole('button', { name: 'Return to edit this note' })).toHaveCount(0);
  55  |   await expect(dialog.getByRole('button', { name: 'Next observation' })).toBeDisabled();
  56  |   await expect(dialog).not.toContainText('Uninspected draft');
  57  |   await expect(dialog).not.toContainText('Other specimen');
  58  |   await dialog.getByRole('button', { name: 'Larger text' }).click();
  59  |   await expect(dialog.locator('[data-observation-reader-entry]')).toHaveAttribute('data-large-text', 'true');
  60  |   await dialog.getByRole('region', { name: 'Your recorded note' }).focus();
  61  |   await page.keyboard.press('Tab'); await expect(close).toBeFocused();
  62  |   await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('region', { name: 'Your recorded note' })).toBeFocused();
  63  |   await dialog.screenshot({ path: out + '/reader-desktop.png' });
> 64  |   await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
      |                                                                                                  ^ Error: expect(locator).toBeFocused() failed
  65  |   expect(await snapshot(page)).toEqual(before);
  66  |   await openReader(page); await expect(page.locator('[data-observation-reader-position]')).toHaveText('Observation 1 of 2');
  67  |   await page.getByRole('button', { name: 'Close reading view' }).click(); await expect(opener).toBeFocused();
  68  |   expect(errors).toEqual([]);
  69  | });
  70  | 
  71  | test('keeps search and filter scope through editing and reads the revised original note', async ({ page }) => {
  72  |   await harness.mount(page, { dissection: { ...state, revealedLayers: { skin: true } } }, undefined, { expectCanvas: false });
  73  |   const before = await snapshot(page);
  74  |   const panel = await review(page);
  75  |   await panel.getByRole('searchbox').fill('curved');
  76  |   await panel.locator('[data-observation-filter="uncertain"]').click();
  77  |   const dialog = await openReader(page);
  78  |   await expect(dialog).toContainText('Low confidence · 1 of 2 inspected structures');
  79  |   await expect(dialog).toContainText('Search: curved');
  80  |   await expect(dialog.getByRole('button', { name: 'Previous observation' })).toBeDisabled();
  81  |   await expect(dialog.getByRole('button', { name: 'Next observation' })).toBeDisabled();
  82  |   expect(await snapshot(page)).toEqual(before);
  83  |   await dialog.getByRole('button', { name: 'Return to edit this note' }).click();
  84  |   await expect(dialog).toHaveCount(0);
  85  |   const field = page.locator('#diss-note-lens'); await expect(field).toBeFocused(); await expect(field).toHaveValue(note);
  86  |   expect(await snapshot(page)).toEqual({ ...before, layer: 'organs', selected: 'lens' });
  87  |   const revision = note + '\nI will check the curved outline again.';
  88  |   await field.fill(revision);
  89  |   await page.getByRole('button', { name: 'Review all observations', exact: true }).click();
  90  |   await expect(panel.getByRole('searchbox')).toHaveValue('curved');
  91  |   await expect(panel.locator('[data-observation-filter="uncertain"]')).toHaveAttribute('aria-pressed', 'true');
  92  |   await openReader(page);
  93  |   expect(await dialog.getByRole('region', { name: 'Your recorded note' }).textContent()).toBe(revision);
  94  |   expect(await snapshot(page)).toEqual({ ...before, layer: 'organs', selected: 'lens', notes: { ...before.notes, 'sheepEye|lens': revision } });
  95  | });
  96  | 
  97  | test('reader stays current after a parent render and releases modality for empty results or another activity', async ({ page }) => {
  98  |   await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  99  |   await review(page); let dialog = await openReader(page);
  100 |   await dialog.getByRole('button', { name: 'Next observation' }).click();
  101 |   await page.evaluate(() => {
  102 |     const ctx = (window as any).__ctx;
  103 |     ctx.update('dissection', 'organNotes', { ...ctx.toolData.dissection.organNotes, 'sheepEye|lens': 'Updated while the reader is open.' });
  104 |   });
  105 |   await expect(dialog.getByRole('region', { name: 'Your recorded note' })).toHaveText('Updated while the reader is open.');
  106 |   await expect(dialog.locator('[data-observation-reader-position]')).toHaveText('Observation 2 of 2');
  107 |   await page.evaluate(() => (window as any).__ctx.update('dissection', '_observationReviewSearch', 'no matches'));
  108 |   await expect(dialog).toHaveCount(0); await expect(page.locator('[data-observation-reader-open]')).toHaveCount(0);
  109 |   await page.getByRole('searchbox', { name: 'Search your observations' }).fill('');
  110 |   dialog = await openReader(page);
  111 |   await page.evaluate(() => (window as any).__ctx.update('dissection', 'quizMode', true));
  112 |   await expect(dialog).toHaveCount(0); await expect(page.locator('[data-observation-reader-open]')).toHaveCount(0);
  113 |   await page.evaluate(() => (window as any).__ctx.update('dissection', 'quizMode', false));
  114 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  115 |   await page.locator('#diss-observation-review-title').click();
  116 |   await page.locator('[data-observation-reader-open]').focus(); await expect(page.locator('[data-observation-reader-open]')).toBeFocused();
  117 | });
  118 | 
  119 | test('phone reading view wraps long notes and supports larger text and accessible controls', async ({ page }) => {
  120 |   await page.setViewportSize({ width: 320, height: 844 });
  121 |   const longNote = 'لاحظت سطحًا منحنيًا بالقرب من القزحية.\n' + 'A'.repeat(180) + '\n' + ('I will check this relationship again.\n').repeat(18);
  122 |   await harness.mount(page, { dissection: { ...state, organNotes: { 'sheepEye|lens': longNote }, _observationReviewFilter: 'uncertain' } }, undefined, { expectCanvas: false });
  123 |   await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  124 |   const before = await snapshot(page); await review(page); const dialog = await openReader(page);
  125 |   await dialog.getByRole('button', { name: 'Larger text' }).click();
  126 |   const text = dialog.getByRole('region', { name: 'Your recorded note' });
  127 |   expect(await text.textContent()).toBe(longNote);
  128 |   await expect(text).toHaveAttribute('dir', 'auto');
  129 |   const bounds = await dialog.evaluate(el => ({ left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, overflow: el.scrollWidth - el.clientWidth }));
  130 |   expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320); expect(bounds.overflow).toBeLessThanOrEqual(1);
  131 |   expect(await text.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20);
  132 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  133 |   const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-observation-reader]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  134 |   expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  135 |   await dialog.screenshot({ path: out + '/reader-phone.png' });
  136 |   await dialog.locator('.diss-observation-reader__hint').scrollIntoViewIfNeeded();
  137 |   await expect(dialog.getByRole('button', { name: 'Close reading view' })).toBeInViewport();
  138 |   await dialog.getByRole('button', { name: 'Close reading view' }).click();
  139 |   await expect(page.locator('[data-observation-reader-open]')).toBeFocused(); expect(await snapshot(page)).toEqual(before);
  140 | });
  141 | 
  142 | test('failed native opening keeps notes available and permits retry', async ({ page }) => {
  143 |   await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  144 |   const before = await snapshot(page); const panel = await review(page);
  145 |   await page.evaluate(() => {
  146 |     const original = HTMLDialogElement.prototype.showModal;
  147 |     HTMLDialogElement.prototype.showModal = function () { HTMLDialogElement.prototype.showModal = original; throw new Error('Unavailable fixture'); };
  148 |   });
  149 |   await panel.locator('[data-observation-reader-open]').click();
  150 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  151 |   await expect(panel.locator('[data-observation-reader-open]')).toBeFocused();
  152 |   await expect(panel.getByRole('status').filter({ hasText: 'could not open' })).toBeVisible();
  153 |   await panel.getByText('Read saved note', { exact: true }).click();
  154 |   expect(await panel.locator('.diss-observation-review__note').textContent()).toBe(note);
  155 |   await openReader(page); await page.keyboard.press('Escape'); expect(await snapshot(page)).toEqual(before);
  156 | });
  157 | 
```