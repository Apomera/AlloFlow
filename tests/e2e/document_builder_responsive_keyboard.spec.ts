import { test, expect, Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
const { parse } = require('@babel/parser');
const { transformSync } = require('esbuild');

const root = path.resolve(__dirname, '../..');
const builderSource = fs.readFileSync(path.join(root, 'view_export_preview_source.jsx'), 'utf8');
const declaration = parse(builderSource, { sourceType: 'script', plugins: ['jsx'] }).program.body
  .find((node: any) => node.type === 'FunctionDeclaration' && node.id.name === 'ExportPreviewView');
const propNames = declaration.body.body[0].declarations[0].id.properties.map((property: any) => property.key.name);
const compiled = transformSync(builderSource, { loader: 'jsx', target: 'es2020', jsx: 'transform' }).code;
const browserModule = process.env.ALLOFLOW_BUILDER_TEST_USE_BUILT === '1' ? fs.readFileSync(path.join(root, 'view_export_preview_module.js'), 'utf8') : '(function(){const React=window.React;const {useState,useEffect,useRef,useMemo,useCallback,useContext,Fragment}=React;const warnLog=console.warn.bind(console),debugLog=()=>{};const Download=()=>null,ImageIcon=()=>null,RefreshCw=()=>null,X=()=>null;' + compiled +
  ';window.AlloModules=window.AlloModules||{};window.AlloModules.ExportPreviewView=ExportPreviewView;window.AlloModules.ExportPreviewHelpers={updateExportPreview};})();';

async function mount(page: Page, sourceMode: 'history' | 'remediation' = 'history') {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url() === 'https://builder-responsive.test/'
    ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Builder tests</title></head><body><button id="opener">Open document</button><div id="root"></div></body></html>' })
    : route.abort());
  await page.goto('https://builder-responsive.test/');
  const css = fs.readdirSync(path.join(root, 'app/static/css')).find(name => /^main\..*\.css$/.test(name));
  await page.addStyleTag({ path: path.join(root, 'app/static/css', css!) });
  for (const file of [
    'desktop/web-app/node_modules/react/umd/react.development.js',
    'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',
    'export_handlers_module.js',
  ]) await page.addScriptTag({ path: path.join(root, file) });
  // Compile the actual current source in memory. This test never generates or syncs production bundles.
  await page.addScriptTag({ content: browserModule });
  await page.evaluate(({ names, sourceMode }) => {
    const w = window as any, noop = () => {};
    const props: any = Object.fromEntries(names.map((name: string) => [name,
      /^(set|handle|apply|delete|save|run|toggle|update|process|propose|generate|audit|open|on|_ensure)/.test(name) ? noop : undefined]));
    const html = '<!doctype html><html lang="en"><head><title>Classroom handout</title></head><body><main><h1>Classroom handout</h1><p id="editable">Original lesson text.</p><button id="lesson-action" aria-label="Run lesson action">Run</button></main></body></html>';
    Object.assign(props, {
      BUILT_IN_PRESETS: [], FONT_OPTIONS: [{ value: 'Arial', label: 'Arial' }], STYLE_SEEDS: {},
      customExportCSS: '', exportStylePrompt: '', expertCommandInput: '', exportPresets: [], history: [],
      agentActivityLog: [], exportConfig: { title: 'Classroom handout' }, exportPreviewMode: 'print',
      exportTheme: 'clean', selectedFont: 'Arial', exportPreviewSource: sourceMode, theme: 'light',
      pdfFixResult: sourceMode === 'remediation' ? { fileName: 'Original lesson.pdf', sourceName: 'Original lesson.pdf', accessibleHtml: html } : null,
      showExportPreview: true, pptxLoaded: true,
      t: (key: string) => ({ 'a11y.close_doc_builder': 'Close Document Builder', 'a11y.toggle_theme': 'Toggle color theme' } as any)[key] || '',
      getSkippedResources: () => [], getExportPreviewHTML: () => html, exportPreviewRef: { current: null },
      setShowExportPreview: (value: boolean) => { if (!value) w.__builderCloseRequests++; },
      executeExportFromPreview: async () => false, addToast: noop,
    });
    props.updateExportPreview = () => w.AlloModules.ExportPreviewHelpers.updateExportPreview({
      exportPreviewRef: props.exportPreviewRef, _exportPreviewErrorRef: { current: null },
      _builderRecoverySaveTimerRef: { current: null }, getExportPreviewHTML: () => html, t: props.t,
      addToast: noop, warnLog: console.warn, setCanvasRecoveryRevision: noop, isCanvas: false, a11yInspectMode: false,
    });
    w.__builderCloseRequests = 0; w.builderProps = props;
    document.getElementById('opener')?.focus();
    w.ReactDOM.createRoot(document.getElementById('root')).render(w.React.createElement(w.AlloModules.ExportPreviewView, props));
  }, { names: propNames, sourceMode });
  await expect(page.locator('#document-builder-title')).toBeAttached();
  await page.evaluate(() => (window as any).builderProps.updateExportPreview());
  await page.waitForFunction(() => (window as any).builderProps.exportPreviewRef.current?.contentDocument?.designMode === 'on');
  expect(errors).toEqual([]);
  return errors;
}

