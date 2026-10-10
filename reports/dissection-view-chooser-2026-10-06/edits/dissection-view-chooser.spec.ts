import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_VIEW_CHOOSER_OUTPUT || 'reports/dissection-view-chooser-2026-10-06';
const referenceOut = process.env.DISSECTION_VIEW_CHOOSER_REFERENCE_OUTPUT || out;
const baseline = process.env.DISSECTION_VIEW_CHOOSER_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgF9f6DwAB2QFQiLRdVgAAAABJRU5ErkJggg==';
const frames = [
  { id: 101, image, specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'dorsal', condition: 'preserved', selectedOrganName: 'Nictitating Membrane', techniqueScore: 84, opticalQuality: 91 },
  { id: 102, image, specimen: 'frog', layer: 'organs', layerName: 'Internal Organs', view: 'lateral', condition: 'dehydrated', selectedOrganName: 'Heart (3-chamber)', techniqueScore: 0, opticalQuality: 0 },
  { id: 'legacy/frame 103', image, specimen: 'frog', layer: 'unmapped', techniqueScore: null, opticalQuality: null },
];
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', activeInstrument: 'probe', selectedOrgan: 'nictitating', hoveredOrgan: null,
  revealedLayers: { skin: true }, procedureByLayer: { skin: complete }, workspaceMode: 'advanced', toolbarViewOpen: true, toolbarStudyOpen: false, toolbarToolsOpen: false,
  exploredOrgans: { 'frog|nictitating': true }, organNotes: { 'frog|nictitating': 'A transparent protective membrane supports this identification.' }, organConfidence: { 'frog|nictitating': 3 },
  verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } }, quizScore: 1, quizTotal: 2, quizFirstAttemptScore: 1, quizFirstAttemptTotal: 2, quizSupportedCount: 0,
  assessmentEvidence: { 'frog|nictitating': { attempts: 1, correct: true, firstAttemptCorrect: true } }, completedObjectives: { 'frog|skin': true },
  visualEvidence: frames, referenceEvidenceId: 102, splitComparison: false, evidenceNotebookOpen: true, annotations: [{ x: .5, y: .38, type: 'dot' }],
  canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8, labelMode: 'show', visualRealism: 'guided', specimenCondition: 'standard', variationSeed: 1,
  inspectionLens: false, lensPinned: false, lensMagnification: 2, lensFocusDepth: 'structure', macroInset: false, reducedMotion: true, soundEnabled: false, sceneDetail: false, animSpeed: 'normal',
};
const screenshotStyle = '.diss-next-action {position:static!important;}';
const errors = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0, timeout: 240000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message)); });
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
  expect(errors.get(page) || []).toEqual([]);
});

