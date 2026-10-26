import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_PRACTICAL_OUTPUT || 'test-results/dissection-practical-completion';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'],
  probes: `window.__practicalEvents = { announcements: [], awards: [] };
    var practicalRender = window.StemLab._registry.dissection.render;
    window.StemLab._registry.dissection.render = function (ctx) {
      ctx.announceToSR = function (message) { window.__practicalEvents.announcements.push(String(message)); };
      ctx.awardXP = function (amount) { window.__practicalEvents.awards.push(amount); };
      return practicalRender(ctx);
    };`,
});
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
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', selectedOrgan: null,
    workspaceMode: 'advanced', toolbarStudyOpen: true, toolbarToolsOpen: false,
    quizMode: true, practicalMode: true, quizAnswerMode: 'choices', quizSeed: 42, quizIdx: 0,
    quizScore: 3, quizTotal: 5, quizFeedback: null, quizComplete: false, quizReviewQueue: ['tympanum'],
    practicalEndsAt: Date.now() + 60_000, practicalTimer: 60, practicalTargetIds: ['nictitating', 'tympanum'],
    _prePracticalLabelMode: 'show', labelMode: 'hidden', revealedLayers: { skin: true },
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: { 'frog|nictitating': true },
    organNotes: { 'frog|nictitating': 'The transparent membrane covers the eye.' }, organConfidence: { 'frog|nictitating': 2 },
    procedureByLayer: { skin: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 1000 }] } },
    annotations: [{ type: 'dot', x: .4, y: .4 }], assessmentRecordedScore: 2, assessmentRecordedTotal: 4,
    assessmentCompletedAt: 100, assessmentEvidence: { 'frog|nictitating': { correct: true, at: 90 } },
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
  await expect(page.locator('#diss-quiz-panel')).toBeVisible();
}
async function patch(page: Page, data: Record<string, unknown>) {
  await page.evaluate(data => (window as any).__ctx.updateMulti('dissection', data), data);
}
async function work(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return Object.fromEntries(['exploredOrgans', 'verifiedIdentifications', 'organNotes', 'organConfidence', 'procedureByLayer',
      'annotations', 'quizScore', 'quizTotal', 'quizReviewQueue', 'assessmentRecordedScore', 'assessmentRecordedTotal',
      'assessmentCompletedAt', 'assessmentEvidence'].map(key => [key, d[key]]));
  });
}
async function expire(page: Page, name: string, missingTiming = false) {
  await patch(page, { practicalEndsAt: missingTiming ? 0 : Date.now() - 1 });
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.practicalMode)).toBe(false);
  await writeFile(out + '/' + name + '-focus.json', JSON.stringify(await page.evaluate(() => ({
    activeTag: document.activeElement?.tagName, activeId: document.activeElement?.id,
    resultPresent: !!document.querySelector('#diss-practical-summary'), state: (window as any).__ctx.toolData.dissection._practicalCompletion,
  })), null, 2));
  await expect(page.locator('#diss-quiz-panel')).toHaveCount(0);
  await expect(page.locator('#diss-practical-summary')).toBeVisible();
}
async function messages(page: Page, toast: string, announcement: string) {
  const counts = await page.evaluate(({ toast, announcement }) => ({
    toasts: (window as any).__events.toasts.filter((entry: { message: string }) => entry.message === toast).length,
    announcements: (window as any).__practicalEvents.announcements.filter((entry: string) => entry === announcement).length,
    awards: (window as any).__practicalEvents.awards,
  }), { toast, announcement });
  expect(counts).toEqual({ toasts: 1, announcements: 1, awards: [] });
}
async function resultContrast(page: Page) {
  return page.locator('#diss-practical-summary').evaluate(summary => {
    function rgba(value: string) { const parts = value.match(/[\d.]+/g)?.map(Number) || []; return [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts[3] ?? 1]; }
    function blend(color: number[], base: number[]) { return color.slice(0, 3).map((channel, i) => channel * color[3] + base[i] * (1 - color[3])); }
    function luminance(color: number[]) { const channels = color.map(channel => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }); return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722; }
    const style = getComputedStyle(summary); let ancestor: Element | null = summary; let base = [255, 255, 255];
    while (ancestor) { const color = rgba(getComputedStyle(ancestor).backgroundColor); if (color[3] >= .999) { base = color.slice(0, 3); break; } ancestor = ancestor.parentElement; }
    const gradient = style.backgroundImage.match(/rgba?\([^)]+\)/g)?.map(color => blend(rgba(color), base));
    const backgrounds = gradient?.length ? gradient : [base];
    return { backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage, backgrounds,
      text: [...summary.querySelectorAll('h3, p')].map(node => {
        const color = getComputedStyle(node).color;
        const contrasts = backgrounds.map(background => { const foreground = blend(rgba(color), background), first = luminance(foreground), second = luminance(background); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05); });
        return { text: node.textContent, color, minContrast: Math.min(...contrasts) };
      }) };
  });
}

