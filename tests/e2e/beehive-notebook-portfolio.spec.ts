import { test, expect, Page, TestInfo } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, width: 980, height: 1800, layout: 'document',
});
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const fields = ['prediction', 'evidence', 'explanation'] as const;
const roles = ['beekeeper', 'queen', 'drone'] as const;
const roleLabels = { beekeeper: 'Beekeeper', queen: 'Colony Network', drone: 'Drone Flight' };
type Role = typeof roles[number];

function seededNotebook() {
  return {
    beekeeper: {
      prediction: '  I predict food may decrease.\nI will compare the same colony on two days.  ',
      evidence: 'Day 12: food 60, workers 24000.\n\nMy note: <strong>model readings</strong> & not a field measurement.',
      explanation: 'Workers may use stored food.\nThese readings alone cannot isolate a cause.',
      review: { prediction: false, evidence: true, explanation: true }, custom: { retained: 'Role metadata.' },
    },
    queen: {
      prediction: '', evidence: 'Cycle 4: I recorded the QMP reading.\nNo matched comparison yet.', explanation: ' \n\t ',
      // Legacy review flags on blank writing must not count as self-reviewed evidence.
      review: { prediction: true, evidence: true, explanation: true },
    },
    drone: {
      prediction: 'I predict a shorter route may retain more energy.',
      evidence: 'Route A retained 40 energy.\nRoute B used a different maneuver.',
      explanation: 'The route and maneuver both changed, so I cannot isolate either effect.',
      review: { prediction: false, evidence: false, explanation: true },
    },
    synthesis: 'I am comparing individual behavior with colony decisions.\nThis is an unfinished synthesis.',
    discoveries: { pollination: { prediction: 'Saved flower prediction.', observation: 'Saved stigma contact observation.',
      comparison: 'Only contact changed between the saved cases.', explanation: 'Keep this saved discovery explanation.' } },
    custom: { retained: 'Notebook metadata.' },
  };
}

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(notebook => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Portfolio test uses the supported fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 12, honey: 60, syrup: 0, workers: 24000, morale: 85, varroaLevel: 2,
      diseaseRisk: 0, actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, notebook,
      queen: { active: false, custom: { retained: 'Network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908 },
      discoveryLesson: 'pollination',
      discoveryRecords: { pollination: { prediction: 1, checked: true, note: 'Keep my discovery draft.', saved: false } },
    }, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    const copy = async (text: string) => { w.__copiedPortfolio = text; };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    w.StemLab.writeClipboard = copy;
  }, seededNotebook());
  await expect(page.locator('[data-pollination-lab]')).toBeVisible();
  await page.locator('#beehive-notebook-summary').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-beehive-notebook]')).toHaveJSProperty('open', true);
}

function roleCard(page: Page, role: Role) { return page.locator('[data-notebook-role-card="' + role + '"]'); }
function roleRecords(page: Page, role: Role) { return page.locator('details[data-notebook-role-records="' + role + '"]'); }

async function persistentWork(page: Page) {
  return page.evaluate(() => {
    const state = JSON.parse(JSON.stringify((window as any).__toolData));
    delete state.beehive.viewMode; delete state.beehive.notebookOpen;
    return state;
  });
}

async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}

