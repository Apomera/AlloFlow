import { test, expect, type Locator, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';

// Exercise the real component and renderer with local assets and the app CSS.
// The existing GL harness owns the shared React/Three bootstrap.
test.use({ video: 'off' });

const root = process.cwd();
const source = readFileSync(resolve(root, 'tests/e2e/19-geosandbox-gl.spec.ts'), 'utf8');
const match = source.match(/const HARNESS = `([\s\S]*?)`;\r?\n/);
if (!match) throw new Error('Geometry Sandbox GL harness was not found');
const css = readdirSync(resolve(root, 'app/static/css')).find(name => /^main\..*\.css$/.test(name));
if (!css) throw new Error('Compiled application CSS was not found');
const html = match[1].replace('<script src="/prim3d_module.js"></script>', '<script src="/vendor/three-r128/OrbitControls.js"></script><script src="/prim3d_module.js"></script>').replace('</head>',
  '<link rel="stylesheet" href="/app/static/css/' + css + '">' +
  '<style>body{font-family:system-ui,sans-serif}#wrap{width:100%;height:auto;min-height:100vh;display:block}#allo-geo-sandbox{width:100%}</style></head>');
const mime: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

let server: Server;
let base: string;

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
      return;
    }
    const file = resolve(root, '.' + decodeURIComponent(pathname));
    if (!file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Local harness did not start');
  base = 'http://127.0.0.1:' + address.port;
});

test.afterAll(async () => {
  if (server) await new Promise<void>(done => server.close(() => done()));
});

const construction = {
  objects: [{ id: 1, type: 'prism', position: [-1.5, 0.2, -2], u: [3, 0, 0], v: [0, 2, 0], w: [0, 0, 4] }],
  selection: 1,
};

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await page.goto(base + '/');
  await page.evaluate(bucket => (window as any).__mount(bucket), state);
  await page.waitForFunction(() => !!(window as any)._geoScene);
}

async function state(page: Page) {
  return page.evaluate(() => (window as any).__toolData.geoSandbox);
}

function workspaceTabs(page: Page) {
  return page.getByRole('tablist', { name: 'Workspace panels', exact: true });
}

async function controlledPanel(page: Page, tab: Locator) {
  const id = await tab.getAttribute('aria-controls');
  expect(id, 'Every workspace tab must identify its panel').toBeTruthy();
  return page.locator('[id="' + id + '"]');
}

test('free building and lesson navigation preserve the model and earned progress', async ({ page }) => {
  await mount(page, { mode: 'single', construction, missionsSolved: ['seg', 'rect'] });
  const free = page.getByRole('button', { name: 'Free build', exact: true });
  const lessons = page.getByRole('button', { name: 'Lesson sequence', exact: true });
  await expect(free).toHaveAttribute('aria-pressed', 'true');
  await lessons.click();
  await expect(lessons).toHaveAttribute('aria-pressed', 'true');
  await expect(free).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('tab', { name: /Stretch mode/ })).toHaveAttribute('aria-selected', 'true');

  const lesson = page.getByRole('combobox', { name: 'Choose a lesson', exact: true });
  await expect(lesson).toBeVisible();
  const ids = await lesson.locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
  expect(ids.length).toBeGreaterThan(2);
  await lesson.selectOption(ids[1]);
  await page.getByRole('button', { name: 'Next lesson', exact: true }).click();
  await expect(lesson).toHaveValue(ids[2]);
  await page.getByRole('button', { name: 'Previous lesson', exact: true }).click();
  await expect(lesson).toHaveValue(ids[1]);

  await free.click();
  await expect(free).toHaveAttribute('aria-pressed', 'true');
  expect((await state(page)).construction).toEqual(construction);
  expect((await state(page)).missionsSolved).toEqual(expect.arrayContaining(['seg', 'rect']));
  await lessons.click();
  await expect(lesson).toHaveValue(ids[1]);
  expect((await state(page)).construction).toEqual(construction);
});

test('workspace panels retain their DOM and support keyboard tab navigation', async ({ page }) => {
  await mount(page, { mode: 'stretch', construction });
  const tabs = workspaceTabs(page);
  const build = tabs.getByRole('tab', { name: 'Build', exact: true });
  const learn = tabs.getByRole('tab', { name: 'Learn', exact: true });
  const settings = tabs.getByRole('tab', { name: 'Settings', exact: true });
  await build.click();
  const buildPanel = await controlledPanel(page, build);
  const retainedBuild = await buildPanel.elementHandle();
  await expect(buildPanel).toBeVisible();

  await build.focus();
  await page.keyboard.press('ArrowRight');
  await expect(learn).toBeFocused();
  await expect(learn).toHaveAttribute('aria-selected', 'true');
  await expect(buildPanel).toBeHidden();
  await expect(await controlledPanel(page, learn)).toBeVisible();
  await page.keyboard.press('End');
  await expect(settings).toBeFocused();
  await expect(settings).toHaveAttribute('aria-selected', 'true');
  await expect(await controlledPanel(page, settings)).toBeVisible();
  expect(await retainedBuild!.evaluate(element => element.isConnected)).toBe(true);

  await page.keyboard.press('Home');
  await expect(build).toBeFocused();
  await expect(build).toHaveAttribute('aria-selected', 'true');
  await expect(buildPanel).toBeVisible();
  expect(await retainedBuild!.evaluate(element => element === document.getElementById(element.id))).toBe(true);
  expect((await state(page)).construction).toEqual(construction);
});