test('expired practical answer focus reaches a durable result without changing scores or evidence', async ({ page }) => {
  await mount(page); const before = await work(page), answer = page.locator('#diss-quiz-panel .diss-quiz-option').first();
  await answer.focus(); await expire(page, 'answer');
  const summary = page.locator('#diss-practical-summary'); await expect(summary).toBeFocused();
  await expect(summary).toContainText('Timed practical result'); await expect(summary).toContainText('Time up! Score: 3/5');
  await expect(summary).toHaveAttribute('aria-labelledby', 'diss-practical-summary-title');
  await expect(summary.locator('[aria-live="polite"], [aria-live="assertive"]')).toHaveCount(0);
  expect(await work(page)).toEqual(before); await messages(page, 'Time up! Score: 3/5', 'Practical assessment complete. Score 3 out of 5.');
  await patch(page, { procedureFeedback: { message: 'Reviewing the completed practical.', tone: 'working', at: Date.now() } });
  await expect(summary).toContainText('Time up! Score: 3/5'); await expect(summary).toBeFocused();
  await page.waitForTimeout(1100); await messages(page, 'Time up! Score: 3/5', 'Practical assessment complete. Score 3 out of 5.');
});

test('expiration recovers panel focus and preserves focus on an unrelated control', async ({ page }) => {
  for (const inside of [true, false]) {
    await mount(page); const before = await work(page), origin = page.locator(inside ? '#diss-quiz-panel' : '#diss-route-study');
    await origin.focus(); await expire(page, inside ? 'panel' : 'outside');
    await expect(inside ? page.locator('#diss-practical-summary') : origin).toBeFocused(); expect(await work(page)).toEqual(before);
  }
});

test('missing timing produces a stable result with one existing recovery announcement', async ({ page }) => {
  await mount(page); const before = await work(page); await page.locator('#diss-quiz-panel .diss-quiz-option').first().focus();
  await expire(page, 'missing-timing', true); await expect(page.locator('#diss-practical-summary')).toBeFocused();
  const message = 'Timed practical ended because its timing record was unavailable. No additional response was recorded.';
  await expect(page.locator('#diss-practical-summary')).toContainText(message); await messages(page, message, message); expect(await work(page)).toEqual(before);
});

test('zero-response result is cleared by a new practical and a confirmed reset', async ({ page }) => {
  await mount(page, { quizScore: 0, quizTotal: 0 }); const before = await work(page); await page.locator('#diss-quiz-panel').focus();
  await expire(page, 'zero-response'); await expect(page.locator('#diss-practical-summary')).toContainText('Time up! No responses recorded.');
  expect(await work(page)).toEqual(before); await messages(page, 'Time up! No responses recorded.', 'Practical assessment complete. No responses were recorded.');
  const start = page.getByRole('button', { name: 'Start 2-minute timed practical', exact: true }); await start.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#diss-practical-summary')).toHaveCount(0); await expect(page.locator('#diss-quiz-panel')).toBeVisible();
  await page.locator('#diss-quiz-panel').focus(); await expire(page, 'new-practical');
  const tools = page.getByRole('button', { name: 'Lab tool options', exact: true }); await tools.focus(); await page.keyboard.press('Enter');
  await page.locator('#diss-reset-specimen').focus(); await page.keyboard.press('Enter'); await page.locator('#diss-reset-confirm').press('Enter');
  await expect(page.locator('#diss-practical-summary')).toHaveCount(0);
});

for (const dark of [false, true]) test(`320px ${dark ? 'dark' : 'light'} result retains visible keyboard focus and a readable score`, async ({ page }) => {
  await mount(page, {}, 320, dark); const before = await work(page); await page.keyboard.press('Tab');
  await page.locator('#diss-quiz-panel .diss-quiz-option').first().focus(); await expire(page, '320-' + (dark ? 'dark' : 'light'));
  const summary = page.locator('#diss-practical-summary'); await expect(summary).toBeFocused(); await expect(summary).toBeInViewport();
  expect(await summary.evaluate(node => node.matches(':focus-visible'))).toBe(true); await expect(summary).toContainText('Time up! Score: 3/5');
  expect(await summary.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true); expect(await work(page)).toEqual(before);
  const contrast = await resultContrast(page); await writeFile(out + '/320-' + (dark ? 'dark' : 'light') + '-contrast.json', JSON.stringify(contrast, null, 2));
  for (const text of contrast.text) expect(text.minContrast, text.text + ' / ' + text.color).toBeGreaterThanOrEqual(4.5);
  await summary.screenshot({ path: out + '/320-' + (dark ? 'dark' : 'light') + '-practical-result-focus.png' });
});

test('practical result remains readable in high contrast and forced colors', async ({ page }) => {
  for (const mode of ['high-contrast', 'forced-colors']) {
    await page.emulateMedia({ forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
    await mount(page, { highContrast: mode === 'high-contrast' }, 320, true); const before = await work(page);
    await page.keyboard.press('Tab'); await page.locator('#diss-quiz-panel').focus(); await expire(page, mode);
    const summary = page.locator('#diss-practical-summary'); await expect(summary).toBeFocused(); await expect(summary).toBeInViewport();
    const contrast = await resultContrast(page); await writeFile(out + '/' + mode + '-contrast.json', JSON.stringify(contrast, null, 2));
    for (const text of contrast.text) expect(text.minContrast, mode + ' / ' + text.text).toBeGreaterThanOrEqual(4.5);
    expect(await work(page)).toEqual(before); await summary.screenshot({ path: out + '/' + mode + '-practical-result-focus.png' });
  }
});

test.afterAll(async () => {
  const sourceSha256 = createHash('sha256').update(await readFile(servedFile)).digest('hex');
  await writeFile(out + '/source.json', JSON.stringify({ servedFile, sourceStartSha256, sourceSha256, unchanged: sourceSha256 === sourceStartSha256 }, null, 2));
  expect(sourceSha256).toBe(sourceStartSha256);
});
