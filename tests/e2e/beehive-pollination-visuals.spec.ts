import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, width: 320, height: 950, layout: 'document' });
test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ viewport: { width: 320, height: 950 }, reducedMotion: 'reduce', hasTouch: true, video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, selected = { pollen: true, contact: true, compatible: false }) {
  await page.addInitScript(() => {
    const w = window as any; w.__RR_TEST_EXPORTS__ = {}; w.__pollenPaint = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text: string, x: number, y: number, maxWidth?: number) {
      if (text === 'Trace a flower visit' || text === 'Pollination · Trace a flower visit') w.__pollenPaint = [];
      const metric = this.measureText(text);
      w.__pollenPaint.push({ text, x, y, maxWidth: maxWidth ?? null, font: this.font, align: this.textAlign,
        width: metric.width, ascent: metric.actualBoundingBoxAscent, descent: metric.actualBoundingBoxDescent });
      return maxWidth == null ? original.call(this, text, x, y) : original.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(selected => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: { ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: 'beekeeper', beeView: 'pollination', discoveryLesson: 'pollination', tutorialDone: true,
      soundOn: false, motionPaused: true, day: 60,
      pollinationLab: { ...selected, note: 'Keep flower notes', teacher: { retained: true } },
      notebook: { beekeeper: { claim: 'Keep claim', evidence: 'Keep earlier evidence', reasoning: 'Keep reasoning' } }
    }, otherTool: { retained: true } }));
    w.__ctx.gradeLevel = '11th Grade'; w.__rerender(); document.getElementById('wrap')!.style.width = '100%';
  }, selected);
  await expect(page.locator('[data-pollination-lab]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__pollenPaint.some((x: any) => x.text.startsWith('Case:')))).toBe(true);
}
async function preserved(page: Page) {
  return page.evaluate(() => {
    const { pollinationLab, ...colony } = (window as any).__toolData.beehive;
    return { colony, notes: { note: pollinationLab.note, teacher: pollinationLab.teacher }, otherTool: (window as any).__toolData.otherTool };
  });
}
async function paint(page: Page) {
  return page.locator('[data-beehive-canvas]').evaluate((canvas: HTMLCanvasElement) => ({
    width: canvas.clientWidth, height: canvas.clientHeight, backingWidth: canvas.width, backingHeight: canvas.height, pixelRatio: Math.min(2, window.devicePixelRatio), labels: (window as any).__pollenPaint,
    background: Array.from(canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data), image: canvas.toDataURL()
  }));
}
async function accessible(page: Page, fullPage = true) {
  const result = await page.evaluate(async () => {
    const node = document.querySelector('[data-pollination-lab]')!;
    const audit = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] }, rules: { region: { enabled: false } } });
    return { violations: audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: node.scrollWidth - node.clientWidth, pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      smallTargets: Array.from(node.querySelectorAll('button,.bee-pollen-choice,summary,a')).filter(n => {
        const r = n.getBoundingClientRect(); return r.height > 0 && (r.height < 44 || r.width < 44);
      }).map(n => n.textContent) };
  });
  expect(result.violations).toEqual([]); expect(result.overflow).toBeLessThanOrEqual(1);
  if (fullPage) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.smallTargets).toEqual([]);
}

