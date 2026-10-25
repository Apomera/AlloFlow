import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 240000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND16_REPORT || 'reports/raptor-distance-round16-20261023');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900, appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.pairedProbeNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  panel: '[data-distance-signal]', explorer: '[data-distance-pair-explorer]', table: '[data-distance-pair-samples]',
  read: '[data-distance-signal-read]', keep: '[data-distance-signal-keep]', probe: '[data-distance-pair-probe]',
  oldProbe: '[data-distance-signal-probe]', pixel: '[data-distance-pair-pixel]', reveal: '[data-distance-reveal]',
  note: '[data-distance-note]', error: '[data-distance-signal-error]', lower: '[data-distance-signal-lower]'
};
const ids = ['human', 'eagle'] as const;
type Reference = typeof ids[number];
type Choice = 'smaller' | 'same' | 'larger';
const priorRecord = { version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95, widthM: .3,
  referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note: 'My earlier saved observation.' };
const savedResults = { version: 1, human: { version: 1, modelVersion: 1, reference: 'human', trials: [85, 86].map((distance, index) => ({
  settings: { version: 1, distance, cycles: 12, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 }, prediction: index ? 'eagle' : 'both'
})) } };

async function setup(page: Page) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), nativePng = HTMLCanvasElement.prototype.toDataURL;
    const nativeRead = CanvasRenderingContext2D.prototype.getImageData;
    (window as any).pairedProbeRafs = 0; (window as any).pairedProbeCaptures = 0; (window as any).pairedProbeReads = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).pairedProbeRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).pairedProbeCaptures++;
      return nativePng.apply(this, args as any);
    };
    CanvasRenderingContext2D.prototype.getImageData = function (...args: any[]) {
      if (this.canvas.hasAttribute('data-distance-canvas') && /raptor_distance_(study|signal)\.js/.test(String(new Error().stack))) (window as any).pairedProbeReads++;
      return nativeRead.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({ contentType: 'text/javascript',
    body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.pairedProbeNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: 'low',
    xp: 97, huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false },
    distantDetailStudy: { version: 1, distance: 80, cycles: 8, contrast: 95, records: [priorRecord], fieldworkResults: savedResults }
  } }, undefined, { expectCanvas: false });
  await expect(page.locator(ui.launch)).toBeVisible(); expect(await harness.glContexts(page)).toEqual([]);
  return { errors, siblings: await siblings(page) };
}
async function siblings(page: Page) {
  return page.evaluate(() => { const value = { ...(window as any).__toolData.raptorHunt }; delete value.distantDetailStudy; return value; });
}
async function activate(page: Page, selector: string) { await page.locator(selector).focus(); await page.keyboard.press('Enter'); }
async function open(page: Page) {
  await activate(page, ui.launch); await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  await activate(page, ui.panel + ' > summary');
}
async function reveal(page: Page) {
  await activate(page, '[data-distance-prediction="both"]'); await activate(page, ui.reveal);
  await expect(page.locator('[data-distance-result]')).toBeVisible();
}
async function setRange(page: Page, name: string, value: number) {
  await page.locator('#rh-distance-' + name).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}
