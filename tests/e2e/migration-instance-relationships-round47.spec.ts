import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, data, settled } from './helpers/migration_round31';

test.describe.configure({ timeout: 180_000, retries: 0 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round47-2026-10-26');
const sourcePath = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirrorPath = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(sourcePath), hash = createHash('sha256').update(source).digest('hex');
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const errors = new WeakMap<Page, string[]>();
const shell = (page: Page) => page.locator('#wrap > .migration-tool-shell');
const otherShell = (page: Page) => page.locator('#round47-other > .migration-tool-shell');
const marker = (own: Locator, key: string) => own.locator('[data-migration-id="' + key + '"]');
const work = (state: any) => Object.fromEntries(['inquiry', 'flightStudyObservations', 'flightInvestigation', 'flightChallenges'].map(key => [key, state[key]]));
const snapshot = (speciesId = 'canada_goose', wind = 0) => ({ speciesId, season: 'fall', wind, formationMode: 'natural' });
function authored(speciesId: string, label: string) {
  const record = (region: string) => ({ speciesId, region, note: label + ' recorded ' + region + ' note.', bird: 0,
    yaw: 35, pitch: 15, zoom: 1.2, wingStep: 13, paused: true, motionReduced: true });
  return {
    inquiry: { hypothesis: label + ' independent prediction.' },
    flightStudyObservations: { drafts: { [speciesId + ':primaries']: label + ' current Study draft.' },
      records: { [speciesId + ':primaries']: record('primaries'), [speciesId + ':tail']: record('tail') } },
    flightInvestigation: { variable: 'wind', prediction: label + ' current investigation prediction.',
      baseline: snapshot(speciesId), trials: [{ variable: 'wind', prediction: label + ' recorded trial prediction.', baseline: snapshot(speciesId), snapshot: snapshot(speciesId, 10) }],
      evidence: label + ' investigation evidence.', explanation: label + ' investigation explanation.' },
    flightChallenges: { selectedId: 'wind', work: { wind: {
      prediction: label + ' challenge prediction.', notes: label + ' challenge explanation.',
      setup: { speciesId: 'monarch', season: 'fall', wind: -15, formationMode: 'natural' }, attempts: [{
        baseline: { speciesId: 'monarch', season: 'fall', wind: -15, formationMode: 'natural' },
        snapshot: { speciesId: 'monarch', season: 'fall', wind: 4, formationMode: 'natural' },
        prediction: label + ' saved challenge prediction.', notes: label + ' saved challenge explanation.'
      }] }, formation: { prediction: '', notes: '', setup: null, attempts: [] }, season: { prediction: '', notes: '', setup: null, attempts: [] } } }
  };
}
function unchangedSource() {
  expect(readFileSync(sourcePath).equals(source), 'source changed during browser verification').toBe(true);
  expect(readFileSync(mirrorPath).equals(source), 'desktop mirror differs from tested source').toBe(true);
}
test.beforeAll(async () => { unchangedSource(); mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  expect(errors.get(page) || []).toEqual([]); unchangedSource();
  await removeOther(page); await harness.destroy(page);
});
async function paint(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); await paint(page); }
async function openDetails(page: Page, control: Locator) {
  if (!(await control.evaluate(node => (node as HTMLDetailsElement).open))) await activate(page, control.locator(':scope > summary'));
}
async function openScene(page: Page, dark = false) {
  const failures: string[] = []; errors.set(page, failures); page.on('pageerror', error => failures.push(error.stack || error.message));
  await mount(harness, page, 'canada_goose', { dark, reduced: true, extra: {
    flightStudyBird: 0, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1.2, flightWind: 0,
    ...authored('canada_goose', 'First tool')
  } }); await settled(page);
}
// A separate real React root keeps its own state, renderer, and translation hook.
async function addOther(page: Page, translated = false) {
  await page.evaluate(({ seed, translated }) => {
    const w = window as any, host = document.createElement('div'); host.id = 'round47-other';
    host.style.width = 'min(100vw,1100px)'; document.body.append(host);
    const state = JSON.parse(JSON.stringify(w.__toolData)); state.migration = { ...state.migration, flightSpecies: 'arctic_tern', ...seed };
    let refresh: (() => void) | null = null;
    const translations: Record<string, string> = {
      'stem.migration.mission_prediction_label': 'Meine Vorhersage: Welche Flugbedingung werde ich verändern, und welche Beobachtung begründet meine Entscheidung?',
      'stem.migration.mission_notes_label': 'Meine Erklärung: Welche gespeicherten Messwerte oder Veränderungen der Route stützen meine begründete Aussage?',
      'stem.migration.experiment_prediction_label': 'Was vermutest du für diese Untersuchung, und mit welcher Beobachtung begründest du deine Vorhersage?',
      'stem.migration.experiment_evidence_label': 'Beobachtungen und Messwerte, die mir bei diesem Vergleich aufgefallen sind',
      'stem.migration.experiment_explanation_label': 'Wie unterstützen oder verändern diese Beobachtungen meine ursprüngliche Vorhersage?',
      'stem.migration.study_observation_note': 'Meine genaue Beobachtung zu Form und Bewegung',
      'stem.migration.mission_reflection_label': 'Meine spätere Reflexion über diesen gespeicherten Versuch'
    };
    const originalT = w.__ctx.t;
    const ctx = { ...w.__ctx, toolData: state, labToolData: state,
      t(key: string, fallback: string) { return translated && translations[key] || (originalT ? originalT(key, fallback) : fallback); },
      update(bucket: string, key: string, value: any) { state[bucket] = { ...state[bucket], [key]: value }; if (refresh) refresh(); },
      updateMulti(bucket: string, patch: any) { state[bucket] = { ...state[bucket], ...patch }; if (refresh) refresh(); }
    };
    function Other() {
      const [, setTick] = w.React.useState(0); refresh = () => setTick((n: number) => n + 1);
      return w.StemLab._registry.migration.render(ctx);
    }
    w.__round47OtherData = state; w.__round47OtherRoot = w.ReactDOM.createRoot(host);
    w.__round47OtherRoot.render(w.React.createElement(Other));
  }, { seed: authored('arctic_tern', 'Second tool'), translated });
  await expect(otherShell(page).locator('.migration-flight-stage')).toHaveAttribute('data-flight-ready', 'true'); await paint(page);
}
async function otherData(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__round47OtherData.migration))); }
async function removeOther(page: Page) {
  await page.evaluate(() => { const w = window as any;
    if (w.__round47OtherRoot) { w.__round47OtherRoot.unmount(); w.__round47OtherRoot = null; }
    document.querySelector('#round47-other')?.remove();
  }).catch(() => {});
}
async function relationships(own: Locator) {
  const result = await own.evaluate(root => {
    const failures: any[] = [], references: any[] = [], ids = [...root.querySelectorAll('[id]')].map(node => node.id);
    for (const node of root.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls]')) {
      for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
        for (const id of (node.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)) {
          const targets = [...document.querySelectorAll('[id]')].filter(candidate => candidate.id === id);
          const target = targets[0];
          const item = { control: node.getAttribute('data-migration-id') || node.getAttribute('data-study-action') || node.tagName,
            attribute, id, count: targets.length, own: !!target && root.contains(target) };
          references.push(item); if (item.count !== 1 || !item.own) failures.push(item);
        }
      }
    }
    const duplicateIds = ids.filter(id => [...document.querySelectorAll('[id]')].filter(node => node.id === id).length !== 1);
    const labels = [...root.querySelectorAll('label[for]')].map(label => {
      const control = (label as HTMLLabelElement).control;
      return { id: label.getAttribute('for'), own: !!control && root.contains(control), count: control ? control.labels?.length : 0 };
    });
    return { failures, duplicateIds, labels, references };
  });
  expect(result.failures).toEqual([]); expect(result.duplicateIds).toEqual([]); expect(result.labels.every(item => item.own && item.count === 1)).toBe(true);
  return result;
}
async function clickOwnLabel(page: Page, own: Locator, key: string) {
  const field = marker(own, key), id = await field.getAttribute('id'); expect(id).toBeTruthy();
  const label = own.locator('label[for="' + id + '"]'); await expect(label).toHaveCount(1);
  expect(await label.evaluate((node, id) => (node as HTMLLabelElement).control?.id === id, id)).toBe(true);
  await label.click({ position: { x: 4, y: 4 } }); await expect(field).toBeFocused(); await paint(page);
  return { key, id, name: (await label.textContent())?.trim() };
}
async function scan(page: Page, scope = '#round47-other > .migration-tool-shell') {
  await page.addScriptTag({ path: join(process.cwd(), 'axe-core/4.12.1/axe.min.js') });
  const audit = await page.evaluate(async scope => {
    const result = await (window as any).axe.run(document.querySelector(scope), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return { scope, violations: result.violations, incomplete: result.incomplete.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) };
  }, scope); expect(audit.violations).toEqual([]); return audit;
}
async function openReflection(page: Page, own: Locator) {
  const challenge = own.locator('[data-migration-flight-challenges]'); await openDetails(page, challenge);
  await openDetails(page, challenge.locator('[data-flight-challenge-history]'));
  await openDetails(page, challenge.locator('[data-flight-challenge-attempt="1"] [data-flight-challenge-reflection]'));
  await activate(page, challenge.locator('[data-flight-challenge-attempt="1"] [data-flight-reflection-action="edit"]'));
  await expect(own.locator('[data-flight-reflection-input="1"]')).toBeFocused();
}