async function geometry(page: Page) {
  return page.locator('#document-builder-preview').evaluate(frame => {
    const box = frame.getBoundingClientRect();
    const pane = frame.closest('.builder-editor-pane')!.getBoundingClientRect();
    return { viewport: { width: innerWidth, height: innerHeight },
      frame: { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom },
      visibleHeight: Math.max(0, Math.min(box.bottom, pane.bottom, innerHeight) - Math.max(box.top, pane.top, 0)),
      documentWidth: document.documentElement.scrollWidth };
  });
}

for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
  test('Builder has a usable initial editing surface at ' + width + 'x' + height, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    const errors = await mount(page);
    const facts = await geometry(page);
    fs.writeFileSync(testInfo.outputPath('geometry.json'), JSON.stringify(facts, null, 2));
    await testInfo.attach('layout.json', { body: JSON.stringify(facts, null, 2), contentType: 'application/json' });
    await page.screenshot({ path: testInfo.outputPath('initial.png') });
    expect(facts.frame.height).toBeGreaterThanOrEqual(width < 1024 ? 280 : 200);
    expect(facts.visibleHeight).toBeGreaterThanOrEqual(width < 1024 ? 220 : 180);
    expect(facts.frame.x).toBeGreaterThanOrEqual(0);
    expect(facts.frame.right).toBeLessThanOrEqual(width);
    expect(facts.documentWidth).toBeLessThanOrEqual(width);
    if (width < 1024) {
      await expect(page.getByRole('button', { name: 'Document settings', exact: true })).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByRole('region', { name: 'Document settings', exact: true })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Expand ribbon', exact: true })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

test('mobile settings are reachable, Escape restores focus, and toggling preserves live edits', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await mount(page);
  const paragraph = page.frameLocator('#document-builder-preview').locator('#editable');
  await paragraph.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' Teacher note.');
  await expect(paragraph).toContainText('Teacher note.');
  await page.evaluate(() => { (window as any).__originalFrameDocument = (window as any).builderProps.exportPreviewRef.current.contentDocument; });
  await page.getByRole('button', { name: 'Document settings', exact: true }).focus();
  await page.keyboard.press('Enter');
  const settings = page.getByRole('region', { name: 'Document settings', exact: true });
  await expect(settings).toBeVisible();
  await expect(page.locator('#document-builder-preview')).not.toBeVisible();
  await settings.getByRole('button').first().focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Document settings', exact: true })).toBeFocused();
  await expect(paragraph).toContainText('Teacher note.');
  expect(await page.evaluate(() => (window as any).__originalFrameDocument === (window as any).builderProps.exportPreviewRef.current.contentDocument)).toBe(true);
  // Escape from the still-focused switch also closes only the settings surface.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Back to document', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Document settings', exact: true })).toBeFocused();
  expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(0);
  expect(errors).toEqual([]);
});

