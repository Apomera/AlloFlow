import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 150000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-home-integrity-2026-10-02');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const literal = '<img src=x onerror="window.__homeInjected=true"> & imported notes remain learner text';
const longNote = 'Full imported explanation. ' + 'Keep the original observation and uncertainty; '.repeat(42) + ' ORIGINAL END';
type Activity = 'mystery' | 'growth' | 'resistance';
const activities: Activity[] = ['mystery', 'growth', 'resistance'];
const tabs = { mystery: 'mystery', growth: 'growthLab', resistance: 'resistance' };
const anchors = { mystery: '#micro-mystery-report-heading', growth: '#gl-explanation', resistance: '#micro-resistance-reflection-7' };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
const xp = (page: Page) => page.evaluate(() => (window as any).__homeXP);
const next = (page: Page, activity: Activity) => page.locator(`[data-work-next="${activity}"]`);
let errors: string[];

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });

function mysteryEntry(claim: string, reasoning = longNote) {
  const report = { claim, evidence: ['structure', 'behavior'], reasoning, limitation: 'bounded', metadata: { literal, report: 'Keep raw saved fields' } };
  return { ...report, revealed: ['context', 'size', 'structure', 'behavior'], collapsed: ['size'], reportView: 'recorded', checked: true,
    record: report, previousRecord: { ...report, reasoning: 'A previous saved explanation.', earlierMetadata: ['Keep raw history'] },
    metadata: { literal, case: 'Keep raw case fields' } };
}
function trial(id: number | string, explanation: string) {
  return { id, conditions: { profile: 'ecoli', tempC: 18, pH: 5, oxygen: 25 }, control: { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 },
    prediction: 'lower', hypothesis: longNote, explanation, citedHours: [4, 8], metadata: { literal, original: ['Keep trial fields'] } };
}
function resistanceRecord(id: number | string, reviewNote: string) {
  return { id, reviewNote, metadata: { literal, original: ['Keep evidence fields'] }, evidence: {
    dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: longNote,
    history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }], importedEvidence: { literal }
  } };
}
function seed(): Record<string, any> {
  const wall = mysteryEntry('bacterium'); wall.reasoning = literal + ' Peptidoglycan supports this revised broad bacterial classification.';
  return { tab: 'home', showMicroLibrary: false, earnedXP: 53, metadata: { original: literal },
    selectedBacterium: 'ecoli', selectedVirus: 'covid', selectedScope: 'lightbright', selectedMicrobiome: 'gut',
    selectedFerment: 'sourdough', selectedCase: 'snow', scopeOrganism: 'ecoli', magnification: 400,
    microscopeFocus: 10, microscopeTargetFocus: 50, gramStep: 0, quizIdx: 0, quizAnswers: [], quizSubmitted: false, quizCorrect: 0,
    mysteryLab: { active: 'unresolved', notice: 'saved', metadata: { original: ['Keep notebook metadata'] }, cases: {
      pond: mysteryEntry('protist'), budding: mysteryEntry('yeast'), wall, salt: mysteryEntry('archaeon'),
      particle: mysteryEntry('phage'), unresolved: mysteryEntry('unresolved'), importedUnknownCase: { reasoning: longNote, metadata: literal }
    } },
    growthInvestigation: { selectedId: 9, nextId: 20, control: { profile: 'ecoli', tempC: 30, pH: 7, oxygen: 100 }, prediction: 'lower',
      hypothesis: longNote, explanation: longNote, metadata: { original: literal }, trials: [trial(7, ''), trial(9, longNote)] },
    growthLab: { profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 100, hypothesis: 'Keep independent setup', explanation: literal,
      stuckRevealed: false, understood: false, log: [] }, growthReviewHour: 6,
    resistanceNotebook: { selectedId: 3, nextId: 20, metadata: { original: literal }, records: [resistanceRecord(3, longNote), resistanceRecord(7, '')] },
    resistanceComparison: { aId: 3, bId: 7, metadata: { original: literal }, extraPairFields: ['Keep comparison metadata'] },
    resistanceInvestigation: { dose: 45, duration: 3, initRes: 10, prediction: 'increase', notes: 'Independent live notes.',
      history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] },
    microscopeMeasurements: { importedUnknownSlide: { raw: literal } }
  };
}
async function mount(page: Page, data = seed()) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { unrelatedTool: { notes: literal, metadata: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await expect(page.locator('.micro-workspace-home')).toBeVisible();
  // Use an already canonical live run so Resistance's mount persistence is separate from route deltas.
  await page.evaluate(() => {
    const w = window as any;
    w.__ctx.setToolData((previous: any) => ({ ...previous, microbiology: { ...previous.microbiology,
      resistanceInvestigation: w.__MicrobiologyCore.normalizeResistanceInvestigation(previous.microbiology.resistanceInvestigation) } }));
    w.__homeXP = []; w.__ctx.awardXP = (...args: any[]) => w.__homeXP.push(args); w.__rerender();
  });
  await expect(next(page, 'mystery')).toContainText('Review working revision');
}
function resumed(before: any, activity: Activity) {
  const expected = clone(before), micro = expected.microbiology;
  micro.tab = tabs[activity];
  if (activity === 'mystery') { micro.mysteryLab.active = 'wall'; micro.mysteryLab.notice = ''; micro.mysteryLab.cases.wall.reportView = 'working'; }
  else if (activity === 'growth') micro.growthInvestigation.selectedId = 7;
  else micro.resistanceNotebook.selectedId = 7;
  return expected;
}
async function enter(page: Page, activity: Activity) { await next(page, activity).focus(); await next(page, activity).press('Enter'); }
async function noMarkup(page: Page) {
  expect(await page.evaluate(() => Boolean((window as any).__homeInjected))).toBe(false);
  await expect(page.locator('[data-microbiology-tool] img[src="x"]')).toHaveCount(0);
}
async function noOverflow(page: Page) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, zoom: getComputedStyle(document.body).zoom }));
  expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  const root = await page.locator('[data-microbiology-tool]').evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth }));
  expect(root.scroll <= root.client + 1, JSON.stringify({ viewport, root })).toBe(true);
}

