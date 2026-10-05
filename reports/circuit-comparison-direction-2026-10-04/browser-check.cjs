const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourcePath = path.join(root, 'stem_lab/stem_tool_circuit.js'), mirrorPath = path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_circuit.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const result = { sourceSha256: hash(source), scriptSha256: hash(fs.readFileSync(__filename)), errors: [], workflows: [], views: [], screenshots: [] };
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
(async () => {
  assert.equal(result.sourceSha256, '3f875d72cabfea1a5e6f4fa104504de2540871cde9292af32cc12def598b18de');
  assert.equal(hash(fs.readFileSync(mirrorPath)), result.sourceSha256);
  assert.ok(!fs.existsSync(path.join(__dirname, 'browser-results.json')), 'Preserve an earlier attempt before rerunning.');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => result.errors.push(error.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit comparison direction</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({ path: path.join(root, 'dev-tools/.cache/sweep-tailwind.css') });
    await page.addStyleTag({ content: 'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}' });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: path.join(root, file) });
    await page.addScriptTag({ content: source }); await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    await page.evaluate(() => {
      const noop = () => {}, icons = new Proxy({}, { get: () => () => React.createElement('span') }); window.stateWrites = 0;
      function Host() {
        const [data, update] = React.useState({ _circuit: { activeWorkbench: true }, _circuitActive: { ...StemLab.circuitActiveDesign({ input: 4.2 }), view: 'schematic', notebookOpen: true, observations: [], reflection: 'My explanation remains my own.', investigationPrediction: 'I predict more current.', undo: [StemLab.circuitActiveDesign({ input: .8 })], redo: [StemLab.circuitActiveDesign({ input: 2 })] }, _circuitNetwork: { reflection: 'Keep other work.' } });
        const [locale, changeLocale] = React.useState(''); window.state = data; window.setState = update; window.setLocale = changeLocale;
        return StemLab._registry.circuit.render({ React, icons, toolData: data, setToolData: value => { stateWrites++; update(value); }, t: (_key, fallback) => locale + fallback, gradeLevel: '8', addToast: noop, awardXP: noop, announceToSR: noop, a11yClick: fn => ({ onClick: fn }), setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop });
      }
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });
    await page.locator('.circuit-active-notebook').waitFor();
    const panel = page.locator('.circuit-observation-compare'), swap = page.locator('.circuit-observation-swap'), fields = page.locator('.circuit-observation-selectors select');
    const order = page.locator('.circuit-observation-order'), metrics = page.locator('.circuit-observation-metrics'), probe = page.locator('.circuit-observation-probe-comparison');
    const status = page.locator('.circuit-observation-order-announcement'), notes = page.locator('.circuit-comparison-notes');
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const snapshot = () => page.evaluate(() => JSON.stringify(state));
    const values = () => fields.evaluateAll(nodes => nodes.map(el => el.value));
    const directions = () => panel.locator('.circuit-observation-delta-direction').allTextContents();
    async function fixture({ inputs = [1, 1.5], prefix = '', dir = 'ltr', negativeProbe = false } = {}) {
      await panel.locator('[style]').evaluateAll(nodes => nodes.forEach(el => { el.style.removeProperty('font-size'); el.style.removeProperty('transition'); el.style.removeProperty('animation'); }));
      await page.evaluate(({ inputs, prefix, dir, negativeProbe }) => {
        document.documentElement.dir = dir; setLocale(prefix);
        setState(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, observations: inputs.map((input, index) => StemLab.circuitActiveObservation({ input, probeRed: negativeProbe ? 'base' : 'drive', probeBlack: negativeProbe ? 'drive' : 'base' }, ['First note.', 'Second note.', 'Third note.'][index])), removedObservations: [], removedObservation: null, investigationNotice: '' } }));
      }, { inputs, prefix, dir, negativeProbe });
      await settle(); await panel.evaluate(el => el.open = true);
      for (let i = 0; i < 2; i++) await fields.nth(i).selectOption(await fields.nth(i).locator('option').nth(i + 1).getAttribute('value'));
      await settle();
    }
    async function capture(name, top, bottom = top) {
      await top.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
      const a = await top.boundingBox(), b = await bottom.boundingBox(), scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY, width: document.documentElement.scrollWidth }));
      const x = Math.max(0, Math.floor(Math.min(a.x, b.x) + scroll.x) - 6), y = Math.max(0, Math.floor(a.y + scroll.y) - 6);
      const clip = { x, y, width: Math.min(scroll.width - x, Math.ceil(Math.max(a.x + a.width, b.x + b.width) + scroll.x) + 6 - x), height: Math.ceil(b.y + b.height + scroll.y) + 6 - y };
      const file = name + '.png'; await page.screenshot({ path: path.join(__dirname, file), clip, fullPage: true, animations: 'disabled' });
      result.screenshots.push({ file, clip, sha256: hash(fs.readFileSync(path.join(__dirname, file))) });
    }

    await fixture(); await notes.evaluate(el => el.open = true);
    const originalState = await snapshot(), originalValues = await values(), originalDirections = await directions();
    const reflection = page.locator('.circuit-notebook-reflection');
    const draft = await reflection.evaluate(el => { el.style.height = '180px'; el.setSelectionRange(3, 10, 'backward'); return { value: el.value, start: el.selectionStart, end: el.selectionEnd, direction: el.selectionDirection, height: el.style.height }; });
    await swap.focus(); await page.keyboard.press('Enter'); await settle();
    assert.deepEqual(await values(), originalValues.toReversed()); assert.equal(await snapshot(), originalState); assert.equal(await page.evaluate(() => stateWrites), 0);
    assert.deepEqual(await directions(), ['Decreased', 'Decreased', 'Increased', 'Decreased', 'Decreased']);
    assert.equal(await status.textContent(), 'Order swapped. First: Observation 2. Second: Observation 1.');
    assert.equal(await notes.evaluate(el => el.open), true);
    assert.deepEqual(await notes.locator('.circuit-comparison-note-text').allTextContents(), ['Second note.', 'First note.']);
    const focus = await swap.evaluate(el => ({ focused: document.activeElement === el, visible: el.matches(':focus-visible'), style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
    assert.equal(focus.focused, true); assert.equal(focus.visible, true); assert.equal(focus.style, 'solid'); assert.ok(parseFloat(focus.width) >= 2);
    await capture('keyboard-swap-focus', order);
    await page.keyboard.press('Space'); await settle(); assert.deepEqual(await values(), originalValues); assert.deepEqual(await directions(), originalDirections); assert.equal(await snapshot(), originalState);
    assert.deepEqual(await reflection.evaluate(el => ({ value: el.value, start: el.selectionStart, end: el.selectionEnd, direction: el.selectionDirection, height: el.style.height })), draft);
    result.workflows.push({ name: 'Enter and Space reverse and restore comparison', focus, fullStateUnchanged: true, notesFollowOrder: true, draftRetained: draft });

    await fields.nth(1).selectOption(originalValues[0]); await settle(); assert.equal(await swap.isDisabled(), true); assert.equal(await status.textContent(), '');
    await fields.nth(1).selectOption(''); await settle(); assert.equal(await swap.isDisabled(), true); assert.equal(await panel.locator('.circuit-observation-comparison').count(), 0);
    result.workflows.push({ name: 'Same or missing selections disable swapping and clear the announcement', passed: true });

    await fixture({ inputs: [1, 1.5, 2] }); await swap.click(); await settle();
    const observation = page.locator('.circuit-notebook-observation').nth(1); await observation.locator(':scope > summary').click();
    await observation.getByRole('button', { name: 'Remove observation 2', exact: true }).click(); await settle();
    assert.equal((await values())[0], ''); assert.equal(await swap.isDisabled(), true); assert.equal(await status.textContent(), '');
    await fields.nth(0).selectOption(await fields.nth(0).locator('option').nth(2).getAttribute('value')); await swap.click(); await settle();
    assert.deepEqual(await notes.locator('.circuit-comparison-note-text').allTextContents(), ['First note.', 'Third note.']);
    result.workflows.push({ name: 'Removing a selected observation requires a new choice before swapping', passed: true });

    async function inspect(name, width, { forced = false, double = false, reverse = false } = {}) {
      await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ forcedColors: forced ? 'active' : 'none', reducedMotion: 'reduce' });
      await notes.evaluate(el => el.open = false); await settle();
      const fontNodes = panel.locator('.circuit-observation-order p,.circuit-observation-swap,.circuit-observation-comparison h4,.circuit-observation-comparison h5,.circuit-observation-comparison p,.circuit-observation-comparison dt,.circuit-observation-comparison dd,.circuit-observation-delta-direction');
      const normal = double ? await fontNodes.evaluateAll(nodes => nodes.map(el => parseFloat(getComputedStyle(el).fontSize))) : [];
      if (double) await fontNodes.evaluateAll((nodes, sizes) => nodes.forEach((el, i) => { el.style.setProperty('transition', 'none', 'important'); el.style.setProperty('animation', 'none', 'important'); el.style.setProperty('font-size', sizes[i] * 2 + 'px', 'important'); }), normal);
      await settle(); if (reverse) { await swap.focus(); await page.keyboard.press('Enter'); await settle(); }
      const fonts = double ? await fontNodes.evaluateAll((nodes, sizes) => nodes.map((el, i) => ({ before: sizes[i], after: parseFloat(getComputedStyle(el).fontSize) })), normal) : [];
      for (const font of fonts) assert.equal(font.after, font.before * 2);
      const data = await panel.evaluate(el => {
        const outside = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode; if (!node.textContent.trim() || node.parentElement.closest('.circuit-observation-order-announcement,option')) continue;
          const bounds = (node.parentElement.closest('.circuit-observation-metric,.circuit-observation-probe-comparison,.circuit-observation-order') || el).getBoundingClientRect();
          for (const word of node.textContent.matchAll(/\S+/g)) { const range = document.createRange(); range.setStart(node, word.index); range.setEnd(node, word.index + word[0].length); for (const r of range.getClientRects()) if (r.width > .1 && (r.left < bounds.left - 1 || r.right > bounds.right + 1)) outside.push({ word: word[0], left: r.left, right: r.right, bounds: { left: bounds.left, right: bounds.right } }); }
        }
        const button = el.querySelector('.circuit-observation-swap'), rect = button.getBoundingClientRect();
        return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, outside, action: { text: button.textContent, width: rect.width, height: rect.height }, badges: [...el.querySelectorAll('.circuit-observation-delta-direction')].map(n => ({ text: n.textContent, kind: n.dataset.changeDirection })), quantities: [...el.querySelectorAll('.circuit-observation-delta dd bdi')].map(n => ({ text: n.textContent, dir: getComputedStyle(n).direction })) };
      });
      assert.equal(data.viewport, width); assert.ok(data.pageWidth <= width + 1); assert.deepEqual(data.outside, []); assert.ok(data.action.width >= 44); assert.ok(data.action.height >= 44); for (const quantity of data.quantities) assert.equal(quantity.dir, 'ltr');
      const violations = await panel.evaluate(async (el, forced) => (await axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, rules: { 'color-contrast': { enabled: !forced } } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.failureSummary) })), forced);
      assert.deepEqual(violations, []);
      let colors = [];
      if (forced) colors = await panel.locator('.circuit-observation-order p,.circuit-observation-swap,.circuit-observation-delta-direction').evaluateAll(nodes => {
        const lum = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        return nodes.map(el => { const foreground = getComputedStyle(el).color; let parent = el, background; while (parent) { const color = getComputedStyle(parent).backgroundColor; if (color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') { background = color; break; } parent = parent.parentElement; } const a = lum(foreground), b = lum(background); return { text: el.textContent, foreground, background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) }; });
      });
      for (const color of colors) assert.ok(color.ratio >= 4.5);
      const accessibility = await panel.ariaSnapshot(); assert.ok(accessibility.includes(data.action.text)); for (const badge of data.badges) assert.ok(accessibility.includes(badge.text));
      result.views.push({ name, width, double, forced, fonts, colors, axeViolations: violations, excludedRules: forced ? ['color-contrast'] : [], forcedColorsReason: forced ? 'Actual used foreground/background ratios checked; axe uses authored colors in forced mode.' : null, accessibility, ...data });
      await capture(name, order, probe);
    }
    await fixture(); await inspect('direction-desktop', 1280);
    await fixture(); await inspect('direction-phone-reversed', 390, { reverse: true });
    await fixture({ inputs: [3.3, 4.5] }); await inspect('direction-narrow-saturation', 320);
    await fixture({ prefix: 'Translated ' }); await inspect('direction-doubled-text', 390, { double: true });
    await fixture(); await inspect('direction-forced-colors', 320, { forced: true });
    await fixture({ dir: 'rtl', negativeProbe: true }); await inspect('direction-rtl-negative-probe', 390, { reverse: true });
    assert.deepEqual(result.errors, []); assert.equal(hash(fs.readFileSync(sourcePath)), result.sourceSha256); assert.equal(hash(fs.readFileSync(mirrorPath)), result.sourceSha256); assert.equal(hash(fs.readFileSync(__filename)), result.scriptSha256);
    result.passed = true;
  } catch (error) { result.failure = error.stack; throw error; }
  finally { await browser.close(); result.browserClosed = true; write('browser-results.json', result); }
  console.log(JSON.stringify({ passed: true, views: result.views.length, workflows: result.workflows.length, screenshots: result.screenshots.length, sourceSha256: result.sourceSha256 }));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
