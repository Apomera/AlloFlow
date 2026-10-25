import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, data, writes, frames, settled } from './helpers/migration_round31';

test.describe.configure({ timeout: 150_000, retries: 0 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round43-2026-10-24');
const sourcePath = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirrorPath = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(sourcePath), hash = createHash('sha256').update(source).digest('hex');
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const guide = (page: Page) => page.locator('[data-scene-guide]');
const summary = (page: Page) => page.locator('[data-scene-summary]');
const feedback = (page: Page) => page.locator('[data-scene-feedback]');
const stage = (page: Page) => page.locator('#migration-flight-stage');
const errors = new WeakMap<Page, string[]>();

function unchangedSource() {
  expect(readFileSync(sourcePath).equals(source), 'source changed during verification').toBe(true);
  expect(readFileSync(mirrorPath).equals(source), 'desktop mirror differs from tested source').toBe(true);
}
test.beforeAll(async () => { unchangedSource(); mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => { expect(errors.get(page) || []).toEqual([]); unchangedSource(); await harness.destroy(page); });

async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); }
async function paint(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function openScene(page: Page, dark = false, reduced = true, extra = {}, species = 'canada_goose') {
  const failures: string[] = []; errors.set(page, failures); page.on('pageerror', error => failures.push(error.stack || error.message));
  await mount(harness, page, species, { dark, reduced, extra: {
    flightStudyBird: 2, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1.1, flightWind: 0,
    inquiry: { hypothesis: 'Retain the learner prediction.' },
    flightStudyObservations: { drafts: { 'canada_goose:tail': 'Retain the learner evidence.' } }, ...extra
  } });
  await expect(guide(page)).toBeVisible(); await expect(stage(page)).toHaveAttribute('data-flight-ready', 'true');
  await frames(page);
}
function savedWork(state: any) {
  return Object.fromEntries(['inquiry', 'flightStudyObservations', 'flightInvestigation', 'flightChallenges'].map(key => [key, state[key]]));
}
async function scan(page: Page, scope = '.migration-tool-shell') {
  await page.addScriptTag({ path: join(process.cwd(), 'axe-core/4.12.1/axe.min.js') });
  const result = await page.evaluate(async scope => {
    const root = document.querySelector(scope); if (!root) throw new Error('Missing accessibility scan root: ' + scope);
    const audit = await (window as any).axe.run(root, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
    });
    return { scope, violations: audit.violations, incomplete: audit.incomplete.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) };
  }, scope);
  expect(result.violations).toEqual([]); return result;
}
async function sceneSemantics(page: Page) {
  await expect(guide(page).getByRole('heading', { name: '3D scene guide', exact: true })).toBeVisible();
  await expect(feedback(page)).toHaveRole('status'); await expect(feedback(page)).toHaveAttribute('aria-live', 'polite');
  await expect(feedback(page)).toHaveAttribute('aria-atomic', 'true');
  const summaryId = await summary(page).getAttribute('id'), helpId = await page.locator('[data-scene-help]').getAttribute('id');
  const references = await stage(page).evaluate(node => (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => {
    const element = document.getElementById(id); return { id, exists: !!element, text: element?.textContent?.trim() };
  }));
  expect(references.every(item => item.exists && item.text)).toBe(true);
  expect(references.map(item => item.id)).toEqual(expect.arrayContaining([summaryId, helpId]));
  await expect(stage(page)).toHaveAccessibleDescription(/Study/i);
  await expect(stage(page)).toHaveAccessibleDescription(/arrow/i);
  await expect(page.locator('[data-scene-announce]')).toHaveAttribute('type', 'button');
  await expect(page.locator('[data-scene-announce]')).toHaveAccessibleName('Announce view settings');
  return references;
}
async function layoutProof(scope: Locator) {
  const result = await scope.evaluate(node => {
    const boundary = node.getBoundingClientRect(), failures: string[] = [], controls: any[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      if (!text.textContent?.trim() || text.parentElement?.closest('[aria-hidden="true"],.sr-only')) continue;
      const range = document.createRange(); range.selectNodeContents(text);
      for (const line of Array.from(range.getClientRects())) {
        if (!line.width || !line.height) continue;
        if (line.left < boundary.left - 1 || line.right > boundary.right + 1) failures.push('Text leaves its section: ' + text.textContent);
      }
    }
    for (const control of Array.from(node.querySelectorAll('button'))) {
      const rect = control.getBoundingClientRect();
      controls.push({ label: control.textContent?.trim(), width: rect.width, height: rect.height });
      if (rect.width < 24 || rect.height < 24) failures.push('Small target: ' + control.textContent);
      if (control.scrollWidth > control.clientWidth + 1) failures.push('Content overflows: ' + control.textContent);
    }
    return { failures, controls, width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(result.failures).toEqual([]); expect(result.scrollWidth).toBeLessThanOrEqual(result.width + 1); return result;
}
async function enlarge(page: Page, scope: Locator) {
  const sizes = await scope.evaluate(node => {
    const elements = [node, ...Array.from(node.querySelectorAll('*'))], before = elements.map(element => parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => (element as HTMLElement).style.setProperty('font-size', before[index] * 2 + 'px', 'important'));
    return elements.map((element, index) => ({ before: before[index], after: parseFloat(getComputedStyle(element).fontSize) }));
  });
  expect(sizes.every(item => Math.abs(item.after - item.before * 2) < .1)).toBe(true);
  await page.addStyleTag({ content: '.migration-tool-shell *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.migration-tool-shell p{margin-bottom:2em!important}' });
  await paint(page);
}
async function repeatedKey(page: Page, key: string) {
  return stage(page).evaluate((node, key) => {
    const event = new KeyboardEvent('keydown', { key, repeat: true, bubbles: true, cancelable: true });
    node.dispatchEvent(event); return event.defaultPrevented;
  }, key);
}

for (const theme of ['light', 'dark']) test('selected 3D view has readable keyboard context in ' + theme, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); await openScene(page, theme === 'dark'); await settled(page);
  const initial = await data(page), references = await sceneSemantics(page);
  await expect(summary(page)).toContainText(/Study/i); await expect(summary(page)).toContainText(/Individual 3/i);
  await expect(summary(page)).toContainText(/Angle 35/i); await expect(summary(page)).toContainText(/Elevation 15/i);
  await expect(summary(page)).toContainText(/Zoom 110/i); await expect(summary(page)).toContainText(/Primary feathers/i);
  await expect(summary(page)).toContainText(/reduc/i);
  const rendered = await page.evaluate(() => {
    const flock = (window as any).__glCanvas().rec.scene.getObjectByName('migration-flock');
    return { total: flock.children.length, visible: flock.children.flatMap((bird: any, index: number) => bird.visible ? [index] : []) };
  });
  expect(rendered.visible).toEqual([2]); await expect(summary(page)).toContainText(new RegExp('3 of ' + rendered.total));
  const beforeAnnouncement = await writes(page);
  await page.evaluate(() => (window as any).__sceneStatusNode = document.querySelector('[data-scene-feedback]'));
  const announce = page.locator('[data-scene-announce]');
  await activate(page, announce); await expect(announce).toBeFocused(); await expect(feedback(page)).toContainText(/Study/i);
  await expect(feedback(page)).toContainText(/110/); expect(await writes(page)).toEqual(beforeAnnouncement);
  await activate(page, announce); await expect(announce).toBeFocused(); expect(await writes(page)).toEqual(beforeAnnouncement);
  await stage(page).focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await data(page)).flightStudyYaw).toBe(45); await expect(feedback(page)).toContainText(/45/);
  expect(await repeatedKey(page, 'ArrowRight')).toBe(true);
  await expect.poll(async () => (await data(page)).flightStudyYaw).toBe(55); await expect(feedback(page)).toContainText(/55/);
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('+'); await settled(page);
  await expect(summary(page)).toContainText(/Angle 55/i); await expect(summary(page)).toContainText(/Elevation 20/i);
  await expect(summary(page)).toContainText(/Zoom 120/i); await expect(feedback(page)).toContainText(/120/);
  await expect(stage(page)).toBeFocused();
  const beforeModifiers = await data(page); await page.keyboard.press('Control+ArrowRight');
  expect(await data(page)).toEqual(beforeModifiers);
  expect(await page.evaluate(() => (window as any).__sceneStatusNode === document.querySelector('[data-scene-feedback]'))).toBe(true);
  expect(savedWork(await data(page))).toEqual(savedWork(initial));
  const desktop = await layoutProof(guide(page)), normalAudit = await scan(page);
  await guide(page).screenshot({ path: join(report, theme + '-scene-guide.png') });
  await page.setViewportSize({ width: 320, height: 1000 }); await enlarge(page, guide(page));
  const narrow = await layoutProof(guide(page)), enlargedAudit = await scan(page);
  await activate(page, announce); await expect(announce).toBeFocused();
  const focus = await announce.evaluate(node => ({ outline: getComputedStyle(node).outlineStyle, width: getComputedStyle(node).outlineWidth }));
  expect(focus.outline).toBe('solid'); expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2);
  await guide(page).screenshot({ path: join(report, theme + '-scene-guide-spacing.png') });
  let forcedAudit, forcedPalette;
  const forcedScanLimitation = 'Forced-color automation covers the new scene guide. The full page is captured for visual review; computed author colors elsewhere do not reliably represent forced used colors. Full-page normal and enlarged-text contrast scans remain enabled.';
  if (theme === 'dark') {
    await page.emulateMedia({ forcedColors: 'active' }); await paint(page);
    // Forced used colors need not be reflected by computed author colors:
    // https://www.w3.org/TR/css-color-adjust-1/#forced-colors-mode
    // The new guide explicitly uses system colors, which can be measured.
    forcedAudit = await scan(page, '[data-scene-guide]'); await layoutProof(guide(page));
    forcedPalette = await guide(page).evaluate(node => {
      const probe = document.createElement('span'); probe.style.display = 'none'; document.body.append(probe);
      const system = (foreground: string, background: string) => {
        probe.style.color = foreground; probe.style.backgroundColor = background;
        const computed = getComputedStyle(probe); return { color: computed.color, background: computed.backgroundColor };
      };
      const canvas = system('CanvasText', 'Canvas'), button = system('ButtonText', 'ButtonFace'); probe.remove();
      const luminance = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(c => {
        c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
      }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
      const contrast = (foreground: string, background: string) => {
        const a = luminance(foreground), b = luminance(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      };
      const background = getComputedStyle(node).backgroundColor;
      const labels = Array.from(node.querySelectorAll('h3,p,summary')).map(element => {
        const computed = getComputedStyle(element);
        return { text: element.textContent?.trim(), color: computed.color, contrast: contrast(computed.color, background) };
      });
      const action = node.querySelector('[data-scene-announce]')!, computed = getComputedStyle(action);
      return { active: matchMedia('(forced-colors: active)').matches, scope: '[data-scene-guide]', canvas, button, background, labels,
        action: { color: computed.color, background: computed.backgroundColor, border: computed.borderTopColor, contrast: contrast(computed.color, computed.backgroundColor) } };
    });
    expect(forcedPalette.active).toBe(true); expect(forcedPalette.background).toBe(forcedPalette.canvas.background);
    expect(forcedPalette.labels.length).toBeGreaterThanOrEqual(4);
    for (const label of forcedPalette.labels) {
      expect(label.color, label.text).toBe(forcedPalette.canvas.color);
      expect(label.contrast, label.text).toBeGreaterThanOrEqual(4.5);
    }
    expect(forcedPalette.action.color).toBe(forcedPalette.button.color);
    expect(forcedPalette.action.background).toBe(forcedPalette.button.background);
    expect(forcedPalette.action.border).toBe(forcedPalette.button.color);
    expect(forcedPalette.action.contrast).toBeGreaterThanOrEqual(4.5);
    await guide(page).screenshot({ path: join(report, 'forced-colors-scene-guide.png') });
    await page.screenshot({ path: join(report, 'forced-colors-full-page.png'), fullPage: true });
  }
  writeFileSync(join(report, theme + '-scene-guide-proof.json'), JSON.stringify({ hash, references, rendered, desktop, normalAudit, narrow, enlargedAudit, forcedAudit, forcedPalette,
    forcedScanLimitation: theme === 'dark' ? forcedScanLimitation : undefined, focus, final: await data(page) }, null, 2));
});