const chooser = (page: Page) => page.locator('#diss-view-tools');
const subgroup = (page: Page, key: string) => chooser(page).locator(`[data-diss-view-subgroup="${key}"]`);
const button = (page: Page, name: string) => chooser(page).getByRole('button', { name, exact: true });
const visuals = (page: Page) => button(page, 'Visual presentation: cycle guided, realistic, and accessible');
const split = (page: Page) => button(page, 'Toggle live and reference split comparison');
const source = (page: Page) => page.locator('[data-diss-canvas]');
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
// Display controls can change appearance and inspection preferences. Saved
// observations, technique, evidence, camera and assessment records stay intact.
async function proof(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return {
      specimen: d.specimen, layer: d.activeLayer, instrument: d.activeInstrument, camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers,
      procedures: d.procedureByLayer, calibration: d.toolCalibration, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      annotations: d.annotations, frames: d.visualEvidence, reference: d.referenceEvidenceId, notebook: d.evidenceNotebookOpen, contents: d.evidenceCaptureContents,
      scores: [d.quizScore, d.quizTotal], firstAttempt: [d.quizFirstAttemptScore, d.quizFirstAttemptTotal], supported: d.quizSupportedCount,
      assessment: d.assessmentEvidence, reviewQueue: d.quizReviewQueue, recordedAssessment: [d.assessmentCompletedAt, d.assessmentRecordedScore, d.assessmentRecordedTotal],
    };
  });
}
async function mount(page: Page, seed: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function inventory(page: Page) {
  return chooser(page).evaluate(el => Array.from(el.querySelectorAll('button,input')).map(node => ({
    tag: node.tagName, name: node.getAttribute('aria-label') || node.id, disabled: (node as HTMLButtonElement).disabled,
    pressed: node.getAttribute('aria-pressed'), visible: node.getBoundingClientRect().width > 0 && getComputedStyle(node).visibility !== 'hidden',
  })));
}
async function nativeInventory(page: Page, name: string) {
  const current = await inventory(page);
  await writeFile(`${out}/${baseline ? 'before' : 'after'}-${name}-inventory.json`, JSON.stringify(current, null, 2));
  if (!baseline) expect(current).toEqual(JSON.parse(await readFile(`${referenceOut}/before-${name}-inventory.json`, 'utf8')));
  return current;
}
async function metrics(panel: Locator) {
  return panel.evaluate(el => {
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { top: r.top, left: r.left, width: r.width, height: r.height }; };
    const visible = (node: Element) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
    const columns = (node: Element | null) => node ? getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length : null;
    return {
      ...box(el), client: el.clientWidth, scroll: el.scrollWidth, columns: columns(el), containerWidth: el.closest('[data-dissection-root]')!.getBoundingClientRect().width,
      subgroupColumns: columns(el.querySelector('.diss-view-subgroup-grid')),
      groups: Array.from(el.querySelectorAll('[data-diss-view-group]')).filter(visible).map(node => ({ name: node.getAttribute('data-diss-view-group'), ...box(node) })),
      subgroups: Array.from(el.querySelectorAll('[data-diss-view-subgroup]')).filter(visible).map(node => ({ name: node.getAttribute('data-diss-view-subgroup'), ...box(node), columns: columns(node.querySelector('.diss-view-control-grid')) })),
      text: Array.from(el.querySelectorAll('h4,h5,p,.diss-light-intensity span,.diss-light-intensity output')).filter(visible).map(node => ({ text: node.textContent, font: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1, textOverflow: getComputedStyle(node).textOverflow })),
      buttons: Array.from(el.querySelectorAll('button')).filter(visible).map(node => ({ name: node.getAttribute('aria-label') || node.textContent, ...box(node), font: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1 })),
      ranges: Array.from(el.querySelectorAll('input[type="range"]')).filter(visible).map(node => ({ id: node.id, ...box(node) })),
    };
  });
}
async function readable(page: Page, available: number, large = false) {
  const m = await metrics(chooser(page));
  expect(m.width).toBeLessThanOrEqual(available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1);
  for (const text of m.text) { expect(text.font, text.text || '').toBeGreaterThanOrEqual(large ? 18 : 14); expect(text.clipped, text.text || '').toBe(false); expect(text.textOverflow).not.toBe('ellipsis'); }
  for (const control of [...m.buttons, ...m.ranges]) { expect(control.height).toBeGreaterThanOrEqual(47.9); expect(control.width).toBeGreaterThanOrEqual(47.9); }
  for (const control of m.buttons) { expect(control.font, control.name || '').toBeGreaterThanOrEqual(large ? 18 : 16); expect(control.clipped, control.name || '').toBe(false); }
  return m;
}
async function focused(control: Locator) {
  await expect(control).toBeFocused();
  const result = await control.evaluate(node => { const s = getComputedStyle(node); return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, offset: parseFloat(s.outlineOffset) }; });
  expect(result.width).toBeGreaterThanOrEqual(3); expect(result.style).toBe('solid'); expect(result.offset).toBe(-5);
}
async function pressed(control: Locator) {
  await expect(control).toHaveAttribute('aria-pressed', 'true');
  const result = await control.evaluate(node => { const s = getComputedStyle(node); return { border: parseFloat(s.borderTopWidth), decoration: s.textDecorationLine }; });
  expect(result.border).toBeGreaterThanOrEqual(3); expect(result.decoration).toContain('underline');
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-view-tools']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
}

