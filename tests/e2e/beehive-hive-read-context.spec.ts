import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import path from 'node:path';
import fs from 'node:fs';

const artifactDir = path.resolve(process.env.BEE_READ_CONTEXT_ARTIFACTS || '.codex-artifacts/bee-read-context-2026-10-13');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
const topics = [
  { id: 'food', label: 'Food stores' }, { id: 'pollen', label: 'Pollen stores' },
  { id: 'brood', label: 'Developing brood' }, { id: 'queen', label: 'Queen' },
];
const roles = [
  { id: 'honey', label: 'Food cells' }, { id: 'pollen', label: 'Pollen cells' },
  { id: 'open_brood', label: 'Open brood' }, { id: 'capped_brood', label: 'Capped brood' },
  { id: 'drone_brood', label: 'Drone brood' }, { id: 'empty', label: 'Unmarked comb' },
];

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.error) console.error(testInfo.error.message);
  await harness.destroy(page);
});

function panel(page: Page) { return page.locator('[data-hive-interior]'); }
function disclosure(page: Page) { return panel(page).locator('[data-interior-position-study-disclosure]'); }
function toggle(page: Page) { return disclosure(page).locator('[data-interior-position-study-toggle]'); }
function study(page: Page) { return disclosure(page).locator('[data-interior-position-study]'); }
function topic(page: Page, id: string) { return panel(page).locator('[data-interior-topic="' + id + '"]'); }
function role(page: Page, id: string) { return panel(page).locator('[data-interior-role="' + id + '"]'); }
function reading(page: Page) { return panel(page).locator('[data-interior-reading]'); }
function comparison(page: Page) { return panel(page).locator('[data-interior-comparison]'); }
function selectedFrame(page: Page) { return panel(page).locator('[data-interior-frame][aria-pressed="true"]'); }