test('keyboard Mystery resume changes only its intended fields and preserves raw notes, metadata, history and JSON reload', async ({ page }) => {
  await mount(page); const before = await state(page);
  await enter(page, 'mystery'); await expect(page.locator(anchors.mystery)).toBeFocused();
  await expect(page.locator(anchors.mystery)).toHaveAttribute('data-case', 'wall');
  expect(await state(page)).toEqual(resumed(before, 'mystery'));
  await expect(page.locator('#micro-mystery-reasoning')).toHaveValue(before.microbiology.mysteryLab.cases.wall.reasoning);
  expect((await state(page)).microbiology.mysteryLab.cases.pond.reasoning).toBe(longNote);
  const saved = await state(page); await harness.unmount(page); await page.evaluate(value => (window as any).__mount(value), clone(saved));
  await expect(page.locator('#micro-mystery-reasoning')).toHaveValue(saved.microbiology.mysteryLab.cases.wall.reasoning);
  expect(await state(page)).toEqual(saved); await noMarkup(page);
  writeFileSync(path.join(out, 'home-integrity-restored-state.json'), JSON.stringify(saved, null, 2) + '\n');
});

test('Growth resume preserves raw trials and repairs only the explicitly selected malformed identifier', async ({ page }) => {
  await mount(page); let before = await state(page); await enter(page, 'growth');
  await expect(page.locator(anchors.growth)).toBeFocused(); expect(await state(page)).toEqual(resumed(before, 'growth'));
  await expect(page.locator('#gl-saved-result')).toHaveAttribute('data-micro-growth-result', '7');
  expect((await state(page)).microbiology.growthInvestigation.trials[1].explanation).toBe(longNote);
  expect(await xp(page)).toEqual([]); await harness.unmount(page);
  const repaired = seed(); repaired.growthInvestigation.trials = [{ invalidImport: ['Keep malformed rows'] }, trial('broken', ''), trial(1, longNote)];
  repaired.growthInvestigation.selectedId = 2; repaired.growthInvestigation.extraNotebookField = { literal };
  await mount(page, repaired); before = await state(page); await expect(next(page, 'growth')).toHaveText('Explain saved trial 2');
  await enter(page, 'growth'); await expect(page.locator(anchors.growth)).toBeFocused();
  const expected = clone(before); expected.microbiology.tab = 'growthLab'; expected.microbiology.growthInvestigation.trials[1].id = 2;
  expected.microbiology.growthInvestigation.selectedId = 2; expect(await state(page)).toEqual(expected);
  expect((await state(page)).microbiology.growthInvestigation.trials[2].explanation).toBe(longNote);
  expect(await xp(page)).toEqual([]); await noMarkup(page);
});

