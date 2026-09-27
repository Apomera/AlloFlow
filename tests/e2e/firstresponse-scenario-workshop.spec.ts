import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse', width: 1100, height: 850, layout: 'document', appStyles: true });
const report = 'reports/firstresponse-scenario-workshop';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
test.describe.configure({ mode: 'serial', retries: 0 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width = 1200, extra = {}) {
  await page.setViewportSize({ width, height: 940 });
  await harness.mount(page, { firstResponse: { view: 'scenarios', consentAccepted: true, ...extra } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1100px;margin:0 auto}body{margin:0} .fr-sim-shell{width:100%}' });
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run('.fr-sim-shell', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }));
  });
  expect(violations).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  expect(overflow).toBe(false);
}
async function choose(page: Page, name: RegExp) {
  await page.getByRole('group', { name: 'Choices', exact: true }).getByRole('button', { name }).click();
}
async function next(page: Page) { await page.getByRole('button', { name: /Next observation|See your debrief/ }).click(); }
const changingAnswers = [/Call 911 on speaker/, /Tell the dispatcher, roll/, /Pause compressions/, /Immediately resume CPR|Make sure everyone is clear/];

test('keyboard correction, debrief, and both AED outcomes work end to end', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page);
  await page.screenshot({ path: report + '/catalog-desktop.png', fullPage: true });
  await audit(page);
  const start = page.getByRole('button', { name: 'Start scenario: When breathing changes', exact: true });
  await start.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-fr-sim-heading]')).toBeFocused();
  const wrong = page.getByRole('button', { name: /Leave them alone to rest/ });
  await wrong.focus(); await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: /Next observation/ })).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: /Choose a safer action/ })).toBeVisible();
  await page.screenshot({ path: report + '/decision-feedback-desktop.png', fullPage: true });
  await audit(page);
  for (const answer of changingAnswers) { await choose(page, answer); await next(page); }
  await expect(page.getByRole('heading', { name: 'Scenario complete: When breathing changes' })).toBeFocused();
  await expect(page.getByText('Your first choice: Leave them alone to rest.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__toolData.firstResponse.badges?.scenario_clean_changing)).toBeUndefined();
  await page.screenshot({ path: report + '/debrief-desktop.png', fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Practice the other AED outcome' }).click();
  for (const answer of changingAnswers.slice(0, 3)) { await choose(page, answer); await next(page); }
  await expect(page.getByRole('heading', { name: /The AED says “Shock advised.”/ })).toBeVisible();
  await choose(page, /Make sure everyone is clear/); await next(page);
  expect(await page.evaluate(() => (window as any).__toolData.firstResponse.badges?.scenario_clean_changing)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('phone layouts, expanded coaching, text spacing, and forced colors remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, 320);
  await audit(page);
  await page.screenshot({ path: report + '/catalog-phone.png', fullPage: true });
  await page.getByRole('button', { name: 'Start scenario: When breathing changes', exact: true }).click();
  await page.getByRole('button', { name: 'Show a coaching cue' }).click();
  await expect(page.locator('#fr-sim-coaching')).toBeVisible();
  await audit(page);
  await page.screenshot({ path: report + '/decision-phone.png', fullPage: true });
  await page.addStyleTag({ content: '.fr-sim-shell *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.fr-sim-shell p{margin-bottom:2em!important}' });
  await audit(page);
  for (const answer of changingAnswers) { await choose(page, answer); await next(page); }
  await expect(page.getByText('A coaching cue supported this decision.', { exact: true })).toBeVisible();
  await audit(page);
  await page.screenshot({ path: report + '/debrief-phone-spacing.png', fullPage: true });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.getByRole('button', { name: 'Practice the other AED outcome' }).click();
  await choose(page, /Call 911 on speaker/);
  await expect(page.getByRole('button', { name: 'Next observation →', exact: true })).toBeVisible();
  await page.screenshot({ path: report + '/forced-colors-phone.png', fullPage: true });
});

test('all existing scenarios complete with decision trails and safe opt-out', async ({ page }) => {
  await mount(page);
  const cases = [
    { title: /Start scenario: Cafeteria/, answers: [/Shout, tap their shoulder/, /Yell "YOU/, /100–120 compressions/, /Turn it on/], id: 'cafeteria' },
    { title: /Start scenario: Hallway/, answers: [/Ask: "Are you choking/, /5 back blows/, /Lower them safely/], id: 'hallway' },
    { title: /Start scenario: Sports field/, answers: [/Press both hands/, /Place the tourniquet 2–3/, /Stay with them/], id: 'field' },
    { title: /Start scenario: Classroom/, answers: [/Move sharp objects/, /Tell them firmly/, /Roll them gently/], id: 'classroom' },
    { title: /Start scenario: Bus stop/, answers: [/Low blood sugar/, /Help them take 15 grams/, /Call 911. Recovery/], id: 'busstop' },
    { title: /Start scenario: Mental health/, answers: [/Text back right now/, /Stay connected, ask where/, /Say:.*I hear/, /Stay on the phone/], id: 'mh' }
  ];
  for (const c of cases) {
    await page.getByRole('button', { name: c.title }).click();
    if (c.id === 'mh') {
      await expect(page.getByRole('heading', { name: 'Before this scenario' })).toBeFocused();
      await page.getByRole('button', { name: 'Choose another scenario', exact: true }).click();
      await page.getByRole('button', { name: c.title }).click();
      await page.getByRole('button', { name: 'I understand — start', exact: true }).click();
    }
    for (const answer of c.answers) { await choose(page, answer); await next(page); }
    await expect(page.getByRole('heading', { name: /^Scenario complete:/ })).toBeVisible();
    const data = await page.evaluate(() => (window as any).__toolData.firstResponse);
    expect(data.scenarioLog).toHaveLength(c.answers.length);
    expect(data.badges['scenario_clean_' + c.id]).toBeTruthy();
    await page.getByRole('button', { name: 'Choose another scenario', exact: true }).click();
  }
});
