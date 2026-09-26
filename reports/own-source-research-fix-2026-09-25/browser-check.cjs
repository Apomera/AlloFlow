// Isolated browser check: real document parsing/storage and shipped panel.
// No live account or AI service is used.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const { chromium } = require(path.join(root, 'node_modules/@playwright/test'));
const esbuild = require(path.join(root, 'node_modules/esbuild'));

(async () => {
  const runtime = esbuild.buildSync({
    stdin: {
      contents: 'window.React = require("react"); window.ReactDOM = require("react-dom/client");',
      resolveDir: path.join(root, 'desktop/web-app'),
    }, bundle: true, write: false, platform: 'browser', define: { 'process.env.NODE_ENV': '"production"' },
  }).outputFiles[0].text;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 820, height: 1200 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><title>Research controls regression</title></head><body><main id="root" style="max-width:700px;margin:20px auto"></main></body></html>' }));
    await page.goto('https://research-controls.test/');
    await page.addStyleTag({ path: path.join(root, 'desktop/web-app/public/app/static/css/main.c2930cf0.css') });
    await page.addScriptTag({ content: runtime });
    await page.evaluate((strings) => { window.strings = strings; }, JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8')));
    for (const file of ['stem_lab/stem_lumen_evidence.js', 'stem_lab/stem_lumen_documents.js', 'own_sources_module.js', 'view_misc_panels_module.js']) {
      await page.addScriptTag({ path: path.join(root, file) });
    }
    await page.evaluate(async () => {
      const E = window.LumenEvidence;
      window.studyStore = E.createProjectStore({ localStorage, scope: E.readingScope({}) });
      await window.studyStore.save(E.connectReadingSource(E.makeProject({}), {
        title: 'Adapted reading', text: 'An earlier AI draft about water evaporating and clouds forming.', anchor: { kind: 'adapted' },
      }));
      const noop = () => {};
      const t = (key, vars = {}) => {
        let value = key.split('.').reduce((obj, part) => obj && obj[part], window.strings) || key;
        return String(value).replace(/\{(\w+)\}/g, (all, name) => name in vars ? vars[name] : all);
      };
      function Demo() {
        const [useOwnSources, setUseOwnSources] = React.useState(false);
        const [includeSourceCitations, setIncludeSourceCitations] = React.useState(true);
        return React.createElement(window.AlloModules.SourceGenPanel, {
          addToast: noop, aiStandardQuery: '', aiStandardRegion: '', gradeLevel: '5th Grade',
          handleAddStandard: noop, handleFindStandards: noop, handleGenerateSource: noop, handleRemoveStandard: noop,
          handleSetStandardModeToAi: noop, handleSetStandardModeToManual: noop, includeSourceCitations,
          isFindingStandards: false, isGeneratingSource: false, isIndependentMode: false, setAiStandardQuery: noop,
          setAiStandardRegion: noop, setIncludeSourceCitations, setSourceCustomInstructions: noop,
          setSourceLength: noop, setSourceLevel: noop, setSourceTone: noop, setSourceTopic: noop,
          setSourceVocabulary: noop, setStandardInputValue: noop, setTargetStandards: noop, showSourceGen: true,
          sourceCustomInstructions: '', sourceLength: '250', sourceLevel: '5th Grade', sourceTone: 'Informative',
          sourceTopic: 'How clouds form', sourceVocabulary: '', standardInputValue: '', standardMode: 'manual',
          studentInterests: [], suggestedStandards: [], t, targetStandards: [], useOwnSources, setUseOwnSources,
        });
      }
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Demo));
    });
    await page.getByText('No imported documents yet.', { exact: false }).waitFor();
    assert.equal(await page.getByText('Adapted reading', { exact: true }).count(), 0);
    await page.locator('#ownSourcesImport').setInputFiles({
      name: 'Cloud field notes.txt', mimeType: 'text/plain',
      buffer: Buffer.from('Clouds form when water vapor cools and condenses on tiny dust particles. Small droplets gather to form visible clouds. Heavier drops fall as rain.'),
    });
    await page.locator('#useOwnSources').waitFor();
    await page.locator('#useOwnSources').check();
    await page.getByText('Manage my documents (1)', { exact: true }).click();
    const imported = await page.evaluate(async () => {
      const project = await AlloOwnSources.loadProject({});
      return { count: project.sources.length, hits: LumenEvidence.retrieve(project, 'water vapor clouds', { forAI: true }).length };
    });
    assert.equal(imported.count, 1);
    assert.ok(imported.hits > 0);
    await page.getByRole('button', { name: 'Exclude', exact: true }).click();
    await page.getByText('0 included for research.', { exact: false }).waitFor();
    assert.equal(await page.locator('#useOwnSources').isChecked(), false);
    assert.equal(await page.locator('#includeCitations').isChecked(), true);
    await page.locator('#includeCitations').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(__dirname, 'excluded-document.png') });
    await page.getByRole('button', { name: 'Include', exact: true }).click();
    await page.getByText('1 included for research.', { exact: false }).waitFor();
    await page.locator('#useOwnSources').check();
    await page.locator('#includeCitations').uncheck();
    assert.equal(await page.locator('#useOwnSources').isChecked(), true);
    await page.getByRole('button', { name: /Remove.*Cloud field notes/ }).click();
    await page.getByRole('button', { name: /Remove.*Cloud field notes/ }).last().click();
    await page.waitForFunction(async () => (await AlloOwnSources.listSources({})).length === 0);
    const saved = await page.evaluate(async () => (await studyStore.load()).sources.map((source) => source.title));
    assert.deepEqual(saved, ['Adapted reading']);
    assert.deepEqual(errors, []);
    const result = { passed: true, checks: ['generated reading excluded and preserved', 'real TXT import and retrieval', 'Exclude/Include persistence', 'independent document and web toggles', 'inline Remove confirmation'], pageErrors: errors };
    fs.writeFileSync(path.join(__dirname, 'browser-result.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