const layouts = [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-medium', width: 1440, available: 520 }, { name: 'embedded-large-contrast', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
];
for (const c of layouts) test(`view chooser layout ${c.name}`, async ({ page }) => {
  if (c.forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, { largeText: !!c.large, highContrast: !!c.contrast }, c.width, c.available);
  await chooser(page).scrollIntoViewIfNeeded(); await nativeInventory(page, c.name);
  const raw = await metrics(chooser(page)); await writeFile(`${out}/${baseline ? 'before' : 'after'}-${c.name}-metrics.json`, JSON.stringify(raw, null, 2));
  await chooser(page).screenshot({ path: `${out}/${baseline ? 'before' : 'after'}-${c.name}-view.png`, style: screenshotStyle });
  if (baseline) return;
  const before = await proof(page); await expect(chooser(page)).toHaveAccessibleName('View and accessibility controls');
  expect(await chooser(page).locator('[data-diss-view-group]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-diss-view-group')))).toEqual(['accessibility', 'specimen', 'lighting', 'workspace']);
  await expect(chooser(page).locator('button')).toHaveCount(33); await expect(chooser(page).locator('input[type="range"]')).toHaveCount(1);
  for (const [key, heading, count] of [['presentation', 'Anatomy and presentation', 6], ['inspection', 'Local inspection', 4], ['scene', 'Scene and landmarks', 8], ['reference', 'Reference and variation', 3]] as const) {
    await expect(subgroup(page, key)).toHaveAttribute('role', 'group'); await expect(subgroup(page, key)).toHaveAttribute('aria-labelledby', `diss-view-subgroup-${key}`);
    await expect(subgroup(page, key)).toHaveAccessibleName(heading); await expect(subgroup(page, key).getByRole('heading', { name: heading })).toHaveAttribute('id', `diss-view-subgroup-${key}`);
    await expect(subgroup(page, key).locator('button')).toHaveCount(count); await expect(subgroup(page, key).locator('[tabindex]')).toHaveCount(0);
  }
  await expect(visuals(page)).toHaveAccessibleDescription('Guided uses balanced materials and visible technique targets.');
  await expect(button(page, 'Rendering quality: cycle auto, high, and balanced')).toHaveAccessibleDescription('Quality balances animation smoothness with device load.');
  await expect(split(page)).toHaveAccessibleDescription('Compare the live specimen with Frame 2 from Internal Organs.');
  const m = await readable(page, c.available, !!c.large); expect(m.subgroupColumns).toBe(m.containerWidth <= 980 ? 1 : 2);
  for (const g of m.subgroups) expect(g.columns).toBe(m.containerWidth <= 520 ? 1 : 2);
  // Establish keyboard modality before checking the inset :focus-visible ring.
  await page.keyboard.press('Tab'); const sound = button(page, 'Toggle dissection sound effects'); await sound.focus(); await focused(sound);
  await page.keyboard.press('Space'); await pressed(sound); await focused(sound); await page.keyboard.press('Space'); await expect(sound).toHaveAttribute('aria-pressed', 'false');
  const highContrast = button(page, 'Toggle high contrast mode'); if (c.contrast) await pressed(highContrast);
  expect(await proof(page)).toEqual(before); await audit(page, c.name);
});

const modes = [
  { name: 'advanced', seed: {} }, { name: 'essentials', seed: { workspaceMode: 'essentials' } },
  { name: 'quiz', seed: { quizMode: true, labelMode: 'hidden' } },
  { name: 'practical', seed: { quizMode: true, practicalMode: true, practicalTimer: 120, practicalEndsAt: 9999999999999, practicalTargetIds: ['nictitating', 'tympanum'], labelMode: 'hidden' } },
];
for (const c of modes) test(`view chooser native inventory ${c.name}`, async ({ page }) => {
  await mount(page, c.seed, 390, 390); const before = await proof(page), controls = await nativeInventory(page, `mode-${c.name}`);
  if (baseline) return;
  if (c.name === 'advanced' || c.name === 'essentials') { expect(controls).toHaveLength(34); await expect(chooser(page).locator('[data-diss-view-subgroup]')).toHaveCount(4); }
  else {
    expect(controls).toHaveLength(11); await expect(chooser(page).locator('[data-diss-view-subgroup]')).toHaveCount(1);
    await expect(button(page, 'Organ name labels hidden during assessment')).toBeDisabled(); await expect(chooser(page).locator('#diss-view-cycle')).toHaveCount(0);
    await expect(chooser(page).locator('#diss-light-intensity-range')).toHaveCount(0); await expect(chooser(page).locator('[data-diss-view-subgroup="reference"]')).toHaveCount(0);
  }
  if (c.name === 'essentials') {
    await expect(visuals(page)).toHaveAccessibleDescription('Essentials uses Guided presentation. Select Advanced workspace to use the other presentation modes.');
    await expect(page.locator('#diss-view-inspection-help')).toHaveText('Local lens inspection is available in Advanced workspace.');
    await expect(page.locator('#diss-view-reference-help')).toHaveText('Saved-frame split comparison is available in Advanced workspace. Capture a frame in Lab tools to choose a reference.');
  }
  await readable(page, 390); expect(await proof(page)).toEqual(before);
});

