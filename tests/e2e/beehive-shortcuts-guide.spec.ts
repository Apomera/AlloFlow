import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_SHORTCUTS_ARTIFACTS || '.codex-artifacts/bee-shortcuts-guide-2026-10-14');
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });
const roles = ['beekeeper', 'queen', 'drone'] as const;
type Perspective = typeof roles[number];
const groups = { time: ['N', '5', '3', 'Space', 'P'], care: ['T', 'S', 'H', 'F', 'I'], tools: ['Q', 'B', 'M', '?'], science: ['Shift+1', 'Shift+2', 'Shift+3', 'Shift+4', 'Shift+5', 'Shift+6', 'Shift+7', 'Shift+8', 'Shift+9', 'Shift+0'] };
const panel = (page: Page) => page.locator('#beehive-shortcuts-panel');
const opener = (page: Page) => page.locator('[data-beehive-tool="shortcuts"]');
const close = (page: Page) => panel(page).getByRole('button', { name: 'Close shortcuts', exact: true });
const setting = (page: Page) => panel(page).getByRole('checkbox', { name: 'Enable one-key simulation shortcuts.', exact: true });
async function patch(page: Page, value: Record<string, unknown>) { await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__shortcutAwards); }
async function resetWrites(page: Page) { await page.evaluate(() => { (window as any).__shortcutWrites = []; }); }
async function settle(page: Page) { await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); }); }
async function unchanged(page: Page, before: unknown, beforeAwards: unknown) {
  await settle(page); expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__shortcutWrites)).toEqual([]);
}
async function activate(page: Page, control: Locator, key: 'Enter' | 'Space' = 'Enter') { await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key); }
async function open(page: Page, key: 'Enter' | 'Space' = 'Enter') {
  if (await panel(page).count() === 0) await activate(page, opener(page), key);
  await expect(panel(page)).toBeVisible(); await expect(opener(page)).toHaveAttribute('aria-expanded', 'true');
  // The panel lifecycle schedules initial focus; finish that handoff before focusing its controls.
  await expect(panel(page)).toBeFocused(); await settle(page);
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Shortcuts guide test uses the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 40, honey: 60, syrup: 0, workers: 24000, morale: 85, varroaLevel: 2,
      diseaseRisk: 0, actionPoints: 2, activeEvent: null, missionBriefOpen: false,
      journeyOpen: false, notebookOpen: false, showKeys: false, oneKeyShortcuts: true, bestQuizScore: 7,
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 } },
      queen: { active: true, paused: true, day: 7, hiveHealth: 73, territory: 58,
        pheromones: { qmp: 43, alarm: 10, nasonov: 50, brood: 40 },
        rival: { name: 'Test rival', health: 36, pressure: 64, intel: 2 },
        resources: { nectar: 20, pollen: 10, wax: 8, royalJelly: 2 },
        result: null, threats: [], custom: { retained: 'Match metadata.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908,
        lastRun: { success: true, reachedDca: true, difficulty: 'easy', energyLeft: 0,
          energyUnits: 'percent-of-difficulty-reserve', routeMarkers: 0, maxAlt: 125,
          distance: 610, score: 45, courseSeed: 20260908, custom: { retained: 'Saved route metadata.' } } },
      journal: [{ day: 39, text: 'Keep my recorded journal observation.' }],
      notebook: {
        beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep <strong>my observed day</strong>.', explanation: 'Keep my explanation.', review: { prediction: true, evidence: false, explanation: true } },
        queen: { prediction: 'Keep my network prediction.', evidence: 'Keep my network reading.', explanation: 'Keep my network explanation.' },
        drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my route evidence.', explanation: 'Keep my route explanation.' },
        synthesis: 'Keep my synthesis.', discoveries: { pollination: { explanation: 'Keep my saved discovery.' } },
        custom: { retained: 'Notebook metadata.' },
      }, custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    w.__shortcutAwards = []; w.__shortcutWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__shortcutAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name]; w.__ctx[name] = function(...args: any[]) { w.__shortcutWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(opener(page)).toBeVisible();
}
async function verify(page: Page, role: Perspective) {
  await expect(panel(page)).toHaveAttribute('role', 'region'); await expect(panel(page)).toHaveAccessibleName('Keyboard shortcuts');
  await expect(panel(page)).toHaveAttribute('data-beehive-focus-panel', 'shortcuts'); await expect(panel(page)).toHaveAttribute('data-shortcuts-perspective', role);
  await expect(opener(page)).toHaveAttribute('aria-controls', 'beehive-shortcuts-panel');
  const scope = panel(page).locator('[data-shortcuts-scope]');
  await expect(scope).toContainText(role === 'beekeeper' ? 'Beekeeper controls' : 'Beekeeper reference');
  if (role !== 'beekeeper') {
    await expect(scope).toContainText(role === 'queen' ? 'Colony Network' : 'Drone Flight');
    await expect(scope).toContainText(/controls/i);
  }
  await expect(setting(page)).toHaveAttribute('aria-describedby', 'beehive-shortcuts-setting-note');
  await expect(panel(page).locator('#beehive-shortcuts-setting-note')).toContainText(/Shift\s*\+\s*number/i);
  await expect(panel(page).locator('#beehive-shortcuts-setting-note')).toContainText('?');
  await expect(panel(page).locator('#beehive-shortcuts-setting-note')).toContainText(/Beekeeper/i);
  await expect(panel(page).locator('[data-shortcuts-usage]')).toContainText(/close/i);
  await expect(panel(page).locator('[data-shortcuts-usage]')).toContainText(/focus/i);
  for (const [id, keys] of Object.entries(groups)) {
    const group = panel(page).locator('[data-shortcut-group="' + id + '"]'), rows = group.locator('dl > div[data-shortcut-key]');
    await expect(group).toHaveCount(1); await expect(rows).toHaveCount(keys.length);
    for (const [index, key] of keys.entries()) {
      const row = rows.nth(index); await expect(row).toHaveAttribute('data-shortcut-key', key);
      expect((await row.locator('dt > kbd').innerText()).replace(/\s/g, '')).toBe(key);
      await expect(row.locator('dd')).not.toBeEmpty();
    }
  }
  await expect(panel(page).locator('[data-shortcut-key="Space"] dd')).toContainText(/automatic days/i);
  await expect(panel(page).locator('[data-shortcut-key="P"] dd')).toContainText(/animation/i);
}
async function expectedPreferences(page: Page, before: any, beforeAwards: unknown, prefs: Record<string, unknown>) {
  await settle(page); expect(await work(page)).toEqual({ ...before, beehive: { ...before.beehive, ...prefs } }); expect(await awards(page)).toEqual(beforeAwards);
}

