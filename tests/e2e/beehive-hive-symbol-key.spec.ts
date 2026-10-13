import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import path from 'node:path';
import fs from 'node:fs';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
const artifacts = path.resolve('.codex-artifacts/bee-symbol-key-2026-10-12');
const roles = [
  { id: 'honey', topic: 'food', label: 'Food cells' }, { id: 'pollen', topic: 'pollen', label: 'Pollen cells' },
  { id: 'open_brood', topic: 'brood', label: 'Open brood' }, { id: 'capped_brood', topic: 'brood', label: 'Capped brood' },
  { id: 'drone_brood', topic: 'brood', label: 'Drone brood' }, { id: 'empty', topic: 'brood', label: 'Unmarked comb' },
];
const topicSamples = [
  { id: 'food', roles: ['honey'] }, { id: 'pollen', roles: ['pollen'] },
  { id: 'brood', roles: ['open_brood', 'capped_brood', 'drone_brood'] }, { id: 'queen', roles: [] },
];

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function interior(page: Page) { return page.locator('[data-hive-interior]'); }
function topic(page: Page, id: string) { return interior(page).locator('[data-interior-topic="' + id + '"]'); }
function role(page: Page, id: string) { return interior(page).locator('[data-interior-role="' + id + '"]'); }
function detail(page: Page) { return interior(page).locator('[data-interior-cell-detail]'); }
function key(page: Page) { return detail(page).locator('[data-interior-symbol-key]'); }
function sample(page: Page, id: string) { return key(page).locator('[data-interior-symbol-sample="' + id + '"]'); }
function status(page: Page) { return detail(page).locator('[data-interior-highlight-note]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch)); }, patch);
}
async function marks(page: Page) {
  return interior(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => [node.getAttribute('data-interior-cell-position'), node.getAttribute('data-held-cell')]));
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the symbol key test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0, hive3dFramesSeen: [], hive3dPart: null, hive3dFoundQueen: false,
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my exact observation</strong> & punctuation.',
        explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' },
        synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' } },
      queen: { active: false, custom: { retained: 'Network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: 'Flight setup.' } },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(page.locator('[data-hive-interior-open]')).toBeVisible();
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await interior(page).locator('[data-interior-frame="2"]').click();
}
async function hold(page: Page) {
  await interior(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(interior(page).locator('[data-interior-clear]')).toBeVisible();
}
async function chooseTopic(page: Page, id: string, activation: 'Enter' | 'Space' = 'Enter') {
  await topic(page, id).focus(); await page.keyboard.press(activation);
  await expect(topic(page, id)).toHaveAttribute('aria-pressed', 'true'); await expect(topic(page, id)).toBeFocused();
}
async function shapes(page: Page, ids: string[]) {
  await expect(detail(page).locator('button,a,input,select,textarea,[tabindex],[data-interior-role]')).toHaveCount(0);
  await expect(status(page)).toHaveAttribute('role', 'status'); await expect(status(page)).toHaveAttribute('aria-live', 'polite');
  await expect(status(page)).toHaveAttribute('aria-atomic', 'true');
  expect(await detail(page).locator('[data-interior-symbol-sample]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-interior-symbol-sample')))).toEqual(ids);
  await expect(key(page)).toHaveCount(ids.length ? 1 : 0);
  if (!ids.length) {
    await expect(detail(page).locator('[data-interior-symbol-context]')).toHaveText('No mapped cell symbol. The queen’s location is not shown in this cutaway.');
    await expect(detail(page).locator('[data-interior-symbol-limit]')).toHaveCount(0); return;
  }
  await expect(key(page)).toHaveAccessibleName('Symbols for this study');
  expect(await key(page).evaluate(node => node.tagName)).toBe('UL');
  await expect(detail(page).locator('[data-interior-symbol-context]')).toHaveText('Symbol examples only; use the status below to check what is drawn in the current frame.');
  if (ids.length === 3) await expect(detail(page).locator('[data-interior-symbol-limit]')).toHaveText('These symbols do not measure stage or caste counts.');
  else await expect(detail(page).locator('[data-interior-symbol-limit]')).toHaveCount(0);
  for (const id of ids) {
    const item = roles.find(item => item.id === id)!;
    await expect(sample(page, id)).toHaveText(item.label); expect(await sample(page, id).evaluate(node => node.tagName)).toBe('LI');
    const svg = sample(page, id).locator('svg');
    await expect(svg).toHaveCount(1); await expect(svg).toHaveAttribute('viewBox', '0 0 32 32');
    await expect(svg).toHaveAttribute('aria-hidden', 'true'); await expect(svg).toHaveAttribute('focusable', 'false');
    await expect(svg).toHaveClass(/bee-interior-key-symbol/); await expect(svg).toHaveClass(/bee-interior-study-symbol/);
    await expect(svg.locator('polygon')).toHaveCount(1);
    const points = (await svg.locator('polygon').getAttribute('points') || '').trim().split(/\s+/);
    expect(points).toHaveLength(6); expect(new Set(points).size).toBe(6);
    if (id === 'empty') { await expect(svg.locator('path,circle')).toHaveCount(0); continue; }
    if (id === 'honey' || id === 'pollen') {
      await expect(svg.locator('circle')).toHaveCount(0); await expect(svg.locator('path')).toHaveCount(1);
      const path = await svg.locator('path').getAttribute('d') || '';
      expect(path.match(/[a-z]/gi)).toEqual(id === 'honey' ? ['M', 'h', 'M', 'v'] : ['M', 'l']);
      const numbers = (path.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      if (id === 'honey') { expect(numbers[2]).toBeGreaterThan(0); expect(numbers[2]).toBeCloseTo(numbers[5], 8); }
      else { expect(numbers[2]).toBeGreaterThan(0); expect(numbers[3]).toBeLessThan(0); expect(numbers[2]).toBeCloseTo(-numbers[3], 8); }
      continue;
    }
    await expect(svg.locator('circle')).toHaveCount(1); expect(Number(await svg.locator('circle').getAttribute('r'))).toBeGreaterThan(0);
    const fill = await svg.locator('circle').evaluate(node => getComputedStyle(node).fill);
    if (id === 'open_brood') { expect(fill).toBe('none'); await expect(svg.locator('path')).toHaveCount(0); }
    else {
      expect(fill).not.toBe('none'); expect(fill).not.toBe('rgba(0, 0, 0, 0)');
      await expect(svg.locator('path.bee-interior-cap-mark')).toHaveCount(1);
      expect((await svg.locator('path').getAttribute('d') || '').match(/[a-z]/gi)).toEqual(['M', 'h']);
    }
  }
  if (ids.length === 3) {
    const radius = async (id: string) => Number(await sample(page, id).locator('circle').getAttribute('r'));
    expect(await radius('open_brood')).toBeCloseTo(await radius('capped_brood'), 8);
    expect((await radius('drone_brood')) / (await radius('open_brood'))).toBeCloseTo(5 / 3, 8);
  }
}

test('study symbol examples follow real topic controls without inventing frame contents or changing held colony work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const initial = await work(page);
  await expect(interior(page).locator('[data-interior-role]')).toHaveCount(6);
  for (const [index, item] of topicSamples.entries()) {
    await chooseTopic(page, item.id, index % 2 ? 'Space' : 'Enter'); await shapes(page, item.roles);
    await expect(detail(page).locator('strong').first()).toHaveText('Read the highlighted pattern'); expect(await work(page)).toEqual(initial);
  }
  await expect(status(page)).toHaveText('Queen topic selected. The cutaway does not mark the queen’s location.');
  for (const [index, item] of roles.entries()) {
    await role(page, item.id).focus(); await page.keyboard.press(index % 2 ? 'Enter' : 'Space');
    await expect(role(page, item.id)).toHaveAttribute('aria-pressed', 'true'); await shapes(page, [item.id]);
    await expect(detail(page).locator('strong').first()).toHaveText(item.label + ' · Read this mark'); expect(await work(page)).toEqual(initial);
  }
  await chooseTopic(page, 'queen'); await role(page, 'empty').click(); await shapes(page, ['empty']);
  await expect(interior(page).locator('[data-interior-detail]')).toHaveAttribute('data-interior-detail', 'queen');
  await expect(detail(page)).toContainText('No separate colony reading measures these cells'); expect(await work(page)).toEqual(initial);
  await chooseTopic(page, 'brood');
  for (const frame of [0, 5, 2]) {
    await interior(page).locator('[data-interior-frame="' + frame + '"]').click(); const frameWork = await work(page);
    await shapes(page, ['open_brood', 'capped_brood', 'drone_brood']);
    if (frame !== 2) {
      await expect(status(page)).toHaveText('Developing brood: no matching cells are shown in this model frame. Try another frame to compare the pattern.');
      await expect(interior(page).locator('[data-interior-cell][data-highlighted="true"]')).toHaveCount(0);
    } else await expect(status(page)).toHaveText('Developing brood highlighted in this model frame.');
    expect(await work(page)).toEqual(frameWork);
  }
  const beforeHold = await work(page); await hold(page); const heldMarks = await marks(page);
  expect(await work(page)).toEqual(beforeHold); expect(heldMarks.length).toBeGreaterThan(0);
  await fixture(page, { day: 16, brood: 3000, honey: 45 }); const changed = await work(page);
  await shapes(page, ['open_brood', 'capped_brood', 'drone_brood']);
  await expect(interior(page).locator('[data-interior-topic-held]')).toHaveText('6,000 cells');
  await expect(interior(page).locator('[data-interior-reading]')).toHaveText('3,000 cells');
  await expect(interior(page).locator('[data-interior-topic-difference]')).toHaveText('-3,000 cells');
  expect(await marks(page)).toEqual(heldMarks); expect(await work(page)).toEqual(changed);
  await fixture(page, { pollen: null }); const missing = await work(page);
  for (const item of topicSamples) {
    await chooseTopic(page, item.id, 'Space'); await shapes(page, item.roles);
    await expect(status(page)).toHaveText('Pattern unavailable: a required colony reading is not recorded.');
    expect(await work(page)).toEqual(missing); expect(await marks(page)).toEqual(heldMarks);
  }
  for (const item of roles) {
    await role(page, item.id).focus(); await page.keyboard.press('Enter'); await shapes(page, [item.id]);
    await expect(status(page)).toHaveText('Pattern unavailable: a required colony reading is not recorded.'); expect(await work(page)).toEqual(missing);
  }
  await expect(interior(page).locator('[data-interior-role]')).toHaveCount(6);
  expect(missing.beehive.notebook).toEqual(initial.beehive.notebook); expect(missing.beehive.actionPoints).toBe(initial.beehive.actionPoints);
  expect(missing.otherTool).toEqual(initial.otherTool); expect(missing.beehive.hive3dFoundQueen).toBe(false); expect(errors).toEqual([]);
});

function contrast(a: string, b: string) {
  function luminance(color: string) {
    const rgb = (color.match(/[\d.]+/g) || []).map(Number); expect(rgb.length).toBeGreaterThanOrEqual(3);
    if (rgb.length > 3) expect(rgb[3]).toBe(1);
    const [r, g, b] = rgb.slice(0, 3).map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : Math.pow((channel + .055) / 1.055, 2.4); });
    return .2126 * r + .7152 * g + .0722 * b;
  }
  const first = luminance(a), second = luminance(b); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}
