import { test, expect, Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
const { transformSync } = require('esbuild');
const root = path.resolve(__dirname, '../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const host = read('AlloFlowANTI.txt');
const saveMarkup = host.slice(host.indexOf('{showSaveModal && ('), host.indexOf('{isTranslateModalOpen && (', host.indexOf('{showSaveModal && (')));
const focusHook = host.slice(host.indexOf('const useFocusTrap ='), host.indexOf('window.__alloHooks ='));
const depsSource = read('tests/project_save_settings.test.js');
const saveDeps = depsSource.slice(depsSource.indexOf('const makeSaveDeps ='), depsSource.indexOf('const lastSavedJson ='));
const strings = JSON.parse(read('ui_strings.js'));

async function boot(page: Page, screen: 'history' | 'settings' | 'save', options: any = {}) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url() === 'https://declutter.test/'
    ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Lesson tools</title></head><body><button id="opener">Open lesson tools</button><main id="root"></main></body></html>' })
    : route.abort());
  await page.goto('https://declutter.test/');
  const css = fs.readdirSync(path.join(root, 'app/static/css')).find(name => /^main\..*\.css$/.test(name));
  await page.addStyleTag({ path: path.join(root, 'app/static/css', css!) });
  await page.addStyleTag({ content: '#root{max-width:720px;margin:0 auto;padding:8px}body{background:#f1f5f9}button,input,summary{outline-offset:2px}' });
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js']) {
    await page.addScriptTag({ path: path.join(root, file) });
  }
  await page.evaluate(({ strings, options }) => {
    const w = window as any;
    w.__options = options;
    w.__t = (key: string, params: any = {}) => {
      let value = key.split('.').reduce((node: any, part: string) => node?.[part], strings);
      if (typeof value !== 'string') return '';
      for (const [name, replacement] of Object.entries(params)) value = value.replaceAll('{' + name + '}', String(replacement));
      return value;
    };
    w.AlloIcons = new Proxy({}, { get: () => () => null });
    w.History = () => null;
    w.__events = [];
    document.getElementById('opener')!.focus();
  }, { strings, options });
  if (screen === 'history') {
    await page.addScriptTag({ path: path.join(root, 'view_history_panel_module.js') });
    await page.evaluate(() => {
      const w = window as any, R = w.React, noop = () => {};
      const items = ['Ecosystems: reading and discussion', 'Compare two habitats', 'Food web vocabulary'].map((title, i) => ({
        id: 'shared-public-id', _artifactInstanceId: 'artifact-resource-' + i, title, type: 'quiz', timestamp: '2026-09-20T12:00:00Z'
      }));
      function Fixture() {
        const [history, setHistory] = R.useState(items), [unit, setUnit] = R.useState('all');
        const [movingItemId, setMovingItemId] = R.useState(null), [editingId, setEditingId] = R.useState(null), [editTitle, setEditTitle] = R.useState('');
        w.__history = history;
        const props = {
          activeSidebarTab: 'history', activeUnitId: unit, history, units: [{ id: 'unit-a', name: 'Science' }],
          generatedContent: history[0], isTeacherMode: !w.__options.student, isSyncMode: !!w.__options.sync,
          editingId, editTitle, movingItemId, setMovingItemId, setEditTitle, setActiveUnitId: setUnit,
          projectFileInputRef: { current: null }, getFilteredHistory: () => unit === 'all' ? history : history.filter((x: any) => x.unitId === unit),
          getDefaultTitle: (type: string) => type, getIconForType: () => null, sanitizeString: (value: any) => value, t: w.__t,
          handleStartEdit: (_event: any, item: any) => { setEditingId(item._artifactInstanceId); setEditTitle(item.title); },
          handleSaveEdit: () => { setHistory(history.map((x: any) => x._artifactInstanceId === editingId ? { ...x, title: editTitle } : x)); setEditingId(null); },
          handleCancelEdit: () => setEditingId(null),
          handleMoveToUnit: (id: string, target: string) => { w.__events.push(['unit', id, target]); setHistory(history.map((x: any) => x._artifactInstanceId === id ? { ...x, unitId: target } : x)); },
          moveItem: (_event: any, id: string, direction: string, neighbor: string) => {
            w.__events.push(['reorder', id, direction, neighbor]);
            const next = [...history], from = next.findIndex((x: any) => x._artifactInstanceId === id), to = next.findIndex((x: any) => x._artifactInstanceId === neighbor);
            [next[from], next[to]] = [next[to], next[from]]; setHistory(next);
          },
          handleDeleteHistoryItem: (_event: any, id: string, item: any) => { w.__events.push(['delete', id, item._artifactInstanceId]); setHistory(history.filter((x: any) => x !== item)); },
          handleRestoreView: (item: any) => w.__events.push(['open', item._artifactInstanceId]),
          handleDragStart: noop, handleDragEnter: noop, handleDragEnd: noop,
        };
        return R.createElement(w.AlloModules.HistoryPanel.HistoryPanel, props);
      }
      w.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(Fixture));
    });
    await expect(page.locator('[role="listitem"]')).toHaveCount(3);
  } else if (screen === 'settings') {
    await page.addScriptTag({ path: path.join(root, 'view_project_settings_module.js') });
    await page.evaluate(() => {
      const w = window as any, R = w.React;
      w.__alloMakeQrSvg = async () => '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
      function Fixture() {
        const [settings, setSettings] = R.useState({ allowDictation: true, allowSocraticTutor: true });
        const [open, setOpen] = R.useState(true);
        w.__settings = settings;
        return open && R.createElement(w.AlloModules.ProjectSettingsView, {
          t: w.__t, isTeacherMode: true, isParentMode: !!w.__options.parent, studentProjectSettings: settings, setStudentProjectSettings: setSettings,
          handleSetIsProjectSettingsOpenToFalse: () => setOpen(false), onOpenPrincipalEvaluation: () => w.__events.push(['open-evaluation']),
          onOpenSchoolRewards: () => w.__events.push(['open-rewards']), isEvaluationPortalConnected: !!w.__options.connected,
          isRewardsPortalConnected: !!w.__options.connected, evaluationPortalUrl: w.__options.connected ? 'https://script.google.com/macros/s/example/exec' : '',
          onSaveEvaluationPortalUrl: (url: string) => { w.__events.push(['save-evaluation', url]); return { ok: true, url }; },
          onSaveRewardsPortalUrl: (url: string) => { w.__events.push(['save-rewards', url]); return { ok: true, url }; },
        });
      }
      w.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(Fixture));
    });
    await expect(page.locator('#project-settings-dialog')).toBeVisible();
  } else {
    await page.addScriptTag({ path: path.join(root, 'phase_k_helpers_module.js') });
    await page.addScriptTag({ content: transformSync(`
      const {useState,useEffect,useRef}=React; const Save=()=>null,X=()=>null;
      ${focusHook}
      ${saveDeps}
      function Fixture(){
        const [showSaveModal,setShowSaveModal]=useState(true),[saveFileName,setSaveFileName]=useState('My lesson'),[saveEncryptPassword,setSaveEncryptPassword]=useState('');
        const saveType=window.__options.student?'student':'teacher', t=window.__t,saveModalRef=useRef(null);
        const handleSetShowSaveModalToFalse=()=>setShowSaveModal(false);
        useFocusTrap(saveModalRef,showSaveModal,handleSetShowSaveModalToFalse);
        const executeSaveFile=()=>window.AlloModules.PhaseKHelpers.executeSaveFile(makeSaveDeps({saveFileName,saveType,saveEncryptPassword,setShowSaveModal,t}));
        return <>${saveMarkup}</>;
      }
      ReactDOM.createRoot(document.getElementById('root')).render(<Fixture/>);
    `, { loader: 'jsx', target: 'es2020' }).code });
    await expect(page.locator('[data-save-project-backdrop]')).toBeVisible();
  }
  return errors;
}

