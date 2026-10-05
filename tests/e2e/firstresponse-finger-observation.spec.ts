import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const report = process.env.FIRST_RESPONSE_FINGER_FOLDS_REPORT || 'reports/firstresponse-finger-folds';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const prompt = 'Follow one finger from its tip toward the wrist. Use the folds and nails to follow the same hand before and after the turn. Which side faces upward?';
const answer = 'The palm side faces upward in both poses. The folds help you follow its surface; the nails mark the back of the hand.';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
});

test.describe.configure({ mode: 'default', retries: 0, timeout: 300000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, extra: Record<string, unknown> = {}, expectCanvas = true) {
  await page.setViewportSize({ width: 320, height: 840 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { firstResponse: {
    consentAccepted: true, view: 'body3d', b3dTab: 'recovery',
    b3dAge: 'child', b3dChildHands: 'two', b3dRec: completed, b3dRecView: 4,
    b3dRecoveryGuides: true, b3dPlaced: 'correct', b3dPads: ['padUR', 'padLL'],
    b3dDepthLab: { age: 'child', depth: 5, lean: 1, rate: 115, motion: 'inspect', phase: 25,
      hands: true, anatomy: false, measure: false },
    b3dDepthReference: { age: 'child', depth: 5, lean: 0 },
    b3dDepthInquiry: { signature: 'saved-finger-observation', prediction: 'same', reflection: 'Follow the folds.' },
    learnerNote: 'Keep this saved note.', ...extra,
  }, retainedHostData: { lesson: 'hand landmarks', progress: 7 } }, undefined, { expectCanvas });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
  if (expectCanvas) await liveDrawing(page);
  else await expect.poll(async () => (await data(page)).firstResponse.b3dStatus).toBe('failed');
}

const data = (page: Page): Promise<any> => page.evaluate(() => JSON.parse(JSON.stringify((window as any).__ctx.toolData)));
const disclosure = (page: Page) => page.locator('.fr-palm-detail-comparison .fr-hand-landmark-observation');
const summary = (page: Page) => disclosure(page).locator('summary');
const observationAnswer = (page: Page) => disclosure(page).locator('p');

async function sameData(page: Page, saved: any, pose = saved.firstResponse.b3dRecView) {
  expect(await data(page)).toEqual({ ...saved, firstResponse: { ...saved.firstResponse, b3dRecView: pose } });
}

async function openState(page: Page, open: boolean) {
  await expect.poll(async () => disclosure(page).evaluate(element => (element as HTMLDetailsElement).open)).toBe(open);
  if (open) await expect(observationAnswer(page)).toBeVisible();
  else await expect(observationAnswer(page)).toBeHidden();
}

async function nativeToggle(page: Page, key: 'Enter' | 'Space', open: boolean) {
  await summary(page).focus(); await expect(summary(page)).toBeFocused();
  await page.keyboard.press(key); await openState(page, open);
  await expect(summary(page)).toBeFocused();
}

async function cueStructure(page: Page) {
  await expect(page.locator('.fr-hand-landmark-prompt')).toHaveText(prompt);
  await expect(page.locator('.fr-hand-landmark-prompt')).toBeVisible();
  await expect(summary(page)).toHaveText('Check your observation');
  await expect(observationAnswer(page)).toHaveText(answer);
  expect(await disclosure(page).evaluate(element => {
    const precedingPrompt = element.previousElementSibling;
    return element.tagName === 'DETAILS' && element.firstElementChild?.tagName === 'SUMMARY'
      && precedingPrompt?.classList.contains('fr-hand-landmark-prompt')
      && !!(precedingPrompt.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  // Expansion is the browser's details state; it must not be stored in learner data.
  await expect(disclosure(page)).not.toHaveAttribute('aria-expanded');
}

async function runtimeClean(page: Page) {
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}

async function liveDrawing(page: Page) {
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  await expect.poll(async () => (await data(page)).firstResponse.b3dStatus).toBe('ready');
  await expect.poll(async () => (await harness.glContexts(page)).filter(record =>
    record.connected && record.inWrap && !record.lost && record.createdBy === 'page' && record.draws > 0 && record.renders > 0).length).toBe(1);
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  await runtimeClean(page);
}

async function audit(page: Page) {
  if (!await page.evaluate(() => !!(window as any).axe)) await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-hand-inspection', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) })));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  const bounds = await page.locator('.fr-hand-landmark-cue').boundingBox();
  expect(bounds).toBeTruthy(); expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
  await runtimeClean(page);
}

async function capture(page: Page, name: string) {
  await summary(page).focus(); await expect(summary(page)).toBeFocused();
  await page.locator('.fr-hand-landmark-cue').screenshot({ path: report + '/' + name + '.png', timeout: 60000 });
}

test('phone observation uses native disclosure and retains learner data through pose comparisons and display preferences', async ({ page }) => {
  await mount(page); await cueStructure(page); await openState(page, false);
  const saved = await data(page);
  const retained = await disclosure(page).elementHandle();
  await capture(page, 'phone-hand-observation-closed');
  await nativeToggle(page, 'Enter', true); await sameData(page, saved);
  await capture(page, 'phone-hand-observation-open'); await audit(page);
  await nativeToggle(page, 'Space', false); await sameData(page, saved);
  await nativeToggle(page, 'Space', true); await sameData(page, saved);

  const before = page.getByRole('button', { name: 'Inspect before the turn', exact: true });
  const after = page.getByRole('button', { name: 'Inspect after the turn', exact: true });
  await expect(before).toHaveAttribute('aria-pressed', 'true');
  await after.focus(); await page.keyboard.press('Enter');
  await expect(after).toHaveAttribute('aria-pressed', 'true'); await expect(before).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Pose to inspect', { exact: true })).toHaveValue('5');
  await sameData(page, saved, 5); await openState(page, true);
  expect(await retained!.evaluate(element => element === document.querySelector('.fr-hand-landmark-observation'))).toBe(true);
  await before.focus(); await page.keyboard.press('Space');
  await expect(before).toHaveAttribute('aria-pressed', 'true'); await sameData(page, saved); await openState(page, true);
  expect(await retained!.evaluate(element => element === document.querySelector('.fr-hand-landmark-observation'))).toBe(true);

  await page.addStyleTag({ content: '.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}' });
  await cueStructure(page); await openState(page, true); await audit(page); await sameData(page, saved);
  await capture(page, 'phone-hand-observation-text-spacing');
  await page.emulateMedia({ forcedColors: 'active' });
  await nativeToggle(page, 'Enter', false); await nativeToggle(page, 'Space', true);
  await audit(page); await sameData(page, saved); await capture(page, 'phone-hand-observation-forced-colors');

  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); });
  await liveDrawing(page); await cueStructure(page); await openState(page, true);
  await nativeToggle(page, 'Space', false); await nativeToggle(page, 'Enter', true);
  await audit(page); await sameData(page, saved); await capture(page, 'phone-hand-observation-app-contrast');
  expect(await retained!.evaluate(element => element === document.querySelector('.fr-hand-landmark-observation'))).toBe(true);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

test('unavailable Three keeps observation keyboard controls and recovery completion gates usable in the 2D lesson', async ({ page }) => {
  const failedResources: string[] = [], pageErrors: string[] = [];
  page.on('requestfailed', request => failedResources.push(request.url()));
  page.on('pageerror', error => pageErrors.push(error.message));
  // A real missing asset sends the ordinary viewer down its unavailable path.
  await page.route('**/vendor/three-r128/three.min.js', route => route.abort('failed'));
  await mount(page, { b3dRec: completed.slice(0, 4), b3dRecView: 2 }, false);
  await expect(page.getByText('3D view unavailable on this device or network. Every target and every step is a button below — nothing here needs the picture.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => typeof (window as any).THREE)).toBe('undefined');
  expect(await page.locator('#wrap canvas').count()).toBe(0); expect(await harness.glContexts(page)).toEqual([]);
  expect(failedResources.length).toBeGreaterThan(0);
  expect(failedResources.every(url => new URL(url).pathname === '/vendor/three-r128/three.min.js')).toBe(true);
  expect(pageErrors).toEqual([]); await runtimeClean(page);
  await expect(page.getByRole('button', { name: 'Palm detail view', exact: true })).toBeDisabled();
  const before = page.getByRole('button', { name: 'Inspect before the turn', exact: true });
  const after = page.getByRole('button', { name: 'Inspect after the turn', exact: true });
  await expect(before).toBeEnabled(); await expect(after).toBeDisabled();
  await cueStructure(page); await openState(page, false);
  const saved = await data(page);
  await nativeToggle(page, 'Enter', true); await sameData(page, saved);
  await before.focus(); await page.keyboard.press('Space');
  await expect(before).toHaveAttribute('aria-pressed', 'true'); await sameData(page, saved, 4); await openState(page, true);
  await expect(after).toBeDisabled(); await audit(page);
  await nativeToggle(page, 'Space', false); await sameData(page, saved, 4);

  await page.getByLabel('Pose to inspect', { exact: true }).selectOption('1');
  await expect(disclosure(page)).toHaveCount(0); await expect(page.locator('.fr-hand-landmark-prompt')).toHaveCount(0);
  await sameData(page, saved, 1); await expect(after).toBeDisabled();
  await page.getByLabel('Pose to inspect', { exact: true }).selectOption('2');
  await cueStructure(page); await openState(page, false); await sameData(page, saved);
  await nativeToggle(page, 'Space', true); await sameData(page, saved); await audit(page);
  await expect(after).toBeDisabled(); expect(pageErrors).toEqual([]);
  expect(await harness.glContexts(page)).toEqual([]);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});