test('scene playback and camera shortcuts explain effective motion without repeating toggles', async ({ page }) => {
  await openScene(page, false, false, { flightPaused: true });
  await expect(summary(page)).toContainText(/paused/i);
  await stage(page).focus(); await page.keyboard.press('Space');
  await expect.poll(async () => (await data(page)).flightPaused).toBe(false); await expect(summary(page)).toContainText(/running|playing/i);
  const afterResume = await writes(page); expect(await repeatedKey(page, ' ')).toBe(true);
  expect((await data(page)).flightPaused).toBe(false); expect(await writes(page)).toEqual(afterResume);
  await page.keyboard.press('1'); await expect.poll(async () => (await data(page)).flightCamera).toBe('chase');
  const afterCamera = await writes(page); expect(await repeatedKey(page, '1')).toBe(true);
  expect(await writes(page)).toEqual(afterCamera); await expect(summary(page)).toContainText(/Chase/i); await expect(stage(page)).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' }); await frames(page);
  await expect(summary(page)).toContainText(/reduc/i);
  const species = page.getByRole('combobox', { name: '3D migration focus species', exact: true });
  await species.selectOption('monarch');
  const season = page.getByRole('combobox', { name: 'Migration season and direction', exact: true });
  await season.selectOption('spring');
  await expect(page.locator('[data-scene-route]')).toContainText(/Mexico/i);
  await expect(stage(page)).toHaveAttribute('aria-label', /Monarch/); await expect(summary(page)).not.toContainText(/feathers/i);
  const route = await page.locator('[data-scene-route]').textContent();
  await season.selectOption('fall'); await expect(page.locator('[data-scene-route]')).not.toHaveText(route!);
  await stage(page).focus(); await page.keyboard.press('4'); await expect(summary(page)).toContainText(/Study/i);
  await expect(summary(page)).toContainText(/whole|insect/i);
  const final = await data(page), audit = await scan(page);
  writeFileSync(join(report, 'scene-motion-proof.json'), JSON.stringify({ hash, final, route, audit }, null, 2));
});