test('shows all eight selected cases consistently in illustrations, labels and the paused canvas', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page); const before = await preserved(page), lab = page.locator('[data-pollination-lab]');
  for (const pollen of [false, true]) for (const contact of [false, true]) for (const compatible of [false, true]) {
    await lab.getByRole('checkbox', { name: 'Loose pollen on bee', exact: true }).setChecked(pollen);
    await lab.getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).setChecked(contact);
    await lab.getByRole('checkbox', { name: 'Pollen compatible', exact: true }).setChecked(compatible);
    const transferred = pollen && contact, possible = transferred && compatible;
    await expect(lab.locator('[data-pollination-art="bee"] [data-pollen-grain]')).toHaveCount(pollen ? 4 : 0);
    await expect(lab.locator('[data-pollination-art="flower"] [data-pollen-grain]')).toHaveCount(transferred ? 3 : 0);
    await expect(lab.locator('[data-pollination-step="carried"]')).toHaveAttribute('data-step-state', pollen ? 'present' : 'absent');
    await expect(lab.locator('[data-pollination-step="deposited"]')).toHaveAttribute('data-step-state', transferred ? 'shown' : 'not-shown');
    await expect(lab.locator('[data-pollination-step="later"]')).toHaveAttribute('data-step-state', 'not-observed');
    await expect(lab.locator('[data-pollination-step="later"] .bee-pollen-state')).toHaveText('Not observed');
    const canvas = page.locator('[data-beehive-canvas]');
    await expect(canvas).toHaveAttribute('aria-label', new RegExp(transferred ? 'Pollen transfer shown' : 'No pollen transfer shown'));
    await expect.poll(async () => (await paint(page)).labels.map((x: any) => x.text).join(' ')).toContain('Case: ' + (transferred ? 'Pollen transfer shown' : 'No pollen transfer shown'));
    await expect.poll(async () => (await paint(page)).labels.map((x: any) => x.text).join(' ')).toContain(possible ? 'Possible, not predicted' : transferred ? 'Compatibility limits it' : 'No pollen deposited');
    expect((await paint(page)).labels.map((x: any) => x.text).join(' ')).toContain('Not observed');
    await expect(canvas).toHaveAttribute('aria-label', new RegExp(possible ? 'not observed here' : transferred ? 'incompatible' : 'no pollen for the next step'));
  }
  expect(await preserved(page)).toEqual(before); await accessible(page); expect(errors).toEqual([]);
});

