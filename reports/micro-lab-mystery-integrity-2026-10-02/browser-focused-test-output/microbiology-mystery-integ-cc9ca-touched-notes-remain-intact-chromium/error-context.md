# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-mystery-integrity.spec.ts >> phone and enlarged report navigation stays keyboard usable while imported markup and long untouched notes remain intact
- Location: tests\e2e\microbiology-mystery-integrity.spec.ts:182:5

# Error details

```
Error: {"viewport":{"width":1280,"scroll":1280,"zoom":"4"},"box":{"client":320,"scroll":423}}

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  1   | import { test, expect, type Locator, type Page } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | import { mkdirSync, writeFileSync } from 'node:fs';
  4   | import path from 'node:path';
  5   | 
  6   | test.use({ video: 'off' });
  7   | test.describe.configure({ retries: 0, timeout: 150000 });
  8   | const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-mystery-integrity-2026-10-02');
  9   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
  10  | const literal = '<img src=x onerror="window.__mysteryInjected=true"> & imported evidence stays literal';
  11  | const longNote = 'Untouched imported reasoning. ' + 'Additional original evidence; '.repeat(62) + 'ORIGINAL END';
  12  | const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  13  | const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
  14  | const panel = (page: Page) => page.locator('[data-micro-mystery]');
  15  | const reason = (page: Page) => page.locator('#micro-mystery-reasoning');
  16  | const reportView = (page: Page, name: 'Working notes' | 'Recorded report') => page.getByRole('group', { name: 'Report view', exact: true }).getByRole('button', { name, exact: true });
  17  | const caseButton = (page: Page, title: string) => page.getByRole('group', { name: 'Choose a specimen case', exact: true }).getByRole('button', { name: new RegExp(title) });
  18  | const xp = (page: Page) => page.evaluate(() => (window as any).__mysteryXP);
  19  | let errors: string[];
  20  | 
  21  | test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
  22  | test.afterAll(async () => { await harness.stop(); });
  23  | test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
  24  | test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
  25  | 
  26  | function report(claim: string, reasoning: string, marker: string) {
  27  |   return { claim, evidence: ['size', 'structure', 'behavior'], reasoning, limitation: 'bounded', originalReportMetadata: { marker, literal } };
  28  | }
  29  | function entry(claim: string, reasoning: string, marker: string) {
  30  |   return { revealed: ['context', 'size', 'structure', 'behavior'], collapsed: [], reportView: 'working', claim,
  31  |     evidence: ['size', 'structure', 'behavior'], reasoning, limitation: 'bounded', checked: true,
  32  |     record: report(claim, 'Recorded reasoning for ' + marker + '.', marker), previousRecord: report(claim, 'Previous reasoning for ' + marker + '.', 'previous-' + marker),
  33  |     importedCaseMetadata: { marker, nested: [literal, { preserve: true }] }, rawCaseArrays: [{ unchanged: marker }] };
  34  | }
  35  | function seed(activeReasoning = 'Working reasoning for wall.'): Record<string, any> {
  36  |   return {
  37  |     tab: 'mystery', showMicroLibrary: false,
  38  |     mysteryLab: { active: 'wall', notice: 'download_failed', importedLabMetadata: { original: literal, nested: ['Keep this notebook.'] },
  39  |       cases: { wall: entry('bacterium', activeReasoning, 'wall'), pond: entry('protist', longNote, 'pond'),
  40  |         budding: { ...entry('yeast', longNote, 'budding'), record: null, previousRecord: null },
  41  |         salt: entry('archaeon', longNote, 'salt'), particle: entry('phage', longNote, 'particle'), unresolved: entry('unresolved', longNote, 'unresolved'),
  42  |         unknownImportedCase: { raw: { reasoning: longNote, metadata: literal } } } },
  43  |     growthInvestigation: { control: { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 }, rawMarker: literal, trials: [{ id: 7, raw: true }] },
  44  |     resistanceInvestigation: { notes: literal, importedRun: { keep: true } },
  45  |     microscopeMeasurements: { unknownImportedSlide: { raw: literal } }, externalMarker: { literal, original: true }
  46  |   };
  47  | }
  48  | async function mount(page: Page, data = seed()) {
  49  |   await page.setViewportSize({ width: 1280, height: 960 });
  50  |   await harness.mount(page, { unrelatedNotebook: { original: literal, nested: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  51  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  52  |   await expect(panel(page)).toBeVisible();
  53  |   await page.evaluate(() => { const w = window as any; w.__mysteryXP = []; w.__ctx.awardXP = (...args: any[]) => w.__mysteryXP.push(args); w.__rerender(); });
  54  | }
  55  | function changed(before: any, fields: Record<string, any> = {}, active?: string, notice = '') {
  56  |   const expected = clone(before), lab = expected.microbiology.mysteryLab;
  57  |   Object.assign(lab.cases[lab.active], fields); if (active) lab.active = active; lab.notice = notice; return expected;
  58  | }
  59  | async function activate(button: Locator) { await button.focus(); await button.press('Enter'); }
  60  | async function open(details: Locator) {
  61  |   if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) await details.locator(':scope > summary').press('Enter');
  62  |   await expect(details).toHaveAttribute('open', '');
  63  | }
  64  | async function noOverflow(page: Page) {
  65  |   const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, zoom: getComputedStyle(document.body).zoom }));
  66  |   expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  67  |   for (const target of [page.locator('[data-microbiology-tool]'), panel(page), page.getByRole('region', { name: 'Classification and reasoning', exact: true })]) {
  68  |     const box = await target.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth }));
> 69  |     expect(box.scroll <= box.client + 1, JSON.stringify({ viewport, box })).toBe(true);
      |                                                                             ^ Error: {"viewport":{"width":1280,"scroll":1280,"zoom":"4"},"box":{"client":320,"scroll":423}}
  70  |   }
  71  | }
  72  | 
  73  | test('keyboard report view round trip keeps raw imported notes, metadata, saved versions and JSON reload intact', async ({ page }) => {
  74  |   await mount(page, seed(longNote + literal)); const before = await state(page);
  75  |   expect(before.microbiology.mysteryLab.cases.wall.reasoning.length).toBeGreaterThan(1600);
  76  |   await expect(reason(page)).toHaveValue((longNote + literal).slice(0, 1600)); expect(await state(page)).toEqual(before);
  77  |   await activate(reportView(page, 'Recorded report'));
  78  |   await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-report-view', 'recorded');
  79  |   await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  80  |   expect(await state(page)).toEqual(changed(before, { reportView: 'recorded' }));
  81  |   await expect(panel(page)).toContainText('Recorded reasoning for wall.');
  82  |   await page.getByRole('region', { name: 'Classification and reasoning', exact: true }).screenshot({ path: path.join(out, 'mystery-integrity-recorded-desktop.png') });
  83  |   await activate(reportView(page, 'Working notes'));
  84  |   await expect(reason(page)).toHaveValue((longNote + literal).slice(0, 1600));
  85  |   const saved = changed(before, { reportView: 'working' }); expect(await state(page)).toEqual(saved); expect(await xp(page)).toEqual([]);
  86  |   await harness.unmount(page); await page.evaluate(data => (window as any).__mount(data), clone(saved));
  87  |   await expect(reason(page)).toHaveValue((longNote + literal).slice(0, 1600)); expect(await state(page)).toEqual(saved);
  88  |   writeFileSync(path.join(out, 'mystery-integrity-restored-state.json'), JSON.stringify(saved, null, 2) + '\n');
  89  | });
  90  | 
  91  | test('case buttons and next unrecorded case preserve every untouched raw case and long imported notebook note', async ({ page }) => {
  92  |   await mount(page); let before = await state(page);
  93  |   await activate(caseButton(page, 'Freshwater drifter'));
  94  |   await expect(panel(page)).toHaveAttribute('data-micro-mystery', 'pond');
  95  |   await expect(page.locator('#micro-mystery-observation-heading')).toBeFocused();
  96  |   expect(await state(page)).toEqual(changed(before, {}, 'pond'));
  97  |   await expect(reason(page)).toHaveValue(longNote.slice(0, 1600));
  98  |   before = await state(page); await activate(page.getByRole('button', { name: /^Next unrecorded case: B/ }));
  99  |   await expect(panel(page)).toHaveAttribute('data-micro-mystery', 'budding'); expect(await state(page)).toEqual(changed(before, {}, 'budding'));
  100 |   await expect(page.locator('#micro-mystery-observation-heading')).toBeFocused();
  101 |   before = await state(page); await activate(caseButton(page, 'The wall is the clue'));
  102 |   expect(await state(page)).toEqual(changed(before, {}, 'wall')); expect(await xp(page)).toEqual([]);
  103 |   expect((await state(page)).microbiology.mysteryLab.cases.pond.reasoning).toBe(longNote);
  104 | });
  105 | 
  106 | test('next pending revision selects the existing working view without rewriting any imported draft or report', async ({ page }) => {
  107 |   const data = seed(); data.mysteryLab.cases.salt.reportView = 'recorded'; await mount(page, data); const before = await state(page);
  108 |   await activate(page.locator('[data-mystery-next-revision="salt"]'));
  109 |   await expect(panel(page)).toHaveAttribute('data-micro-mystery', 'salt');
  110 |   await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-report-view', 'working');
  111 |   await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  112 |   const expected = changed(before, {}, 'salt'); expected.microbiology.mysteryLab.cases.salt.reportView = 'working';
  113 |   expect(await state(page)).toEqual(expected); await expect(reason(page)).toHaveValue(longNote.slice(0, 1600)); expect(await xp(page)).toEqual([]);
  114 | });
  115 | 
  116 | test('editing, checking, recording and restoring touch only the selected leaves and preserve exact previous raw report metadata', async ({ page }) => {
  117 |   await mount(page); let before = await state(page); const replacement = literal + ' Peptidoglycan and cell organization support a broad bacterial claim.';
  118 |   await reason(page).fill(replacement); expect(await state(page)).toEqual(changed(before, { reasoning: replacement, checked: false }));
  119 |   before = await state(page); await activate(page.locator('#micro-clue-wall-size-toggle'));
  120 |   expect(await state(page)).toEqual(changed(before, { collapsed: ['size'] }));
  121 |   before = await state(page); await activate(page.getByRole('button', { name: 'Check my evidence', exact: true }));
  122 |   expect(await state(page)).toEqual(changed(before, { checked: true }));
  123 |   before = await state(page); await activate(page.getByRole('button', { name: 'Update recorded report', exact: true }));
  124 |   const newReport = { claim: 'bacterium', evidence: ['size', 'structure', 'behavior'], reasoning: replacement, limitation: 'bounded' };
  125 |   expect(await state(page)).toEqual(changed(before, { previousRecord: before.microbiology.mysteryLab.cases.wall.record, record: newReport }, undefined, 'saved'));
  126 |   await expect(panel(page)).toContainText(replacement); expect(await page.evaluate(() => Boolean((window as any).__mysteryInjected))).toBe(false);
  127 |   await expect(panel(page).locator('img[src="x"]')).toHaveCount(0);
  128 |   before = await state(page); await open(page.locator('[data-mystery-history="wall"]'));
  129 |   await activate(page.getByRole('button', { name: 'Restore previous report', exact: true }));
  130 |   expect(await state(page)).toEqual(changed(before, { record: before.microbiology.mysteryLab.cases.wall.previousRecord, previousRecord: before.microbiology.mysteryLab.cases.wall.record }, undefined, 'restored'));
  131 |   await expect(reason(page)).toHaveValue(replacement); expect(await xp(page)).toEqual([]);
  132 | });
  133 | 
  134 | async function intercept(page: Page, mode: string, action: 'navigate' | 'edit') {
  135 |   await page.evaluate(({ mode, action }) => {
  136 |     const w = window as any, ctx = w.__ctx, original = ctx.setToolData;
  137 |     w.__mysteryBaseSetter = original; w.__mysteryRaceConsumed = false;
  138 |     const setter = (update: any) => {
  139 |       if (typeof update === 'function' && !w.__mysteryRaceConsumed) {
  140 |         w.__mysteryRaceConsumed = true;
  141 |         original((previous: any) => {
  142 |           const current = previous.microbiology, lab = current.mysteryLab, wall = lab.cases.wall;
  143 |           const newWall = mode === 'report' ? { ...wall, record: { ...wall.record, reasoning: 'A newer saved report.', currentMarker: true } } :
  144 |             mode === 'draft' ? { ...wall, reasoning: 'A newer working draft.', currentMarker: true } : wall;
  145 |           const next = { ...previous, unrelatedNotebook: { ...previous.unrelatedNotebook, concurrent: true }, microbiology: { ...current,
  146 |             externalMarker: { ...current.externalMarker, concurrent: true }, ...(mode === 'tab' ? { tab: 'quiz' } : {}),
  147 |             mysteryLab: { ...lab, ...(mode === 'active' ? { active: 'salt' } : {}), concurrentLabMetadata: { keep: 'Latest notebook field.' },
  148 |               cases: { ...lab.cases, wall: newWall, pond: { ...lab.cases.pond, concurrentCaseMetadata: { keep: true } } } } } };
  149 |           w.__mysteryRaceExpected = JSON.parse(JSON.stringify(next));
  150 |           if (mode === 'unrelated') {
  151 |             w.__mysteryRaceExpected.microbiology.mysteryLab.notice = '';
  152 |             if (action === 'navigate') w.__mysteryRaceExpected.microbiology.mysteryLab.active = 'pond';
  153 |             else { w.__mysteryRaceExpected.microbiology.mysteryLab.cases.wall.reasoning = 'My explicit current edit.'; w.__mysteryRaceExpected.microbiology.mysteryLab.cases.wall.checked = false; }
  154 |           }
  155 |           return next;
  156 |         });
  157 |       }
  158 |       original(update);
  159 |     };
  160 |     ctx.setToolData = setter; ctx.setLabToolData = setter; w.__rerender();
  161 |   }, { mode, action });
  162 | }
  163 | async function finishRace(page: Page) {
  164 |   expect(await page.evaluate(() => (window as any).__mysteryRaceConsumed)).toBe(true);
  165 |   expect(await state(page)).toEqual(await page.evaluate(() => (window as any).__mysteryRaceExpected)); expect(await xp(page)).toEqual([]);
  166 |   await page.evaluate(() => { const w = window as any; w.__ctx.setToolData = w.__mysteryBaseSetter; w.__ctx.setLabToolData = w.__mysteryBaseSetter; w.__rerender(); });
  167 |   await harness.unmount(page);
  168 | }
  169 | 
```