test('two learning workspaces retain their own labels, descriptions and editable drafts', async ({ page }) => {
  await openScene(page); await addOther(page); const firstBefore = await data(page), secondBefore = await otherData(page), own = otherShell(page);
  await openDetails(page, shell(page).locator('[data-migration-flight-challenges]'));
  await openDetails(page, own.locator('[data-migration-flight-challenges]'));
  const labels = [];
  for (const key of ['migration-mission-prediction', 'migration-mission-notes', 'migration-experiment-prediction', 'migration-experiment-evidence', 'migration-experiment-explanation']) labels.push(await clickOwnLabel(page, own, key));
  await openReflection(page, shell(page)); await openReflection(page, own);
  labels.push(await clickOwnLabel(page, own, 'migration-mission-reflection-wind-1'));
  await own.locator('[data-flight-reflection-input="1"]').fill('Second tool later reflection draft.');
  await expect(shell(page).locator('[data-flight-reflection-input="1"]')).toHaveValue('');
  const beforeRelationships = await relationships(shell(page)), afterRelationships = await relationships(own);
  await marker(own, 'migration-experiment-evidence').fill('Second tool revised evidence only.');
  expect(work(await data(page))).toEqual(work(firstBefore));
  const secondAfter = await otherData(page); expect(secondAfter.flightInvestigation.evidence).toBe('Second tool revised evidence only.');
  expect(secondAfter.flightStudyObservations).toEqual(secondBefore.flightStudyObservations); expect(secondAfter.flightChallenges).toEqual(secondBefore.flightChallenges);
  const audit = await scan(page);
  writeFileSync(join(report, 'learning-instance-labels-proof.json'), JSON.stringify({ hash, firstBefore, firstAfter: await data(page), secondBefore, secondAfter, labels, beforeRelationships, afterRelationships, audit }, null, 2));
});

