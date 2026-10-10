import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, width: 320, height: 950, layout: 'document' });
test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ viewport: { width: 320, height: 950 }, reducedMotion: 'reduce', hasTouch: true, video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, overrides: any = {}, grade = '7th Grade') {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ overrides, grade }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: { ...BH.bhCreateNewColonyState(777, 2, 0),
      viewMode: 'beekeeper', beeView: 'pollination', discoveryLesson: 'pollination', tutorialDone: true,
      soundOn: false, motionPaused: true, day: 12, totalFlowerVisits: 3500, ...overrides }, otherTool: { retained: true } }));
    w.__ctx.gradeLevel = grade; w.__rerender(); document.getElementById('wrap')!.style.width = '100%';
  }, { overrides, grade });
  await expect(page.locator('[data-pollination-lab]')).toBeVisible();
}
async function colony(page: Page) {
  return page.evaluate(() => {
    const { discoveryRecords, notebook, pollinationLab, ...state } = (window as any).__toolData.beehive;
    return { state, otherTool: (window as any).__toolData.otherTool };
  });
}
async function capture(page: Page) {
  const card = page.locator('[data-beehive-discovery]');
  await card.getByRole('radio', { name: 'Pollen reaching a receptive stigma', exact: true }).check();
  await card.getByRole('button', { name: 'Check my thinking', exact: true }).click();
  await card.getByRole('button', { name: 'Capture observation', exact: true }).click();
}
async function compare(page: Page) { await page.locator('[data-beehive-discovery]').getByRole('button', { name: 'Compare now', exact: true }).click(); }
async function accessible(page: Page, fullPage = true) {
  const result = await page.evaluate(async () => {
    const node = document.querySelector('[data-pollination-comparison]')!;
    const audit = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return {
      violations: audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: node.scrollWidth - node.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      smallTargets: Array.from(node.querySelectorAll('button,summary')).filter(n => n.getBoundingClientRect().height > 0 && (n.getBoundingClientRect().height < 44 || n.getBoundingClientRect().width < 44)).map(n => n.textContent)
    };
  });
  expect(result.violations).toEqual([]); expect(result.overflow).toBeLessThanOrEqual(1);
  if (fullPage) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.smallTargets).toEqual([]);
}

test('distinguishes one selected input from two changed outputs and saves a frozen explanation by keyboard', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const notebook = { beekeeper: { claim: 'Original claim', reasoning: 'Original reasoning', evidence: 'Earlier evidence.' }, synthesis: 'Keep synthesis' };
  await mount(page, { notebook }); const before = await colony(page);
  await capture(page); const lab = page.locator('[data-pollination-lab]'), card = page.locator('[data-beehive-discovery]');
  await lab.getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).focus(); await page.keyboard.press('Space');
  await compare(page); const coach = card.locator('[data-pollination-comparison]');
  await expect(coach).toHaveAttribute('data-pollination-comparison', 'one-change');
  await expect(coach.locator('[data-pollination-design]')).toHaveAttribute('data-pollination-design', '1');
  await expect(coach.locator('[data-pollination-evidence-group="inputs"]')).toContainText('1 changed · 2 held fixed');
  await expect(coach.locator('[data-evidence-metric="pollen"]')).toContainText('Held fixed');
  await expect(coach.locator('[data-evidence-metric="contact"] [data-evidence-case="before"]')).toHaveText('Starting caseMissed');
  await expect(coach.locator('[data-evidence-metric="contact"] [data-evidence-case="after"]')).toHaveText('Compared caseMade');
  await expect(coach.locator('[data-evidence-kind="output"] strong')).toHaveText(['Changed', 'Changed']);
  await coach.getByText('Use this evidence in your explanation', { exact: true }).click();
  const note = 'Only contact changed. Pollen and compatibility stayed fixed. The schematic showed deposition, but did not observe fertilization.';
  await card.getByRole('textbox').fill(note); await card.getByRole('button', { name: 'Save discovery', exact: true }).click();
  const saved = await page.evaluate(() => (window as any).__toolData.beehive.notebook);
  expect(saved.discoveries.pollination.comparison).toContain('1 selected condition changed');
  expect(saved.discoveries.pollination.explanation).toBe(note); expect(saved.beekeeper).toEqual(notebook.beekeeper); expect(saved.synthesis).toBe(notebook.synthesis);
  await lab.getByRole('checkbox', { name: 'Pollen compatible', exact: true }).uncheck();
  await expect(coach.locator('[data-evidence-metric="possible"] [data-evidence-case="before"]')).toHaveText('Starting caseConditions not met');
  await expect(coach.locator('[data-evidence-metric="possible"] [data-evidence-case="after"]')).toHaveText('Compared casePossible later');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook)).toEqual(saved);
  await coach.getByRole('button', { name: 'Inspect flower controls', exact: false }).click(); await expect(page.locator('#bee-discovery-hands-on')).toBeFocused();
  expect(await colony(page)).toEqual(before); await accessible(page);
  await coach.screenshot({ path: testInfo.outputPath('comparison-mobile-light.png') }); expect(errors).toEqual([]);
});

