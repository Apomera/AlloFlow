import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800,
});
const artifacts = path.resolve('.codex-artifacts/bee-frame-navigation-2026-10-13');
const kinds = ['Outside', 'Shoulder', 'Centre', 'Centre', 'Shoulder', 'Outside'];
const names = { previous: 'Previous frame, toward the front of the box', next: 'Next frame, toward the back of the box' };
type Direction = 'previous' | 'next';

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function bay(page: Page) { return page.locator('[data-beehive-3d-bay="hive"]'); }
function camera(page: Page) { return page.locator('[data-bee-3d-camera-controls="hive"]'); }
function navigation(page: Page) { return camera(page).locator('[data-hive-frame-navigation="true"]'); }
function button(page: Page, direction: Direction) { return navigation(page).locator('[data-hive-frame-step="' + direction + '"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }

// Record the scene props supplied to the real viewer, then forward sync
// unchanged. The harness separately verifies that the actual WebGL scene renders.
const viewerProbe = `
(function () {
  var original = window.StemLab.makeBayViewer;
  window.__frameViewers = [];
  window.StemLab.makeBayViewer = function (cfg) {
    var viewer = original.call(this, cfg), sync = viewer.sync;
    var entry = { sceneProps: null, syncs: 0 };
    window.__frameViewers.push(entry);
    viewer.sync = function (options) {
      if (options && options.sceneProps) entry.sceneProps = Object.assign({}, options.sceneProps);
      entry.syncs++;
      return sync.apply(this, arguments);
    };
    return viewer;
  };
})();
`;

async function prepare(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.route('**/stem_lab/stem_tool_beehive.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: viewerProbe + await response.text() });
  });
}

async function mount(page: Page, failed = false) {
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(failed => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    if (failed) {
      w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported frame-navigation fallback'));
      w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the frame-navigation fallback test'); };
    }
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: false, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000, honey: 40,
      syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: !failed, hive3dExploded: false, hive3dFrame: 2, hive3dFramesSeen: [2],
      hive3dPart: null, hive3dFoundQueen: false,
      notebook: {
        beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.',
          explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' },
        synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' },
      },
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
  }, failed);
  // Opening after mount installs the hive's status subscription before the
  // forced renderer failure, matching the learner's normal entry point.
  if (failed) {
    await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#beehive-interior-title')).toBeFocused();
  }
  await expect(bay(page)).toHaveAttribute('data-beehive-3d-status', failed ? 'failed' : 'ready', { timeout: 30000 });
  await expect(navigation(page)).toBeVisible();
}

