const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const output = __dirname;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = { checks: [], errors: [], axe: [], layouts: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => results.errors.push(error.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit learning workflow checks</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({ path: path.join(root, 'dev-tools/.cache/sweep-tailwind.css') });
    await page.addStyleTag({ content: 'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}' });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_circuit.js']) {
      await page.addScriptTag({ path: path.join(root, file) });
    }
    await page.evaluate(() => {
      const noop = () => {};
      const icons = new Proxy({}, { get: () => () => React.createElement('span') });
      window.requests = [];
      window.provider = 'deferred';
      window.originalCircuit = { pauseMotion: true, mode: 'series', voltage: 7, components: [{ id: 40, type: 'resistor', value: 470 }], prediction: 'Preserve my notebook', observations: [] };
      function Host() {
        const [data, setData] = React.useState({ _circuit: originalCircuit, unrelated: { keep: true } });
        window.state = data;
        window.setState = setData;
        return StemLab._registry.circuit.render({
          React, icons, toolData: data, setToolData: setData, t: (key, fallback) => fallback || key,
          gradeLevel: '8', addToast: noop, awardXP: noop, announceToSR: noop,
          a11yClick: fn => ({ onClick: fn }), setStemLabTool: noop, setStemLabTab: noop,
          setToolSnapshots: noop,
          callGemini: (...args) => {
            if (provider === 'throw') throw new Error('Mock synchronous failure');
            if (provider === 'invalid') return { invalid: true };
            return new Promise((resolve, reject) => requests.push({ args, resolve, reject }));
          }
        });
      }
      window.auditRoot = ReactDOM.createRoot(document.querySelector('#root'));
      auditRoot.render(React.createElement(Host));
    });
    await page.getByRole('heading', { name: 'Small circuits. Big discoveries.' }).waitFor();
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    async function inspect(name, selector, screenshot) {
      const scan = await page.evaluate(async selector => {
        const result = await axe.run(document.querySelector(selector), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        return result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }));
      }, selector);
      results.axe.push({ name, violations: scan });
      for (const width of [1280, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        results.layouts.push({ name, ...dimensions });
        assert.ok(dimensions.scrollWidth <= width + 1, `${name}: overflow at ${width}`);
        if (screenshot && width !== 390) await page.locator(selector).screenshot({ path: path.join(output, `${screenshot}-${width}.png`) });
      }
      await page.setViewportSize({ width: 1280, height: 1000 });
    }

    // Lesson diagrams and an actual prediction/reveal/try/undo workflow.
    await page.evaluate(() => setState(prev => ({ ...prev, circuit: { workspaceTab: 'reference', expSection: 'poebulb' } })));
    await page.locator('[data-circuit-poe-schematic="s3"]').waitFor();
    assert.equal(await page.locator('[data-circuit-poe-schematic]').count(), 4);
    const card = page.locator('[data-circuit-poe-schematic="s3"]').locator('..');
    await card.getByRole('button', { name: 'The same power', exact: true }).click();
    await card.getByRole('button', { name: 'Reveal model evidence', exact: true }).click();
    await inspect('Bulb lesson after prediction', '#circuit-reference-panel', 'bulb-lessons');
    await page.getByRole('button', { name: 'Try this circuit: Two bulbs in PARALLEL, same battery', exact: true }).click();
    await page.getByRole('heading', { name: 'Small circuits. Big discoveries.' }).waitFor();
    assert.deepEqual(await page.evaluate(() => ({ mode: state._circuit.mode, voltage: state._circuit.voltage, parts: state._circuit.components.map(p => [p.type, p.value]) })), { mode: 'parallel', voltage: 1.5, parts: [['bulb', 5], ['bulb', 5]] });
    assert.equal(await page.evaluate(() => StemLab.solveCircuit(state._circuit).current), .6);
    assert.equal(await page.evaluate(() => state._circuit.prediction), 'Preserve my notebook');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    assert.equal(await page.evaluate(() => state._circuit.voltage), 7);
    assert.equal(await page.evaluate(() => state._circuit.components[0].id), 40);
    assert.equal(await page.evaluate(() => state.circuit.poeb.stage.s3.revealed), true);
    results.checks.push({ name: 'Predict, reveal, try parallel lesson, then undo without losing notes or progress' });

    // Mocked providers exercise real controls without contacting an AI service.
    await page.getByRole('button', { name: 'AI Tutor', exact: true }).click();
    const question = page.getByRole('textbox', { name: 'Question for the AI Circuit Tutor', exact: true });
    await question.fill('Why is this current flowing?');
    await page.getByRole('button', { name: 'Ask the AI tutor', exact: true }).click();
    await page.waitForFunction(() => requests.length === 1);
    const prompt = await page.evaluate(() => requests[0].args[0]);
    assert.match(prompt, /"resistanceOhm"\s*:\s*470/);
    assert.ok(!prompt.includes('Preserve my notebook'));
    assert.ok(prompt.includes('Model limits:'));
    await inspect('Tutor while waiting', '#circuit-build-panel');
    await question.fill('How will changing voltage affect current?');
    await page.getByRole('button', { name: 'Ask the AI tutor', exact: true }).click();
    await page.waitForFunction(() => requests.length === 2);
    await page.evaluate(() => requests[1].resolve('New question: double the voltage, and the same resistor carries double the current.'));
    await page.getByText('New question: double the voltage, and the same resistor carries double the current.', { exact: true }).waitFor();
    await page.evaluate(() => requests[0].resolve('STALE RESPONSE MUST NOT APPEAR'));
    assert.equal(await page.getByText('STALE RESPONSE MUST NOT APPEAR', { exact: true }).count(), 0);
    results.checks.push({ name: 'Approved tutor prompt includes component readings and model limits without notebook text; changed question invalidates an old reply' });
    await page.evaluate(() => { window.provider = 'throw'; });
    await page.getByRole('button', { name: 'Ask the AI tutor', exact: true }).click();
    await page.waitForFunction(() => state._circuit._aiLoading === false);
    assert.ok(await page.getByRole('button', { name: 'Ask the AI tutor', exact: true }).isEnabled());
    await page.evaluate(() => { window.provider = 'deferred'; });
    await page.getByRole('button', { name: 'Ask the AI tutor', exact: true }).click();
    await page.waitForFunction(() => requests.length === 3);
    await page.evaluate(() => requests[2].resolve('Retry succeeded.'));
    await page.getByText('Retry succeeded.', { exact: true }).waitFor();
    results.checks.push({ name: 'Synchronous provider failure clears busy and permits retry' });
    await inspect('Tutor with completed mock reply', '#circuit-build-panel', 'tutor');

    // Exercise an actual browser download and File input, with preview then Undo.
    await page.getByRole('button', { name: 'Connected circuits', exact: true }).click();
    await page.getByRole('combobox', { name: 'Connected circuit example', exact: true }).selectOption('rc-charge');
    await page.getByRole('button', { name: 'Load network example', exact: true }).click();
    await page.getByText('Save or open a connected design', { exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save connected design', exact: true }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'connected-circuit-design.json');
    const savedPath = path.join(output, 'browser-export.json');
    await download.saveAs(savedPath);
    const document = JSON.parse(fs.readFileSync(savedPath, 'utf8'));
    assert.equal(document.format, 'alloflow-connected-circuit');
    assert.equal(document.version, 1);
    assert.ok(!JSON.stringify(document).includes('Preserve my notebook'));
    await page.getByRole('combobox', { name: 'Connected circuit example', exact: true }).selectOption('sources');
    await page.getByRole('button', { name: 'Load network example', exact: true }).click();
    const before = await page.evaluate(() => JSON.stringify(state._circuitNetwork));
    await page.getByLabel('Open connected design file', { exact: true }).setInputFiles(savedPath);
    await page.getByRole('region', { name: 'Connected design preview', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.stringify(state._circuitNetwork)), before);
    await inspect('Connected import preview', '.circuit-network-root', 'connected-preview');
    await page.getByRole('button', { name: 'Load design', exact: true }).click();
    await page.waitForFunction(() => state._circuitNetwork.analysis === 'time');
    assert.equal(await page.evaluate(() => state._circuitNetwork.components[2].type), 'capacitor');
    assert.equal(await page.evaluate(() => state._circuitNetwork.time), 0);
    await page.getByRole('button', { name: 'Undo network edit', exact: true }).click();
    await page.waitForFunction(() => state._circuitNetwork.analysis === 'dc');
    assert.equal(await page.evaluate(() => state._circuitNetwork.components[1].type), 'voltage');
    assert.equal(await page.evaluate(() => state._circuitNetwork.loadedExample), 'sources');
    results.checks.push({ name: 'Connected JSON download, non-mutating preview, explicit load and complete Undo', format: document.format, version: document.version });
    const beforeInvalid = await page.evaluate(() => JSON.stringify(state._circuitNetwork));
    await page.getByLabel('Open connected design file', { exact: true }).setInputFiles({ name: 'broken-design.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"alloflow-connected-circuit","version":999}') });
    await page.waitForFunction(() => !document.querySelector('[aria-label="Connected design preview"]'));
    assert.equal(await page.evaluate(() => JSON.stringify(state._circuitNetwork)), beforeInvalid);
    assert.equal(await page.evaluate(() => state.unrelated.keep), true);
    results.checks.push({ name: 'Malformed design leaves the current network and unrelated state intact' });
    assert.deepEqual(results.errors, []);
    assert.ok(results.axe.every(scan => scan.violations.length === 0), JSON.stringify(results.axe));
    results.passed = true;
    await page.evaluate(() => auditRoot.unmount());
  } catch (error) {
    results.failure = error.stack;
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(results, null, 2));
    await browser.close();
  }
  console.log(`Circuit workflows passed: ${results.checks.length} workflows, ${results.axe.length} axe scans, ${results.layouts.length} responsive checks.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