async function copyPortfolio(page: Page) {
  await page.evaluate(() => { (window as any).__copiedPortfolio = ''; });
  await page.locator('[data-beehive-copy-notebook]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__copiedPortfolio || '')).not.toBe('');
  return page.evaluate(() => (window as any).__copiedPortfolio as string);
}

async function expectCounts(page: Page, role: Role, written: number, reviewed: number) {
  const card = roleCard(page, role);
  await expect(card.locator('[data-notebook-role-written]')).toHaveText(written + ' / 3 written');
  await expect(card.locator('[data-notebook-role-reviewed]')).toHaveText(reviewed + ' / 3 self-reviewed');
}

async function expectCurrentRole(page: Page, role: Role, written: number, reviewed: number) {
  const notebook = page.locator('[data-beehive-notebook]');
  await expect(notebook).toHaveAttribute('data-beehive-notebook', role);
  await expect(notebook).toHaveJSProperty('open', true);
  await expect(page.locator('h3#beehive-notebook-writing-title')).toHaveText(roleLabels[role] + ' writing');
  await expect(page.locator('#beehive-notebook-writing-title')).toHaveAttribute('tabindex', '-1');
  await expect(page.locator('#beehive-notebook-writing-title')).toBeFocused();
  await expect(page.locator('#beehive-notebook-summary [data-notebook-written-count]')).toHaveText(written + ' / 3 written');
  await expect(page.locator('#beehive-notebook-summary [data-notebook-reviewed-count]')).toHaveText(reviewed + ' / 3 self-reviewed');
  for (const candidate of roles) {
    const card = roleCard(page, candidate), button = card.locator('button[data-notebook-role="' + candidate + '"]');
    await expect(button).toBeVisible();
    if (candidate === role) {
      await expect(button).toHaveAttribute('aria-current', 'true');
      await expect(card.locator('[data-notebook-role-current]')).toHaveText('Current notebook');
    } else {
      await expect(button).not.toHaveAttribute('aria-current', 'true');
      await expect(card.locator('[data-notebook-role-current]')).toHaveCount(0);
    }
  }
}

async function showSavedWriting(page: Page) {
  for (const role of roles) {
    const records = roleRecords(page, role);
    if (!await records.evaluate(node => (node as HTMLDetailsElement).open)) {
      await records.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
    }
    await expect(records).toHaveJSProperty('open', true);
  }
}

async function expectSavedWriting(page: Page, notebook: ReturnType<typeof seededNotebook>) {
  for (const role of roles) {
    const records = roleRecords(page, role);
    await expect(records).toHaveJSProperty('open', true);
    for (const field of fields) {
      const saved = records.locator('[data-notebook-saved-field="' + field + '"]');
      await expect(saved).toBeVisible();
      const raw = notebook[role][field];
      if (raw.trim()) {
        const text = saved.locator('[data-notebook-saved-text="' + field + '"]');
        await expect(text).toBeVisible();
        expect(await text.textContent()).toBe(raw);
        expect(await text.evaluate(node => getComputedStyle(node).whiteSpace)).toMatch(/pre-wrap|break-spaces/);
        // User writing is text; markup in an observation must not become DOM elements.
        await expect(text.locator('*')).toHaveCount(0);
      } else {
        await expect(saved).toContainText('Not written yet.');
      }
    }
  }
}

async function synthesisSemantics(page: Page) {
  const synthesis = page.locator('[data-notebook-synthesis]');
  await expect(synthesis).toHaveAttribute('aria-labelledby', 'beehive-notebook-synthesis-label');
  await expect(synthesis).toHaveAttribute('aria-describedby', 'beehive-notebook-synthesis-prompt beehive-notebook-synthesis-guide');
  await expect(synthesis).toHaveAccessibleName('Cross-perspective synthesis');
  const description = await synthesis.getAttribute('aria-describedby');
  for (const id of description!.split(' ')) {
    const guide = page.locator('#' + id);
    await expect(guide).toBeVisible();
    const copy = await guide.evaluate(node => node.tagName === 'OL'
      ? Array.from(node.querySelectorAll('li')).map(item => item.textContent!.trim())
      : [node.textContent!.trim()]);
    for (const text of copy) {
      expect(text.length).toBeGreaterThan(10);
      await expect(synthesis).toHaveAccessibleDescription(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  }
}

async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const audit = await (window as any).axe.run({ include: [['[data-beehive-notebook-portfolio]'], ['#beehive-notebook-summary']] }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}

async function readableLayout(page: Page, checkPageOverflow = true) {
  const result = await page.locator('[data-beehive-notebook-portfolio]').evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const summary = document.querySelector('#beehive-notebook-summary')!;
    const blocks = [node, summary, ...Array.from(node.querySelectorAll('button,summary,textarea,[data-notebook-role-card],[data-notebook-role-records],[data-notebook-saved-field],[data-notebook-saved-text],p,h3'))];
    const readable = Array.from(node.querySelectorAll('[data-notebook-role-written],[data-notebook-role-reviewed],[data-notebook-saved-text],[data-notebook-saved-field] > :first-child,[id^="beehive-notebook-synthesis-"]'));
    return {
      rootFont,
      cards: Array.from(node.querySelectorAll('[data-notebook-role-card]')).map(el => ({ x: el.getBoundingClientRect().x, width: el.getBoundingClientRect().width })),
      controls: Array.from(node.querySelectorAll('button,summary')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      text: readable.map(el => { const css = getComputedStyle(el); return { text: el.textContent, font: parseFloat(css.fontSize), ellipsis: css.textOverflow === 'ellipsis', whiteSpace: css.whiteSpace }; }),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.cards).toHaveLength(3);
  for (const control of result.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  expect(result.text.length).toBeGreaterThanOrEqual(15);
  for (const text of result.text) {
    expect(text.font, text.text || '').toBeGreaterThanOrEqual(result.rootFont * .8125);
    expect(text.ellipsis, text.text || '').toBe(false);
    expect(text.whiteSpace, text.text || '').not.toBe('nowrap');
  }
  return result;
}

async function preview(page: Page, testInfo: TestInfo, name: string) {
  await page.locator('[data-beehive-notebook-portfolio]').screenshot({ path: testInfo.outputPath('portfolio-' + name + '.png'), timeout: 120000, animations: 'disabled' });
}

test('portfolio separates written work from self-review and preserves every role’s saved writing while navigating and copying', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const frozen = await persistentWork(page), notebook = seededNotebook(), portfolio = page.locator('[data-beehive-notebook-portfolio]');
  await expect(page.locator('[data-notebook-written-count]')).toHaveText('3 / 3 written');
  await expect(page.locator('[data-notebook-reviewed-count]')).toHaveText('2 / 3 self-reviewed');
  await expect(page.locator('#beehive-notebook-summary')).not.toHaveAccessibleName(/sections complete/i);
  await expect(portfolio.locator('[data-notebook-portfolio-written]')).toHaveText('8 / 10 written');
  await expectCounts(page, 'beekeeper', 3, 2); await expectCounts(page, 'queen', 1, 1); await expectCounts(page, 'drone', 3, 1);
  await expect(portfolio).not.toContainText(/portfolio is ready/i);
  const notebookSummary = page.locator('#beehive-notebook-summary');
  await notebookSummary.focus(); await page.keyboard.press('Space');
  await expect(page.locator('[data-beehive-notebook]')).toHaveJSProperty('open', false);
  await expect(notebookSummary).toBeFocused();
  await expect(notebookSummary.locator('[data-notebook-written-count]')).toBeVisible();
  await expect(notebookSummary.locator('[data-notebook-reviewed-count]')).toBeVisible();
  await expect(portfolio).not.toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-beehive-notebook]')).toHaveJSProperty('open', true);
  await expect(notebookSummary).toBeFocused();
  await synthesisSemantics(page);
  for (const role of roles) await expect(roleRecords(page, role)).toHaveJSProperty('open', false);
  await showSavedWriting(page); await expectSavedWriting(page, notebook);
  const savedSummary = roleRecords(page, 'queen').locator(':scope > summary');
  await savedSummary.focus(); await page.keyboard.press('Space');
  await expect(roleRecords(page, 'queen')).toHaveJSProperty('open', false); await expect(savedSummary).toBeFocused();
  await page.keyboard.press('Enter'); await expect(roleRecords(page, 'queen')).toHaveJSProperty('open', true);
  expect(await persistentWork(page)).toEqual(frozen);
  const exported = await copyPortfolio(page);
  for (const role of roles) {
    expect(exported).toContain('## ' + roleLabels[role]);
    for (const field of fields) if (notebook[role][field].trim()) expect(exported).toContain(notebook[role][field].trim());
  }
  expect(exported).toContain(notebook.synthesis);
  expect(exported).toContain(notebook.discoveries.pollination.explanation);

  for (const [role, written, reviewed] of [['beekeeper', 3, 2], ['queen', 1, 1], ['drone', 3, 1], ['beekeeper', 3, 2]] as const) {
    const button = roleCard(page, role).locator('button[data-notebook-role]');
    await button.focus(); await page.keyboard.press(role === 'queen' ? 'Space' : 'Enter');
    await expectCurrentRole(page, role, written, reviewed);
    for (const field of fields) await expect(page.locator('[data-notebook-field="' + field + '"]')).toHaveValue(notebook[role][field]);
    await showSavedWriting(page); await expectSavedWriting(page, notebook);
    expect(await persistentWork(page)).toEqual(frozen);
  }
  expect(await copyPortfolio(page)).toBe(exported);

  const revisedEvidence = notebook.beekeeper.evidence + '\nI need a matched comparison before attributing a cause.';
  await page.locator('[data-notebook-field="evidence"]').fill(revisedEvidence);
  await expect(page.locator('[data-notebook-reviewed-count]')).toHaveText('1 / 3 self-reviewed');
  await expectCounts(page, 'beekeeper', 3, 1); await expectCounts(page, 'queen', 1, 1); await expectCounts(page, 'drone', 3, 1);
  const edited = JSON.parse(JSON.stringify(frozen));
  edited.beehive.notebook.beekeeper.evidence = revisedEvidence;
  edited.beehive.notebook.beekeeper.review.evidence = false;
  expect(await persistentWork(page)).toEqual(edited);
  await expect(page.locator('[data-notebook-review="explanation"]')).toBeChecked();
  await expect(page.locator('[data-notebook-review="evidence"]')).not.toBeChecked();
  await expectSavedWriting(page, edited.beehive.notebook);
  expect(await copyPortfolio(page)).toContain(revisedEvidence);

  const synthesisOnly = seededNotebook();
  for (const role of roles) Object.assign(synthesisOnly[role], { prediction: '', evidence: ' \n\t ', explanation: '', review: { prediction: true, evidence: true, explanation: true } });
  await fixture(page, { notebook: synthesisOnly });
  const synthesisFrozen = await persistentWork(page);
  await expect(portfolio.locator('[data-notebook-portfolio-written]')).toHaveText('1 / 10 written');
  await expect(portfolio).not.toContainText(/portfolio is ready|all (?:roles|sections) complete/i);
  await expect(page.locator('[data-notebook-written-count]')).toHaveText('0 / 3 written');
  await expect(page.locator('[data-notebook-reviewed-count]')).toHaveText('0 / 3 self-reviewed');
  for (const role of roles) await expectCounts(page, role, 0, 0);
  for (const field of fields) {
    await expect(page.locator('[data-notebook-review="' + field + '"]')).toBeDisabled();
    await expect(page.locator('[data-notebook-review="' + field + '"]')).not.toBeChecked();
  }
  await showSavedWriting(page); await expectSavedWriting(page, synthesisOnly); await accessible(page);
  expect(await persistentWork(page)).toEqual(synthesisFrozen);
  const partialExport = await copyPortfolio(page);
  expect(partialExport).toContain(synthesisOnly.synthesis);
  for (const role of roles) expect(partialExport).toContain('## ' + roleLabels[role]);
  expect(errors).toEqual([]);
});

test('saved role writing and portfolio guidance stay readable on mobile, in dark and forced colors, and with enlarged text', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await showSavedWriting(page);
  const frozen = await persistentWork(page), portfolio = page.locator('[data-beehive-notebook-portfolio]');
  for (const [width, name] of [[980, 'wide'], [320, 'mobile']] as const) {
    await page.setViewportSize({ width, height: 1800 });
    const layout = await readableLayout(page);
    expect(new Set(layout.cards.map(card => Math.round(card.x))).size).toBe(width === 320 ? 1 : 3);
    await expectSavedWriting(page, seededNotebook()); await synthesisSemantics(page); await accessible(page); await preview(page, testInfo, name);
    if (width === 980) await page.locator('#beehive-notebook-summary').screenshot({ path: testInfo.outputPath('portfolio-summary-wide.png'), timeout: 120000, animations: 'disabled' });
  }
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'dark');
  await page.emulateMedia({ forcedColors: 'active' });
  const roleButton = roleCard(page, 'beekeeper').locator('button[data-notebook-role]');
  await roleButton.focus();
  const colors = await roleButton.evaluate(node => {
    const css = getComputedStyle(node);
    return { ink: css.color, paper: css.backgroundColor, border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth), outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) };
  });
  expect(colors.ink).not.toBe(colors.paper); expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0);
  expect(colors.outline).not.toBe('none'); expect(colors.outlineWidth).toBeGreaterThan(0);
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'forced-colors');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1600, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.locator('[data-beehive-notebook]').evaluate(node => Object.assign((node as HTMLElement).style, { width: '1100px', maxWidth: 'none' }));
  await portfolio.evaluate(node => Object.assign((node as HTMLElement).style, { width: '900px', maxWidth: '100%' }));
  expect(await portfolio.evaluate(node => node.getBoundingClientRect().width)).toBe(900);
  const enlarged = await readableLayout(page, false);
  expect(new Set(enlarged.cards.map(card => Math.round(card.x))).size).toBe(1);
  await expectSavedWriting(page, seededNotebook()); await accessible(page); await preview(page, testInfo, 'large-text');
  expect(await persistentWork(page)).toEqual(frozen);
  expect(errors).toEqual([]);
});
