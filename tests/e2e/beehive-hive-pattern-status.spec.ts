import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_PATTERN_STATUS_ARTIFACTS || '.codex-artifacts/bee-hive-pattern-status-2026-10-14');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function status(page: Page) { return page.locator('[data-interior-pattern-status]'); }
function action(page: Page) { return status(page).locator('[data-interior-show-matching]'); }
function note(page: Page) { return status(page).locator('[data-interior-highlight-note]'); }
function panel(page: Page) { return page.locator('[data-hive-interior]'); }
function frame(page: Page, index: number) { return panel(page).locator('[data-interior-frame="' + index + '"]'); }
function topic(page: Page, id: string) { return panel(page).locator('[data-interior-topic="' + id + '"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__patternStatusAwards); }
async function patch(page: Page, value: Record<string, unknown>) {
  await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value);
}

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive pattern status fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the hive pattern status test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: false, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 40, workers: 12000, capacity: 80,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 100,
      queenTransition: null, activeEvent: null, actionPoints: 3,
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 } },
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0,
      hive3dFramesSeen: [0], hive3dPart: null, hive3dFoundQueen: false,
      inspectionDraft: { brood: 'spotty', cells: 'no' }, inspectionsDone: 2,
      lastInspection: { day: 40, framesRead: 1, queenFound: false, brood: 'solid', cells: 'yes', broodCorrect: true, cellsCorrect: true },
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.',
        explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__patternStatusAwards = []; w.__patternStatusWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__patternStatusAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name];
      w.__ctx[name] = function(...args: any[]) { w.__patternStatusWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
  });
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed', { timeout: 30000 });
  await keyboardActivate(page, topic(page, 'brood'), 'Enter');
  await expect(status(page)).toBeVisible();
}

async function keyboardActivate(page: Page, control: Locator, key: 'Enter' | 'Space') {
  // Establish keyboard modality after any management action used a pointer.
  await page.keyboard.press('Tab'); await control.focus(); await expect(control).toBeFocused();
  const focus = await control.evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none'); await page.keyboard.press(key);
}

// Use the established comb rule directly rather than the new guide helper.
// Each drawn grid position belongs to an illustration, never a measured cell census.
async function expectedPatterns(page: Page, topicId: string, roleId: string | null) {
  return page.evaluate(({ topicId, roleId }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive, raw = w.__toolData.beehive;
    const known = ['honey', 'pollen', 'brood', 'queenHealth'].every(key => Number.isFinite(raw[key]) && raw[key] >= 0 && raw[key] <= (key === 'queenHealth' ? 100 : 1000000));
    const allowed = roleId === 'empty' ? ['empty', 'foundation'] : roleId ? [roleId] :
      topicId === 'food' ? ['honey'] : topicId === 'pollen' ? ['pollen'] : topicId === 'brood' ? ['open_brood', 'capped_brood', 'drone_brood'] : [];
    return Array.from({ length: 6 }, (_, frame) => {
      const cells: string[] = [];
      if (known) for (let row = 0; row < 11; row++) for (let col = 0; col < 21; col++) {
        cells.push(BH.bhCombCellRole((col - 10) / 10, 1 - row / 5, {
          honeyFill: Math.min(.5, raw.honey / 60), broodFill: Math.min(1, raw.brood / 12000),
          pollenLevel: Math.min(1, raw.pollen / 30), layingRate: raw.queenHealth / 100,
          frameDepth: Math.abs(frame - 2.5) / 2.5,
        }));
      }
      const matching = cells.filter(id => allowed.includes(id)).length;
      const pattern = !known ? 'unavailable' : !allowed.length ? 'unmapped' : matching ? 'shown' : 'absent';
      return { frame, pattern, matching, cells, allowed };
    });
  }, { topicId, roleId });
}
async function checkStatus(page: Page, expectedState: string, topicId = 'brood', roleId: string | null = null) {
  const labels: Record<string, string> = { shown: 'Shown here', elsewhere: 'Shown on another frame', absent: 'No matching marks', unmapped: 'Queen not mapped', unavailable: 'Unavailable' };
  const expected = await expectedPatterns(page, topicId, roleId), current = (await work(page)).beehive.hive3dFrame;
  const currentPattern = expected[current];
  const independentState = currentPattern.pattern === 'absent' && expected.some(item => item.pattern === 'shown') ? 'elsewhere' : currentPattern.pattern;
  expect(independentState).toBe(expectedState);
  await expect(status(page)).toHaveAttribute('data-interior-pattern-status', expectedState);
  await expect(status(page).locator('[data-interior-pattern-context]')).toHaveText('Current model · Frame ' + (current + 1) + ' of 6');
  await expect(status(page).locator('[data-interior-pattern-label]')).toHaveText(labels[expectedState]);
  await expect(note(page)).toHaveAttribute('id', 'beehive-interior-pattern-note');
  await expect(note(page)).toHaveAttribute('role', 'status'); await expect(note(page)).toHaveAttribute('aria-live', 'polite');
  const drawn = await panel(page).locator('[data-interior-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-interior-cell')));
  if (expectedState !== 'unavailable') expect(drawn).toEqual(currentPattern.cells);
  await expect(panel(page).locator('[data-interior-cell][data-highlighted="true"]')).toHaveCount(currentPattern.matching);
  if (expectedState === 'elsewhere') {
    await expect(action(page)).toHaveAccessibleName('Show matching frame'); await expect(action(page)).toBeEnabled();
    await expect(action(page)).toHaveAttribute('aria-describedby', 'beehive-interior-pattern-note');
    await expect(note(page)).toContainText('Matching marks are shown on another current frame.');
  } else await expect(action(page)).toHaveCount(0);
  if (expectedState === 'absent') {
    await expect(note(page)).toContainText('No matching marks for Developing brood are shown across the six current model frames.');
    await expect(note(page)).toContainText('This drawing does not measure cell counts.');
  }
  if (expectedState === 'unmapped') await expect(note(page)).toContainText(/queen/i);
  if (expectedState === 'unavailable') await expect(note(page)).toContainText(/unavailable|recorded|missing/i);
  return expected;
}