test('display preferences persist through panel changes and reopening the sandbox', async ({ page }) => {
  await mount(page, { mode: 'stretch', construction });
  const settings = () => workspaceTabs(page).getByRole('tab', { name: 'Settings', exact: true });
  await settings().click();
  const background = page.getByRole('combobox', { name: 'Canvas background', exact: true });
  await background.selectOption('paper');
  const preferences: Record<string, boolean> = {};
  for (const name of ['Show grid', 'Show measurements on canvas', 'Show navigation hints', 'Rotate automatically']) {
    const checkbox = page.getByRole('checkbox', { name, exact: true });
    preferences[name] = !(await checkbox.isChecked());
    await checkbox.setChecked(preferences[name]);
  }
  await workspaceTabs(page).getByRole('tab', { name: 'Build', exact: true }).click();
  await page.getByRole('button', { name: 'Lesson sequence', exact: true }).click();
  await page.getByRole('button', { name: 'Free build', exact: true }).click();
  await settings().click();
  await expect(background).toHaveValue('paper');
  for (const [name, checked] of Object.entries(preferences)) {
    await expect(page.getByRole('checkbox', { name, exact: true })).toBeChecked({ checked });
  }

  const saved = await state(page);
  await mount(page, saved);
  await settings().click();
  await expect(background).toHaveValue('paper');
  for (const [name, checked] of Object.entries(preferences)) {
    await expect(page.getByRole('checkbox', { name, exact: true })).toBeChecked({ checked });
  }
  expect((await state(page)).construction).toEqual(construction);
});

