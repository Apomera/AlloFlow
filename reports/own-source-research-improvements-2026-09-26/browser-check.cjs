// Chromium smoke of the shipped panel, document adapter/store and citation viewer.
// Generation status is simulated. No live provider, account or network is used.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const { chromium } = require(path.join(root, 'node_modules/@playwright/test'));
const esbuild = require(path.join(root, 'node_modules/esbuild'));

const originalPassage = 'Clouds form when water vapor cools and condenses on tiny dust particles. Small droplets gather to form visible clouds. Heavier drops fall as rain.';
const secondPassage = 'Cloud observations help scientists study the water cycle. Water evaporates from lakes, rises into the atmosphere, and condenses as it cools.';
const replacementPassage = 'Clouds contain many tiny water droplets or ice crystals. Condensation occurs when water vapor cools, and larger droplets can fall as precipitation.';
const upload = (passage, page = 7) => ({
  name: 'Cloud field notes.txt', mimeType: 'text/plain',
  buffer: Buffer.from('# Page ' + page + '\n\n' + passage),
});

(async () => {
  const runtime = esbuild.buildSync({
    stdin: {
      contents: 'window.React = require("react"); window.ReactDOM = require("react-dom/client");',
      resolveDir: path.join(root, 'desktop/web-app'),
    }, bundle: true, write: false, platform: 'browser', define: { 'process.env.NODE_ENV': '"production"' },
  }).outputFiles[0].text;
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  const errors = [];
  let page;
  try {
    page = await browser.newPage({ viewport: { width: 820, height: 1200 } });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Document research smoke</title></head><body><main id="root" style="max-width:700px;margin:20px auto;padding:12px"></main><section id="evidence-test" style="max-width:700px;margin:20px auto;padding:12px"></section></body></html>',
    }));
    await page.goto('https://research-improvements.test/');
    const cssDir = path.join(root, 'desktop/web-app/public/app/static/css');
    const cssName = fs.readdirSync(cssDir).find((name) => /^main\.[^.]+\.css$/.test(name));
    if (!cssName) throw new Error('The built app stylesheet is missing');
    await page.addStyleTag({ path: path.join(cssDir, cssName) });
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
        const [selectedOwnSourceIds, setSelectedOwnSourceIds] = React.useState(null);
        const [documentsOnly, setDocumentsOnly] = React.useState(false);
        const [isGeneratingSource, setIsGeneratingSource] = React.useState(false);
        const [generationStep, setGenerationStep] = React.useState('');
        window.smokeState = { useOwnSources, includeSourceCitations, selectedOwnSourceIds, documentsOnly, isGeneratingSource, generationStep };
        window.smokeResearch = () => { setGenerationStep(t('status_steps.researching_topic')); setIsGeneratingSource(true); };
        window.smokeStop = () => { setIsGeneratingSource(false); setGenerationStep(''); };
        return React.createElement(window.AlloModules.SourceGenPanel, {
          addToast: noop, aiStandardQuery: '', aiStandardRegion: '', gradeLevel: '5th Grade',
          handleAddStandard: noop, handleFindStandards: noop, handleGenerateSource: window.smokeResearch, handleRemoveStandard: noop,
          handleSetStandardModeToAi: noop, handleSetStandardModeToManual: noop, includeSourceCitations,
          isFindingStandards: false, isGeneratingSource, isIndependentMode: false, setAiStandardQuery: noop,
          setAiStandardRegion: noop, setIncludeSourceCitations, setSourceCustomInstructions: noop,
          setSourceLength: noop, setSourceLevel: noop, setSourceTone: noop, setSourceTopic: noop,
          setSourceVocabulary: noop, setStandardInputValue: noop, setTargetStandards: noop, showSourceGen: true,
          sourceCustomInstructions: '', sourceLength: '250', sourceLevel: '5th Grade', sourceTone: 'Informative',
          sourceTopic: 'Water cycle', sourceVocabulary: '', standardInputValue: '', standardMode: 'manual',
          studentInterests: [], suggestedStandards: [], t, targetStandards: [], useOwnSources, setUseOwnSources,
          selectedOwnSourceIds, setSelectedOwnSourceIds, documentsOnly, setDocumentsOnly, generationStep,
        });
      }
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Demo));
    });
    await page.getByText('No imported documents yet.', { exact: false }).waitFor();
    assert.equal(await page.getByText('Adapted reading', { exact: true }).count(), 0);
    checks.push('App-created adapted reading is excluded from the research list.');

    await page.locator('#ownSourcesImport').setInputFiles(upload(originalPassage));
    await page.waitForFunction(() => window.smokeState.selectedOwnSourceIds?.length === 1 && window.smokeState.useOwnSources);
    assert.equal(await page.locator('#includeCitations').isChecked(), true);
    await page.getByText('Manage my documents (1)', { exact: true }).click();
    const imported = await page.evaluate(async () => {
      const project = await AlloOwnSources.loadProject({ selectedSourceIds: smokeState.selectedOwnSourceIds });
      const hit = LumenEvidence.retrieve(project, 'water vapor clouds', { forAI: true })[0];
      const source = project.sources.find((row) => row.id === hit.node.sourceId);
      const snapshot = AlloResearchEvidence.snapshot([{
        sourceId: source.id, evidenceId: hit.node.id, title: source.title, version: source.version,
        locatorLabel: hit.node.locatorLabel, snippet: hit.node.content,
      }]);
      const output = AlloResearchEvidence.finish('Clouds form from condensation. [Your document 1]', snapshot);
      const linkTarget = output.text.match(/\[Document 1\]\((#allo-doc-[a-z0-9-]+)\)/)[1];
      const link = document.createElement('a'); link.id = 'document-citation';
      link.href = linkTarget; link.target = '_blank'; link.textContent = 'Inspect Document 1';
      link.style.cssText = 'display:inline-block;padding:12px;color:#5b21b6;text-decoration:underline';
      document.getElementById('evidence-test').appendChild(link);
      window.originalEvidence = snapshot[0];
      return { sourceId: source.id, count: project.sources.length, passage: hit.node.content, location: hit.node.locatorLabel, summary: output.text };
    });
    assert.equal(imported.count, 1);
    assert.equal(imported.passage, originalPassage);
    assert.match(imported.location, /Page 7/);
    assert.match(imported.summary, /1 document\(s\) supplied.*1 document\(s\) cited/);
    checks.push('Real TXT import, passage retrieval and generation-time citation snapshot succeed; web research remains checked.');

    const rawBefore = await page.evaluate(async () => (await studyStore.load()).sources.map(({ id, active }) => ({ id, active })));
    await page.getByRole('button', { name: 'Exclude', exact: true }).click();
    await page.waitForFunction(() => window.smokeState.selectedOwnSourceIds.length === 0);
    assert.deepEqual(await page.evaluate(async () => (await studyStore.load()).sources.map(({ id, active }) => ({ id, active }))), rawBefore);
    assert.equal(await page.locator('#includeCitations').isChecked(), true);
    await page.getByRole('button', { name: 'Include', exact: true }).click();
    await page.waitForFunction(() => window.smokeState.selectedOwnSourceIds.length === 1);
    assert.deepEqual(await page.evaluate(async () => (await studyStore.load()).sources.map(({ id, active }) => ({ id, active }))), rawBefore);
    await page.locator('#useOwnSources').check();
    checks.push('Include/Exclude changes this run selection without mutating saved library active flags or web research.');

    await page.locator('#ownSourcesImport').setInputFiles(upload(secondPassage, 9));
    const duplicate = page.getByRole('dialog', { name: 'A document with this name is already saved' });
    await duplicate.waitFor();
    await duplicate.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(__dirname, 'duplicate-choice.png') });
    await duplicate.getByRole('button', { name: 'Keep both', exact: true }).click();
    await page.waitForFunction(async () => (await AlloOwnSources.listSources({})).length === 2 && smokeState.selectedOwnSourceIds.length === 2);
    const copies = await page.evaluate(async () => (await AlloOwnSources.loadProject({})).sources.map(({ id, title, content }) => ({ id, title, content })));
    assert.equal(new Set(copies.map((row) => row.id)).size, 2);
    assert.deepEqual(copies.map((row) => row.title), ['Cloud field notes.txt', 'Cloud field notes (2).txt']);
    assert.ok(copies.some((row) => row.content.includes(originalPassage)));
    assert.ok(copies.some((row) => row.content.includes(secondPassage)));
    assert.equal(await page.locator('#includeCitations').isChecked(), true);
    checks.push('Duplicate Keep both creates two distinct stored identities and readable names, preserving both contents.');

    await page.locator('#ownSourcesImport').setInputFiles(upload(replacementPassage, 11));
    await duplicate.waitFor();
    await duplicate.getByRole('button', { name: 'Skip this file', exact: true }).click();
    await duplicate.waitFor({ state: 'detached' });
    await page.locator('#ownSourcesImport').waitFor({ state: 'attached' });
    await page.waitForFunction(() => !document.getElementById('ownSourcesImport').disabled);
    assert.deepEqual(await page.evaluate(async () => (await AlloOwnSources.loadProject({})).sources.map(({ id, title, content }) => ({ id, title, content }))), copies);
    checks.push('Duplicate Skip leaves both saved documents unchanged.');

    await page.locator('#ownSourcesImport').setInputFiles(upload(replacementPassage, 11));
    await duplicate.waitFor();
    await duplicate.getByRole('button', { name: 'Replace saved document', exact: true }).click();
    await page.waitForFunction(async (id) => (await AlloOwnSources.loadProject({})).sources.find((row) => row.id === id)?.version === 2, imported.sourceId);
    const replaced = await page.evaluate(async () => (await AlloOwnSources.loadProject({})).sources.map(({ id, version, content }) => ({ id, version, content })));
    assert.equal(replaced.length, 2);
    assert.ok(replaced.find((row) => row.id === imported.sourceId).content.includes(replacementPassage));
    assert.ok(replaced.find((row) => row.id !== imported.sourceId).content.includes(secondPassage));
    assert.equal(await page.locator('#includeCitations').isChecked(), true);
    checks.push('Duplicate Replace preserves the chosen identity, increments its version, and leaves the other copy intact.');

    await page.locator('#documentsOnly').check();
    assert.equal(await page.locator('#includeCitations').isChecked(), false);
    assert.equal(await page.locator('#useOwnSources').isChecked(), true);
    await page.locator('#includeCitations').check();
    assert.equal(await page.locator('#documentsOnly').isChecked(), false);
    checks.push('Documents only explicitly turns web research off; selecting web research turns Documents only off.');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-help-key="source_generate_button"]').click();
    const researching = page.locator('[data-help-key="source_generate_button"]');
    await page.waitForFunction(() => /Researching/i.test(document.querySelector('[data-help-key="source_generate_button"]').textContent));
    assert.match(await researching.locator('[role="status"]').textContent(), /Researching/i);
    await researching.scrollIntoViewIfNeeded();
    assert.equal(await researching.isVisible(), true);
    assert.equal(await researching.isDisabled(), true);
    const statusBox = await researching.boundingBox();
    assert.ok(statusBox.x >= 0 && statusBox.x + statusBox.width <= 391, 'Research status fits the mobile viewport');
    const mobileLayout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    await page.screenshot({ path: path.join(__dirname, 'mobile-researching.png') });
    checks.push('At 390px, the shipped generation button visibly announces Researching (simulated generation state).');
    await page.evaluate(() => smokeStop());

    const citation = page.locator('#document-citation');
    await citation.click();
    const viewer = page.getByRole('dialog', { name: 'Cloud field notes.txt' });
    await viewer.waitFor();
    assert.equal(await viewer.locator('blockquote').textContent(), originalPassage);
    assert.match(await viewer.textContent(), /Page 7.*Saved document version 1/);
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Close passage');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Close passage');
    await page.screenshot({ path: path.join(__dirname, 'mobile-citation-passage.png') });
    await page.keyboard.press('Escape');
    await viewer.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.activeElement.id), 'document-citation');
    assert.equal(page.url(), 'https://research-improvements.test/');
    checks.push('Citation opens the exact original Page 7/version 1 passage after library replacement, traps focus, and Escape restores link focus.');

    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(async () => (await studyStore.load()).sources.some((row) => row.title === 'Adapted reading')));
    const result = {
      passed: true, browser: 'Chromium (headless)', checks, pageErrors: errors, mobileLayout,
      limitations: ['Generation phase was simulated; no live AI/search-provider request was made.', 'The fixture mounts the shipped source panel with real local React state; it does not boot the full host.'],
    };
    fs.writeFileSync(path.join(__dirname, 'browser-result.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(__dirname, 'browser-failure.png') }).catch(() => {});
    fs.writeFileSync(path.join(__dirname, 'browser-result.json'), JSON.stringify({ passed: false, checks, pageErrors: errors, error: error.stack || String(error) }, null, 2) + '\n');
    throw error;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