test('keeps a one-change null result useful and preserves it when starting another trial', async ({ page }) => {
  await mount(page, { pollinationLab: { pollen: false, contact: false, compatible: true } }); await capture(page);
  const lab = page.locator('[data-pollination-lab]'), card = page.locator('[data-beehive-discovery]');
  await lab.getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).check(); await compare(page);
  const coach = card.locator('[data-pollination-comparison]');
  await expect(coach).toHaveAttribute('data-pollination-comparison', 'one-change-null');
  await expect(coach).toContainText('Both modeled outcomes stayed the same');
  await expect(coach.locator('[data-evidence-kind="output"] strong')).toHaveText(['No change', 'No change']);
  await card.getByRole('textbox').fill('Contact changed, but there was no loose pollen. The modeled transfer stayed No.');
  await card.getByRole('button', { name: 'Save discovery', exact: true }).click();
  const saved = await page.evaluate(() => (window as any).__toolData.beehive.notebook.discoveries.pollination);
  expect(saved.comparison).toContain('Both modeled outcomes stayed the same');
  await card.getByRole('button', { name: 'Update observation', exact: true }).click();
  await expect(coach).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook.discoveries.pollination)).toEqual(saved);
  await expect(card.getByRole('textbox')).toHaveValue(saved.explanation);
});

test('allows a description of two changes while explaining the limit on an isolated cause', async ({ page }, testInfo) => {
  await mount(page, { pollinationLab: { pollen: false, contact: false, compatible: true } }); await capture(page);
  const lab = page.locator('[data-pollination-lab]'), card = page.locator('[data-beehive-discovery]');
  await lab.getByRole('checkbox', { name: 'Loose pollen on bee', exact: true }).tap();
  await lab.getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).tap(); await compare(page);
  const coach = card.locator('[data-pollination-comparison]');
  await expect(coach).toHaveAttribute('data-pollination-comparison', 'several-changes');
  await expect(coach.locator('[data-pollination-design]')).toHaveAttribute('data-pollination-design', '2');
  await expect(coach).toContainText('cannot isolate');
  await card.getByRole('textbox').fill('Both carried pollen and contact changed. I can describe deposition, but this pair does not isolate one condition.');
  await expect(card.getByRole('button', { name: 'Save discovery', exact: true })).toBeEnabled();
  await card.getByRole('button', { name: 'Save discovery', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook.discoveries.pollination.comparison)).toContain('2 selected conditions changed');
  await accessible(page); await coach.screenshot({ path: testInfo.outputPath('comparison-several-changes.png') });
});

test('labels an unchanged repeated case and adapts reflection without rewriting evidence', async ({ page }) => {
  await mount(page, {}, '2nd Grade'); await capture(page); await compare(page);
  const card = page.locator('[data-beehive-discovery]'), coach = card.locator('[data-pollination-comparison]');
  await expect(coach).toHaveAttribute('data-pollination-comparison', 'same-case');
  await expect(coach).toContainText('does not test a changed condition');
  await coach.getByText('Use this evidence in your explanation', { exact: true }).click();
  await expect(coach.locator('[data-pollination-reflection]')).toContainText('Starting case');
  const before = await page.evaluate(() => (window as any).__toolData.beehive.discoveryRecords.pollination);
  await page.evaluate(() => { const w = window as any; w.__ctx.gradeLevel = '11th Grade'; w.__rerender(); });
  await expect(coach.locator('[data-pollination-reflection]')).toContainText('isolates');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.discoveryRecords.pollination)).toEqual(before);
});

