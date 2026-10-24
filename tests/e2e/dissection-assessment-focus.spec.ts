import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_ASSESSMENT_FOCUS_OUTPUT || 'test-results/dissection-assessment-focus';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const errors = new WeakMap<Page, string[]>();
test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await mkdir(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page)!.push(error.message)); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

async function mount(page: Page, state: Record<string, unknown> = {}, width = 1280, dark = false) {
  await page.setViewportSize({ width, height: 900 });
  await harness.mount(page, { dissection: {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    workspaceMode: 'advanced', quizMode: true, quizReviewMode: true, quizReviewQueue: ['tympanum'],
    quizAnswerMode: 'choices', quizSeed: 42, quizIdx: 0, quizScore: 0, quizTotal: 0,
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
async function activate(page: Page, button: ReturnType<Page['getByRole']>, key = 'Enter') {
  await button.focus(); await page.keyboard.press(key);
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return Object.fromEntries(['exploredOrgans', 'verifiedIdentifications', 'organNotes', 'organConfidence', 'procedureByLayer', 'annotations', 'assessmentRecordedScore', 'assessmentRecordedTotal'].map(key => [key, d[key]]));
  });
}
const continuation = (page: Page) => page.locator('#diss-quiz-panel').getByRole('button', { name: /^(Next Question|View assessment summary)$/ });

test('a retry keeps its answer focused and supported reveal hands off with the complete result', async ({ page }) => {
  await mount(page);
  const work = await evidence(page), panel = page.locator('#diss-quiz-panel');
  const wrongText = await panel.locator('button.diss-quiz-option').filter({ hasNotText: 'Tympanic Membrane' }).first().innerText();
  const wrong = panel.getByText(wrongText, { exact: true });
  await activate(page, wrong, 'Space'); await expect(wrong).toBeFocused(); await expect(wrong).toBeEnabled();
  const reveal = panel.getByRole('button', { name: 'Show answer · supported practice', exact: true });
  await activate(page, reveal);
  await expect(reveal).toHaveCount(0);
  const next = continuation(page); await expect(next).toBeFocused(); await expect(next).toBeEnabled();
  await expect(next).toHaveAccessibleDescription('Not quite. The correct structure is Tympanic Membrane.');
  expect(await evidence(page)).toEqual(work);
  await writeFile(`${out}/supported-reveal-ax.yml`, await panel.ariaSnapshot());
  await panel.screenshot({ path: `${out}/supported-reveal-focus.png` });
});

test('a completed keyboard answer reaches summary and starts a new question with its clue', async ({ page }) => {
  await mount(page);
  const work = await evidence(page), answer = page.locator('#diss-quiz-panel').getByText('Tympanic Membrane', { exact: true });
  await activate(page, answer); await expect(answer).toBeDisabled();
  const next = continuation(page); await expect(next).toBeFocused();
  await expect(next).toHaveAccessibleDescription('Correct with support — Tympanic Membrane.');
  await activate(page, next);
  const summary = page.locator('#diss-assessment-summary'); await expect(summary).toBeFocused();
  await activate(page, summary.getByRole('button', { name: 'Try a new assessment', exact: true }));
  const panel = page.locator('#diss-quiz-panel'); await expect(panel).toBeFocused();
  await expect(panel).toHaveAccessibleName(/Identify/);
  await expect(panel).toHaveAccessibleDescription((await panel.locator('[id^="diss-quiz-prompt-"]').innerText()));
  expect(await evidence(page)).toEqual(work);
});

test('missed-structure review focuses its question with usable focus at phone widths', async ({ page }) => {
  for (const dark of [false, true]) {
    await mount(page, { quizComplete: true, quizReviewMode: false, quizReviewQueue: ['tympanum'], quizFirstAttemptScore: 2, quizFirstAttemptTotal: 4 }, 320, dark);
    const work = await evidence(page);
    await activate(page, page.locator('#diss-assessment-summary').getByRole('button', { name: 'Review missed structures', exact: true }), 'Space');
    const panel = page.locator('#diss-quiz-panel'); await expect(panel).toBeFocused(); await expect(panel).toBeInViewport();
    await expect(panel).toHaveAccessibleDescription((await panel.locator('[id^="diss-quiz-prompt-"]').innerText()));
    await activate(page, panel.getByRole('button', { name: 'Tympanic Membrane', exact: true }));
    const next = continuation(page); await expect(next).toBeFocused(); await expect(next).toBeInViewport();
    expect(await next.evaluate(node => node.matches(':focus-visible'))).toBe(true);
    const layout = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
    expect(layout.page).toBeLessThanOrEqual(layout.viewport + 1);
    expect(await evidence(page)).toEqual(work);
    await panel.screenshot({ path: `${out}/phone-${dark ? 'dark' : 'light'}-continuation-focus.png` });
  }
});

test('timed practical continuation describes a neutral response without revealing correctness', async ({ page }) => {
  await mount(page, { quizReviewMode: false, practicalMode: true, practicalEndsAt: Date.now() + 120_000, practicalTimer: 120, practicalTargetIds: ['dorsal_skin'], labelMode: 'hidden' });
  const panel = page.locator('#diss-quiz-panel');
  await activate(page, panel.getByRole('button', { name: 'Dorsal Skin', exact: true }));
  const next = continuation(page); await expect(next).toBeFocused();
  await expect(next).toHaveAccessibleDescription('Response recorded. Correctness and the running score stay hidden while the timed practical is active.');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.quizScore)).toBe(1);
  await writeFile(`${out}/timed-response-ax.yml`, await panel.ariaSnapshot());
});

test('canvas answer input retains canvas focus while providing a continuation in the assessment', async ({ page }) => {
  await mount(page, { quizAnswerMode: 'hotspot', quizReviewQueue: ['dorsal_skin'] });
  const canvas = page.locator('#diss-canvas'); await canvas.focus(); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  await expect(continuation(page)).toBeVisible(); await expect(canvas).toBeFocused();
  expect(await page.evaluate(() => !!(window as any).__ctx.toolData.dissection.quizFeedback)).toBe(true);
});

test.afterAll(async () => {
  const substitute = process.env.STEM_GL_SUBSTITUTE?.split(';').find(entry => entry.startsWith('stem_lab/stem_tool_dissection.js='))?.slice('stem_lab/stem_tool_dissection.js='.length);
  const servedFile = substitute || 'stem_lab/stem_tool_dissection.js';
  await writeFile(`${out}/source.json`, JSON.stringify({ servedFile, sourceSha256: createHash('sha256').update(await readFile(servedFile)).digest('hex') }, null, 2));
});
