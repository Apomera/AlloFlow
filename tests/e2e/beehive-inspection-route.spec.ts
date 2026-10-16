import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve('.codex-artifacts/bee-inspection-route-2026-10-13');
const kinds = ['Outside', 'Shoulder', 'Centre', 'Centre', 'Shoulder', 'Outside'];
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function preparation(page: Page) { return page.locator('[data-inspection-preparation="true"]'); }
function frame(page: Page, index: number) { return preparation(page).locator('[data-inspection-frame="' + index + '"]'); }
function returnButton(page: Page) { return page.locator('[data-interior-inspection-return="true"]'); }
function review(page: Page) { return page.locator('[data-inspection-feedback="true"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__inspectionRouteAwards); }
async function patch(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch)); }, patch);
}

async function mount(page: Page, ready = false) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(ready => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    if (!ready) {
      w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported inspection-route fallback'));
      w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the inspection-route fallback test'); };
    }
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: false, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 40, workers: 12000, capacity: 80,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 100,
      queenTransition: null, activeEvent: null, actionPoints: 3,
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 } },
      show3dHive: false, hive3dExploded: true, hive3dFrame: 2,
      hive3dFramesSeen: [2, 2, '1', null, 6, -1, 1.5, 0], hive3dPart: 'brood_frames', hive3dFoundQueen: false,
      inspectionDraft: { brood: 'spotty', cells: 'no' }, inspectionsDone: 2,
      lastInspection: { day: 40, framesRead: 1, queenFound: false, brood: 'solid', cells: 'no', broodCorrect: true, cellsCorrect: false },
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.',
        explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__inspectionRouteAwards = []; w.__inspectionRouteWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__inspectionRouteAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name];
      w.__ctx[name] = function(...args: any[]) { w.__inspectionRouteWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
  }, ready);
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', ready ? 'ready' : 'failed', { timeout: 30000 });
  await expect(preparation(page)).toBeVisible();
}

async function keyboardActivate(page: Page, control: Locator, key: 'Enter' | 'Space') {
  await control.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(control).toBeFocused();
  const focus = await control.evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none'); await page.keyboard.press(key);
}

async function checkFrames(page: Page, selected: number, visits: number[]) {
  await expect(preparation(page).locator('[data-inspection-frame-progress]')).toHaveText('Frames explored: ' + visits.length + ' of 6');
  await expect(preparation(page).locator('[data-inspection-frame]')).toHaveCount(6);
  await expect(preparation(page).locator('[data-inspection-frame][aria-pressed="true"]')).toHaveCount(1);
  for (let index = 0; index < 6; index++) {
    await expect(frame(page, index)).toHaveAttribute('aria-pressed', String(index === selected));
    await expect(frame(page, index)).toHaveAttribute('data-visited', String(visits.includes(index)));
    await expect(frame(page, index)).toContainText('Frame ' + (index + 1));
    await expect(frame(page, index)).toContainText(kinds[index]);
    await expect(frame(page, index)).toContainText(visits.includes(index) ? 'Visited' : 'Not yet visited');
    await expect(frame(page, index)).toBeEnabled();
  }
  await expect(page.locator('[data-hive-interior] [data-interior-frame="' + selected + '"]')).toHaveAttribute('aria-pressed', 'true');
  const quest = await page.evaluate(() => {
    const w = window as any, hook = w.StemLab._registry.beehive.questHooks.find((item: any) => item.id === 'read_every_frame');
    return { done: hook.check(w.__toolData.beehive), progress: hook.progress(w.__toolData.beehive) };
  });
  expect(quest.done).toBe(visits.length === 6); expect(quest.progress).toBe(visits.length + '/6 frames');
}

async function checkReadOnlyRender(page: Page) {
  const before = await work(page), beforeAwards = await awards(page);
  await page.evaluate(async () => {
    const w = window as any; w.__inspectionRouteWrites = []; w.ReactDOM.flushSync(() => w.__rerender());
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__inspectionRouteWrites)).toEqual([]);
}

