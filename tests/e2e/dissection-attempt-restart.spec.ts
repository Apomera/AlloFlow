import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => { await harness.start(); await mkdir('reports/dissection-attempt-restart', { recursive: true }); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));

async function work(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return Object.fromEntries(['procedureByLayer', 'attemptArchive', 'organNotes', 'organConfidence', 'exploredOrgans',
      'verifiedIdentifications', 'revealedLayers', 'quizScore', 'quizTotal'].map(key => [key, d[key]]));
  });
}

for (const width of [390, 1440]) {
  test(`review unsaved technique work before restarting at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    const history = ['inspect', 'scalpel'];
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', workspaceMode: 'advanced',
      reducedMotion: true, soundEnabled: false, procedureMode: 'independent',
      organNotes: { 'frog|ventral_skin': 'A light surface below the body.' }, organConfidence: { 'frog|ventral_skin': 2 },
      exploredOrgans: { 'frog|ventral_skin': true }, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2,
      revealedLayers: {}, procedureByLayer: { skin: {
        inspected: true, incisionStarted: true, history, actionLog: [{ action: 'inspect', at: 200 }, { action: 'scalpel', at: 201 }],
        incisionPath: [{ x: .3, y: .3 }, { x: .4, y: .4 }],
        incisionMetrics: { precision: 70, coverage: 80, control: 60, angleControl: 75 },
        learningChecks: { scalpel: { predictionChoice: 'shallow', predictionCorrect: true } }, lastSavedAttemptId: 100,
      } },
      attemptArchive: { skin: [{ id: 100, savedAt: 100, layer: 'skin', score: 50, history: ['inspect'], actionLog: [{ action: 'inspect', at: 90 }] }] },
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    const before = await work(page);
    const start = page.locator('#diss-new-attempt');
    await page.locator('#diss-procedure-summary').click();
    await start.click();
    const review = page.locator('#diss-attempt-restart-review');
    await expect(review).toBeVisible();
    expect(await work(page)).toEqual(before);
    await review.screenshot({ path: `reports/dissection-attempt-restart/review-${width}.png` });
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['#diss-attempt-restart-review']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(violations).toEqual([]);
    await page.locator('#diss-attempt-restart-cancel').focus(); await page.keyboard.press('Enter');
    await expect(review).toHaveCount(0); await expect(start).toBeFocused();
    expect(await work(page)).toEqual(before);
    await start.click();
    await page.locator('#diss-attempt-restart-save').click();
    await expect(review).toHaveCount(0);
    const after = await work(page);
    expect(after.procedureByLayer.skin.history).toEqual([]);
    expect(after.attemptArchive.skin).toHaveLength(2);
    expect(after.attemptArchive.skin[1].history).toEqual(history);
    expect(after.attemptArchive.skin[1].incisionPath).toEqual(before.procedureByLayer.skin.incisionPath);
    for (const key of ['organNotes', 'organConfidence', 'exploredOrgans', 'verifiedIdentifications', 'revealedLayers', 'quizScore', 'quizTotal'])
      expect(after[key]).toEqual(before[key]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
