import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 150000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-mystery-integrity-2026-10-02');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const literal = '<img src=x onerror="window.__mysteryInjected=true"> & imported evidence stays literal';
const longNote = 'Untouched imported reasoning. ' + 'Additional original evidence; '.repeat(62) + 'ORIGINAL END';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
const panel = (page: Page) => page.locator('[data-micro-mystery]');
const reason = (page: Page) => page.locator('#micro-mystery-reasoning');
const reportView = (page: Page, name: 'Working notes' | 'Recorded report') => page.getByRole('group', { name: 'Report view', exact: true }).getByRole('button', { name, exact: true });
const caseButton = (page: Page, title: string) => page.getByRole('group', { name: 'Choose a specimen case', exact: true }).getByRole('button', { name: new RegExp(title) });
const xp = (page: Page) => page.evaluate(() => (window as any).__mysteryXP);
let errors: string[];

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });

function report(claim: string, reasoning: string, marker: string) {
  return { claim, evidence: ['size', 'structure', 'behavior'], reasoning, limitation: 'bounded', originalReportMetadata: { marker, literal } };
}
function entry(claim: string, reasoning: string, marker: string) {
  return { revealed: ['context', 'size', 'structure', 'behavior'], collapsed: [], reportView: 'working', claim,
    evidence: ['size', 'structure', 'behavior'], reasoning, limitation: 'bounded', checked: true,
    record: report(claim, 'Recorded reasoning for ' + marker + '.', marker), previousRecord: report(claim, 'Previous reasoning for ' + marker + '.', 'previous-' + marker),
    importedCaseMetadata: { marker, nested: [literal, { preserve: true }] }, rawCaseArrays: [{ unchanged: marker }] };
}
function seed(activeReasoning = 'Working reasoning for wall.'): Record<string, any> {
  return {
    tab: 'mystery', showMicroLibrary: false,
    mysteryLab: { active: 'wall', notice: 'download_failed', importedLabMetadata: { original: literal, nested: ['Keep this notebook.'] },
      cases: { wall: entry('bacterium', activeReasoning, 'wall'), pond: entry('protist', longNote, 'pond'),
        budding: { ...entry('yeast', longNote, 'budding'), record: null, previousRecord: null },
        salt: entry('archaeon', longNote, 'salt'), particle: entry('phage', longNote, 'particle'), unresolved: entry('unresolved', longNote, 'unresolved'),
        unknownImportedCase: { raw: { reasoning: longNote, metadata: literal } } } },
    growthInvestigation: { control: { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 }, rawMarker: literal, trials: [{ id: 7, raw: true }] },
    resistanceInvestigation: { notes: literal, importedRun: { keep: true } },
    microscopeMeasurements: { unknownImportedSlide: { raw: literal } }, externalMarker: { literal, original: true }
  };
}
async function mount(page: Page, data = seed()) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { unrelatedNotebook: { original: literal, nested: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await expect(panel(page)).toBeVisible();
  await page.evaluate(() => { const w = window as any; w.__mysteryXP = []; w.__ctx.awardXP = (...args: any[]) => w.__mysteryXP.push(args); w.__rerender(); });
}
function changed(before: any, fields: Record<string, any> = {}, active?: string, notice = '') {
  const expected = clone(before), lab = expected.microbiology.mysteryLab;
  Object.assign(lab.cases[lab.active], fields); if (active) lab.active = active; lab.notice = notice; return expected;
}
async function activate(button: Locator) { await button.focus(); await button.press('Enter'); }
async function open(details: Locator) {
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) await details.locator(':scope > summary').press('Enter');
  await expect(details).toHaveAttribute('open', '');
}
async function noOverflow(page: Page) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, zoom: getComputedStyle(document.body).zoom }));
  expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  const layout = await page.locator('.micro-mystery-grid').evaluate(node => ({
    columns: getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/).length,
    width: node.clientWidth,
    reportWidth: node.querySelector('[aria-label="Classification and reasoning"]')!.clientWidth
  }));
  expect(layout.columns, JSON.stringify({ viewport, layout })).toBe(1);
  expect(layout.reportWidth >= layout.width - 2, JSON.stringify({ viewport, layout })).toBe(true);
  for (const target of [page.locator('[data-microbiology-tool]'), panel(page), page.getByRole('region', { name: 'Classification and reasoning', exact: true })]) {
    const box = await target.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth }));
    expect(box.scroll <= box.client + 1, JSON.stringify({ viewport, box })).toBe(true);
  }
}