async function audit(page: Page, mode: string) {
  const result = await preparation(page).evaluate(async node => {
    const checked = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const words: { word: string; context: string; rects: { bottom: number; width: number }[] }[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      const text = textNode.textContent || '';
      for (const match of text.matchAll(/\S+/g)) {
        const range = document.createRange(); range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
        words.push({ word: match[0], context: textNode.parentElement?.textContent || text,
          rects: Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0).map(rect => ({ bottom: rect.bottom, width: rect.width })) });
      }
    }
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: [node, ...Array.from(node.querySelectorAll('*'))].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })), words,
      text: Array.from(node.querySelectorAll('button,h3,h4,h5,p,strong,span')).filter(el => el.textContent?.trim()).map(el => {
        const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, ellipsis: css.textOverflow, whiteSpace: css.whiteSpace };
      }),
      targets: Array.from(node.querySelectorAll('button')).map(el => { const box = el.getBoundingClientRect(); return { width: box.width, height: box.height }; }),
      forcedAdjustments: window.matchMedia('(forced-colors: active)').matches ? [node, ...Array.from(node.querySelectorAll('*'))].map(el => ({ text: el.textContent, adjustment: getComputedStyle(el).forcedColorAdjust })) : [],
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'inspection-route-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); expect(item.whiteSpace).not.toBe('nowrap'); }
  expect(result.words.length).toBeGreaterThan(0);
  for (const item of result.words) {
    expect(item.rects.length, item.word + ' must have visible text in ' + item.context).toBeGreaterThan(0);
    for (const rect of item.rects) expect(Math.abs(rect.bottom - item.rects[0].bottom), item.word + ' must stay on one line in ' + item.context).toBeLessThanOrEqual(1);
  }
  for (const item of result.targets) { expect(item.width).toBeGreaterThanOrEqual(44); expect(item.height).toBeGreaterThanOrEqual(44); }
  for (const item of result.forcedAdjustments) expect(item.adjustment, item.text || '').toBe('auto');
}

async function capture(page: Page, mode: string) {
  fs.mkdirSync(artifacts, { recursive: true });
  const position = await preparation(page).evaluate(node => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY, height: box.height }; });
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(8); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await preparation(page).boundingBox(); expect(box).not.toBeNull(); const y = box!.y + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-inspection-route-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x: box!.x, y, width: box!.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-inspection-route-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('inspection preparation routes through every readable frame and records normalized visits without changing colony work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await checkFrames(page, 2, [2, 0]); await expect(page.locator('[data-inspection-queen-link]')).toHaveCount(0);
  await expect(page.locator('[data-inspection-queen-status]')).toContainText(/unavailable/i);
  const initialAwards = await awards(page), initial = await work(page), savedText = await review(page).innerText();
  for (let index = 0; index < 6; index++) {
    const before = await work(page), visits = [...new Set(before.beehive.hive3dFramesSeen.filter((value: unknown) => Number.isInteger(value) && Number(value) >= 0 && Number(value) < 6).concat(index))];
    await keyboardActivate(page, frame(page, index), index % 2 ? 'Space' : 'Enter');
    await expect(page.locator('#beehive-interior-read-title')).toBeFocused();
    const expected = JSON.parse(JSON.stringify(before)); Object.assign(expected.beehive, { hive3dFrame: index, hive3dPart: 'brood_frames', hive3dExploded: true, hive3dFramesSeen: visits });
    expect(await work(page)).toEqual(expected); expect(await awards(page)).toEqual(initialAwards); await checkFrames(page, index, visits);
    await keyboardActivate(page, returnButton(page), 'Enter'); await expect(page.locator('#beehive-guided-inspection-title')).toBeFocused();
    expect(await work(page)).toEqual(expected); expect(await review(page).innerText()).toBe(savedText);
  }
  await page.locator('[data-hive-interior] [data-interior-frame="1"]').click(); await checkFrames(page, 1, [2, 0, 1, 3, 4, 5]);
  const beforeReading = await work(page); await keyboardActivate(page, page.locator('[data-inspection-queen-reading]'), 'Space');
  await expect(page.locator('#beehive-interior-detail-title')).toBeFocused(); await expect(page.locator('[data-interior-detail="queen"]')).toBeVisible();
  expect(await work(page)).toEqual(beforeReading); expect((await work(page)).beehive.hive3dFoundQueen).toBe(false);
  await keyboardActivate(page, returnButton(page), 'Enter'); await expect(page.locator('#beehive-guided-inspection-title')).toBeFocused();
  expect(await work(page)).toEqual(beforeReading); await checkReadOnlyRender(page);
  // Only valid unique frame indices count. Looking for the queen remains optional
  // when recording answers, including in the supported no-WebGL workflow.
  await patch(page, { hive3dFramesSeen: [0, 0, '1', 1, null, 6, -1, 1.5], hive3dFoundQueen: false });
  await checkFrames(page, 1, [0, 1]);
  await page.locator('[data-inspection-choice="brood:solid"]').click(); await page.locator('[data-inspection-choice="cells:yes"]').click();
  await expect(page.locator('[data-inspection-record]')).toBeEnabled(); const beforeRecord = await work(page);
  await keyboardActivate(page, page.locator('[data-inspection-record]'), 'Enter');
  const expected = JSON.parse(JSON.stringify(beforeRecord));
  Object.assign(expected.beehive, { inspectionDraft: {}, inspectionsDone: 3, lastInspection: { day: 40, framesRead: 2, queenFound: false, brood: 'solid', cells: 'yes', broodCorrect: true, cellsCorrect: true } });
  expect(await work(page)).toEqual(expected); expect(await awards(page)).toEqual([...initialAwards, ['beehive', 14, 'Guided hive inspection']]);
  expect(expected.beehive.notebook).toEqual(initial.beehive.notebook); expect(expected.beehive.actionPoints).toBe(3); expect(errors).toEqual([]);
});

