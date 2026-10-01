// Real Chromium + shipped document store/helper/panels, with injected device faults.
// Uses real IndexedDB/localStorage and TXT extraction. No AI provider is contacted.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const { chromium } = require(path.join(root, 'node_modules/@playwright/test'));
const esbuild = require(path.join(root, 'node_modules/esbuild'));
const passage = 'Clouds form when water vapor cools and condenses on tiny dust particles. Small droplets gather to form visible clouds. Heavier drops fall as rain.';
const upload = name => ({ name, mimeType: 'text/plain', buffer: Buffer.from('# Page 7\n\n' + passage) });
const moduleNames = ['stem_lab/stem_lumen_evidence.js', 'stem_lab/stem_lumen_documents.js', 'own_sources_module.js', 'view_misc_panels_module.js', 'quickstart_module.js'];
const moduleSnapshots = Object.fromEntries(moduleNames.map(name => [name, fs.readFileSync(path.join(root, name), 'utf8')]));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const moduleHashes = Object.fromEntries(moduleNames.map(name => [name, hash(moduleSnapshots[name])]));
const result = { passed: false, browser: 'Chromium (headless)', moduleHashes, checks: [], pageErrors: [], layouts: [] };

async function createPage(browser, runtime, { seed = [], readFault = false, wizard = false, useOwnSources = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', error => result.pageErrors.push(error.message));
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Document storage reliability</title></head><body><main id="root" style="max-width:700px;margin:20px auto;padding:12px"></main></body></html>' }));
  await page.goto('https://document-reliability.test/');
  const cssDir = path.join(root, 'desktop/web-app/public/app/static/css');
  const cssName = fs.readdirSync(cssDir).find(name => /^main\.[^.]+\.css$/.test(name));
  await page.addStyleTag({ path: path.join(cssDir, cssName) });
  await page.addScriptTag({ content: runtime });
  await page.evaluate(strings => {
    window.strings = strings;
    window.t = (key, vars = {}) => {
      const value = key.split('.').reduce((obj, part) => obj && obj[part], window.strings) || key;
      return String(value).replace(/\{(\w+)\}/g, (all, name) => name in vars ? vars[name] : all);
    };
    window.AlloLanguageContext = React.createContext({ t });
  }, JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8')));
  for (const name of moduleNames) {
    await page.addScriptTag({ content: moduleSnapshots[name] });
  }
  await page.evaluate(async ({ seed, readFault, wizard, useOwnSources, passage }) => {
    window.faults = { read: false, writes: 0, rejectFromWrite: Infinity, failFallback: false, delayNextLibraryRead: false };
    window.refreshPending = false;
    window.generationCalls = 0;
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('document-reliability', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('library');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const device = {
      get: async key => {
        if (faults.read) throw new Error('Injected device read failure');
        return new Promise((resolve, reject) => {
          const transaction = database.transaction('library', 'readonly');
          const request = transaction.objectStore('library').get(key);
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => reject(request.error);
        });
      },
      set: async (key, value) => {
        faults.writes++;
        if (faults.writes >= faults.rejectFromWrite) return false;
        return new Promise((resolve, reject) => {
          const transaction = database.transaction('library', 'readwrite');
          transaction.objectStore('library').put(value, key);
          transaction.oncomplete = () => resolve(true);
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error || new Error('IndexedDB write aborted'));
        });
      },
    };
    window.AlloModules.UtilsPure = { ...(window.AlloModules.UtilsPure || {}), storageDB: device };
    window.libraryKey = LumenEvidence.storageKey(LumenEvidence.readingScope({}));
    const nativeSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (faults.failFallback && key === libraryKey) throw new Error('Injected fallback write failure');
      return nativeSet.call(this, key, value);
    };
    const api = window.AlloOwnSources;
    for (const name of seed) {
      const saved = await api.importFiles([new File(['# Page 7\n\n' + passage], name, { type: 'text/plain' })], {});
      if (saved.imported !== 1) throw new Error('Seeding failed: ' + JSON.stringify(saved));
    }
    window.seededIds = (await api.readLibrary({})).sources.map(row => row.id);
    const realReadLibrary = api.readLibrary;
    api.readLibrary = async ctx => {
      if (faults.delayNextLibraryRead) {
        faults.delayNextLibraryRead = false;
        window.refreshPending = true;
        await new Promise(resolve => { window.releaseRefresh = () => { window.refreshPending = false; resolve(); }; });
      }
      return realReadLibrary(ctx);
    };
    faults.read = readFault;
    const noop = () => {};
    function Demo() {
      const [useOwn, setUseOwn] = React.useState(useOwnSources);
      const [web, setWeb] = React.useState(true);
      const [selected, setSelected] = React.useState(seededIds.length ? seededIds.slice(0, 1) : null);
      const [documentsOnly, setDocumentsOnly] = React.useState(false);
      window.smokeState = { useOwnSources: useOwn, includeSourceCitations: web, selectedOwnSourceIds: selected, documentsOnly };
      if (wizard) return React.createElement(AlloModules.QuickStartWizard, {
        isOpen: true, onClose: noop, onComplete: data => { window.completedWizard = data; },
        onUpload: noop, onLookupStandards: null, onCallGemini: async () => '', onWebSearch: null,
        addToast: noop, isParentMode: false, isIndependentMode: false, isHelpMode: false,
        setIsHelpMode: noop, initialSourceMode: 'generate', onInitialModeConsumed: noop,
      });
      return React.createElement(AlloModules.SourceGenPanel, {
        addToast: noop, aiStandardQuery: '', aiStandardRegion: '', gradeLevel: '5th Grade',
        handleAddStandard: noop, handleFindStandards: noop, handleGenerateSource: () => { window.generationCalls++; }, handleRemoveStandard: noop,
        handleSetStandardModeToAi: noop, handleSetStandardModeToManual: noop, includeSourceCitations: web,
        isFindingStandards: false, isGeneratingSource: false, isIndependentMode: false, setAiStandardQuery: noop,
        setAiStandardRegion: noop, setIncludeSourceCitations: setWeb, setSourceCustomInstructions: noop,
        setSourceLength: noop, setSourceLevel: noop, setSourceTone: noop, setSourceTopic: noop,
        setSourceVocabulary: noop, setStandardInputValue: noop, setTargetStandards: noop, showSourceGen: true,
        sourceCustomInstructions: '', sourceLength: '250', sourceLevel: '5th Grade', sourceTone: 'Informative',
        sourceTopic: 'Water cycle', sourceVocabulary: '', standardInputValue: '', standardMode: 'manual',
        studentInterests: [], suggestedStandards: [], t, targetStandards: [],
        useOwnSources: useOwn, setUseOwnSources: setUseOwn, selectedOwnSourceIds: selected, setSelectedOwnSourceIds: setSelected,
        documentsOnly, setDocumentsOnly, generationStep: '',
      });
    }
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Demo));
  }, { seed, readFault, wizard, useOwnSources, passage });
  return page;
}