async function checkSelection(page: Page, index: number, ready: boolean) {
  const nav = navigation(page);
  await expect(nav).toHaveCount(1); await expect(nav).toHaveAttribute('role', 'group');
  await expect(nav).toHaveAccessibleName('Choose which brood frame to read');
  await expect(nav.getByRole('status')).toHaveCount(1);
  await expect(nav.locator('[data-hive-frame-readout="true"]')).toHaveAttribute('role', 'status');
  await expect(nav.locator('[data-hive-frame-readout="true"]')).toHaveText('Frame ' + (index + 1) + '/6 · ' + kinds[index] + ' frame');
  await expect(nav.locator('[data-hive-frame-position]')).toHaveCount(6);
  await expect(nav.locator('[data-hive-frame-position][data-selected="true"]')).toHaveCount(1);
  for (let position = 0; position < 6; position++) {
    const marker = nav.locator('[data-hive-frame-position="' + position + '"]');
    expect(await marker.evaluate(node => !!node.closest('[aria-hidden="true"]'))).toBe(true);
    await expect(marker).toHaveAttribute('data-selected', String(position === index));
    await expect(marker).toBeVisible();
  }
  await expect(nav.locator('button')).toHaveCount(2);
  for (const direction of ['previous', 'next'] as const) {
    const step = button(page, direction);
    await expect(step).toHaveAccessibleName(names[direction]); await expect(step).toHaveAttribute('title', names[direction]);
    await expect(step).toContainText(direction === 'previous' ? 'Previous frame' : 'Next frame');
    if (!ready || index === (direction === 'previous' ? 0 : 5)) await expect(step).toBeDisabled();
    else await expect(step).toBeEnabled();
  }
  const cutaway = page.locator('[data-hive-interior]');
  await expect(cutaway.locator('[data-interior-frame][aria-pressed="true"]')).toHaveCount(1);
  await expect(cutaway.locator('[data-interior-frame="' + index + '"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(cutaway.locator('[data-interior-frame-note]')).toContainText('Frame ' + (index + 1) + ' of 6 · ' + kinds[index]);
  await expect(cutaway.locator('[data-hive-interior-diagram]')).toHaveAccessibleName(new RegExp('Frame ' + (index + 1) + ' of 6, ' + kinds[index].toLowerCase() + ' frame'));
  await expect.poll(() => page.evaluate(() => (window as any).__frameViewers[0].sceneProps.frameIndex)).toBe(index);
}

async function keyboardActivate(page: Page, control: Locator, key: 'Enter' | 'Space') {
  await control.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(control).toBeFocused();
  const focus = await control.evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none');
  await page.keyboard.press(key);
}

async function step(page: Page, direction: Direction, key?: 'Enter' | 'Space') {
  const before = await work(page), previous = before.beehive.hive3dFrame;
  const selected = Math.max(0, Math.min(5, previous + (direction === 'previous' ? -1 : 1)));
  expect(selected).not.toBe(previous);
  const control = button(page, direction);
  if (key) await keyboardActivate(page, control, key); else await control.click();
  const expected = JSON.parse(JSON.stringify(before));
  Object.assign(expected.beehive, { hive3dFrame: selected, hive3dPart: 'brood_frames', hive3dExploded: true,
    hive3dFramesSeen: [...new Set([...before.beehive.hive3dFramesSeen, previous, selected])] });
  // A full-state comparison covers notebook writing, AP, days and other tools.
  expect(await work(page)).toEqual(expected);
  await checkSelection(page, selected, true);
  if (key && selected !== (direction === 'previous' ? 0 : 5)) await expect(control).toBeFocused();
  return selected;
}

async function audit(page: Page, mode = 'ready') {
  const result = await navigation(page).evaluate(async node => {
    const forcedColors = window.matchMedia('(forced-colors: active)').matches;
    // axe 4.12.1 reads -webkit-text-fill-color before color. Chromium can
    // preserve that author value while painting system colors. In this mode
    // check system-palette participation and review the bounded capture;
    // all other modes retain axe's full color-contrast check.
    const checked = await (window as any).axe.run(node, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false }, 'color-contrast': { enabled: !forcedColors } },
    });
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    let forced: { canvasText: string; canvas: string; adjustments: { tag: string; value: string }[]; status: string; selected: { text: string; background: string } } | null = null;
    if (forcedColors) {
      const probe = document.createElement('span');
      probe.style.cssText = 'position:fixed;visibility:hidden;color:CanvasText;background:Canvas;forced-color-adjust:auto';
      document.body.appendChild(probe);
      try {
        const selected = getComputedStyle(node.querySelector('[data-hive-frame-position][data-selected="true"]')!);
        forced = { canvasText: getComputedStyle(probe).color, canvas: getComputedStyle(probe).backgroundColor,
          adjustments: [node, ...Array.from(node.querySelectorAll('*'))].map(el => ({ tag: el.tagName, value: getComputedStyle(el).forcedColorAdjust })),
          status: getComputedStyle(node.querySelector('[data-hive-frame-readout]')!).color,
          selected: { text: selected.color, background: selected.backgroundColor } };
      } finally { probe.remove(); }
    }
    return {
      forced,
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: [node, ...Array.from(node.querySelectorAll('*'))].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: Array.from(node.querySelectorAll('button,strong,p,[data-hive-frame-readout],.bee-3d-frame-direction span')).map(el => {
        const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, ellipsis: css.textOverflow, whiteSpace: css.whiteSpace };
      }),
      // A label can fit its box while breaking a word into "Previo" / "us".
      // Measure each actual text range to catch that loss of readability.
      words: Array.from(node.querySelectorAll('.bee-3d-frame-step-label')).flatMap(label => {
        const words: { word: string; rects: { top: number; bottom: number; width: number }[] }[] = [];
        const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT); let textNode: Node | null;
        while ((textNode = walker.nextNode())) {
          const text = textNode.textContent || '';
          for (const match of text.matchAll(/\S+/g)) {
            const range = document.createRange(); range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
            const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0)
              .map(rect => ({ top: rect.top, bottom: rect.bottom, width: rect.width }));
            words.push({ word: match[0], rects });
          }
        }
        return words;
      }),
      buttons: Array.from(node.querySelectorAll('button')).map(el => {
        const box = el.getBoundingClientRect(), css = getComputedStyle(el);
        return { width: box.width, height: box.height, opacity: css.opacity, border: css.borderStyle, disabled: el.disabled };
      }),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      panelWidth: node.getBoundingClientRect().width,
      cameraWidth: node.closest('[data-bee-3d-camera-controls]')!.getBoundingClientRect().width,
      selected: (() => {
        const css = getComputedStyle(node.querySelector('[data-hive-frame-position][data-selected="true"]')!);
        return { border: css.borderStyle, outline: parseFloat(css.outlineWidth) };
      })(),
    };
  });
  if (result.forced) {
    fs.mkdirSync(artifacts, { recursive: true });
    fs.writeFileSync(path.join(artifacts, 'frame-navigation-forced-colors.json'), JSON.stringify(result.forced, null, 2));
    for (const element of result.forced.adjustments) expect(element.value, element.tag + ' must use the system palette').toBe('auto');
    expect(result.forced.status).toBe(result.forced.canvasText);
    expect(result.forced.selected.text).toBe(result.forced.canvasText);
    expect(result.forced.selected.background).toBe(result.forced.canvas);
  }
  fs.mkdirSync(artifacts, { recursive: true });
  fs.writeFileSync(path.join(artifacts, 'frame-navigation-word-layout-' + mode + '.json'), JSON.stringify(result.words, null, 2));
  expect(result.words.map(item => item.word)).toEqual(['Previous', 'frame', 'Next', 'frame']);
  for (const item of result.words) {
    expect(item.rects.length, item.word + ' must have visible text').toBeGreaterThan(0);
    const baseline = item.rects[0].bottom;
    for (const rect of item.rects) expect(Math.abs(rect.bottom - baseline), item.word + ' must stay on one line').toBeLessThanOrEqual(1);
  }
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(Math.abs(result.panelWidth - result.cameraWidth)).toBeLessThanOrEqual(1);
  expect(result.selected.border).toBe('double'); expect(result.selected.outline).toBeGreaterThanOrEqual(2);
  for (const text of result.text) {
    expect(text.size, text.text || '').toBeGreaterThanOrEqual(.875); expect(text.ellipsis).not.toBe('ellipsis'); expect(text.whiteSpace).not.toBe('nowrap');
  }
  for (const item of result.buttons) {
    expect(item.width).toBeGreaterThanOrEqual(44); expect(item.height).toBeGreaterThanOrEqual(44);
    expect(item.opacity).toBe('1'); if (item.disabled) expect(item.border).toBe('dashed');
  }
}

