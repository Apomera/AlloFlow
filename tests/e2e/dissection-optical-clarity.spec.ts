import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.OPTICAL_OUTPUT || 'reports/dissection-optical-clarity-2026-10-04';
const baseline = process.env.OPTICAL_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', activeInstrument: 'probe', selectedOrgan: 'nictitating', revealedLayers: { skin: true }, procedureByLayer: { skin: complete },
  canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8,
  exploredOrgans: { 'frog|nictitating': true }, organNotes: { 'frog|nictitating': 'A transparent protective membrane.' }, organConfidence: { 'frog|nictitating': 3 }, verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } }, quizScore: 1, quizTotal: 2,
  workspaceMode: 'advanced', techniquePanelOpen: true, inspectionLens: true, macroInset: true, lensFocusDepth: 'structure', lensMagnification: 4, lightIntensity: 60, reducedMotion: true, soundEnabled: false, sceneDetail: false,
};
test.describe.configure({ retries: 0, timeout: 240000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

async function mount(page: Page, state: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const m = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); m.setAttribute('name', 'viewport'); m.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function proof(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return {
      specimen: d.specimen, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, selected: d.selectedOrgan,
      camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY], pinned: [d.lensPinned, d.lensPinnedPoint, d.lensPinnedOrganId],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers, procedures: d.procedureByLayer, calibration: d.toolCalibration,
      scores: [d.quizScore, d.quizTotal], evidence: d.visualEvidence, reference: d.referenceEvidenceId, attempts: d.attemptArchive, objectives: d.completedObjectives, annotations: d.annotations, inquiry: d.dissInquiry,
      guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending],
    };
  });
}
async function settings(page: Page) { return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { depth: d.lensFocusDepth, magnification: d.lensMagnification, lens: d.inspectionLens, inset: d.macroInset }; }); }
const panel = (page: Page) => page.locator('.diss-optics');
const depthGroup = (page: Page) => panel(page).getByRole('group', { name: 'Inspection focus depth', exact: true });
const magnificationGroup = (page: Page) => panel(page).getByRole('group', { name: 'Inspection magnification', exact: true });
async function metrics(p: Locator) {
  return p.evaluate(el => ({
    width: el.getBoundingClientRect().width, client: el.clientWidth, scroll: el.scrollWidth,
    parentWidth: el.parentElement!.getBoundingClientRect().width, parentClient: el.parentElement!.clientWidth, parentScroll: el.parentElement!.scrollWidth,
    overflow: Array.from(el.parentElement!.querySelectorAll('*')).filter(n => n.getClientRects().length && n.getBoundingClientRect().right > el.parentElement!.getBoundingClientRect().right + 1).slice(0, 30).map(n => ({ tag: n.tagName, className: n.className, text: n.textContent?.slice(0, 110), right: n.getBoundingClientRect().right, width: n.getBoundingClientRect().width, min: getComputedStyle(n).minWidth, font: getComputedStyle(n).fontSize })),
    buttons: Array.from(el.querySelectorAll('button')).map(n => { const s = getComputedStyle(n), r = n.getBoundingClientRect(); return { text: n.textContent, width: r.width, height: r.height, font: parseFloat(s.fontSize), clipped: n.scrollWidth > n.clientWidth + 1, border: parseFloat(s.borderTopWidth), underline: s.textDecorationLine, pressed: n.getAttribute('aria-pressed') }; }),
    text: Array.from(el.querySelectorAll('strong,p,b,.diss-optics__plane-item')).filter(n => n.textContent?.trim() && n.getClientRects().length).map(n => ({ text: n.textContent, font: parseFloat(getComputedStyle(n).fontSize), clipped: n.scrollWidth > n.clientWidth + 1 })),
    columns: getComputedStyle(el.querySelector('.diss-optics__controls') || el).gridTemplateColumns,
  }));
}
async function readable(p: Locator, available: number, large = false) {
  const m = await metrics(p); expect(m.width).toBeLessThanOrEqual(available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1);
  expect(Math.abs(m.width - m.parentWidth)).toBeLessThanOrEqual(1); expect(m.parentScroll).toBeLessThanOrEqual(m.parentClient + 1);
  expect(m.buttons).toHaveLength(6);
  for (const b of m.buttons) { expect(b.width).toBeGreaterThanOrEqual(47.9); expect(b.height).toBeGreaterThanOrEqual(47.9); expect(b.font).toBeGreaterThanOrEqual(large ? 18 : 16); expect(b.clipped).toBe(false); if (b.pressed === 'true') { expect(b.border).toBeGreaterThanOrEqual(2.9); expect(b.underline).toContain('underline'); } }
  for (const t of m.text) { expect(t.font).toBeGreaterThanOrEqual(large ? 16 : 14); expect(t.clipped).toBe(false); }
  return m;
}
async function focusStyle(button: Locator) {
  const style = await button.evaluate(el => {
    const s = getComputedStyle(el);
    const lum = (color: string) => { const c = (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
    const a = lum(s.outlineColor), b = lum(s.backgroundColor);
    return { width: parseFloat(s.outlineWidth), offset: parseFloat(s.outlineOffset), style: s.outlineStyle, shadow: s.boxShadow, color: s.outlineColor, background: s.backgroundColor, contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
  });
  expect(style.width).toBeGreaterThanOrEqual(2.9); expect(style.offset).toBe(-5); expect(style.style).toBe('solid'); expect(style.shadow).toBe('none'); expect(style.contrast).toBeGreaterThanOrEqual(3); return style;
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const result = await page.evaluate(async () => (window as any).axe.run({ include: [['.diss-optics']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]); expect(result.incomplete).toEqual([]);
}
const captureStyle = '.diss-next-action {position:static!important;}';
const layouts = [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-medium', width: 1440, available: 520 }, { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
];
for (const c of layouts) test(`optical controls are readable and independent on ${c.name}`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  if (c.forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, { largeText: !!c.large, highContrast: !!c.contrast }, c.width, c.available);
  const p = panel(page), before = await proof(page), prefix = baseline ? 'before' : 'after';
  await writeFile(`${out}/${prefix}-${c.name}-metrics.json`, JSON.stringify(await metrics(p), null, 2));
  await p.screenshot({ path: `${out}/${prefix}-${c.name}.png`, style: captureStyle });
  if (baseline) return;
  const focus = depthGroup(page), magnify = magnificationGroup(page);
  await expect(focus.getByRole('button')).toHaveCount(3); await expect(magnify.getByRole('button')).toHaveCount(3);
  await expect(focus).toHaveAccessibleDescription('Bring surface, structure boundaries, or deeper tissue into focus.');
  await expect(magnify).toHaveAccessibleDescription('Enlarge local detail in the inspection lens and inset.');
  await expect(p.locator('.diss-optics__scope')).toContainText('Use Specimen view to move or zoom the whole specimen.');
  await readable(p, c.available, !!c.large);
  const surface = focus.getByRole('button', { name: 'Surface', exact: true }); await surface.focus(); const initialFocus = await focusStyle(surface);
  await page.keyboard.press('Enter'); await expect(surface).toBeFocused(); await expect(surface).toHaveAttribute('aria-pressed', 'true');
  expect(await settings(page)).toEqual({ depth: 'surface', magnification: 4, lens: true, inset: true }); expect(await proof(page)).toEqual(before);
  const selectedFocus = await focusStyle(surface);
  await writeFile(`${out}/${c.name}-focus.json`, JSON.stringify({ initial: initialFocus, selected: selectedFocus }, null, 2));
  await p.screenshot({ path: `${out}/focus-${c.name}.png`, style: captureStyle });
  await page.keyboard.press('Tab'); const structure = focus.getByRole('button', { name: 'Structure', exact: true }); await expect(structure).toBeFocused(); await page.keyboard.press('Space');
  expect((await settings(page)).depth).toBe('structure'); expect((await settings(page)).magnification).toBe(4); expect(await proof(page)).toEqual(before);
  await page.keyboard.press('Tab'); const deep = focus.getByRole('button', { name: 'Deep', exact: true }); await expect(deep).toBeFocused(); await page.keyboard.press('Enter');
  expect((await settings(page)).depth).toBe('deep'); await page.keyboard.press('Tab'); const two = magnify.getByRole('button', { name: '2x', exact: true }); await expect(two).toBeFocused(); await page.keyboard.press('Space');
  expect(await settings(page)).toEqual({ depth: 'deep', magnification: 2, lens: true, inset: true }); expect(await proof(page)).toEqual(before);
  await page.keyboard.press('Tab'); const four = magnify.getByRole('button', { name: '4x', exact: true }); await expect(four).toBeFocused(); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); const six = magnify.getByRole('button', { name: '6x', exact: true }); await expect(six).toBeFocused(); await page.keyboard.press('Space'); await expect(six).toBeFocused();
  expect(await settings(page)).toEqual({ depth: 'deep', magnification: 6, lens: true, inset: true }); expect(await proof(page)).toEqual(before);
  await expect(focus.locator('button[aria-pressed="true"]')).toHaveCount(1); await expect(magnify.locator('button[aria-pressed="true"]')).toHaveCount(1);
  await readable(p, c.available, !!c.large); await focusStyle(six); await audit(page, c.name); expect(errors).toEqual([]);
});

test('resizing and text spacing preserve optical focus and settings', async ({ page }) => {
  test.skip(baseline); await mount(page, { largeText: true }, 1440, 1180);
  const p = panel(page), button = depthGroup(page).getByRole('button', { name: 'Structure', exact: true }), before = await proof(page), optics = await settings(page);
  await button.focus(); const wide = await metrics(p); expect(wide.columns.trim().split(/\s+/)).toHaveLength(2);
  await page.addStyleTag({ content: '#wrap {max-width:320px!important;} .diss-optics :is(button,p,strong,b,span) {letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important;}' });
  await expect(button).toBeFocused(); await focusStyle(button); await writeFile(`${out}/text-spacing-metrics.json`, JSON.stringify(await metrics(p), null, 2)); const narrow = await readable(p, 320, true); expect(narrow.columns.trim().split(/\s+/)).toHaveLength(1);
  expect(await proof(page)).toEqual(before); expect(await settings(page)).toEqual(optics); await p.screenshot({ path: `${out}/text-spacing.png`, style: captureStyle });
});
test('inset-only inspection enables the lens without changing specimen work', async ({ page }) => {
  test.skip(baseline); await mount(page, { inspectionLens: false, macroInset: true, lensPinned: false });
  const before = await proof(page); await expect(panel(page).locator('.diss-optics__plane-key')).toHaveCount(0);
  const button = magnificationGroup(page).getByRole('button', { name: '6x', exact: true }); await button.focus(); await page.keyboard.press('Enter');
  await expect(button).toBeFocused(); expect(await settings(page)).toEqual({ depth: 'structure', magnification: 6, lens: true, inset: true });
  await expect(panel(page).locator('.diss-optics__plane-key')).toBeVisible(); expect(await proof(page)).toEqual(before);
});
test('assessment and Essentials retain optical teaching restrictions', async ({ page }) => {
  test.skip(baseline); await mount(page, { quizMode: true }); await expect(panel(page)).toHaveCount(0); const assessment = await proof(page);
  await expect(page.getByRole('button', { name: 'Cycle inspection magnification: 2, 4, or 6 times', exact: true })).toHaveCount(0); expect(await proof(page)).toEqual(assessment);
  await harness.unmount(page); await mount(page, { workspaceMode: 'essentials' }); await expect(panel(page)).toBeHidden();
});
const eye = { specimen: 'sheepEye', _dissLoadedSpec: 'sheepEye', activeLayer: 'organs', anatomicalView: 'internal', revealedLayers: { skin: true }, procedureByLayer: { organs: complete }, selectedOrgan: 'lens' };
test('toolbar feedback follows the pinned optical target', async ({ page }) => {
  test.skip(baseline); await mount(page, { ...eye, lensPinned: true, lensPinnedPoint: { x: .5, y: .5 }, lensPinnedOrganId: 'iris', lensFocusDepth: 'deep', lensMagnification: 2, toolbarViewOpen: true }, 1440, 1180);
  const before = await proof(page), p = panel(page); await expect(p).toContainText('Iris & Pupil.'); await expect(p).toContainText('Ideal focus: surface');
  const magnify = page.getByRole('button', { name: 'Cycle inspection magnification: 2, 4, or 6 times', exact: true }); await magnify.focus(); await page.keyboard.press('Enter');
  expect((await settings(page)).magnification).toBe(4); await expect(magnify).toBeFocused(); expect(await proof(page)).toEqual(before);
  let feedback = await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback.message);
  expect(feedback).toContain('Set focus depth to surface for this structure.');
  let percentage = await p.locator('.diss-optics__meter b').innerText(); expect(feedback).toContain('at ' + percentage + '.');
  const depth = page.getByRole('button', { name: 'Cycle inspection focus depth: surface, structure, or deep', exact: true }); await depth.focus(); await page.keyboard.press('Space');
  expect((await settings(page)).depth).toBe('surface'); await expect(depth).toBeFocused(); expect(await proof(page)).toEqual(before);
  feedback = await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback.message); percentage = await p.locator('.diss-optics__meter b').innerText();
  expect(feedback).toContain('at ' + percentage + '.'); expect(feedback).not.toContain('Set focus depth to deep'); await expect(p).toContainText('Iris & Pupil.');
  await p.screenshot({ path: `${out}/pinned-target.png`, style: captureStyle });
});
test('magnification guidance recommends the modeled level for the tissue depth', async ({ page }) => {
  test.skip(baseline); await mount(page, { ...eye, lensPinned: false, lensFocusDepth: 'deep', lensMagnification: 2 });
  const before = await proof(page); await expect(panel(page)).toContainText('Crystalline Lens.'); await expect(panel(page)).toContainText('Use 6x magnification for this tissue depth.');
  await magnificationGroup(page).getByRole('button', { name: '6x', exact: true }).click(); await expect(panel(page)).not.toContainText('Use 6x magnification'); expect(await proof(page)).toEqual(before);
  await panel(page).screenshot({ path: `${out}/deep-magnification.png`, style: captureStyle });
  await harness.unmount(page); await mount(page, { ...eye, selectedOrgan: 'iris', lensPinned: false, lensFocusDepth: 'surface', lensMagnification: 6 });
  const surfaceBefore = await proof(page); await expect(panel(page)).toContainText('Use 2x magnification for this tissue depth.');
  await magnificationGroup(page).getByRole('button', { name: '2x', exact: true }).click(); await expect(panel(page)).not.toContainText('Use 2x magnification'); expect(await proof(page)).toEqual(surfaceBefore);
  await harness.unmount(page); await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'muscle', anatomicalView: 'lateral', selectedOrgan: 'pectoralis', revealedLayers: { skin: true }, procedureByLayer: { muscle: complete }, lensPinned: false, lensFocusDepth: 'structure', lensMagnification: 2 });
  const structureBefore = await proof(page); await expect(panel(page)).toContainText('Ideal focus: structure'); await expect(panel(page)).toContainText('Use 4x magnification for this tissue depth.');
  await magnificationGroup(page).getByRole('button', { name: '4x', exact: true }).click(); await expect(panel(page)).not.toContainText('Use 4x magnification'); expect(await proof(page)).toEqual(structureBefore);
});
for (const route of ['Identify', 'Guided', 'Compare']) test(`${route} uses consistent specimen navigation without recording work`, async ({ page }) => {
  test.skip(baseline); await mount(page, { selectedOrgan: null, ...(route === 'Guided' ? { guidedMode: true, guidedTargetIds: ['nictitating'], guidedStep: 0 } : {}), ...(route === 'Compare' ? { compareMode: true } : {}) });
  const before = await proof(page), card = page.locator('[data-dissection-next-action]'); await expect(card).toHaveAttribute('data-next-action', 'canvas');
  const go = card.getByRole('button', { name: 'Go to specimen', exact: true }); await go.focus(); await page.keyboard.press('Enter'); await expect(page.locator('#diss-canvas')).toBeFocused(); expect(await proof(page)).toEqual(before);
});
