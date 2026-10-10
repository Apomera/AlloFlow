import { test, expect, Page, TestInfo } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 1100, height: 1800, layout: 'document',
});
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const pathways = [
  { id: 'colony', label: 'Colony Life', ids: ['scene', 'lifecycle', 'honey', 'thermo', 'castes'] },
  { id: 'biology', label: 'Bee Biology', ids: ['anatomy', 'cognition', 'vision', 'stingers', 'buzz'] },
  { id: 'signals', label: 'Signals & Flight', ids: ['physics', 'waggle', 'pheromones'] },
  { id: 'ecology', label: 'Ecology & Care', ids: ['pollination', 'native', 'threats', 'propolis', 'equipment'] },
];
const labels: Record<string, string> = {
  scene: 'Scene', anatomy: 'Anatomy', physics: 'Flight Physics', lifecycle: 'Lifecycle', honey: 'Honey',
  waggle: 'Waggle Dance', thermo: 'Thermoregulation', castes: 'Castes', pheromones: 'Pheromones',
  threats: 'Threats', pollination: 'Pollination', equipment: 'Equipment', native: 'Native Bees',
  cognition: 'Cognition', vision: 'Vision', propolis: 'Propolis', stingers: 'Stingers', buzz: 'Buzz',
};
const allViews = Object.keys(labels);
const legacyVisits = ['pollination', 'pollination', 'not-a-view', 'scene'];

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(visited => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Topic explorer test uses the supported fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
      visitedBeeViews: visited, tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false,
      focusLayout: true, day: 12, honey: 60, syrup: 0, workers: 24000, morale: 85, varroaLevel: 2,
      diseaseRisk: 0, actionPoints: 2, activeEvent: null, missionBriefOpen: false,
      journeyOpen: false, notebookOpen: false,
      queen: { active: false, custom: { retained: 'Colony network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908 },
      discoveryLesson: 'pollination',
      discoveryRecords: {
        pollination: { prediction: 1, checked: true, observation: 'Keep my flower observation.', note: 'Keep my discovery draft.', saved: false },
        waggle: { prediction: 0, note: 'Keep my other discovery draft.' },
      },
      notebook: {
        beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep my observed day.', explanation: 'Keep my explanation.', review: { prediction: true, evidence: false, explanation: true } },
        queen: { prediction: 'Keep my network prediction.', evidence: 'Keep my network reading.', explanation: 'Keep my network explanation.' },
        drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my route evidence.', explanation: 'Keep my route explanation.' },
        synthesis: 'Keep my synthesis.', discoveries: { pollination: { explanation: 'Keep my saved discovery.' } },
        custom: { retained: 'Notebook metadata.' },
      },
    }, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, legacyVisits);
  await expect(page.locator('[data-topic-browse]')).toBeVisible();
}

async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}

async function persistentWork(page: Page) {
  return page.evaluate(() => {
    const result = JSON.parse(JSON.stringify((window as any).__toolData));
    for (const key of ['beeView', 'visitedBeeViews', 'focusLayout']) delete result.beehive[key];
    return result;
  });
}

function topic(page: Page, id: string) { return page.locator('[data-beehive-view-tab="' + id + '"]'); }
function pathway(page: Page, id: string) { return page.locator('[data-topic-pathway="' + id + '"]'); }