test('blocks contradictory imported outputs and preserves earlier data when a comparison fails', async ({ page }) => {
  const notebook = { discoveries: { pollination: { explanation: 'Keep earlier work', comparison: 'Earlier record' } } };
  await mount(page, { notebook }); await capture(page); const card = page.locator('[data-beehive-discovery]');
  await page.locator('[data-pollination-lab]').getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).check(); await compare(page);
  await card.getByRole('textbox').fill('Keep draft writing');
  await page.evaluate(() => {
    const w = window as any, record = w.__toolData.beehive.discoveryRecords.pollination;
    const row = record.comparison.rows.find((r: any) => r.id === 'possible'); row.after = 0; row.delta = 0;
    w.__rerender();
  });
  const original = await page.evaluate(() => (window as any).__toolData.beehive.discoveryRecords.pollination);
  await expect(card.locator('[data-pollination-comparison]')).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Save discovery', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.discoveryRecords.pollination)).toEqual(original);
  await page.evaluate(() => {
    const w = window as any, record = w.__toolData.beehive.discoveryRecords.pollination;
    record.snapshot.metrics.find((m: any) => m.id === 'transfer').value = 1;
    const transfer = record.comparison.rows.find((r: any) => r.id === 'transfer');
    transfer.before = 1; transfer.delta = transfer.after - transfer.before;
    w.__rerender();
  });
  const damaged = await page.evaluate(() => (window as any).__toolData.beehive.discoveryRecords.pollination);
  await compare(page);
  const retained = await page.evaluate(() => (window as any).__toolData.beehive.discoveryRecords.pollination);
  expect(retained.snapshot).toEqual(damaged.snapshot); expect(retained.comparison).toEqual(damaged.comparison); expect(retained.note).toBe('Keep draft writing');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook)).toEqual(notebook);
  await expect(card.getByRole('button', { name: 'Save discovery', exact: true })).toBeDisabled();
});

test('uses separate evidence columns in a wide panel with readable before-and-after values', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 980, height: 1000 }); await mount(page, {}, '11th Grade'); await capture(page);
  await page.locator('[data-pollination-lab]').getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).check(); await compare(page);
  const coach = page.locator('[data-pollination-comparison]');
  expect((await coach.boundingBox())!.width).toBeGreaterThan(600);
  expect(await coach.locator('.bee-pollen-evidence-groups').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(2);
  await coach.getByText('Use this evidence in your explanation', { exact: true }).click();
  await expect(coach).toContainText('Real pollen deposition');
  await accessible(page); await coach.screenshot({ path: testInfo.outputPath('comparison-wide.png') });
});

test('distinguishes held inputs and derived outcomes in dark and forced colors at 320px', async ({ page }, testInfo) => {
  await mount(page); await capture(page);
  await page.locator('[data-pollination-lab]').getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).check(); await compare(page);
  const coach = page.locator('[data-pollination-comparison]');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await accessible(page); await coach.screenshot({ path: testInfo.outputPath('comparison-mobile-dark.png') });
  await page.emulateMedia({ forcedColors: 'active' }); await accessible(page);
  const colors = await coach.getByRole('button', { name: 'Inspect flower controls', exact: false }).evaluate(n => ({ ink: getComputedStyle(n).color, paper: getComputedStyle(n).backgroundColor })); expect(colors.ink).not.toBe(colors.paper);
  expect(await coach.locator('[data-evidence-kind="output"]').first().evaluate(n => getComputedStyle(n).borderStyle)).toBe('dashed');
  await expect(coach.locator('[data-evidence-metric="pollen"]')).toContainText('Held fixed');
  await coach.screenshot({ path: testInfo.outputPath('comparison-forced-colors.png') });
});