test('inspection preparation keeps frame progress and queen availability readable across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const before = await work(page), beforeAwards = await awards(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    await checkFrames(page, 2, [2, 0]); await frame(page, 2).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(frame(page, 2)).toBeFocused();
    await audit(page, mode); await capture(page, mode); await checkReadOnlyRender(page);
    expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  }
  expect(errors).toEqual([]);
});

test('inspection queen handoff focuses the live finder without claiming the queen was found', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page, true);
  const bay = page.locator('[data-beehive-3d-bay="hive"]'); await bay.locator('canvas').scrollIntoViewIfNeeded();
  await expect.poll(async () => (await harness.glScene(page, '[data-beehive-3d-bay="hive"]'))?.renders || 0).toBeGreaterThan(0);
  expect((await harness.glScene(page, '[data-beehive-3d-bay="hive"]'))?.visibleMeshes).toBeGreaterThan(0);
  // The existing 3D step buttons are the second frame-visit writer. They must
  // normalize an older malformed list just like the new cutaway shortcuts.
  const beforeStep = await work(page), stepAwards = await awards(page);
  await keyboardActivate(page, page.locator('[data-hive-frame-step="next"]'), 'Space');
  const afterStep = JSON.parse(JSON.stringify(beforeStep));
  Object.assign(afterStep.beehive, { hive3dFrame: 3, hive3dPart: 'brood_frames', hive3dExploded: true, hive3dFramesSeen: [2, 0, 3] });
  expect(await work(page)).toEqual(afterStep); expect(await awards(page)).toEqual(stepAwards); await checkFrames(page, 3, [2, 0, 3]);
  const before = await work(page), beforeAwards = await awards(page), savedText = await review(page).innerText();
  const link = page.locator('[data-inspection-queen-link="true"]'), finder = page.locator('[data-hive-queen-finder="true"]');
  await expect(link).toHaveAccessibleName('Go to queen finder'); await expect(finder).toBeEnabled();
  await keyboardActivate(page, link, 'Enter'); await expect(finder).toBeFocused();
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  await keyboardActivate(page, page.locator('[data-inspection-queen-reading]'), 'Space');
  await expect(page.locator('#beehive-interior-detail-title')).toBeFocused(); expect(await work(page)).toEqual(before);
  await keyboardActivate(page, returnButton(page), 'Enter'); await expect(page.locator('#beehive-guided-inspection-title')).toBeFocused();
  await audit(page, 'ready'); await capture(page, 'ready');
  await keyboardActivate(page, link, 'Space'); await expect(finder).toBeFocused();
  await page.keyboard.press('Enter');
  const expected = JSON.parse(JSON.stringify(before)); Object.assign(expected.beehive, { hive3dPart: 'queen', hive3dFoundQueen: true });
  expect(await work(page)).toEqual(expected); expect(await awards(page)).toEqual(beforeAwards); expect(await review(page).innerText()).toBe(savedText);
  await expect(finder).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-inspection-queen-status]')).toContainText('Illustrated queen selected during this colony run.');
  await checkReadOnlyRender(page); expect(errors).toEqual([]);
});