test('presentation cycle explains native Accessible effects and retains preferences after leaving it', async ({ page }) => {
  test.skip(baseline); await mount(page, { highContrast: false }, 1440, 1180); const before = await proof(page);
  await visuals(page).focus(); await page.keyboard.press('Enter'); await expect(visuals(page)).toContainText('Realistic');
  await expect(visuals(page)).toHaveAccessibleDescription('Realistic uses richer materials, natural landmark variation, and reduced teaching emphasis.'); expect((await state(page)).visualRealism).toBe('realistic');
  await page.keyboard.press('Space'); await expect(visuals(page)).toContainText('Accessible');
  await expect(visuals(page)).toHaveAccessibleDescription('Accessible applies high contrast, larger visual targets, and slower animation. High contrast and slow animation stay active when you change presentation.');
  const accessible = await state(page); expect(accessible.highContrast).toBe(true); expect(accessible.animSpeed).toBe('slow'); await pressed(button(page, 'Toggle high contrast mode')); await focused(visuals(page));
  await page.keyboard.press('Enter'); await expect(visuals(page)).toContainText('Guided'); await expect(visuals(page)).toHaveAccessibleDescription('Guided uses balanced materials and visible technique targets.');
  const guided = await state(page); expect(guided.visualRealism).toBe('guided'); expect(guided.highContrast).toBe(true); expect(guided.animSpeed).toBe('slow'); expect(guided.reducedMotion).toBe(true);
  expect(await proof(page)).toEqual(before); await chooser(page).screenshot({ path: `${out}/presentation-cycle-view.png`, style: screenshotStyle }); await audit(page, 'presentation-cycle');
  await writeFile(`${out}/presentation-cycle-proof.json`, JSON.stringify({ before, accessible: { presentation: accessible.visualRealism, highContrast: accessible.highContrast, animSpeed: accessible.animSpeed }, guided: { presentation: guided.visualRealism, highContrast: guided.highContrast, animSpeed: guided.animSpeed }, savedWork: await proof(page) }, null, 2));
});

test('saved-frame split explains missing evidence, resolves the selected reference and falls back to the last valid frame', async ({ page }) => {
  test.skip(baseline); await mount(page, { visualEvidence: [], referenceEvidenceId: null, splitComparison: false }, 390, 390); const missing = await proof(page);
  await expect(split(page)).toBeDisabled(); await expect(split(page)).toHaveAccessibleDescription('Capture a frame in Lab tools to enable the live/reference split.');
  expect(await split(page).evaluate(node => getComputedStyle(node).borderTopStyle)).toBe('dashed'); expect(await proof(page)).toEqual(missing);
  await chooser(page).screenshot({ path: `${out}/split-missing-reference-view.png`, style: screenshotStyle }); await harness.unmount(page);
  const cases = [{ name: 'selected', reference: 102, expected: 'Compare the live specimen with Frame 2 from Internal Organs.' }, { name: 'fallback', reference: 'missing-id', expected: 'Compare the live specimen with Frame 3 from Saved specimen view.' }];
  const results = [];
  for (const c of cases) {
    // Invalid/no-image records must not affect either native frame numbering or fallback.
    await mount(page, { visualEvidence: [null, ...frames, { id: 999, image: '' }], referenceEvidenceId: c.reference }, 390, 390); const before = await proof(page);
    await expect(split(page)).toBeEnabled(); await expect(split(page)).toHaveAccessibleDescription(c.expected); await split(page).focus(); await page.keyboard.press('Space'); await pressed(split(page)); await focused(split(page));
    expect((await state(page)).splitComparison).toBe(true); expect(await proof(page)).toEqual(before);
    await page.keyboard.press('Enter'); await expect(split(page)).toHaveAttribute('aria-pressed', 'false'); expect((await state(page)).splitComparison).toBe(false); expect(await proof(page)).toEqual(before);
    results.push({ case: c.name, help: c.expected, savedWork: await proof(page) });
    if (c.name === 'selected') await chooser(page).screenshot({ path: `${out}/split-selected-reference-view.png`, style: screenshotStyle });
    await harness.unmount(page);
  }
  await writeFile(`${out}/split-reference-proof.json`, JSON.stringify({ missing, cases: results }, null, 2));
});

