import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, data, frames, settled, writes } from './helpers/migration_round31';

test.describe.configure({ timeout: 180_000, retries: 0 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round49-2026-10-26');
const sourcePath = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirrorPath = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(sourcePath), hash = createHash('sha256').update(source).digest('hex');
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const errors = new WeakMap<Page, string[]>();
const shell = (page: Page) => page.locator('#wrap > .migration-tool-shell');
const otherShell = (page: Page) => page.locator('#round49-other > .migration-tool-shell');
const guide = (own: Locator) => own.locator('[data-migration-camera-guide]');
const summary = (own: Locator) => own.locator('[data-trial-evidence-summary]');
const camera = (own: Locator, id: string) => own.locator('[data-flight-camera="' + id + '"]');
const evidence = (own: Locator) => own.locator('[data-migration-id="migration-experiment-evidence"]');
const cameraIds = ['chase', 'aerial', 'side', 'study'];
const cameraLabels = ['Chase', 'Aerial', 'Side', 'Study'];
const snapshot = (wind: number, groundSpeed: number) => ({ speciesId: 'canada_goose', season: 'fall', wind, formationMode: 'natural', formation: 'v', groundSpeed, benefit: 22 });
function authored(label = 'First tool') {
  return {
    inquiry: { hypothesis: label + ' independent hypothesis.' },
    flightStudyObservations: { drafts: { 'canada_goose:primaries': label + ' unfinished Study note.' }, records: {} },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: label + ' challenge prediction.', notes: label + ' challenge reasoning.', setup: null, attempts: [] } } },
    flightInvestigation: { variable: 'formation', prediction: label + ' current prediction.', baseline: snapshot(20, 85),
      trials: [{ id: 1, variable: 'wind', prediction: label + ' historical wind prediction.', baseline: snapshot(-4, 31), snapshot: snapshot(8, 58) },
        { id: 2, variable: 'wind', prediction: label + ' second historical prediction.', baseline: snapshot(0, 40), snapshot: snapshot(4, 49) }],
      evidence: label + ' existing evidence.', explanation: label + ' own explanation.' }
  };
}
const work = (state: any) => Object.fromEntries(['inquiry', 'flightStudyObservations', 'flightInvestigation', 'flightChallenges'].map(key => [key, state[key]]));
function unchangedSource() {
  expect(readFileSync(sourcePath).equals(source), 'source drift during browser verification').toBe(true);
  expect(readFileSync(mirrorPath).equals(source), 'desktop mirror differs from verified source').toBe(true);
}
function proof(name: string, value: any) { writeFileSync(join(report, name + '-proof.json'), JSON.stringify({ hash, ...value }, null, 2)); }
test.beforeAll(async () => { unchangedSource(); mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  expect(errors.get(page) || []).toEqual([]); unchangedSource();
  await page.evaluate(() => { const w = window as any; if (w.__round49OtherRoot) w.__round49OtherRoot.unmount(); document.querySelector('#round49-other')?.remove(); }).catch(() => {});
  await harness.destroy(page);
});
async function paint(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); await paint(page); }
async function patch(page: Page, values: any) { await page.evaluate(values => { const w = window as any; w.__toolData.migration = { ...w.__toolData.migration, ...values }; w.__rerender(); }, values); await paint(page); }
async function openScene(page: Page, theme = 'light') {
  const failures: string[] = []; errors.set(page, failures); page.on('pageerror', error => failures.push(error.stack || error.message));
  await mount(harness, page, 'canada_goose', { dark: theme === 'dark', reduced: true, extra: {
    flightStudyBird: 0, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1.2, flightWind: 25, ...authored()
  } }); await settled(page);
  if (theme === 'contrast') await page.evaluate(() => { const w = window as any; w.__ctx.isContrast = true; w.__ctx.isDark = false; w.__ctx.theme = 'contrast'; document.documentElement.classList.add('theme-contrast'); w.__rerender(); });
  await expect(shell(page)).toHaveAttribute('data-migration-theme', theme); await paint(page);
}
async function selectTrial(page: Page, own: Locator, index = 1) {
  await activate(page, own.locator('[data-experiment-revisit="' + index + '"]'));
  await expect(own.locator('.migration-flight-stage')).toBeFocused();
  await expect(summary(own)).toHaveAttribute('data-trial-evidence-summary', String(index));
}
async function cameraSemantics(own: Locator) {
  await expect(guide(own)).toHaveRole('group'); await expect(guide(own)).toHaveAccessibleName('Camera');
  const result = await guide(own).evaluate(root => {
    const label = document.getElementById(root.getAttribute('aria-labelledby') || '');
    return { groupLabel: { id: label?.id, own: !!label && root.contains(label), text: label?.textContent },
      buttons: [...root.querySelectorAll('[data-flight-camera]')].map(button => {
        const id = button.getAttribute('aria-describedby') || '', description = document.getElementById(id);
        return { view: button.getAttribute('data-flight-camera'), id, name: button.textContent, own: !!description && root.contains(description), text: description?.textContent,
          matches: [...document.querySelectorAll('[id]')].filter(node => node.id === id).length };
      }) };
  });
  expect(result.groupLabel.own).toBe(true); expect(result.buttons).toHaveLength(4);
  expect(result.buttons.map(row => row.view)).toEqual(cameraIds); expect(result.buttons.map(row => row.name)).toEqual(cameraLabels);
  expect(result.buttons.map(row => row.text)).toEqual(['Follow the whole flock.', 'See the formation from above.', 'See flight from the side.', 'Orbit and inspect one individual.']);
  expect(result.buttons.every(row => row.own && row.matches === 1 && !!row.text?.trim())).toBe(true);
  for (const id of cameraIds) {
    await expect(camera(own, id)).toHaveAttribute('type', 'button');
    await expect(camera(own, id)).toHaveAccessibleDescription(/\S/);
  }
  return result;
}
async function selectedCamera(own: Locator, id: string) {
  await expect(guide(own).locator('button[aria-pressed="true"]')).toHaveCount(1);
  await expect(camera(own, id)).toHaveAttribute('aria-pressed', 'true');
  const card = own.locator('[data-camera-choice="' + id + '"]'); await expect(card).toHaveAttribute('data-camera-selected', 'true');
  const badge = card.locator('[data-camera-selection]'); await expect(badge).toBeVisible(); await expect(badge).toHaveAttribute('aria-hidden', 'true');
  await expect(badge).toContainText('Selected');
  for (const other of cameraIds.filter(value => value !== id)) await expect(own.locator('[data-camera-choice="' + other + '"] [data-camera-selection]')).toBeHidden();
}
async function summaryValues(own: Locator, first = true) {
  const selected = summary(own); await expect(selected).toHaveAccessibleName('Saved measurements for this trial');
  await expect(selected.locator('[data-evidence-summary-scope]')).toHaveText('Change is saved trial minus saved baseline. Model values come from this recorded pair. The current scene may differ.');
  await expect(selected.locator('input,textarea,select,button,[aria-live],[role="status"]')).toHaveCount(0);
  const values = await selected.evaluate(node => [...node.querySelectorAll('[data-evidence-metric]')].map(row => ({ metric: row.getAttribute('data-evidence-metric'),
    values: [...row.querySelectorAll('[data-evidence-snapshot]')].map(value => ({ kind: value.getAttribute('data-evidence-snapshot'), label: value.querySelector('small')?.textContent, value: value.querySelector('strong')?.textContent })) })));
  expect(values.map(row => row.metric)).toEqual(['ground-speed', 'drafting-credit']);
  expect(values[0].values.map(item => item.value)).toEqual(first ? ['31 mph', '58 mph', '+27 mph'] : ['40 mph', '49 mph', '+9 mph']);
  expect(values[1].values.map(item => item.value)).toEqual(['22%', '22%', '0 percentage points']);
  expect(values.every(row => row.values.map(item => item.kind).join(',') === 'baseline,trial,change')).toBe(true);
  expect(values.every(row => row.values.map(item => item.label).join(',') === 'Saved baseline,Saved trial,Change')).toBe(true);
  return values;
}
async function audit(page: Page, scope = '#wrap > .migration-tool-shell', forced = false) {
  await page.addScriptTag({ path: join(process.cwd(), 'axe-core/4.12.1/axe.min.js') });
  const result = await page.evaluate(async ({ scope, forced }) => {
    const scan = await (window as any).axe.run(document.querySelector(scope), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, rules: forced ? { 'color-contrast': { enabled: false } } : {}
    });
    return { scope, excludedRules: forced ? [{ id: 'color-contrast', reason: 'Chromium forces colors during paint while axe may combine computed author foreground with forced background. This journey directly measures the new controls and reviews the painted screenshots. Normal themes retain color-contrast.' }] : [],
      violations: scan.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })), incomplete: scan.incomplete.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) };
  }, { scope, forced }); expect(result.violations).toEqual([]); return result;
}
async function contrast(own: Locator) {
  const result = await own.evaluate(root => {
    type C = [number, number, number, number];
    function color(value: string): C { const numbers = value.match(/[\d.]+/g)?.map(Number); if (!numbers || numbers.length < 3) throw new Error('Unsupported color ' + value); return [numbers[0], numbers[1], numbers[2], numbers[3] ?? 1]; }
    function over(a: C, b: C): C { const alpha = a[3] + b[3] * (1 - a[3]); return [0, 1, 2].map(i => alpha ? (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / alpha : 0).concat(alpha) as C; }
    function luminance(c: C) { return c.slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((s, n, i) => s + n * [.2126, .7152, .0722][i], 0); }
    function ratio(a: C, b: C) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
    function surface(element: Element | null) {
      let result: C = [0, 0, 0, 0]; const unresolved: string[] = [];
      for (let node = element; node && result[3] < .9999; node = node.parentElement) {
        const css = getComputedStyle(node);
        if (css.backgroundImage !== 'none') unresolved.push(node.className + ': ' + css.backgroundImage);
        result = over(result, color(css.backgroundColor));
      }
      return { color: over(result, [255, 255, 255, 1]), unresolved };
    }
    const text = [...root.querySelectorAll('[data-migration-camera-guide] button,[data-camera-purpose],[data-camera-selection],[data-trial-evidence-summary] h4,[data-trial-evidence-summary] h5,[data-trial-evidence-summary] dt,[data-trial-evidence-summary] small,[data-trial-evidence-summary] strong,[data-evidence-summary-status],[data-evidence-summary-scope]')].filter(node => {
      const rect = node.getBoundingClientRect(), css = getComputedStyle(node); return rect.width && rect.height && css.visibility !== 'hidden' && css.display !== 'none';
    }).map(node => { const css = getComputedStyle(node), background = surface(node); return { text: node.textContent?.trim(), color: css.color, background, ratio: ratio(over(color(css.color), background.color), background.color), fontSize: css.fontSize }; });
    const selected = root.querySelector('[data-camera-selected="true"]')!;
    const selectedStyle = getComputedStyle(selected), inside = surface(selected), outside = surface(selected.parentElement);
    const border = color(selectedStyle.borderTopColor);
    const selectedBadge = selected.querySelector('[data-camera-selection]')!, badgeStyle = getComputedStyle(selectedBadge);
    const purposeStyle = getComputedStyle(selected.querySelector('[data-camera-purpose]')!);
    const badge = { color: badgeStyle.color, background: badgeStyle.backgroundColor, borderColor: badgeStyle.borderTopColor,
      borderWidth: badgeStyle.borderTopWidth, borderStyle: badgeStyle.borderTopStyle,
      cardBackground: selectedStyle.backgroundColor, purposeColor: purposeStyle.color };
    const active = document.activeElement && root.contains(document.activeElement) ? document.activeElement : null;
    const focusStyle = active ? getComputedStyle(active) : null, focusOutside = active ? surface(active.parentElement) : null;
    return { text, badge, selection: { border: selectedStyle.borderTopColor, width: selectedStyle.borderTopWidth, style: selectedStyle.borderTopStyle,
      againstInside: ratio(over(border, inside.color), inside.color), againstOutside: ratio(over(border, outside.color), outside.color), unresolved: [...inside.unresolved, ...outside.unresolved] },
      focus: focusStyle && focusOutside ? { visible: active!.matches(':focus-visible'), width: focusStyle.outlineWidth, style: focusStyle.outlineStyle, ratio: ratio(over(color(focusStyle.outlineColor), focusOutside.color), focusOutside.color) } : null };
  });
  expect(result.text.length).toBeGreaterThanOrEqual(20);
  for (const item of result.text) { expect(item.background.unresolved, item.text + ' unresolved paint').toEqual([]); expect(item.ratio, item.text + ' text contrast').toBeGreaterThanOrEqual(4.5); }
  // The written Selected view cue remains explicit even where card borders are decorative.
  expect(result.selection.style).toBe('solid'); expect(parseFloat(result.selection.width)).toBeGreaterThanOrEqual(1);
  return result;
}
async function layout(own: Locator) {
  const result = await own.evaluate(root => {
    const failures: string[] = [], buttons: any[] = [];
    for (const scope of root.querySelectorAll('[data-migration-camera-guide],[data-trial-evidence-summary]')) {
      const box = scope.getBoundingClientRect(); if (box.left < -1 || box.right > innerWidth + 1 || scope.scrollWidth > scope.clientWidth + 2) failures.push('Scope overflows viewport: ' + scope.getAttribute('data-trial-evidence-summary'));
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim() || node.parentElement?.closest('.sr-only,[aria-hidden="true"]') || getComputedStyle(node.parentElement!).visibility === 'hidden') continue;
        const range = document.createRange(); range.selectNodeContents(node);
        for (const line of range.getClientRects()) if (line.width && line.height && (line.left < box.left - 1 || line.right > box.right + 1)) failures.push('Text clipped: ' + node.textContent);
      }
      for (const button of scope.querySelectorAll('button')) { const r = button.getBoundingClientRect(); buttons.push({ text: button.textContent, width: r.width, height: r.height }); if (r.height < 44 || r.width < 44 || button.scrollWidth > button.clientWidth + 1) failures.push('Control clipped/small: ' + button.textContent); }
    }
    const grid = root.querySelector('.migration-flight-camera')!.getBoundingClientRect();
    const cards = [...root.querySelectorAll('[data-camera-choice]')].map(card => {
      const box = card.getBoundingClientRect(), badge = card.querySelector('[data-camera-selection]')!.getBoundingClientRect();
      return { id: card.getAttribute('data-camera-choice'), selected: card.getAttribute('data-camera-selected') === 'true',
        width: box.width, left: box.left, right: box.right, gridWidth: grid.width, gridLeft: grid.left, gridRight: grid.right,
        badgeWidth: badge.width, badgeHeight: badge.height };
    });
    const metricValues = [...root.querySelectorAll('[data-evidence-metric] dd')].map(row => {
      const box = row.getBoundingClientRect(); return { width: box.width, left: box.left, right: box.right,
        values: [...row.querySelectorAll('[data-evidence-snapshot]')].map(value => { const r = value.getBoundingClientRect();
          return { kind: value.getAttribute('data-evidence-snapshot'), width: r.width, left: r.left, right: r.right }; }) };
    });
    return { failures, buttons, cards, metricValues, width: innerWidth, documentWidth: document.documentElement.scrollWidth };
  }); expect(result.failures).toEqual([]); expect(result.documentWidth).toBeLessThanOrEqual(result.width + 1);
  expect(result.cards).toHaveLength(4); expect(result.cards.filter(card => !card.selected)).toHaveLength(3);
  expect(result.cards.filter(card => !card.selected).every(card => card.badgeWidth === 0 && card.badgeHeight === 0)).toBe(true);
  return result;
}