test('Study references resolve in each instance as optional controls appear and disappear', async ({ page }) => {
  await openScene(page); await addOther(page); const firstBefore = await data(page), secondBefore = await otherData(page), own = otherShell(page), states: any[] = [];
  states.push({ state: 'Study with path and open note', relationships: await relationships(own) });
  await activate(page, own.locator('[data-study-observation] > summary'));
  await expect(own.locator('[data-study-observation]')).not.toHaveAttribute('open');
  states.push({ state: 'Study with closed note', relationships: await relationships(own) });
  await own.getByRole('checkbox', { name: 'Show wingtip path', exact: true }).uncheck(); await paint(page);
  states.push({ state: 'Study without path', relationships: await relationships(own) });
  await activate(page, own.locator('.migration-flight-camera').getByRole('button', { name: 'Chase', exact: true }));
  await expect(own.locator('[data-study-observation]')).toHaveCount(0);
  states.push({ state: 'Chase without Study fields', relationships: await relationships(own) });
  await activate(page, own.locator('.migration-flight-camera').getByRole('button', { name: 'Study', exact: true }));
  await openDetails(page, own.locator('[data-study-observation]'));
  await own.getByRole('checkbox', { name: 'Show wingtip path', exact: true }).check(); await paint(page);
  states.push({ state: 'Study restored', relationships: await relationships(own) });
  await expect(marker(own, 'migration-study-observation-note')).toHaveValue('Second tool current Study draft.');
  expect(work(await data(page))).toEqual(work(firstBefore)); expect(work(await otherData(page))).toEqual(work(secondBefore));
  const audit = await scan(page);
  writeFileSync(join(report, 'study-conditional-relationships-proof.json'), JSON.stringify({ hash, states, firstBefore, firstAfter: await data(page), secondBefore, secondAfter: await otherData(page), audit }, null, 2));
});

