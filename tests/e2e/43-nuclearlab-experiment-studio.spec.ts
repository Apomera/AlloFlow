import { readFileSync, mkdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_nuclearlab.js', toolId: 'nuclearLab', appStyles: true, width: 1100, height: 1200, layout: 'document' });
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const output = 'reports/nuclear-experiment-studio';
test.describe.configure({ timeout: 120_000, retries: 0, mode: 'serial' });
// These checks save explicit screenshots. Avoid recording a video of the long
// reference page, which can stall context teardown on the shared Windows host.
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, state = {}) {
  await harness.mount(page, { _nuclearLab: state }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const wrap = document.getElementById('wrap')!; wrap.style.width = '100%'; wrap.style.maxWidth = '1100px'; });
}
async function chooseExperiment(page: any, id: string) {
  await page.locator('.ns-chooser > summary').click();
  await page.locator(`[data-ns-mission="${id}"]`).click();
  await expect(page.locator('.ns-chooser')).not.toHaveAttribute('open');
}
async function audit(page: any) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.nk-workspace', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })));
  expect(violations).toEqual([]);
}

test('a keyboard learner completes both experiments and retains progress between views', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1200, height: 1000 });
  await mount(page);
  await expect(page.locator('[data-nk-sec]')).toHaveCount(0);
  await page.screenshot({ path: `${output}/studio-desktop.png`, fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: '32', exact: true }).focus();
  await page.keyboard.press('Enter');
  const advance = page.getByRole('button', { name: 'Advance one half-life' });
  await advance.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.locator('.ns-result')).toContainText('you predicted 32');
  await page.getByRole('button', { name: 'Each interval halves' }).click();
  await chooseExperiment(page, 'shield');
  await expect(page.getByRole('heading', { name: 'Can you weaken the beam?' })).toBeFocused();
  await page.getByRole('group', { name: 'Predict a shielding material' }).getByRole('button', { name: 'Lead' }).click();
  const slider = page.getByRole('slider', { name: 'Thickness' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('2.5');
  await page.getByRole('button', { name: 'Test this shield' }).click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('83.8%');
  await page.getByRole('group', { name: 'Material to test' }).getByRole('button', { name: 'Lead' }).click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('83.8%');
  await page.getByRole('button', { name: 'Test this shield' }).click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('14.6%');
  await page.getByRole('button', { name: 'At the same thickness, different' }).click();
  await expect(page.locator('.ns-progress')).toContainText('2 / 6');
  await page.screenshot({ path: `${output}/shield-comparison.png`, fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Reactor control room', exact: true }).click();
  await expect(page.locator('[data-nk-sec]')).toHaveCount(1);
  await expect(page.locator('#rx-rods')).toBeVisible();
  await page.getByRole('button', { name: 'Experiment studio', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Experiment studio' })).toBeFocused();
  await expect(page.locator('.ns-progress')).toContainText('2 / 6');
  expect(errors).toEqual([]);
});

for (const width of [390, 320]) {
  test(`controls precede the notebook and fit at ${width}px with larger text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page, { nkLargeText: true, nkReduceMotion: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const controls = await page.locator('.ns-controls').boundingBox();
    const notebook = await page.locator('[data-ns-notebook]').boundingBox();
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(notebook!.y);
    expect(await page.locator('.ns-atom').first().evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    await page.screenshot({ path: `${output}/studio-mobile-${width}.png`, fullPage: true });
    await audit(page);
    await chooseExperiment(page, 'shield');
    await page.getByRole('group', { name: 'Predict a shielding material' }).getByRole('button', { name: 'Lead' }).click();
    await page.getByRole('button', { name: 'Test this shield' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${output}/shield-mobile-${width}.png`, fullPage: true });
    await audit(page);
    for (const kind of ['distance', 'rays', 'counting', 'chain']) {
      await chooseExperiment(page, kind);
      if (kind === 'rays') {
        await page.getByRole('button', { name: 'Alpha only', exact: true }).click();
        for (const setup of ['alpha-open', 'alpha-paper', 'gamma-paper']) await page.locator(`[data-ns-setup="${setup}"]`).click();
        await expect(page.locator('[data-ns-explain]')).toHaveCount(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const introControls = await page.locator('.ns-controls').boundingBox();
      const introNotebook = await page.locator('[data-ns-notebook]').boundingBox();
      expect(introControls!.y + introControls!.height).toBeLessThanOrEqual(introNotebook!.y);
      await page.screenshot({ path: `${output}/${kind}-mobile-${width}.png`, fullPage: true });
      await audit(page);
    }
  });
}

test('light palette and forced colors preserve readable selected states', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 950 });
  await mount(page);
  await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  await expect(page.locator('.nk-workspace')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: `${output}/studio-light.png`, fullPage: true });
  await audit(page);
  for (const kind of ['distance', 'rays', 'counting', 'chain']) {
    await chooseExperiment(page, kind);
    await page.screenshot({ path: `${output}/${kind}-light.png`, fullPage: true });
    await audit(page);
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(page.getByRole('button', { name: 'Experiment studio', exact: true })).toHaveCSS('outline-style', 'solid');
  await page.screenshot({ path: `${output}/studio-forced-colors.png`, fullPage: true });
});