test('wraps readable canvas labels in compact rows and repaints resize and theme changes while paused', async ({ page }, testInfo) => {
  await mount(page); const before = await preserved(page), lab = page.locator('[data-pollination-lab]'), canvas = page.locator('[data-beehive-canvas]');
  for (const width of [320, 390, 640, 720, 980, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(async () => { const p = await paint(page); return p.backingWidth === Math.round(p.width * p.pixelRatio); }).toBe(true);
    expect((await paint(page)).width).toBeGreaterThan(200); expect((await paint(page)).width).toBeLessThanOrEqual(width);
    await expect.poll(async () => {
      const p = await paint(page), titles = p.labels.filter((x: any) => /^[123] ·/.test(x.text));
      return titles.length === 3 && (p.width < 640 ? titles[0].y < titles[1].y && titles[1].y < titles[2].y : titles.every((x: any) => x.y === titles[0].y));
    }).toBe(true);
    const p = await paint(page);
    for (const label of p.labels) {
      expect(label.maxWidth).toBeNull(); expect(parseFloat(label.font.match(/([\d.]+)px/)[1])).toBeGreaterThanOrEqual(12);
      const left = label.align === 'center' ? label.x - label.width / 2 : label.x;
      expect(left).toBeGreaterThanOrEqual(8); expect(left + label.width).toBeLessThanOrEqual(p.width - 8);
      expect(label.y + label.descent).toBeLessThan(p.height - 8);
    }
    const overlaps = await canvas.evaluate((node: HTMLCanvasElement) => {
      const title = (window as any).__pollenPaint.find((x: any) => x.text === 'Trace a flower visit');
      const box = node.getBoundingClientRect(), left = box.left + title.x - title.width / 2;
      const right = left + title.width, top = box.top + title.y - title.ascent, bottom = box.top + title.y + title.descent;
      return Array.from(document.querySelectorAll('[data-beehive-stage-controls] button')).filter(button => {
        const r = button.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && left < r.right && right > r.left && top < r.bottom && bottom > r.top;
      }).map(button => button.textContent || button.getAttribute('aria-label'));
    });
    expect(overlaps).toEqual([]);
    const obscuredNotes = await canvas.evaluate((node: HTMLCanvasElement) => {
      const badge = document.querySelector('[data-beehive-beekeeper-paused-overlay] > div');
      if (!badge) throw new Error('Expected the paused motion badge');
      const r = badge.getBoundingClientRect(), box = node.getBoundingClientRect();
      return (window as any).__pollenPaint.filter((label: any) => {
        const left = box.left + label.x - (label.align === 'center' ? label.width / 2 : 0);
        const right = left + label.width, top = box.top + label.y - label.ascent, bottom = box.top + label.y + label.descent;
        return r.width > 0 && r.height > 0 && left < r.right && right > r.left && top < r.bottom && bottom > r.top;
      }).map((label: any) => label.text);
    });
    expect(obscuredNotes).toEqual([]);
    await accessible(page);
    if (width === 320 || width === 640 || width === 720 || width === 1280) {
      await canvas.screenshot({ path: testInfo.outputPath('flower-canvas-' + width + '-light.png') });
      await lab.screenshot({ path: testInfo.outputPath('flower-activity-' + width + '-light.png') });
    }
  }
  const light = await paint(page); expect(light.background).toEqual([238, 242, 231, 255]);
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect.poll(async () => (await paint(page)).background).toEqual([34, 57, 47, 255]);
  expect((await paint(page)).image).not.toBe(light.image); await accessible(page);
  await canvas.screenshot({ path: testInfo.outputPath('flower-canvas-wide-dark.png') });
  await lab.screenshot({ path: testInfo.outputPath('flower-activity-wide-dark.png') });
  await page.setViewportSize({ width: 320, height: 1000 });
  await expect.poll(async () => (await paint(page)).width).toBeLessThan(640); await accessible(page);
  await canvas.screenshot({ path: testInfo.outputPath('flower-canvas-320-dark.png') });
  await lab.screenshot({ path: testInfo.outputPath('flower-activity-320-dark.png') });
  expect(await preserved(page)).toEqual(before);
});

test('retains diagram meaning and keyboard focus in forced colors at 320 pixels', async ({ page }, testInfo) => {
  await mount(page); const before = await preserved(page), lab = page.locator('[data-pollination-lab]');
  await page.emulateMedia({ forcedColors: 'active' });
  await lab.getByRole('checkbox', { name: 'Pollen compatible', exact: true }).focus(); await page.keyboard.press('Space');
  await expect(lab.getByRole('checkbox', { name: 'Pollen compatible', exact: true })).toBeFocused();
  await expect(lab.locator('output')).toContainText('Next step possible');
  await expect(lab.locator('[data-pollination-step="later"]')).toContainText('Fertilization is not observed');
  expect(await lab.locator('[data-pollination-step="later"]').evaluate(n => getComputedStyle(n).borderTopStyle)).toBe('dashed');
  for (const picture of await lab.locator('[data-pollination-art]').all()) {
    expect(await picture.locator('path[stroke]:not([stroke="none"])').first().evaluate(n => getComputedStyle(n).stroke)).not.toBe('none');
  }
  await accessible(page); await lab.screenshot({ path: testInfo.outputPath('flower-activity-forced-colors.png') });
  expect(await preserved(page)).toEqual(before);
});

test('keeps illustrated state labels and diagram keys readable at doubled text in a narrow desktop card', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); await mount(page); const before = await preserved(page), lab = page.locator('[data-pollination-lab]');
  await lab.evaluate(node => { (node as HTMLElement).style.width = '340px'; (node as HTMLElement).style.maxWidth = '100%'; document.documentElement.style.fontSize = '32px'; });
  expect(await lab.locator('.bee-pollen-path').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(1);
  for (const state of await lab.locator('.bee-pollen-state').all()) expect(await state.evaluate(n => parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(24);
  await expect(lab.getByLabel('Diagram key')).toContainText('Round · stigma');
  await expect(lab.getByLabel('Diagram key')).toContainText('Rectangles · anthers');
  await accessible(page, false); await lab.screenshot({ path: testInfo.outputPath('flower-activity-large-text.png') });
  expect(await preserved(page)).toEqual(before);
});


test('keeps the complete pollination diagram upright and scrollable in short landscape fullscreen', async ({ page }, testInfo) => {
  await mount(page); const before = await preserved(page), stage = page.locator('[data-beehive-stage="beekeeper"]'), canvas = page.locator('[data-beehive-canvas]');
  await page.setViewportSize({ width: 980, height: 280 });
  // The harness supplies the native fullscreen wrapper used by this control.
  await page.evaluate(() => { (window as any).__alloStemFS = (element: HTMLElement) => element.requestFullscreen(); });
  await page.getByRole('button', { name: 'Toggle fullscreen canvas', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('beehive-canvas-wrap');
  await testInfo.attach('fullscreen-metrics', { body: JSON.stringify(await canvas.evaluate((node: HTMLCanvasElement) => {
    const stage = node.parentElement!;
    return { canvasHeight: node.clientHeight, backingHeight: node.height, canvasCSS: getComputedStyle(node).height, canvasStyle: node.getAttribute('style'), parentHeight: stage.clientHeight, parentCSS: getComputedStyle(stage).overflow, fullscreen: stage.matches(':fullscreen'), view: stage.getAttribute('data-science-view'), innerHeight, styles: Array.from(document.querySelectorAll('style')).filter(s => s.textContent?.includes('height:max(100vh,430px)')).map(s => s.textContent?.slice(0, 120)) };
  })), contentType: 'application/json' });
  await expect.poll(async () => { const p = await paint(page); return p.height === 430 && p.backingHeight === Math.round(p.height * p.pixelRatio); }).toBe(true);
  const dimensions = await stage.evaluate(node => ({ height: node.clientHeight, content: node.scrollHeight, overflow: getComputedStyle(node).overflowY }));
  expect(dimensions.height).toBeLessThanOrEqual(280); expect(dimensions.height).toBeGreaterThan(260); expect(dimensions.content).toBeGreaterThan(dimensions.height); expect(dimensions.overflow).toBe('auto');
  const obscured = await canvas.evaluate((node: HTMLCanvasElement) => {
    const r = document.querySelector('[data-beehive-beekeeper-paused-overlay] > div')!.getBoundingClientRect(), box = node.getBoundingClientRect();
    return (window as any).__pollenPaint.filter((label: any) => {
      const left = box.left + label.x - (label.align === 'center' ? label.width / 2 : 0), right = left + label.width;
      return left < r.right && right > r.left && box.top + label.y - label.ascent < r.bottom && box.top + label.y + label.descent > r.top;
    }).map((label: any) => label.text);
  });
  expect(obscured).toEqual([]);
  await stage.screenshot({ path: testInfo.outputPath('flower-fullscreen-landscape-top.png') });
  await stage.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await stage.screenshot({ path: testInfo.outputPath('flower-fullscreen-landscape-bottom.png') });
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await page.setViewportSize({ width: 980, height: 1000 });
  await expect.poll(async () => { const p = await paint(page); return p.backingHeight === Math.round(p.height * p.pixelRatio); }).toBe(true);
  expect(await preserved(page)).toEqual(before); await accessible(page);
});


test('explains both checkpoints for all eight cases without changing saved writing or colony state', async ({ page }) => {
  await mount(page); const before = await preserved(page), lab = page.locator('[data-pollination-lab]');
  const guide = lab.locator('[data-pollination-checkpoints]'), summary = guide.locator('summary');
  await expect(guide).not.toHaveAttribute('open', '');
  await summary.focus(); await page.keyboard.press('Enter'); await expect(guide).toHaveAttribute('open', '');
  for (const pollen of [false, true]) for (const contact of [false, true]) for (const compatible of [false, true]) {
    await lab.getByRole('checkbox', { name: 'Loose pollen on bee', exact: true }).setChecked(pollen);
    await lab.getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).setChecked(contact);
    await lab.getByRole('checkbox', { name: 'Pollen compatible', exact: true }).setChecked(compatible);
    const deposition = guide.locator('[data-pollination-checkpoint="deposition"]'), later = guide.locator('[data-pollination-checkpoint="later"]');
    const transferred = pollen && contact, possible = transferred && compatible;
    await expect(deposition.locator('[data-checkpoint-input="pollen"]')).toHaveAttribute('data-met', String(pollen));
    await expect(deposition.locator('[data-checkpoint-input="pollen"] dd')).toContainText(pollen ? 'Present' : 'Absent');
    await expect(deposition.locator('[data-checkpoint-input="contact"] dd')).toContainText(contact ? 'Made' : 'Missed');
    await expect(deposition.locator('[data-checkpoint-outcome]')).toHaveAttribute('data-checkpoint-outcome', transferred ? 'shown' : 'not-shown');
    await expect(later.locator('[data-checkpoint-input="deposition"]')).toHaveAttribute('data-met', String(transferred));
    await expect(later.locator('[data-checkpoint-input="compatible"] dd')).toContainText(compatible ? 'Yes' : 'No');
    await expect(later.locator('[data-checkpoint-outcome]')).toHaveAttribute('data-checkpoint-outcome', possible ? 'possible' : transferred ? 'limited' : 'no-deposition');
    const reading = await page.evaluate(() => { const w = window as any; return w.__RR_TEST_EXPORTS__.beehive.bhPollinationReading(w.__toolData.beehive.pollinationLab); });
    await expect(deposition.locator('[data-checkpoint-outcome] span')).toHaveText(reading.reason);
    await expect(later.locator('[data-checkpoint-outcome] span')).toHaveText(reading.next);
    await expect(guide.locator('[data-checkpoint-observation-limit]')).toHaveText('Fertilization is not observed.No seed or fruit result is predicted.');
    if (possible) await expect(later.locator('[data-checkpoint-outcome] strong')).toHaveText('Fertilization possible later · not observed');
    if (!transferred) await expect(later.locator('[data-checkpoint-outcome] strong')).toHaveText('No pollen deposited for the next step');
    await expect(guide).toHaveAttribute('open', '');
  }
  expect(await preserved(page)).toEqual(before);
  await summary.focus(); await page.keyboard.press('Enter'); await expect(guide).not.toHaveAttribute('open', '');
  expect(await preserved(page)).toEqual(before);
});

test('keeps the checkpoint explanation readable in narrow, dark, forced-color and enlarged-text layouts', async ({ page }, testInfo) => {
  await mount(page); const before = await preserved(page), lab = page.locator('[data-pollination-lab]'), guide = lab.locator('[data-pollination-checkpoints]');
  await guide.locator('summary').click();
  for (const width of [320, 640, 1280]) {
    await page.setViewportSize({ width, height: 1600 }); await accessible(page);
    const layout = await guide.locator('.bee-pollen-check-grid').evaluate(node => {
      const children = Array.from(node.children).map(child => child.getBoundingClientRect());
      return { sameRow: children[0].top === children[1].top, labWidth: document.querySelector('[data-pollination-lab]')!.clientWidth - 32 };
    });
    expect(layout.sameRow).toBe(layout.labWidth >= 608);
    await guide.screenshot({ path: testInfo.outputPath('checkpoint-' + width + '-light.png') });
  }
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(guide).toHaveAttribute('open', ''); await accessible(page);
  await guide.screenshot({ path: testInfo.outputPath('checkpoint-wide-dark.png') });
  await page.setViewportSize({ width: 320, height: 1600 });
  await page.emulateMedia({ forcedColors: 'active' }); await page.keyboard.press('Tab'); await guide.locator('summary').focus(); await accessible(page);
  const forced = await guide.evaluate(node => ({
    laterStyle: getComputedStyle(node.querySelector('[data-pollination-checkpoint="later"]')!).borderTopStyle,
    focusStyle: getComputedStyle(node.querySelector('summary')!).outlineStyle,
    summaryBefore: getComputedStyle(node.querySelector('summary')!, '::before').content
  }));
  expect(forced.laterStyle).toBe('dashed'); expect(forced.focusStyle).not.toBe('none');
  expect(forced.summaryBefore).toBe('none');
  await guide.screenshot({ path: testInfo.outputPath('checkpoint-forced-colors.png') });
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; document.getElementById('wrap')!.style.width = '340px'; });
  await page.setViewportSize({ width: 1100, height: 1000 }); await accessible(page, false);
  const large = await guide.evaluate(node => ({ width: node.clientWidth, content: node.scrollWidth, font: parseFloat(getComputedStyle(node.querySelector('h5')!).fontSize) }));
  expect(large.content - large.width).toBeLessThanOrEqual(1); expect(large.font).toBeGreaterThanOrEqual(32);
  const guideHeight = await guide.evaluate(node => Math.ceil(node.getBoundingClientRect().height));
  await page.setViewportSize({ width: 1100, height: Math.max(1000, guideHeight + 180) });
  await guide.screenshot({ path: testInfo.outputPath('checkpoint-large-text.png') });
  expect(await preserved(page)).toEqual(before);
});


test('connects each flower-case control to the diagram without implying one control per stage', async ({ page }) => {
  await mount(page, { pollen: false, contact: false, compatible: false });
  const lab = page.locator('[data-pollination-lab]'), before = await preserved(page);
  const routes = [
    { key: 'pollen', title: 'Loose pollen on bee', route: 'Trace on bee + stigma' },
    { key: 'contact', title: 'Bee contacts stigma', route: 'Trace at stigma' },
    { key: 'compatible', title: 'Pollen compatible', route: 'Later possibility only' }
  ];
  for (const route of routes) {
    const input = lab.getByRole('checkbox', { name: route.title, exact: true });
    await expect(input).toHaveAccessibleName(route.title);
    await expect(input).toHaveAccessibleDescription(new RegExp(route.route.split('+').join('[+]')));
    await expect(input).toHaveAttribute('aria-describedby', 'bee-pollen-' + route.key + '-help bee-pollen-' + route.key + '-route');
    await expect(lab.locator('#bee-pollen-' + route.key + '-route')).toHaveText(route.route);
  }
  const carried = lab.locator('[data-pollination-step="carried"]'), deposited = lab.locator('[data-pollination-step="deposited"]'), later = lab.locator('[data-pollination-step="later"]');
  await expect(carried.locator('[data-pollination-inputs]')).toHaveAttribute('data-pollination-inputs', 'pollen');
  await expect(deposited.locator('[data-pollination-inputs]')).toHaveAttribute('data-pollination-inputs', 'pollen,contact');
  await expect(deposited.locator('.bee-pollen-step-links')).toContainText('Needs both:');
  await expect(later.locator('.bee-pollen-step-links')).toContainText('After deposition:');
  await expect(later.locator('[data-pollination-inputs]')).toHaveAttribute('data-pollination-inputs', 'compatible');
  await expect(lab.locator('.bee-pollen-cue svg:not([aria-hidden="true"])')).toHaveCount(0);
  for (const route of routes) {
    const input = lab.getByRole('checkbox', { name: route.title, exact: true });
    await input.focus(); await page.keyboard.press('Space'); await expect(input).toBeChecked();
    const outline = await input.locator('..').evaluate(node => getComputedStyle(node).outlineStyle);
    expect(outline).not.toBe('none');
  }
  await expect(deposited).toHaveAttribute('data-step-state', 'shown');
  await expect(later).toHaveAttribute('data-step-state', 'not-observed');
  await expect(lab.getByRole('checkbox', { name: 'Pollen compatible', exact: true })).toHaveAccessibleDescription(/Later possibility only/);
  expect(await preserved(page)).toEqual(before); await accessible(page);
  await lab.getByRole('button', { name: 'Reset flower case', exact: true }).click();
  expect(await preserved(page)).toEqual(before);
});

test('keeps control and diagram cues readable across phone, dark, forced-color and enlarged-text layouts', async ({ page }, testInfo) => {
  test.setTimeout(480000);
  await mount(page); const before = await preserved(page), lab = page.locator('[data-pollination-lab]');
  const controls = lab.locator('.bee-pollen-controls'), path = lab.locator('.bee-pollen-path');
  async function capture(name: string) {
    const height = await lab.evaluate(node => Math.ceil(node.getBoundingClientRect().height));
    const width = page.viewportSize()!.width;
    await page.setViewportSize({ width, height: Math.max(1600, height + 180) });
    await controls.screenshot({ path: testInfo.outputPath('routing-controls-' + name + '.png'), timeout: 120000, animations: 'disabled' });
    await path.screenshot({ path: testInfo.outputPath('routing-path-' + name + '.png'), timeout: 120000, animations: 'disabled' });
    if (name === '1280') await lab.screenshot({ path: testInfo.outputPath('routing-activity-wide.png'), timeout: 120000, animations: 'disabled' });
  }
  for (const width of [320, 640, 980, 1280]) {
    await page.setViewportSize({ width, height: 1600 }); await accessible(page);
    const cues = await lab.locator('.bee-pollen-cue').evaluateAll(nodes => nodes.map(node => ({
      width: node.clientWidth, content: node.scrollWidth, icon: node.querySelector('svg')!.getBoundingClientRect().width,
      parentWidth: node.parentElement!.clientWidth
    })));
    expect(cues.every(cue => cue.content - cue.width <= 1 && cue.icon <= 20 && cue.width <= cue.parentWidth)).toBe(true);
    await capture(String(width));
  }
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await accessible(page); await capture('dark');
  await page.setViewportSize({ width: 320, height: 1800 }); await page.emulateMedia({ forcedColors: 'active' });
  await lab.getByRole('checkbox', { name: 'Pollen compatible', exact: true }).focus(); await accessible(page);
  const forced = await lab.locator('#bee-pollen-compatible-route').evaluate(node => ({
    border: getComputedStyle(node).borderTopStyle,
    focus: getComputedStyle(node.closest('label')!).outlineStyle
  }));
  expect(forced.border).toBe('dashed'); expect(forced.focus).not.toBe('none'); await capture('forced-colors');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.setViewportSize({ width: 1100, height: 1800 });
  await lab.evaluate(node => { (node as HTMLElement).style.width = '340px'; (node as HTMLElement).style.maxWidth = '100%'; });
  await accessible(page, false);
  for (const cue of await lab.locator('.bee-pollen-cue').all()) {
    const metrics = await cue.evaluate(node => ({ width: node.clientWidth, content: node.scrollWidth, font: parseFloat(getComputedStyle(node).fontSize) }));
    expect(metrics.content - metrics.width).toBeLessThanOrEqual(1); expect(metrics.font).toBeGreaterThanOrEqual(24);
  }
  await capture('large-text'); expect(await preserved(page)).toEqual(before);
});

test('suggests one condition to change while holding two fixed without applying or saving the proposed case', async ({ page }) => {
  await mount(page, { pollen: false, contact: false, compatible: false });
  const lab = page.locator('[data-pollination-lab]'), before = await preserved(page);
  const plan = lab.locator('[data-pollination-comparison-plan]');
  const titles = { pollen: 'Loose pollen on bee', contact: 'Bee contacts stigma', compatible: 'Pollen compatible' };
  function value(key: string, yes: boolean) { return key === 'pollen' ? (yes ? 'Present' : 'Absent') : key === 'contact' ? (yes ? 'Made' : 'Missed') : (yes ? 'Yes' : 'No'); }
  for (const pollen of [false, true]) for (const contact of [false, true]) for (const compatible of [false, true]) {
    const flags = { pollen, contact, compatible };
    for (const key of ['pollen', 'contact', 'compatible'] as const) await lab.getByRole('checkbox', { name: titles[key], exact: true }).setChecked(flags[key]);
    const change = !pollen ? 'pollen' : !contact ? 'contact' : 'compatible';
    await expect(plan).toHaveAttribute('data-pollination-comparison-plan', change);
    await expect(plan.locator('#bee-pollen-plan-target')).toHaveText('Change only: ' + titles[change]);
    await expect(plan.locator('[data-current-value]')).toHaveAttribute('data-current-value', String(flags[change]));
    await expect(plan.locator('[data-current-value] dd')).toHaveText(value(change, flags[change]));
    await expect(plan.locator('[data-proposed-value]')).toHaveAttribute('data-proposed-value', String(!flags[change]));
    await expect(plan.locator('[data-proposed-value] dd')).toHaveText(value(change, !flags[change]));
    await expect(plan.locator('[data-held-condition]')).toHaveCount(2);
    for (const key of ['pollen', 'contact', 'compatible'] as const) if (key !== change) {
      const held = plan.locator('[data-held-condition="' + key + '"]');
      await expect(held).toHaveAttribute('data-held-value', String(flags[key]));
      await expect(held.locator('dt')).toHaveText(titles[key]);
      await expect(held.locator('dd')).toHaveText(value(key, flags[key]));
    }
    await expect(plan).toContainText('Suggested values · not applied');
    await expect(plan).toContainText('Save a starting case in the discovery workspace before changing the control.');
    await expect(plan).toContainText('After one change, compare with your saved starting case before trying another suggestion.');
    const shortcut = plan.getByRole('button', { name: 'Find this control', exact: true });
    await expect(shortcut).toHaveAttribute('aria-controls', 'bee-pollen-' + change);
    await expect(shortcut).toHaveAccessibleDescription('Change only: ' + titles[change]);
    const savedBefore = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
    await shortcut.click();
    await expect(lab.getByRole('checkbox', { name: titles[change], exact: true })).toBeFocused();
    expect(await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)))).toEqual(savedBefore);
  }
  expect(await preserved(page)).toEqual(before); await accessible(page);
});