test('keyboard report view round trip keeps raw imported notes, metadata, saved versions and JSON reload intact', async ({ page }) => {
  await mount(page, seed(longNote + literal)); const before = await state(page);
  expect(before.microbiology.mysteryLab.cases.wall.reasoning.length).toBeGreaterThan(1600);
  await expect(reason(page)).toHaveValue((longNote + literal).slice(0, 1600)); expect(await state(page)).toEqual(before);
  await activate(reportView(page, 'Recorded report'));
  await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-report-view', 'recorded');
  await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  expect(await state(page)).toEqual(changed(before, { reportView: 'recorded' }));
  await expect(panel(page)).toContainText('Recorded reasoning for wall.');
  await page.getByRole('region', { name: 'Classification and reasoning', exact: true }).screenshot({ path: path.join(out, 'mystery-integrity-recorded-desktop.png') });
  await activate(reportView(page, 'Working notes'));
  await expect(reason(page)).toHaveValue((longNote + literal).slice(0, 1600));
  const saved = changed(before, { reportView: 'working' }); expect(await state(page)).toEqual(saved); expect(await xp(page)).toEqual([]);
  await harness.unmount(page); await page.evaluate(data => (window as any).__mount(data), clone(saved));
  await expect(reason(page)).toHaveValue((longNote + literal).slice(0, 1600)); expect(await state(page)).toEqual(saved);
  writeFileSync(path.join(out, 'mystery-integrity-restored-state.json'), JSON.stringify(saved, null, 2) + '\n');
});

test('case buttons and next unrecorded case preserve every untouched raw case and long imported notebook note', async ({ page }) => {
  await mount(page); let before = await state(page);
  await activate(caseButton(page, 'Freshwater drifter'));
  await expect(panel(page)).toHaveAttribute('data-micro-mystery', 'pond');
  await expect(page.locator('#micro-mystery-observation-heading')).toBeFocused();
  expect(await state(page)).toEqual(changed(before, {}, 'pond'));
  await expect(reason(page)).toHaveValue(longNote.slice(0, 1600));
  before = await state(page); await activate(page.getByRole('button', { name: /^Next unrecorded case: B/ }));
  await expect(panel(page)).toHaveAttribute('data-micro-mystery', 'budding'); expect(await state(page)).toEqual(changed(before, {}, 'budding'));
  await expect(page.locator('#micro-mystery-observation-heading')).toBeFocused();
  before = await state(page); await activate(caseButton(page, 'The wall is the clue'));
  expect(await state(page)).toEqual(changed(before, {}, 'wall')); expect(await xp(page)).toEqual([]);
  expect((await state(page)).microbiology.mysteryLab.cases.pond.reasoning).toBe(longNote);
});

test('next pending revision selects the existing working view without rewriting any imported draft or report', async ({ page }) => {
  const data = seed(); data.mysteryLab.cases.salt.reportView = 'recorded'; await mount(page, data); const before = await state(page);
  await activate(page.locator('[data-mystery-next-revision="salt"]'));
  await expect(panel(page)).toHaveAttribute('data-micro-mystery', 'salt');
  await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-report-view', 'working');
  await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  const expected = changed(before, {}, 'salt'); expected.microbiology.mysteryLab.cases.salt.reportView = 'working';
  expect(await state(page)).toEqual(expected); await expect(reason(page)).toHaveValue(longNote.slice(0, 1600)); expect(await xp(page)).toEqual([]);
});

test('editing, checking, recording and restoring touch only the selected leaves and preserve exact previous raw report metadata', async ({ page }) => {
  await mount(page); let before = await state(page); const replacement = literal + ' Peptidoglycan and cell organization support a broad bacterial claim.';
  await reason(page).fill(replacement); expect(await state(page)).toEqual(changed(before, { reasoning: replacement, checked: false }));
  before = await state(page); await activate(page.locator('#micro-clue-wall-size-toggle'));
  expect(await state(page)).toEqual(changed(before, { collapsed: ['size'] }));
  before = await state(page); await activate(page.getByRole('button', { name: 'Check my evidence', exact: true }));
  expect(await state(page)).toEqual(changed(before, { checked: true }));
  before = await state(page); await activate(page.getByRole('button', { name: 'Update recorded report', exact: true }));
  const newReport = { claim: 'bacterium', evidence: ['size', 'structure', 'behavior'], reasoning: replacement, limitation: 'bounded' };
  expect(await state(page)).toEqual(changed(before, { previousRecord: before.microbiology.mysteryLab.cases.wall.record, record: newReport }, undefined, 'saved'));
  await expect(panel(page)).toContainText(replacement); expect(await page.evaluate(() => Boolean((window as any).__mysteryInjected))).toBe(false);
  await expect(panel(page).locator('img[src="x"]')).toHaveCount(0);
  before = await state(page); await open(page.locator('[data-mystery-history="wall"]'));
  await activate(page.getByRole('button', { name: 'Restore previous report', exact: true }));
  expect(await state(page)).toEqual(changed(before, { record: before.microbiology.mysteryLab.cases.wall.previousRecord, previousRecord: before.microbiology.mysteryLab.cases.wall.record }, undefined, 'restored'));
  await expect(reason(page)).toHaveValue(replacement); expect(await xp(page)).toEqual([]);
});