test('Resistance resume repairs only its selected raw ID and invalid pair alias while retaining comparison metadata', async ({ page }) => {
  await mount(page); let before = await state(page); await enter(page, 'resistance');
  await expect(page.locator(anchors.resistance)).toBeFocused(); expect(await state(page)).toEqual(resumed(before, 'resistance'));
  expect((await state(page)).microbiology.resistanceNotebook.records[0].reviewNote).toBe(longNote);
  expect(await xp(page)).toEqual([]); await harness.unmount(page);
  const repaired = seed(); repaired.resistanceNotebook.records = [{ invalidImport: ['Keep malformed rows'] }, resistanceRecord('broken', ''), resistanceRecord(1, longNote)];
  repaired.resistanceNotebook.selectedId = 2; repaired.resistanceComparison = { ...repaired.resistanceComparison, aId: 2, bId: 1 };
  await mount(page, repaired); before = await state(page); await expect(next(page, 'resistance')).toHaveText('Reflect on saved evidence 2');
  await enter(page, 'resistance'); await expect(page.locator('#micro-resistance-reflection-2')).toBeFocused();
  const expected = clone(before); expected.microbiology.tab = 'resistance'; expected.microbiology.resistanceNotebook.records[1].id = 2;
  expected.microbiology.resistanceNotebook.selectedId = 2; expected.microbiology.resistanceComparison.aId = null;
  expect(await state(page)).toEqual(expected); expect(await xp(page)).toEqual([]); await noMarkup(page);
});

async function intercept(page: Page, activity: Activity, mode: string) {
  await page.evaluate(({ activity, mode }) => {
    const w = window as any, ctx = w.__ctx, original = ctx.setToolData;
    w.__homeBaseSetter = original; w.__homeRaceConsumed = false;
    const setter = (update: any) => {
      if (typeof update === 'function' && !w.__homeRaceConsumed) {
        w.__homeRaceConsumed = true;
        original((previous: any) => {
          let latest = { ...previous, unrelatedTool: { ...previous.unrelatedTool, latest: true }, microbiology: { ...previous.microbiology, latestRootMetadata: { keep: true } } };
          const micro = latest.microbiology;
          if (activity === 'mystery') {
            const book = micro.mysteryLab;
            micro.mysteryLab = { ...book, latestNotebookMetadata: { keep: true }, cases: { ...book.cases, pond: { ...book.cases.pond, latestOtherCaseMetadata: true } } };
            if (mode === 'target') micro.mysteryLab.cases.wall = { ...book.cases.wall, reasoning: 'Newer target revision.', latestTarget: true };
            if (mode === 'selection') micro.mysteryLab.active = 'pond';
            if (mode === 'unrelated') book.cases.wall.latestUnknownTargetMetadata = { keep: true };
          } else {
            const field = activity === 'growth' ? 'growthInvestigation' : 'resistanceNotebook', records = activity === 'growth' ? 'trials' : 'records';
            const book = micro[field]; micro[field] = { ...book, latestNotebookMetadata: { keep: true }, [records]: book[records].map((record: any) => record.id === 7 ? record : { ...record, latestOtherRecordMetadata: true }) };
            if (mode === 'target') micro[field][records] = micro[field][records].map((record: any) => record.id === 7 ? { ...record, latestTarget: true } : record);
            if (mode === 'selection') micro[field].selectedId = 7;
            if (mode === 'unrelated') book[records].find((record: any) => record.id === 7).latestUnknownTargetMetadata = { keep: true };
          }
          if (mode === 'tab') micro.tab = 'quiz';
          if (mode === 'import') latest = JSON.parse(JSON.stringify(latest));
          w.__homeRaceExpected = JSON.parse(JSON.stringify(latest));
          if (mode === 'unrelated') {
            const expected = w.__homeRaceExpected.microbiology; expected.tab = activity === 'growth' ? 'growthLab' : activity;
            if (activity === 'mystery') { expected.mysteryLab.active = 'wall'; expected.mysteryLab.notice = ''; expected.mysteryLab.cases.wall.reportView = 'working'; }
            else expected[activity === 'growth' ? 'growthInvestigation' : 'resistanceNotebook'].selectedId = 7;
          }
          return latest;
        });
      }
      original(update);
    };
    ctx.setToolData = setter; ctx.setLabToolData = setter; w.__rerender();
  }, { activity, mode });
}
async function finishRace(page: Page) {
  expect(await page.evaluate(() => (window as any).__homeRaceConsumed)).toBe(true);
  expect(await state(page)).toEqual(await page.evaluate(() => (window as any).__homeRaceExpected)); expect(await xp(page)).toEqual([]);
  await page.evaluate(() => { const w = window as any; w.__ctx.setToolData = w.__homeBaseSetter; w.__ctx.setLabToolData = w.__homeBaseSetter; w.__rerender(); });
  await harness.unmount(page);
}