test('saved-study and trial revisits return to their own scene and local jump destinations', async ({ page }) => {
  await openScene(page); await addOther(page); const firstBefore = await data(page), secondBefore = await otherData(page), own = otherShell(page);
  await activate(page, own.locator('[data-study-revisit="observation"]'));
  await expect(own.locator('.migration-flight-stage')).toBeFocused(); await expect(shell(page).locator('.migration-flight-stage')).not.toBeFocused();
  await activate(page, own.locator('[data-experiment-revisit="1"]'));
  await expect(own.locator('.migration-flight-stage')).toBeFocused(); await expect(own.locator('[data-experiment-pair-review]')).toBeVisible();
  const reviewRelationships = await relationships(own);
  await activate(page, own.locator('[data-pair-review="close"]'));
  await expect(own.locator('.migration-flight-stage')).toBeFocused(); await expect(own.locator('[data-experiment-pair-review]')).toHaveCount(0);
  const jumps = [];
  for (const selector of ['.migration-experiment-jump', '.migration-mission-actions a']) {
    if (selector.includes('mission')) await openDetails(page, own.locator('[data-migration-flight-challenges]'));
    const link = own.locator(selector), destination = await link.evaluate(node => {
      const id = decodeURIComponent(new URL((node as HTMLAnchorElement).href).hash.slice(1)), target = document.getElementById(id);
      return { id, own: !!target && node.closest('.migration-tool-shell')?.contains(target), marker: target?.getAttribute('data-migration-id') };
    });
    expect(destination.own).toBe(true); await activate(page, link);
    expect(await page.evaluate(() => decodeURIComponent(location.hash.slice(1)))).toBe(destination.id); jumps.push(destination);
  }
  expect(jumps.map(item => item.marker)).toEqual(['migration-flight-experiment', 'migration-flight-deck']);
  expect(work(await data(page))).toEqual(work(firstBefore)); expect(work(await otherData(page))).toEqual(work(secondBefore));
  const audit = await scan(page);
  writeFileSync(join(report, 'owned-revisit-jumps-proof.json'), JSON.stringify({ hash, firstBefore, firstAfter: await data(page), secondBefore, secondAfter: await otherData(page), reviewRelationships, jumps, audit }, null, 2));
});

test('long translated learning labels retain native associations and visible focus at narrow width', async ({ page }) => {
  await openScene(page, true); await addOther(page, true); const firstBefore = await data(page), secondBefore = await otherData(page), own = otherShell(page);
  await openDetails(page, own.locator('[data-migration-flight-challenges]'));
  await expect(marker(own, 'migration-mission-prediction')).toHaveAccessibleName(/^Meine Vorhersage:/);
  await expect(marker(own, 'migration-mission-notes')).toHaveAccessibleName(/^Meine Erklärung:/);
  await page.setViewportSize({ width: 320, height: 1000 });
  const writing = own.locator('.migration-mission-writing');
  await writing.evaluate(node => { const elements = [node, ...node.querySelectorAll('*')];
    const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, i) => (element as HTMLElement).style.setProperty('font-size', sizes[i] * 2 + 'px', 'important'));
  });
  await page.addStyleTag({ content: '#round47-other .migration-tool-shell *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}#round47-other .migration-tool-shell p{margin-bottom:2em!important}' });
  const label = await clickOwnLabel(page, own, 'migration-mission-notes');
  const focused = marker(own, 'migration-mission-notes');
  const layout = await writing.evaluate(node => {
    const boundary = node.getBoundingClientRect(), failures: string[] = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let current = walker.nextNode(); current; current = walker.nextNode()) {
      if (!current.textContent?.trim() || current.parentElement?.closest('textarea,.sr-only,[aria-hidden="true"]')) continue;
      const range = document.createRange(); range.selectNodeContents(current);
      for (const line of range.getClientRects()) if (line.width && line.height && (line.left < boundary.left - 1 || line.right > boundary.right + 1)) failures.push(current.textContent);
    }
    const field = node.querySelector('[data-migration-id="migration-mission-notes"]')!, rect = field.getBoundingClientRect(), style = getComputedStyle(field);
    return { failures, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, left: rect.left, right: rect.right, outline: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(layout.failures).toEqual([]); expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
  expect(layout.left).toBeGreaterThanOrEqual(0); expect(layout.right).toBeLessThanOrEqual(layout.width + 1); expect(layout.outline).toBe('solid'); expect(parseFloat(layout.outlineWidth)).toBeGreaterThanOrEqual(2);
  await expect(focused).toBeFocused(); const refs = await relationships(own), audit = await scan(page);
  await writing.screenshot({ path: join(report, 'translated-learning-labels-mobile.png') });
  expect(work(await data(page))).toEqual(work(firstBefore)); expect(work(await otherData(page))).toEqual(work(secondBefore));
  writeFileSync(join(report, 'translated-instance-labels-proof.json'), JSON.stringify({ hash, firstBefore, firstAfter: await data(page), secondBefore, secondAfter: await otherData(page), label, layout, relationships: refs, audit, scope: 'Two real tool instances; 320 CSS-pixel viewport and doubled writing-area text with WCAG text-spacing overrides. Actual browser zoom and screen-reader speech remain manual checks.' }, null, 2));
});