async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({ lifecycle: root._distanceScene.getDiagnostics().lifecycle,
    captures: (window as any).pairedProbeCaptures, reads: (window as any).pairedProbeReads, rafs: (window as any).pairedProbeRafs,
    persisted: (window as any).__toolData.raptorHunt.distantDetailStudy }));
}
async function pixels(page: Page) {
  // Sample the actual canvas independently of the activity's values, min/max and plotting helpers.
  return page.locator(ui.root).evaluate(root => {
    const distance = Number((root.querySelector('#rh-distance-distance') as HTMLInputElement).value);
    const cycles = Number((root.querySelector('#rh-distance-cycles') as HTMLInputElement).value);
    const contrast = Number((root.querySelector('#rh-distance-contrast') as HTMLInputElement).value);
    const width = 1024 * .30 / (2 * distance * Math.tan(.75 * Math.PI / 360));
    const x0 = Math.ceil(512 - width * .30), x1 = Math.floor(512 + width * .30), y = 256, count = x1 - x0 + 1;
    const rows = ['reference', 'eagle'].map(name => {
      const canvas = root.querySelector('canvas[data-distance-canvas="' + name + '"]') as HTMLCanvasElement;
      const rgba = Array.from(canvas.getContext('2d')!.getImageData(x0, y, count, 1).data), values: number[] = [];
      for (let i = 0; i < rgba.length; i += 4) values.push((rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3);
      const min = Math.min(...values), max = Math.max(...values);
      return { name: name === 'reference' ? 'human' : 'eagle', rgba, values, min, max, range: max - min,
        minIndex: values.indexOf(min), maxIndex: values.indexOf(max) };
    });
    return { distance, cycles, contrast, x0, x1, y, count, rows };
  });
}
type Reading = Awaited<ReturnType<typeof pixels>>;
async function read(page: Page) {
  const expected = await pixels(page), before = await work(page);
  await activate(page, ui.read); await expect(page.locator('[data-distance-signal-chart]')).toBeVisible();
  expect(await work(page)).toEqual({ ...before, reads: before.reads + 2 });
  return expected;
}
async function openPair(page: Page) {
  await expect(page.locator(ui.explorer)).toBeAttached();
  if (await page.locator(ui.explorer).getAttribute('open') === null) await activate(page, ui.explorer + ' > summary');
  await expect(page.locator(ui.table)).toBeVisible();
  await expect(page.locator(ui.probe)).toHaveAccessibleName('Compare the same pixel');
}
async function pairedValues(page: Page, kept: Reading, current: Reading, index: number) {
  expect([current.x0, current.x1, current.y, current.count]).toEqual([kept.x0, kept.x1, kept.y, kept.count]);
  await expect(page.locator(ui.probe)).toHaveValue(String(index));
  await expect(page.locator(ui.probe)).toHaveAttribute('min', '0'); await expect(page.locator(ui.probe)).toHaveAttribute('max', String(kept.count - 1));
  await expect(page.locator(ui.pixel)).toHaveAttribute('data-x', String(kept.x0 + index));
  await expect(page.locator(ui.pixel)).toHaveAttribute('data-y', String(kept.y));
  const spoken = (await page.locator(ui.probe).getAttribute('aria-valuetext'))!;
  expect(spoken).toContain(String(kept.x0 + index)); expect(spoken).toContain(String(kept.y));
  for (const id of ids) {
    const oldValue = kept.rows.find(row => row.name === id)!.values[index], newValue = current.rows.find(row => row.name === id)!.values[index];
    const values = { kept: oldValue, current: newValue, change: newValue - oldValue };
    for (const [kind, value] of Object.entries(values)) {
      const cell = page.locator('[data-distance-pair-value="' + id + '-' + kind + '"]');
      expect(Number(await cell.getAttribute('data-value'))).toBeCloseTo(value, 10);
      const rounded = Number(value.toFixed(1));
      const printed = (kind === 'change' && rounded > 0 ? '+' : '') + rounded.toFixed(1);
      await expect(cell).toHaveText(printed);
      if (kind !== 'change') expect(spoken).toContain(value.toFixed(1));
    }
    for (const [kind, value] of [['kept', oldValue], ['current', newValue]] as const) {
      const marker = page.locator('[data-distance-pair-marker="' + id + '-' + kind + '"]');
      expect(Number(await marker.getAttribute('cx'))).toBeCloseTo(54 + index / (kept.count - 1) * 566, 3);
      expect(Number(await marker.getAttribute('cy'))).toBeCloseTo(216 - value / 255 * 192, 3);
    }
    const cursor = page.locator('[data-distance-pair-cursor="' + id + '"]');
    expect(Number(await cursor.getAttribute('x1'))).toBeCloseTo(54 + index / (kept.count - 1) * 566, 3);
    expect(Number(await cursor.getAttribute('x2'))).toBeCloseTo(54 + index / (kept.count - 1) * 566, 3);
  }
}
function correctChoice(kept: Reading, current: Reading, id: Reference): Choice {
  const before = Number(kept.rows.find(row => row.name === id)!.range.toFixed(1));
  const after = Number(current.rows.find(row => row.name === id)!.range.toFixed(1));
  return after === before ? 'same' : after > before ? 'larger' : 'smaller';
}
async function answer(page: Page, id: Reference, choice: Choice, correct: boolean) {
  await activate(page, '[data-distance-pair-answer="' + id + '-' + choice + '"]');
  await expect(page.locator('[data-distance-pair-feedback="' + id + '"]')).toHaveAttribute('data-correct', String(correct));
  for (const option of ['smaller', 'same', 'larger']) {
    await expect(page.locator('[data-distance-pair-answer="' + id + '-' + option + '"]')).toHaveAttribute('aria-pressed', String(option === choice));
  }
}
async function noAnswers(page: Page) {
  await expect(page.locator('[data-distance-pair-feedback]')).toHaveCount(0);
  for (const control of await page.locator('[data-distance-pair-answer]').all()) await expect(control).toHaveAttribute('aria-pressed', 'false');
}
async function absent(page: Page) { await expect(page.locator(ui.explorer)).toHaveCount(0); await noAnswers(page); }
async function close(page: Page, initialSiblings: unknown) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).pairedProbeClosedScene = root._distanceScene; });
  await activate(page, ui.close); await expect(page.locator(ui.root)).toHaveCount(0); await expect(page.locator(ui.launch)).toBeFocused();
  expect(await page.evaluate(() => (window as any).pairedProbeClosedScene.getDiagnostics().lifecycle)).toMatchObject({
    disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0
  });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('paired keyboard exploration compares independently sampled pixels and measured ranges without altering evidence', async ({ page }) => {
  const initial = await setup(page); await open(page); await reveal(page); const kept = await read(page); await activate(page, ui.keep);
  await activate(page, ui.lower); await reveal(page); const current = await read(page); await openPair(page);
  await activate(page, '[data-distance-pin]');
  const draft = 'I compared the same pixel positions and the full light–dark ranges before writing my explanation.';
  await page.locator(ui.note).fill(draft);
  const pins = await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src));
  const keptRanges = await page.locator('[data-distance-signal-kept-range]').allTextContents(), before = await work(page);
  const originalProbe = await page.locator(ui.oldProbe).inputValue();
  await expect(page.locator(ui.table).getByRole('columnheader')).toHaveText(['Reading', 'Human', 'Eagle']);
  await expect(page.locator(ui.table).getByRole('rowheader')).toHaveText(['Kept', 'Current', 'Change']);
  const lines = await page.locator('[data-distance-signal-pair-line]').evaluateAll(nodes => nodes.map(node => node.getAttribute('points')));
  await page.locator(ui.probe).evaluate(input => {
    (window as any).pairedProbeFocus = [];
    input.addEventListener('focus', () => { (window as any).pairedProbeFocus.push({ index: Number((input as HTMLInputElement).value),
      x: Number(document.querySelector('[data-distance-pair-pixel]')!.getAttribute('data-x')),
      values: Array.from(document.querySelectorAll('[data-distance-pair-value]')).map(node => ({ name: node.getAttribute('data-distance-pair-value'), value: Number(node.getAttribute('data-value')) })) }); });
  });
  const jumps: [string, number][] = [['start', 0], ['middle', Math.floor((kept.count - 1) / 2)], ['end', kept.count - 1]];
  for (const row of kept.rows) jumps.push([row.name + '-min', row.minIndex], [row.name + '-max', row.maxIndex]);
  for (const [name, index] of jumps) {
    await activate(page, '[data-distance-pair-jump="' + name + '"]'); await expect(page.locator(ui.probe)).toBeFocused();
    await pairedValues(page, kept, current, index); await expect(page.locator(ui.oldProbe)).toHaveValue(originalProbe);
    expect(await work(page)).toEqual(before);
  }
  const focused = await page.evaluate(() => (window as any).pairedProbeFocus);
  expect(focused).toHaveLength(jumps.length);
  focused.forEach((state: any, position: number) => {
    const index = jumps[position][1]; expect(state.index).toBe(index); expect(state.x).toBe(kept.x0 + index);
    for (const id of ids) for (const kind of ['kept', 'current'] as const) {
      expect(state.values.find((entry: any) => entry.name === id + '-' + kind).value).toBeCloseTo((kind === 'kept' ? kept : current).rows.find(row => row.name === id)!.values[index], 10);
    }
  });
  const answers: Record<string, Choice> = {};
  for (const id of ids) {
    const region = page.locator('[data-distance-announcement="signal-pair-' + id + '"]');
    await expect(region).toHaveAttribute('role', 'status'); await expect(region).toHaveAttribute('aria-live', 'polite'); await expect(region).toHaveAttribute('aria-atomic', 'true');
    await region.evaluate((node, name) => { ((window as any).pairedProbeRegions ||= {})[name] = node; }, id);
    const correct = correctChoice(kept, current, id); answers[id] = correct;
    await answer(page, id, correct === 'same' ? 'larger' : 'same', false); await answer(page, id, correct, true);
    expect(await region.evaluate((node, name) => node === (window as any).pairedProbeRegions[name], id)).toBe(true);
    await expect(region.locator('button,input,table,svg,[role="status"]')).toHaveCount(0);
    const group = page.locator('[data-distance-pair-answer="' + id + '-same"]').locator('xpath=ancestor::*[@role="group"][1]');
    await expect(group).toHaveAccessibleName(/range/i); await expect(group.getByRole('button')).toHaveCount(3);
  }
  await page.locator(ui.probe).focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await pairedValues(page, kept, current, 1);
  await page.locator(ui.oldProbe).focus(); await page.keyboard.press('End'); await pairedValues(page, kept, current, 1);
  await activate(page, '[data-distance-inspector] > summary'); await activate(page, '[data-distance-magnifier] > summary');
  await activate(page, '[data-distance-magnifier-zoom="4"]');
  for (const id of ids) await expect(page.locator('[data-distance-pair-feedback="' + id + '"]')).toHaveAttribute('data-correct', 'true');
  await activate(page, '[data-distance-pair-note]'); await expect(page.locator(ui.note)).toBeFocused(); await expect(page.locator(ui.note)).toHaveValue(draft);
  expect(await work(page)).toEqual(before);
  expect(await page.locator('[data-distance-signal-pair-line]').evaluateAll(nodes => nodes.map(node => node.getAttribute('points')))).toEqual(lines);
  expect(await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src))).toEqual(pins);
  expect(await page.locator('[data-distance-signal-kept-range]').allTextContents()).toEqual(keptRanges);
  expect(before.persisted.records).toEqual([priorRecord]); expect(before.persisted.fieldworkResults).toEqual(savedResults);
  writeFileSync(resolve(output, 'paired-probe-keyboard.json'), JSON.stringify({ kept, current, jumps, focused, answers,
    independentProbes: true, linesPreserved: true, stableFeedbackRegions: true, noSceneWorkCapturesReadsOrPersistence: true,
    focusOnlyNotebookLink: true, draftPinsSavedRecordsAndResultsPreserved: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('paired answers and probe positions follow fresh readings through stale views, failures and replacement', async ({ page }) => {
  const initial = await setup(page); await open(page); await reveal(page); const strong = await read(page); await activate(page, ui.keep);
  await activate(page, ui.lower); await reveal(page); const weak = await read(page); await openPair(page);
  const draft = 'My kept evidence and unfinished explanation survive unavailable current readings.'; await page.locator(ui.note).fill(draft);
  async function answerBoth(kept: Reading, current: Reading) { for (const id of ids) await answer(page, id, correctChoice(kept, current, id), true); }
  await answerBoth(strong, weak); await activate(page, '[data-distance-pair-jump="end"]');
  const repeated = await read(page); await openPair(page); await noAnswers(page);
  await pairedValues(page, strong, repeated, Math.floor((strong.count - 1) / 2)); expect(repeated).toEqual(weak);
  await answerBoth(strong, repeated); await activate(page, '[data-distance-pin]');
  for (const id of ids) await expect(page.locator('[data-distance-pair-feedback="' + id + '"]')).toHaveAttribute('data-correct', 'true');
  const pins = await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src));
  await activate(page, ui.reveal); await absent(page); await read(page); await openPair(page); await noAnswers(page);
  await answerBoth(strong, weak); await activate(page, '[data-distance-prediction="eagle"]'); await absent(page);
  await activate(page, ui.reveal); await read(page); await openPair(page); await noAnswers(page);
  await answerBoth(strong, weak); await setRange(page, 'distance', 120); await absent(page);
  await reveal(page); await read(page); await absent(page);
  await activate(page, '[data-distance-signal-held]'); await reveal(page); await read(page); await openPair(page); await noAnswers(page);
  await answerBoth(strong, weak);
  await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: any) => {
    canvas.pairedOriginalPng = canvas.toDataURL; canvas.toDataURL = () => { throw new Error('Injected paired copy failure'); };
  });
  try { await activate(page, ui.reveal); await expect(page.locator('[data-distance-snapshot-error]')).toBeVisible(); await absent(page); }
  finally { await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: any) => { canvas.toDataURL = canvas.pairedOriginalPng; delete canvas.pairedOriginalPng; }); }
  await activate(page, ui.reveal); await read(page); await openPair(page); await noAnswers(page); await answerBoth(strong, weak);
  await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')! as any; context.pairedOriginalRead = context.getImageData;
    context.getImageData = () => { throw new Error('Injected paired read failure'); };
  });
  const beforeFailure = await work(page);
  try { await activate(page, ui.read); await expect(page.locator(ui.error)).toBeVisible(); await absent(page); expect(await work(page)).toEqual(beforeFailure); }
  finally { await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')! as any; context.getImageData = context.pairedOriginalRead; delete context.pairedOriginalRead;
  }); }
  await read(page); await openPair(page); await noAnswers(page); await answerBoth(strong, weak);
  await activate(page, '[data-distance-pair-jump="end"]'); await activate(page, ui.keep); await openPair(page); await noAnswers(page);
  await pairedValues(page, weak, weak, Math.floor((weak.count - 1) / 2)); await answerBoth(weak, weak);
  await activate(page, ui.keep); await openPair(page); await noAnswers(page);
  await setRange(page, 'contrast', 95); await reveal(page); const restored = await read(page); await openPair(page);
  await pairedValues(page, weak, restored, Math.floor((weak.count - 1) / 2)); await answerBoth(weak, restored);
  expect(restored.rows).toEqual(strong.rows);
  for (const row of weak.rows) expect(Number(await page.locator('[data-distance-signal-kept-range="' + row.name + '"]').getAttribute('data-range'))).toBeCloseTo(row.range, 10);
  await expect(page.locator(ui.note)).toHaveValue(draft);
  expect(await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src))).toEqual(pins);
  const persisted = (await work(page)).persisted; expect(persisted.records).toEqual([priorRecord]); expect(persisted.fieldworkResults).toEqual(savedResults);
  writeFileSync(resolve(output, 'paired-probe-recovery.json'), JSON.stringify({ strong, weak, restored,
    invalidatedBy: ['repeated read', 'reveal', 'prediction', 'condition', 'copy failure', 'read failure', 'kept replacement', 'identical kept replacement'],
    resetToMiddleOnFreshIdentity: true, answersPreservedOnPin: true, incompatibleGeometryHidden: true,
    keptReadingDoesNotAliasNewReads: true, smallerSameLargerComparisons: true, pinsDraftAndSavedLearningPreserved: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('paired pixel investigation reflows at 320px with text spacing, keyboard control and forced colors', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page); await page.locator('#wrap').evaluate((node: HTMLElement) => { node.style.width = '100%'; });
  await open(page); await reveal(page); const kept = await read(page); await activate(page, ui.keep);
  await activate(page, ui.lower); await reveal(page); const current = await read(page); await openPair(page);
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const scans: any[] = [];
  async function scan(state: string) {
    const result = await page.locator(ui.root).evaluate(async root => {
      const audit = await (window as any).axe.run(root, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      const compact = (rule: any) => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.map((node: any) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) });
      return { version: audit.testEngine.version, violations: audit.violations.map(compact), incomplete: audit.incomplete.map(compact),
        inspectedNodes: [...audit.violations, ...audit.passes, ...audit.incomplete].reduce((sum: number, rule: any) => sum + rule.nodes.length, 0) };
    });
    scans.push({ state, ...result }); writeFileSync(resolve(output, 'paired-probe-axe.json'), JSON.stringify({ scope: ui.root,
      limitation: 'Automated scans do not establish full WCAG conformance or replace assistive-technology testing; incomplete results require review.', scans }, null, 2));
    expect(result.inspectedNodes).toBeGreaterThan(0); expect(result.violations, state + ': ' + JSON.stringify(result.violations)).toEqual([]);
  }
  await scan('compatible pair ready');
  for (const id of ids) await answer(page, id, correctChoice(kept, current, id) === 'same' ? 'larger' : 'same', false);
  await scan('pair explanation needs revision');
  for (const id of ids) await answer(page, id, correctChoice(kept, current, id), true);
  await scan('both pair explanations correct');
  const before = await work(page);
  await page.addStyleTag({ content: '[data-raptor-distance-study], [data-raptor-distance-study] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-raptor-distance-study] p{margin-bottom:2em!important}' });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await activate(page, '[data-distance-pair-jump="eagle-max"]'); await expect(page.locator(ui.probe)).toBeFocused();
  await page.keyboard.press('Home'); await pairedValues(page, kept, current, 0); await page.keyboard.press('End'); await pairedValues(page, kept, current, kept.count - 1);
  await activate(page, '[data-distance-pair-jump="start"]'); await expect(page.locator(ui.probe)).toBeFocused();
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-distance-pair-jump') || document.activeElement?.getAttribute('data-distance-pair-answer'));
  expect(focused).toBeTruthy();
  const layout = await page.locator(ui.explorer).evaluate((root: HTMLElement) => {
    const bounds = root.getBoundingClientRect(), focus = document.activeElement as HTMLElement, css = getComputedStyle(focus);
    const targets = Array.from(root.querySelectorAll('button,summary,input[type="range"]')).map(node => {
      const r = node.getBoundingClientRect(); return { name: node.getAttribute('aria-label') || node.textContent?.trim().slice(0, 80) || node.getAttribute('data-distance-pair-probe'), left: r.left, right: r.right, width: r.width, height: r.height };
    });
    const overflow = Array.from(root.querySelectorAll('p,h4,h5,strong,label,button,th,td,caption,summary,output')).filter(node => node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 2).map(node => node.textContent?.trim());
    const clippedText: any[] = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement;
      if (!node.textContent?.trim() || !parent || parent.closest('svg,style,script,input') || !parent.getClientRects().length) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const rect of Array.from(range.getClientRects())) {
        let ancestor: HTMLElement | null = parent;
        while (ancestor && root.contains(ancestor)) {
          const style = getComputedStyle(ancestor), r = ancestor.getBoundingClientRect();
          if ((['hidden', 'clip'].includes(style.overflowX) && (rect.left < r.left - 2 || rect.right > r.right + 2)) ||
            (['hidden', 'clip'].includes(style.overflowY) && (rect.top < r.top - 2 || rect.bottom > r.bottom + 2))) {
            clippedText.push({ text: node.textContent.trim().slice(0, 80), ancestor: ancestor.className }); break;
          }
          ancestor = ancestor.parentElement;
        }
      }
    }
    const headers = Array.from(root.querySelectorAll('[data-distance-pair-samples] thead th')).map(header => {
      const tops: number[] = [], text = document.createTreeWalker(header, NodeFilter.SHOW_TEXT);
      while (text.nextNode()) {
        if (!text.currentNode.textContent?.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(text.currentNode);
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width > 0 && rect.height > 0 && !tops.some(top => Math.abs(top - rect.top) < 1)) tops.push(rect.top);
        }
      }
      return { text: header.textContent?.trim(), lines: tops.length, lineTops: tops };
    });
    const paragraph = getComputedStyle(root.querySelector('p')!);
    const markers = Array.from(document.querySelectorAll('[data-distance-pair-marker]')).map(node => {
      const style = getComputedStyle(node); return { name: node.getAttribute('data-distance-pair-marker'), fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, visibility: style.visibility };
    });
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, left: bounds.left, right: bounds.right, targets, overflow, clippedText, markers, headers,
      focus: { visible: focus.matches(':focus-visible'), outline: css.outlineStyle, width: parseFloat(css.outlineWidth), foreground: css.color, background: css.backgroundColor },
      spacing: { font: parseFloat(paragraph.fontSize), line: parseFloat(paragraph.lineHeight), letter: parseFloat(paragraph.letterSpacing), word: parseFloat(paragraph.wordSpacing), bottom: parseFloat(paragraph.marginBottom) } };
  });
  expect(layout.viewport).toBe(320); expect(layout.documentWidth).toBeLessThanOrEqual(321); expect(layout.left).toBeGreaterThanOrEqual(-1); expect(layout.right).toBeLessThanOrEqual(321);
  expect(layout.targets).toHaveLength(16);
  expect(layout.headers.map(header => header.text)).toEqual(['Reading', 'Human', 'Eagle']);
  for (const header of layout.headers) expect(header.lines, header.text + ' remains intact with increased text spacing').toBe(1);
  for (const target of layout.targets) { expect(target.left, target.name || '').toBeGreaterThanOrEqual(-1); expect(target.right, target.name || '').toBeLessThanOrEqual(321); expect(target.width, target.name || '').toBeGreaterThanOrEqual(24); expect(target.height, target.name || '').toBeGreaterThanOrEqual(24); }
  expect(layout.overflow).toEqual([]); expect(layout.clippedText).toEqual([]); expect(layout.focus.visible).toBe(true);
  expect(layout.focus.outline).not.toBe('none'); expect(layout.focus.width).toBeGreaterThanOrEqual(3); expect(layout.focus.foreground).not.toBe(layout.focus.background);
  expect(layout.markers).toHaveLength(4); for (const marker of layout.markers) { expect(marker.visibility).toBe('visible'); expect(marker.stroke).not.toBe('none'); }
  expect(layout.spacing.line).toBeCloseTo(layout.spacing.font * 1.5, 1); expect(layout.spacing.letter).toBeCloseTo(layout.spacing.font * .12, 1);
  expect(layout.spacing.word).toBeCloseTo(layout.spacing.font * .16, 1); expect(layout.spacing.bottom).toBeCloseTo(layout.spacing.font * 2, 1);
  expect(await work(page)).toEqual(before);
  await page.locator(ui.explorer).screenshot({ path: resolve(output, 'paired-probe-mobile-forced-colors.jpg'), type: 'jpeg', quality: 90 });
  writeFileSync(resolve(output, 'paired-probe-reflow.json'), JSON.stringify({ layout, keyboardWorksInForcedColors: true, noPresentationSceneWorkOrPersistence: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});