async function intercept(page: Page, mode: string, action: 'navigate' | 'edit') {
  await page.evaluate(({ mode, action }) => {
    const w = window as any, ctx = w.__ctx, original = ctx.setToolData;
    w.__mysteryBaseSetter = original; w.__mysteryRaceConsumed = false;
    const setter = (update: any) => {
      if (typeof update === 'function' && !w.__mysteryRaceConsumed) {
        w.__mysteryRaceConsumed = true;
        original((previous: any) => {
          const current = previous.microbiology, lab = current.mysteryLab, wall = lab.cases.wall;
          const newWall = mode === 'report' ? { ...wall, record: { ...wall.record, reasoning: 'A newer saved report.', currentMarker: true } } :
            mode === 'draft' ? { ...wall, reasoning: 'A newer working draft.', currentMarker: true } : wall;
          const next = { ...previous, unrelatedNotebook: { ...previous.unrelatedNotebook, concurrent: true }, microbiology: { ...current,
            externalMarker: { ...current.externalMarker, concurrent: true }, ...(mode === 'tab' ? { tab: 'quiz' } : {}),
            mysteryLab: { ...lab, ...(mode === 'active' ? { active: 'salt' } : {}), concurrentLabMetadata: { keep: 'Latest notebook field.' },
              cases: { ...lab.cases, wall: newWall, pond: { ...lab.cases.pond, concurrentCaseMetadata: { keep: true } } } } } };
          w.__mysteryRaceExpected = JSON.parse(JSON.stringify(next));
          if (mode === 'unrelated') {
            w.__mysteryRaceExpected.microbiology.mysteryLab.notice = '';
            if (action === 'navigate') w.__mysteryRaceExpected.microbiology.mysteryLab.active = 'pond';
            else { w.__mysteryRaceExpected.microbiology.mysteryLab.cases.wall.reasoning = 'My explicit current edit.'; w.__mysteryRaceExpected.microbiology.mysteryLab.cases.wall.checked = false; }
          }
          return next;
        });
      }
      original(update);
    };
    ctx.setToolData = setter; ctx.setLabToolData = setter; w.__rerender();
  }, { mode, action });
}
async function finishRace(page: Page) {
  expect(await page.evaluate(() => (window as any).__mysteryRaceConsumed)).toBe(true);
  expect(await state(page)).toEqual(await page.evaluate(() => (window as any).__mysteryRaceExpected)); expect(await xp(page)).toEqual([]);
  await page.evaluate(() => { const w = window as any; w.__ctx.setToolData = w.__mysteryBaseSetter; w.__ctx.setLabToolData = w.__mysteryBaseSetter; w.__rerender(); });
  await harness.unmount(page);
}

test('case navigation keeps concurrent unrelated notes and rejects later active case, report, or tab updates', async ({ page }) => {
  for (const mode of ['unrelated', 'report', 'active', 'tab']) {
    await mount(page); await intercept(page, mode, 'navigate'); await activate(caseButton(page, 'Freshwater drifter')); await finishRace(page);
  }
});

test('a queued reasoning edit preserves unrelated latest evidence and cannot overwrite a newer draft, report, case or tab', async ({ page }) => {
  for (const mode of ['unrelated', 'draft', 'report', 'active', 'tab']) {
    await mount(page); await intercept(page, mode, 'edit'); await reason(page).fill('My explicit current edit.'); await finishRace(page);
  }
});

test('phone and enlarged report navigation stays keyboard usable while imported markup and long untouched notes remain intact', async ({ page }) => {
  await mount(page, seed(literal)); let before = await state(page);
  await page.setViewportSize({ width: 320, height: 844 }); await noOverflow(page);
  await activate(reportView(page, 'Recorded report')); expect(await state(page)).toEqual(changed(before, { reportView: 'recorded' }));
  await expect(page.locator('#micro-mystery-report-heading')).toBeFocused(); await noOverflow(page);
  await page.getByRole('region', { name: 'Classification and reasoning', exact: true }).screenshot({ path: path.join(out, 'mystery-integrity-recorded-phone.png') });
  for (const zoom of [2, 4]) {
    await page.setViewportSize({ width: 1280, height: 960 }); await page.evaluate(value => { document.body.style.zoom = String(value); }, zoom);
    await noOverflow(page); before = await state(page); await activate(reportView(page, 'Working notes'));
    expect(await state(page)).toEqual(changed(before, { reportView: 'working' })); await expect(reason(page)).toHaveValue(literal); await noOverflow(page);
    before = await state(page); await activate(reportView(page, 'Recorded report')); expect(await state(page)).toEqual(changed(before, { reportView: 'recorded' })); await noOverflow(page);
  }
  await page.getByRole('region', { name: 'Classification and reasoning', exact: true }).screenshot({ path: path.join(out, 'mystery-integrity-recorded-zoom.png') });
  expect(await page.evaluate(() => Boolean((window as any).__mysteryInjected))).toBe(false); await expect(panel(page).locator('img[src="x"]')).toHaveCount(0);
  expect((await state(page)).microbiology.mysteryLab.cases.pond.reasoning).toBe(longNote); expect(await xp(page)).toEqual([]);
});