test('mobile navigation stays within the viewport and focus view restores the sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page, { mode: 'stretch', construction });
  const sidebar = page.locator('#geo-control-sidebar');
  const canvas = page.locator('#geo-viewport-shell');
  await expect(sidebar).toBeVisible();
  const canvasBounds = await canvas.boundingBox();
  const sidebarBounds = await sidebar.boundingBox();
  expect(canvasBounds!.y).toBeLessThan(sidebarBounds!.y);

  for (const name of ['Build', 'Learn', 'Settings']) {
    await workspaceTabs(page).getByRole('tab', { name, exact: true }).click();
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    }));
    expect(overflow.content, name + ' panel should fit a phone').toBeLessThanOrEqual(overflow.width + 1);
  }

  const focus = page.getByRole('button', { name: 'Focus view', exact: true });
  await focus.click();
  await expect(sidebar).toBeHidden();
  await expect(canvas).toBeVisible();
  await expect(focus).toHaveAttribute('aria-pressed', 'true');
  await focus.click();
  await expect(sidebar).toBeVisible();
  await expect(focus).toHaveAttribute('aria-pressed', 'false');
  await expect(workspaceTabs(page).getByRole('tab', { name: 'Settings', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect((await state(page)).construction).toEqual(construction);
});

test('lesson credit starts on entering a lesson and only checks the selected task', async ({ page }) => {
  const matching = {
    objects: [
      { id: 1, type: 'segment', position: [0, 0, 0], vector: [5, 0, 0] },
      { id: 2, type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 4, 0] },
    ],
    selection: 2,
  };
  await mount(page, { mode: 'stretch', workspacePath: 'free', construction: matching, missionsSolved: [] });
  await workspaceTabs(page).getByRole('tab', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Show grid', exact: true }).uncheck();
  expect((await state(page)).missionsSolved).toEqual([]);
  await page.getByRole('button', { name: 'Lesson sequence', exact: true }).click();
  await expect.poll(async () => (await state(page)).missionsSolved).toEqual(['seg']);
  await expect(page.getByRole('region', { name: 'Current lesson', exact: true })).toContainText('Completed');
  await page.getByRole('button', { name: 'Next lesson', exact: true }).click();
  await expect.poll(async () => (await state(page)).missionsSolved).toEqual(['seg', 'rect']);
  await page.getByRole('button', { name: 'Free build', exact: true }).click();
  expect((await state(page)).construction).toEqual(matching);
  expect((await state(page)).missionsSolved).toEqual(['seg', 'rect']);
});


test('saved builds are reachable from Build and restore a named construction', async ({ page }) => {
  await mount(page, { mode: 'stretch', construction });
  const buildTab = workspaceTabs(page).getByRole('tab', { name: 'Build', exact: true });
  const build = await controlledPanel(page, buildTab);
  const saves = build.locator('section').filter({ has: page.getByRole('heading', { name: 'Saved builds', exact: true }) });
  await expect(saves).toBeVisible();
  await saves.getByRole('button', { name: /Save$/ }).click();
  await page.getByRole('textbox', { name: 'Construction name', exact: true }).fill('My first volume study');
  await page.getByRole('button', { name: 'Save construction', exact: true }).click();
  expect((await state(page)).savedConstructions['My first volume study']).toMatchObject(construction);

  await page.getByRole('button', { name: 'Clear all construction objects', exact: true }).click();
  expect((await state(page)).construction.objects).toEqual([]);
  await workspaceTabs(page).getByRole('tab', { name: 'Learn', exact: true }).click();
  await expect(saves).toBeHidden();
  await buildTab.click();
  await saves.getByRole('button', { name: /Load \(1\)/ }).click();
  await expect(saves.getByText('My first volume study', { exact: true })).toBeVisible();
  await saves.getByRole('button', { name: 'Load', exact: true }).click();
  expect((await state(page)).construction).toEqual(construction);
  await expect(buildTab).toHaveAttribute('aria-selected', 'true');
});

test('typing an exact size is one undo transaction and keyboard range edits can be redone', async ({ page }) => {
  await mount(page, { mode: 'stretch', construction });
  const exactSize = page.getByRole('spinbutton', { name: 'Side u exact value', exact: true });
  const undo = page.getByRole('button', { name: 'Undo last stretch', exact: true });
  const redo = page.getByRole('button', { name: 'Redo last stretch', exact: true });
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  await exactSize.selectText();
  await exactSize.pressSequentially('12');
  await exactSize.press('Tab');
  await expect(exactSize).toHaveValue('12');
  expect((await state(page)).history).toHaveLength(1);
  await undo.click();
  expect((await state(page)).construction).toEqual(construction);
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(exactSize).toHaveValue('12');
  await expect(redo).toBeDisabled();

  const range = page.getByRole('slider', { name: 'Side u resize', exact: true });
  await range.focus();
  await range.press('ArrowLeft');
  await range.press('Tab');
  await expect(exactSize).toHaveValue('11.5');
  await undo.click();
  await expect(exactSize).toHaveValue('12');
  await redo.click();
  await expect(exactSize).toHaveValue('11.5');
  expect((await state(page)).construction.selection).toBe(1);
});

test('selected object actions open the appropriate editor and measurement panel', async ({ page }) => {
  await mount(page, { mode: 'stretch', construction, showCanvasMeasures: false });
  const actions = () => page.getByRole('group', { name: 'Selected object actions', exact: true });
  const build = () => workspaceTabs(page).getByRole('tab', { name: 'Build', exact: true });
  const learn = () => workspaceTabs(page).getByRole('tab', { name: 'Learn', exact: true });
  await workspaceTabs(page).getByRole('tab', { name: 'Settings', exact: true }).click();
  await actions().getByRole('button', { name: 'Edit selection', exact: true }).click();
  await expect(build()).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#geo-selected-dimensions')).toBeVisible();
  await expect(page.locator('#geo-selected-dimensions input:focus')).toHaveCount(1);
  await actions().getByRole('button', { name: 'Explore measurements', exact: true }).click();
  await expect(learn()).toHaveAttribute('aria-selected', 'true');
  await expect(learn()).toBeFocused();
  expect((await state(page)).construction).toEqual(construction);

  await mount(page, { mode: 'sculpt', showCanvasMeasures: false });
  await page.getByRole('button', { name: 'Start with a box', exact: true }).click();
  const original = (await state(page)).sculptRecipe;
  await workspaceTabs(page).getByRole('tab', { name: 'Settings', exact: true }).click();
  await actions().getByRole('button', { name: 'Edit selection', exact: true }).click();
  const inspector = page.locator('#geo-part-inspector');
  await expect(build()).toHaveAttribute('aria-selected', 'true');
  await expect(inspector).toBeVisible();
  await expect(page.getByRole('tablist',{name:'Sculpt editor views'}).getByRole('tab',{name:'Edit',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(inspector.getByRole('combobox', { name: 'Primitive shape', exact: true })).toBeVisible();
  await expect(inspector.locator(':focus')).toHaveCount(1);
  await actions().getByRole('button', { name: 'Explore measurements', exact: true }).click();
  await expect(learn()).toHaveAttribute('aria-selected', 'true');
  expect((await state(page)).sculptRecipe).toEqual(original);
});

test('the seventh lesson keeps its context while scaling and returning to Build', async ({ page }) => {
  await mount(page, { mode: 'stretch', workspacePath: 'lesson', lessonIndex: 6, construction: {
    objects: [{ id: 1, type: 'segment', position: [0, 0, 0], vector: [5, 0, 0] }], selection: 1,
  }, missionsSolved: [] });
  await expect(page.getByRole('button', { name: 'Open Scale explorer', exact: true })).toBeDisabled();
  await expect(page.getByRole('region', { name: 'Current lesson', exact: true })).toContainText('Select a prism to compare it with a scaled copy.');
  await mount(page, { mode: 'stretch', workspacePath: 'lesson', lessonIndex: 6, construction, missionsSolved: [] });
  await expect(page.getByRole('combobox', { name: 'Choose a lesson', exact: true })).toHaveValue('6');
  await page.getByRole('button', { name: 'Open Scale explorer', exact: true }).click();
  await expect(workspaceTabs(page).getByRole('tab', { name: 'Learn', exact: true })).toHaveAttribute('aria-selected', 'true');
  const context = page.getByRole('region', { name: 'Current lesson', exact: true });
  await expect(context).toContainText('Square–cube law');
  await expect(context.getByRole('button', { name: 'Back to building', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open lesson sequence', exact: true })).toHaveCount(0);
  const explorer = page.locator('#geo-scale-explorer');
  await expect(explorer).toBeVisible();
  await expect(explorer.getByRole('slider', { name: 'Scale factor k', exact: true })).toBeFocused();
  await explorer.getByRole('button', { name: 'Place a scaled copy beside the original', exact: true }).click();
  await expect.poll(async () => (await state(page)).missionsSolved).toEqual(['squarecube']);
  const scaled = (await state(page)).construction;
  expect(scaled.objects).toHaveLength(2);
  expect(scaled.objects[0]).toEqual(construction.objects[0]);
  expect(scaled.objects[1]).toMatchObject({ type: 'prism', u: [6, 0, 0], v: [0, 4, 0], w: [0, 0, 8] });
  await context.getByRole('button', { name: 'Back to building', exact: true }).click();
  await expect(workspaceTabs(page).getByRole('tab', { name: 'Build', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('combobox', { name: 'Choose a lesson', exact: true })).toHaveValue('6');
  await expect(page.getByRole('region', { name: 'Current lesson', exact: true })).toContainText('Completed');
  expect((await state(page)).construction).toEqual(scaled);
});

test('construction appearance persists and display reset preserves the build and lesson progress', async ({ page }) => {
  await mount(page, { mode: 'stretch', construction, missionsSolved: ['seg', 'rect'] });
  const settings = () => workspaceTabs(page).getByRole('tab', { name: 'Settings', exact: true });
  await settings().click();
  const surfaces = page.getByRole('combobox', { name: 'Construction surfaces', exact: true });
  const dimOthers = page.getByRole('checkbox', { name: 'Dim other objects', exact: true });
  await expect(surfaces).toHaveValue('translucent');
  await expect(dimOthers).not.toBeChecked();
  await surfaces.selectOption('solid');
  await dimOthers.check();
  await page.getByRole('combobox', { name: 'Canvas background', exact: true }).selectOption('paper');
  await page.getByRole('combobox', { name: 'Control spacing', exact: true }).selectOption('compact');
  await page.getByRole('checkbox', { name: 'Show grid', exact: true }).uncheck();
  const saved = await state(page);
  expect(saved).toMatchObject({ constructionSurface: 'solid', dimUnselected: true });
  await mount(page, saved);
  await settings().click();
  await expect(surfaces).toHaveValue('solid');
  await expect(dimOthers).toBeChecked();
  await page.getByRole('button', { name: 'Reset display settings', exact: true }).click();
  await expect(surfaces).toHaveValue('translucent');
  await expect(dimOthers).not.toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Canvas background', exact: true })).toHaveValue('slate');
  await expect(page.getByRole('combobox', { name: 'Control spacing', exact: true })).toHaveValue('comfortable');
  await expect(page.getByRole('checkbox', { name: 'Show grid', exact: true })).toBeChecked();
  const reset = await state(page);
  expect(reset.construction).toEqual(construction);
  expect(reset.missionsSolved).toEqual(['seg', 'rect']);
});

test('phone empty states and expanded precise controls create geometry without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  async function expectPhoneFit() {
    const width = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth,
      content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) }));
    expect(width.content).toBeLessThanOrEqual(width.viewport + 1);
  }
  await mount(page, { mode: 'stretch', construction: { objects: [], selection: null } });
  await page.getByRole('button', { name: 'Place first point', exact: true }).click();
  expect((await state(page)).construction.objects).toMatchObject([{ type: 'point', position: [0, 0, 0] }]);
  await expect(page.getByRole('group', { name: 'Selected object actions', exact: true }).getByRole('button', { name: 'Edit selection', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Object name', exact: true })).toBeVisible();
  const precision = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Precise placement & snapping' }) });
  await expect(precision).not.toHaveAttribute('open', '');
  await precision.locator('summary').click();
  await precision.getByRole('spinbutton', { name: 'Point X position', exact: true }).fill('2.5');
  await precision.getByRole('spinbutton', { name: 'Point Z position', exact: true }).fill('-1.5');
  await precision.getByRole('spinbutton', { name: 'Point height above the grid', exact: true }).fill('1');
  await precision.getByRole('button', { name: 'Snap grid off', exact: true }).click();
  await expectPhoneFit();
  await precision.getByRole('button', { name: 'Place a point at the entered X, Z and height Y', exact: true }).click();
  expect((await state(page)).construction.objects[1]).toMatchObject({ type: 'point', position: [2.5, 1, -1.5] });
  await expectPhoneFit();

  await mount(page, { mode: 'sculpt' });
  await page.getByRole('button', { name: 'Start with a box', exact: true }).click();
  expect((await state(page)).sculptRecipe.parts).toHaveLength(1);
  expect((await state(page)).sculptRecipe.parts[0].shape).toBe('box');
  await page.getByRole('group', { name: 'Selected object actions', exact: true }).getByRole('button', { name: 'Edit selection', exact: true }).click();
  await expect(page.locator('#geo-part-inspector')).toBeVisible();
  await expectPhoneFit();
  await workspaceTabs(page).getByRole('tab', { name: 'Settings', exact: true }).click();
  await expectPhoneFit();
  expect(errors).toEqual([]);
});

async function fitAndCheckSculpt(page: Page) {
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await page.waitForFunction(() => !(window as any)._geoFocusAnim);
  const projected = await page.evaluate(() => {
    const w = window as any, gs = w._geoScene, THREE = w.THREE;
    const bounds = new THREE.Box3();
    gs.sculptGroup.children.forEach((part: any) => {
      if (part.userData?.prim3dPartIndex != null) {
        part.updateMatrixWorld(true);
        bounds.expandByObject(part);
      }
    });
    gs.camera.updateMatrixWorld(true);
    const points: number[][] = [];
    [bounds.min.x, bounds.max.x].forEach(x => [bounds.min.y, bounds.max.y].forEach(y =>
      [bounds.min.z, bounds.max.z].forEach(z => {
        const p = new THREE.Vector3(x, y, z).project(gs.camera);
        points.push([p.x, p.y, p.z]);
      })));
    return points;
  });
  expect(projected).toHaveLength(8);
  for (const [x, y, z] of projected) {
    expect(Math.abs(x), 'Fit should leave every part within the scene width').toBeLessThan(1);
    expect(Math.abs(y), 'Fit should leave every part within the scene height').toBeLessThan(1);
    expect(z).toBeGreaterThan(-1);
    expect(z).toBeLessThan(1);
  }
}

test('capture the redesigned studio at desktop and phone sizes', async ({ page }) => {
  test.skip(!process.env.GEO_NAV_CAPTURE, 'Optional screenshot capture for visual review');
  const directory = resolve(process.env.GEO_NAV_CAPTURE!);
  mkdirSync(directory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { mode: 'stretch', construction: { objects: [], selection: null } });
  await expect(page.getByRole('button', { name: 'Place first point', exact: true })).toBeVisible();
  await page.screenshot({ path: resolve(directory, 'sandbox-empty-stretch-desktop.png'), fullPage: true });
  await mount(page, { mode: 'stretch', construction });
  await page.screenshot({ path: resolve(directory, 'sandbox-stretch-desktop.png'), fullPage: true });
  const appearance = await stretchProperties(page);
  await appearance.getByRole('textbox',{name:'Object name',exact:true}).fill('Blue pavilion');
  await appearance.getByRole('textbox',{name:'Object name',exact:true}).press('Tab');
  await setObjectColor(page,'#74b9b8');
  await page.screenshot({path:resolve(directory,'sandbox-stretch-customization-desktop.png'),fullPage:true});
  await page.getByRole('button', { name: 'Lesson sequence', exact: true }).click();
  await page.screenshot({ path: resolve(directory, 'sandbox-lesson-desktop.png'), fullPage: true });
  await mount(page, { mode: 'sculpt', sculptRecipe: { name: 'Geometry study', parts: [
    { shape: 'box', size: [1.8, 1.5, 1.8], position: [0, 0.75, 0], rotation: [0, 0, 0], color: '#60a5fa' },
    { shape: 'sphere', size: [0.6], position: [0, 2.1, 0], color: '#c4b5fd' },
    { shape: 'cylinder', size: [0.45, 1.5], position: [1.8, 0.75, 0], color: '#fbbf24' },
  ] } });
  await page.getByRole('button', { name: /Edit by hand/ }).click();
  await page.locator('#geo-sculpt-panel-edit .geo-sculpt-part-chip').first().click();
  await fitAndCheckSculpt(page);
  await page.screenshot({ path: resolve(directory, 'sandbox-sculpt-desktop.png'), fullPage: true });
  await page.locator('#geo-part-inspector').getByText('Color & material',{exact:true}).click();
  await page.getByRole('button',{name:'Apply material Ocean enamel',exact:true}).click();
  await page.screenshot({path:resolve(directory,'sandbox-sculpt-materials-desktop.png'),fullPage:true});
  await page.getByRole('tablist',{name:'Sculpt editor views'}).getByRole('tab',{name:'Project',exact:true}).click();
  await page.screenshot({path:resolve(directory,'sandbox-sculpt-project-desktop.png'),fullPage:true});
  await page.getByRole('tablist',{name:'Sculpt editor views'}).getByRole('tab',{name:'Parts',exact:true}).click();
  await page.screenshot({path:resolve(directory,'sandbox-sculpt-parts-desktop.png'),fullPage:true});
  await page.getByRole('tablist',{name:'Sculpt editor views'}).getByRole('tab',{name:'Edit',exact:true}).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await fitAndCheckSculpt(page);
  await page.screenshot({ path: resolve(directory, 'sandbox-sculpt-phone.png'), fullPage: true });
  await mount(page, { mode: 'stretch', workspacePath: 'lesson', construction });
  await page.screenshot({ path: resolve(directory, 'sandbox-lesson-phone.png'), fullPage: true });
  await mount(page, { mode: 'stretch', canvasBackground: 'paper', construction: { objects: [], selection: null } });
  await expect(page.getByRole('button', { name: 'Place first point', exact: true })).toBeVisible();
  await page.screenshot({ path: resolve(directory, 'sandbox-empty-paper-phone.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { mode: 'stretch', construction: {
    objects: [construction.objects[0], { id: 2, type: 'prism', position: [2, 0.2, -1], u: [2, 0, 0], v: [0, 3, 0], w: [0, 0, 2] }],
    selection: 1,
  } });
  await workspaceTabs(page).getByRole('tab', { name: 'Settings', exact: true }).click();
  await page.getByRole('combobox', { name: 'Construction surfaces', exact: true }).selectOption('solid');
  await page.getByRole('checkbox', { name: 'Dim other objects', exact: true }).check();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await page.screenshot({ path: resolve(directory, 'sandbox-settings-solid-dimmed-desktop.png'), fullPage: true });
});


async function stretchProperties(page: Page) {
  const properties = page.locator('#geo-selected-dimensions .geo-object-properties');
  if (await properties.getAttribute('open') === null) await properties.locator(':scope > summary').click();
  return properties;
}

async function setObjectColor(page: Page, color: string) {
  const picker = page.getByLabel('Object color', { exact: true });
  await picker.focus();
  await picker.evaluate((element, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, color);
  await picker.press('Tab');
}

test('Stretch object metadata survives editing, undo, save, and reload with unchanged geometry', async ({ page }) => {
  await mount(page, { mode: 'stretch', construction });
  const properties = await stretchProperties(page);
  const name = properties.getByRole('textbox', { name: 'Object name', exact: true });
  await name.fill('Blue tower ');
  await name.press('Tab');
  expect((await state(page)).construction.objects[0].name).toBe('Blue tower ');
  expect((await state(page)).history).toHaveLength(1);
  await page.getByRole('button', { name: 'Undo last stretch', exact: true }).click();
  expect((await state(page)).construction).toEqual(construction);
  await page.getByRole('button', { name: 'Redo last stretch', exact: true }).click();
  await expect(name).toHaveValue('Blue tower ');
  await setObjectColor(page, '#336699');
  const opacity = properties.getByRole('slider', { name: 'Object opacity', exact: true });
  await opacity.focus();
  await opacity.press('Home');
  for (let i = 0; i < 7; i++) await opacity.press('ArrowRight');
  await opacity.press('Tab');
  for (const [axis, value] of [['X', '4'], ['Y', '2'], ['Z', '-3']]) {
    const field = properties.getByRole('spinbutton', { name: axis + ' position', exact: true });
    await field.fill(value);
    await field.press('Tab');
  }
  const customized = (await state(page)).construction;
  expect(customized.objects[0]).toMatchObject({ name: 'Blue tower ', color: '#336699', opacity: 0.5, position: [4, 2, -3], u: [3, 0, 0], v: [0, 2, 0], w: [0, 0, 4] });
  await expect(page.getByRole('region', { name: 'Scene objects', exact: true }).getByRole('button', { name: /Blue tower/ })).toHaveAttribute('aria-pressed', 'true');
  const material = await page.evaluate(() => {
    let fill: any;
    (window as any)._geoScene.constructionGroup.children[0].traverse((node: any) => { if (!fill && node.isMesh) fill = node.material; });
    return { color: fill.color.getHexString(), opacity: fill.opacity };
  });
  expect(material).toEqual({ color: '336699', opacity: 0.5 });
  const saves = page.locator('.geo-saved-builds');
  await saves.getByRole('button', { name: /Save$/ }).click();
  await page.getByRole('textbox', { name: 'Construction name', exact: true }).fill('Custom tower study');
  await page.getByRole('button', { name: 'Save construction', exact: true }).click();
  const persisted = await state(page);
  expect(persisted.savedConstructions['Custom tower study']).toMatchObject(customized);
  await mount(page, persisted);
  await page.getByRole('button', { name: 'Clear all construction objects', exact: true }).click();
  await saves.getByRole('button', { name: /Load \(1\)/ }).click();
  await saves.getByRole('button', { name: 'Load', exact: true }).click();
  expect((await state(page)).construction).toEqual(customized);
});

test('Stretch copies preserve appearance, honor axis spacing, and stop at workspace bounds', async ({ page }) => {
  const original = { ...construction.objects[0], name: 'Original', color: '#227799', opacity: 0.6 };
  await mount(page, { mode: 'stretch', construction: { objects: [original], selection: 1 } });
  let properties = await stretchProperties(page);
  await properties.locator('.geo-copy-options > summary').click();
  await properties.getByRole('combobox', { name: 'Copy direction', exact: true }).selectOption('1');
  await properties.getByRole('spinbutton', { name: 'Copy spacing', exact: true }).fill('3');
  await page.getByRole('button', { name: 'Duplicate object', exact: true }).click();
  const copied = (await state(page)).construction;
  expect(copied.objects).toHaveLength(2);
  expect(copied.objects[0]).toEqual(original);
  expect(copied.objects[1]).toMatchObject({ id: 2, name: 'Original', color: '#227799', opacity: 0.6, position: [-1.5, 3.2, -2], u: original.u, v: original.v, w: original.w });
  expect(copied.selection).toBe(2);
  await page.getByRole('button', { name: 'Undo last stretch', exact: true }).click();
  expect((await state(page)).construction).toEqual({ objects: [original], selection: 1 });
  await mount(page, { mode: 'stretch', construction: { objects: [{ ...original, position: [19, 0, 0] }], selection: 1 }, stretchCopyAxis: 0, stretchCopySpacing: 2 });
  const duplicate = page.getByRole('button', { name: 'Duplicate object', exact: true });
  await expect(duplicate).toBeDisabled();
  properties = await stretchProperties(page);
  await properties.locator('.geo-copy-options > summary').click();
  await properties.getByRole('spinbutton', { name: 'Copy spacing', exact: true }).fill('1');
  await expect(duplicate).toBeEnabled();
  await duplicate.click();
  expect((await state(page)).construction.objects[1].position).toEqual([20, 0, 0]);
  await expect(duplicate).toBeDisabled();
});

test('Stretch quick shapes add usable starting geometry and preserve prior objects through undo', async ({ page }) => {
  await mount(page, { mode: 'stretch', workspacePath: 'free', construction: { objects: [], selection: null } });
  const quick = page.locator('.geo-quick-shapes');
  for (const shape of ['Line', 'Surface', 'Prism']) {
    if (await quick.getAttribute('open') === null) await quick.locator(':scope > summary').click();
    await quick.getByRole('button', { name: shape, exact: true }).click();
  }
  const built = (await state(page)).construction;
  expect(built.objects.map((object: any) => object.type)).toEqual(['segment', 'rect', 'prism']);
  expect(built.objects[2]).toMatchObject({ id: 3, position: [0, 0, 0], u: [3, 0, 0], v: [0, 0, 2], w: [0, 2, 0] });
  expect(built.selection).toBe(3);
  await expect(page.getByRole('region', { name: 'Build from selection', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo last stretch', exact: true }).click();
  expect((await state(page)).construction.objects).toEqual(built.objects.slice(0, 2));
  await page.getByRole('button', { name: 'Redo last stretch', exact: true }).click();
  expect((await state(page)).construction).toEqual(built);
  await page.getByRole('button', { name: 'Lesson sequence', exact: true }).click();
  await expect(quick).toHaveCount(0);
  expect((await state(page)).construction).toEqual(built);
});

test('Stretch selection reveals valid operations and keeps every object editable', async ({ page }) => {
  const objects = [
    { id: 1, type: 'point', position: [0, 0, 0] },
    { id: 2, type: 'segment', position: [0, 0, 0], vector: [3, 0, 0] },
    { id: 3, type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 2, 0] },
    { ...construction.objects[0], id: 4 },
  ];
  await mount(page, { mode: 'stretch', construction: { objects, selection: 1 }, buildVerb: 'revolve', stretchAxis: 'y', stretchLength: 3 });
  const build = page.locator('#geo-panel-build');
  const list = page.getByRole('region', { name: 'Scene objects', exact: true });
  await expect(build.getByRole('radio', { name: /Taper|Revolve/ })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Object name', exact: true })).toBeVisible();
  await build.getByRole('button', { name: /^Stretch point/ }).click();
  expect((await state(page)).construction.objects.at(-1).type).toBe('segment');
  await list.getByRole('button').nth(2).click();
  await expect(build.getByRole('radio', { name: /Revolve/ })).toHaveAttribute('aria-checked', 'true');
  await expect(build.getByRole('radio', { name: /Stretch|Taper|Revolve/ })).toHaveCount(3);
  await build.getByRole('button', { name: /^Revolve rectangle/ }).click();
  expect((await state(page)).construction.objects.at(-1).type).toBe('revolution');
  await expect(page.getByRole('textbox', { name: 'Object name', exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'X position', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Duplicate object', exact: true })).toHaveCount(0);
  await expect(build.getByRole('region', { name: 'Build from selection', exact: true })).toHaveCount(0);
  await list.getByRole('button').nth(3).click();
  await expect(page.locator('#geo-stretch-size-fields')).toBeVisible();
  await expect(build.getByRole('slider', { name: 'Stretch length', exact: true })).toHaveCount(0);
  await expect(build.getByRole('radio', { name: /Taper|Revolve/ })).toHaveCount(0);
});

test('Stretch dimension progress follows current selection and resets after clearing the scene', async ({ page }) => {
  await mount(page, { mode: 'stretch', construction, _geoExt: { maxDim: 3 } });
  const path = page.getByRole('group', { name: 'Selected geometry dimension', exact: true });
  await expect(path.locator('[aria-current="step"]')).toContainText('3D');
  await page.getByRole('button', { name: 'Clear all construction objects', exact: true }).click();
  await expect(path.locator('[aria-current="step"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Place first point', exact: true }).click();
  await expect(path.locator('[aria-current="step"]')).toContainText('0D');
  expect((await state(page))._geoExt.maxDim).toBe(3);
  expect((await state(page)).construction.objects[0].type).toBe('point');
});

test('Immersive 3D menu launches the companion with current lesson intent and supports Escape', async ({ page }) => {
  await mount(page, { mode: 'stretch', workspacePath: 'lesson', lessonIndex: 3, construction });
  await page.evaluate(() => {
    (window as any).__companionLaunch = null;
    window.open = ((url: string, name: string, features: string) => {
      (window as any).__companionLaunch = { url, name, features, focused: false };
      return { focus() { (window as any).__companionLaunch.focused = true; } };
    }) as any;
  });
  const immersive = page.locator('details.geo-immersive-tools');
  const summary = immersive.locator(':scope > summary');
  await expect(summary).toHaveText('Immersive 3D');
  await summary.click();
  await expect(immersive.getByRole('heading', { name: 'Choose your 3D experience', exact: true })).toBeVisible();
  const launch = immersive.getByRole('button', { name: /^Open the Immersive Geometry Lab in a new window/ });
  await launch.click();
  const captured = await page.evaluate(() => (window as any).__companionLaunch);
  expect(captured.focused).toBe(true);
  const destination = new URL(captured.url);
  expect(destination.pathname).toBe('/immersive_geometry/immersive_geometry.html');
  expect(destination.searchParams.get('workspace')).toBe('lesson');
  expect(destination.searchParams.get('source')).toBe('geosandbox');
  expect((await state(page)).construction).toEqual(construction);
  await launch.press('Escape');
  await expect(immersive).not.toHaveAttribute('open', '');
  await expect(summary).toBeFocused();
  const more = page.locator('details.geo-more-tools').filter({ has: page.locator('summary').filter({ hasText: /^More tools$/ }) });
  await more.locator(':scope > summary').click();
  await expect(more.getByRole('button', { name: /^Open the Immersive Geometry Lab/ })).toHaveCount(0);
});