async function browse(page: Page) {
  await page.locator('[data-topic-browse]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('details[data-topic-drawer]')).toHaveJSProperty('open', true);
  await expect(page.locator('h2#beehive-topic-explorer-title')).toBeFocused();
  await expect(page.locator('section#beehive-topic-explorer[data-beehive-topic-explorer]')).toBeVisible();
}

async function selected(page: Page, id: string, focused = false) {
  await expect(topic(page, id)).toHaveAttribute('aria-selected', 'true');
  await expect(topic(page, id)).toHaveAttribute('tabindex', '0');
  await expect(page.locator('#beehive-canvas-wrap')).toHaveAttribute('data-science-view', id);
  if (focused) await expect(topic(page, id)).toBeFocused();
}

async function semantics(page: Page, id: string) {
  const section = page.locator('section[data-beehive-topic-explorer]');
  const path = pathways.find(path => path.ids.includes(id))!;
  const tabs = section.getByRole('tablist');
  await expect(section).toHaveAttribute('id', 'beehive-topic-explorer');
  await expect(section).toHaveAccessibleName('Bee science explorer');
  await expect(section.locator('h2#beehive-topic-explorer-title')).toHaveAttribute('tabindex', '-1');
  await expect(tabs).toHaveAccessibleName(path.label + ' educational topic views');
  await expect(tabs.getByRole('tab')).toHaveCount(path.ids.length);
  await expect(tabs.locator('[tabindex="0"]')).toHaveCount(1);
  await expect(tabs.locator('[aria-selected="true"]')).toHaveCount(1);
  await expect(tabs.locator('[data-topic-viewing]')).toHaveText('Viewing');
  await expect(section.locator('[data-topic-pathway]')).toHaveCount(4);
  for (const candidate of pathways) {
    const button = pathway(page, candidate.id);
    await expect(button).toHaveAttribute('aria-pressed', String(candidate.id === path.id));
    await expect(button.locator('[data-topic-path-description]')).toBeVisible();
    await expect(button.locator('[data-topic-path-description]')).not.toHaveText('');
    await expect(button.locator('[data-topic-path-count]')).toBeVisible();
    await expect(button).toHaveAccessibleDescription(/views opened$/);
  }
  for (const view of path.ids) {
    const tab = topic(page, view);
    await expect(tab).toHaveAttribute('role', 'tab');
    await expect(tab).toHaveAttribute('aria-controls', 'beehive-canvas-wrap');
    await expect(tab).toHaveAttribute('aria-selected', String(view === id));
    await expect(tab).toHaveAttribute('tabindex', view === id ? '0' : '-1');
    await expect(tab.locator('strong[data-topic-label]')).toHaveText(labels[view]);
    await expect(tab).toHaveAccessibleName(new RegExp(labels[view]));
    await expect(tab.locator('[data-topic-description]')).toBeVisible();
    await expect(tab.locator('[data-topic-description]')).not.toHaveText('');
    await expect(tab.locator('[data-topic-visit]')).toHaveText(await tab.getAttribute('data-topic-explored') === 'true' ? 'Opened' : 'Not opened');
    await expect(tab).toHaveAccessibleDescription(/^Inspect .+\. (Opened|Not opened)$/);
  }
  const panel = page.locator('#beehive-canvas-wrap');
  await expect(panel).toHaveAttribute('role', 'tabpanel');
  await expect(panel).toHaveAttribute('aria-labelledby', 'beehive-view-tab-' + id);
  await expect(panel).toHaveAccessibleName(new RegExp(labels[id]));
  const progress = section.getByRole('progressbar', { name: 'Science views opened', exact: true });
  await expect(progress).toHaveAttribute('aria-valuemin', '0');
  await expect(progress).toHaveAttribute('aria-valuemax', '18');
  await expect(section.locator('[data-topic-selection]')).toContainText('Changing the science view leaves your current discovery question and saved notes in place.');
  await selected(page, id);
}

async function pathCounts(page: Page, opened: Set<string>) {
  for (const path of pathways) {
    await expect(pathway(page, path.id).locator('[data-topic-path-count]'))
      .toHaveText(path.ids.filter(id => opened.has(id)).length + '/' + path.ids.length + ' views opened');
  }
}

async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-beehive-topic-explorer]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}

