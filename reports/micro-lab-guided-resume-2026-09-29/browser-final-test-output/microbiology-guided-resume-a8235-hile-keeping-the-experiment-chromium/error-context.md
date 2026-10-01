# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-guided-resume.spec.ts >> Home and the growth editor move through missing explanations while keeping the experiment
- Location: tests\e2e\microbiology-guided-resume.spec.ts:81:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  7
+ Received  + 33

  Object {
-   "conditions": Object {
-     "oxygen": 25,
-     "tempC": 18,
-   },
    "control": Object {
+     "oxygen": 50,
+     "pH": 7,
+     "profile": "ecoli",
      "tempC": 30,
    },
+   "explanation": "",
    "hypothesis": "My next comparison",
    "nextId": 10,
    "prediction": "lower",
    "selectedId": 4,
+   "sweep": null,
+   "sweepVariable": "tempC",
    "trials": Array [
      Object {
        "conditions": Object {
+         "oxygen": 50,
          "pH": 5,
+         "profile": "ecoli",
+         "tempC": 37,
        },
-       "control": Object {},
+       "control": Object {
+         "oxygen": 50,
+         "pH": 7,
+         "profile": "ecoli",
+         "tempC": 37,
+       },
        "explanation": " ",
        "hypothesis": "Before seven",
        "id": 7,
        "prediction": "lower",
      },
      Object {
        "conditions": Object {
+         "oxygen": 50,
+         "pH": 7,
+         "profile": "ecoli",
          "tempC": 22,
        },
+       "control": null,
        "explanation": "",
        "hypothesis": "Without a saved control",
        "id": 4,
        "prediction": "higher",
      },
      Object {
-       "conditions": Object {},
-       "control": Object {},
+       "conditions": Object {
+         "oxygen": 50,
+         "pH": 7,
+         "profile": "ecoli",
+         "tempC": 37,
+       },
+       "control": Object {
+         "oxygen": 50,
+         "pH": 7,
+         "profile": "ecoli",
+         "tempC": 37,
+       },
        "explanation": "Already explained.",
+       "hypothesis": "",
        "id": 9,
+       "prediction": "",
      },
    ],
  }
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
  12  | let errors: string[];
  13  | test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', e => errors.push(e.message)); });
  14  | test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
  15  | const source = readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
  16  | const bankStart = source.indexOf('var QUIZ_QUESTIONS = [');
  17  | const bank = new Function(source.slice(bankStart, source.indexOf('// INTERACTIVE WIDGETS', bankStart)) + '\nreturn QUIZ_QUESTIONS;')();
  18  | const state = (page: any) => page.evaluate(() => (window as any).__toolData.microbiology);
  19  | async function mount(page: any, seed = {}) {
  20  |   await page.setViewportSize({ width: 1280, height: 960 });
  21  |   await harness.mount(page, { microbiology: { tab: 'home', ...seed } }, undefined, { expectCanvas: false });
  22  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  23  | }
  24  | async function enter(page: any, activity: string) { await page.locator(`[data-work-next="${activity}"]`).focus(); await page.keyboard.press('Enter'); }
  25  | async function phone(page: any, width = 390) {
  26  |   await page.setViewportSize({ width, height: 844 });
  27  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  28  | }
  29  | async function reload(page: any) {
  30  |   const saved = await state(page); await harness.unmount(page);
  31  |   await page.evaluate(data => (window as any).__mount({ microbiology: data }), saved); return saved;
  32  | }
  33  | const claims = { pond: 'protist', budding: 'yeast', wall: 'bacterium', salt: 'archaeon', particle: 'phage', unresolved: 'unresolved' };
  34  | const report = (claim: string) => ({ claim, evidence: ['structure', 'behavior'], reasoning: 'The supplied observations support this classification; the species is unresolved.', limitation: 'bounded' });
  35  | 
  36  | test('Home finds Mystery revisions, opens working notes, and cycles without replacing reports', async ({ page }) => {
  37  |   const cases = Object.fromEntries(Object.entries(claims).map(([id, claim]) => {
  38  |     const saved = report(claim); return [id, { ...saved, revealed: ['context', 'structure', 'behavior'], collapsed: ['structure'], checked: false, reportView: 'recorded', record: saved,
  39  |       previousRecord: { ...saved, reasoning: 'An earlier recorded explanation.' }, reasoning: ['pond', 'budding'].includes(id) ? `Working revision for ${id}.` : saved.reasoning }];
  40  |   }));
  41  |   const seed = { mysteryLab: { active: 'unresolved', cases }, growthInvestigation: { selectedId: 2, trials: [{ id: 1, conditions: {}, control: {}, explanation: '' }, { id: 2, conditions: {}, explanation: 'Complete.' }] } };
  42  |   await mount(page, seed); await expect(page.locator('[data-work-next="mystery"]')).toContainText('Review working revision · A:');
  43  |   await page.screenshot({ path: path.join(out, 'guided-home-desktop.png') }); await phone(page, 320);
  44  |   await page.locator('[data-work-next="mystery"]').scrollIntoViewIfNeeded();
  45  |   await page.screenshot({ path: path.join(out, 'guided-home-phone.png') }); await enter(page, 'mystery');
  46  |   await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  47  |   await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-case', 'pond');
  48  |   await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-report-view', 'working');
  49  |   await expect(page.locator('#micro-mystery-reasoning')).toHaveValue('Working revision for pond.');
  50  |   await page.locator('[data-mystery-next-revision="budding"]').focus(); await page.keyboard.press('Enter');
  51  |   await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  52  |   await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-case', 'budding');
  53  |   const after = await state(page);
  54  |   for (const id of Object.keys(claims)) {
  55  |     const actual = { ...after.mysteryLab.cases[id] }, expected = { ...cases[id] }; delete actual.reportView; delete expected.reportView;
  56  |     expect(actual).toEqual(expected);
  57  |   }
  58  |   await phone(page); await page.locator('[data-mystery-next-revision="pond"]').scrollIntoViewIfNeeded();
  59  |   await page.screenshot({ path: path.join(out, 'mystery-revision-navigation-phone.png') });
  60  |   await reload(page); await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-case', 'budding');
  61  |   await page.getByRole('tab', { name: 'Home', exact: true }).click();
  62  |   await expect(page.locator('[data-work-next="mystery"]')).toContainText('Review working revision · B:');
  63  |   expect(errors).toEqual([]);
  64  | });
  65  | 
  66  | test('Home opens an unchecked estimate in its notebook before the learner resumes the view', async ({ page }) => {
  67  |   const context = { version: 1, specimen: 'strep', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 1 };
  68  |   const seed = { scopeOrganism: 'ecoli', selectedScope: 'em', magnification: 10000, microscopeZoom: 4, microscopeFocus: 15, microscopeTargetFocus: 50,
  69  |     microscopeMeasurements: { strep: { draft: { value: '1.5', unit: 'um', context } } } };
  70  |   await mount(page, seed); await phone(page); await enter(page, 'microscope');
  71  |   const entry = page.locator('#micro-measurement-notebook-strep'); await expect(entry).toBeFocused();
  72  |   await expect(entry.locator('[data-measurement-draft="strep"]')).toBeVisible();
  73  |   for (const [key, value] of Object.entries(seed)) expect((await state(page))[key]).toEqual(value);
  74  |   await entry.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'unchecked-estimate-destination-phone.png') });
  75  |   await entry.getByRole('button', { name: 'Resume working view · Streptococcus', exact: true }).click();
  76  |   const resumed = await state(page); expect(resumed).toMatchObject({ scopeOrganism: 'strep', selectedScope: 'lightbright', magnification: 1000, microscopeZoom: 20 });
  77  |   expect(resumed.microscopeMeasurements).toEqual(seed.microscopeMeasurements);
  78  |   await reload(page); await page.getByRole('tab', { name: 'Home', exact: true }).click(); await enter(page, 'microscope'); await expect(entry).toBeFocused();
  79  | });
  80  | 
  81  | test('Home and the growth editor move through missing explanations while keeping the experiment', async ({ page }) => {
  82  |   const book = { selectedId: 9, nextId: 10, conditions: { tempC: 18, oxygen: 25 }, control: { tempC: 30 }, prediction: 'lower', hypothesis: 'My next comparison',
  83  |     trials: [{ id: 7, conditions: { pH: 5 }, control: {}, prediction: 'lower', hypothesis: 'Before seven', explanation: ' ' },
  84  |       { id: 4, conditions: { tempC: 22 }, prediction: 'higher', hypothesis: 'Without a saved control', explanation: '' },
  85  |       { id: 9, conditions: {}, control: {}, explanation: 'Already explained.' }] };
  86  |   await mount(page, { growthInvestigation: book, growthReviewHour: 6 }); await phone(page, 320); await enter(page, 'growth');
  87  |   await expect(page.locator('#gl-explanation')).toBeFocused(); await expect(page.locator('#gl-saved-result')).toHaveAttribute('data-micro-growth-result', '7');
  88  |   expect((await state(page)).growthInvestigation).toEqual({ ...book, selectedId: 7 }); expect((await state(page)).growthReviewHour).toBe(6);
  89  |   await page.locator('[data-next-unexplained-trial="4"]').focus(); await page.keyboard.press('Enter');
  90  |   await expect(page.locator('#gl-explanation')).toBeFocused(); await expect(page.locator('#gl-saved-result')).toHaveAttribute('data-micro-growth-recovered', '4');
> 91  |   expect((await state(page)).growthInvestigation).toEqual({ ...book, selectedId: 4 });
      |                                                   ^ Error: expect(received).toEqual(expected) // deep equality
  92  |   await page.locator('#gl-explanation').fill('The trial lacks a saved control, so its comparison is unavailable.');
  93  |   await page.locator('[data-next-unexplained-trial="7"]').scrollIntoViewIfNeeded();
  94  |   await page.screenshot({ path: path.join(out, 'growth-explanation-navigation-phone.png') });
  95  |   await reload(page); await page.getByRole('tab', { name: 'Home', exact: true }).click();
  96  |   await expect(page.locator('[data-work-next="growth"]')).toHaveText('Explain saved trial 7');
  97  |   const restored = await state(page); expect(restored.growthInvestigation.control).toEqual(book.control); expect(restored.growthReviewHour).toBe(6);
  98  | });
  99  | 
  100 | test('each Gram shortcut focuses the next action without advancing observations or replacing a report', async ({ page }) => {
  101 |   const record = { prediction: 'both', interpretation: 'wall', explanation: 'The models separate at decolorization.' };
  102 |   const states = [
  103 |     [{}, 'micro-gram-prediction-thick'],
  104 |     [{ prediction: 'thin', step: 1, maxStep: 2 }, 'micro-gram-stage-3'],
  105 |     [{ prediction: 'thick', step: 4, maxStep: 4, interpretation: 'shape' }, 'micro-gram-interpretation-heading'],
  106 |     [{ prediction: 'thick', step: 4, maxStep: 4, interpretation: 'wall', explanation: ' ' }, 'micro-gram-explanation'],
  107 |     [{ ...record, step: 3, maxStep: 4 }, 'micro-gram-save'],
  108 |     [{ ...record, step: 2, maxStep: 4, record }, 'micro-gram-record-heading']
  109 |   ] as const;
  110 |   for (const [gram, target] of states) {
  111 |     await mount(page, { gramInvestigation: gram, gramStep: 'step' in gram ? gram.step : 0 }); await phone(page); await enter(page, 'gram');
  112 |     await expect(page.locator(`#${target}`)).toBeFocused(); expect((await state(page)).gramInvestigation).toEqual(gram);
  113 |     if (target === 'micro-gram-stage-3') await expect(page.locator('#micro-gram-stage-1')).toHaveAttribute('aria-current', 'step');
  114 |     if (target === 'micro-gram-interpretation-heading') {
  115 |       await page.locator('#micro-gram-interpretation-heading').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'gram-next-step-phone.png') });
  116 |     }
  117 |     await harness.unmount(page);
  118 |   }
  119 | });
  120 | 
  121 | test('quiz shortcuts resume unanswered work, submission, and unchecked practice without changing the score', async ({ page }) => {
  122 |   await mount(page, { quizAnswers: [0, 'bad', 1], quizSubmitted: true, quizCorrect: 500 }); await phone(page, 320); await enter(page, 'quiz');
  123 |   await expect(page.locator('#micro-quiz-question-1')).toBeFocused(); expect((await state(page)).quizAnswers).toEqual([0, 'bad', 1]);
  124 |   await expect(page.locator('[data-quiz-original-score]')).toHaveCount(0); await harness.unmount(page);
  125 |   const correct = bank.map(q => q.answer); await mount(page, { quizAnswers: correct, quizSubmitted: false }); await enter(page, 'quiz');
  126 |   await expect(page.locator('#micro-quiz-submit')).toBeFocused(); expect((await state(page)).quizSubmitted).toBe(false); await harness.unmount(page);
  127 |   const original = bank.map((q, i) => [0, 7].includes(i) ? (q.answer + 1) % 4 : q.answer);
  128 |   const practice = { answers: correct, checked: bank.map((_, i) => i === 0) };
  129 |   await mount(page, { quizAnswers: original, quizSubmitted: true, quizCorrect: 13, quizPractice: practice, quizMode: 'review' }); await phone(page); await enter(page, 'quiz');
  130 |   await expect(page.locator('#micro-quiz-question-7')).toBeFocused(); await expect(page.locator('[data-quiz-original-score]')).toContainText('13/15');
  131 |   expect((await state(page)).quizAnswers).toEqual(original); expect((await state(page)).quizPractice).toEqual(practice);
  132 |   await page.locator('#micro-quiz-question-7').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'quiz-practice-destination-phone.png') });
  133 |   await reload(page); await expect(page.locator('#micro-quiz-heading')).toHaveAttribute('data-phase', 'practice');
  134 | });
  135 | 
```