for (const theme of ['light', 'dark', 'contrast']) test('camera guidance and historical evidence remain readable in ' + theme, async ({ page }) => {
  await openScene(page, theme); const own = shell(page), before = await data(page), semantics = await cameraSemantics(own);
  await selectedCamera(own, 'study'); const cameraProof: any[] = [];
  if (theme === 'light') {
    for (const id of cameraIds) {
      await activate(page, camera(own, id)); await expect(camera(own, id)).toBeFocused(); await selectedCamera(own, id); await frames(page);
      const rendered = await page.evaluate(() => { const w = window as any, rec = w.__glCanvas().rec, flock = rec.scene.getObjectByName('migration-flock'); return { camera: rec.camera.matrixWorld.toArray(), visible: flock.children.filter((bird: any) => bird.visible).length, total: flock.children.length, renders: rec.renders }; });
      if (id === 'study') expect(rendered.visible).toBe(1); else expect(rendered.visible).toBe(rendered.total);
      cameraProof.push({ id, rendered }); expect(work(await data(page))).toEqual(work(before));
    }
    expect(new Set(cameraProof.map(item => JSON.stringify(item.rendered.camera))).size).toBe(4);
    for (let index = 0; index < cameraIds.length; index++) { await own.locator('.migration-flight-stage').focus(); await page.keyboard.press(String(index + 1)); await selectedCamera(own, cameraIds[index]); await expect(own.locator('.migration-flight-stage')).toBeFocused(); }
    expect((await writes(page)).every((write: any) => Object.keys(write.patch).every(key => key === 'flightCamera'))).toBe(true);
  }
  await selectTrial(page, own); const values = await summaryValues(own); await activate(page, camera(own, 'study')); await selectedCamera(own, 'study');
  const colors = await contrast(own), sizes = await layout(own), accessibility = await audit(page);
  expect(work(await data(page))).toEqual(work(before));
  await guide(own).screenshot({ path: join(report, theme + '-camera-guide.png') });
  await summary(own).screenshot({ path: join(report, theme + '-saved-evidence.png') });
  proof(theme + '-camera-evidence', { theme, semantics, cameraProof, values, colors, layout: sizes, audit: accessibility, before, after: await data(page) });
});