test('inspection pin gives a target prerequisite and native magnification and depth cycles preserve saved work', async ({ page }) => {
  test.skip(baseline); await mount(page, { selectedOrgan: null }, 1440, 1180); const before = await proof(page);
  const pin = button(page, 'Pin inspection lens to selected structure or current pointer'); await expect(pin).toHaveAccessibleDescription('Magnify a local area and choose its tissue depth. Specimen zoom stays separate. Select a structure or move over the specimen before pinning.');
  await pin.focus(); await page.keyboard.press('Enter'); await focused(pin); await expect(page.locator('[data-diss-tool-status]')).toContainText('Move over the specimen or select a structure before pinning the lens.');
  expect((await state(page)).lensPinned).toBe(false); expect(await proof(page)).toEqual(before);
  // Inspect the already observed structure through its directory handler.
  await page.locator('#diss-organ-nictitating').click(); await expect(page.locator('#diss-selection-title')).toBeFocused(); expect(await proof(page)).toEqual(before);
  await pin.focus(); await page.keyboard.press('Space'); const pinned = await state(page); expect(pinned.inspectionLens).toBe(true); expect(pinned.lensPinned).toBe(true); expect(pinned.lensPinnedOrganId).toBe('nictitating');
  expect(pinned.lensPinnedPoint.x).toBeGreaterThanOrEqual(0); expect(pinned.lensPinnedPoint.x).toBeLessThanOrEqual(1); await pressed(button(page, 'Release pinned inspection target'));
  const magnify = button(page, 'Cycle inspection magnification: 2, 4, or 6 times'); await magnify.focus();
  for (const level of [4, 6, 2]) { await page.keyboard.press('Enter'); expect((await state(page)).lensMagnification).toBe(level); await expect(magnify).toContainText(`${level}x`); await focused(magnify); expect(await proof(page)).toEqual(before); }
  const depth = button(page, 'Cycle inspection focus depth: surface, structure, or deep'); await depth.focus();
  for (const value of ['deep', 'surface', 'structure']) { await page.keyboard.press('Space'); expect((await state(page)).lensFocusDepth).toBe(value); await expect(depth).toContainText(value); await focused(depth); expect(await proof(page)).toEqual(before); }
  const release = button(page, 'Release pinned inspection target'); await release.focus(); await page.keyboard.press('Enter');
  const ended = await state(page); expect(ended.lensPinned).toBe(false); expect(ended.lensPinnedPoint).toBeNull(); expect(ended.lensPinnedOrganId).toBeNull(); expect(await proof(page)).toEqual(before);
  await chooser(page).screenshot({ path: `${out}/inspection-cycles-view.png`, style: screenshotStyle }); await writeFile(`${out}/inspection-proof.json`, JSON.stringify({ pinned: { target: pinned.lensPinnedOrganId, point: pinned.lensPinnedPoint }, final: { magnification: ended.lensMagnification, focus: ended.lensFocusDepth, pinned: ended.lensPinned }, before, savedWork: await proof(page) }, null, 2));
});