async function assertFrameState(page: Page, before: any, target: number) {
  const expected = JSON.parse(JSON.stringify(before));
  Object.assign(expected.beehive, { hive3dFrame: target, hive3dPart: 'brood_frames', hive3dExploded: true,
    hive3dFramesSeen: [...new Set([...before.beehive.hive3dFramesSeen, target])] });
  expect(await work(page)).toEqual(expected); await expect(frame(page, target)).toHaveAttribute('aria-pressed', 'true');
}

async function matchFrame(page: Page, key: 'Enter' | 'Space') {
  const before = await work(page), beforeAwards = await awards(page), patterns = await expectedPatterns(page, 'brood', null);
  const current = before.beehive.hive3dFrame;
  const target = Array.from({ length: 5 }, (_, index) => (current + index + 1) % 6).find(index => patterns[index].pattern === 'shown');
  expect(target).toBeDefined(); await keyboardActivate(page, action(page), key);
  await assertFrameState(page, before, target!); expect(await awards(page)).toEqual(beforeAwards);
  const heading = panel(page).locator('[data-interior-read-title]');
  await expect(heading).toHaveAttribute('id', 'beehive-interior-read-title');
  await expect(heading).toHaveAttribute('data-beehive-focus-panel', 'true'); await expect(heading).toBeFocused();
  const focus = await heading.evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).toBe('solid'); await checkStatus(page, 'shown');
  // Holding identical readings and then moving a frame must use the same
  // illustration position for both sides, not freeze the held frame number.
  const drawn = await panel(page).locator('[data-interior-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-interior-cell')));
  const held = await panel(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-held-cell')));
  expect(held).toEqual(drawn);
}

async function checkReadOnlyRender(page: Page) {
  const before = await work(page), beforeAwards = await awards(page);
  await page.evaluate(async () => {
    const w = window as any; w.__patternStatusWrites = []; w.ReactDOM.flushSync(() => w.__rerender());
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__patternStatusWrites)).toEqual([]);
}