test('saved measurements stay with the selected historical trial while the learner writes under newer conditions', async ({ page }) => {
  await openScene(page); const own = shell(page), before = await data(page), field = evidence(own);
  await field.evaluate(node => { (window as any).__round49EvidenceField = node; }); await selectTrial(page, own); const initial = await summaryValues(own);
  await activate(page, own.locator('[data-trial-evidence-return]')); await expect(field).toBeFocused();
  await field.fill('My evidence compares 31 mph with 58 mph, a 27 mph increase.');
  await field.evaluate(node => (node as HTMLTextAreaElement).setSelectionRange(3, 15, 'backward'));
  const changed = await data(page); await patch(page, { flightWind: 25, flightCamera: 'side', flightInvestigation: { ...changed.flightInvestigation, variable: 'formation', baseline: snapshot(0, 40), prediction: 'A newer question about formation.' } });
  await expect(field).toBeFocused(); expect(await field.evaluate(node => node === (window as any).__round49EvidenceField)).toBe(true);
  expect(await field.evaluate(node => [(node as HTMLTextAreaElement).selectionStart, (node as HTMLTextAreaElement).selectionEnd, (node as HTMLTextAreaElement).selectionDirection])).toEqual([3, 15, 'backward']);
  expect(await summaryValues(own)).toEqual(initial); await expect(own.locator('[data-pair-review-state]')).toContainText('Current conditions differ');
  expect((await data(page)).flightInvestigation.trials).toEqual(before.flightInvestigation.trials);
  const beforeNavigation = await data(page), writeCount = (await writes(page)).length;
  await activate(page, own.locator('[data-experiment-action="inspect-saved-comparison"]')); await expect(own.locator('[data-pair-review="baseline"]')).toBeFocused();
  await activate(page, own.locator('[data-trial-evidence-return]')); await expect(field).toBeFocused();
  expect(await data(page)).toEqual(beforeNavigation); expect((await writes(page)).length).toBe(writeCount);
  await selectTrial(page, own, 2); const second = await summaryValues(own, false);
  await activate(page, own.locator('[data-pair-review="close"]')); await expect(summary(own)).toHaveCount(0);
  await expect(field).toHaveValue('My evidence compares 31 mph with 58 mph, a 27 mph increase.');
  const after = await data(page); expect(after.inquiry).toEqual(before.inquiry); expect(after.flightStudyObservations).toEqual(before.flightStudyObservations); expect(after.flightChallenges).toEqual(before.flightChallenges);
  proof('saved-evidence-writing', { initial, second, before, after, preservedCaret: true, focusOnlyNavigation: true, audit: await audit(page) });
});