test('stacks evidence and wraps doubled text in a narrow desktop card', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); await mount(page); await capture(page);
  await page.locator('[data-pollination-lab]').getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).check(); await compare(page);
  const coach = page.locator('[data-pollination-comparison]');
  await coach.evaluate(node => { (node as HTMLElement).style.width = '260px'; (node as HTMLElement).style.maxWidth = '100%'; document.documentElement.style.fontSize = '32px'; });
  expect(await coach.locator('.bee-pollen-evidence-groups').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(1);
  expect(await coach.locator('dt').first().evaluate(n => parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(28);
  await coach.getByText('Use this evidence in your explanation', { exact: true }).click(); await accessible(page, false);
  await coach.screenshot({ path: testInfo.outputPath('comparison-large-text.png') });
});

test('names both saved cases across every flower selection and preserves frozen values while live controls change', async ({ page }) => {
  const notebook = { beekeeper: { claim: 'Keep original claim', evidence: 'Keep earlier evidence', reasoning: 'Keep original reasoning' }, synthesis: 'Keep synthesis' };
  await mount(page, { notebook, pollinationLab: { pollen: false, contact: false, compatible: false, note: 'Keep flower notes', teacher: { retained: true } } });
  const before = await colony(page), lab = page.locator('[data-pollination-lab]'), card = page.locator('[data-beehive-discovery]');
  const titles = { pollen: 'Loose pollen on bee', contact: 'Bee contacts stigma', compatible: 'Pollen compatible' };
  const values = (flags: { pollen: boolean; contact: boolean; compatible: boolean }) => ({ ...flags, transfer: flags.pollen && flags.contact, possible: flags.pollen && flags.contact && flags.compatible });
  const word = (id: string, value: boolean) => id === 'pollen' ? value ? 'Present' : 'Absent' : id === 'contact' ? value ? 'Made' : 'Missed' : id === 'transfer' ? value ? 'Shown' : 'Not shown' : id === 'possible' ? value ? 'Possible later' : 'Conditions not met' : value ? 'Yes' : 'No';
  await card.getByRole('radio', { name: 'Pollen reaching a receptive stigma', exact: true }).check();
  await card.getByRole('button', { name: 'Check my thinking', exact: true }).click();
  let first = true;
  for (const pollen of [false, true]) for (const contact of [false, true]) for (const compatible of [false, true]) {
    const starting = { pollen, contact, compatible }, compared = { pollen: !pollen, contact: !contact, compatible: !compatible };
    for (const key of ['pollen', 'contact', 'compatible'] as const) await lab.getByRole('checkbox', { name: titles[key], exact: true }).setChecked(starting[key]);
    await card.getByRole('button', { name: first ? 'Capture observation' : 'Update observation', exact: true }).click(); first = false;
    for (const key of ['pollen', 'contact', 'compatible'] as const) await lab.getByRole('checkbox', { name: titles[key], exact: true }).setChecked(compared[key]);
    await compare(page); const coach = card.locator('[data-pollination-comparison]');
    for (const [moment, title, flags] of [['before', 'Starting case', values(starting)], ['after', 'Compared case', values(compared)]] as const) {
      for (const id of ['pollen', 'contact', 'compatible', 'transfer', 'possible'] as const) {
        const reading = coach.locator('[data-evidence-metric="' + id + '"] [data-evidence-case="' + moment + '"]');
        await expect(reading).toHaveAttribute('data-evidence-value', String(Number(flags[id])));
        await expect(reading).toHaveText(title + word(id, flags[id]));
      }
    }
    await expect(coach.locator('[data-saved-observation-limit]')).toHaveText('Fertilization was not observed in either case.');
    const frozen = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.beehive.discoveryRecords.pollination)));
    const displayed = await coach.innerText();
    await lab.getByRole('checkbox', { name: titles.pollen, exact: true }).setChecked(!compared.pollen);
    expect(await coach.innerText()).toBe(displayed);
    expect(await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.beehive.discoveryRecords.pollination)))).toEqual(frozen);
    expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook)).toEqual(notebook);
  }
  expect(await colony(page)).toEqual(before);
  expect(await page.evaluate(() => { const p = (window as any).__toolData.beehive.pollinationLab; return { note: p.note, teacher: p.teacher }; })).toEqual({ note: 'Keep flower notes', teacher: { retained: true } });
  await accessible(page);
});