async function capture(page: Page, mode: string) {
  fs.mkdirSync(artifacts, { recursive: true });
  const position = await navigation(page).evaluate(node => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY, height: box.height }; });
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(10); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await navigation(page).boundingBox(); expect(box).not.toBeNull(); const y = box!.y + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-frame-navigation-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x: box!.x, y, width: box!.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-frame-navigation-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('labeled frame navigation keeps the live hive, position rail and cutaway in sync without changing colony work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await prepare(page); await mount(page);
  await bay(page).locator('canvas').scrollIntoViewIfNeeded();
  await expect.poll(async () => (await harness.glScene(page, '[data-beehive-3d-bay="hive"]'))?.renders || 0).toBeGreaterThan(0);
  const live = await harness.glScene(page, '[data-beehive-3d-bay="hive"]'); expect(live?.visibleMeshes).toBeGreaterThan(0);
  await checkSelection(page, 2, true);
  await step(page, 'previous', 'Enter'); await step(page, 'previous');
  const front = await work(page); await button(page, 'previous').evaluate(node => (node as HTMLButtonElement).click());
  expect(await work(page)).toEqual(front); await checkSelection(page, 0, true);
  await step(page, 'next', 'Space'); await step(page, 'next', 'Enter');
  await audit(page); await capture(page, 'ready');
  await step(page, 'next', 'Space'); await step(page, 'next', 'Enter'); await step(page, 'next');
  const back = await work(page); await button(page, 'next').evaluate(node => (node as HTMLButtonElement).click());
  expect(await work(page)).toEqual(back); await checkSelection(page, 5, true);
  expect(back.beehive.hive3dFramesSeen).toEqual([2, 1, 0, 3, 4, 5]);
  await step(page, 'previous', 'Enter');

  await page.evaluate(() => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', { day: 105 })); });
  await expect(page.locator('[data-hive-interior]')).toHaveAttribute('data-interior-season', 'winter');
  await expect(camera(page).getByRole('button', { name: 'Queen in cluster: the colony is wintering, so she cannot be shown on a frame', exact: true })).toBeDisabled();
  await checkSelection(page, 4, true); await step(page, 'previous', 'Space'); await step(page, 'next', 'Enter');
  expect((await work(page)).beehive.day).toBe(105); expect(errors).toEqual([]);
});

test('unavailable frame navigation remains readable and disabled across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await prepare(page); await mount(page, true);
  const initial = await work(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') await page.setViewportSize({ width: 320, height: 1800 });
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') {
      await page.emulateMedia({ forcedColors: 'none' });
      await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
    }
    await checkSelection(page, 2, false); await audit(page, mode); await capture(page, mode);
    const before = await page.evaluate(() => (window as any).__frameViewers.map((viewer: any) => viewer.syncs));
    await navigation(page).locator('button').evaluateAll(nodes => nodes.forEach(node => (node as HTMLButtonElement).click()));
    expect(await page.evaluate(() => (window as any).__frameViewers.map((viewer: any) => viewer.syncs))).toEqual(before);
    expect(await work(page)).toEqual(initial);
  }
  expect(errors).toEqual([]);
});
