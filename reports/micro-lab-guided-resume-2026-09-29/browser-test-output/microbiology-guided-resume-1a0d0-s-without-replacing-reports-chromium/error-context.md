# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-guided-resume.spec.ts >> Home finds Mystery revisions, opens working notes, and cycles without replacing reports
- Location: tests\e2e\microbiology-guided-resume.spec.ts:34:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 0
+ Received  + 1

@@ -1,6 +1,7 @@
  Object {
+   "checked": false,
    "claim": "protist",
    "collapsed": Array [
      "structure",
    ],
    "evidence": Array [
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | import { mkdirSync, readFileSync } from 'node:fs';
  4   | import path from 'node:path';
  5   | 
  6   | test.use({ video: 'off' });
  7   | test.describe.configure({ mode: 'serial', retries: 0, timeout: 90000 });
  8   | const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-guided-resume-2026-09-29');
  9   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
  10  | test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
  11  | test.afterAll(async () => { await harness.stop(); });
  12  | test.afterEach(async ({ page }) => { await harness.unmount(page); });
  13  | const source = readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
  14  | const bankStart = source.indexOf('var QUIZ_QUESTIONS = [');
  15  | const bank = new Function(source.slice(bankStart, source.indexOf('// INTERACTIVE WIDGETS', bankStart)) + '\nreturn QUIZ_QUESTIONS;')();
  16  | const state = (page: any) => page.evaluate(() => (window as any).__toolData.microbiology);
  17  | async function mount(page: any, seed = {}) {
  18  |   await page.setViewportSize({ width: 1280, height: 960 });
  19  |   await harness.mount(page, { microbiology: { tab: 'home', ...seed } }, undefined, { expectCanvas: false });
  20  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  21  | }
  22  | async function enter(page: any, activity: string) { await page.locator(`[data-work-next="${activity}"]`).focus(); await page.keyboard.press('Enter'); }
  23  | async function phone(page: any, width = 390) {
  24  |   await page.setViewportSize({ width, height: 844 });
  25  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  26  | }
  27  | async function reload(page: any) {
  28  |   const saved = await state(page); await harness.unmount(page);
  29  |   await page.evaluate(data => (window as any).__mount({ microbiology: data }), saved); return saved;
  30  | }
  31  | const claims = { pond: 'protist', budding: 'yeast', wall: 'bacterium', salt: 'archaeon', particle: 'phage', unresolved: 'unresolved' };
  32  | const report = (claim: string) => ({ claim, evidence: ['structure', 'behavior'], reasoning: 'The supplied observations support this classification; the species is unresolved.', limitation: 'bounded' });
  33  | 
  34  | test('Home finds Mystery revisions, opens working notes, and cycles without replacing reports', async ({ page }) => {
  35  |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  36  |   const cases = Object.fromEntries(Object.entries(claims).map(([id, claim]) => {
  37  |     const saved = report(claim); return [id, { ...saved, revealed: ['context', 'structure', 'behavior'], collapsed: ['structure'], reportView: 'recorded', record: saved,
  38  |       previousRecord: { ...saved, reasoning: 'An earlier recorded explanation.' }, reasoning: ['pond', 'budding'].includes(id) ? `Working revision for ${id}.` : saved.reasoning }];
  39  |   }));
  40  |   const seed = { mysteryLab: { active: 'unresolved', cases }, growthInvestigation: { selectedId: 2, trials: [{ id: 1, conditions: {}, control: {}, explanation: '' }, { id: 2, conditions: {}, explanation: 'Complete.' }] } };
  41  |   await mount(page, seed); await expect(page.locator('[data-work-next="mystery"]')).toContainText('Review working revision · A:');
  42  |   await page.screenshot({ path: path.join(out, 'guided-home-desktop.png') }); await phone(page, 320);
  43  |   await page.screenshot({ path: path.join(out, 'guided-home-phone.png') }); await enter(page, 'mystery');
  44  |   await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  45  |   await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-case', 'pond');
  46  |   await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-report-view', 'working');
  47  |   await expect(page.locator('#micro-mystery-reasoning')).toHaveValue('Working revision for pond.');
  48  |   await page.locator('[data-mystery-next-revision="budding"]').focus(); await page.keyboard.press('Enter');
  49  |   await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  50  |   await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-case', 'budding');
  51  |   const after = await state(page);
  52  |   for (const id of Object.keys(claims)) {
  53  |     const actual = { ...after.mysteryLab.cases[id] }, expected = { ...cases[id] }; delete actual.reportView; delete expected.reportView;
> 54  |     expect(actual).toEqual(expected);
      |                    ^ Error: expect(received).toEqual(expected) // deep equality
  55  |   }
  56  |   await phone(page); await page.locator('[data-mystery-next-revision="pond"]').scrollIntoViewIfNeeded();
  57  |   await page.screenshot({ path: path.join(out, 'mystery-revision-navigation-phone.png') });
  58  |   await reload(page); await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-case', 'budding');
  59  |   await page.getByRole('tab', { name: 'Home', exact: true }).click();
  60  |   await expect(page.locator('[data-work-next="mystery"]')).toContainText('Review working revision · B:');
  61  |   expect(errors).toEqual([]);
  62  | });
  63  | 
  64  | test('Home opens an unchecked estimate in its notebook before the learner resumes the view', async ({ page }) => {
  65  |   const context = { version: 1, specimen: 'strep', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 1 };
  66  |   const seed = { scopeOrganism: 'ecoli', selectedScope: 'em', magnification: 10000, microscopeZoom: 4, microscopeFocus: 15, microscopeTargetFocus: 50,
  67  |     microscopeMeasurements: { strep: { draft: { value: '1.5', unit: 'um', context } } } };
  68  |   await mount(page, seed); await phone(page); await enter(page, 'microscope');
  69  |   const entry = page.locator('#micro-measurement-notebook-strep'); await expect(entry).toBeFocused();
  70  |   await expect(entry.locator('[data-measurement-draft="strep"]')).toBeVisible();
  71  |   for (const [key, value] of Object.entries(seed)) expect((await state(page))[key]).toEqual(value);
  72  |   await entry.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'unchecked-estimate-destination-phone.png') });
  73  |   await entry.getByRole('button', { name: 'Resume working view · Streptococcus', exact: true }).click();
  74  |   const resumed = await state(page); expect(resumed).toMatchObject({ scopeOrganism: 'strep', selectedScope: 'lightbright', magnification: 1000, microscopeZoom: 20 });
  75  |   expect(resumed.microscopeMeasurements).toEqual(seed.microscopeMeasurements);
  76  |   await reload(page); await page.getByRole('tab', { name: 'Home', exact: true }).click(); await enter(page, 'microscope'); await expect(entry).toBeFocused();
  77  | });
  78  | 
  79  | test('Home and the growth editor move through missing explanations while keeping the experiment', async ({ page }) => {
  80  |   const book = { selectedId: 9, nextId: 10, conditions: { tempC: 18, oxygen: 25 }, control: { tempC: 30 }, prediction: 'lower', hypothesis: 'My next comparison',
  81  |     trials: [{ id: 7, conditions: { pH: 5 }, control: {}, prediction: 'lower', hypothesis: 'Before seven', explanation: ' ' },
  82  |       { id: 4, conditions: { tempC: 22 }, prediction: 'higher', hypothesis: 'Without a saved control', explanation: '' },
  83  |       { id: 9, conditions: {}, control: {}, explanation: 'Already explained.' }] };
  84  |   await mount(page, { growthInvestigation: book, growthReviewHour: 6 }); await phone(page, 320); await enter(page, 'growth');
  85  |   await expect(page.locator('#gl-explanation')).toBeFocused(); await expect(page.locator('#gl-saved-result')).toHaveAttribute('data-micro-growth-result', '7');
  86  |   expect((await state(page)).growthInvestigation).toEqual({ ...book, selectedId: 7 }); expect((await state(page)).growthReviewHour).toBe(6);
  87  |   await page.locator('[data-next-unexplained-trial="4"]').focus(); await page.keyboard.press('Enter');
  88  |   await expect(page.locator('#gl-explanation')).toBeFocused(); await expect(page.locator('#gl-saved-result')).toHaveAttribute('data-micro-growth-recovered', '4');
  89  |   expect((await state(page)).growthInvestigation).toEqual({ ...book, selectedId: 4 });
  90  |   await page.locator('#gl-explanation').fill('The trial lacks a saved control, so its comparison is unavailable.');
  91  |   await page.locator('[data-next-unexplained-trial="7"]').scrollIntoViewIfNeeded();
  92  |   await page.screenshot({ path: path.join(out, 'growth-explanation-navigation-phone.png') });
  93  |   await reload(page); await page.getByRole('tab', { name: 'Home', exact: true }).click();
  94  |   await expect(page.locator('[data-work-next="growth"]')).toHaveText('Explain saved trial 7');
  95  |   const restored = await state(page); expect(restored.growthInvestigation.control).toEqual(book.control); expect(restored.growthReviewHour).toBe(6);
  96  | });
  97  | 
  98  | test('each Gram shortcut focuses the next action without advancing observations or replacing a report', async ({ page }) => {
  99  |   const record = { prediction: 'both', interpretation: 'wall', explanation: 'The models separate at decolorization.' };
  100 |   const states = [
  101 |     [{}, 'micro-gram-prediction-thick'],
  102 |     [{ prediction: 'thin', step: 1, maxStep: 2 }, 'micro-gram-stage-3'],
  103 |     [{ prediction: 'thick', step: 4, maxStep: 4, interpretation: 'shape' }, 'micro-gram-interpretation-heading'],
  104 |     [{ prediction: 'thick', step: 4, maxStep: 4, interpretation: 'wall', explanation: ' ' }, 'micro-gram-explanation'],
  105 |     [{ ...record, step: 3, maxStep: 4 }, 'micro-gram-save'],
  106 |     [{ ...record, step: 2, maxStep: 4, record }, 'micro-gram-record-heading']
  107 |   ] as const;
  108 |   for (const [gram, target] of states) {
  109 |     await mount(page, { gramInvestigation: gram, gramStep: 'step' in gram ? gram.step : 0 }); await phone(page); await enter(page, 'gram');
  110 |     await expect(page.locator(`#${target}`)).toBeFocused(); expect((await state(page)).gramInvestigation).toEqual(gram);
  111 |     if (target === 'micro-gram-stage-3') await expect(page.locator('#micro-gram-stage-1')).toHaveAttribute('aria-current', 'step');
  112 |     if (target === 'micro-gram-interpretation-heading') {
  113 |       await page.locator('#micro-gram-interpretation-heading').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'gram-next-step-phone.png') });
  114 |     }
  115 |     await harness.unmount(page);
  116 |   }
  117 | });
  118 | 
  119 | test('quiz shortcuts resume unanswered work, submission, and unchecked practice without changing the score', async ({ page }) => {
  120 |   await mount(page, { quizAnswers: [0, 'bad', 1], quizSubmitted: true, quizCorrect: 500 }); await phone(page, 320); await enter(page, 'quiz');
  121 |   await expect(page.locator('#micro-quiz-question-1')).toBeFocused(); expect((await state(page)).quizAnswers).toEqual([0, 'bad', 1]);
  122 |   await expect(page.locator('[data-quiz-original-score]')).toHaveCount(0); await harness.unmount(page);
  123 |   const correct = bank.map(q => q.answer); await mount(page, { quizAnswers: correct, quizSubmitted: false }); await enter(page, 'quiz');
  124 |   await expect(page.locator('#micro-quiz-submit')).toBeFocused(); expect((await state(page)).quizSubmitted).toBe(false); await harness.unmount(page);
  125 |   const original = bank.map((q, i) => [0, 7].includes(i) ? (q.answer + 1) % 4 : q.answer);
  126 |   const practice = { answers: correct, checked: bank.map((_, i) => i === 0) };
  127 |   await mount(page, { quizAnswers: original, quizSubmitted: true, quizCorrect: 13, quizPractice: practice, quizMode: 'review' }); await phone(page); await enter(page, 'quiz');
  128 |   await expect(page.locator('#micro-quiz-question-7')).toBeFocused(); await expect(page.locator('[data-quiz-original-score]')).toContainText('13/15');
  129 |   expect((await state(page)).quizAnswers).toEqual(original); expect((await state(page)).quizPractice).toEqual(practice);
  130 |   await page.locator('#micro-quiz-question-7').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'quiz-practice-destination-phone.png') });
  131 |   await reload(page); await expect(page.locator('#micro-quiz-heading')).toHaveAttribute('data-phase', 'practice');
  132 | });
  133 | 
```