test('keeps named saved readings readable in phone, wide, dark, forced-color and enlarged-text layouts', async ({ page }, testInfo) => {
  test.setTimeout(480000);
  await mount(page); await capture(page);
  await page.locator('[data-pollination-lab]').getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).check(); await compare(page);
  const coach = page.locator('[data-pollination-comparison]');
  const frozen = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
  async function capturePreview(name: string) {
    const height = await coach.evaluate(node => Math.ceil(node.getBoundingClientRect().height));
    const width = page.viewportSize()!.width;
    await page.setViewportSize({ width, height: Math.max(1800, height + 180) });
    await coach.screenshot({ path: testInfo.outputPath('saved-cases-' + name + '.png'), timeout: 120000, animations: 'disabled' });
  }
  for (const width of [320, 640, 980]) {
    await page.setViewportSize({ width, height: 1800 }); await accessible(page);
    const layout = await coach.locator('.bee-pollen-saved-pair').first().evaluate(node => {
      const rects = Array.from(node.children).map(child => child.getBoundingClientRect());
      const container = node.closest('[data-pollination-comparison]')!;
      return { sameRow: Math.abs(rects[0].top - rects[1].top) < 1, width: container.clientWidth, overflow: node.scrollWidth - node.clientWidth };
    });
    expect(layout.sameRow).toBe(layout.width > 368); expect(layout.overflow).toBeLessThanOrEqual(1);
    await capturePreview(String(width));
  }
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await accessible(page); await capturePreview('dark');
  await page.setViewportSize({ width: 320, height: 1800 }); await page.emulateMedia({ forcedColors: 'active' });
  await page.keyboard.press('Tab');
  await coach.getByRole('button', { name: 'Inspect flower controls', exact: false }).focus(); await accessible(page);
  const forced = await coach.evaluate(node => ({
    outputBorder: getComputedStyle(node.querySelector('[data-evidence-kind="output"]')!).borderTopStyle,
    pairBorder: getComputedStyle(node.querySelector('[data-evidence-case="after"]')!).borderTopStyle,
    focus: getComputedStyle(node.querySelector('button')!).outlineStyle
  }));
  expect(forced.outputBorder).toBe('dashed'); expect(forced.pairBorder).toBe('dashed'); expect(forced.focus).not.toBe('none'); await capturePreview('forced-colors');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.setViewportSize({ width: 1280, height: 1800 });
  await coach.evaluate(node => { (node as HTMLElement).style.width = '260px'; (node as HTMLElement).style.maxWidth = '100%'; });
  await accessible(page, false);
  for (const value of await coach.locator('.bee-pollen-saved-case b').all()) {
    const metrics = await value.evaluate(node => ({ font: parseFloat(getComputedStyle(node).fontSize), overflow: node.scrollWidth - node.clientWidth }));
    expect(metrics.font).toBeGreaterThanOrEqual(28); expect(metrics.overflow).toBeLessThanOrEqual(1);
  }
  await capturePreview('large-text');
  expect(await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)))).toEqual(frozen);
});

