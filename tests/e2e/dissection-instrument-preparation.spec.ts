import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-instrument-preparation-2026-09-30';
const baseline = process.env.DISSECTION_INSTRUMENT_BASELINE === '1';
const captureStyle = '.diss-next-action { position: static !important; }';
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'probe', selectedOrgan: null, revealedLayers: {}, exploredOrgans: { 'frog|ventral_skin': true }, organNotes: { 'frog|ventral_skin': 'Keep this saved observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|ventral_skin': true }, quizScore: 1, quizTotal: 2, workspaceMode: 'advanced', techniquePanelOpen: true, reducedMotion: true, soundEnabled: false, sceneDetail: false };

test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

async function mount(page: Page, state = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: `#wrap { width:100% !important; max-width:${available}px; }` });
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, score: d.quizScore, total: d.quizTotal, revealed: d.revealedLayers, selected: d.selectedOrgan, layer: d.activeLayer, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer };
  });
}

const cases = [
  { name: 'phone', width: 320, available: 320 },
  { name: 'tablet', width: 768, available: 768 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  { name: 'desktop', width: 1440, available: 1180 },
  { name: 'forced-colors', width: 390, available: 390, forced: true },
  { name: 'restricted', width: 390, available: 390, restricted: true },
];

for (const { name, width, available, large, contrast, forced, restricted } of cases) {
  test(`instrument preparation ${name} keeps access and readable feedback`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    if (forced) await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, { largeText: !!large, highContrast: !!contrast, procedureScenario: restricted ? 'restricted-tray' : 'standard' }, width, available);
    const panel = page.locator('#diss-procedure-panel');
    const tray = panel.getByRole('radiogroup', { name: 'Dissection instruments' });
    const before = await evidence(page);
    const inventory = await tray.getByRole('radio').evaluateAll(nodes => nodes.map(node => ({ name: node.getAttribute('aria-label'), disabled: (node as HTMLButtonElement).disabled, checked: node.getAttribute('aria-checked'), next: node.getAttribute('data-next'), readiness: node.getAttribute('data-readiness'), tabIndex: node.getAttribute('tabindex') })));
    await writeFile(`${out}/${baseline ? 'before' : 'after'}-${name}-inventory.json`, JSON.stringify(inventory, null, 2));
    if (baseline) {
      await tray.screenshot({ path: `${out}/before-tray-${name}.png`, style: captureStyle });
      await panel.locator('.diss-readiness').screenshot({ path: `${out}/before-readiness-${name}.png`, style: captureStyle });
      await panel.locator('.diss-calibration').screenshot({ path: `${out}/before-calibration-${name}.png`, style: captureStyle });
      return;
    }
    expect(inventory).toEqual(JSON.parse(await readFile(`${out}/before-${name}-inventory.json`, 'utf8')));
    const preparation = page.locator('[data-instrument-preparation]');
    await tray.screenshot({ path: `${out}/after-tray-${name}.png`, style: captureStyle });
    await panel.locator('.diss-readiness').screenshot({ path: `${out}/after-readiness-${name}.png`, style: captureStyle });
    await panel.locator('.diss-calibration').screenshot({ path: `${out}/after-calibration-${name}.png`, style: captureStyle });
    await expect(tray.getByRole('radio')).toHaveCount(7);
    await expect(tray.locator('[aria-checked="true"] [data-tool-marker="selected"]')).toHaveText('Selected');
    await expect(tray.locator('[data-next="true"] [data-tool-marker="next"]')).toHaveText('Next step');
    await expect(tray.locator('[aria-checked="true"] .diss-instrument__state')).toHaveText('Ready');
    const metrics = await preparation.evaluate(el => ({ width: el.getBoundingClientRect().width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
      cards: Array.from(el.querySelectorAll('.diss-instrument')).map(node => ({ height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth })),
      text: Array.from(el.querySelectorAll('.diss-instrument__name, .diss-instrument__state, .diss-instrument__hint, .diss-tool-marker, .diss-active-tool strong, #diss-active-tool-help, .diss-active-tool__badge, .diss-readiness__header strong, .diss-readiness__score, .diss-readiness__check span, .diss-readiness__cue, .diss-calibration__title strong, .diss-calibration__title span, .diss-calibration output, .diss-calibration__status b, .diss-calibration__status span, .diss-instrument-keyboard-help')).map(node => ({ text: node.textContent, size: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1 })) }));
    await writeFile(`${out}/${name}.json`, JSON.stringify(metrics, null, 2));
    expect(metrics.width).toBeLessThanOrEqual(available);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    for (const card of metrics.cards) {
      expect(card.height).toBeGreaterThanOrEqual(103.9);
      expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
    }
    for (const text of metrics.text) {
      expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9);
      expect(text.clipped, text.text || '').toBe(false);
    }
    const selected = tray.locator('[aria-checked="true"]');
    await selected.focus(); await expect(selected).toBeFocused();
    await selected.screenshot({ path: `${out}/focus-${name}.png` });
    expect(await evidence(page)).toEqual(before);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-instrument-preparation]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('preparation shortcuts focus calibration and the specimen without performing an action', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page);
  const before = await evidence(page);
  await page.locator('[data-preparation-action="calibrate"]').click();
  await expect(page.locator('#diss-calibration-range')).toBeFocused();
  expect(await evidence(page)).toEqual(before);
  await page.locator('[data-preparation-action="specimen"]').click();
  await expect(page.locator('#diss-canvas')).toBeFocused();
  expect(await evidence(page)).toEqual(before);
});

