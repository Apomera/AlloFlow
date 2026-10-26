import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_ESCAPE_OUTPUT || 'test-results/dissection-escape-guards';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const errors = new WeakMap<Page, string[]>();
const pageErrorLog: { test: string; errors: string[] }[] = [];
const substitutedSource = process.env.STEM_GL_SUBSTITUTE?.split(';').find(entry => entry.startsWith('stem_lab/stem_tool_dissection.js='))?.slice('stem_lab/stem_tool_dissection.js='.length);
const servedFile = substitutedSource || 'stem_lab/stem_tool_dissection.js';
let sourceStartSha256: string;

test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await mkdir(out, { recursive: true }); sourceStartSha256 = createHash('sha256').update(await readFile(servedFile)).digest('hex'); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page)!.push(error.message)); });
test.afterEach(async ({ page }, info) => {
  await harness.destroy(page); pageErrorLog.push({ test: info.title, errors: errors.get(page)! });
  await writeFile(out + '/page-errors.json', JSON.stringify(pageErrorLog, null, 2));
  expect(errors.get(page)).toEqual([]);
});

async function mount(page: Page, state: Record<string, unknown> = {}, width = 1280, dark = false) {
  await page.setViewportSize({ width, height: 900 });
  await harness.mount(page, { dissection: {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', selectedOrgan: 'nictitating',
    workspaceMode: 'advanced', techniquePanelOpen: true, toolbarToolsOpen: true,
    quizMode: false, practicalMode: false, revealedLayers: { skin: true },
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: {},
    organNotes: { 'frog|nictitating': 'The transparent membrane covers the eye.' }, organConfidence: { 'frog|nictitating': 2 },
    procedureByLayer: { skin: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 1000 }] } },
    annotations: [{ type: 'dot', x: .4, y: .4 }],
    assessmentRecordedScore: 2, assessmentRecordedTotal: 4, assessmentCompletedAt: 100,
    reducedMotion: true, soundEnabled: false, sceneDetail: false, ...state,
  } }, undefined, { expectCanvas: false });
  const host = await readFile('stem_lab/stem_lab_module.js', 'utf8');
  const effects = ['stem-theme-overrides', 'stem-contrast-fix'].map(id => {
    const site = host.indexOf("var id = '" + id + "'"), start = host.lastIndexOf('React.useEffect(', site);
    const open = host.indexOf('{', start), end = host.indexOf('}, [isDark, isContrast]);', site);
    if (site < 0 || start < 0 || end < 0) throw Error('Missing host theme effect: ' + id);
    return host.slice(open + 1, end);
  });
  await page.evaluate(({ dark, effects }) => {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.cssText = 'width:100%;max-width:1180px;position:relative;display:block;margin:auto'; wrap.setAttribute('data-stem-lab', '');
    document.body.className = dark ? 'theme-dark' : 'theme-default';
    for (const body of effects) new Function('isDark', 'isContrast', body)(dark, false);
    (window as any).__ctx.isDark = dark; (window as any).__rerender();
  }, { dark, effects });
}
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); }
async function openAncestors(page: Page, target: Locator) {
  const details = target.locator('xpath=ancestor::details');
  for (let index = 0; index < await details.count(); index++) {
    const detail = details.nth(index);
    if (!(await detail.evaluate(node => (node as HTMLDetailsElement).open))) await activate(page, detail.locator(':scope > summary'));
  }
}
async function work(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return Object.fromEntries(['selectedOrgan', 'exploredOrgans', 'verifiedIdentifications', 'organNotes', 'organConfidence', 'procedureByLayer', 'annotations', 'assessmentRecordedScore', 'assessmentRecordedTotal', 'visualEvidence'].map(key => [key, d[key]]));
  });
}
async function state(page: Page, key: string) { return page.evaluate(key => (window as any).__ctx.toolData.dissection[key], key); }
async function dispatch(control: Locator, options: Record<string, unknown>, key = 'Escape') {
  return control.evaluate((node, { options, key }) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
    if (options.keyCode === 229) Object.defineProperty(event, 'keyCode', { value: 229 });
    if (options.defaultPrevented) event.preventDefault();
    node.dispatchEvent(event); return event.defaultPrevented;
  }, { options, key });
}
const ignored = [
  { shiftKey: true }, { altKey: true }, { ctrlKey: true }, { metaKey: true },
  { isComposing: true }, { keyCode: 229 }, { defaultPrevented: true },
];
async function ignoresReservedEscape(control: Locator, unchanged: () => Promise<void>) {
  await control.focus();
  for (const options of ignored) {
    expect(await dispatch(control, options), JSON.stringify(options)).toBe(!!options.defaultPrevented);
    await expect(control).toBeFocused(); await unchanged();
  }
}

