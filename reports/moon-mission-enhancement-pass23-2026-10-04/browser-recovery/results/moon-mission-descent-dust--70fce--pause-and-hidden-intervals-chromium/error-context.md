# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-descent-dust.spec.ts >> fallback ballistic surface dust >> 320 px reduced-motion flight holds grains during pause and hidden intervals
- Location: tests\e2e\moon-mission-descent-dust.spec.ts:130:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 282

- Array []
+ Array [
+   Object {
+     "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.12/color-contrast?application=axeAPI",
+     "id": "color-contrast",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "colorParse": undefined,
+               "contrastRatio": 1.23,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#e2e8f0",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+               "shadowColor": undefined,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 1.23 (foreground color: #e2e8f0, background color: #ffffff, font size: 9.0pt (12px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<section data-descent-instruments=\"true\" aria-label=\"Flight instruments\" style=\"padding: 14px; background: rgb(8, 19, 34); color: rgb(226, 232, 240); border-top: 1px solid rgb(51, 65, 85);\">",
+                 "target": Array [
+                   "section[data-descent-instruments=\"true\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 1.23 (foreground color: #e2e8f0, background color: #ffffff, font size: 9.0pt (12px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<summary style=\"min-height: 44px; padding-top: 10px; cursor: pointer; color: rgb(226, 232, 240); font-weight: 700;\">How to read this flight model</summary>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "details[open=\"\"] > summary",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "colorParse": undefined,
+               "contrastRatio": 1.48,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#cbd5e1",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+               "shadowColor": undefined,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 1.48 (foreground color: #cbd5e1, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<section data-descent-instruments=\"true\" aria-label=\"Flight instruments\" style=\"padding: 14px; background: rgb(8, 19, 34); color: rgb(226, 232, 240); border-top: 1px solid rgb(51, 65, 85);\">",
+                 "target": Array [
+                   "section[data-descent-instruments=\"true\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 1.48 (foreground color: #cbd5e1, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p>Mass falls as propellant burns, so the same thrust produces more acceleration. Hover throttle balances lunar gravity at your current tilt. Delta-v is the ideal remaining change in velocity; holding altitude also spends fuel.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "details[open=\"\"] > p:nth-child(2)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "colorParse": undefined,
+               "contrastRatio": 1.48,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#cbd5e1",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+               "shadowColor": undefined,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 1.48 (foreground color: #cbd5e1, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<section data-descent-instruments=\"true\" aria-label=\"Flight instruments\" style=\"padding: 14px; background: rgb(8, 19, 34); color: rgb(226, 232, 240); border-top: 1px solid rgb(51, 65, 85);\">",
+                 "target": Array [
+                   "section[data-descent-instruments=\"true\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 1.48 (foreground color: #cbd5e1, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p>Braking height estimates a full-thrust stop at the current tilt, with an engine-response allowance. It assumes continued thrust and enough fuel, and does not guarantee a safe landing. Begin braking above that height.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "details[open=\"\"] > p:nth-child(3)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "colorParse": undefined,
+               "contrastRatio": 1.48,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#cbd5e1",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+               "shadowColor": undefined,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 1.48 (foreground color: #cbd5e1, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<section data-descent-instruments=\"true\" aria-label=\"Flight instruments\" style=\"padding: 14px; background: rgb(8, 19, 34); color: rgb(226, 232, 240); border-top: 1px solid rgb(51, 65, 85);\">",
+                 "target": Array [
+                   "section[data-descent-instruments=\"true\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 1.48 (foreground color: #cbd5e1, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p>The scene compresses altitude to keep the lander visible. Cyan marks the ground below the lander; amber shows five seconds of drift at the current speed. The terrain is illustrative and is not a landing hazard map.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "details[open=\"\"] > p:nth-child(4)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "colorParse": undefined,
+               "contrastRatio": 1.48,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#cbd5e1",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+               "shadowColor": undefined,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 1.48 (foreground color: #cbd5e1, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<section data-descent-instruments=\"true\" aria-label=\"Flight instruments\" style=\"padding: 14px; background: rgb(8, 19, 34); color: rgb(226, 232, 240); border-top: 1px solid rgb(51, 65, 85);\">",
+                 "target": Array [
+                   "section[data-descent-instruments=\"true\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 1.48 (foreground color: #cbd5e1, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p data-descent-dust-note=\"true\">Surface dust follows shallow ballistic arcs under lunar gravity and keeps moving after engine cutoff. Grain speeds and density are illustrative. Recorded frames omit airborne dust.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "p[data-descent-dust-note=\"true\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "colorParse": undefined,
+               "contrastRatio": 1.48,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#cbd5e1",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+               "shadowColor": undefined,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 1.48 (foreground color: #cbd5e1, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<section data-descent-instruments=\"true\" aria-label=\"Flight instruments\" style=\"padding: 14px; background: rgb(8, 19, 34); color: rgb(226, 232, 240); border-top: 1px solid rgb(51, 65, 85);\">",
+                 "target": Array [
+                   "section[data-descent-instruments=\"true\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 1.48 (foreground color: #cbd5e1, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p>Educational final-approach model: 46.7 kN maximum engine thrust, 311 s specific impulse, and an assumed 7,000 kg mass without remaining descent propellant. The throttle range and landing limits are simplified for practice.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "details[open=\"\"] > p:nth-child(6)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "colorParse": undefined,
+               "contrastRatio": 1.66,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#7dd3fc",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+               "shadowColor": undefined,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 1.66 (foreground color: #7dd3fc, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<section data-descent-instruments=\"true\" aria-label=\"Flight instruments\" style=\"padding: 14px; background: rgb(8, 19, 34); color: rgb(226, 232, 240); border-top: 1px solid rgb(51, 65, 85);\">",
+                 "target": Array [
+                   "section[data-descent-instruments=\"true\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 1.66 (foreground color: #7dd3fc, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<a href=\"https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"display: inline-block; padding: 10px 0px; color: rgb(125, 211, 252); text-decoration: underline;\">NASA ideal rocket equation</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.color",
+       "wcag2aa",
+       "wcag143",
+       "TTv5",
+       "TT13.c",
+       "EN-301-549",
+       "EN-9.1.4.3",
+       "ACT",
+       "RGAAv4",
+       "RGAA-3.2.1",
+     ],
+   },
+ ]
```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { resolve, join } from 'node:path';
  4   | import { GlHarness } from './helpers/stem_gl_harness';
  5   | 
  6   | const REPORT = resolve(process.env.MM_DESCENT_DUST_REPORT_DIR || 'reports/moon-mission-enhancement-pass23-2026-10-04/browser/dust');
  7   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100,
  8   |   height: 1000, layout: 'document', appStyles: true });
  9   | const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 5, descentStarted: true, animPaused: true,
  10  |   soundOff: true, difficulty: 'pilot', missionXP: 42, landingRewarded: true, lunarSamples: [], quizCorrect: 0,
  11  |   earnedBadges: { first_step: true, mission_complete: true }, ...extra } });
  12  | test.describe.configure({ timeout: 180000, retries: 0 });
  13  | test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
  14  | test.afterEach(async ({ page }) => harness.destroy(page));
  15  | async function mount(page: Page, data = seed(), probe = false) {
  16  |   await page.goto(harness.url + '/__harness'); await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  17  |   await page.evaluate(({ data, probe }) => {
  18  |     Math.random = () => .999; document.getElementById('wrap')!.style.width = '100%';
  19  |     if (probe) {
  20  |       const T = (window as any).THREE, original = T.WebGLRenderer.prototype.render;
  21  |       T.WebGLRenderer.prototype.render = function(scene: any, camera: any) {
  22  |         const dust = scene.getObjectByName('moon-descent-dust');
  23  |         if (dust) (window as any).__dustGL = { renderer: this, scene, camera, dust };
  24  |         return original.apply(this, arguments);
  25  |       };
  26  |     }
  27  |     (window as any).__mount(data);
  28  |   }, { data, probe });
  29  |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  30  | }
  31  | async function state(page: Page) { return page.locator('[data-descent-canvas]').evaluate((c: any) => c._descentState()); }
  32  | async function dust(page: Page) { return page.locator('[data-descent-canvas]').evaluate((c: any) => c._descentDustState()); }
  33  | async function receipts(page: Page) { return page.evaluate(() => {
  34  |   const d = (window as any).__toolData.moonMission;
  35  |   return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult, landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
  36  | }); }
  37  | async function capture(page: Page, info: TestInfo, name: string) {
  38  |   await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '.png');
  39  |   const clip = await page.locator('[data-descent-canvas]').evaluate((c: HTMLElement) => {
  40  |     const b = c.parentElement!.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height };
  41  |   });
  42  |   await page.screenshot({ path, fullPage: true, clip, animations: 'disabled' }); await info.attach(name, { path, contentType: 'image/png' });
  43  | }
  44  | async function pilotToDust(page: Page) {
  45  |   // Operate the real lever and Pause button; never replace state or flight time.
  46  |   await page.evaluate(() => {
  47  |     const cv = document.querySelector('[data-descent-canvas]') as any, lever = document.querySelector('[data-descent-throttle]') as HTMLInputElement;
  48  |     const P = (window as any).MoonMissionPure; (window as any).__dustPilot = { phase: 'coast', done: false, contact: false };
  49  |     function pilot() {
  50  |       const control = (window as any).__dustPilot, s = cv._descentState(); if (control.done) return;
  51  |       if (s.contact) { control.done = true; control.contact = true; return; }
  52  |       if (control.phase === 'coast' && s.alt < 115) control.phase = 'brake';
  53  |       if (control.phase === 'brake' && s.vVel > -7) control.phase = 'hold';
  54  |       const setting = control.phase === 'coast' ? 0 : control.phase === 'brake' ? 100 : Math.round(P.descentGuidance(s).hoverThrottle * 100);
  55  |       if (lever.value !== String(setting)) { lever.value = String(setting); lever.dispatchEvent(new Event('input', { bubbles: true })); }
  56  |       if (control.phase === 'hold') cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
  57  |       if (s.alt < 18 && cv._descentDustState().grains.length > 8) {
  58  |         (document.querySelector('[data-descent-pause]') as HTMLButtonElement).click(); control.done = true; return;
  59  |       }
  60  |       requestAnimationFrame(pilot);
  61  |     }
  62  |     requestAnimationFrame(pilot);
  63  |   });
  64  |   await page.locator('[data-descent-pause]').click();
  65  |   await expect.poll(() => page.evaluate(() => (window as any).__dustPilot.done), { timeout: 100000 }).toBe(true);
  66  |   expect(await page.evaluate(() => (window as any).__dustPilot.contact)).toBe(false);
  67  |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  68  |   await expect.poll(async () => (await dust(page)).time).toBe((await state(page)).elapsed);
  69  |   expect((await dust(page)).grains.length).toBeGreaterThan(8);
  70  | }
  71  | async function modelNotes(page: Page, name: string) {
  72  |   const note = page.locator('[data-descent-dust-note]'); await note.locator('..').locator('summary').click(); await expect(note).toBeVisible();
  73  |   await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  74  |   const violations = await note.evaluate(async n => (await (window as any).axe.run(n.parentElement,
  75  |     { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  76  |   await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, name + '-axe.json'), JSON.stringify({ violations }, null, 2));
> 77  |   expect(violations).toEqual([]);
      |                      ^ Error: expect(received).toEqual(expected) // deep equality
  78  | }
  79  | 
  80  | test.describe('fallback ballistic surface dust', () => {
  81  |   test.beforeEach(async ({ page }) => page.addInitScript(() => {
  82  |     const original = HTMLCanvasElement.prototype.getContext;
  83  |     (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
  84  |       if (/webgl/i.test(type)) return null; return (original as any).apply(this, [type, ...args]);
  85  |     };
  86  |   }));
  87  |   test('a real burn emits world-fixed grains that coast after cutoff and settle after contact', async ({ page }, info) => {
  88  |     const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await mount(page); const original = await receipts(page);
  89  |     await pilotToDust(page); const before = await dust(page), held = await state(page); expect(held.tilt).toBeGreaterThan(.2);
  90  |     await capture(page, info, 'fallback-burning-dust'); await page.locator('[data-descent-throttle]').fill('0');
  91  |     await page.waitForTimeout(300); expect(await state(page)).toEqual(held); expect(await dust(page)).toEqual(before);
  92  |     await page.locator('[data-descent-pause]').click(); await expect.poll(async () => (await state(page)).elapsed).toBeGreaterThan(held.elapsed + .45);
  93  |     await page.locator('[data-descent-pause]').click(); const cutoff = await dust(page), coast = await state(page);
  94  |     expect(coast.thrust).toBeLessThan(.02); expect(cutoff.grains.length).toBeGreaterThan(0);
  95  |     const shared = before.grains.filter(p => cutoff.grains.some(q => q.id === p.id)); expect(shared.length).toBeGreaterThan(0);
  96  |     for (const p of shared) {
  97  |       const q = cutoff.grains.find(q => q.id === p.id), dt = q.age - p.age;
  98  |       expect(q.launchX).toBe(p.launchX); expect(q.launchZ).toBe(p.launchZ);
  99  |       expect(q.height).toBeCloseTo(p.height + p.verticalSpeed * dt - .5 * 1.624 * dt * dt, 9);
  100 |       expect(q.verticalSpeed).toBeCloseTo(p.verticalSpeed - 1.624 * dt, 9);
  101 |       if (p.age > .035) expect((q.x - p.x) / dt).toBeCloseTo((p.x - p.tailX) / .035, 8);
  102 |     }
  103 |     await capture(page, info, 'fallback-after-engine-cutoff'); await page.waitForTimeout(250); expect(await dust(page)).toEqual(cutoff);
  104 |     await page.locator('[data-descent-pause]').click(); await expect.poll(async () => (await state(page)).contact, { timeout: 15000 }).toBe(true);
  105 |     const impact = await state(page), landed = await receipts(page); expect(landed.landingAttempts).toHaveLength(1); expect(landed.missionXP).toBe(original.missionXP);
  106 |     await expect.poll(async () => (await dust(page)).grains.length, { timeout: 8000 }).toBe(0);
  107 |     expect(await state(page)).toEqual(impact); expect(await receipts(page)).toEqual(landed);
  108 |     await capture(page, info, 'fallback-settled-contact'); await modelNotes(page, 'desktop'); expect(errors).toEqual([]);
  109 |     await writeFile(join(REPORT, 'cutoff-evidence.json'), JSON.stringify({ held, before, coast, cutoff, impact, landed }, null, 2));
  110 |   });
  111 |   test('recorded firing and touchdown omit unrecorded dust while preserving the landing receipt', async ({ page }, info) => {
  112 |     await mount(page); const result = await page.evaluate(() => {
  113 |       const P = (window as any).MoonMissionPure, s: any = { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 };
  114 |       const recording = P.newDescentRecording(); P.recordDescent(recording, s, false);
  115 |       for (let i = 0; i < 3000 && !s.contact; i++) { P.descentStep(s, { throttle: s.alt < 30 ? .5 : 0 }, 1 / 60); P.recordDescent(recording, s, !!s.contact); }
  116 |       if (!s.contact) throw Error('Fixture did not reach physical contact');
  117 |       return { crashed: true, score: 0, grade: '—', vVel: Math.abs(s.vVel), hVel: Math.abs(s.hVel), fuel: Math.round(s.fuel), fuelUnit: 's', recording: P.cleanDescentRecording(recording) };
  118 |     });
  119 |     const index = result.recording.samples.findIndex(p => p.alt > 0 && p.alt < 25 && p.throttle > .1); expect(index).toBeGreaterThan(0);
  120 |     await mount(page, seed({ landingResult: result, landingAttempts: [result], landingReviewIndex: index })); const saved = await receipts(page);
  121 |     await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-dust-source', 'omitted-recording');
  122 |     expect((await dust(page)).grains).toEqual([]); await capture(page, info, 'recorded-dust-omitted');
  123 |     await page.locator('[data-landing-scrub]').fill('0'); expect((await dust(page)).grains).toEqual([]);
  124 |     await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
  125 |     await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-dust-source', 'live');
  126 |     expect((await dust(page)).grains).toEqual([]); expect(await receipts(page)).toEqual(saved);
  127 |     await mount(page, seed({ landingResult: { crashed: false, score: 84, grade: 'B', vVel: 1, hVel: 2, fuel: 70 } }));
  128 |     expect((await dust(page)).grains).toEqual([]); await capture(page, info, 'legacy-no-invented-dust');
  129 |   });
  130 |   test('320 px reduced-motion flight holds grains during pause and hidden intervals', async ({ page }, info) => {
  131 |     await page.setViewportSize({ width: 320, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page);
  132 |     await pilotToDust(page); const held = await state(page), picture = await dust(page); expect(picture.capacity).toBe(90);
  133 |     expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  134 |     await capture(page, info, 'phone-ballistic-dust');
  135 |     await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  136 |     await page.waitForTimeout(350); expect(await state(page)).toEqual(held); expect(await dust(page)).toEqual(picture);
  137 |     await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  138 |     await page.waitForTimeout(250); expect(await state(page)).toEqual(held); expect(await dust(page)).toEqual(picture);
  139 |     await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await capture(page, info, 'phone-dust-forced-colors');
  140 |     await modelNotes(page, 'phone-forced'); expect(await state(page)).toEqual(held);
  141 |   });
  142 | });
  143 | 
  144 | test('real WebGL consumes the same ballistic samples, draws dust pixels and retains grains on context loss', async ({ page }, info) => {
  145 |   const errors: string[] = [], shaderErrors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  146 |   page.on('console', m => { if (m.type() === 'error' && /shader|GL_INVALID|VALIDATE_STATUS/i.test(m.text())) shaderErrors.push(m.text()); });
  147 |   await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 }));
  148 |   await mount(page, seed(), true); await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  149 |   await pilotToDust(page); const held = await state(page), picture = await dust(page);
  150 |   const projected = await page.evaluate(() => {
  151 |     const w = (window as any).__dustGL, g = w.dust.geometry, n = g.drawRange.count;
  152 |     return { count: n, positions: Array.from(g.attributes.position.array.slice(0, n * 3)), opacity: Array.from(g.attributes.opacity.array.slice(0, n)) };
  153 |   });
  154 |   expect(projected.count).toBe(picture.grains.length * 2);
  155 |   picture.grains.forEach((p, i) => {
  156 |     const head = (i * 2 + 1) * 3, tail = i * 2 * 3;
  157 |     expect(projected.positions[head]).toBeCloseTo((p.x - held.x) * .6, 4); expect(projected.positions[head + 2]).toBeCloseTo(p.z * .6, 4);
  158 |     expect(projected.positions[tail]).toBeCloseTo((p.tailX - held.x) * .6, 4);
  159 |     expect(projected.positions[head + 1] - projected.positions[tail + 1]).toBeCloseTo((p.height - p.tailHeight) * .6, 4);
  160 |     expect(projected.opacity[i * 2]).toBeCloseTo(p.opacity, 6); expect(projected.opacity[i * 2 + 1]).toBeCloseTo(p.opacity, 6);
  161 |   });
  162 |   await capture(page, info, 'webgl-ballistic-dust');
  163 |   const pixels = await page.evaluate(() => {
  164 |     const { renderer, scene, camera, dust } = (window as any).__dustGL, gl = renderer.getContext();
  165 |     const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
  166 |     function read() { const a = new Uint8Array(width * height * 4); renderer.render(scene, camera); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, a); return a; }
  167 |     const before = read(); dust.visible = false; const after = read(); dust.visible = true; renderer.render(scene, camera);
  168 |     let changed = 0, delta = 0; for (let i = 0; i < before.length; i += 4) {
  169 |       const d = Math.abs(before[i] - after[i]) + Math.abs(before[i + 1] - after[i + 1]) + Math.abs(before[i + 2] - after[i + 2]);
  170 |       if (d) { changed++; delta += d; }
  171 |     }
  172 |     return { width, height, changed, delta };
  173 |   });
  174 |   expect(pixels.changed).toBeGreaterThan(5); expect(pixels.delta).toBeGreaterThan(0);
  175 |   await page.locator('select[data-descent-camera]').selectOption('landing');
  176 |   await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', 'landing');
  177 |   expect(await dust(page)).toEqual(picture); expect(await state(page)).toEqual(held); await capture(page, info, 'webgl-landing-view-dust');
```