test('distance readings follow the model and a completed discovery leads to radiation paths', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page, { nkStudio: { mission: 'distance', completed: ['decay'] } });
  await page.getByRole('button', { name: 'Half as much', exact: true }).click();
  await page.getByRole('button', { name: 'Take a reading' }).click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  await page.getByRole('button', { name: '2 m', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  await page.getByRole('button', { name: 'Take a reading' }).click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('25%');
  await page.getByRole('button', { name: '4 m', exact: true }).click();
  await page.getByRole('button', { name: 'Take a reading' }).click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('6.25%');
  await page.getByRole('button', { name: 'The same output spreads' }).click();
  await expect(page.locator('.ns-progress')).toContainText('2 / 6');
  await page.screenshot({ path: `${output}/distance-discovery.png`, fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Continue: What can paper stop?' }).click();
  await expect(page.getByRole('heading', { name: 'A signal disappears. Has the source stopped?' })).toBeFocused();
  await expect(page.locator('[data-ns-intro]')).toHaveAttribute('data-ns-intro', 'rays');
});

test('a learner compares chain generations and continues to the reactor with all discoveries saved', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page, { nkStudio: { completed: ['decay', 'distance', 'rays', 'shield', 'counting'] } });
  await page.locator('.ns-chooser > summary').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /Keep the chain going/ }).click();
  await expect(page.getByRole('heading', { name: 'Can a chain stay steady?' })).toBeFocused();
  await expect(page.locator('.ns-chooser')).not.toHaveAttribute('open');
  await page.getByRole('button', { name: 'It stays steady', exact: true }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Advance one generation' }).click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('20.0');
  await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  await page.getByRole('button', { name: '0.8 · Fewer', exact: true }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Advance one generation' }).click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('8.2');
  await page.getByRole('button', { name: 'A steady chain keeps producing' }).click();
  await expect(page.locator('.ns-progress')).toContainText('6 / 6');
  await page.screenshot({ path: `${output}/chain-discovery.png`, fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Continue to the reactor' }).click();
  await expect(page.locator('#rx-rods')).toBeVisible();
  await page.getByRole('button', { name: 'Experiment studio', exact: true }).click();
  await expect(page.locator('.ns-progress')).toContainText('6 / 6');
  await expect(page.locator('[data-ns-reading]')).toHaveText('8.2');
});

test('three counting observations unlock a discovery, hints, and a keyboard recap', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page, { nkStudio: { mission: 'counting' } });
  const takeCount = page.getByRole('button', { name: 'Take a 10-second count' });
  await expect(takeCount).toBeDisabled();
  const hint = page.locator('.ns-hint');
  await expect(hint).not.toHaveAttribute('open');
  await hint.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(hint).toHaveAttribute('open');
  await expect(hint).toContainText('Choose the prediction');
  await page.getByRole('button', { name: 'They can differ', exact: true }).click();
  await expect(hint).toContainText('at least three readings');
  await takeCount.click();
  await takeCount.click();
  await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  await expect(page.locator('[data-ns-notebook] tbody tr')).toHaveCount(2);
  await takeCount.click();
  await expect(page.locator('[data-ns-reading]')).toHaveText(/^\d+$/);
  await expect(page.locator('[data-ns-status]')).toContainText('3 readings in your notebook');
  await expect(page.locator('[data-ns-explain="counting"]')).toHaveCount(1);
  await hint.locator('summary').click();
  await page.getByRole('button', { name: 'Random variation can change counts' }).click();
  await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  const observations = await page.locator('[data-ns-notebook] tbody').innerText();
  await page.locator('.ns-recap > summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ns-discovery]')).toHaveCount(1);
  await page.screenshot({ path: `${output}/counting-discovery.png`, fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Continue: Keep the chain going' }).click();
  await page.getByRole('button', { name: 'Revisit: One count, or a pattern?', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Can the same setup give different counts?' })).toBeFocused();
  expect(await page.locator('[data-ns-notebook] tbody').innerText()).toBe(observations);
});

test('matching zero readings remain readable on a small screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mount(page, { nkLargeText: true, nkStudio: { mission: 'counting', counting: { prediction: 'vary', runs: [0, 0, 0] } } });
  await expect(page.locator('[data-ns-reading]')).toHaveText('0');
  await expect(page.locator('.ns-feedback')).toContainText('These readings match.');
  await expect(page.locator('[data-ns-explain]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${output}/counting-zero-mobile.png`, fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Random variation can change counts' }).click();
  await page.getByRole('button', { name: 'Start again', exact: true }).click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('—');
  await expect(page.locator('.ns-progress')).toContainText('1 / 6');
});

test('radiation paths distinguish a blocked signal from an emitting source', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page, { nkStudio: { mission: 'rays' } });
  const alphaOpen = page.locator('[data-ns-setup="alpha-open"]');
  const alphaPaper = page.locator('[data-ns-setup="alpha-paper"]');
  const gammaPaper = page.locator('[data-ns-setup="gamma-paper"]');
  await expect(alphaOpen).toBeDisabled();
  await page.getByRole('button', { name: 'Both types', exact: true }).click();
  await alphaOpen.focus();
  await page.keyboard.press('Enter');
  await expect(alphaOpen).toBeFocused();
  await expect(page.locator('[data-ns-reading]')).toHaveText('Reaches the detector');
  await expect(page.locator('.ns-prediction')).not.toHaveAttribute('open');
  await expect(page.locator('.ns-prediction > summary')).toHaveText('Your prediction: Both types');
  await page.locator('.ns-prediction > summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Both types', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Both types', exact: true })).toBeDisabled();
  await alphaPaper.click();
  await expect(page.locator('.ns-prediction')).toHaveAttribute('open');
  await page.locator('.ns-prediction > summary').click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('Stopped by paper');
  await expect(page.locator('[data-ns-scene]')).toContainText('Source: still emitting.');
  await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  await alphaPaper.click();
  await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  await expect(page.locator('[data-ns-notebook] tbody tr')).toHaveCount(2);
  await page.screenshot({ path: `${output}/rays-alpha-paper.png`, fullPage: true });
  await audit(page);
  await gammaPaper.click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('Reaches the detector');
  await expect(page.locator('[data-ns-notebook] tbody td')).toHaveText(['Reaches the detector', 'Stopped by paper', 'Reaches the detector']);
  await page.getByRole('button', { name: 'Paper switches off' }).click();
  await expect(page.locator('.ns-progress')).toContainText('0 / 6');
  await page.getByRole('button', { name: 'Paper blocks the alpha path' }).click();
  await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  await page.screenshot({ path: `${output}/rays-discovery.png`, fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Continue: The shielding challenge' }).click();
  await expect(page.getByRole('heading', { name: 'Can you weaken the beam?' })).toBeFocused();
  await expect(page.locator('.ns-prediction')).toHaveAttribute('open');
  await chooseExperiment(page, 'rays');
  await expect(page.locator('.ns-prediction')).not.toHaveAttribute('open');
  await expect(page.locator('[data-ns-reading]')).toHaveText('Reaches the detector');
  await page.getByRole('button', { name: 'Start again', exact: true }).click();
  await expect(page.locator('.ns-prediction')).toHaveAttribute('open');
  await expect(page.getByRole('button', { name: 'Both types', exact: true })).toBeEnabled();
  await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  expect(errors).toEqual([]);
});

test('guided setups preserve the last reading until the learner runs the experiment', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page, { nkStudio: { mission: 'distance', distance: { prediction: 'quarter', setting: 4, runs: [4] } } });
  await expect(page.locator('[data-ns-guide]')).toContainText('0 of 2 comparison readings');
  await page.getByRole('button', { name: 'Set distance to 1 m', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Take a reading' })).toBeFocused();
  await expect(page.locator('[data-ns-reading]')).toHaveText('6.25%');
  await expect(page.locator('[data-ns-notebook] tbody tr')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ns-guide]')).toContainText('1 of 2 comparison readings');
  await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  await page.screenshot({ path: `${output}/guided-distance.png`, fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Set distance to 2 m', exact: true }).click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Take a reading' }).click();
  await expect(page.locator('[data-ns-guide]')).toHaveCount(0);
  await expect(page.locator('[data-ns-explain]')).toHaveCount(1);

  await chooseExperiment(page, 'shield');
  await page.getByRole('group', { name: 'Predict a shielding material' }).getByRole('button', { name: 'Lead' }).click();
  await page.getByRole('button', { name: 'Test this shield' }).click();
  await page.getByRole('group', { name: 'Material to test' }).getByRole('button', { name: 'Lead' }).click();
  await page.getByRole('slider', { name: 'Thickness' }).focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('slider', { name: 'Thickness' })).toHaveValue('4');
  await page.screenshot({ path: `${output}/guided-shield.png`, fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Prepare Lead at 2 cm', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Test this shield' })).toBeFocused();
  await expect(page.getByRole('slider', { name: 'Thickness' })).toHaveValue('2');
  await expect(page.locator('[data-ns-reading]')).toHaveText('86.8%');
  await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ns-reading]')).toHaveText('21.4%');
  await expect(page.locator('[data-ns-guide]')).toHaveCount(0);
  await expect(page.locator('[data-ns-explain]')).toHaveCount(1);
});