async function audit(page: Page) {
  const violations = await detail(page).evaluate(async node => {
    const result = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) }));
  });
  expect(violations).toEqual([]);
  const layout = await detail(page).evaluate(node => {
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize), elements = [node, ...Array.from(node.querySelectorAll('div,p,ul,li,span,strong'))];
    return { overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: elements.slice(1).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / font, pixels: parseFloat(getComputedStyle(el).fontSize), ellipsis: getComputedStyle(el).textOverflow })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.pixels).toBeGreaterThanOrEqual(14); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const id of ['open_brood', 'capped_brood', 'drone_brood']) {
    const colors = await sample(page, id).evaluate(node => {
      let ancestor: Element | null = node, background = '';
      while (ancestor) {
        const candidate = getComputedStyle(ancestor).backgroundColor;
        if (candidate !== 'transparent' && candidate !== 'rgba(0, 0, 0, 0)') { background = candidate; break; }
        ancestor = ancestor.parentElement;
      }
      const polygon = getComputedStyle(node.querySelector('polygon')!), circle = getComputedStyle(node.querySelector('circle')!);
      const cap = node.querySelector('.bee-interior-cap-mark');
      return { background, polygonStroke: polygon.stroke, circleStroke: circle.stroke, circleFill: circle.fill, capStroke: cap ? getComputedStyle(cap).stroke : null };
    });
    expect(contrast(colors.polygonStroke, colors.background), id + ' hex outline contrast').toBeGreaterThanOrEqual(3);
    expect(contrast(colors.circleStroke, colors.background), id + ' mark contrast').toBeGreaterThanOrEqual(3);
    if (id !== 'open_brood') {
      expect(contrast(colors.circleFill, colors.background), id + ' filled mark contrast').toBeGreaterThanOrEqual(3);
      expect(contrast(colors.capStroke!, colors.circleFill), id + ' cap bar contrast').toBeGreaterThanOrEqual(3);
    }
  }
  await topic(page, 'brood').focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(topic(page, 'brood')).toBeFocused();
  const control = await topic(page, 'brood').evaluate(node => { const css = getComputedStyle(node), box = node.getBoundingClientRect(); return { outline: parseFloat(css.outlineWidth), style: css.outlineStyle, width: box.width, height: box.height }; });
  expect(control.outline).toBeGreaterThanOrEqual(2); expect(control.style).not.toBe('none'); expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44);
}
async function capture(page: Page, mode: string) {
  const position = await detail(page).evaluate(node => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY, height: box.height }; });
  const tiles: { file: string; offset: number; height: number }[] = [];
  let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(10); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await detail(page).boundingBox(); expect(box).not.toBeNull(); const y = box!.y + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-symbols-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x: box!.x, y, width: box!.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-symbols-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('study symbol examples preserve shape distinctions and readable contrast across five accessible display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await chooseTopic(page, 'brood'); await hold(page); const unchanged = await work(page), heldMarks = await marks(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') { await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 }); }
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') {
      await page.emulateMedia({ forcedColors: 'none' });
      await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
    }
    await shapes(page, ['open_brood', 'capped_brood', 'drone_brood']); await audit(page); await capture(page, mode);
    await expect(status(page)).toHaveText('Developing brood highlighted in this model frame.');
    expect(await marks(page)).toEqual(heldMarks);
    expect(await work(page)).toEqual(mode === 'wide' ? unchanged : { ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
  }
  expect(errors).toEqual([]);
});