async function audit(page: Page, mode: string) {
  const result = await status(page).evaluate(async node => {
    const checked = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const words: { word: string; context: string; rects: { bottom: number; width: number }[] }[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      // SVG title/description provide the accessible image name; they are not
      // painted text and therefore have no visual line-box requirement.
      if (textNode.parentElement?.closest('svg')) continue;
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
      text: Array.from(node.querySelectorAll('summary,h3,h4,h5,p,strong,span,figcaption')).filter(el => el.textContent?.trim()).map(el => {
        const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, ellipsis: css.textOverflow, whiteSpace: css.whiteSpace };
      }),
      targets: Array.from(node.querySelectorAll('summary,button')).map(el => { const box = el.getBoundingClientRect(); return { width: box.width, height: box.height }; }),
      forcedAdjustments: window.matchMedia('(forced-colors: active)').matches ? [node, ...Array.from(node.querySelectorAll('*'))].map(el => ({ text: el.textContent, adjustment: getComputedStyle(el).forcedColorAdjust })) : [],
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'hive-pattern-status-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); expect(item.whiteSpace).not.toBe('nowrap'); }
  expect(result.words.length).toBeGreaterThan(0);
  for (const item of result.words) {
    expect(item.rects.length, item.word + ' must have visible text in ' + item.context).toBeGreaterThan(0);
    for (const rect of item.rects) expect(Math.abs(rect.bottom - item.rects[0].bottom), item.word + ' must stay on one line in ' + item.context).toBeLessThanOrEqual(1);
  }
  if (await action(page).count()) expect(result.targets.length).toBe(1);
  for (const item of result.targets) { expect(item.width).toBeGreaterThanOrEqual(44); expect(item.height).toBeGreaterThanOrEqual(44); }
  for (const item of result.forcedAdjustments) expect(item.adjustment, item.text || '').toBe('auto');
}

async function capture(page: Page, mode: string) {
  fs.mkdirSync(artifacts, { recursive: true });
  // Keep the summary focus outline inside the screenshot edge.
  const pad = 6;
  const position = await status(page).evaluate((node, pad) => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY - pad, height: box.height + pad * 2 }; }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(8); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await status(page).boundingBox(); expect(box).not.toBeNull(); const y = box!.y - pad + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2);
    const file = 'preview-hive-pattern-status-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-hive-pattern-status-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('hive pattern status distinguishes other frames from absent marks and opens a matching cutaway without changing colony work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter');
  await expect(panel(page).locator('[data-interior-reference]')).toHaveAttribute('data-reference-state', 'held');
  const initial = await work(page), initialAwards = await awards(page);
  const heldReadings = await panel(page).locator('[data-interior-comparison] [data-change-held]').allTextContents();
  await checkStatus(page, 'elsewhere'); await matchFrame(page, 'Enter');
  await expect(panel(page).locator('[data-interior-reading]')).toHaveText('6,000 cells');
  await audit(page, 'shown'); await capture(page, 'shown');
  expect(await panel(page).locator('[data-interior-comparison] [data-change-held]').allTextContents()).toEqual(heldReadings);

  // The established frame-guide control still hands focus to a frame button.
  const beforeOldRoute = await work(page), patterns = await expectedPatterns(page, 'brood', null);
  const next = Array.from({ length: 5 }, (_, index) => (beforeOldRoute.beehive.hive3dFrame + index + 1) % 6).find(index => patterns[index].pattern === 'shown');
  expect(next).toBeDefined(); await keyboardActivate(page, panel(page).locator('[data-interior-next-match]'), 'Space');
  await assertFrameState(page, beforeOldRoute, next!); await expect(frame(page, next!)).toBeFocused();
  const beforeOutside = await work(page); await keyboardActivate(page, frame(page, 0), 'Enter'); await assertFrameState(page, beforeOutside, 0);
  await checkStatus(page, 'elsewhere'); await matchFrame(page, 'Space');
  const explored = await work(page);
  expect(explored.beehive.notebook).toEqual(initial.beehive.notebook);
  expect(explored.beehive.inspectionDraft).toEqual(initial.beehive.inspectionDraft);
  expect(explored.beehive.lastInspection).toEqual(initial.beehive.lastInspection);
  expect(explored.beehive.actionPoints).toBe(initial.beehive.actionPoints); expect(explored.otherTool).toEqual(initial.otherTool);
  expect(await awards(page)).toEqual(initialAwards); await checkReadOnlyRender(page);

  await patch(page, { honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 });
  const empty = await work(page); await checkStatus(page, 'absent'); await audit(page, 'absent'); await capture(page, 'absent');
  await checkReadOnlyRender(page); expect(await work(page)).toEqual(empty);
  await keyboardActivate(page, topic(page, 'queen'), 'Enter'); await checkStatus(page, 'unmapped', 'queen');
  await audit(page, 'unmapped'); await capture(page, 'unmapped'); expect(await work(page)).toEqual(empty);
  expect((await work(page)).beehive.hive3dFoundQueen).toBe(false);

  await patch(page, { honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 100, hive3dFrame: 0 });
  await keyboardActivate(page, topic(page, 'brood'), 'Enter'); await checkStatus(page, 'elsewhere');
  // Retain a formerly valid action across a synchronous missing-reading
  // update: it must not move the frame from an unavailable pattern.
  const guarded = await page.evaluate(() => {
    const w = window as any, button = document.querySelector('[data-interior-show-matching]') as HTMLButtonElement;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', { honey: null }));
    const before = JSON.parse(JSON.stringify(w.__toolData)); button.click(); return { before, after: JSON.parse(JSON.stringify(w.__toolData)) };
  });
  expect(guarded.after).toEqual(guarded.before); await checkStatus(page, 'unavailable');
  await audit(page, 'unavailable'); await capture(page, 'unavailable'); await checkReadOnlyRender(page);
  expect(await panel(page).locator('[data-interior-comparison] [data-change-held]').allTextContents()).toEqual(heldReadings);
  expect(await awards(page)).toEqual(initialAwards); expect(errors).toEqual([]);
});

test('hive pattern status keeps its frame context and matching-frame action readable across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const before = await work(page), beforeAwards = await awards(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    await checkStatus(page, 'elsewhere'); await page.keyboard.press('Tab'); await action(page).focus(); await expect(action(page)).toBeFocused();
    const focus = await action(page).evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
    expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).toBe('solid');
    await audit(page, mode); await capture(page, mode); await checkReadOnlyRender(page);
    expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  }
  expect(errors).toEqual([]);
});
