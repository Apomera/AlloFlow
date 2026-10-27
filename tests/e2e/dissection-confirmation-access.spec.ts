import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_CONFIRMATION_OUTPUT || 'test-results/dissection-confirmation-access';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const errors = new WeakMap<Page, string[]>();
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=';
const substitutedSource = process.env.STEM_GL_SUBSTITUTE?.split(';').find(entry => entry.startsWith('stem_lab/stem_tool_dissection.js='))?.slice('stem_lab/stem_tool_dissection.js='.length);
const servedFile = substitutedSource || 'stem_lab/stem_tool_dissection.js';
let sourceStartSha256: string;

test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await mkdir(out, { recursive: true }); sourceStartSha256 = createHash('sha256').update(await readFile(servedFile)).digest('hex'); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page)!.push(error.message)); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

async function mount(page: Page, state: Record<string, unknown> = {}, width = 1280, dark = false) {
  await page.setViewportSize({ width, height: 900 });
  await harness.mount(page, { dissection: {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', selectedOrgan: 'nictitating',
    workspaceMode: 'advanced', techniquePanelOpen: true, toolbarToolsOpen: true,
    quizMode: false, practicalMode: false, revealedLayers: { skin: true },
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: {},
    organNotes: { 'frog|nictitating': 'The transparent membrane covers the eye.' }, organConfidence: { 'frog|nictitating': 2 },
    annotations: [{ type: 'dot', x: .4, y: .4 }],
    assessmentRecordedScore: 2, assessmentRecordedTotal: 4, assessmentCompletedAt: 100,
    evidenceNotebookOpen: true, visualEvidence: [{ id: 101, image, layer: 'skin' }, { id: 102, image, layer: 'skin' }],
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

async function activate(page: Page, control: Locator, key = 'Enter') { await control.focus(); await page.keyboard.press(key); }
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
async function relationship(control: Locator, target: Locator, expanded: boolean, expandedAttribute = true) {
  if (expandedAttribute) await expect(control).toHaveAttribute('aria-expanded', String(expanded));
  if (expanded) {
    await expect(target).toHaveCount(1); await expect(control).toHaveAttribute('aria-controls', await target.getAttribute('id') || 'missing-id');
  } else {
    await expect(target).toHaveCount(0); expect(await control.getAttribute('aria-controls')).toBeNull();
  }
}
async function idrefAudit(page: Page, name: string) {
  const unresolved = await page.locator('[data-dissection-root]').evaluate(root => {
    const issues: { element: string; attribute: string; missing: string[] }[] = [];
    for (const node of root.querySelectorAll('[aria-controls],[aria-labelledby],[aria-describedby]')) {
      for (const attribute of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
        const missing = (node.getAttribute(attribute) || '').split(/\s+/).filter(id => id && !root.querySelector('#' + CSS.escape(id)));
        if (missing.length) issues.push({ element: node.id || node.outerHTML.slice(0, 240), attribute, missing });
      }
    }
    return issues;
  });
  await writeFile(out + '/idrefs-' + name + '.json', JSON.stringify({ unresolved }, null, 2));
}

test('Escape cancels a frame removal from either confirmation action and keeps the selected anatomy', async ({ page }) => {
  await mount(page); const before = await work(page);
  const remove = page.locator('#diss-evidence-remove-101'), confirm = page.locator('#diss-evidence-confirm-remove-101');
  for (const fromCancel of [false, true]) {
    await activate(page, remove); await expect(confirm).toBeFocused();
    if (fromCancel) { await page.keyboard.press('Tab'); await expect(page.locator('[data-evidence-id="101"]').getByRole('button', { name: 'Cancel', exact: true })).toBeFocused(); }
    await page.keyboard.press('Escape'); await expect(confirm).toHaveCount(0); await expect(remove).toBeFocused();
    expect(await work(page)).toEqual(before); await expect(page.locator('[data-dissection-selection]')).toBeVisible();
  }
});

test('Escape cancels clear-all from either action and keeps every evidence frame', async ({ page }) => {
  await mount(page); const before = await work(page);
  const clear = page.locator('#diss-evidence-clear-all'), panel = page.locator('#diss-evidence-clear-confirmation');
  for (const fromCancel of [false, true]) {
    await relationship(clear, panel, false); await activate(page, clear); await relationship(clear, panel, true);
    await expect(page.locator('#diss-evidence-confirm-clear')).toBeFocused();
    if (fromCancel) { await page.keyboard.press('Tab'); await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused(); }
    await page.keyboard.press('Escape'); await relationship(clear, panel, false); await expect(clear).toBeFocused(); expect(await work(page)).toEqual(before);
  }
});

test('conditional controls reference rendered panels through open, cancel, and reopen transitions', async ({ page }) => {
  await mount(page); const before = await work(page);
  await idrefAudit(page, 'initial');
  const reset = page.locator('#diss-reset-specimen'), resetPanel = page.locator('#diss-reset-confirmation');
  const restart = page.locator('#diss-scenario-restart'), restartPanel = page.locator('#diss-scenario-restart-review');
  const questions = page.getByRole('button', { name: /show open questions|Hide open questions/, includeHidden: true }), questionsPanel = page.locator('#diss-inquiry-open-questions');
  const understood = page.locator('#diss-inquiry-understood'), explanation = page.locator('#diss-inquiry-explanation');
  for (const [control, panel, cancel] of [[reset, resetPanel, '#diss-reset-cancel'], [restart, restartPanel, '#diss-scenario-restart-cancel']] as const) {
    await openAncestors(page, control); await relationship(control, panel, false);
    for (let attempt = 0; attempt < 2; attempt++) { await activate(page, control); await relationship(control, panel, true); await activate(page, page.locator(cancel)); await relationship(control, panel, false); await expect(control).toBeFocused(); }
  }
  await openAncestors(page, questions); await relationship(questions, questionsPanel, false);
  for (let attempt = 0; attempt < 2; attempt++) { await activate(page, questions); await relationship(questions, questionsPanel, true); await expect(questions).toBeFocused(); await activate(page, questions); await relationship(questions, questionsPanel, false); }
  await relationship(understood, explanation, false, false);
  await activate(page, understood, 'Space'); await relationship(understood, explanation, true, false); await expect(understood).toBeFocused();
  const answer = page.locator('#diss-inquiry-explanation-text'); await answer.fill('Greater depth can expose structures while increasing tissue damage; the model cannot reproduce touch.');
  await activate(page, understood, 'Space'); await relationship(understood, explanation, false, false);
  await activate(page, understood, 'Space'); await relationship(understood, explanation, true, false); await expect(answer).toHaveValue('Greater depth can expose structures while increasing tissue damage; the model cannot reproduce touch.');
  await idrefAudit(page, 'inquiry-open');
  expect(await work(page)).toEqual(before);
});

test('modified, composing, and already handled Escape leave a pending evidence action and learner work intact', async ({ page }) => {
  await mount(page); const before = await work(page);
  await activate(page, page.locator('#diss-evidence-clear-all'));
  const confirm = page.locator('#diss-evidence-confirm-clear'); await expect(confirm).toBeFocused();
  const prevented = await confirm.evaluate(node => [
    { altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { isComposing: true }, { keyCode: 229 },
  ].map(options => { const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...options }); node.dispatchEvent(event); return event.defaultPrevented; }));
  expect(prevented).toEqual(Array(6).fill(false));
  await confirm.evaluate(node => { const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); event.preventDefault(); node.dispatchEvent(event); });
  await expect(confirm).toBeFocused(); await expect(page.locator('#diss-evidence-clear-confirmation')).toBeVisible(); expect(await work(page)).toEqual(before);
  await page.keyboard.press('Escape'); await expect(page.locator('#diss-evidence-clear-all')).toBeFocused(); expect(await work(page)).toEqual(before);
});

test('toolbar disclosures keep valid relationships when opened, closed, or replaced by the other panel', async ({ page }) => {
  await mount(page, { toolbarToolsOpen: false, toolbarViewOpen: false }); const before = await work(page);
  const view = page.getByRole('button', { name: 'View and accessibility options', exact: true });
  const tools = page.getByRole('button', { name: 'Lab tool options', exact: true });
  const viewPanel = page.locator('#diss-view-tools'), toolPanel = page.locator('#diss-lab-tools');
  await relationship(view, viewPanel, false); await relationship(tools, toolPanel, false);
  await activate(page, view); await relationship(view, viewPanel, true); await relationship(tools, toolPanel, false);
  await activate(page, tools); await relationship(view, viewPanel, false); await relationship(tools, toolPanel, true);
  await activate(page, view); await relationship(view, viewPanel, true); await relationship(tools, toolPanel, false);
  await activate(page, view); await relationship(view, viewPanel, false); await relationship(tools, toolPanel, false);
  await idrefAudit(page, 'toolbar-collapsed'); expect(await work(page)).toEqual(before);
});

for (const dark of [false, true]) test(`320px ${dark ? 'dark' : 'light'} confirmation actions retain visible keyboard focus and a safe return`, async ({ page }) => {
  await mount(page, {}, 320, dark); const before = await work(page);
  await activate(page, page.locator('#diss-evidence-clear-all')); await expect(page.locator('#diss-evidence-confirm-clear')).toBeFocused();
  await page.keyboard.press('Tab'); const cancel = page.locator('#diss-evidence-clear-confirmation').getByRole('button', { name: 'Cancel', exact: true });
  await expect(cancel).toBeFocused(); await expect(cancel).toBeInViewport(); expect(await cancel.evaluate(node => node.matches(':focus-visible'))).toBe(true);
  await page.locator('#diss-evidence-clear-confirmation').screenshot({ path: out + '/320-' + (dark ? 'dark' : 'light') + '-cancel-focus.png' });
  await page.keyboard.press('Escape'); await expect(page.locator('#diss-evidence-clear-all')).toBeFocused(); await expect(page.locator('#diss-evidence-clear-all')).toBeInViewport(); expect(await work(page)).toEqual(before);
});

test.afterAll(async () => {
  const sourceSha256 = createHash('sha256').update(await readFile(servedFile)).digest('hex');
  await writeFile(out + '/source.json', JSON.stringify({ servedFile, sourceStartSha256, sourceSha256, unchanged: sourceSha256 === sourceStartSha256 }, null, 2));
  expect(sourceSha256).toBe(sourceStartSha256);
});