test('variation and tissue before-after change the displayed specimen while retaining recorded technique and camera', async ({ page }) => {
  test.skip(baseline); await mount(page, { beforeTechniqueView: false }, 390, 390); const before = await proof(page);
  const variation = button(page, 'Generate another deterministic specimen variation'); await variation.focus(); await page.keyboard.press('Enter'); expect((await state(page)).variationSeed).toBe(2);
  await expect(variation).toContainText('Variation 2'); await expect(page.locator('[data-diss-tool-status]')).toContainText('Loaded specimen variation 2. Landmark shifts are small and deterministic.'); expect(await proof(page)).toEqual(before);
  const after = button(page, 'Tissue: after technique. Activate to show the tissue before the technique.'); await expect(after).toHaveAccessibleDescription('Tissue before/after changes the displayed technique overlay. Your recorded technique stays saved.');
  await after.focus(); await page.keyboard.press('Space'); expect((await state(page)).beforeTechniqueView).toBe(true);
  const prior = button(page, 'Tissue: before technique. Activate to show the tissue after the technique.'); await expect(prior).toContainText('Tissue: before'); await focused(prior); expect(await proof(page)).toEqual(before);
  await page.keyboard.press('Enter'); expect((await state(page)).beforeTechniqueView).toBe(false); await expect(after).toContainText('Tissue: after'); expect(await proof(page)).toEqual(before);
  await writeFile(`${out}/variation-tissue-proof.json`, JSON.stringify({ variation: (await state(page)).variationSeed, before, savedWork: await proof(page) }, null, 2));
});

test('native practical hides inspection and reference actions and guards labels until End restores the View chooser', async ({ page }) => {
  test.skip(baseline); await mount(page, { toolbarStudyOpen: true }, 1440, 1180); const before = await proof(page);
  const study = page.locator('#diss-study-tools'), start = study.getByRole('button', { name: 'Start 2-minute timed practical', exact: true });
  const epoch = new Date('2026-10-06T16:00:00.000Z'); await page.clock.install({ time: epoch }); await page.clock.pauseAt(new Date(epoch.getTime() + 1000));
  await start.focus(); await page.keyboard.press('Enter'); const active = await state(page); expect(active.practicalMode).toBe(true); expect(active.quizMode).toBe(true); expect(active.labelMode).toBe('hidden');
  // Native Start closes View. Reopen its assessment controls through the real toggle.
  await expect(chooser(page)).toHaveCount(0); expect(active.toolbarViewOpen).toBe(false);
  await page.getByRole('button', { name: 'Accessibility options', exact: true }).click(); await expect(chooser(page)).toBeVisible();
  await expect(button(page, 'Organ name labels hidden during assessment')).toBeDisabled(); await expect(chooser(page).locator('#diss-view-cycle')).toHaveCount(0); await expect(chooser(page).locator('#diss-light-intensity-range')).toHaveCount(0);
  await expect(chooser(page).locator('[data-diss-view-subgroup]')).toHaveCount(1); await expect(chooser(page).locator('[data-diss-view-subgroup="reference"]')).toHaveCount(0);
  expect(await inventory(page)).toEqual(JSON.parse(await readFile(`${referenceOut}/before-mode-practical-inventory.json`, 'utf8')));
  await expect(page.locator('.diss-next-action')).toHaveAttribute('data-next-action', 'quiz'); expect(await proof(page)).toEqual({ ...before, scores: [0, 0] });
  await chooser(page).screenshot({ path: `${out}/native-practical-view.png`, style: screenshotStyle });
  // Accessibility closes Study; its existing route keeps the practical active and exposes End.
  await page.locator('#diss-route-study').click(); await expect(chooser(page)).toHaveCount(0);
  expect((await state(page)).practicalMode).toBe(true); expect(await proof(page)).toEqual({ ...before, scores: [0, 0] });
  await study.getByRole('button', { name: 'End timed practical', exact: true }).click(); const ended = await state(page); expect(ended.practicalMode).toBe(false); expect(ended.quizMode).toBe(false); expect(ended.labelMode).toBe('show');
  await page.getByRole('button', { name: 'View and accessibility options', exact: true }).click(); await expect(chooser(page)).toBeVisible();
  await expect(chooser(page).locator('[data-diss-view-subgroup]')).toHaveCount(4); await expect(chooser(page).locator('button')).toHaveCount(33); await expect(button(page, 'Toggle organ name labels')).toBeEnabled();
  expect(await proof(page)).toEqual({ ...before, scores: [0, 0] }); await writeFile(`${out}/practical-view-proof.json`, JSON.stringify({ activeFlags: { practical: active.practicalMode, quiz: active.quizMode, labels: active.labelMode }, restoredFlags: { practical: ended.practicalMode, quiz: ended.quizMode, labels: ended.labelMode }, before, savedWork: await proof(page) }, null, 2));
});