test('scenario restart keeps ignored Escape events and plain Escape returns to Restart', async ({ page }) => {
  await mount(page, { procedureScenario: 'precision-access' }); const before = await work(page);
  const restart = page.locator('#diss-scenario-restart'), panel = page.locator('#diss-scenario-restart-review');
  await activate(page, restart); const cancel = page.locator('#diss-scenario-restart-cancel'); await expect(cancel).toBeFocused();
  await ignoresReservedEscape(cancel, async () => { await expect(panel).toBeVisible(); expect(await work(page)).toEqual(before); });
  await page.keyboard.press('Escape'); await expect(panel).toHaveCount(0); await expect(restart).toBeFocused(); expect(await work(page)).toEqual(before);
});

for (const surface of ['review', 'specimen'] as const) test(`paused replay ${surface} ignores reserved Escape and exits only on plain Escape`, async ({ page }) => {
  const replay = { specimen: 'frog', layer: 'skin', startedAt: Date.now(), duration: 5000, paused: true, elapsed: 2500,
    returnFocusId: 'diss-review-actions', actions: [{ action: 'inspect', label: 'Inspected skin' }] };
  await mount(page, { _procedureReplay: replay }); const before = await work(page);
  const panel = page.locator('#diss-replay-review'), held = page.locator('#diss-replay-specimen');
  await expect(panel).toBeVisible(); await expect(held).toBeVisible();
  const control = page.locator(surface === 'review' ? '#diss-replay-view-specimen' : '#diss-replay-return');
  await ignoresReservedEscape(control, async () => { await expect(panel).toBeVisible(); await expect(held).toBeVisible(); expect(await state(page, '_procedureReplay')).toEqual(replay); expect(await work(page)).toEqual(before); });
  await page.keyboard.press('Escape'); await expect(panel).toHaveCount(0); await expect(held).toHaveCount(0);
  await expect(page.locator('#diss-review-actions')).toBeFocused(); expect(await work(page)).toEqual(before);
});

test('observation search retains composing, modified and handled input then clears on plain Escape', async ({ page }) => {
  await mount(page, { _observationReviewSearch: 'transparent' }, 320, true); const before = await work(page);
  const search = page.locator('#diss-observation-search'); await openAncestors(page, search);
  await ignoresReservedEscape(search, async () => { await expect(search).toHaveValue('transparent'); expect(await state(page, '_observationReviewSearch')).toBe('transparent'); expect(await work(page)).toEqual(before); });
  await page.locator('.diss-observation-search').screenshot({ path: out + '/320-dark-observation-focus.png' });
  await page.keyboard.press('Escape'); await expect(search).toHaveValue(''); await expect(search).toBeFocused(); expect(await work(page)).toEqual(before);
});

test('directory search preserves reserved input and handled ArrowDown without moving focus', async ({ page }) => {
  await mount(page, { selectedOrgan: null, organSearch: 'nictitating', directoryFilter: 'all' }, 320); const before = await work(page);
  const search = page.locator('#diss-organ-search'); await openAncestors(page, search);
  await ignoresReservedEscape(search, async () => { await expect(search).toHaveValue('nictitating'); expect(await work(page)).toEqual(before); });
  expect(await dispatch(search, { defaultPrevented: true }, 'ArrowDown')).toBe(true); await expect(search).toBeFocused();
  expect(await dispatch(search, { isComposing: true }, 'ArrowDown')).toBe(false); await expect(search).toBeFocused();
  await page.locator('[data-dissection-directory]').screenshot({ path: out + '/320-light-directory-focus.png' });
  await page.keyboard.press('Escape'); await expect(search).toHaveValue(''); await expect(search).toBeFocused(); expect(await work(page)).toEqual(before);
});

test('directory results preserve reserved Escape and composing Home before returning to search on plain Escape', async ({ page }) => {
  await mount(page, { selectedOrgan: null, organSearch: 'nictitating', directoryFilter: 'all' }); const before = await work(page);
  const search = page.locator('#diss-organ-search'); await openAncestors(page, search); await search.focus(); await page.keyboard.press('ArrowDown');
  const result = page.locator('#diss-directory-results button[data-exposure-state]').first(); await expect(result).toBeFocused();
  await ignoresReservedEscape(result, async () => { await expect(search).toHaveValue('nictitating'); expect(await work(page)).toEqual(before); });
  expect(await dispatch(result, { isComposing: true }, 'Home')).toBe(false); await expect(result).toBeFocused();
  expect(await dispatch(result, { keyCode: 229 }, 'Home')).toBe(false); await expect(result).toBeFocused();
  await page.keyboard.press('Escape'); await expect(search).toHaveValue(''); await expect(search).toBeFocused(); expect(await work(page)).toEqual(before);
});

test.afterAll(async () => {
  const sourceSha256 = createHash('sha256').update(await readFile(servedFile)).digest('hex');
  await writeFile(out + '/source.json', JSON.stringify({ servedFile, sourceStartSha256, sourceSha256, unchanged: sourceSha256 === sourceStartSha256 }, null, 2));
  expect(sourceSha256).toBe(sourceStartSha256);
});