test('offers case-specific explanation plans without rewriting saved evidence or learner drafts', async ({ page }) => {
  test.setTimeout(480000);
  const notebook = { beekeeper: { claim: 'Keep original claim', evidence: 'Keep earlier evidence', reasoning: 'Keep original reasoning' }, synthesis: 'Keep synthesis', discoveries: { pollination: { explanation: 'Earlier flower explanation', comparison: 'Earlier saved comparison' } } };
  await mount(page, { notebook, pollinationLab: { pollen: true, contact: false, compatible: true, note: 'Keep flower notes', teacher: { retained: true } } }, '11th Grade');
  const before = await colony(page), card = page.locator('[data-beehive-discovery]'), lab = page.locator('[data-pollination-lab]');
  const titles = ['Loose pollen on bee', 'Bee contacts stigma', 'Pollen compatible'];
  const cases = [
    { kind: 'same-case', starting: [1, 0, 1], compared: [1, 0, 1], condition: 'Which three conditions stayed the same', question: 'What can repeating a case tell you?', limit: 'does not test' },
    { kind: 'one-change', starting: [1, 0, 1], compared: [1, 1, 1], condition: 'Which one condition changed?', question: 'two saved pollen-transfer readings', limit: 'fertilization that was not observed' },
    { kind: 'one-change', starting: [1, 1, 0], compared: [1, 1, 1], condition: 'Which one condition changed?', question: 'Did pollen transfer change, or only later possibility?', limit: 'fertilization that was not observed' },
    { kind: 'one-change-null', starting: [0, 0, 1], compared: [0, 1, 1], condition: 'Which one condition changed?', question: 'both output rows even though one condition changed', limit: 'does not show that the changed condition never matters' },
    { kind: 'several-changes', starting: [0, 0, 1], compared: [1, 1, 1], condition: 'Which conditions changed together?', question: 'two saved pollen-transfer readings', limit: 'without assigning the result to only one changed condition' }
  ];
  for (const [index, scenario] of cases.entries()) {
    for (let i = 0; i < titles.length; i++) await lab.getByRole('checkbox', { name: titles[i], exact: true }).setChecked(Boolean(scenario.starting[i]));
    if (index === 0) await capture(page); else await card.getByRole('button', { name: 'Update observation', exact: true }).click();
    for (let i = 0; i < titles.length; i++) await lab.getByRole('checkbox', { name: titles[i], exact: true }).setChecked(Boolean(scenario.compared[i]));
    await compare(page);
    const coach = card.locator('[data-pollination-comparison]'), reflection = coach.locator('[data-pollination-reflection]');
    const details = reflection.locator('details'), summary = reflection.getByText('Use this evidence in your explanation', { exact: true });
    if (await details.evaluate(node => (node as HTMLDetailsElement).open)) await summary.click();
    const draft = 'My unfinished explanation for saved pair ' + (index + 1) + '.';
    const writing = card.getByRole('textbox', { name: 'My flower-case explanation', exact: true });
    await writing.fill(draft);
    const frozen = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.beehive.discoveryRecords.pollination)));
    expect(frozen.comparison.rows).toHaveLength(5);
    for (const row of frozen.comparison.rows) { expect([0, 1]).toContain(row.before); expect([0, 1]).toContain(row.after); }
    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    const plan = reflection.locator('[data-pollination-explanation-plan]');
    await expect(plan).toHaveAttribute('data-pollination-explanation-plan', scenario.kind);
    await expect(plan.locator('[data-explanation-step]')).toHaveCount(3);
    expect(await plan.locator('[data-explanation-step]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-explanation-step')))).toEqual(['conditions', 'readings', 'limit']);
    await expect(plan.locator('h6')).toHaveText(['1Conditions', '2Saved readings', '3Limits']);
    await expect(plan.locator('[data-explanation-step="conditions"]')).toContainText(scenario.condition);
    await expect(plan.locator('[data-explanation-step="' + (scenario.kind === 'same-case' ? 'limit' : 'readings') + '"]')).toContainText(scenario.question);
    await expect(plan.locator('[data-explanation-step="limit"]')).toContainText(scenario.limit);
    await expect(reflection).toContainText('Real pollen deposition, pollen-tube growth and fertilization were not measured.');
    for (const starter of await plan.locator('[data-explanation-starter] q').all()) await expect(starter).toContainText('…');
    for (const [grade, band] of [['2nd Grade', 'K–2'], ['4th Grade', '3–5'], ['7th Grade', '6–8'], ['11th Grade', '9–12']]) {
      await page.evaluate(grade => { const w = window as any; w.__ctx.gradeLevel = grade; w.__rerender(); }, grade);
      await expect(reflection).toHaveAttribute('data-pollination-reflection', band);
      if (band === 'K–2') { await expect(reflection).toContainText('Starting case and Compared case words'); await expect(reflection).not.toContainText('dots'); }
      await expect(plan).toHaveAttribute('data-pollination-explanation-plan', scenario.kind);
      await expect(writing).toHaveValue(draft);
      expect(await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.beehive.discoveryRecords.pollination)))).toEqual(frozen);
      expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook)).toEqual(notebook);
    }
    const displayed = await plan.innerText();
    await summary.click(); await summary.click();
    expect(await plan.innerText()).toBe(displayed);
    await lab.getByRole('checkbox', { name: titles[0], exact: true }).setChecked(!Boolean(scenario.compared[0]));
    expect(await plan.innerText()).toBe(displayed);
    await expect(writing).toHaveValue(draft);
    expect(await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.beehive.discoveryRecords.pollination)))).toEqual(frozen);
    expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook)).toEqual(notebook);
    expect(await colony(page)).toEqual(before);
  }
  expect(await page.evaluate(() => { const p = (window as any).__toolData.beehive.pollinationLab; return { note: p.note, teacher: p.teacher }; })).toEqual({ note: 'Keep flower notes', teacher: { retained: true } });
});

