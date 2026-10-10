# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 114-solar-system-seasons-observer.spec.ts >> malformed restores use finite fallback geometry and hide stale interpretations without render-time writes
- Location: tests\e2e\114-solar-system-seasons-observer.spec.ts:256:5

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.waitForFunction: Test timeout of 180000ms exceeded.
```

# Test source

```ts
  1   | import { test, expect, type Locator, type Page } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | 
  4   | const harness = new GlHarness({
  5   |   toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem',
  6   |   width: 1060, height: 1600, appStyles: true, layout: 'document',
  7   | });
  8   | const names = Object.fromEntries(['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].map((name) => [`stem.solar_sys.${name.toLowerCase()}`, name]));
  9   | const retainedKeys = ['orr_time', 'orr_paused', 'orr_sel', 'orr_compare', 'orr_follow', 'orr_snapshots', 'missionLog',
  10  |   'keplerInquiry', 'transferDebriefs', 'orr_wsa', 'orr_wse', 'orr_wsphase', 'orr_cha', 'orr_chh', 'orr_chc',
  11  |   'orr_chf', 'orr_chpractice', 'orr_chsolution', 'orr_chlast', 'compare1', 'compare2', 'compareReasoningDrafts',
  12  |   'signalTarget', 'signalAngle', 'signalNotebooks', 'signalPrediction', 'signalEvidenceSaved', 'signalLastPing',
  13  |   'signalPulseNonce', 'moonPhaseAngle', 'moonNodeOffset', 'moonPrediction', 'moonEvidenceSaved', 'moonSouthernView',
  14  |   'gravityPrediction', 'gravityEvidenceSaved', 'quiz'];
  15  | 
  16  | test.describe.configure({ mode: 'default', timeout: 180_000, retries: 0 });
  17  | test.beforeAll(async () => { await harness.start(); });
  18  | test.afterAll(async () => { await harness.stop(); });
  19  | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  20  | 
  21  | async function mountSeasons(page: Page, width = 1060, dark = true, patch: Record<string, unknown> = {}) {
  22  |   await page.setViewportSize({ width, height: 1600 });
  23  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  24  |   await page.goto(`${harness.url}/__harness`);
> 25  |   await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.solarSystem));
      |              ^ Error: page.waitForFunction: Test timeout of 180000ms exceeded.
  26  |   await page.locator('#wrap').evaluate((wrap, nextWidth) => { (wrap as HTMLElement).style.width = `${nextWidth}px`; }, width);
  27  |   await page.evaluate(({ data, translatedNames }) => {
  28  |     (window as any).__mount({ solarSystem: data });
  29  |     const ctx = (window as any).__ctx;
  30  |     ctx.t = (key: string, fallback?: string) => translatedNames[key] || fallback || key;
  31  |     ctx.isDark = data.isDark;
  32  |     ctx.awardXP = (...args: unknown[]) => { ((window as any).__seasonsXP ||= []).push(args); };
  33  |     document.documentElement.classList.toggle('dark', data.isDark);
  34  |     (window as any).__rerender();
  35  |   }, {
  36  |     translatedNames: names,
  37  |     data: {
  38  |       tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false, showSeasonsLab: true,
  39  |       selectedPlanet: 'Earth', viewTab: 'overview', paused: true, sidebar: true, isDark: dark,
  40  |       seasonsWorld: 'Earth', seasonsPhase: 25, seasonsLatitude: 45, seasonsPrediction: null, seasonsEvidenceSaved: false,
  41  |       seasonsGuideActive: false, seasonsGuide: {}, seasonsLatitudeExplanation: '', seasonsLatitudeSaved: null,
  42  |       journalEntries: [{ title: 'Earlier explanation', observation: 'Keep this record.', timestamp: 100 }],
  43  |       orr_time: 0.37, orr_paused: true, orr_sel: 'mercury', orr_compare: 'venus', orr_follow: 'mercury',
  44  |       orr_snapshots: { mercury: { a: { bodyId: 'mercury', time: 0, distance: 0.31, speed: 59 } } },
  45  |       missionLog: [{ title: 'Retained observation', detail: 'Keep my orbital evidence.' }],
  46  |       keplerInquiry: { a: 2, e: 0.2, mass: 1, hypothesis: 'Keep my hypothesis.', explanation: 'Keep my explanation.', log: [] },
  47  |       transferDebriefs: { 'earth-mars': { explanation: 'Keep my transfer explanation.' } },
  48  |       orr_wsa: 2, orr_wse: 0.3, orr_wsphase: 0.25, orr_cha: { 0: '11.9' }, orr_chh: { 0: 1 }, orr_chc: { 0: true },
  49  |       orr_chf: { 0: { kind: 'correct', text: 'Keep this practice feedback.' } }, orr_chpractice: { 0: true },
  50  |       orr_chsolution: { 0: true }, orr_chlast: { 0: { answer: '11.9', correct: true } },
  51  |       compare1: 'Earth', compare2: 'Jupiter', compareReasoningDrafts: { 'Earth:Jupiter': 'Keep this comparison.' },
  52  |       signalTarget: 'Mars', signalAngle: 90, signalNotebooks: { Mars: { explanation: 'Keep signal reasoning.', observations: [] } },
  53  |       signalPrediction: 'increase', signalEvidenceSaved: true, signalLastPing: { target: 'Mars', angle: 90, oneWaySeconds: 500 }, signalPulseNonce: 7,
  54  |       moonPhaseAngle: 90.25, moonNodeOffset: 30.75, moonPrediction: { phase: 90.25, node: 30.75, choice: 'none' },
  55  |       moonEvidenceSaved: true, moonSouthernView: true, gravityPrediction: 'same', gravityEvidenceSaved: true,
  56  |       quiz: { q: 'Which planet is our home?', a: 'Earth', opts: ['Mercury', 'Earth', 'Mars', 'Jupiter'],
  57  |         answered: true, chosen: 'Earth', correct: true, tip: 'Earth is our home planet.', score: 3, streak: 2, bestStreak: 4 },
  58  |       ...patch,
  59  |     },
  60  |   });
  61  |   await expect(page.locator('#wrap')).toHaveJSProperty('clientWidth', width);
  62  |   const lab = page.locator('#solar-seasons-lab');
  63  |   await expect(lab).toBeVisible();
  64  |   return lab;
  65  | }
  66  | 
  67  | async function state(page: Page) { return page.evaluate(() => (window as any).__toolData.solarSystem); }
  68  | async function protectedState(page: Page) {
  69  |   return page.evaluate((keys) => {
  70  |     const data = (window as any).__toolData.solarSystem;
  71  |     return JSON.parse(JSON.stringify(Object.fromEntries(keys.map((key) => [key, data[key]]))));
  72  |   }, retainedKeys);
  73  | }
  74  | async function noErrors(page: Page) { expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]); }
  75  | async function noXP(page: Page) { expect(await page.evaluate(() => ((window as any).__seasonsXP || []).length)).toBe(0); }
  76  | function metrics(latitude: number, phase: number, tilt = 23.44) {
  77  |   const radians = Math.PI / 180;
  78  |   const declination = Math.asin(Math.sin(tilt * radians) * Math.sin(phase * Math.PI / 50));
  79  |   const term = -Math.tan(latitude * radians) * Math.tan(declination);
  80  |   const halfDay = term <= -1 ? Math.PI : term >= 1 ? 0 : Math.acos(term);
  81  |   return { hours: 24 * halfDay / Math.PI, noon: 90 - Math.abs(latitude - declination / radians) };
  82  | }
  83  | function guideRecord(phase: number) {
  84  |   const north = metrics(45, phase), south = metrics(-45, phase);
  85  |   return { world: 'Earth', phase, northHours: north.hours, southHours: south.hours, northNoon: north.noon, southNoon: south.noon };
  86  | }
  87  | function restoredGuide(explanation = 'My own reasoning stays here.') {
  88  |   return { prediction: 'opposite', records: { 25: guideRecord(25), 75: guideRecord(75) }, claim: 'tilt', explanation, step: 3 };
  89  | }
  90  | async function nativeCalls(locator: Locator, key: 'onClick' | 'onChange', args: unknown[]) {
  91  |   await locator.evaluate((element: any, data) => {
  92  |     // React's host Fiber can point at the prior alternate after a commit.
  93  |     // The event props cache is the callback source used by live DOM events.
  94  |     const props = Object.keys(element).find((name) => name.startsWith('__reactProps$'));
  95  |     if (!props) throw new Error('Current React DOM event props missing');
  96  |     const callback = element[props][data.key];
  97  |     if (typeof callback !== 'function') throw new Error(`Native ${data.key} handler missing`);
  98  |     for (const argument of data.args) callback(argument);
  99  |   }, { key, args });
  100 | }
  101 | async function captureSave(locator: Locator) {
  102 |   await expect(locator).toBeEnabled();
  103 |   await locator.evaluate((element: any) => {
  104 |     const props = Object.keys(element).find((name) => name.startsWith('__reactProps$'));
  105 |     if (!props) throw new Error('Current React DOM event props missing');
  106 |     const callback = element[props].onClick;
  107 |     if (typeof callback !== 'function') throw new Error('Native save handler missing');
  108 |     (window as any).__oldSeasonSave = callback;
  109 |   });
  110 | }
  111 | async function savedTwice(locator: Locator) {
  112 |   await expect(locator).toBeEnabled();
  113 |   await nativeCalls(locator, 'onClick', [{}, {}]);
  114 |   await expect(locator).toBeDisabled();
  115 | }
  116 | function interpretationSave(lab: Locator) { return lab.getByRole('button', { name: /(?:Save interpretation \+ evidence to journal|Evidence saved to journal)/ }); }
  117 | function latitudeSave(lab: Locator) { return lab.getByRole('button', { name: /(?:Save latitude investigation to journal|Latitude evidence saved)/ }); }
  118 | function guidedSave(lab: Locator) { return lab.getByRole('button', { name: /(?:Save guided explanation to journal|Guided explanation saved)/ }); }
  119 | 
  120 | async function expectLatitude(lab: Locator, latitude: number, phase: number) {
  121 |   const explorer = lab.locator('[data-season-latitude-explorer]');
  122 |   for (const hemisphere of ['north', 'south'] as const) {
  123 |     const expected = metrics(hemisphere === 'north' ? latitude : -latitude, phase);
  124 |     const reading = explorer.locator(`[data-latitude-reading="${hemisphere}"]`);
  125 |     expect(Number(await reading.getAttribute('data-daylight-hours'))).toBeCloseTo(expected.hours, 10);
```