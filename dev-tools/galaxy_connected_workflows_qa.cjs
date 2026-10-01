// Real browser checks for connected investigations and asynchronous quiz ownership.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-connected-workflows-2026-09-29');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
let shell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf('`;\n\n(async'));
shell = shell.replace('var pair = React.useState({ galaxy: state });', `var pair = React.useState({ galaxy: state });
    window.__galaxyState = pair[0].galaxy;
    window.__patchGalaxy = function(patch) { pair[1](function(prev) { return { galaxy: Object.assign({}, prev.galaxy, patch) }; }); };`);
shell = shell.replace('callGemini: null,', `callGemini: window.__quizService ? function(prompt, cb) {
      window.__quizRequests.push(cb);
      if (window.__quizService === 'throw') throw new Error('Service failed');
      if (window.__quizService === 'reject') return Promise.reject(new Error('Service rejected'));
    } : null,`);
const cssAsset = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const bank = [
  { q: 'Which star is closest to Earth?', a: 'Sun', options: ['Sun', 'Sirius'] },
  { q: 'What makes up a stellar nursery?', a: 'Gas', options: ['Gas', 'Rock'] },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  if (process.argv.includes('--serve')) {
    const http = require('node:http');
    const assets = { '/react.js': 'desktop/web-app/node_modules/react/umd/react.production.min.js', '/react-dom.js': 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', '/three.js': 'vendor/three-r128/three.min.js', '/galaxy.js': 'stem_lab/stem_tool_galaxy.js', '/styles.css': cssAsset };
    const previewShell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf(';\n\n(async') - 1);
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost'); res.setHeader('Cache-Control', 'no-store');
      if (url.pathname === '/') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Galaxy Explorer — local preview</title><link rel="stylesheet" href="/styles.css"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/three.js"></script><script src="/ui-strings.js"></script><script>' + previewShell + '</script><script src="/galaxy.js"></script><script>window.__mount({simMode:"galaxy",galaxyAutoRotate:false});</script></body></html>');
      } else if (url.pathname === '/ui-strings.js') {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); res.end('window.__uiStrings=' + read('ui_strings.js') + ';');
      } else if (assets[url.pathname]) {
        res.setHeader('Content-Type', url.pathname.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8'); res.end(read(assets[url.pathname]));
      } else { res.statusCode = 404; res.end('Not found'); }
    });
    server.listen(Number(process.env.GALAXY_PREVIEW_PORT || 0), '127.0.0.1', () => console.log('GALAXY_PREVIEW=http://127.0.0.1:' + server.address().port));
    return;
  }
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ path: path.join(ROOT, cssAsset) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';window.__quizRequests=[];window.__quizService=false;' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    // Accelerate only the explicit generation deadline, preserving all other timers.
    await page.evaluate(() => {
      const original = window.setTimeout;
      window.setTimeout = function(fn, delay, ...args) {
        return original(fn, window.__fastQuizTimeout && delay === 25000 ? 30 : delay, ...args);
      };
    });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const state = () => page.evaluate(() => window.__galaxyState);
    const mount = async (data, service = false) => { await page.evaluate(({ data, service }) => { window.__quizService = service; window.__fastQuizTimeout = false; window.__mount(data); }, { data, service }); await settle(); };
    const patch = async data => { await page.evaluate(data => window.__patchGalaxy(data), data); await settle(); };
    const act = async name => { await page.getByRole('button', { name, exact: false }).click(); await settle(); };
    const mode = async key => { await page.locator('[data-galaxy-mode="' + key + '"]').click(); await settle(); assert.equal(await page.locator('[data-galaxy-mode][aria-pressed="true"]').count(), 1); };
    const reply = async (index, data) => { await page.evaluate(({ index, data }) => window.__quizRequests[index](data), { index, data }); await settle(); };
    const requestCount = () => page.evaluate(() => window.__quizRequests.length);
    const overflow = async () => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(await page.evaluate(() => Array.from(document.querySelectorAll('[data-galaxy-star-bridges] button,[data-galaxy-stage-controls] button,[data-galaxy-quiz-controls] button')).filter(b => b.getBoundingClientRect().width > 0).filter(b => { const r = b.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).map(b => b.textContent)), []);
    };
    const chemistry = { metallicity: 0.2, mass: 4, age: 8, hypothesis: 'Compare the histories of these stars.', explanation: 'Keep my evidence.', log: [{ z: 1, m: 1, a: 5, st: 'solar' }] };
    await mount({ simMode: 'galaxy', selectedStar: 'K', galaxyAutoRotate: false, metalHunt: chemistry });
    await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyCycleStar, null, { timeout: 60000 });
    await page.locator('[data-galaxy-star-bridges]').scrollIntoViewIfNeeded(); await page.screenshot({ animations: 'disabled', path: path.join(OUT, 'selected-star-1440.png') });
    await act('Explore this star type’s life'); assert.equal((await state()).lifecycleMass, 0.7); assert.equal((await state()).activeStage, 'main_sequence');
    await mode('galaxy'); await act('Explore chemistry at this mass'); let s = await state(); assert.equal(s.metalHunt.mass, 0.7); assert.equal(s.metalHunt.hypothesis, chemistry.hypothesis); assert.deepEqual(s.metalHunt.log, chemistry.log);
    await act('Log this combination'); await patch({ metalHunt: { ...(await state()).metalHunt, metallicity: 1.8, mass: 12, age: 0.2 } });
    await act('Log this combination'); await page.getByRole('button', { name: 'Restore combination 2', exact: true }).click(); await settle(); s = await state(); assert.equal(s.metalHunt.mass, 0.7); assert.equal(s.metalHunt.metallicity, 0.2); assert.equal(s.metalHunt.age, 8); assert.equal(s.metalHunt.log.length, 3); assert.equal(s.metalHunt.explanation, chemistry.explanation);
    await act('Explore this mass in Star Life'); assert.equal((await state()).lifecycleMass, 0.7); await mode('metalHunt'); assert.equal((await state()).metalHunt.hypothesis, chemistry.hypothesis);
    // Stage stepping follows the actual mass branch and cannot leave its endpoints.
    const stageBranches = [];
    for (const mass of [0.05, 0.3, 1, 12, 30]) {
      await mount({ simMode: 'star', lifecycleMass: mass, activeStage: 'nebula' }); const controls = page.locator('[data-galaxy-stage-controls]');
      assert(await page.getByRole('button', { name: 'Previous stage', exact: true }).isDisabled()); let stages = 1;
      while (!await page.getByRole('button', { name: 'Next stage', exact: true }).isDisabled()) { assert(stages++ < 15); await act('Next stage'); const count = (await controls.locator('[role="status"]').textContent()).match(/^Stage (\d+) of (\d+): /); assert(count); assert.equal(Number(count[1]), stages); assert(Number(count[2]) >= stages); assert.equal(await page.locator('[data-star-life-canvas]').evaluate(c => c._stellarStage), (await state()).activeStage); }
      const last = (await state()).activeStage; await act('Previous stage'); assert.notEqual((await state()).activeStage, last); stageBranches.push({ mass, stages, last });
    }
    // Keyboard activation advances the same time-lapse as a pointer click.
    await mount({ simMode: 'galaxy', galaxyControlPanel: 'time', galaxyAutoRotate: false, cosmicAge: 5 });
    const timeLapse = page.getByRole('button', { name: 'Toggle cosmic time-lapse playback', exact: true }); await timeLapse.focus(); await page.keyboard.press('Enter'); await page.waitForFunction(() => window.__galaxyState.cosmicAge > 5); await page.keyboard.press('Space'); await settle(); assert.equal(await page.evaluate(() => !!window._galaxyTimeLapse), false);
    await timeLapse.click(); await mode('star'); assert.equal(await page.evaluate(() => !!window._galaxyTimeLapse), false);
    // Ordinary visits and active-tab clicks preserve both answers and progress.
    await mount({ simMode: 'galaxy', quizMode: true, dynamicQuiz: bank }); await act('Select answer: Sun'); const answered = await state(); await mode('quiz'); assert.deepEqual((await state()).quizFeedback, answered.quizFeedback); await act('Next'); await mode('star'); await mode('quiz'); assert.equal((await state()).quizIdx, 1); assert.equal((await state()).quizScore, 1); assert.equal(await requestCount(), 0);
    await act('Select answer: Gas'); await act('See results'); await act('Back to the galaxy'); await mode('quiz'); assert.equal((await state()).quizDone, true); await act('Restart this quiz'); assert.equal((await state()).quizIdx, 0); assert.equal((await state()).quizScore, 0); assert.equal((await state()).dynamicQuiz.length, 2);
    // Slow, malformed, cancelled and obsolete requests cannot replace current work.
    await mount({ quizMode: true, dynamicQuiz: bank, quizIdx: 1, quizScore: 1 }, true);
    await act('Load new questions'); let id = (await requestCount()) - 1; await act('Keep current quiz'); await reply(id, { text: JSON.stringify([{ q: 'Late cancelled question', a: 'A', options: ['A', 'B'] }]) }); assert.equal((await state()).quizIdx, 1); assert.equal((await state()).dynamicQuiz[0].q, bank[0].q);
    await act('Load new questions'); id = (await requestCount()) - 1; await mode('star'); await reply(id, { text: JSON.stringify([{ q: 'Late mode question', a: 'A', options: ['A', 'B'] }]) }); await mode('quiz'); assert.equal((await state()).quizIdx, 1); assert.equal((await state()).dynamicQuiz[0].q, bank[0].q);
    await act('Load new questions'); id = (await requestCount()) - 1; await reply(id, { text: '{invalid' }); assert.equal((await state()).quizIdx, 1); assert.equal(await page.getByRole('button', { name: 'Select answer: Gas', exact: true }).count(), 1);
    await act('Load new questions'); const obsolete = (await requestCount()) - 1; await act('Keep current quiz'); await act('Load new questions'); id = (await requestCount()) - 1;
    await reply(obsolete, { text: JSON.stringify([{ q: 'Obsolete question', a: 'A', options: ['A', 'B'] }]) }); assert.equal(await page.getByRole('button', { name: 'Keep current quiz', exact: true }).count(), 1);
    const newBank = [{ q: 'New valid question', a: 'A', options: ['A', 'B'] }]; await reply(id, { text: '```json\n' + JSON.stringify(newBank) + '\n```' }); assert.equal((await state()).quizIdx, 0); assert.equal((await state()).quizScore, 0); assert.equal((await state()).dynamicQuiz[0].q, newBank[0].q);
    await reply(id, { text: JSON.stringify(bank) }); assert.equal((await state()).dynamicQuiz[0].q, newBank[0].q);
    await page.evaluate(() => window.__fastQuizTimeout = true); await act('Load new questions'); id = (await requestCount()) - 1; await page.waitForFunction(() => !window.__galaxyState.isGeneratingQuiz); assert.equal((await state()).dynamicQuiz[0].q, newBank[0].q); assert(await page.getByText('New questions took too long to load. Your current quiz is ready.', { exact: true }).isVisible()); await reply(id, { text: JSON.stringify(bank) }); assert.equal((await state()).dynamicQuiz[0].q, newBank[0].q);
    for (const service of ['throw', 'reject']) { await mount({ quizMode: true, dynamicQuiz: bank, quizIdx: 1 }, service); await act('Load new questions'); assert.equal((await state()).quizIdx, 1); assert.equal((await state()).isGeneratingQuiz, false); }
    await mount({ quizMode: true, dynamicQuiz: bank }, true); await act('Load new questions'); id = (await requestCount()) - 1; await mount({ simMode: 'metalHunt', metalHunt: chemistry }); await reply(id, { text: JSON.stringify(newBank) }); assert.equal((await state()).dynamicQuiz, undefined);
    await mount({ quizMode: true, dynamicQuiz: bank, quizIdx: 1, isGeneratingQuiz: true }); assert.equal(await page.getByRole('button', { name: 'Select answer: Gas', exact: true }).count(), 1);
    // Readable controls at desktop and phone widths, with actual bounds checks.
    const layouts = [];
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1050 });
      for (const [key, data, selector] of [
        ['star-link', { simMode: 'galaxy', selectedStar: 'A', galaxyAutoRotate: false }, '[data-galaxy-star-bridges]'],
        ['star-stages', { simMode: 'star', lifecycleMass: 12, activeStage: 'supernova' }, '[data-galaxy-stage-controls]'],
        ['chemistry', { simMode: 'metalHunt', metalHunt: { ...chemistry, log: [{ z: 0.2, m: 0.7, a: 8, st: 'poor' }, { z: 1.8, m: 12, a: 0.2, st: 'rich' }] } }, '[data-galaxy-metallicity-log]'],
        ['quiz', { quizMode: true, dynamicQuiz: bank, quizIdx: 1, quizScore: 1 }, '[data-galaxy-quiz-controls]'],
      ]) { await mount(data); await page.locator(selector).scrollIntoViewIfNeeded(); await settle(); await overflow(); if (key === 'chemistry') { await page.getByRole('button', { name: 'Restore combination 1', exact: true }).click(); await settle(); const restored = await state(); assert.equal(restored.metalHunt.mass, 0.7); assert.equal(restored.metalHunt.age, 8); assert.equal(restored.metalHunt.log.length, 2); assert.equal(restored.metalHunt.hypothesis, chemistry.hypothesis); for (const button of await page.locator('[data-galaxy-metallicity-restore],[data-galaxy-metallicity-restore-mobile]').all()) { if (!await button.isVisible()) continue; const box = await button.boundingBox(); assert(box.x >= 0 && box.x + box.width <= width + 1, 'Restore stays visible at ' + width); } } await page.screenshot({ animations: 'disabled', path: path.join(OUT, key + '-' + width + '.png') }); }
      layouts.push({ width, overflow: false });
    }
    await page.evaluate(() => document.documentElement.dir = 'rtl'); await mount({ simMode: 'star', lifecycleMass: 30, activeStage: 'black_hole' }); await overflow(); await page.locator('[data-galaxy-stage-controls]').scrollIntoViewIfNeeded(); await page.screenshot({ animations: 'disabled', path: path.join(OUT, 'star-stages-rtl-320.png') });
    await mount({ simMode: 'galaxy', galaxyAutoRotate: false }); const cleanup = await page.evaluate(() => { const cv = document.querySelector('[data-galaxy-canvas]'); window.__mount({ simMode: 'star' }); return !cv.isConnected && !window._galaxyTimeLapse; }); assert(cleanup);
    assert.equal(errors.length, 0, errors.join('\n'));
    const result = { errors, layouts, stageBranches, starToLife: true, starToChemistry: true, chemistryToLife: true, chemistryRestore: true, notesPreserved: true, keyboardTimeLapse: true, modeCleanup: cleanup, quizResume: true, quizActiveTabPreserved: true, quizResultsPreserved: true, quizRestart: true, quizCancel: true, quizModeCancellation: true, quizInvalidResponse: true, quizStaleReply: true, quizTimeout: true, quizServiceFailure: true, quizUnmount: true, quizRestoredLoading: true, rtl: true };
    fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