test('comparison next actions explain empty mapped and unmapped availability and keep native focus routes', async ({ page }) => {
  test.skip(baseline);
  const cases = [
    { name: 'empty', seed: { selectedOrgan: null }, title: 'Select a structure to compare', description: 'Inspect a visible structure first to check whether cross-specimen references are mapped for it.', action: 'canvas', label: 'Go to specimen', target: '#diss-canvas', mapping: null },
    { name: 'unmapped', seed: {}, title: 'No cross-specimen comparison is mapped for Nictitating Membrane', description: 'Open the comparison panel to review its scope, or inspect another visible structure to check reference availability.', action: 'comparison', label: 'Go to comparison', target: '#diss-comparison-panel', mapping: 'unmapped' },
    { name: 'mapped', seed: { activeLayer: 'organs', anatomicalView: 'ventral', selectedOrgan: 'heart', revealedLayers: { skin: true, muscle: true }, procedureByLayer: { skin: complete, muscle: complete, organs: complete }, exploredOrgans: { 'frog|heart': true }, organNotes: { 'frog|heart': 'A muscular pump in the anterior body cavity.' }, organConfidence: { 'frog|heart': 3 } }, title: 'Compare this structure across specimens', description: 'Use the selected structure as the shared anatomical reference.', action: 'comparison', label: 'Go to comparison', target: '#diss-comparison-panel', mapping: 'pumps' },
  ];
  const results = [];
  for (const c of cases) {
    await mount(page, { ...c.seed, toolbarStudyOpen: true }, 390, 390); const before = await proof(page);
    const compare = page.locator('#diss-study-tools').getByRole('button', { name: 'Compare', exact: true }); await compare.focus(); await page.keyboard.press('Enter'); await expect(compare).toBeFocused();
    const next = page.locator('.diss-next-action'); await expect(next).toHaveAttribute('data-next-action', c.action); await expect(page.locator('#diss-next-action-title')).toHaveText(c.title); await expect(next.locator('.diss-next-action__body > p').first()).toHaveText(c.description);
    await expect(page.locator('.diss-stage__handoff > strong')).toHaveText(`Next · ${c.title}`);
    await next.getByRole('button', { name: c.label, exact: true }).first().focus(); await page.keyboard.press('Space'); await expect(page.locator(c.target)).toBeFocused();
    if (c.mapping) await expect(page.locator('#diss-comparison-panel')).toHaveAttribute('data-comparison-group', c.mapping); else { await expect(page.locator('#diss-comparison-panel')).toHaveCount(0); expect((await state(page)).selectedOrgan).toBeNull(); }
    expect(await proof(page)).toEqual(before); results.push({ case: c.name, title: c.title, description: c.description, mapping: c.mapping, savedWork: await proof(page) });
    await harness.unmount(page);
  }
  await writeFile(`${out}/comparison-next-action-proof.json`, JSON.stringify(results, null, 2));
});

test('pressed and focus cues survive forced-colors embedded resizing and print hides View controls', async ({ page }) => {
  test.skip(baseline); await page.emulateMedia({ forcedColors: 'active' }); await mount(page, { largeText: true, highContrast: true }, 1440, 1180); const before = await proof(page);
  const sound = button(page, 'Toggle dissection sound effects'); await sound.focus(); await page.keyboard.press('Space'); await pressed(sound); await focused(sound); const wide = await readable(page, 1180, true); expect(wide.subgroupColumns).toBe(2);
  await page.addStyleTag({ content: '#wrap {max-width:320px!important;} #diss-view-tools :is(p,h4,h5,button) {letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important;}' });
  const narrow = await readable(page, 320, true); expect(narrow.subgroupColumns).toBe(1); for (const g of narrow.subgroups) expect(g.columns).toBe(1); await pressed(sound); await focused(sound); expect(await proof(page)).toEqual(before);
  await chooser(page).screenshot({ path: `${out}/forced-resize-pressed-focus-view.png`, style: screenshotStyle }); await audit(page, 'forced-resize');
  await page.emulateMedia({ media: 'print' }); await expect(chooser(page)).toBeHidden(); expect(await proof(page)).toEqual(before); await page.emulateMedia({ media: 'screen' }); await expect(chooser(page)).toBeVisible(); await pressed(sound);
  await writeFile(`${out}/resize-print-proof.json`, JSON.stringify({ wide, narrow, savedWork: before }, null, 2));
});