test('learning fields expose their visible prompts and investigation progress is readable', async ({ page }) => {
  await openScene(page);
  const challenges = page.locator('[data-migration-flight-challenges]');
  await activate(page, challenges.locator(':scope > summary'));
  const labels = [
    ['migration-study-observation-note', 'My observation'],
    ['migration-mission-prediction', 'My prediction: which control will I change, and why?'],
    ['migration-mission-notes', 'My explanation: what numbers or route changes support my claim?'],
    ['migration-experiment-prediction', 'What do you predict, and why?'],
    ['migration-experiment-evidence', 'Evidence I noticed'],
    ['migration-experiment-explanation', 'How does the evidence support or challenge my prediction?']
  ];
  for (const [id, name] of labels) {
    const field = page.getByRole('textbox', { name, exact: true });
    await expect(field).toHaveAttribute('id', id); await expect(field).toHaveAccessibleName(name);
    const visible = await field.evaluate(node => Array.from((node as HTMLTextAreaElement).labels || []).map(label => label.textContent?.trim()).join(' '));
    expect(visible).toContain(name);
  }
  const progress = page.locator('[data-experiment-progress]');
  await expect(progress).toHaveCount(3);
  await expect(progress.locator('[data-experiment-progress-status]')).toHaveText(['Not yet complete', 'Not yet complete', 'Not yet complete']);
  await page.getByRole('textbox', { name: 'My observation', exact: true }).fill('The primary feathers spread at the wingtip.');
  await page.getByRole('textbox', { name: labels[1][1], exact: true }).fill('I will change only the wind.');
  await page.getByRole('textbox', { name: labels[2][1], exact: true }).fill('I will compare ground speeds.');
  await page.getByRole('textbox', { name: labels[3][1], exact: true }).fill('A tailwind will increase ground speed.');
  await expect(progress.locator('[data-experiment-progress-status]')).toHaveText(['Prediction saved', 'Not yet complete', 'Not yet complete']);
  await activate(page, page.locator('[data-experiment-action="baseline"]'));
  await expect(progress.locator('[data-experiment-progress-status]')).toHaveText(['Prediction saved', 'Baseline captured', 'Not yet complete']);
  await page.getByRole('slider', { name: /Along-route wind in meters per second/ }).fill('10');
  await activate(page, page.locator('[data-experiment-action="record"]'));
  await page.getByRole('textbox', { name: labels[4][1], exact: true }).fill('Only wind changed, and ground speed increased.');
  await expect(progress.locator('[data-experiment-progress-status]')).toHaveText(['Prediction saved', 'Baseline captured', 'Not yet complete']);
  await page.getByRole('textbox', { name: labels[5][1], exact: true }).fill('The comparison supports my prediction within this model.');
  await expect(progress.locator('[data-experiment-progress-status]')).toHaveText(['Prediction saved', 'Baseline captured', 'Evidence saved']);
  const final = await data(page);
  expect(final.inquiry).toEqual({ hypothesis: 'Retain the learner prediction.' });
  expect(final.flightStudyObservations.drafts['canada_goose:tail']).toBe('Retain the learner evidence.');
  expect(final.flightStudyObservations.drafts['canada_goose:primaries']).toBe('The primary feathers spread at the wingtip.');
  expect(final.flightInvestigation.trials).toHaveLength(1);
  const normalAudit = await scan(page);
  await page.setViewportSize({ width: 320, height: 1000 });
  await enlarge(page, page.locator('.migration-experiment-steps'));
  const narrow = await layoutProof(page.locator('.migration-experiment-steps')), enlargedAudit = await scan(page);
  await page.locator('.migration-experiment-steps').screenshot({ path: join(report, 'investigation-progress-spacing.png') });
  writeFileSync(join(report, 'learning-labels-proof.json'), JSON.stringify({ hash, labels, final, normalAudit, narrow, enlargedAudit }, null, 2));
});
