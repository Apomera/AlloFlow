import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_LABEL_NAMES_OUTPUT || 'test-results/dissection-label-names';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const errors = new WeakMap<Page, string[]>();
const pageErrorLog: { test: string; errors: string[] }[] = [];
const nameProof: { visible: string; accessible: string; snapshot: string }[] = [];
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=';
const substitute = process.env.STEM_GL_SUBSTITUTE?.split(';').find(entry => entry.startsWith('stem_lab/stem_tool_dissection.js='))?.slice('stem_lab/stem_tool_dissection.js='.length);
const servedFile = substitute || 'stem_lab/stem_tool_dissection.js';
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
async function mount(page: Page, state: Record<string, unknown> = {}) {
  await harness.mount(page, { dissection: {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
    selectedOrgan: 'nictitating', techniquePanelOpen: false, toolbarToolsOpen: false, toolbarViewOpen: false,
    quizMode: false, practicalMode: false, revealedLayers: { skin: true },
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: {},
    organNotes: { 'frog|nictitating': 'The transparent membrane covers the eye.' }, organConfidence: { 'frog|nictitating': 2 },
    procedureByLayer: { skin: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 1000 }] } },
    attemptArchive: { skin: [{ id: 101, score: 80, history: ['inspect'], actionLog: [{ action: 'inspect', at: 500 }] }] },
    annotations: [{ type: 'dot', x: .4, y: .4 }], visualEvidence: [],
    assessmentRecordedScore: 2, assessmentRecordedTotal: 4, assessmentCompletedAt: 100,
    reducedMotion: true, soundEnabled: false, sceneDetail: false, ...state,
  } }, undefined, { expectCanvas: false });
}
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); }
async function work(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return Object.fromEntries(['selectedOrgan', 'exploredOrgans', 'verifiedIdentifications', 'organNotes', 'organConfidence', 'procedureByLayer',
      'annotations', 'attemptArchive', 'visualEvidence', 'assessmentRecordedScore', 'assessmentRecordedTotal', 'assessmentCompletedAt'].map(key => [key, d[key]]));
  });
}
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
async function containsVisibleName(control: Locator) {
  await expect(control).toBeVisible(); const visible = normalize(await control.innerText()), snapshot = await control.ariaSnapshot();
  const match = snapshot.match(/^- button ("(?:[^"\\]|\\.)*")/m);
  expect(match, snapshot).not.toBeNull(); const accessible = normalize(JSON.parse(match![1]));
  expect(accessible.startsWith(visible), JSON.stringify({ visible, accessible })).toBe(true);
  await expect(control).toHaveAccessibleName(accessible); nameProof.push({ visible, accessible, snapshot });
}

test('capture and reset names include their complete visible captions after opening Lab tools', async ({ page }) => {
  await mount(page); const before = await work(page);
  await activate(page, page.getByRole('button', { name: 'Lab tool options', exact: true }));
  const capture = page.getByRole('button', { name: /^Capture evidence/ });
  await containsVisibleName(capture); await capture.focus(); await expect(capture).toBeFocused();
  const reset = page.getByRole('button', { name: /Reset specimen$/ }); await containsVisibleName(reset);
  await activate(page, reset); await expect(page.locator('#diss-reset-confirm')).toBeFocused();
  await page.locator('#diss-reset-cancel').press('Enter'); await expect(reset).toBeFocused();
  expect(await work(page)).toEqual(before);
});

test('full notebook capture action keeps the visible manage-notebook caption in its name', async ({ page }) => {
  await mount(page, { visualEvidence: Array.from({ length: 6 }, (_, index) => ({ id: 100 + index, image, layer: 'skin' })) }); const before = await work(page);
  await activate(page, page.getByRole('button', { name: 'Lab tool options', exact: true }));
  const capture = page.getByRole('button', { name: /^Evidence full · manage notebook/ }); await containsVisibleName(capture);
  await activate(page, capture); await expect(page.locator('#diss-evidence-notebook')).toHaveAttribute('open', '');
  expect(await work(page)).toEqual(before);
});

test('technique demonstration and attempt controls expose their full visible captions', async ({ page }) => {
  await mount(page); const before = await work(page);
  await activate(page, page.locator('#diss-procedure-summary'));
  for (const label of ['Show technique', 'Save attempt', 'Start new attempt']) {
    const control = page.getByRole('button', { name: new RegExp(label + '$') }); await containsVisibleName(control); await control.focus(); await expect(control).toBeFocused();
  }
  expect(await work(page)).toEqual(before);
});

test.afterAll(async () => {
  const sourceSha256 = createHash('sha256').update(await readFile(servedFile)).digest('hex');
  await writeFile(out + '/source.json', JSON.stringify({ servedFile, sourceStartSha256, sourceSha256, unchanged: sourceSha256 === sourceStartSha256 }, null, 2));
  await writeFile(out + '/accessible-names.json', JSON.stringify(nameProof, null, 2));
  expect(sourceSha256).toBe(sourceStartSha256);
});