function seededNotebook() {
  return {
    beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my own observation</strong> & punctuation.', explanation: 'Keep my explanation.',
      review: { prediction: true, evidence: true, explanation: true }, custom: { retained: 'Role metadata.' } },
    queen: { evidence: 'Keep my network writing.', review: { evidence: true } },
    drone: { evidence: 'Keep my flight writing.', review: { evidence: true } },
    synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' },
  };
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(notebook => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Position study uses the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the hive position study test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0, hive3dFramesSeen: [],
      hive3dPart: null, hive3dFoundQueen: false, notebook,
      queen: { active: false, custom: { retained: 'Network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: 'Flight setup.' } },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, seededNotebook());
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await expect(page.locator('[data-bay-canvas-frame="hive"] canvas')).toHaveCount(0);
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(disclosure(page)).toHaveCount(1);
  await expect.poll(() => disclosure(page).evaluate(node => (node as HTMLDetailsElement).open)).toBe(false);
  await expect(study(page)).toBeHidden();
}
async function work(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
}
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}
async function changeDisclosure(page: Page, open: boolean, key: 'Enter' | 'Space' = 'Enter') {
  const before = await work(page);
  await toggle(page).focus(); await page.keyboard.press(key);
  await expect(toggle(page)).toBeFocused();
  await expect.poll(() => disclosure(page).evaluate(node => (node as HTMLDetailsElement).open)).toBe(open);
  if (open) await expect(study(page)).toBeVisible(); else await expect(study(page)).toBeHidden();
  expect(await work(page)).toEqual(before);
}
async function hold(page: Page) {
  await panel(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(comparison(page)).toBeVisible();
}

function inspect(page: Page, frame: number) { return study(page).locator('[data-position-study-inspect="' + frame + '"]'); }
function figure(page: Page, frame: number) { return study(page).locator('[data-position-study-frame="' + frame + '"]'); }
function readTitle(page: Page) { return panel(page).locator('#beehive-interior-read-title'); }
async function studyState(page: Page) {
  return panel(page).evaluate(node => ({
    topic: node.querySelector('[data-interior-topic][aria-pressed="true"]')?.getAttribute('data-interior-topic'),
    role: node.querySelector('[data-interior-role][aria-pressed="true"]')?.getAttribute('data-interior-role') || null,
    lens: node.querySelector('[data-interior-lens-toggle]')?.getAttribute('aria-expanded'),
    row: (node.querySelector('[data-interior-lens-row]') as HTMLSelectElement | null)?.value || null,
    column: (node.querySelector('[data-interior-lens-column]') as HTMLSelectElement | null)?.value || null,
    held: Array.from(node.querySelectorAll('[data-change-held]')).map(el => el.textContent),
    reference: node.querySelector('[data-interior-reference]')?.textContent,
    reading: node.querySelector('[data-interior-reading]')?.textContent,
    sharedReading: node.querySelector('[data-position-study-reading]')?.textContent,
    diagrams: Array.from(node.querySelectorAll('[data-position-study-diagram]')).map(el => el.innerHTML),
  }));
}
async function assertSelection(page: Page, frame: number) {
  for (const index of [0, 2]) {
    await expect(figure(page, index)).toHaveAttribute('data-selected', String(frame === index));
    await expect(figure(page, index).locator('[data-position-study-selection]')).toHaveText(frame === index ? 'Selected frame' : 'Not selected');
    await expect(inspect(page, index)).toHaveText('Inspect Frame ' + (index + 1));
    await expect(inspect(page, index)).toHaveAttribute('aria-controls', 'beehive-interior-read');
    await expect(inspect(page, index)).toHaveAttribute('aria-describedby', 'beehive-position-inspect-help');
    await expect(inspect(page, index)).toBeEnabled();
  }
  await expect(selectedFrame(page)).toHaveAttribute('data-interior-frame', String(frame));
  await expect(panel(page).locator('[data-hive-interior-diagram]')).toHaveAccessibleName(new RegExp('Frame ' + (frame + 1) + ' of 6'));
}
async function handoff(page: Page, frame: number, key: 'Enter' | 'Space' = 'Enter') {
  const before = await work(page), visible = await studyState(page);
  await inspect(page, frame).focus(); await page.keyboard.press(key);
  await expect(readTitle(page)).toBeFocused();
  const expected = JSON.parse(JSON.stringify(before));
  Object.assign(expected.beehive, { hive3dFrame: frame, hive3dPart: 'brood_frames', hive3dExploded: true });
  const validSeen = (Array.isArray(before.beehive.hive3dFramesSeen) ? before.beehive.hive3dFramesSeen : []).filter((value: number) => Number.isInteger(value) && value >= 0 && value < 6);
  expected.beehive.hive3dFramesSeen = [...new Set([...validSeen, frame])];
  expect(await work(page)).toEqual(expected);
  expect(await studyState(page)).toEqual(visible);
  await expect.poll(() => disclosure(page).evaluate(node => (node as HTMLDetailsElement).open)).toBe(true);
  await assertSelection(page, frame);
}

function context(page: Page) { return panel(page).locator('[data-interior-read-context]'); }
function back(page: Page) { return context(page).locator('[data-interior-position-return]'); }
function frameKind(frame: number) { return frame === 0 || frame === 5 ? 'Outside' : frame === 1 || frame === 4 ? 'Shoulder' : 'Centre'; }
async function assertContext(page: Page, frame: number, label: string) {
  const frameText = 'Frame ' + (frame + 1) + ' of 6 · ' + frameKind(frame), studyText = 'Studying: ' + label;
  await expect(context(page).locator('[data-interior-read-frame]')).toHaveText(frameText);
  await expect(context(page).locator('[data-interior-read-study]')).toHaveText(studyText);
  await expect(readTitle(page)).toHaveAttribute('aria-describedby', 'beehive-interior-read-frame beehive-interior-read-study');
  await expect(readTitle(page)).toHaveAccessibleDescription(frameText + ' ' + studyText);
  await expect(readTitle(page)).toHaveText('2 · Read the comb');
  await expect(context(page).locator('[role="status"],[aria-live]')).toHaveCount(0);
  expect(await context(page).getAttribute('role')).not.toBe('status');
  expect(await context(page).getAttribute('aria-live')).toBeNull();
}
async function returnToPositions(page: Page, frame: number, key: 'Enter' | 'Space' = 'Enter') {
  const before = await work(page), visible = await studyState(page);
  const target = (frame === 0 || frame === 2) && await inspect(page, frame).count() ? inspect(page, frame) : toggle(page);
  await expect(back(page)).toHaveText('Back to frame positions');
  await expect(back(page)).toHaveAttribute('aria-controls', 'beehive-interior-positions');
  await expect(disclosure(page)).toHaveAttribute('id', 'beehive-interior-positions');
  await back(page).focus(); await page.keyboard.press(key);
  await expect(target).toBeFocused();
  await expect.poll(() => disclosure(page).evaluate(node => (node as HTMLDetailsElement).open)).toBe(true);
  expect(await work(page)).toEqual(before);
  expect(await studyState(page)).toEqual(visible);
}

test('read context identifies every frame and study and returns keyboard focus without changing colony or study state', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await expect(back(page)).toHaveCount(0); await changeDisclosure(page, true);
  const initial = await work(page);
  const categories = [...topics.map(item => ({ ...item, isRole: false })), ...roles.map(item => ({ ...item, isRole: true }))];
  for (const category of categories) {
    await (category.isRole ? role(page, category.id) : topic(page, category.id)).click();
    for (let frame = 0; frame < 6; frame++) {
      await panel(page).locator('[data-interior-frame="' + frame + '"]').click();
      await assertContext(page, frame, category.label);
      await returnToPositions(page, frame, frame % 2 ? 'Space' : 'Enter');
    }
  }
  await hold(page);
  await panel(page).locator('[data-interior-lens-toggle]').click();
  await panel(page).locator('[data-interior-lens-row]').selectOption('4');
  await panel(page).locator('[data-interior-lens-column]').selectOption('14');
  const held = (await studyState(page)).held;
  await fixture(page, { day: 16, honey: 32, pollen: 8, brood: 3000, queenHealth: 76 });
  for (const category of categories) {
    await (category.isRole ? role(page, category.id) : topic(page, category.id)).click();
    await handoff(page, 0, 'Enter'); await assertContext(page, 0, category.label); await returnToPositions(page, 0, 'Space');
    await handoff(page, 2, 'Space'); await assertContext(page, 2, category.label); await returnToPositions(page, 2, 'Enter');
    await returnToPositions(page, 2, 'Space');
    await expect(panel(page).locator('[data-interior-current-lens]')).toHaveAccessibleName(/Frame 3 of 6/);
    await expect(panel(page).locator('[data-interior-held-lens]')).toHaveAccessibleName(/Frame 3 of 6/);
    expect((await studyState(page)).held).toEqual(held);
  }
  const final = await work(page);
  expect(final.beehive.notebook).toEqual(initial.beehive.notebook); expect(final.otherTool).toEqual(initial.otherTool);
  expect(final.beehive.actionPoints).toBe(initial.beehive.actionPoints); expect(final.beehive.day).toBe(16);
  expect(final.beehive.hive3dFoundQueen).toBe(false); expect(errors).toEqual([]);
});

test('read context keeps unavailable and unmapped studies understandable and handles comparison disclosure changes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await hold(page); await changeDisclosure(page, true);
  await panel(page).locator('[data-interior-lens-toggle]').click();
  await panel(page).locator('[data-interior-lens-row]').selectOption('4');
  await panel(page).locator('[data-interior-lens-column]').selectOption('14');
  const initial = await work(page), held = (await studyState(page)).held;
  await topic(page, 'pollen').click(); await fixture(page, { pollen: null });
  await expect(study(page).locator('[data-position-study-unavailable]')).toBeVisible();
  await expect(study(page).locator('[data-position-study-inspect]')).toHaveCount(0);
  for (const frame of [0, 2]) {
    await panel(page).locator('[data-interior-frame="' + frame + '"]').click();
    await assertContext(page, frame, 'Pollen stores'); await returnToPositions(page, frame, 'Enter'); await returnToPositions(page, frame, 'Space');
  }
  await fixture(page, { pollen: 12 });
  await topic(page, 'queen').click(); await assertContext(page, 2, 'Queen');
  await expect(panel(page).locator('[data-interior-highlight-note]')).toContainText('does not mark the queen');
  await returnToPositions(page, 2);
  await role(page, 'empty').click(); await assertContext(page, 2, 'Unmarked comb');
  await expect(topic(page, 'queen')).toHaveAttribute('aria-pressed', 'true');
  await returnToPositions(page, 2, 'Space');
  const beforeDisclosure = await work(page), preserved = await studyState(page);
  await changeDisclosure(page, false, 'Space');
  await expect(back(page)).toHaveCount(0); await assertContext(page, 2, 'Unmarked comb');
  await expect(toggle(page)).toBeFocused();
  await changeDisclosure(page, true, 'Enter');
  await expect(back(page)).toHaveCount(1); await expect(toggle(page)).toBeFocused();
  expect(await work(page)).toEqual(beforeDisclosure); expect(await studyState(page)).toEqual(preserved);
  await returnToPositions(page, 2); await returnToPositions(page, 2, 'Space');
  // Native details state can close before React receives its queued toggle event.
  const beforeNativeClose = await work(page), beforeNativeStudy = await studyState(page);
  const immediateClose = await panel(page).evaluate(node => {
    const details = node.querySelector('[data-interior-position-study-disclosure]') as HTMLDetailsElement;
    const returnButton = node.querySelector('[data-interior-position-return]') as HTMLButtonElement;
    const summary = node.querySelector('[data-interior-position-study-toggle]');
    details.open = false;
    returnButton.click();
    return { focusedSummary: document.activeElement === summary, stillClosed: !details.open };
  });
  expect(immediateClose).toEqual({ focusedSummary: true, stillClosed: true });
  await expect(back(page)).toHaveCount(0); await expect(toggle(page)).toBeFocused();
  expect(await work(page)).toEqual(beforeNativeClose);
  await changeDisclosure(page, true, 'Space'); await expect(back(page)).toHaveCount(1);
  expect(await studyState(page)).toEqual(beforeNativeStudy);
  await returnToPositions(page, 2);
  // An invalid held reference does not make navigation or the current selection unavailable.
  await fixture(page, { experimentRunSerial: 4 });
  await expect(panel(page).locator('[data-interior-reference-state]')).toHaveText('Comparison unavailable');
  await assertContext(page, 2, 'Unmarked comb'); await returnToPositions(page, 2);
  await fixture(page, { experimentRunSerial: initial.beehive.experimentRunSerial, day: null });
  await assertContext(page, 2, 'Unmarked comb'); await returnToPositions(page, 2, 'Space');
  const final = await work(page);
  expect(final.beehive.notebook).toEqual(initial.beehive.notebook); expect(final.otherTool).toEqual(initial.otherTool);
  expect(final.beehive.actionPoints).toBe(initial.beehive.actionPoints); expect(final.beehive.hive3dFoundQueen).toBe(false);
  // Capture remained fixed before the deliberately invalidated reference.
  expect(held).toHaveLength(4); expect(errors).toEqual([]);
});

