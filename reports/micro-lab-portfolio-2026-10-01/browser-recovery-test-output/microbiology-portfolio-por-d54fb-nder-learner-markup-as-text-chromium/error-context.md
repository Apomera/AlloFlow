# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-portfolio.spec.ts >> portfolio previews reflow on phones and enlarged layouts and render learner markup as text
- Location: tests\e2e\microbiology-portfolio.spec.ts:176:5

# Error details

```
Error: .micro-workspace-home

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | import { mkdirSync, readFileSync } from 'node:fs';
  4   | import path from 'node:path';
  5   | 
  6   | test.use({ video: 'off' });
  7   | test.describe.configure({ retries: 0, timeout: 90000 });
  8   | const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-portfolio-2026-10-01');
  9   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
  10  | const source = readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
  11  | const bankStart = source.indexOf('var QUIZ_QUESTIONS = [');
  12  | const bank = new Function(source.slice(bankStart, source.indexOf('// INTERACTIVE WIDGETS', bankStart)) + '\nreturn QUIZ_QUESTIONS;')() as { q: string; choices: string[]; answer: number; explain: string }[];
  13  | const activities = ['mystery', 'microscope', 'gram', 'growth', 'resistance', 'quiz'];
  14  | let errors: string[];
  15  | test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
  16  | test.afterAll(async () => { await harness.stop(); });
  17  | test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
  18  | test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
  19  | const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
  20  | async function mount(page: Page, seed: Record<string, unknown> = {}) {
  21  |   await page.setViewportSize({ width: 1280, height: 960 });
  22  |   await harness.mount(page, { unrelatedNotebook: { note: 'Keep other work.' }, microbiology: { tab: 'home', ...seed } }, undefined, { expectCanvas: false });
  23  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  24  |   await page.evaluate(() => {
  25  |     const w = window as any; w.__portfolioXP = [];
  26  |     w.__ctx.awardXP = (...args: unknown[]) => w.__portfolioXP.push(args);
  27  |   });
  28  | }
  29  | async function open(page: Page) {
  30  |   const details = page.locator('#micro-portfolio');
  31  |   if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
  32  |     await page.locator('#micro-portfolio-summary').focus(); await page.keyboard.press('Enter');
  33  |   }
  34  |   await expect(details).toHaveAttribute('open', '');
  35  | }
  36  | async function select(page: Page, id: string) {
  37  |   await page.getByLabel('Activity to review', { exact: true }).selectOption(id);
  38  |   await expect(page.locator('#micro-portfolio-preview')).toHaveAttribute('data-portfolio-activity', id);
  39  |   return page.locator('#micro-portfolio-preview').innerText();
  40  | }
  41  | async function reload(page: Page) {
  42  |   const saved = await state(page); await harness.unmount(page);
  43  |   await page.evaluate(data => (window as any).__mount(data), saved); return saved;
  44  | }
  45  | async function noOverflow(page: Page) {
  46  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  47  |   for (const selector of ['[data-microbiology-tool]', '.micro-workspace-home', '.micro-portfolio', '#micro-portfolio-preview']) {
  48  |     const element = page.locator(selector);
  49  |     if (await element.count()) {
  50  |       const bounded = await element.evaluate(node => node.scrollWidth <= node.clientWidth + 1);
  51  |       if (!bounded) {
  52  |         const diagnostic = await element.evaluate(node => [node, ...node.querySelectorAll('*')].filter(item => item.scrollWidth > item.clientWidth + 1).slice(0, 18).map(item => ({ tag: item.tagName, id: item.id, class: item.className, client: item.clientWidth, scroll: item.scrollWidth, rect: item.getBoundingClientRect().toJSON(), whiteSpace: getComputedStyle(item).whiteSpace, overflowX: getComputedStyle(item).overflowX })));
  53  |         console.log(JSON.stringify({ selector, diagnostic }));
  54  |       }
> 55  |       expect(bounded, selector).toBe(true);
      |                                 ^ Error: .micro-workspace-home
  56  |     }
  57  |   }
  58  | }
  59  | async function download(page: Page, name: string) {
  60  |   const button = page.locator('#micro-portfolio-download'); await button.focus();
  61  |   const pending = page.waitForEvent('download'); await page.keyboard.press('Enter');
  62  |   const file = await pending; const text = readFileSync((await file.path())!, 'utf8');
  63  |   await file.saveAs(path.join(out, name)); await expect(button).toBeFocused();
  64  |   expect(file.suggestedFilename()).toBe('micro-lab-portfolio.txt'); return text;
  65  | }
  66  | const base = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 50 };
  67  | const context = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 };
  68  | const measured = { value: 2, unit: 'um', context };
  69  | const pond = { claim: 'protist', evidence: ['structure', 'behavior'], reasoning: 'Recorded pond explanation connects nuclei and cilia.', limitation: 'bounded' };
  70  | const gram = { prediction: 'both', interpretation: 'wall', explanation: 'Recorded Gram explanation connects envelopes and retained dye.' };
  71  | const run = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'Original Resistance notes.', history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };
  72  | const trial = { id: 7, control: base, conditions: { ...base, tempC: 25 }, prediction: 'lower', hypothesis: 'Before saved Growth trial.', explanation: 'Saved Growth explanation.' };
  73  | function richSeed() {
  74  |   const original = bank.map((q, i) => i === 0 ? (q.answer + 1) % q.choices.length : q.answer);
  75  |   return {
  76  |     mysteryLab: { active: 'pond', cases: { pond: { ...pond, revealed: ['context', 'structure', 'behavior'], record: pond, previousRecord: { ...pond, reasoning: 'Previous pond explanation.' }, reasoning: 'Working pond revision.', reportView: 'recorded', checked: false } } },
  77  |     microscopeMeasurements: { ecoli: { result: measured, previousResult: { ...measured, value: 1.8 }, draft: { ...measured, value: '3' } } },
  78  |     gramInvestigation: { ...gram, step: 2, maxStep: 4, record: gram, previousRecord: { ...gram, explanation: 'Previous Gram explanation.' }, explanation: 'Working Gram revision.' },
  79  |     growthLab: { ...base, tempC: 18, understood: true, stuckRevealed: true, hypothesis: 'Earlier Growth notes.', explanation: 'Earlier Growth explanation.', log: [] },
  80  |     growthInvestigation: { control: base, trials: [trial], selectedId: 7, nextId: 20, prediction: 'higher', hypothesis: 'Working Growth reasoning.', explanation: 'Working Growth notes.', sweepVariable: 'pH', sweep: { variable: 'pH', conditions: base }, previousSweep: { variable: 'tempC', conditions: base }, removed: { trial: { ...trial, id: 9, hypothesis: 'Removed Growth reasoning.', explanation: 'Removed Growth explanation.' }, index: 1 } },
  81  |     growthReviewHour: 6,
  82  |     resistanceInvestigation: { ...run, notes: 'Working Resistance notes.' },
  83  |     resistanceNotebook: { selectedId: 4, nextId: 10, records: [{ id: 4, evidence: run, reviewNote: 'Later Resistance reflection.' }], removed: { record: { id: 8, evidence: { ...run, notes: 'Removed Resistance notes.' }, reviewNote: 'Removed Resistance reflection.' }, index: 1 } },
  84  |     quizAnswers: original, quizSubmitted: true, quizCorrect: 999,
  85  |     quizPractice: { answers: bank.map(q => q.answer), checked: bank.map((_, i) => i === 0), reflections: ['Later quiz correction reflection.'] },
  86  |     scopeOrganism: 'ecoli', selectedScope: 'lightbright', magnification: 1000, microscopeZoom: 20, microscopeFocus: 50, microscopeTargetFocus: 50, microscopeSeenSlides: [], savedSentinel: { keep: 'Raw independent metadata.' }
  87  |   };
  88  | }
  89  | 
  90  | test('empty and damaged portfolios stay empty without fabricated progress or enabled downloads', async ({ page }) => {
  91  |   for (const seed of [{}, { quizAnswers: Array(15).fill('1'), quizSubmitted: true, quizCorrect: 500, growthInvestigation: { trials: [null] }, resistanceNotebook: { records: [null] }, microscopeMeasurements: { ecoli: { result: { ...measured, value: null } } }, gramInvestigation: { step: 99, maxStep: 'all', record: 'yes' }, mysteryLab: { cases: { pond: { record: { claim: 'anything', reasoning: 'x' } } } } }]) {
  92  |     await mount(page, seed); const before = await state(page);
  93  |     await expect(page.locator('#micro-portfolio')).not.toHaveAttribute('open', ''); await open(page);
  94  |     await expect(page.locator('#micro-portfolio-download')).toBeDisabled();
  95  |     expect(await page.locator('#micro-portfolio-activity option').evaluateAll(nodes => nodes.map(node => (node as HTMLOptionElement).value))).toEqual(activities);
  96  |     for (const id of activities) {
  97  |       const text = await select(page, id); expect(text).toContain('No evidence or working notes yet.'); expect(text).not.toMatch(/NaN|Infinity|\[object Object\]/);
  98  |     }
  99  |     expect(await state(page)).toEqual(before); await harness.unmount(page);
  100 |   }
  101 | });
  102 | 
  103 | test('Home reviews all six activity records using keyboard controls without modifying evidence or awarding XP', async ({ page }) => {
  104 |   await mount(page, richSeed()); const before = await state(page); await open(page);
  105 |   const markers: Record<string, string[]> = {
  106 |     mystery: ['Recorded pond explanation', 'Previous pond explanation', 'Working pond revision'],
  107 |     microscope: ['E. coli', '1.8', '3'], gram: ['Recorded Gram explanation', 'Previous Gram explanation', 'Working Gram revision'],
  108 |     growth: ['Saved Growth explanation', 'Removed Growth explanation', 'Working Growth reasoning', 'Earlier Growth notes'],
  109 |     resistance: ['Original Resistance notes', 'Later Resistance reflection', 'Removed Resistance notes', 'Working Resistance notes'],
  110 |     quiz: ['Original score: 14/15', 'Later quiz correction reflection']
  111 |   };
  112 |   for (const id of activities) { const text = await select(page, id); for (const marker of markers[id]) expect(text, id).toContain(marker); }
  113 |   await page.locator('#micro-portfolio-activity').focus(); await page.keyboard.press('Home');
  114 |   await expect(page.locator('#micro-portfolio-activity')).toHaveValue('mystery');
  115 |   await page.keyboard.press('End'); await expect(page.locator('#micro-portfolio-activity')).toHaveValue('quiz');
  116 |   await expect(page.locator('#micro-portfolio-activity')).toBeFocused();
  117 |   await page.locator('#micro-portfolio-summary').focus(); await page.keyboard.press('Space');
  118 |   await expect(page.locator('#micro-portfolio')).not.toHaveAttribute('open', '');
  119 |   await page.keyboard.press('Space'); await expect(page.locator('#micro-portfolio')).toHaveAttribute('open', '');
  120 |   expect(await state(page)).toEqual(before); expect(await page.evaluate(() => (window as any).__portfolioXP)).toEqual([]);
  121 |   await page.locator('#micro-portfolio').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'portfolio-home-desktop.png'), fullPage: true });
  122 | });
  123 | 
  124 | test('one combined download retains originals, revisions, recovery, tables and separate quiz practice after JSON reload', async ({ page }) => {
  125 |   await mount(page, richSeed()); const before = await state(page); await open(page);
  126 |   const text = await download(page, 'portfolio-full.txt');
  127 |   for (const marker of ['Recorded pond explanation', 'Previous pond explanation', 'Working pond revision', 'Recorded Gram explanation', 'Previous Gram explanation', 'Working Gram revision', 'Saved Growth explanation', 'Removed Growth explanation', 'Working Growth reasoning', 'Original Resistance notes', 'Later Resistance reflection', 'Removed Resistance reflection', 'Working Resistance notes', 'Original score: 14/15', 'Later quiz correction reflection']) expect(text).toContain(marker);
  128 |   expect(text).toContain('24'); expect(text).toContain('12%'); expect(text).not.toContain('999');
  129 |   expect(await state(page)).toEqual(before); await reload(page); await open(page);
  130 |   expect(await download(page, 'portfolio-restored.txt')).toBe(text); expect(await state(page)).toEqual(before);
  131 | });
  132 | 
  133 | test('failed and repeated downloads announce locally, clean up resources, preserve focus and allow retry', async ({ page }) => {
  134 |   await mount(page, richSeed()); const before = await state(page); await open(page);
  135 |   await page.evaluate(() => {
  136 |     const w = window as any; w.__portfolioOriginalCreate = URL.createObjectURL; w.__portfolioOriginalRevoke = URL.revokeObjectURL;
  137 |     w.__portfolioOriginalClick = HTMLAnchorElement.prototype.click; w.__portfolioCreated = []; w.__portfolioRevoked = [];
  138 |     URL.createObjectURL = () => { throw new Error('Blocked download for test'); };
  139 |     URL.revokeObjectURL = url => { w.__portfolioRevoked.push(url); w.__portfolioOriginalRevoke.call(URL, url); };
  140 |   });
  141 |   const button = page.locator('#micro-portfolio-download'); const status = page.locator('#micro-portfolio-download-status');
  142 |   await button.focus(); await page.keyboard.press('Enter'); await expect(status).toContainText(/could not|couldn't|failed/i);
  143 |   await expect(button).toBeFocused(); await expect(status).toHaveAttribute('role', 'status'); await expect(status).toHaveAttribute('aria-live', 'polite');
  144 |   await page.evaluate(() => {
  145 |     const w = window as any; URL.createObjectURL = blob => { const url = w.__portfolioOriginalCreate.call(URL, blob); w.__portfolioCreated.push(url); return url; };
  146 |     HTMLAnchorElement.prototype.click = function() { throw new Error('Blocked anchor click for test'); };
  147 |   });
  148 |   await page.keyboard.press('Enter'); await expect(status).toContainText(/could not|couldn't|failed/i);
  149 |   await expect(page.locator('a[download="micro-lab-portfolio.txt"]')).toHaveCount(0);
  150 |   await page.evaluate(() => { HTMLAnchorElement.prototype.click = (window as any).__portfolioOriginalClick; });
  151 |   const text = await download(page, 'portfolio-retry.txt'); await expect(status).toContainText(/started/i);
  152 |   await page.evaluate(() => { (window as any).__portfolioNoticeNode = document.querySelector('#micro-portfolio-download-status span'); });
  153 |   expect(await download(page, 'portfolio-repeated.txt')).toBe(text);
  154 |   expect(await page.evaluate(() => (window as any).__portfolioNoticeNode?.isConnected)).toBe(false);
  155 |   await expect.poll(() => page.evaluate(() => (window as any).__portfolioRevoked.length)).toBe(3);
```