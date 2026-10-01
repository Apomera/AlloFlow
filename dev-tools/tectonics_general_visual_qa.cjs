'use strict';

// Full registered tool, local React/Three, real browser interaction. This is an
// exploratory audit: findings are recorded, not silently turned into assertions.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd();
const read = p => fs.readFileSync(path.resolve(root, p), 'utf8');
const sourcePath = process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js';
const source = read(sourcePath);
const out = path.join(root, 'scratch', 'tectonics-general-review', process.argv.includes('--after') ? 'after' : 'before');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { sourcePath, sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), captures: [], findings: [], checks: [], errors: [] };
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.errors.push(String(error)));
  try {
    await page.setContent('<!doctype html><html lang="en"><head><title>Tectonics general visual review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE);
      StemLab.loadScriptResilient = () => new Promise(() => {});
      window.qaNativeRequestAnimationFrame = requestAnimationFrame.bind(window);
      window.qaNativeCancelAnimationFrame = cancelAnimationFrame.bind(window);
      const fillRect = CanvasRenderingContext2D.prototype.fillRect;
      CanvasRenderingContext2D.prototype.fillRect = function (...args) {
        this.canvas.__qaPaintCalls = (this.canvas.__qaPaintCalls || 0) + 1;
        return fillRect.apply(this, args);
      };
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...args) {
        const slot = /^M [\d.]+\s+·/.test(text) ? 'metadata' : ['P wave', 'S wave', 'surface waves'].includes(text) ? text : null;
        if (slot) {
          const metric = this.measureText(text), left = x - (this.textAlign === 'center' ? metric.width / 2 : this.textAlign === 'right' ? metric.width : 0);
          this.canvas.__qaSeismoLabels = this.canvas.__qaSeismoLabels || {};
          this.canvas.__qaSeismoLabels[slot] = { text, x: left, y: y - metric.actualBoundingBoxAscent, width: metric.width, height: metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent };
          this.canvas.setAttribute('data-qa-seismogram', 'true');
        }
        return fillText.call(this, text, x, y, ...args);
      };
      let frameId = 0, frameTime = 0;
      const frames = new Map();
      window.requestAnimationFrame = cb => { frames.set(++frameId, cb); return frameId; };
      window.cancelAnimationFrame = id => frames.delete(id);
      window.qaFrames = count => {
        for (let i = 0; i < count; i++) {
          frameTime += 1000 / 60;
          for (const [id, cb] of [...frames.entries()]) if (frames.delete(id)) cb(frameTime);
        }
      };
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const noop = () => {};
      const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
      const reactRoot = ReactDOM.createRoot(document.getElementById('slot'));
      let generation = 0;
      window.qaLog = { xp: [], toasts: [], announcements: [] };
      window.qaMount = (dark, seed = {}) => {
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        function Host() {
          const [data, setData] = React.useState({ plateTectonics: { simTab: 'sim', ptDrift: false, ...seed } });
          window.qaData = data;
          window.qaSet = setData;
          return StemLab._registry.plateTectonics.render({
            React, toolData: data, setToolData: setData, isDark: dark, isContrast: false, icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [],
            addToast: (...args) => qaLog.toasts.push(args), announceToSR: text => qaLog.announcements.push(text),
            awardXP: (...args) => qaLog.xp.push(args), getXP: () => 0,
            beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop,
            a11yClick: f => ({ onClick: f }), t: (k, f) => f == null ? k : f,
            props: {}, srOnly: {}, gradeLevel: '7th Grade', callGemini: null
          });
        }
        ReactDOM.flushSync(() => reactRoot.render(React.createElement(Host, { key: ++generation })));
      };
      window.qaDestroy = () => ReactDOM.flushSync(() => reactRoot.unmount());
    });
    async function mount(dark, width) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(dark => qaMount(dark), dark);
      await page.locator('[data-pt-start-here]').waitFor();
      await page.evaluate(() => scrollTo(0, 0));
      await page.evaluate(() => qaFrames(2));
    }
    const search = page.locator('input[aria-label="Search the tools in Plate Tectonics"]');
    async function navigate(tab, query, label) {
      await search.fill(query);
      // A forced pointer click bypasses Playwright's RAF stability poll. The
      // actual DOM handler and React commit still run; RAF is stepped above.
      await page.getByRole('button', { name: label, exact: true }).click({ force: true });
      await page.waitForFunction(tab => qaData.plateTectonics.simTab === tab && !qaData.plateTectonics._ptSearch, tab);
      await page.evaluate(() => scrollTo(0, 0));
      await page.evaluate(() => qaFrames(2));
    }
    async function capture(name, locator) {
      if (locator) {
        await locator.waitFor();
        await locator.evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
      }
      await page.waitForTimeout(150);
      await page.evaluate(() => qaFrames(2));
      const file = path.join(out, name + '.png');
      await page.screenshot({ path: file });
      const detail = await page.evaluate(() => ({
        width: innerWidth, scrollY, pageHeight: document.documentElement.scrollHeight,
        overflow: document.documentElement.scrollWidth - innerWidth,
        tab: qaData.plateTectonics.simTab,
        focus: { tag: document.activeElement.tagName, id: document.activeElement.id, text: document.activeElement.textContent.slice(0, 120) },
        headings: [...document.querySelectorAll('h2,h3,h4')].filter(n => { const r = n.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).map(n => n.textContent),
        overflowing: [...document.querySelectorAll('main *')].filter(n => { const r = n.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 2 || r.left < -2) && r.bottom > 0 && r.top < innerHeight; }).slice(0, 12).map(n => ({ tag: n.tagName, text: n.textContent.slice(0, 100), rect: { x: n.getBoundingClientRect().x, width: n.getBoundingClientRect().width } }))
      }));
      report.captures.push({ name, file, ...detail });
      console.log('CAPTURE', name, JSON.stringify({ tab: detail.tab, overflow: detail.overflow, y: detail.scrollY, pageHeight: detail.pageHeight }));
    }
    async function audit(name, locator) {
      await locator.evaluate(node => node.setAttribute('data-qa-audit', 'true'));
      const result = await page.evaluate(async () => {
        const result = await axe.run('[data-qa-audit="true"]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        return result.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, html: n.html, failureSummary: n.failureSummary })) }));
      });
      await locator.evaluate(node => node.removeAttribute('data-qa-audit'));
      report.findings.push({ name, axe: result });
      console.log('AUDIT', name, result.map(v => `${v.id}:${v.nodes.length}`).join(', ') || 'clear');
    }
    const header = page.locator('.pt-sim-shell > div').first();
    async function check(name, run) {
      try { const detail = await run(); report.checks.push({ name, passed: true, detail }); console.log('PASS', name); }
      catch (error) { report.checks.push({ name, passed: false, error: String(error.message) }); console.error('FAIL', name, error.message); }
    }
    if (process.argv.includes('--controls-only')) {
      // Let delayed focus and React lifecycle work request another frame while
      // keeping canvas animation at a modest, deterministic pace for the host.
      await page.evaluate(() => { window.qaControlFrames = setInterval(() => qaFrames(1), 50); });
      await mount(false, 1100);
      await check('Hub contains no mounted activity or active drawing surface', async () => {
        assert.equal(await page.locator('#pt-topic-panel').count(), 0);
        assert.equal(await page.locator('canvas').count(), 0);
        return page.evaluate(() => ({ height: document.documentElement.scrollHeight, width: innerWidth }));
      });
      await check('Whitespace search preserves the Hub', async () => {
        await search.fill('   ');
        await page.locator('[data-pt-start-here]').waitFor();
        assert.equal(await page.getByText('No matches.', { exact: true }).count(), 0);
        await search.fill('');
      });
      await check('Concept search finds seismic activity and selection focuses the panel', async () => {
        await search.fill('seismic');
        await page.getByRole('button', { name: '📈 Earthquake Lab', exact: true }).click({ force: true });
        await page.waitForFunction(() => qaData.plateTectonics.simTab === 'earthquake' && document.activeElement.id === 'pt-topic-panel', null, { polling: 50 });
        return page.locator('#pt-topic-panel').getAttribute('aria-labelledby');
      });
      await check('Topic tabs support ArrowRight, ArrowLeft, End and Home', async () => {
        await page.locator('#pt-tab-earthquake').focus();
        const moves = [['ArrowRight', 'timeline'], ['ArrowLeft', 'earthquake'], ['End', 'explain'], ['Home', 'sim']];
        for (const [key, tab] of moves) {
          await page.keyboard.press(key);
          await page.waitForFunction(tab => qaData.plateTectonics.simTab === tab && document.activeElement.id === 'pt-tab-' + tab, tab, { polling: 50 });
          assert.equal(await page.locator('[role=tab][aria-selected=true]').getAttribute('id'), 'pt-tab-' + tab);
          assert.equal(await page.locator('[role=tab][tabindex="0"]').count(), 1);
        }
      });
      await check('Clear search empties the query and returns focus to search', async () => {
        await search.fill('no-such-tectonic-topic');
        await page.locator('[data-pt-search-clear]').click({ force: true });
        await page.waitForFunction(() => !qaData.plateTectonics._ptSearch && document.activeElement.getAttribute('data-pt-topic-search') === 'true', null, { polling: 50 });
      });
      await check('Hub step two opens and focuses the boundary simulator after mounting', async () => {
        await page.getByRole('button', { name: '🏠 Hub', exact: true }).click({ force: true });
        await page.locator('[data-pt-start-step="pt-boundary-simulator"]').click({ force: true });
        await page.evaluate(() => qaFrames(3));
        await page.waitForFunction(() => qaData.plateTectonics.simTab === 'sim' && document.activeElement.hasAttribute('data-tect-section'), null, { polling: 50 });
        return page.evaluate(() => ({ focus: document.activeElement.getAttribute('data-tect-section'), scrollY }));
      });
      await navigate('timeline', 'Timeline', '⏳ Timeline');
      await page.evaluate(() => { qaLog.xp = []; });
      await check('Timeline credits each deliberate era once, including repeated clicks and revisit', async () => {
        const era0 = page.locator('[data-pt-era="0"]'), era1 = page.locator('[data-pt-era="1"]');
        await era0.click({ force: true });
        await page.waitForFunction(() => qaLog.xp.filter(x => x[2] === 'Timeline explored').length === 1, null, { polling: 50 });
        for (let i = 0; i < 3; i++) await era0.click({ force: true });
        await era1.click({ force: true });
        await page.waitForFunction(() => qaLog.xp.filter(x => x[2] === 'Timeline explored').length === 2, null, { polling: 50 });
        await era0.click({ force: true });
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => qaLog.xp.filter(x => x[2] === 'Timeline explored').length), 2);
        await navigate('glossary', 'Glossary', '📖 Glossary');
        await navigate('timeline', 'Timeline', '⏳ Timeline');
        await era1.click({ force: true });
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => qaLog.xp.filter(x => x[2] === 'Timeline explored').length), 2);
        return page.evaluate(() => qaLog.xp);
      });
      await check('Education panel earns one exploration award across repeated open and close', async () => {
        const toggle = page.locator('[data-pt-education-toggle]');
        if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click({ force: true });
        await toggle.click({ force: true });
        await page.waitForFunction(() => qaLog.xp.filter(x => x[2] === 'Learned about tectonics').length === 1, null, { polling: 50 });
        for (let i = 0; i < 4; i++) await toggle.click({ force: true });
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => qaLog.xp.filter(x => x[2] === 'Learned about tectonics').length), 1);
      });
      await check('Glossary pages expose every term once and preserve readable navigation', async () => {
        await navigate('glossary', 'Glossary', '📖 Glossary');
        const count = page.locator('[data-pt-glossary-count]');
        const cards = page.locator('[data-pt-glossary-term]');
        const next = page.locator('[data-pt-glossary-next]');
        const previous = page.locator('[data-pt-glossary-previous]');
        const total = Number(await count.getAttribute('data-pt-glossary-count'));
        assert.equal(await cards.count(), 24);
        assert.ok(total > 24);
        assert.ok(await previous.isDisabled());
        assert.ok((await next.boundingBox()).height >= 40);
        const terms = [], xpBefore = await page.evaluate(() => qaLog.xp.length);
        for (let index = 1; index <= Math.ceil(total / 24); index++) {
          assert.equal(await count.getAttribute('data-pt-glossary-page'), String(index));
          terms.push(...await cards.evaluateAll(nodes => nodes.map(n => n.getAttribute('data-pt-glossary-term'))));
          if (index < Math.ceil(total / 24)) {
            await next.click({ force: true });
            await page.waitForFunction(index => document.querySelector('[data-pt-glossary-page]')?.getAttribute('data-pt-glossary-page') === String(index + 1), index, { polling: 50 });
            assert.equal(await page.evaluate(() => document.activeElement.id), 'pt-glossary-results');
          }
        }
        assert.equal(terms.length, total);
        assert.equal(new Set(terms).size, total);
        assert.ok(await next.isDisabled());
        assert.equal(await page.evaluate(() => qaLog.xp.length), xpBefore);
        return { total, pages: Math.ceil(total / 24), noDuplicateTerms: true };
      });
      await check('Glossary term and definition filtering reset paging and handle no matches', async () => {
        const lookup = page.locator('input[aria-label="Search the glossary"]');
        const count = page.locator('[data-pt-glossary-count]');
        await lookup.fill(' subduction ');
        await page.waitForFunction(() => document.querySelector('[data-pt-glossary-page]')?.getAttribute('data-pt-glossary-page') === '1', null, { polling: 50 });
        const cards = await page.locator('[data-pt-glossary-term]').allTextContents();
        assert.ok(cards.length > 0);
        assert.ok(cards.every(text => text.toLowerCase().includes('subduction')));
        await lookup.fill('no-such-geologic-term');
        await page.waitForFunction(() => document.querySelector('[data-pt-glossary-count]')?.getAttribute('data-pt-glossary-count') === '0', null, { polling: 50 });
        assert.equal(await page.locator('[data-pt-glossary-term]').count(), 0);
        await lookup.fill('');
        await page.waitForFunction(() => document.querySelectorAll('[data-pt-glossary-term]').length === 24, null, { polling: 50 });
        assert.equal(await count.getAttribute('data-pt-glossary-page'), '1');
        return { matchedSubduction: cards.length };
      });
      await check('Earthquake comparison cards remain readable and identify current magnitude', async () => {
        await navigate('earthquake', 'Earthquake Lab', '📈 Earthquake Lab');
        const opacity = await page.locator('[data-pt-damage-tier]').evaluateAll(nodes => nodes.map(n => Number(getComputedStyle(n).opacity)));
        assert.deepEqual(opacity, [1, 1, 1, 1]);
        const slider = page.locator('input[aria-label^="Earthquake magnitude"]');
        await slider.focus(); await page.keyboard.press('End');
        await page.waitForFunction(() => document.querySelector('[data-pt-damage-active="true"]')?.getAttribute('data-pt-damage-tier') === '8-9', null, { polling: 50 });
        assert.equal(await page.locator('[data-pt-damage-active="true"]').count(), 1);
        assert.ok((await page.locator('[data-pt-damage-active="true"]').textContent()).includes('Current magnitude'));
      });
      await check('Explain It draft survives navigation to an evidence activity and back', async () => {
        await navigate('explain', 'Explain It', '📝 Explain It');
        const claim = page.locator('[data-pt-explain] textarea').first();
        const draft = 'Cold sinking plates can carry earthquake locations to greater depths.';
        await claim.fill(draft);
        await navigate('forces', 'What Moves Plates', '⚖️ What Moves Plates');
        await navigate('explain', 'Explain It', '📝 Explain It');
        assert.equal(await claim.inputValue(), draft);
      });
      await check('Restored exploration receipts remain silent after remount', async () => {
        const seed = await page.evaluate(() => qaData.plateTectonics);
        await page.evaluate(seed => { qaLog.xp = []; qaMount(false, seed); qaFrames(2); }, seed);
        await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => qaLog.xp.length), 0);
      });
    } else if (process.argv.includes('--shelf')) {
      // Test this lifecycle with the browser's own frame clock. A QA-stepped
      // frame queue cannot be blamed for a canvas that remains unpainted here.
      await page.evaluate(() => {
        window.requestAnimationFrame = qaNativeRequestAnimationFrame;
        window.cancelAnimationFrame = qaNativeCancelAnimationFrame;
      });
      await mount(true, 390);
      const nativeFrames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const state = async selector => page.locator(selector).evaluate(canvas => {
        const context = canvas.getContext('2d');
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let opaque = 0, sampled = 0;
        const colors = new Set();
        for (let i = 3; i < pixels.length; i += 64) {
          sampled++; if (pixels[i] > 0) opaque++;
          colors.add(`${pixels[i - 3]},${pixels[i - 2]},${pixels[i - 1]},${pixels[i]}`);
        }
        const rect = canvas.getBoundingClientRect();
        const prefix = canvas.classList.contains('pt-primary-canvas') ? '_pt' : canvas.closest('.pt-tb-shell') ? '_tb' : '_eq';
        return { nativeRAF: requestAnimationFrame === qaNativeRequestAnimationFrame, reducedMotion: __alloPtReducedMotion(), onScreen: __alloPtOnScreen(canvas), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, bitmap: { width: canvas.width, height: canvas.height }, opaqueFraction: opaque / sampled, sampledColors: colors.size, paintCalls: canvas.__qaPaintCalls || 0, initialized: !!canvas[prefix + 'Init'], hasRedraw: typeof canvas[prefix + 'Redraw'] === 'function', frameHandle: canvas[prefix + 'Anim'] || 0 };
      });
      await check('Phone Hub step one paints the main simulation under reduced motion', async () => {
        await page.locator('[data-pt-start-step="sim"]').click({ force: true });
        const main = page.locator('.pt-primary-canvas');
        await main.waitFor();
        await main.evaluate(canvas => canvas.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await nativeFrames();
        const detail = await state('.pt-primary-canvas');
        assert.ok(detail.opaqueFraction > 0.99 && detail.sampledColors > 30, 'The visible main canvas must contain the rendered plates');
        await capture('dark-390-hub-step-one-simulation', main);
        return detail;
      });
      // A saved activity can mount with both optional diagrams more than two
      // screens below the viewport. It must not depend on a scroll or resize.
      await page.evaluate(() => {
        scrollTo(0, 0);
        qaMount(true, { simTab: 'earthquake', _ptPicked: true, _ptCategory: 'sim_quiz' });
      });
      const canvas = page.locator('.pt-tb-shell canvas');
      await canvas.waitFor({ state: 'attached' });
      await nativeFrames();
      const initial = { boundaries: await state('.pt-tb-shell canvas'), scales: await state('.pt-eq-shell canvas') };
      await check('Restored phone activity paints both offscreen static diagrams once', async () => {
        for (const detail of Object.values(initial)) {
          assert.ok(detail.opaqueFraction > 0.99 && detail.sampledColors > 30, 'Offscreen static diagrams need an initial drawing');
          assert.equal(detail.frameHandle, 0, 'Reduced-motion diagrams must park after drawing');
        }
        return initial;
      });
      await canvas.evaluate(canvas => canvas.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await nativeFrames();
      await page.waitForTimeout(500);
      const afterScroll = { boundaries: await state('.pt-tb-shell canvas'), scales: await state('.pt-eq-shell canvas') };
      await capture('dark-390-three-boundaries-after-scroll', canvas);
      await check('Scrolling shows both diagrams without restarting continuous animation', async () => {
        for (const key of ['boundaries', 'scales']) {
          assert.ok(afterScroll[key].opaqueFraction > 0.99 && afterScroll[key].sampledColors > 30);
          assert.equal(afterScroll[key].paintCalls, initial[key].paintCalls, `${key} should retain its static frame`);
          assert.equal(afterScroll[key].frameHandle, 0);
        }
        return afterScroll;
      });
      await page.setViewportSize({ width: 391, height: 1000 });
      await nativeFrames();
      await page.waitForTimeout(150);
      const afterResize = { boundaries: await state('.pt-tb-shell canvas'), scales: await state('.pt-eq-shell canvas') };
      await capture('dark-391-three-boundaries-after-resize', canvas);
      await check('Both reduced-motion diagrams repaint after resize', async () => {
        for (const key of ['boundaries', 'scales']) {
          assert.ok(afterResize[key].opaqueFraction > 0.99 && afterResize[key].sampledColors > 30);
          assert.ok(afterResize[key].paintCalls > afterScroll[key].paintCalls);
          assert.equal(afterResize[key].frameHandle, 0);
        }
      });
      async function retainCanvases() { await page.evaluate(() => { window.qaRetiredCanvases = [...document.querySelectorAll('.pt-tb-shell canvas,.pt-eq-shell canvas')]; }); }
      async function checkCleanup() {
        const retired = await page.evaluate(() => qaRetiredCanvases.map(canvas => ({ connected: canvas.isConnected, observers: !!(canvas._tbRO || canvas._eqRO), frames: (canvas._tbAnim || 0) + (canvas._eqAnim || 0) })));
        assert.equal(retired.length, 2);
        for (const item of retired) assert.deepEqual(item, { connected: false, observers: false, frames: 0 });
        return retired;
      }
      await check('Closing additional models disconnects the parked canvas observers', async () => {
        await retainCanvases();
        await page.locator('[data-pt-shelf-close]').click({ force: true });
        await page.waitForFunction(() => !document.querySelector('.pt-tb-shell canvas'), null, { polling: 50 });
        return checkCleanup();
      });
      await check('Returning to Hub disconnects the parked canvas observers', async () => {
        await page.locator('[data-pt-shelf-open]').click({ force: true });
        await canvas.waitFor({ state: 'attached' });
        await retainCanvases();
        await page.getByRole('button', { name: '🏠 Hub', exact: true }).click({ force: true });
        await page.locator('[data-pt-start-here]').waitFor();
        return checkCleanup();
      });
      report.findings.push({ name: 'Reduced-motion additional-model first paint on the native browser frame clock', initial, afterScroll, afterResize });
      console.log('SHELF', JSON.stringify({ initial, afterScroll, afterResize }));
    } else if (process.argv.includes('--affected')) {
      for (const [dark, width] of [[false, 1100], [true, 390]]) {
        const prefix = `${dark ? 'dark' : 'light'}-${width}`;
        await mount(dark, width);
        await navigate('earthquake', 'Earthquake Lab', '📈 Earthquake Lab');
        await capture(prefix + '-earthquake', page.getByRole('heading', { name: 'Earthquake Magnitude Simulator', exact: true }));
        const labelCheck = async () => {
          const detail = await page.locator('[data-qa-seismogram]').evaluate(canvas => ({ width: canvas.getBoundingClientRect().width, labels: Object.values(canvas.__qaSeismoLabels) }));
          assert.equal(detail.labels.length, 4);
          for (const label of detail.labels) assert.ok(label.x >= 0 && label.x + label.width <= detail.width, `${label.text} stays in frame`);
          for (let i = 0; i < detail.labels.length; i++) for (let j = i + 1; j < detail.labels.length; j++) {
            const a = detail.labels[i], b = detail.labels[j];
            assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${a.text} overlaps ${b.text}`);
          }
          return detail;
        };
        await check(prefix + ' default seismogram captions remain in frame without overlap', labelCheck);
        await page.locator('input[aria-label^="Earthquake magnitude"]').focus(); await page.keyboard.press('End');
        await page.locator('input[aria-label^="Distance from the recording station"]').focus(); await page.keyboard.press('Home');
        await page.waitForFunction(() => qaData.plateTectonics.eqMagnitude === 9 && qaData.plateTectonics.eqDistKm === 100, null, { polling: 50 });
        await page.evaluate(() => qaFrames(3));
        await capture(prefix + '-seismogram-near-large', page.locator('[data-qa-seismogram]'));
        await check(prefix + ' nearby M9 seismogram captions remain in frame without overlap', labelCheck);
        await navigate('hotspots', 'Hotspots', '🔥 Hotspots');
        await capture(prefix + '-hotspot-chain', page.locator('[data-pt-hotspot-chain]'));
      }
    } else {
    for (const [dark, width] of (process.argv.includes('--activities') ? [] : [[false, 1100], [true, 1100], [false, 390], [true, 390]])) {
      await mount(dark, width);
      await capture(`${dark ? 'dark' : 'light'}-${width}-hub`);
      if (width === 390) await audit(`${dark ? 'dark' : 'light'} mobile navigation`, header);
    }
    await mount(false, 1100);
    await navigate('earthquake', 'Earthquake Lab', '📈 Earthquake Lab');
    await capture('light-1100-earthquake-navigation');
    const quakeHeading = page.getByRole('heading', { name: 'Earthquake Magnitude Simulator', exact: true });
    await capture('light-1100-earthquake', quakeHeading);
    await audit('earthquake main panel', quakeHeading.locator('../..'));
    const activeTab = page.locator('[role=tab][aria-selected=true]');
    await activeTab.focus();
    const navBefore = await activeTab.getAttribute('id');
    await page.keyboard.press('ArrowRight');
    const arrowState = await page.evaluate(() => ({ activeId: document.activeElement.id, selected: document.querySelector('[role=tab][aria-selected=true]')?.id, tab: qaData.plateTectonics.simTab }));
    await page.keyboard.press('Tab');
    const tabState = await page.evaluate(() => ({ tag: document.activeElement.tagName, id: document.activeElement.id, text: document.activeElement.textContent.slice(0, 80) }));
    report.findings.push({ name: 'category tab keyboard navigation', navBefore, arrowState, afterTab: tabState });
    await navigate('quiz', 'Quiz', '❓ Quiz');
    const quizHeader = page.locator('[data-pt-quiz-header]');
    await capture('light-1100-quiz', quizHeader);
    await page.locator('[data-pt-quiz-opt="1"]').click({ force: true });
    await page.locator('[data-pt-quiz-verdict]').waitFor();
    await capture('light-1100-quiz-feedback', quizHeader);
    await audit('quiz panel answered', quizHeader.locator('../..'));
    report.findings.push({ name: 'quiz feedback focus', detail: await page.evaluate(() => ({ active: document.activeElement.tagName, id: document.activeElement.id, text: document.activeElement.textContent.slice(0, 80), verdict: document.querySelector('[data-pt-quiz-verdict]')?.textContent, announcements: qaLog.announcements.slice(-3) })) });
    await navigate('hotspots', 'Hotspots', '🔥 Hotspots');
    if (await page.locator('[data-pt-hotspot-chain]').count()) await capture('light-1100-hotspot-chain', page.locator('[data-pt-hotspot-chain]'));
    await mount(true, 390);
    await navigate('earthquake', 'Earthquake Lab', '📈 Earthquake Lab');
    await capture('dark-390-earthquake', page.getByRole('heading', { name: 'Earthquake Magnitude Simulator', exact: true }));
    await audit('dark earthquake main panel', page.getByRole('heading', { name: 'Earthquake Magnitude Simulator', exact: true }).locator('../..'));
    await navigate('glossary', 'Glossary', '📖 Glossary');
    await capture('dark-390-glossary', page.getByRole('heading', { name: /Geology Glossary/ }));
    await audit('dark glossary', page.getByRole('heading', { name: /Geology Glossary/ }).locator('..'));
    await page.locator('input[aria-label="Search the glossary"]').fill('subduction');
    await capture('dark-390-glossary-search', page.getByRole('heading', { name: /Geology Glossary/ }));
    await navigate('forces', 'What Moves Plates', '⚖️ What Moves Plates');
    report.findings.push({ name: 'forces structure', headings: await page.getByRole('heading').allTextContents() });
    await capture('dark-390-forces-navigation');
    const forces = page.locator('[data-pt-forces]').first();
    if (await forces.count()) { await capture('dark-390-forces', forces); await audit('forces', forces); }
    else { const heading = page.getByRole('heading').filter({ hasText: /moves plates|forces/i }).first(); if (await heading.count()) await capture('dark-390-forces', heading); }
    await navigate('fit', 'Continent Puzzle', '🧩 Continent Puzzle');
    report.findings.push({ name: 'fit structure', headings: await page.getByRole('heading').allTextContents() });
    const fitHeading = page.locator('[data-pt-fit]');
    if (await fitHeading.count()) await capture('dark-390-continent-puzzle', fitHeading);
    await navigate('explain', 'Explain It', '📝 Explain It');
    report.findings.push({ name: 'explain structure', headings: await page.getByRole('heading').allTextContents() });
    const explainHeading = page.locator('[data-pt-explain]');
    if (await explainHeading.count()) { await capture('dark-390-explain', explainHeading); await audit('explain', explainHeading.locator('..')); }
    await navigate('hotspots', 'Hotspots', '🔥 Hotspots');
    if (await page.locator('[data-pt-hotspot-chain]').count()) await capture('dark-390-hotspot-chain', page.locator('[data-pt-hotspot-chain]'));
    await page.getByRole('button', { name: '🏠 Hub', exact: true }).click({ force: true });
    await page.locator('[data-pt-start-here]').waitFor();
    report.findings.push({ name: 'hub restores landing only', detail: await page.evaluate(() => ({ stateTab: qaData.plateTectonics.simTab, visibleHeadings: [...document.querySelectorAll('h3')].map(n => n.textContent), height: document.documentElement.scrollHeight })) });
    await search.fill('subduction');
    await capture('dark-390-search-subduction');
    report.findings.push({ name: 'concept search', detail: await page.evaluate(() => ({ query: qaData.plateTectonics._ptSearch, noMatches: document.body.innerText.includes('No matches.'), headerText: document.querySelector('.pt-sim-shell > div')?.innerText })) });
    }
    await page.evaluate(() => { clearInterval(window.qaControlFrames); qaDestroy(); });
  } catch (error) { report.errors.push(String(error.stack || error)); console.error(error); }
  finally {
    fs.writeFileSync(path.join(out, process.argv.includes('--controls-only') ? 'controls-results.json' : process.argv.includes('--affected') ? 'affected-results.json' : process.argv.includes('--shelf') ? 'shelf-results.json' : 'results.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({ captures: report.captures.length, findings: report.findings.length, checksPassed: report.checks.filter(c => c.passed).length, checksTotal: report.checks.length, errors: report.errors.length, sourceSha256: report.sourceSha256, report: path.join(out, process.argv.includes('--controls-only') ? 'controls-results.json' : process.argv.includes('--affected') ? 'affected-results.json' : process.argv.includes('--shelf') ? 'shelf-results.json' : 'results.json') }));
  if (report.errors.length || report.checks.some(c => !c.passed)) process.exitCode = 1;
})();