async function readableLayout(page: Page, checkPageOverflow = true) {
  const result = await page.locator('[data-beehive-topic-explorer]').evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const blocks = [node, ...Array.from(node.querySelectorAll('button,[role="group"],[role="tablist"],strong,h2,p,[data-topic-description],[data-topic-path-description],[data-topic-path-count],[data-topic-visit]'))];
    const copy = Array.from(node.querySelectorAll('[data-topic-description],[data-topic-path-description],[data-topic-path-count],[data-topic-visit]'));
    return {
      rootFont,
      paths: Array.from(node.querySelectorAll('[data-topic-pathway]')).map(el => ({ x: el.getBoundingClientRect().x, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      controls: Array.from(node.querySelectorAll('button')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      text: copy.map(el => {
        const css = getComputedStyle(el), owner = el.closest('button')!, bounds = owner.getBoundingClientRect(), range = document.createRange();
        range.selectNodeContents(el);
        return { text: el.textContent, font: parseFloat(css.fontSize), whiteSpace: css.whiteSpace,
          overflow: css.overflow, ellipsis: css.textOverflow === 'ellipsis',
          outside: Array.from(range.getClientRects()).some(rect => rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1) };
      }),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
        .map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.paths).toHaveLength(4);
  expect(result.text.length).toBeGreaterThanOrEqual(14);
  for (const size of result.controls) { expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44); }
  for (const item of result.text) {
    expect(item.font, item.text || '').toBeGreaterThanOrEqual(result.rootFont * .8125);
    expect(item.whiteSpace, item.text || '').not.toBe('nowrap');
    expect(item.overflow, item.text || '').not.toBe('hidden');
    expect(item.ellipsis, item.text || '').toBe(false);
    expect(item.outside, item.text || '').toBe(false);
  }
  return result;
}

async function preview(page: Page, testInfo: TestInfo, name: string) {
  await page.locator('[data-beehive-topic-explorer]').screenshot({ path: testInfo.outputPath('topics-' + name + '.png'), animations: 'disabled', timeout: 120000 });
}

test('opens all 18 science views by pointer and keyboard without changing discovery work or colony state', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const frozen = await persistentWork(page);
  const question = await page.locator('#bee-discovery-title').textContent();
  const drawer = page.locator('details[data-topic-drawer]');
  await expect(drawer).toHaveJSProperty('open', false);
  const summary = page.locator('#beehive-topics-summary');
  await expect(summary).toContainText(/2\s*\/\s*18/);
  await summary.focus(); await page.keyboard.press('Enter');
  await expect(drawer).toHaveJSProperty('open', true); await expect(summary).toBeFocused();
  await page.keyboard.press('Space');
  await expect(drawer).toHaveJSProperty('open', false); await expect(summary).toBeFocused();
  await browse(page);

  for (const focusLayout of [true, false]) {
    await fixture(page, { focusLayout, beeView: 'pollination', visitedBeeViews: legacyVisits });
    if (focusLayout) await browse(page);
    else await expect(drawer).toHaveCount(0);
    await semantics(page, 'pollination');
    // Only real, distinct views count; merely displaying the current view does not rewrite legacy state.
    await expect(page.locator('[data-topic-progress]')).toHaveAttribute('aria-valuenow', '2');
    expect(await page.evaluate(() => (window as any).__toolData.beehive.visitedBeeViews)).toEqual(legacyVisits);
    const opened = new Set(['pollination', 'scene']);
    await pathCounts(page, opened);
    await expect(topic(page, 'pollination').locator('[data-topic-visit]')).toHaveText('Opened');
    await expect(topic(page, 'native').locator('[data-topic-visit]')).toHaveText('Not opened');
    let current = 'pollination';
    for (const path of [pathways[3], ...pathways.slice(0, 3)]) {
      const alreadySelected = path.ids.includes(current);
      const entry = alreadySelected ? current : path.ids.find(id => !opened.has(id)) || path.ids[0];
      await pathway(page, path.id).click();
      await selected(page, entry); opened.add(entry); current = entry;
      // Re-selecting the active pathway must retain its current view.
      await pathway(page, path.id).click(); await selected(page, current);
      for (const id of path.ids) {
        await topic(page, id).click(); await selected(page, id, true);
        opened.add(id); current = id;
        await expect(page.locator('[data-topic-progress]')).toHaveAttribute('aria-valuenow', String(opened.size));
      }
      await page.keyboard.press('Home'); await selected(page, path.ids[0], true);
      for (const id of path.ids.slice(1)) { await page.keyboard.press('ArrowRight'); await selected(page, id, true); }
      const last = path.ids[path.ids.length - 1], previous = path.ids[path.ids.length - 2];
      for (const [key, id] of [['ArrowRight', path.ids[0]], ['ArrowLeft', last], ['ArrowUp', previous], ['ArrowDown', last], ['Home', path.ids[0]], ['End', last]]) {
        await page.keyboard.press(key); await selected(page, id, true);
      }
      current = last;
      await semantics(page, current);
      await pathCounts(page, opened);
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="tablist"]'))).toBe(false);
      await pathway(page, path.id).click(); await selected(page, last);
      expect(await persistentWork(page)).toEqual(frozen);
      if (focusLayout) {
        await expect(page.locator('#bee-discovery-title')).toHaveText(question!);
        await expect(page.locator('[data-beehive-discovery] textarea')).toHaveValue('Keep my discovery draft.');
      }
    }
    await expect(page.locator('[data-topic-progress]')).toHaveAttribute('aria-valuenow', '18');
    await expect(page.locator('[data-topic-complete]')).toContainText('All 18 views opened');
    await expect(page.locator('[data-topic-continue]')).toHaveCount(0);
    const persisted = await page.evaluate(() => (window as any).__toolData.beehive.visitedBeeViews as string[]);
    expect(persisted).toHaveLength(18); expect([...persisted].sort()).toEqual([...allViews].sort());
    // A fully opened pathway reopens its first view when selected from another pathway.
    await pathway(page, 'ecology').click(); await selected(page, 'pollination');
    await accessible(page);
  }

  await fixture(page, { beeView: 'scene', visitedBeeViews: ['scene'] });
  await expect(page.locator('[data-topic-continue="lifecycle"]')).toContainText('Open next: Lifecycle');
  await page.locator('[data-topic-continue]').focus(); await page.keyboard.press('Space');
  await selected(page, 'lifecycle', true);
  await fixture(page, { beeView: 'scene', visitedBeeViews: allViews.filter(id => id !== 'equipment') });
  await expect(page.locator('[data-topic-progress]')).toHaveAttribute('aria-valuenow', '17');
  await page.locator('[data-topic-continue="equipment"]').focus(); await page.keyboard.press('Enter');
  await selected(page, 'equipment', true);
  await expect(page.locator('[data-topic-complete]')).toContainText('All 18 views opened');
  await expect(page.locator('[data-topic-continue]')).toHaveCount(0);
  const beforeShow = await page.evaluate(() => JSON.stringify((window as any).__toolData));
  await page.locator('[data-topic-show-view]').click();
  await expect(page.locator('#beehive-canvas-wrap')).toBeFocused();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(beforeShow);
  expect(await persistentWork(page)).toEqual(frozen);
  expect(errors).toEqual([]);
});

test('topic descriptions and view status stay readable on narrow screens, in dark and forced colors, and with enlarged text', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await browse(page);
  const frozen = await persistentWork(page);
  for (const width of [320, 640, 1100]) {
    await page.setViewportSize({ width, height: 1800 });
    for (const path of pathways) {
      await pathway(page, path.id).click();
      const id = await page.locator('[data-beehive-view-tab][aria-selected="true"]').getAttribute('data-beehive-view-tab');
      await semantics(page, id!); await readableLayout(page); await accessible(page);
    }
    if (width === 320) {
      const layout = await readableLayout(page);
      expect(new Set(layout.paths.map(path => Math.round(path.x))).size).toBe(1);
      await preview(page, testInfo, 'mobile');
    }
    if (width === 1100) await preview(page, testInfo, 'wide');
  }
  await fixture(page, { focusLayout: false });
  await expect(page.locator('[data-topic-drawer]')).toHaveCount(0);
  await readableLayout(page); await accessible(page);
  await fixture(page, { focusLayout: true, beeView: 'pollination' });
  await browse(page);
  await page.setViewportSize({ width: 320, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await semantics(page, 'pollination'); await readableLayout(page); await accessible(page); await preview(page, testInfo, 'dark');
  await page.emulateMedia({ forcedColors: 'active' });
  await topic(page, 'pollination').focus();
  const colors = await topic(page, 'pollination').evaluate(node => {
    const css = getComputedStyle(node);
    return { ink: css.color, paper: css.backgroundColor, border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth), outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) };
  });
  expect(colors.ink).not.toBe(colors.paper); expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0);
  expect(colors.outline).not.toBe('none'); expect(colors.outlineWidth).toBeGreaterThan(0);
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'forced-colors');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1280, height: 1800 });
  await fixture(page, { focusLayout: false });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.locator('[data-beehive-topic-explorer]').evaluate(node => Object.assign((node as HTMLElement).style, { width: '900px', maxWidth: '100%' }));
  expect(await page.locator('[data-beehive-topic-explorer]').evaluate(node => node.getBoundingClientRect().width)).toBe(900);
  const enlarged = await readableLayout(page, false);
  expect(new Set(enlarged.paths.map(path => Math.round(path.x))).size).toBe(1);
  await semantics(page, 'pollination'); await accessible(page); await preview(page, testInfo, 'large-text');
  expect(await persistentWork(page)).toEqual(frozen);
  expect(errors).toEqual([]);
});