test('calibration adjustment remains explicit and changes only the intended setting', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page);
  const before = await evidence(page);
  const range = page.locator('#diss-calibration-range');
  const value = Number(await range.inputValue());
  await page.locator('[data-preparation-action="calibrate"]').click(); await page.keyboard.press('ArrowRight');
  await expect(range).toHaveValue(String(value + 1));
  const after = await evidence(page);
  expect(after.calibration.probePressure).toBe(value + 1);
  expect({ ...after, calibration: before.calibration }).toEqual(before);
  await expect(range).toHaveAttribute('aria-valuetext', new RegExp(`^${value + 1}%`));
});

test('keyboard instrument selection skips unavailable tools without recording technique progress', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page, { procedureScenario: 'restricted-tray' });
  const before = await evidence(page);
  await expect(page.locator('#diss-instrument-dropper')).toBeDisabled();
  await expect(page.locator('#diss-instrument-wick')).toBeDisabled();
  await page.locator('#diss-instrument-probe').focus(); await page.keyboard.press('End');
  await expect(page.locator('#diss-instrument-pin')).toBeFocused();
  await expect(page.locator('#diss-instrument-pin')).toHaveAttribute('aria-checked', 'true');
  expect(await evidence(page)).toEqual({ ...before, instrument: 'pin' });
  await page.keyboard.press('ArrowRight'); await expect(page.locator('#diss-instrument-probe')).toBeFocused();
  expect(await evidence(page)).toEqual(before);
});

test('modified and composing keys preserve the selected instrument', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page);
  const before = await evidence(page);
  const radio = page.locator('#diss-instrument-probe'); await radio.focus();
  const intercepted = await radio.evaluate(node => [
    { key: 'ArrowRight', ctrlKey: true }, { key: 'ArrowLeft', altKey: true }, { key: 'End', shiftKey: true },
    { key: 'Home', metaKey: true }, { key: 'ArrowRight', isComposing: true }, { key: 'ArrowRight', keyCode: 229 },
  ].map(options => { const event = new KeyboardEvent('keydown', { ...options, bubbles: true, cancelable: true }); node.dispatchEvent(event); return event.defaultPrevented; }));
  expect(intercepted).toEqual([false, false, false, false, false, false]);
  await expect(radio).toBeFocused(); expect(await evidence(page)).toEqual(before);
});

for (const mode of ['quiz', 'practical']) {
  test(`${mode} keeps preparation shortcuts hidden`, async ({ page }) => {
    test.skip(baseline, 'Baseline captures only.');
    await mount(page, { quizMode: true, practicalMode: mode === 'practical', practicalTimer: mode === 'practical' ? 300 : 0, practicalEndsAt: mode === 'practical' ? Date.now() + 300000 : 0, practicalTargetIds: mode === 'practical' ? ['ventral_skin', 'tympanum'] : [] });
    if (mode === 'practical') expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.practicalMode)).toBe(true);
    await expect(page.locator('[data-preparation-action]')).toHaveCount(0);
  });
}