test('keeps expanded explanation plan layouts readable at phone, wide, dark, forced-color and enlarged-text sizes', async ({ page }, testInfo) => {
  test.setTimeout(480000);
  await mount(page, {}, '11th Grade'); await capture(page);
  await page.locator('[data-pollination-lab]').getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).check(); await compare(page);
  const coach = page.locator('[data-pollination-comparison]'), reflection = coach.locator('[data-pollination-reflection]');
  const summary = reflection.getByText('Use this evidence in your explanation', { exact: true });
  const plan = reflection.locator('[data-pollination-explanation-plan]');
  await summary.click(); await expect(plan).toBeVisible();
  const frozen = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
  async function capturePreview(name: string) {
    const height = await reflection.evaluate(node => Math.ceil(node.getBoundingClientRect().height));
    await page.setViewportSize({ width: page.viewportSize()!.width, height: Math.max(1800, height + 180) });
    await reflection.screenshot({ path: testInfo.outputPath('explanation-plan-' + name + '.png'), timeout: 120000, animations: 'disabled' });
  }
  for (const width of [320, 640, 980]) {
    await page.setViewportSize({ width, height: 1800 }); await accessible(page);
    const layout = await plan.evaluate(node => {
      const container = node.closest('[data-pollination-reflection]')!, style = getComputedStyle(container);
      return { columns: getComputedStyle(node).gridTemplateColumns.split(' ').length, width: container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), overflow: node.scrollWidth - node.clientWidth };
    });
    expect(layout.columns).toBe(layout.width >= 576 ? 3 : 1); expect(layout.overflow).toBeLessThanOrEqual(1);
    await capturePreview(String(width));
  }
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await accessible(page); await capturePreview('dark');
  await page.setViewportSize({ width: 320, height: 1800 }); await page.emulateMedia({ forcedColors: 'active' });
  await page.keyboard.press('Tab'); await summary.focus(); await expect(summary).toBeFocused(); await accessible(page);
  const focus = await summary.evaluate(node => ({ style: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth) }));
  expect(focus.style).not.toBe('none'); expect(focus.width).toBeGreaterThan(0); await capturePreview('forced-colors');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.setViewportSize({ width: 1280, height: 1800 });
  await reflection.evaluate(node => { (node as HTMLElement).style.width = '260px'; (node as HTMLElement).style.maxWidth = '100%'; });
  await accessible(page, false);
  expect(await plan.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(1);
  for (const reading of await plan.locator('.bee-pollen-explanation-question, .bee-pollen-explanation-starter q').all()) {
    const metrics = await reading.evaluate(node => ({ font: parseFloat(getComputedStyle(node).fontSize), overflow: node.scrollWidth - node.clientWidth }));
    expect(metrics.font).toBeGreaterThanOrEqual(28); expect(metrics.overflow).toBeLessThanOrEqual(1);
  }
  expect(await reflection.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  await capturePreview('large-text');
  expect(await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)))).toEqual(frozen);
});