async function capture(page: Page, mode: string) {
  const position = await context(page).evaluate(node => {
    const box = node.getBoundingClientRect();
    return { top: box.top + window.scrollY, height: box.height, x: box.x, width: box.width };
  });
  fs.mkdirSync(artifactDir, { recursive: true });
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(16); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const scroll = await page.evaluate(() => window.scrollY), y = position.top + offset - scroll;
    expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-read-context-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifactDir, file), animations: 'disabled', fullPage: false, clip: { x: position.x, y, width: position.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifactDir, 'preview-read-context-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('read context and return navigation remain readable across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await hold(page); await role(page, 'open_brood').click(); await changeDisclosure(page, true);
  await handoff(page, 0); await handoff(page, 2); const initial = await work(page), held = await studyState(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') { await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 }); }
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') { await page.emulateMedia({ forcedColors: 'none' }); await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; }); }
    const violations = await context(page).evaluate(async node => {
      const result = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
      return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => entry.target) }));
    }); expect(violations).toEqual([]);
    const layout = await context(page).evaluate(node => {
      const elements = [node, ...Array.from(node.querySelectorAll('div,p,strong,span,button'))], font = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return { overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, excess: el.scrollWidth - el.clientWidth })),
        text: elements.slice(1).map(el => ({ size: parseFloat(getComputedStyle(el).fontSize) / font, ellipsis: getComputedStyle(el).textOverflow })),
        controls: Array.from(node.querySelectorAll('button')).map(el => { const box = el.getBoundingClientRect(); return { width: box.width, height: box.height }; }),
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
    layout.text.forEach(item => { expect(item.size).toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); });
    expect(layout.controls).toHaveLength(1); layout.controls.forEach(item => { expect(item.width).toBeGreaterThanOrEqual(44); expect(item.height).toBeGreaterThanOrEqual(44); });
    await assertContext(page, 2, 'Open brood');
    await back(page).focus(); await page.keyboard.press('Tab'); await expect(panel(page).locator('[data-interior-lens-toggle]')).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(back(page)).toBeFocused();
    const focus = await back(page).evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle, ink: css.color, paper: css.backgroundColor }; });
    expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none');
    if (mode === 'forced') expect(focus.ink).not.toBe(focus.paper);
    await returnToPositions(page, 2, 'Enter'); await returnToPositions(page, 2, 'Space');
    await back(page).focus(); await capture(page, mode);
    expect(await work(page)).toEqual(mode === 'wide' ? initial : { ...initial, beehive: { ...initial.beehive, focusLayout: false } });
    expect(await studyState(page)).toEqual(held);
  }
  expect(errors).toEqual([]);
});