test('queued Home resumes retain later unrelated notebook, record, activity and tool metadata', async ({ page }) => {
  for (const activity of activities) {
    await mount(page); await intercept(page, activity, 'unrelated'); await enter(page, activity); await finishRace(page);
  }
});

test('queued Home resumes reject JSON imports, replaced target owners, later selection and tab changes', async ({ page }) => {
  for (const activity of activities) for (const mode of ['import', 'target', 'selection', 'tab']) {
    await mount(page); await intercept(page, activity, mode); await enter(page, activity); await finishRace(page);
  }
});

async function holdHomeFocus(page: Page) {
  await page.evaluate(() => {
    const w = window as any, original = window.setTimeout;
    w.__homeOriginalSetTimeout = original; w.__homeHeldFocus = [];
    window.setTimeout = ((callback: any, delay: any, ...args: any[]) => {
      if (typeof callback === 'function' && Number(delay) === 0 && String(callback).includes('__microHomeFocusRequest')) {
        w.__homeHeldFocus.push(() => callback(...args)); return original(() => {}, 0);
      }
      return original(callback, delay, ...args);
    }) as typeof window.setTimeout;
  });
}
async function flushHomeFocus(page: Page) {
  await page.evaluate(() => { const w = window as any; window.setTimeout = w.__homeOriginalSetTimeout; w.__homeHeldFocus.splice(0).forEach((run: any) => run()); });
}
test('deferred Home focus respects same-tab JSON imports and newer focus without reopening stale disclosures', async ({ page }) => {
  for (const activity of activities) for (const mode of ['import', 'focus']) {
    await mount(page); await holdHomeFocus(page); await enter(page, activity);
    expect(await page.evaluate(() => (window as any).__homeHeldFocus.length)).toBe(1);
    await expect(page.locator(`#micro-tab-${tabs[activity]}`)).toHaveAttribute('aria-selected', 'true');
    if (mode === 'import') {
      await page.evaluate(() => {
        const w = window as any; w.__ctx.setToolData((previous: any) => {
          const imported = JSON.parse(JSON.stringify(previous)); imported.microbiology.latestImportMetadata = { keep: true }; return imported;
        });
      });
      await expect(page.locator(`#micro-tab-${tabs[activity]}`)).toHaveAttribute('aria-selected', 'true');
    } else await page.locator('#micro-tab-quiz').focus();
    const before = await state(page); await flushHomeFocus(page); expect(await state(page)).toEqual(before);
    if (mode === 'focus') await expect(page.locator('#micro-tab-quiz')).toBeFocused();
    else await expect(page.locator(anchors[activity])).not.toBeFocused();
    if (activity === 'resistance') await expect(page.locator('.micro-resistance-saved')).not.toHaveAttribute('open', '');
    expect(await xp(page)).toEqual([]); await harness.unmount(page);
  }
});

test('phone and enlarged Home shortcuts wrap, stay keyboard usable and preserve raw notebook text', async ({ page }) => {
  await mount(page); await noOverflow(page);
  await page.locator('.micro-workspace-grid').screenshot({ path: path.join(out, 'home-integrity-desktop.png') });
  for (const [width, zoom] of [[320, 1], [1280, 2], [1280, 4]]) {
    await page.setViewportSize({ width, height: 844 }); await page.evaluate(value => { document.body.style.zoom = String(value); }, zoom);
    await noOverflow(page); const before = await state(page);
    if (zoom === 1) await page.locator('[data-work-card="mystery"]').screenshot({ path: path.join(out, 'home-integrity-phone.png') });
    if (zoom === 4) await page.locator('[data-work-card="mystery"]').screenshot({ path: path.join(out, 'home-integrity-zoom.png') });
    await enter(page, 'mystery'); await expect(page.locator(anchors.mystery)).toBeFocused(); await noOverflow(page);
    expect(await state(page)).toEqual(resumed(before, 'mystery')); await noMarkup(page);
    const notes = (await state(page)).microbiology.mysteryLab.cases.pond.reasoning; expect(notes).toBe(longNote);
    await page.locator('#micro-tab-home').focus(); await page.locator('#micro-tab-home').press('Enter'); await expect(page.locator('.micro-workspace-home')).toBeVisible();
  }
  expect(await xp(page)).toEqual([]);
});