async function addOther(page: Page) {
  await page.evaluate(seed => {
    const w = window as any, host = document.createElement('div'); host.id = 'round49-other'; host.style.width = 'min(100vw,1100px)'; document.body.append(host);
    const state = JSON.parse(JSON.stringify(w.__toolData)); state.migration = { ...state.migration, ...seed }; let refresh: (() => void) | null = null;
    const ctx = { ...w.__ctx, toolData: state, labToolData: state,
      update(bucket: string, key: string, value: any) { state[bucket] = { ...state[bucket], [key]: value }; refresh?.(); },
      updateMulti(bucket: string, values: any) { state[bucket] = { ...state[bucket], ...values }; refresh?.(); } };
    function Other() { const [, setTick] = w.React.useState(0); refresh = () => setTick((n: number) => n + 1); return w.StemLab._registry.migration.render(ctx); }
    w.__round49OtherData = state; w.__round49OtherRoot = w.ReactDOM.createRoot(host); w.__round49OtherRoot.render(w.React.createElement(Other));
  }, authored('Second tool'));
  await expect(otherShell(page).locator('.migration-flight-stage')).toHaveAttribute('data-flight-ready', 'true'); await paint(page);
}
test('two mounted tools keep camera hints, selected indicators and historical evidence local', async ({ page }) => {
  await openScene(page); await addOther(page); const own = shell(page), other = otherShell(page), before = await data(page);
  const firstRefs = await cameraSemantics(own), secondRefs = await cameraSemantics(other);
  expect(firstRefs.groupLabel.id).not.toBe(secondRefs.groupLabel.id); expect(firstRefs.buttons.every(row => !secondRefs.buttons.some(other => other.id === row.id))).toBe(true);
  await activate(page, camera(other, 'aerial')); await selectedCamera(other, 'aerial'); await selectedCamera(own, 'study'); expect(await data(page)).toEqual(before);
  await selectTrial(page, other, 2); const values = await summaryValues(other, false); await expect(summary(own)).toHaveCount(0); expect(await data(page)).toEqual(before);
  await activate(page, other.locator('[data-trial-evidence-return]')); await expect(evidence(other)).toBeFocused();
  await evidence(other).fill('Second tool evidence stays here.'); await expect(evidence(own)).toHaveValue(before.flightInvestigation.evidence);
  proof('camera-evidence-owned-instances', { firstRefs, secondRefs, values, firstBefore: before, firstAfter: await data(page), second: await page.evaluate(() => (window as any).__round49OtherData.migration), audit: await audit(page, '#round49-other > .migration-tool-shell') });
});

