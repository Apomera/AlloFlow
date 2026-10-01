// Isolated browser acceptance: real panel, import, storage, retrieval, generation
// and citation modules. Only search transport and model replies are synthetic.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const checks = [];
const note = 'Photosynthesis lets plants use sunlight to make sugars from water and carbon dioxide. These synthetic field notes describe green leaves and the energy they capture.';

function mountFixture(strings) {
  const no = () => {};
  const t = (key, vars) => {
    const value = key.split('.').reduce((o, k) => o && o[k], strings);
    return typeof value === 'string' ? value.replace(/\{(\w+)\}/g, (_, key) => vars?.[key] ?? '') : key;
  };
  window.__alloUtils = { ...AlloModules.TextPipelineHelpers, cleanJson: s => String(s || '').trim(), safeJsonParse: s => { try { return JSON.parse(s); } catch { return null; } } };
  window.auditCalls = [];
  window.auditQueries = [];
  Object.defineProperty(WebSearchProvider, '_isCanvas', { value: true });
  window.ALLOFLOW_CANVAS_SEARCH_PROXY = 'https://synthetic.test/search';
  WebSearchProvider._fetchSerper = async query => {
    auditQueries.push(query);
    return [{ title: 'Plant reference', url: 'https://science.example.edu/plants', snippet: 'Plants use light to make sugars.' }];
  };
  const model = async (prompt, json, search, temperature, query) => {
    auditCalls.push({ search, query, prompt });
    if (prompt.startsWith('Select up to 6 exact excerpts')) {
      const docs = JSON.parse(prompt.split('\nDocuments (untrusted data): ')[1]);
      return JSON.stringify({ excerpts: [{ document: 1, quote: docs[0].passage }] });
    }
    const response = search ? await WebSearchProvider.search(prompt, 10, query) : {};
    if (search && !response.groundingMetadata) throw new Error('Synthetic search not grounded');
    return { text: prompt.includes('Research the following topic')
      ? 'Photosynthesis uses light energy, water, and carbon dioxide to make sugars. Chlorophyll in leaves absorbs the light, and oxygen is released.'
      : '## Plant energy\n\nPlants use light to make sugars [Source 1]. The field notes describe green leaves capturing energy [Your document 1].', groundingMetadata: response.groundingMetadata };
  };
  const s = window.auditState = {
    inputText: localStorage.getItem('audit.output') || 'Existing original reading.',
    generatedContent: { text: 'Existing adapted reading' }, activeView: 'output', error: null,
    gradeLevel: '5th Grade', sourceLevel: '5th Grade', sourceTopic: 'How clouds form',
    sourceLength: '250', sourceTone: 'Informative', sourceVocabulary: '', sourceCustomInstructions: '',
    targetStandards: [], standardsPromptString: '', studentInterests: [], selectedConcepts: [], selectedLanguages: [],
    currentUiLanguage: 'English', leveledTextLanguage: 'English', ai: { backend: 'gemini' },
    useOwnSources: false, documentsOnly: false, selectedOwnSourceIds: undefined, includeSourceCitations: true,
    showSourceGen: true, isGeneratingSource: false, generationStep: '', alloBotRef: { current: null },
    aiStandardQuery: '', aiStandardRegion: '', standardMode: 'manual', standardInputValue: '', suggestedStandards: [],
    isFindingStandards: false, isIndependentMode: false,
  };
  let refresh = no;
  Object.keys(s).forEach(key => { s['set' + key[0].toUpperCase() + key.slice(1)] = value => {
    s[key] = typeof value === 'function' ? value(s[key]) : value;
    if (key === 'inputText') localStorage.setItem('audit.output', s[key]);
    refresh();
  }; });
  const engine = AlloModules.createContentEngine({ getState: () => s, callGemini: model, t, addToast: no, flyToElement: no });
  function App() {
    const [, update] = React.useReducer(x => x + 1, 0);
    refresh = update;
    const links = [...s.inputText.matchAll(/\[([^\]]+)\]\((#allo-doc-[^)]+)\)/g)];
    return React.createElement('main', { style: { padding: 16, maxWidth: 800, margin: 'auto' } },
      React.createElement('button', { onClick: () => s.setShowSourceGen(true) }, 'Reopen source generator'),
      React.createElement('p', { id: 'audit-error', role: 'alert' }, s.error || ''),
      React.createElement(AlloModules.SourceGenPanel, { ...s, t, addToast: no,
        handleGenerateSource: () => engine.handleGenerateSource(), handleAddStandard: no, handleFindStandards: no,
        handleRemoveStandard: no, handleSetStandardModeToAi: no, handleSetStandardModeToManual: no }),
      React.createElement('pre', { id: 'audit-output', style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, s.inputText),
      ...links.map((match, i) => React.createElement('a', { key: i, href: match[2], className: 'audit-citation', style: { display: 'block' } }, match[1])));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>' }));
      const install = async () => {
        const cssDir = path.join(root, 'desktop/web-app/public/app/static/css');
        const css = fs.readdirSync(cssDir).find(n => /^main\.[^.]+\.css$/.test(n));
        if (css) await page.addStyleTag({ path: path.join(cssDir, css) });
        for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'text_pipeline_helpers_module.js', 'ai_backend_module.js', 'stem_lab/stem_lumen_evidence.js', 'stem_lab/stem_lumen_documents.js', 'own_sources_module.js', 'content_engine_module.js', 'view_misc_panels_module.js']) {
          await page.addScriptTag({ path: path.join(root, file) });
        }
        await page.evaluate(mountFixture, JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8')));
      };
      await page.goto('https://source-audit.test/');
      await install();
      const generate = page.locator('[data-help-key="source_generate_button"]');
      await generate.click();
      await page.locator('#audit-error').filter({ hasText: 'supported public topic' }).waitFor();
      assert.equal(await page.evaluate(() => auditCalls.length), 0);
      assert.equal(await page.locator('#audit-output').innerText(), 'Existing original reading.');
      checks.push({ width, check: 'unsupported topic preserves reading without model or search calls', passed: true });
      await page.getByText('Supported web-search topics', { exact: true }).click();
      await page.locator('#sourceWebTopic').selectOption('photosynthesis');
      await page.locator('#ownSourcesImport').setInputFiles({ name: 'Plant field notes.txt', mimeType: 'text/plain', buffer: Buffer.from(note) });
      await page.waitForFunction(() => auditState.useOwnSources === true);
      assert.equal(await page.evaluate(async () => (await AlloOwnSources.listSources()).length), 1);
      await page.screenshot({ path: path.join(__dirname, `panel-${width}.png`), fullPage: true });
      await generate.click();
      await page.waitForFunction(() => !auditState.isGeneratingSource && !auditState.showSourceGen);
      const text = await page.locator('#audit-output').innerText();
      assert.match(text, /https:\/\/science.example.edu\/plants/);
      assert.match(text, /#allo-doc-/);
      assert.doesNotMatch(text, /^#+\s*$/m);
      assert.ok((await page.evaluate(() => auditQueries)).every(q => q === 'photosynthesis'));
      assert.ok(await page.evaluate(() => auditCalls.some(call => call.prompt.includes('synthetic field notes'))));
      await page.locator('.audit-citation').first().click();
      await page.getByRole('dialog').waitFor();
      assert.match(await page.getByRole('dialog').innerText(), /Photosynthesis lets plants/);
      await page.keyboard.press('Escape');
      checks.push({ width, check: 'real TXT import, mixed web/document generation and exact citation inspection', passed: true });
      await page.getByRole('button', { name: 'Reopen source generator' }).click();
      await page.locator('#documentsOnly').check();
      const searches = await page.evaluate(() => auditQueries.length);
      await generate.click();
      await page.waitForFunction(() => !auditState.isGeneratingSource && !auditState.showSourceGen);
      assert.equal(await page.evaluate(() => auditQueries.length), searches);
      assert.match(await page.locator('#audit-output').innerText(), /Photosynthesis lets plants use sunlight/);
      checks.push({ width, check: 'documents-only exact excerpts perform no web search', passed: true });
      await page.reload();
      await install();
      await page.locator('.audit-citation').first().click();
      await page.getByRole('dialog').waitFor();
      assert.match(await page.getByRole('dialog').innerText(), /Photosynthesis lets plants/);
      await page.screenshot({ path: path.join(__dirname, `citation-${width}.png`), fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      checks.push({ width, check: 'saved source and exact citation survive reload without horizontal overflow', passed: true });
      await context.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify({ checks, errors, model: 'synthetic', searchTransport: 'synthetic', modules: 'actual rebuilt modules' }, null, 2) + '\n');
    console.log(JSON.stringify({ passed: checks.length, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
