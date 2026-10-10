import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_ADAPTIVE_COACHING_OUTPUT || 'test-results/dissection-adaptive-coaching';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 19, risk: 11, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'prepared', lastUpdatedAt: 100, consequences: [] };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, revealedLayers: {}, workspaceMode: 'advanced', techniquePanelOpen: true, procedureMode: 'independent', adaptiveGuidance: true, incisionDepth: 'deep', organNotes: { 'frog|ventral_skin': 'Preserved observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|tympanum': true }, quizScore: 1, quizTotal: 2, reducedMotion: true, soundEnabled: false, sceneDetail: false };
const errors = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', error => list.push(error.message)); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); expect(errors.get(page)).toEqual([]); });

async function stableState(page: Page) {
  return page.evaluate(() => {
    const { timeSpent: _elapsedTime, ...savedState } = (window as any).__ctx.toolData.dissection;
    return savedState;
  });
}
for (const layout of [
  { name: 'phone-dry', width: 320, available: 320, moisture: 24, risk: 11, trauma: 0, scenario: 'precision-access', label: 'Review Dropper', target: 'diss-instrument-dropper', focus: 'Surface moisture' },
  { name: 'desktop-restricted-dry', width: 1440, available: 1180, moisture: 24, risk: 11, trauma: 0, scenario: 'restricted-tray', label: 'Review tissue condition', target: 'diss-field-monitor-summary', focus: 'Surface moisture' },
  { name: 'embedded-large-risk', width: 1440, available: 320, moisture: 67, risk: 70, trauma: 50, scenario: 'precision-access', label: 'Review tissue condition', target: 'diss-field-monitor-summary', focus: 'Tissue preservation', large: true, contrast: true },
  { name: 'forced-colors-orientation', width: 390, available: 390, moisture: 67, risk: 11, trauma: 0, scenario: 'precision-access', label: 'Review technique controls', target: 'diss-procedure-summary', focus: 'Orientation', forced: true },
]) test(`adaptive coaching ${layout.name} reviews the matching controls without applying changes`, async ({ page }) => {
  if (layout.forced) await page.emulateMedia({ forcedColors: 'active' });
  await page.setViewportSize({ width: layout.width, height: 1000 });
  const procedure = { tissueState: { ...tissue, moisture: layout.moisture, risk: layout.risk, trauma: layout.trauma }, errors: 0, protocolDeviations: 0, history: [], actionLog: [], cautionLog: [], learningChecks: {} };
  await harness.mount(page, { dissection: { ...initial, procedureScenario: layout.scenario, procedureByLayer: { skin: procedure }, largeText: !!layout.large, highContrast: !!layout.contrast } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${layout.available}px;}` });
  const card = page.locator('#diss-adaptive-coaching'), action = card.getByRole('button', { name: layout.label, exact: true });
  await expect(card).toBeVisible(); await expect(card.getByRole('heading', { name: layout.focus, exact: true })).toBeVisible();
  await expect(action).toBeEnabled(); await expect(action).toHaveAttribute('aria-controls', layout.target);
  await expect(action).toHaveAccessibleDescription(`${await page.locator('#diss-adaptive-coaching-suggestion').innerText()} Opens controls for review.`);
  const before = await stableState(page);
  expect(before.activeInstrument).toBe('forceps'); expect(before.procedureMode).toBe('independent'); expect(before._procedureDemo).toBeFalsy();
  await action.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await expect(action).toBeFocused();
  expect(await stableState(page)).toEqual(before);
  const metrics = await card.evaluate(el => ({ width: el.getBoundingClientRect().width, client: el.clientWidth, scroll: el.scrollWidth,
    text: Array.from(el.querySelectorAll('h4,p,button')).map(node => ({ text: node.textContent, font: parseFloat(getComputedStyle(node).fontSize), client: node.clientWidth, scroll: node.scrollWidth })),
    button: (() => { const node = el.querySelector('button')!; const css = getComputedStyle(node); return { height: node.getBoundingClientRect().height, outlineWidth: parseFloat(css.outlineWidth), outlineStyle: css.outlineStyle }; })() }));
  expect(metrics.width).toBeLessThanOrEqual(layout.available); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  for (const item of metrics.text) { expect(item.font).toBeGreaterThanOrEqual(layout.large ? 18 : 16); expect(item.scroll).toBeLessThanOrEqual(item.client + 1); }
  expect(metrics.button.height).toBeGreaterThanOrEqual(48); expect(metrics.button.outlineWidth).toBeGreaterThanOrEqual(3); expect(metrics.button.outlineStyle).toBe('solid');
  await writeFile(`${out}/${layout.name}-metrics.json`, JSON.stringify(metrics, null, 2));
  await card.screenshot({ path: `${out}/${layout.name}.png`, style: '.diss-next-action{position:static!important;}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-adaptive-coaching']] }));
  await writeFile(`${out}/${layout.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  const beforeReview = await stableState(page);
  await action.focus(); await page.keyboard.press('Enter');
  await expect(page.locator(`#${layout.target}`)).toBeFocused();
  const after = await stableState(page);
  expect(after).toEqual(beforeReview); expect(after._procedureDemo).toBeFalsy();
  expect(after.activeInstrument).toBe('forceps'); expect(after.procedureMode).toBe('independent');
  if (layout.target === 'diss-instrument-dropper') { await expect(page.locator('#diss-procedure-panel')).toHaveAttribute('open', ''); await expect(page.locator('#diss-instrument-dropper')).toHaveAttribute('aria-checked', 'false'); }
  if (layout.target === 'diss-field-monitor-summary') { expect(await page.locator('#diss-field-monitor-summary').evaluate(node => node.closest('details')?.open)).toBe(true); await expect(page.locator('.diss-field-monitor__body')).toBeVisible(); }
  await writeFile(`${out}/${layout.name}-handoff.json`, JSON.stringify({ focused: await page.evaluate(() => document.activeElement?.id), statePreserved: true, selectedInstrument: after.activeInstrument, procedureMode: after.procedureMode, demonstrationStarted: !!after._procedureDemo }, null, 2));
});