test('camera purposes and saved measurements wrap at 320 pixels with enlarged and translated text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 }); await openScene(page); const own = shell(page); await selectTrial(page, own); await activate(page, camera(own, 'study'));
  await page.evaluate(() => { const w = window as any, original = w.__ctx.t; w.__ctx.t = (key: string, fallback: string) => {
    const value = original ? original(key, fallback) : fallback;
    return /camera_label|camera_selected_view|cam_.*_purpose|saved_evidence|pair_review_baseline|pair_review_trial|stat_ground_speed|experiment_drafting_credit|experiment_percentage_points/.test(key) ? value + ' — ausführliche Beschreibung für diesen gespeicherten Vergleich' : value;
  }; w.__rerender(); }); await paint(page);
  const sizes = await own.evaluate(root => {
    const nodes = [...root.querySelectorAll('[data-migration-camera-guide],[data-migration-camera-guide] *,[data-trial-evidence-summary],[data-trial-evidence-summary] *')], before = nodes.map(node => parseFloat(getComputedStyle(node).fontSize));
    nodes.forEach((node, i) => (node as HTMLElement).style.setProperty('font-size', before[i] * 2 + 'px', 'important'));
    return nodes.map((node, i) => ({ before: before[i], after: parseFloat(getComputedStyle(node).fontSize) }));
  }); expect(sizes.every(size => Math.abs(size.after - size.before * 2) < .1)).toBe(true);
  await page.addStyleTag({ content: '[data-migration-camera-guide],[data-migration-camera-guide] *,[data-trial-evidence-summary],[data-trial-evidence-summary] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-camera-purpose],[data-evidence-summary-scope]{margin-bottom:2em!important}' });
  const before = await data(page); await camera(own, 'study').focus(); const sizesProof = await layout(own), colors = await contrast(own);
  expect(sizesProof.cards.every(card => Math.abs(card.width - card.gridWidth) <= 2 && Math.abs(card.left - card.gridLeft) <= 1 && Math.abs(card.right - card.gridRight) <= 1)).toBe(true);
  expect(sizesProof.metricValues).toHaveLength(2);
  for (const row of sizesProof.metricValues) {
    expect(row.values).toHaveLength(3);
    expect(row.values.every(value => Math.abs(value.width - row.width) <= 2 && Math.abs(value.left - row.left) <= 1 && Math.abs(value.right - row.right) <= 1)).toBe(true);
  }
  expect(colors.focus?.visible).toBe(true); expect(parseFloat(colors.focus!.width)).toBeGreaterThanOrEqual(2);
  expect(await data(page)).toEqual(before); await guide(own).screenshot({ path: join(report, 'camera-guide-enlarged-mobile.png') }); await summary(own).screenshot({ path: join(report, 'saved-evidence-enlarged-mobile.png') });
  proof('camera-evidence-enlarged', { sizes, layout: sizesProof, colors, before, after: await data(page), audit: await audit(page), scope: '320 CSS-pixel viewport, doubled component text and WCAG spacing overrides. Actual browser zoom and screen-reader speech remain manual.' });
});