test('grouped shortcut guidance preserves focus and saved work across perspectives while honoring keyboard preferences', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const original = await work(page);
  for (const focusLayout of [true, false]) for (const role of roles) {
    await patch(page, { focusLayout, viewMode: role, showKeys: false, oneKeyShortcuts: true });
    const before = await work(page), beforeAwards = await awards(page);
    await open(page, focusLayout ? 'Enter' : 'Space'); await expect(panel(page)).toBeFocused(); await verify(page, role);
    await expectedPreferences(page, before, beforeAwards, { showKeys: true });
    const opened = await work(page); await resetWrites(page); await page.keyboard.press('n'); await unchanged(page, opened, beforeAwards);
    await page.keyboard.press('Tab'); await expect(close(page)).toBeFocused();
    await page.keyboard.press('Tab'); await expect(setting(page)).toBeFocused();
    await expect(setting(page)).toBeChecked(); await page.keyboard.press('Space'); await expect(setting(page)).not.toBeChecked();
    await expect(setting(page)).toBeFocused(); await expectedPreferences(page, before, beforeAwards, { showKeys: true, oneKeyShortcuts: false });
    const disabled = await work(page); await resetWrites(page); await page.keyboard.press('n'); await unchanged(page, disabled, beforeAwards);
    await page.keyboard.press('Space'); await expect(setting(page)).toBeChecked(); await expectedPreferences(page, before, beforeAwards, { showKeys: true });
    await page.keyboard.press('Escape'); await expect(panel(page)).toHaveCount(0); await expect(opener(page)).toBeFocused();
    await expectedPreferences(page, before, beforeAwards, {});
    await open(page); await activate(page, close(page), 'Space'); await expect(panel(page)).toHaveCount(0); await expect(opener(page)).toBeFocused();
    await expectedPreferences(page, before, beforeAwards, {});
  }
  await patch(page, { viewMode: 'beekeeper', focusLayout: true, showKeys: false, oneKeyShortcuts: true }); await open(page);
  await activate(page, setting(page), 'Space'); await expect(setting(page)).not.toBeChecked();
  await page.keyboard.press('Escape'); await expect(panel(page)).toHaveCount(0); await expect(opener(page)).toBeFocused(); await settle(page);
  const disabled = await work(page), disabledAwards = await awards(page); await resetWrites(page);
  const stage = page.locator('#beehive-canvas-wrap');
  await activate(page, page.locator('[data-beehive-flow-step="play"]')); await expect(stage).toBeFocused();
  await page.keyboard.press('n'); await page.keyboard.press('Shift+Digit2'); await unchanged(page, disabled, disabledAwards);
  await page.keyboard.press('?'); await expect(panel(page)).toBeFocused(); await expect(setting(page)).not.toBeChecked(); await verify(page, 'beekeeper');
  await expectedPreferences(page, disabled, disabledAwards, { showKeys: true });
  await page.keyboard.press('Escape'); await expect(panel(page)).toHaveCount(0); await expect(stage).toBeFocused();
  await expectedPreferences(page, disabled, disabledAwards, {});
  const finalState = await work(page);
  for (const key of ['notebook', 'queen', 'drone', 'custom', 'journal', 'actionPoints', 'honey', 'day', 'autoAdvance', 'motionPaused', 'beeView']) expect(finalState.beehive[key]).toEqual(original.beehive[key]);
  expect(finalState.otherTool).toEqual(original.otherTool); expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await panel(page).evaluate(async node => {
    const checked = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const box = node.getBoundingClientRect(), font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const visible = Array.from(node.querySelectorAll('*')).filter(el => { const rect = el.getBoundingClientRect(), css = getComputedStyle(el); return rect.width > 0 && rect.height > 0 && css.display !== 'none' && css.visibility !== 'hidden'; });
    const words: { word: string; bottoms: number[] }[] = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      const parent = textNode.parentElement; if (!parent) continue;
      const rect = parent.getBoundingClientRect(), css = getComputedStyle(parent);
      if (rect.width <= 0 || rect.height <= 0 || css.display === 'none' || css.visibility === 'hidden') continue;
      for (const match of (textNode.textContent || '').matchAll(/[^\s\-–]+/g)) {
        const range = document.createRange(); range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
        words.push({ word: match[0], bottoms: Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0).map(rect => rect.bottom) });
      }
    }
    const close = node.querySelector('button')!, label = node.querySelector('label')!, closeRect = close.getBoundingClientRect(), labelRect = label.getBoundingClientRect(), closeCss = getComputedStyle(close);
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflow: [node, ...visible].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.flatMap(el => { const rect = el.getBoundingClientRect(); return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1 ? [{ tag: el.tagName, text: el.textContent }] : []; }), words,
      text: Array.from(node.querySelectorAll('h2,h3,h4,kbd,dd,[data-shortcuts-scope],[data-shortcuts-usage],#beehive-shortcuts-setting-note,label span')).map(el => { const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, whiteSpace: css.whiteSpace, overflow: css.overflow, ellipsis: css.textOverflow }; }),
      close: { width: closeRect.width, height: closeRect.height, outline: closeCss.outlineStyle, outlineWidth: parseFloat(closeCss.outlineWidth) },
      label: { width: labelRect.width, height: labelRect.height },
      keys: Array.from(node.querySelectorAll('[data-shortcut-key] kbd')).map(el => { const css = getComputedStyle(el); return { border: parseFloat(css.borderTopWidth), borderStyle: css.borderTopStyle, ink: css.color, paper: css.backgroundColor }; }),
    };
  });
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'shortcuts-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.overflow).not.toBe('hidden'); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const item of result.words) { expect(item.bottoms.length, item.word).toBeGreaterThan(0); for (const bottom of item.bottoms) expect(Math.abs(bottom - item.bottoms[0]), item.word + ' must stay intact').toBeLessThanOrEqual(1); }
  expect(result.close.width).toBeGreaterThanOrEqual(44); expect(result.close.height).toBeGreaterThanOrEqual(44); expect(result.close.outline).not.toBe('none'); expect(result.close.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(result.label.width).toBeGreaterThanOrEqual(44); expect(result.label.height).toBeGreaterThanOrEqual(44);
  expect(result.keys).toHaveLength(24); for (const key of result.keys) { expect(key.border).toBeGreaterThanOrEqual(1); expect(key.borderStyle).not.toBe('none'); expect(key.ink).not.toBe(key.paper); }
}
async function capture(page: Page, mode: string) {
  const target = panel(page), pad = 6, prefix = 'preview-shortcuts-guide-' + mode;
  const position = await target.evaluate((node, pad) => { const box = node.getBoundingClientRect(); return { top: Math.max(0, box.top + window.scrollY - pad), height: box.height + pad * 2 }; }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(16); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await target.boundingBox(); expect(box).not.toBeNull(); const y = Math.max(0, box!.y - pad + offset), height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2), file = prefix + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 }); tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, prefix + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}
test('shortcut groups and key labels remain readable with clear scope in five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page); await open(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 }); await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    await patch(page, { viewMode: 'beekeeper' }); const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await verify(page, 'beekeeper'); await close(page).focus(); await page.keyboard.press('Tab'); await close(page).focus();
    await audit(page, mode); await capture(page, mode); await unchanged(page, before, beforeAwards);
    for (const role of ['queen', 'drone'] as const) {
      await patch(page, { viewMode: role }); const roleState = await work(page), roleAwards = await awards(page); await resetWrites(page);
      await verify(page, role); await close(page).focus(); await audit(page, mode + '-' + role); await unchanged(page, roleState, roleAwards);
    }
  }
  expect(errors).toEqual([]);
});