for (const width of [1440, 390]) {
  test(`Library actions and Organize retain resource identity at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = await boot(page, 'history');
    const rows = page.getByRole('listitem');
    await expect(page.locator('[data-help-key="history_rename_btn"]')).toHaveCount(0);
    await expect(page.locator('[draggable="true"]')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('library-default.png'), fullPage: true });
    const actions = rows.nth(1).getByRole('button', { name: /^Actions:/ });
    await actions.focus(); await page.keyboard.press('Enter');
    await expect(rows.nth(1).locator('[data-help-key="history_rename_btn"]')).toBeVisible();
    await rows.nth(1).locator('[data-help-key="history_rename_btn"]').click();
    await rows.nth(1).locator('input').fill('Habitat comparison');
    await rows.nth(1).getByRole('button', { name: 'Save', exact: true }).click();
    await expect(rows.nth(1)).toContainText('Habitat comparison');
    await rows.nth(1).locator('[data-help-key="history_move_to_unit_btn"]').click();
    await page.getByRole('menuitem', { name: 'Science', exact: true }).click();
    await expect(rows.nth(1)).toContainText('Science');
    await page.keyboard.press('Escape');
    await expect(rows.nth(1).getByRole('button', { name: /^Actions:/ })).toBeFocused();
    await page.getByRole('button', { name: 'Organize', exact: true }).click();
    await expect(page.locator('[draggable="true"]')).toHaveCount(3);
    await rows.nth(1).locator('[data-help-key="history_item_drag"]').focus();
    await page.keyboard.press('Alt+ArrowUp');
    await expect(rows.first()).toContainText('Habitat comparison');
    await page.locator('input[type="search"]').fill('Habitat');
    await expect(page.locator('[data-help-key="history_move_down_btn"]')).toBeDisabled();
    await expect(page.locator('[draggable="true"]')).toHaveCount(0);
    await page.locator('input[type="search"]').fill('');
    await page.getByRole('button', { name: 'Done organizing', exact: true }).click();
    await rows.first().getByRole('button', { name: /^Actions:/ }).click();
    await rows.first().locator('[data-help-key="resource_delete_button"]').click();
    await expect(rows).toHaveCount(2);
    expect(await page.evaluate(() => (window as any).__events)).toEqual([
      ['unit', 'artifact-resource-1', 'unit-a'], ['reorder', 'artifact-resource-1', 'up', 'artifact-resource-0'], ['delete', 'shared-public-id', 'artifact-resource-1']
    ]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });

  test(`Project settings prioritize lesson controls at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = await boot(page, 'settings', { connected: true });
    await expect(page.getByRole('group', { name: 'Starting point' }).first()).toBeInViewport();
    await expect(page.locator('#school-rewards-portal-url')).not.toBeVisible();
    const closeGeometry = await page.locator('#project-settings-dialog header button').evaluate(button => {
      const control = button.getBoundingClientRect(), dialog = button.closest('[role="dialog"]')!.getBoundingClientRect();
      return { inside: control.left >= dialog.left && control.right <= dialog.right && control.top >= dialog.top && control.bottom <= dialog.bottom, width: control.width, height: control.height };
    });
    expect(closeGeometry.inside).toBe(true);
    expect(closeGeometry.width).toBeGreaterThanOrEqual(44);
    expect(closeGeometry.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: info.outputPath('settings-default.png') });
    // Closed disclosure controls must never receive keyboard focus.
    for (let step = 0; step < 18; step++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => {
        const element = document.activeElement as HTMLElement;
        return !!element?.getClientRects().length && !!element.closest('#project-settings-dialog');
      })).toBe(true);
    }
    await page.locator('#project-school-connections > summary').click();
    await expect(page.getByRole('button', { name: 'Open district portal', exact: true })).toBeVisible();
    await expect(page.locator('#principal-evaluation-portal-url')).not.toBeVisible();
    await page.locator('[aria-labelledby="principal-evaluation-title"] > details > summary').click();
    await page.locator('#principal-evaluation-portal-url').fill('https://script.google.com/macros/s/updated/exec');
    await page.locator('[aria-labelledby="principal-evaluation-title"]').getByRole('button', { name: 'Update connection' }).click();
    expect(await page.evaluate(() => (window as any).__events)).toEqual([['save-evaluation', 'https://script.google.com/macros/s/updated/exec']]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('#opener')).toBeFocused();
    expect(errors).toEqual([]);
  });

  test(`Save dialog retains filename and password after stray clicks at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = await boot(page, 'save');
    const name = page.locator('[data-autofocus]');
    await expect(name).toBeFocused();
    await name.fill('Ecosystems lesson');
    await page.locator('input[type="password"]').fill('draft-password');
    await page.mouse.click(2, 2);
    await expect(name).toHaveValue('Ecosystems lesson');
    await expect(page.locator('input[type="password"]')).toHaveValue('draft-password');
    await name.focus();
    const inputBox = await name.boundingBox();
    await page.mouse.move(inputBox!.x + 20, inputBox!.y + 20);
    await page.mouse.down(); await page.mouse.move(2, 2); await page.mouse.up();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('input[type="password"]').fill('');
    await page.screenshot({ path: info.outputPath('save-dialog.png') });
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('Ecosystems lesson.json');
    const file = await download.path();
    const json = JSON.parse(fs.readFileSync(file!, 'utf8'));
    expect(JSON.stringify(json)).toContain('lesson-1');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('Save can still be deliberately cancelled without a download', async ({ page }) => {
  for (const method of ['Escape', 'Cancel', 'Close']) {
    const errors = await boot(page, 'save', { student: true });
    let downloads = 0; const count = () => downloads++;
    page.on('download', count);
    await page.locator('[data-autofocus]').fill('Student work');
    await page.mouse.click(2, 2);
    await expect(page.getByRole('dialog')).toBeVisible();
    if (method === 'Escape') await page.keyboard.press('Escape');
    else await page.getByRole('button', { name: method === 'Close' ? /Close.*save/i : 'Cancel', exact: method !== 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(downloads).toBe(0); expect(errors).toEqual([]);
    page.off('download', count);
  }
});

test('School connections remain unavailable in family mode', async ({ page }) => {
  await boot(page, 'settings', { parent: true });
  await expect(page.locator('#project-school-connections')).toHaveCount(0);
});

test('Student resource order remains keyboard accessible', async ({ page }) => {
  const errors = await boot(page, 'history', { student: true });
  await page.getByRole('button', { name: 'Organize', exact: true }).click();
  await page.getByRole('listitem').nth(1).locator('[data-help-key="history_item_drag"]').focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(page.getByRole('listitem').first()).toContainText('Compare two habitats');
  expect(errors).toEqual([]);
});