test('forced colors preserves camera selection, native focus and readable historical values', async ({ page }) => {
  await openScene(page); const own = shell(page); await selectTrial(page, own); await activate(page, camera(own, 'study')); const before = await data(page);
  await page.emulateMedia({ forcedColors: 'active', colorScheme: 'light', reducedMotion: 'reduce' }); await camera(own, 'study').focus(); await paint(page);
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true); await selectedCamera(own, 'study');
  const colors = await contrast(own); expect(colors.focus?.visible).toBe(true); expect(colors.focus?.style).toBe('solid'); expect(parseFloat(colors.focus!.width)).toBeGreaterThanOrEqual(2); expect(colors.focus!.ratio).toBeGreaterThanOrEqual(3);
  expect(colors.badge.color).toBe(colors.badge.purposeColor); expect(colors.badge.background).toBe(colors.badge.cardBackground);
  expect(colors.badge.borderStyle).toBe('solid'); expect(parseFloat(colors.badge.borderWidth)).toBeGreaterThanOrEqual(1);
  expect(colors.badge.borderColor).toBe(colors.badge.purposeColor);
  const values = await summaryValues(own), sizes = await layout(own); expect(await data(page)).toEqual(before);
  await guide(own).screenshot({ path: join(report, 'camera-guide-forced-colors.png') }); await summary(own).screenshot({ path: join(report, 'saved-evidence-forced-colors.png') });
  proof('camera-evidence-forced-colors', { values, colors, layout: sizes, before, after: await data(page), audit: await audit(page, '#wrap > .migration-tool-shell', true), scope: 'Chromium forced-colors emulation; actual OS palette and native assistive technology remain manual.' });
});