async function checkLayout(page, label) {
  const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  result.layouts.push({ label, ...layout });
  assert.equal(layout.scrollWidth, layout.width, label + ' must fit the 390px viewport');
}

(async () => {
  const runtime = esbuild.buildSync({
    stdin: { contents: 'window.React = require("react"); window.ReactDOM = require("react-dom/client");', resolveDir: path.join(root, 'desktop/web-app') },
    bundle: true, write: false, platform: 'browser', define: { 'process.env.NODE_ENV': '"production"' },
  }).outputFiles[0].text;
  const browser = await chromium.launch({ headless: true });
  let activePage;
  try {
    const recovery = activePage = await createPage(browser, runtime, { seed: ['Saved cloud notes.txt', 'Other notes.txt'], readFault: true, useOwnSources: true });
    const retry = recovery.getByRole('button', { name: 'Retry loading documents', exact: true });
    await retry.waitFor();
    assert.equal(await recovery.getByText('No imported documents yet.', { exact: false }).count(), 0);
    const selectedBefore = await recovery.evaluate(() => smokeState.selectedOwnSourceIds);
    assert.equal(await recovery.evaluate(() => smokeState.useOwnSources), true);
    assert.equal(await recovery.locator('#includeCitations').isChecked(), true);
    await recovery.locator('#documentsOnly').check();
    assert.equal(await recovery.locator('[data-help-key="source_generate_button"]').isDisabled(), true);
    await recovery.locator('#allo-source-topic').press('Enter');
    assert.equal(await recovery.evaluate(() => generationCalls), 0);
    await recovery.locator('#includeCitations').check();
    assert.equal(await recovery.locator('[data-help-key="source_generate_button"]').isEnabled(), true);
    result.checks.push('Documents-only generation cannot bypass a failed library read with Enter; ordinary web generation remains available.');
    await retry.scrollIntoViewIfNeeded();
    await recovery.screenshot({ path: path.join(__dirname, 'mobile-read-failure.png') });
    await recovery.evaluate(() => { faults.read = false; });
    await retry.focus();
    await recovery.keyboard.press('Enter');
    await recovery.getByText('Manage my documents (2)', { exact: true }).waitFor();
    assert.deepEqual(await recovery.evaluate(() => smokeState.selectedOwnSourceIds), selectedBefore);
    assert.equal(await recovery.locator('#useOwnSources').isChecked(), true);
    await checkLayout(recovery, 'source recovery');
    result.checks.push('Initial IndexedDB read failure shows Retry instead of empty-library copy; keyboard retry restores saved files and preserves selection/web settings.');

    await recovery.getByText('Manage my documents (2)', { exact: true }).click();
    const beforeFailure = await recovery.evaluate(async () => ({ rows: (await AlloOwnSources.readLibrary({})).sources, writes: faults.writes }));
    await recovery.evaluate(() => { faults.read = true; });
    await recovery.locator('#ownSourcesImport').setInputFiles(upload('Blocked new file.txt'));
    await retry.waitFor();
    await recovery.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Retry loading documents' && !button.disabled));
    assert.equal(await recovery.evaluate(() => faults.writes), beforeFailure.writes);
    assert.equal(await recovery.getByText('Saved cloud notes.txt', { exact: true }).count(), 1);
    assert.deepEqual(await recovery.evaluate(() => smokeState.selectedOwnSourceIds), selectedBefore);
    await recovery.evaluate(() => { faults.read = false; });
    await retry.focus(); await recovery.keyboard.press('Enter');
    await retry.waitFor({ state: 'detached' });
    assert.deepEqual(await recovery.evaluate(async () => (await AlloOwnSources.readLibrary({})).sources), beforeFailure.rows);
    result.checks.push('A failed read during import writes nothing, keeps the previously displayed documents/selections, and recovers through Retry.');
    await recovery.close();

    const firstImport = activePage = await createPage(browser, runtime);
    await firstImport.getByText('No imported documents yet.', { exact: false }).waitFor();
    await firstImport.evaluate(() => { faults.delayNextLibraryRead = true; });
    await firstImport.locator('#ownSourcesImport').setInputFiles(upload('First import.txt'));
    await firstImport.waitForFunction(() => refreshPending === true);
    await firstImport.waitForTimeout(100);
    assert.equal(await firstImport.evaluate(() => smokeState.useOwnSources), true);
    assert.equal(await firstImport.evaluate(() => smokeState.selectedOwnSourceIds.length), 1);
    assert.equal(await firstImport.locator('#includeCitations').isChecked(), true);
    await firstImport.locator('#allo-source-topic').press('Enter');
    assert.equal(await firstImport.evaluate(() => generationCalls), 0);
    await firstImport.evaluate(() => releaseRefresh());
    await firstImport.locator('#useOwnSources').waitFor();
    assert.equal(await firstImport.locator('#useOwnSources').isChecked(), true);
    result.checks.push('First import stays enabled and selected while its library refresh is deliberately delayed.');

    await firstImport.evaluate(() => { faults.rejectFromWrite = faults.writes + 2; faults.failFallback = true; });
    await firstImport.locator('#ownSourcesImport').setInputFiles([upload('Successfully saved.txt'), upload('Cannot save.txt')]);
    const summary = firstImport.getByText('Saved 1 document(s), including 0 replacement(s). Skipped 0; failed 1.', { exact: true });
    await summary.waitFor();
    assert.match(await firstImport.locator('body').textContent(), /Cannot save\.txt.*could not be saved/s);
    const retained = await firstImport.evaluate(async () => (await AlloOwnSources.readLibrary({})).sources.map(row => row.title));
    assert.deepEqual(retained, ['First import.txt', 'Successfully saved.txt']);
    assert.equal(await firstImport.locator('#useOwnSources').isChecked(), true);
    await summary.scrollIntoViewIfNeeded();
    await firstImport.screenshot({ path: path.join(__dirname, 'mobile-partial-import.png') });
    await checkLayout(firstImport, 'partial import');
    result.checks.push('A two-file import with its second IndexedDB/fallback write rejected reports one saved and one failed, retaining the saved file.');
    await firstImport.close();

    const wizard = activePage = await createPage(browser, runtime, { seed: ['Wizard notes.txt'], readFault: true, wizard: true });
    const wizardRetry = wizard.getByRole('button', { name: 'Retry loading documents', exact: true });
    await wizardRetry.waitFor();
    assert.equal(await wizard.getByText('No imported documents yet.', { exact: false }).count(), 0);
    await wizard.evaluate(() => { faults.read = false; });
    await wizardRetry.focus(); await wizard.keyboard.press('Enter');
    await wizard.getByText('Manage my documents (1)', { exact: true }).waitFor();
    await wizard.locator('#wiz-own-sources').check();
    assert.equal(await wizard.locator('#wiz-own-sources').isChecked(), true);
    await wizard.getByText('Manage my documents (1)', { exact: true }).scrollIntoViewIfNeeded();
    await wizard.screenshot({ path: path.join(__dirname, 'mobile-wizard-recovered.png') });
    await checkLayout(wizard, 'Quick Start recovery');
    result.checks.push('Quick Start also exposes the read failure and recovers its saved document through keyboard Retry.');

    assert.deepEqual(result.pageErrors, []);
    result.afterModuleHashes = Object.fromEntries(moduleNames.map(name => [name, hash(fs.readFileSync(path.join(root, name), 'utf8'))]));
    result.publicModuleHashes = Object.fromEntries(moduleNames.map(name => [name, hash(fs.readFileSync(path.join(root, 'desktop/web-app/public', name), 'utf8'))]));
    result.changedDuringRun = moduleNames.filter(name => result.afterModuleHashes[name] !== moduleHashes[name]);
    result.publicMirrorDifferences = moduleNames.filter(name => result.publicModuleHashes[name] !== moduleHashes[name]);
    assert.deepEqual(result.changedDuringRun, [], 'Tested modules must remain current throughout the run');
    assert.deepEqual(result.publicMirrorDifferences, [], 'Public modules must match the tested versions');
    result.passed = true;
    result.limitations = ['The fixture mounts shipped panels with local React state and fault-injected storage adapters over real Chromium IndexedDB/localStorage.', 'No full-host boot, AI generation, or live web-provider request was tested.'];
    fs.writeFileSync(path.join(__dirname, 'browser-reliability-result.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    result.error = error.stack || String(error);
    if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(__dirname, 'browser-failure.png') }).catch(() => {});
    fs.writeFileSync(path.join(__dirname, 'browser-reliability-result.json'), JSON.stringify(result, null, 2) + '\n');
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