test('keeps the comparison suggestion readable across phone, dark, forced-color and enlarged-text layouts', async ({ page }, testInfo) => {
  test.setTimeout(480000);
  await mount(page); const before = await preserved(page), lab = page.locator('[data-pollination-lab]');
  const plan = lab.locator('[data-pollination-comparison-plan]');
  async function capture(name: string) {
    const height = await lab.evaluate(node => Math.ceil(node.getBoundingClientRect().height));
    const width = page.viewportSize()!.width;
    await page.setViewportSize({ width, height: Math.max(1600, height + 180) });
    await plan.screenshot({ path: testInfo.outputPath('comparison-plan-' + name + '.png'), timeout: 120000, animations: 'disabled' });
    if (name === '1280') await lab.screenshot({ path: testInfo.outputPath('comparison-activity-wide.png'), timeout: 120000, animations: 'disabled' });
  }
  for (const width of [320, 640, 1280]) {
    await page.setViewportSize({ width, height: 1600 }); await accessible(page);
    const layout = await plan.evaluate(node => {
      const main = node.querySelector('.bee-pollen-plan-main')!, pair = node.querySelector('.bee-pollen-plan-pair')!;
      const mainRect = main.getBoundingClientRect(), mainChildren = Array.from(main.children).map(child => child.getBoundingClientRect());
      const pairChildren = Array.from(pair.children).map(child => child.getBoundingClientRect());
      const container = node.closest('[data-pollination-lab]')!;
      const style = getComputedStyle(container), content = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      return { mainRow: Math.abs(mainChildren[0].top - mainChildren[1].top) < 1, verticalPair: pairChildren[0].bottom <= pairChildren[2].top, content, width: node.clientWidth, scroll: node.scrollWidth, mainWidth: mainRect.width };
    });
    expect(layout.mainRow).toBe(layout.content >= 608);
    expect(layout.verticalPair).toBe(layout.content <= 368);
    expect(layout.scroll - layout.width).toBeLessThanOrEqual(1);
    await capture(String(width));
  }
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await accessible(page); await capture('dark');
  await page.setViewportSize({ width: 320, height: 1800 }); await page.emulateMedia({ forcedColors: 'active' });
  const button = plan.getByRole('button', { name: 'Find this control', exact: true });
  await button.focus(); await accessible(page);
  const forced = await plan.evaluate(node => ({
    proposedBorder: getComputedStyle(node.querySelector('[data-proposed-value]')!).borderTopStyle,
    buttonFocus: getComputedStyle(node.querySelector('button')!).outlineStyle
  }));
  expect(forced.proposedBorder).toBe('dashed'); expect(forced.buttonFocus).not.toBe('none'); await capture('forced-colors');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.setViewportSize({ width: 1100, height: 1800 });
  await lab.evaluate(node => { (node as HTMLElement).style.width = '340px'; (node as HTMLElement).style.maxWidth = '100%'; });
  await accessible(page, false);
  const large = await plan.evaluate(node => ({
    width: node.clientWidth, content: node.scrollWidth,
    valueFonts: Array.from(node.querySelectorAll('.bee-pollen-plan-value dd')).map(value => parseFloat(getComputedStyle(value).fontSize)),
    headingFont: parseFloat(getComputedStyle(node.querySelector('h6')!).fontSize)
  }));
  expect(large.content - large.width).toBeLessThanOrEqual(1);
  expect(large.valueFonts.every(font => font >= 28)).toBe(true); expect(large.headingFont).toBeGreaterThanOrEqual(28);
  await capture('large-text'); expect(await preserved(page)).toEqual(before);
});