test('chain guidance finishes the current run and prepares the missing comparison', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page, { nkStudio: { mission: 'chain', chain: { prediction: 'steady', setting: .8, step: 2, runs: [] } } });
  await expect(page.locator('[data-ns-guide]')).toContainText('2 of 4 generations');
  await expect(page.locator('[data-ns-prepare]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Advance one generation' }).click();
  await page.getByRole('button', { name: 'Advance one generation' }).click();
  await expect(page.locator('[data-ns-guide]')).toContainText('1 of 2 comparison runs');
  await page.screenshot({ path: `${output}/guided-chain.png`, fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Prepare factor 1', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Advance one generation' })).toBeFocused();
  await expect(page.locator('[data-ns-notebook] tbody td')).toHaveText(['8.2']);
  await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  for (let i = 0; i < 4; i++) await page.keyboard.press('Enter');
  await expect(page.locator('[data-ns-notebook] tbody td')).toHaveText(['8.2', '20.0']);
  await expect(page.locator('[data-ns-explain]')).toHaveCount(1);
  await expect(page.locator('[data-ns-guide]')).toHaveCount(0);
});

test('a narrow experiment chooser resumes unfinished work with saved observations', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mount(page, { nkLargeText: true, nkStudio: { mission: 'decay', lastWorked: 'counting', completed: ['decay'], distance: { prediction: 'quarter', runs: [1] }, counting: { prediction: 'vary', runs: [1, 4] } } });
  await page.locator('.ns-chooser > summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ns-mission="decay"] .ns-mission-state')).toHaveText('Discovery recorded');
  await expect(page.locator('[data-ns-mission="counting"] .ns-mission-state')).toHaveText('In progress');
  await expect(page.locator('[data-ns-mission="chain"] .ns-mission-state')).toHaveText('Not started');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${output}/resume-mobile-320.png`, fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Resume: One count, or a pattern?', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Can the same setup give different counts?' })).toBeFocused();
  await expect(page.locator('.ns-chooser')).not.toHaveAttribute('open');
  await expect(page.locator('[data-ns-notebook] tbody td')).toHaveText(['1', '4']);
  await expect(page.locator('[data-ns-guide]')).toContainText('2 of 3 readings');
  await page.getByRole('button', { name: 'Take a 10-second count' }).click();
  await page.getByRole('button', { name: 'Random variation can change counts' }).click();
  await page.locator('.ns-chooser > summary').click();
  await expect(page.locator('[data-ns-mission="counting"] .ns-mission-state')).toHaveText('Discovery recorded');
  await page.getByRole('button', { name: 'Resume: Give it some space', exact: true }).click();
  await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  await expect(page.locator('.ns-progress')).toContainText('2 / 6');
  await page.screenshot({ path: `${output}/guided-distance-mobile.png`, fullPage: true });
  await audit(page);
});

test('a learner writes and revisits an optional takeaway on a small screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mount(page, { nkLargeText: true, nkStudio: { completed: ['decay'], decay: { prediction: 16, step: 2 } } });
  await page.locator('.ns-recap > summary').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-ns-reflection="decay"] > summary').focus();
  await page.keyboard.press('Enter');
  const note = page.getByRole('textbox', { name: 'My takeaway from The disappearing sample', exact: true });
  await note.fill('A half-life halves the atoms that remain.');
  await expect(page.locator('[data-ns-reflection="decay"]')).toContainText('Note kept with this discovery.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${output}/takeaway-mobile-320.png`, fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Reset sample', exact: true }).click();
  await expect(note).toHaveValue('A half-life halves the atoms that remain.');
  await page.getByRole('button', { name: 'All topics & routes', exact: true }).click();
  await page.getByRole('button', { name: 'Experiment studio', exact: true }).click();
  await page.locator('.ns-recap > summary').click();
  await page.locator('[data-ns-reflection="decay"] > summary').click();
  await expect(note).toHaveValue('A half-life halves the atoms that remain.');
  await page.getByRole('button', { name: 'Clear this note', exact: true }).click();
  await expect(note).toHaveValue('');
  await expect(page.locator('.ns-progress')).toContainText('1 / 6');
});