test('phone Focus mode preserves a usable preview and returns to standard view', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await mount(page);
  await page.getByRole('button', { name: 'Focus mode', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Exit focus', exact: true })).toBeVisible();
  const facts = await geometry(page);
  fs.writeFileSync(testInfo.outputPath('geometry.json'), JSON.stringify(facts, null, 2));
  await testInfo.attach('focus-layout.json', { body: JSON.stringify(facts, null, 2), contentType: 'application/json' });
  await page.screenshot({ path: testInfo.outputPath('focus.png') });
  expect(facts.frame.height).toBeGreaterThanOrEqual(280);
  expect(facts.visibleHeight).toBeGreaterThanOrEqual(220);
  await page.getByRole('button', { name: 'Exit focus', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Focus mode', exact: true })).toBeVisible();
  expect((await geometry(page)).frame.height).toBeGreaterThanOrEqual(280);
  expect(errors).toEqual([]);
});

test('Quick Access Escape closes its own menu and restores focus before Builder close', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await mount(page);
  const summary = page.getByLabel('Customize Quick Access toolbar', { exact: true });
  await summary.focus(); await page.keyboard.press('Enter');
  await page.locator('#builder-quick-access-customize input[type="checkbox"]').first().focus();
  await page.keyboard.press('Escape');
  expect(await page.locator('#builder-quick-access-customize').evaluate((details: HTMLDetailsElement) => details.open)).toBe(false);
  await expect(summary).toBeFocused();
  expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(0);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(1);
  expect(errors).toEqual([]);
});

test('Tab from editor entry reaches its native control and editable inspector badge', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await mount(page);
  await page.evaluate(() => {
    const w = window as any;
    w.AlloModules.ExportHandlers.applyA11yInspector({ exportPreviewRef: w.builderProps.exportPreviewRef, enabled: true });
  });
  const frame = page.frameLocator('#document-builder-preview');
  const nativeControl = frame.getByRole('button', { name: 'Run lesson action', exact: true });
  const badge = frame.getByRole('button', { name: 'Edit aria-label: Run lesson action', exact: true });
  await page.getByRole('button', { name: 'Skip to editable preview', exact: true }).focus();
  await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
  await expect(nativeControl).toBeFocused();
  await page.keyboard.press('Tab'); await expect(badge).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(frame.locator('#a11y-inspect-editor-value')).toHaveValue('Run lesson action');
  await page.keyboard.press('Escape'); await expect(badge).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(nativeControl).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('IFRAME');
  expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(0);
  expect(errors).toEqual([]);
});


test('a focused table control reaches its inspector badge without inserting a table row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await mount(page);
  await page.evaluate(() => {
    const w = window as any, doc = w.builderProps.exportPreviewRef.current.contentDocument;
    doc.body.innerHTML = '<main><h1>Classroom handout</h1><table><tr><td id="active-cell"><button aria-label="Run lesson action">Run</button></td></tr></table></main>';
    w.AlloModules.ExportHandlers.applyA11yInspector({ exportPreviewRef: w.builderProps.exportPreviewRef, enabled: true });
    const range = doc.createRange();
    range.selectNodeContents(doc.getElementById('active-cell')); range.collapse(true);
    doc.getSelection().removeAllRanges(); doc.getSelection().addRange(range);
  });
  const frame = page.frameLocator('#document-builder-preview');
  const nativeControl = frame.getByRole('button', { name: 'Run lesson action', exact: true });
  const badge = frame.getByRole('button', { name: 'Edit aria-label: Run lesson action', exact: true });
  await nativeControl.focus();
  await page.keyboard.press('Tab');
  await expect(badge).toBeFocused();
  await expect(frame.locator('table tr')).toHaveCount(1);
  await page.keyboard.press('Shift+Tab');
  await expect(nativeControl).toBeFocused();
  expect(errors).toEqual([]);
});


test('current document heading and timestamped save context follow real edits', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await mount(page);
  await expect(page.locator('#builder-current-document-title')).toHaveText('Classroom handout');
  await expect(page.locator('[data-builder-save-status]')).toHaveText('No local changes yet');
  const heading = page.frameLocator('#document-builder-preview').getByRole('heading', { name: 'Classroom handout', exact: true });
  await heading.click();
  await page.keyboard.press('Home'); await page.keyboard.press('Shift+End');
  await page.keyboard.type('Revised classroom handout');
  await expect(heading).toHaveCount(0);
  await expect(page.locator('#builder-current-document-title')).toHaveText('Revised classroom handout');
  await expect(page.locator('[data-builder-document-context]')).toContainText('History selection');
  await expect(page.locator('[data-builder-save-status]')).toHaveText(/^Saved (?:for this session|on this device) · .+/);
  expect(errors).toEqual([]);
});

test('remediation settings omit History assembly options while retaining the editable document', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await mount(page, 'remediation');
  const settings = page.getByRole('region', { name: 'Document settings', exact: true });
  await expect(settings).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Export format' })).toBeVisible();
  await expect(settings.getByText('Include Resources', { exact: true })).toHaveCount(0);
  await expect(settings.getByText('Presets', { exact: true })).toHaveCount(0);
  await expect(settings.getByRole('radio', { name: /Worksheet/ })).toHaveCount(0);
  await expect(page.locator('[data-builder-document-context]')).toContainText('Remediated');
  await expect(page.frameLocator('#document-builder-preview').getByRole('heading', { name: 'Classroom handout', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).builderProps.exportPreviewRef.current.contentDocument.designMode)).toBe('on');
  expect(errors).toEqual([]);
});
