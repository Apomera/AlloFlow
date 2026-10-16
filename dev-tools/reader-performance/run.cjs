#!/usr/bin/env node
'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module'), { execFileSync } = require('node:child_process');
const { cases, makeFixture } = require('./fixtures.cjs');
const root = path.resolve(__dirname, '../..'), args = process.argv.slice(2);
function option(name, fallback) { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; }
const depsRoot = path.resolve(option('--deps', root)), req = createRequire(path.join(depsRoot, 'package.json'));
const esbuild = req('esbuild');
const instrument = args.includes('--instrument'), smoke = args.includes('--smoke'), validate = args.includes('--validate');
const retention = args.includes('--retention');
const verifyCrawlMotion = args.includes('--verify-crawl-motion');
const verifyWordHelpSpotlight = args.includes('--verify-word-help-spotlight');
const verifyAuxiliaryAudio = args.includes('--verify-auxiliary-audio');
const verifySectionPrompts = args.includes('--verify-section-prompts');
const verifyReadingPosition = args.includes('--verify-reading-position');
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const environment = {platform:process.platform,arch:process.arch,node:process.version,os:require('os').release(),cpu:require('os').cpus()[0].model,logicalCPUs:require('os').cpus().length};
const harnessHashes = Object.fromEntries(['fixtures.cjs','harness.jsx','instrumentation.js','run.cjs'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex')]));
const sourceFiles = ['view_simplified_source.jsx', 'immersive_reader_source.jsx', 'instructional_context_module.js',
  'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js'];
const fromGit = args.includes('--baseline-source');
const readSource = file => fromGit ? execFileSync('git', ['show', 'HEAD:' + file], {cwd:root, maxBuffer:16*1024*1024}) : fs.readFileSync(path.join(root,file));
const embeddedReaderHelpers = ['reader_place_store.js', 'reader_support_drafts.js'];
if (!fromGit) for (const file of embeddedReaderHelpers) if (fs.existsSync(path.join(root, file))) sourceFiles.push(file);
const hashes = () => Object.fromEntries(sourceFiles.map(file => [file, crypto.createHash('sha256').update(readSource(file)).digest('hex')]));
const initialHashes = hashes(), baseline = head();
function checkFixtures() {
  for (const spec of cases) {
    const fixture = makeFixture(spec);
    assert.deepEqual(makeFixture(spec), fixture, 'Fixtures must be deterministic');
    assert.equal(fixture.annotations.length, spec.supports || 0);
    for (const entry of fixture.annotations) assert.equal(fixture.data.slice(entry.start, entry.end), entry.quote);
    assert.equal(new Set(fixture.annotations.map(entry => entry.start)).size, fixture.annotations.length);
    if (spec.originalSupports) {
      const original = makeFixture({ sentences: spec.sentences, supports: spec.originalSupports });
      assert.equal(original.data, fixture.originalText);
      assert.equal(original.annotations.length, spec.originalSupports);
      for (const entry of original.annotations) assert.equal(fixture.originalText.slice(entry.start, entry.end), entry.quote);
    }
  }
}
checkFixtures();
function bundle(options) {
  return esbuild.buildSync({ bundle: true, write: false, platform: 'browser', format: 'iife',
    absWorkingDir: path.join(depsRoot, 'desktop/web-app'), nodePaths: [path.join(depsRoot, 'desktop/web-app/node_modules'), path.join(depsRoot, 'node_modules')],
    define: { 'process.env.NODE_ENV': '"production"' }, ...options }).outputFiles[0].text;
}
console.log('Preparing browser fixture runtime');
const runtime = bundle({ stdin: { resolveDir: path.join(depsRoot, 'desktop/web-app'), contents:
  "import React from 'react'; import {createRoot} from '" + (instrument ? 'react-dom/profiling' : 'react-dom/client') + "';  window.React=React;window.createRoot=createRoot;window.AlloIcons=new Proxy({}, {get:()=>()=>null});window.AlloModules={};window.AlloLanguageContext=React.createContext({t:k=>k});" } });
function sourceModule(file, exports) {
  let raw = readSource(file).toString('utf8');
  if (file === 'view_simplified_source.jsx' && !fromGit)
    raw = embeddedReaderHelpers.filter(helper => fs.existsSync(path.join(root, helper))).map(helper => fs.readFileSync(path.join(root, helper), 'utf8')).join('\n') + '\n' + raw;
  if (file === 'view_simplified_source.jsx' && retention) {
    const marker = 'return { key: storageKey, load, save';
    assert.ok(raw.includes(marker), 'Reading-place retention probe needs review');
    raw = raw.replace(marker, 'return { inspectRetention: () => ({ entries: entries.size, keyChars: [...entries.keys()].reduce((n, key) => n + key.length, 0), authored: [...entries.values()].filter(entry => hasWork(entry.draft)).length, recovery: [...entries.values()].filter(needsRecovery).length }), key: storageKey, load, save');
    raw += '\nwindow.readerPlaceRetention = () => readingPlaceStore.inspectRetention();';
  }
  const transformed = esbuild.transformSync(raw, { loader: 'jsx', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', target: 'es2020' }).code;
  return '(function(){var React=window.React,Fragment=React.Fragment;\n' + transformed + '\nObject.assign(window.AlloModules,{' + exports.join(',') + '});})();';
}
console.log('Preparing reader source modules');
const scripts = [
  runtime,
  'window.fixtureStrings=' + fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8') + ';',
  ...sourceFiles.filter(file => file.endsWith('_module.js')).map(file => readSource(file).toString('utf8')),
  sourceModule('immersive_reader_source.jsx', ['FocusReaderOverlay', 'SpeedReaderOverlay:FocusReaderOverlay', 'BionicChunkReader:FocusReaderOverlay', 'PerspectiveCrawlOverlay', 'KaraokeReaderOverlay', 'ImmersiveToolbar', 'ImmersiveWord']),
  sourceModule('view_simplified_source.jsx', ['SimplifiedView']),
  bundle({ entryPoints: [path.join(__dirname, 'harness.jsx')] })
];
console.log('Fixture modules ready');
if (validate) {
  console.log(JSON.stringify({ status: 'fixture-validation-only', cases: cases.length, baseline, sourceHashes: initialHashes,
    note: 'Compiled in memory. No browser, baseline measurements, generated-module edits, or application changes.' }, null, 2));
  process.exit(0);
}
if (!smoke && option('--baseline-ready') !== baseline) {
  throw new Error('Measurements require --baseline-ready ' + baseline + ' to explicitly identify the inspected baseline. Use --validate or --smoke for fixture verification only.');
}
const cssDir = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDir).filter(name => name.endsWith('.css')).sort()[0];
if (!cssFile) throw new Error('No built application CSS available; do not measure an unstyled reader.');
const css = fs.readFileSync(path.join(cssDir, cssFile));
const wav = Buffer.alloc(44 + 16000 * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
const instrumentation = fs.readFileSync(path.join(__dirname, 'instrumentation.js'), 'utf8');
const selected = option('--case') ? cases.filter(spec => option('--case').split(',').includes(spec.name)) : smoke
  ? [{ name: 'smoke', sentences: 30, supports: 6, teacher: true }] : cases;
assert.ok(selected.length, 'Unknown fixture case');
const spotlightCase = spec => spec.supports > 0 && !spec.immersive && !spec.compare && !spec.protectedOriginal;
assert.ok(!verifyWordHelpSpotlight || selected.some(spotlightCase),
  '--verify-word-help-spotlight needs a non-immersive adapted case with supports, such as --smoke or --case large-text-phone');
assert.ok(!verifyAuxiliaryAudio || selected.some(spotlightCase),
  '--verify-auxiliary-audio needs a non-immersive adapted case with supports, such as --smoke or --case large-text-phone');
assert.ok(!verifySectionPrompts || selected.some(spec => spec.leadingTitle && spec.headings),
  '--verify-section-prompts needs --case section-prompts,section-prompts-phone');
assert.ok(!verifyReadingPosition || selected.some(spec => spec.leadingTitle && spec.headings),
  '--verify-reading-position needs --case section-prompts,section-prompts-phone');
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/style.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return; }
  if (url.pathname === '/tone.wav') { response.setHeader('Content-Type', 'audio/wav'); response.end(wav); return; }
  if (/^\/script-\d+\.js$/.test(url.pathname)) {
    response.setHeader('Content-Type', 'text/javascript'); response.end(scripts[Number(url.pathname.match(/\d+/)[0])] || ''); return;
  }
  if (url.pathname !== '/') { response.statusCode = 404; response.end(); return; }
  const spec = selected.find(item => item.name === url.searchParams.get('case'));
  if (!spec) { response.statusCode = 400; response.end('Unknown case'); return; }
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css">' +
    '<style>html,body{margin:0;font-family:Arial,sans-serif;font-size:' + (spec.fontSize || 16) + 'px}#root{max-width:1280px;margin:auto;padding:16px}button,input,textarea,select{font:inherit}</style></head>' +
    '<body class="theme-light"><main id="root" class="allo-docsuite"></main><script>window.fixtureSpec=' + JSON.stringify(spec) + ';' + instrumentation +
    '</script>' + scripts.map((_, i) => '<script src="/script-' + i + '.js"></script>').join('') + '</body></html>');
});
const nextPaint = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function patch(page, update) { await page.evaluate(update => window.readerFixture.patch(update), update); await nextPaint(page); }
async function checkCrawlMotion(page) {
  const panelSelector = '[data-help-key="perspective_crawl_overlay_panel"] [role="button"]';
  const panel = page.locator(panelSelector);
  const position = () => panel.locator('p').first().evaluate(node => node.parentElement.style.transform);
  const preference = async reducedMotion => {
    await page.emulateMedia({ reducedMotion });
    await page.waitForFunction(reduced => matchMedia('(prefers-reduced-motion: reduce)').matches === reduced, reducedMotion === 'reduce');
    await nextPaint(page);
  };
  const playing = expected => page.waitForFunction(({ selector, expected }) =>
    document.querySelector(selector)?.getAttribute('aria-pressed') === String(expected), { selector: panelSelector, expected });
  assert.equal(await panel.count(), 1, 'Crawl fixture must mount its immersive reader and overlay');
  await playing(true);
  await page.waitForFunction(selector => document.querySelector(selector + ' p')?.parentElement.style.transform.includes('translateY(-'), panelSelector);
  await preference('reduce'); await playing(false);
  const pausedAt = await position(); await nextPaint(page);
  assert.ok(pausedAt.includes('translateY(-'), 'Reduced motion should preserve the current Crawl position');
  assert.equal(await position(), pausedAt, 'Reduced motion should stop Crawl without resetting its position');
  await preference('no-preference'); await playing(false);
  assert.equal(await position(), pausedAt, 'Removing reduced motion must not resume Crawl');
  await preference('reduce');
  await page.locator('[data-help-key="perspective_crawl_play_pause_btn"]').click();
  await playing(true);
  await page.waitForFunction(({ selector, pausedAt }) =>
    document.querySelector(selector + ' p')?.parentElement.style.transform !== pausedAt, { selector: panelSelector, pausedAt });
  await patch(page, { crawl: false });
  assert.equal(await panel.count(), 0);
  await patch(page, { crawl: true }); await playing(false);
  assert.ok((await panel.getAttribute('class')).includes('overflow-auto'), 'Reduced-motion reopen should show static readable text');
  await preference('no-preference'); await playing(false);
  await page.locator('[data-help-key="perspective_crawl_play_pause_btn"]').click();
  await playing(true);
  return { livePause: true, preservedPosition: true, noAutomaticResume: true, manualPlayUnderReducedMotion: true, reopensPaused: true };
}
async function checkWordHelpSpotlight(page) {
  const noticeSelector = '[data-adapted-word-help-spot-notice]';
  const disclosure = page.locator('[data-adapted-word-help-student-view]');
  const folded = await disclosure.count() ? !await disclosure.evaluate(node => node.open) : false;
  if (folded) await disclosure.locator('summary').first().click();
  const button = page.locator('[data-adapted-word-help-spot]').first();
  await button.waitFor({ state: 'visible' });
  const notice = page.locator(noticeSelector);
  assert.equal(await notice.getAttribute('role'), 'status', 'Spotlight feedback must remain a status announcement');
  assert.equal(await page.evaluate(() => !!window.CSS?.highlights && typeof Highlight === 'function'), true,
    'Spotlight verification requires the browser CSS Highlight API');
  const quote = await button.evaluate(node => node.closest('[data-adapted-word-help-entry]').querySelector('strong').textContent);
  const initial = await page.evaluate(() => ({
    learner: window.readerFixture.state.learner, id: window.readerFixture.item.id, data: window.readerFixture.item.data
  }));
  const shown = () => page.waitForFunction(({ quote, noticeSelector }) => {
    const ranges = [...(CSS.highlights.get('allo-word-help-focus') || [])];
    return ranges.length > 0 && ranges.map(range => range.toString()).join('') === quote
      && ranges.every(range => !range.collapsed && range.startContainer.isConnected && range.endContainer.isConnected
        && range.startContainer.parentElement.closest('[data-reading-passage]'))
      && document.querySelector(noticeSelector)?.textContent.includes(quote);
  }, { quote, noticeSelector });
  const cleared = () => page.waitForFunction(selector =>
    !CSS.highlights.get('allo-word-help-focus')?.size && document.querySelector(selector)?.textContent === '',
  noticeSelector, { timeout: 8000 });
  const spotlightState = () => page.evaluate(selector => ({
    ranges: CSS.highlights.get('allo-word-help-focus')?.size || 0,
    notice: document.querySelector(selector)?.textContent
  }), noticeSelector);
  await button.click(); await shown();
  await patch(page, { learner: initial.learner + '-spotlight-check' });
  assert.deepEqual(await page.evaluate(() => ({ id: window.readerFixture.item.id, data: window.readerFixture.item.data })),
    { id: initial.id, data: initial.data }, 'The learner check must keep the same reading and text mounted');
  assert.deepEqual(await spotlightState(), { ranges: 0, notice: '' }, 'A learner switch must clear spotlight feedback immediately');
  let collapseClearsFeedback = null;
  if (await disclosure.count()) {
    await button.click(); await shown();
    await disclosure.locator('summary').first().click();
    await nextPaint(page);
    assert.deepEqual(await spotlightState(), { ranges: 0, notice: '' }, 'Collapsing must clear locator feedback without waiting for expiry');
    await disclosure.locator('summary').first().click();
    assert.deepEqual(await spotlightState(), { ranges: 0, notice: '' }, 'Reopening the list must not restore locator feedback');
    collapseClearsFeedback = true;
  }
  await button.click(); await shown();
  const startedAt = await page.evaluate(() => performance.now());
  await cleared();
  const elapsed = await page.evaluate(start => performance.now() - start, startedAt);
  assert.ok(elapsed >= 3500, 'The spotlight must remain temporary feedback for its four-second interval');
  // Restore the fixture's learner and disclosure before any measured updates.
  await patch(page, { learner: initial.learner });
  await cleared();
  if (folded) await disclosure.locator('summary').first().click();
  await page.evaluate(() => window.scrollTo(0, 0)); await nextPaint(page);
  return { realHighlightRanges: true, statusFeedback: true, sameReadingLearnerReset: true, expiryClearsFeedback: true, collapseClearsFeedback };
}
async function checkAuxiliaryAudio(page) {
  const initial = await page.evaluate(() => {
    const fixture = window.readerFixture, { playing, playingId, sentence } = fixture.state;
    return { playback: { playing, playingId, sentence }, learner: fixture.state.learner,
      supportVersion: fixture.state.supportVersion, x: scrollX, y: scrollY,
      hadSpoken: Object.prototype.hasOwnProperty.call(fixture, 'lastSpoken'), lastSpoken: fixture.lastSpoken || null,
      expected: { idPrefix: 'reading-' + fixture.item.id + '-adapted-word-help-',
        text: fixture.item.adaptedReadingSupports.annotations.map(entry => entry.quote + '. ' + (entry.definition || entry.explanation || entry.text || '')).join('. ') } };
  });
  const disclosure = page.locator('[data-adapted-word-help-student-view]');
  const folded = await disclosure.count() ? !await disclosure.evaluate(node => node.open) : false;
  if (folded) await disclosure.locator('summary').first().click();
  const list = page.locator('[data-adapted-word-help]');
  const listen = list.getByRole('button', { name: 'Listen to word help', exact: true });
  const stop = list.getByRole('button', { name: 'Stop word help', exact: true });
  await listen.waitFor({ state: 'visible' }); await listen.click(); await nextPaint(page);
  const started = await page.evaluate(() => window.readerFixture.lastSpoken);
  assert.equal(started.text, initial.expected.text, 'Word help must request its own explanation text');
  assert.ok(started.id.startsWith(initial.expected.idPrefix) && started.id.length > initial.expected.idPrefix.length,
    'Word help must reserve a reader-owned audio ID');
  await patch(page, { playing: false, playingId: started.id });
  await stop.waitFor({ state: 'visible' }); await stop.click(); await nextPaint(page);
  assert.deepEqual(await page.evaluate(() => ({ playing: window.readerFixture.state.playing,
    playingId: window.readerFixture.state.playingId, lastSpoken: window.readerFixture.lastSpoken })),
  { playing: false, playingId: null, lastSpoken: started }, 'Stopping pending word-help audio must cancel without restarting it');
  await listen.waitFor({ state: 'visible' }); await listen.click(); await nextPaint(page);
  const restarted = await page.evaluate(() => window.readerFixture.lastSpoken);
  assert.equal(restarted.text, initial.expected.text);
  assert.notEqual(restarted.id, started.id, 'A fresh Listen action must own a fresh audio request');
  assert.deepEqual(await page.evaluate(() => ({ playing: window.readerFixture.state.playing, playingId: window.readerFixture.state.playingId })),
    { playing: true, playingId: restarted.id }, 'A fresh Listen action must work after cancellation');
  await patch(page, { supportVersion: initial.supportVersion + 1 });
  assert.deepEqual(await page.evaluate(() => ({ playing: window.readerFixture.state.playing, playingId: window.readerFixture.state.playingId })),
    { playing: false, playingId: null }, 'Changing the explanations must stop their retired audio');
  await patch(page, { supportVersion: initial.supportVersion });
  await listen.click(); await nextPaint(page);
  const beforeLearnerChange = await page.evaluate(() => window.readerFixture.lastSpoken);
  assert.notEqual(beforeLearnerChange.id, restarted.id, 'Learner cancellation must exercise a fresh audio request');
  assert.equal(beforeLearnerChange.text, initial.expected.text);
  assert.deepEqual(await page.evaluate(() => ({ playing: window.readerFixture.state.playing, playingId: window.readerFixture.state.playingId })),
    { playing: true, playingId: beforeLearnerChange.id });
  await patch(page, { playing: false, playingId: beforeLearnerChange.id, learner: initial.learner + '-audio-check' });
  assert.deepEqual(await page.evaluate(() => ({ playing: window.readerFixture.state.playing, playingId: window.readerFixture.state.playingId })),
    { playing: false, playingId: null }, 'Changing learners must cancel pending explanation audio');
  await patch(page, { learner: initial.learner });
  let collapseStopsOwnedAudio = null, collapsePreservesOtherAudio = null;
  if (await disclosure.count()) {
    let previousId = beforeLearnerChange.id;
    for (const playing of [false, true]) {
      await listen.click(); await nextPaint(page);
      const spoken = await page.evaluate(() => window.readerFixture.lastSpoken);
      assert.notEqual(spoken.id, previousId, 'Reopening must use a new audio request');
      previousId = spoken.id;
      await patch(page, { playing, playingId: spoken.id });
      await disclosure.locator('summary').first().click();
      await page.waitForFunction(() => window.readerFixture.state.playingId === null);
      assert.equal(await page.evaluate(() => window.readerFixture.state.playing), false, 'Collapsing must stop pending and active list audio');
      await disclosure.locator('summary').first().click();
      await listen.waitFor({ state: 'visible' });
      assert.deepEqual(await page.evaluate(() => window.readerFixture.lastSpoken), spoken, 'Reopening must not restart audio');
    }
    collapseStopsOwnedAudio = true;
    await listen.click(); await nextPaint(page);
    await patch(page, { playing: true, playingId: 'unrelated-audio-collapse-check' });
    await disclosure.locator('summary').first().click(); await nextPaint(page);
    assert.deepEqual(await page.evaluate(() => ({ playing: window.readerFixture.state.playing, playingId: window.readerFixture.state.playingId })),
      { playing: true, playingId: 'unrelated-audio-collapse-check' }, 'Collapsing must preserve another audio request');
    await disclosure.locator('summary').first().click();
    collapsePreservesOtherAudio = true;
  }
  await patch(page, initial.playback);
  if (folded) await disclosure.locator('summary').first().click();
  await page.evaluate(initial => {
    if (initial.hadSpoken) window.readerFixture.lastSpoken = initial.lastSpoken;
    else delete window.readerFixture.lastSpoken;
    window.scrollTo(initial.x, initial.y);
  }, initial);
  await nextPaint(page);
  return { recordedCallbacksOnly: true, expectedWordHelpRequest: true, pendingStopLabel: true, pendingCancelled: true,
    restartAfterStop: true, changedHelpStopsAudio: true, learnerChangeCancelsPending: true, collapseStopsOwnedAudio, collapsePreservesOtherAudio };
}
async function checkSectionPrompts(page, spec) {
  const initial = await page.evaluate(() => ({ revision: window.readerFixture.state.revision, learnerSession: window.readerFixture.state.learnerSession }));
  const selector = page.locator('[data-section-prompts-section]');
  const close = page.locator('[data-section-prompts]').getByRole('button', { name: 'Close', exact: true });
  const inlineToggle = index => page.locator('[data-section-think="' + index + '"] [data-section-think-toggle]');
  const focused = () => selector.evaluate(node => node === document.activeElement);
  assert.equal(await inlineToggle(0).count(), 0, 'The heading-only section has no inline question area');
  await inlineToggle(1).click();
  await selector.focus(); await selector.selectOption('2'); await nextPaint(page);
  assert.equal(await page.locator('[data-section-think="2"] [data-section-prompts]').count(), 1);
  assert.equal(await focused(), true, 'Section navigation must transfer focus to the new selector');
  await page.locator('[data-section-prompt="mainIdea"]').fill('A section-specific answer');
  await selector.focus(); await selector.selectOption('1'); await nextPaint(page);
  assert.equal(await page.locator('[data-section-prompt="mainIdea"]').inputValue(), '');
  await selector.selectOption('2'); await nextPaint(page);
  assert.equal(await page.locator('[data-section-prompt="mainIdea"]').inputValue(), 'A section-specific answer');
  await close.click();
  assert.equal(await inlineToggle(2).evaluate(node => node === document.activeElement), true);
  await inlineToggle(2).click();
  await selector.focus(); await selector.selectOption('0'); await nextPaint(page);
  assert.equal(await page.locator('[data-section-prompts-area] [data-section-prompts]').count(), 1,
    'A heading-only selection must remain reachable at the end of the passage');
  assert.equal(await focused(), true);
  assert.equal(await page.locator('[data-section-prompts]').getByRole('button', { name: 'Listen to this section', exact: true }).isDisabled(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'The panel must fit the viewport');
  let screenshot;
  if (option('--screenshots-dir')) {
    fs.mkdirSync(path.resolve(option('--screenshots-dir')), { recursive: true });
    screenshot = path.resolve(option('--screenshots-dir'), spec.name + '-questions.png');
    await page.locator('[data-section-prompts]').evaluate(node => node.scrollIntoView({ block: 'start' }));
    await nextPaint(page); await page.screenshot({ path: screenshot });
  }
  await close.click();
  assert.equal(await page.locator('[data-section-prompts-toggle]').evaluate(node => node === document.activeElement), true);
  const lastInline = page.locator('[data-section-think]').last();
  const lastSection = await lastInline.getAttribute('data-section-think');
  await lastInline.locator('[data-section-think-toggle]').click();
  await page.locator('[data-section-prompt="mainIdea"]').fill('An answer before the reading changes');
  await patch(page, { revision: initial.revision + 1 });
  assert.equal(await page.locator('[data-section-prompts]').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement === (document.querySelector('[data-reading-revised]')
    || document.querySelector('[data-section-prompts-toggle]'))), true, 'Editing must restore focus even when the inline panel moved');
  await patch(page, { revision: initial.revision, learnerSession: initial.learnerSession + '-new-reader' });
  await page.locator('[data-reading-passage] [data-reading-paragraph]').last().dispatchEvent('pointerdown');
  await page.locator('[data-section-prompts-toggle]').click();
  assert.equal(await selector.inputValue(), lastSection, 'The new anonymous session must track its own selected paragraph');
  await close.click();
  await patch(page, { learnerSession: initial.learnerSession });
  await page.evaluate(() => window.scrollTo(0, 0)); await nextPaint(page);
  return { relocatedFocus: true, headingOnlyFallback: true, answersPreserved: true, closeReturnsFocus: true, emptySectionAudioDisabled: true,
    editedPanelReturnsFocus: true, anonymousSessionTracksPosition: true, screenshot };
}
async function checkReadingPosition(page, spec) {
  const initial = await page.evaluate(() => ({ learnerSession: window.readerFixture.state.learnerSession, x: scrollX, y: scrollY }));
  const primary = page.locator('#root [data-adapted-reader]').first();
  const clickWithoutMoving = node => node.evaluate(element => element.click());
  try {
    for (const before of [false, true]) {
      await page.evaluate(before => window.readerFixture.mountPeer(before), before);
      const peer = page.locator('[data-reader-fixture-peer] [data-adapted-reader]').first();
      await peer.waitFor({ state: 'visible' }); await nextPaint(page);
      const peerParagraphs = peer.locator('[data-reading-passage] [data-reading-paragraph]');
      const peerParagraph = peerParagraphs.nth(Math.floor(await peerParagraphs.count() / 2));
      await peerParagraph.evaluate(node => {
        node.setAttribute('tabindex', '-1'); node.scrollIntoView({ block: 'center', behavior: 'instant' }); node.focus({ preventScroll: true });
      });
      await patch(page, { learnerSession: initial.learnerSession + '-position-' + before });
      assert.equal(await peerParagraph.evaluate(node => document.activeElement === node), true,
        'The independent reader must retain paragraph focus during the scroll check');
      assert.equal(await primary.evaluate((node, before) => {
        const paragraphs = [...node.querySelectorAll('[data-reading-passage] [data-reading-paragraph]')];
        return before ? paragraphs[0].getBoundingClientRect().top > innerHeight
          : paragraphs[paragraphs.length - 1].getBoundingClientRect().bottom < 0;
      }, before), true, 'The primary passage must be outside the real viewport for this ownership check');
      await page.evaluate(() => document.dispatchEvent(new Event('scroll')));
      await page.waitForTimeout(950);
      if (!before) {
        await clickWithoutMoving(primary.locator('[data-section-prompts-toggle]'));
        assert.equal(await primary.locator('[data-section-prompts-section]').inputValue(), '0',
          'A focused sibling paragraph must not choose the primary reader section');
        await clickWithoutMoving(primary.locator('[data-section-prompts]').getByRole('button', { name: 'Close', exact: true }));
      } else {
        await clickWithoutMoving(primary.locator('[data-reading-outline-toggle]'));
        await clickWithoutMoving(primary.locator('[data-reading-bookmark]'));
        await primary.locator('[data-reading-place-notice]').filter({ hasText: 'Bookmark kept for this visit at:' }).waitFor();
        await clickWithoutMoving(primary.locator('[data-reading-bookmark-open]'));
        assert.equal(await primary.evaluate(node => document.activeElement?.closest('[data-adapted-reader]') === node
          && document.activeElement?.getAttribute('data-reading-paragraph') === '0'), true,
        'A bookmark must belong to the primary reader, not the focused sibling paragraph');
        await clickWithoutMoving(primary.locator('[data-reading-outline-close]'));
      }
      await page.evaluate(() => window.readerFixture.unmountPeer());
      await nextPaint(page);
    }
    await patch(page, { learnerSession: initial.learnerSession + '-position-own' });
    const lastSection = await primary.locator('[data-section-think]').last().getAttribute('data-section-think');
    await primary.locator('[data-reading-passage] [data-reading-paragraph]').last().dispatchEvent('pointerdown');
    await primary.locator('[data-section-prompts-toggle]').click();
    assert.equal(await primary.locator('[data-section-prompts-section]').inputValue(), lastSection,
      'The primary reader must still track its own selected paragraph');
    await primary.locator('[data-section-prompts]').getByRole('button', { name: 'Close', exact: true }).click();
    const restart = await checkReadingRestart(page, primary);
    const revisedNotice = await checkRevisedReadingNotice(page, primary);
    const media = await checkMediaReadingPosition(page, primary, spec);
    return { siblingFocusIgnoredAbove: true, siblingFocusIgnoredBelow: true, ownPointerPreserved: true, restart, revisedNotice, media };
  } finally {
    await page.evaluate(() => window.readerFixture.unmountPeer());
    await patch(page, { learnerSession: initial.learnerSession });
    await page.evaluate(initial => window.scrollTo(initial.x, initial.y), initial);
    await nextPaint(page);
  }
}
async function checkReadingRestart(page, primary) {
  const initial = await page.evaluate(() => ({ learner: window.readerFixture.state.learner,
    learnerSession: window.readerFixture.state.learnerSession, x: scrollX, y: scrollY }));
  const learner = 'fixture-reading-restart-learner';
  const readSaved = () => page.evaluate(learner => Object.entries(JSON.parse(localStorage.getItem('alloflow_reading_places_v1') || '{}'))
    .find(([key]) => key.startsWith(learner + '|'))?.[1] || null, learner);
  const clickWithoutMoving = node => node.evaluate(element => element.click());
  try {
    await patch(page, { learner, learnerSession: 'fixture-reading-restart-session' });
    await primary.locator('[data-section-think="1"] [data-section-think-toggle]').click();
    await primary.locator('[data-section-prompt="mainIdea"]').fill('An answer kept when restarting the reading');
    await primary.locator('[data-section-prompts]').getByRole('button', { name: 'Close', exact: true }).click();
    const paragraphs = primary.locator('[data-reading-passage] [data-reading-paragraph]');
    const later = paragraphs.nth(Math.floor(await paragraphs.count() / 2));
    const laterIndex = Number(await later.getAttribute('data-reading-paragraph'));
    await later.dispatchEvent('pointerdown');
    await clickWithoutMoving(primary.locator('[data-reading-outline-toggle]'));
    await clickWithoutMoving(primary.locator('[data-reading-bookmark]'));
    await primary.locator('[data-reading-place-notice]').filter({ hasText: 'Bookmark saved at:' }).waitFor();
    await clickWithoutMoving(primary.locator('[data-reading-outline-close]'));
    // Populate the Continue offer through a real scroll-rest save, not a storage fixture.
    await later.evaluate(node => window.scrollTo({ top: scrollY + node.getBoundingClientRect().top, behavior: 'instant' }));
    await page.waitForFunction(({ learner, index }) => Object.entries(JSON.parse(localStorage.getItem('alloflow_reading_places_v1') || '{}'))
      .some(([key, row]) => key.startsWith(learner + '|') && row.paragraph === index && row.resume === false), { learner, index: laterIndex });
    const savedBefore = await readSaved();
    assert.ok(savedBefore.paragraph > 0, 'The restart check must begin with a genuine later reading position');
    assert.equal(savedBefore.bookmark.paragraph, laterIndex);
    assert.ok(Object.values(savedBefore.responses).some(answer => answer.mainIdea === 'An answer kept when restarting the reading'));
    await patch(page, { learner: learner + '-away' });
    await patch(page, { learner });
    const restart = primary.locator('[data-reading-continue-restart]');
    await restart.waitFor({ state: 'visible' });
    assert.equal((await readSaved()).paragraph, laterIndex, 'Returning must keep the saved place until a choice is made');
    await later.dispatchEvent('pointerdown');
    await restart.focus(); await restart.press('Enter');
    await primary.locator('[data-reading-continue]').waitFor({ state: 'detached' });
    await page.waitForTimeout(1800);
    const first = paragraphs.first();
    assert.equal(await first.evaluate(node => node === document.activeElement
      && node.closest('[data-adapted-reader]') === document.querySelector('#root [data-adapted-reader]')), true,
    'Keyboard restart must move focus to the first paragraph owned by this reader');
    assert.equal(await first.evaluate(node => {
      const box = node.getBoundingClientRect();
      return box.top >= -1 && box.bottom <= innerHeight + 1;
    }), true, 'The beginning must remain visible after the Continue offer is removed and scrolling settles');
    const savedAfter = await readSaved();
    assert.equal(savedAfter.paragraph, 0, 'Restart must persist the beginning after the scroll-rest timer');
    assert.equal(savedAfter.resume, false);
    assert.deepEqual(savedAfter.bookmark, savedBefore.bookmark, 'Restart must preserve the authored bookmark');
    assert.deepEqual(savedAfter.responses, savedBefore.responses, 'Restart must preserve authored answers');
    await clickWithoutMoving(primary.locator('[data-section-prompts-toggle]'));
    assert.equal(await primary.locator('[data-section-prompts-section]').inputValue(), '0',
      'Questions opened after restart must use the beginning, not the previously selected paragraph');
    await clickWithoutMoving(primary.locator('[data-section-prompts]').getByRole('button', { name: 'Close', exact: true }));
    await later.evaluate(node => window.scrollTo({ top: scrollY + node.getBoundingClientRect().top, behavior: 'instant' }));
    await page.waitForFunction(({ learner, index }) => Object.entries(JSON.parse(localStorage.getItem('alloflow_reading_places_v1') || '{}'))
      .some(([key, row]) => key.startsWith(learner + '|') && row.paragraph === index && row.resume === false), { learner, index: laterIndex });
    await patch(page, { learner: learner + '-away' });
    await patch(page, { learner });
    const resume = primary.locator('[data-reading-continue-go]');
    await resume.waitFor({ state: 'visible' });
    assert.equal((await readSaved()).paragraph, laterIndex);
    await resume.focus(); await resume.press('Enter');
    await primary.locator('[data-reading-continue]').waitFor({ state: 'detached' });
    await page.waitForTimeout(1800);
    assert.equal(await later.evaluate(node => node === document.activeElement
      && node.closest('[data-adapted-reader]') === document.querySelector('#root [data-adapted-reader]')), true,
    'Keyboard Continue must focus the exact saved paragraph owned by this reader');
    assert.equal(await later.evaluate(node => {
      const box = node.getBoundingClientRect();
      return box.top >= -1 && box.top < innerHeight && box.bottom > 0;
    }), true, 'The saved paragraph start must remain visible after the Continue offer is removed and scrolling settles');
    const savedContinued = await readSaved();
    assert.equal(savedContinued.paragraph, laterIndex, 'Continue must retain the exact saved paragraph after scroll-rest');
    assert.equal(savedContinued.resume, false);
    assert.deepEqual(savedContinued.bookmark, savedBefore.bookmark, 'Continue must preserve the authored bookmark');
    assert.deepEqual(savedContinued.responses, savedBefore.responses, 'Continue must preserve authored answers');
    return { keyboardFocus: true, beginningVisible: true, positionReset: true, questionsReset: true, authoredWorkPreserved: true,
      continueKeyboardFocus: true, continueTargetVisible: true, continuePositionPreserved: true, continueWorkPreserved: true };
  } finally {
    const close = primary.locator('[data-section-prompts]').getByRole('button', { name: 'Close', exact: true });
    if (await close.count()) await clickWithoutMoving(close);
    const outlineClose = primary.locator('[data-reading-outline-close]');
    if (await outlineClose.count()) await clickWithoutMoving(outlineClose);
    await patch(page, { learner: initial.learner, learnerSession: initial.learnerSession });
    await page.evaluate(initial => window.scrollTo(initial.x, initial.y), initial);
    await nextPaint(page);
  }
}
async function checkRevisedReadingNotice(page, primary) {
  const initial = await page.evaluate(() => ({ learner: window.readerFixture.state.learner,
    learnerSession: window.readerFixture.state.learnerSession, revision: window.readerFixture.state.revision, x: scrollX, y: scrollY }));
  const learner = 'fixture-revised-notice-learner';
  const readSaved = () => page.evaluate(learner => Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem('alloflow_reading_places_v1') || '{}'))
    .filter(([key]) => key.startsWith(learner + '|'))), learner);
  const clickWithoutMoving = node => node.evaluate(element => element.click());
  const writeAnswer = async answer => {
    await primary.locator('[data-section-think="1"] [data-section-think-toggle]').click();
    await primary.locator('[data-section-prompt="mainIdea"]').fill(answer);
    await primary.locator('[data-section-prompts]').getByRole('button', { name: 'Close', exact: true }).click();
  };
  const bookmark = async paragraph => {
    await paragraph.dispatchEvent('pointerdown');
    await clickWithoutMoving(primary.locator('[data-reading-outline-toggle]'));
    await clickWithoutMoving(primary.locator('[data-reading-bookmark]'));
    await primary.locator('[data-reading-place-notice]').filter({ hasText: 'Bookmark saved at:' }).waitFor();
    await clickWithoutMoving(primary.locator('[data-reading-outline-close]'));
  };
  const acknowledge = async target => {
    const notice = primary.locator('[data-reading-revised]');
    const ok = notice.getByRole('button', { name: 'OK', exact: true });
    await ok.focus(); await ok.press('Enter');
    await notice.waitFor({ state: 'detached' });
    await page.waitForTimeout(1800);
    assert.equal(await target.evaluate(node => node === document.activeElement
      && node.closest('[data-adapted-reader]') === document.querySelector('#root [data-adapted-reader]')), true,
    'Acknowledging the revised reading must focus its own current paragraph');
    assert.equal(await target.evaluate(node => {
      const box = node.getBoundingClientRect();
      return box.top >= -1 && box.top < innerHeight && box.bottom > 0;
    }), true, 'The revised reading target must remain visible after the notice disappears and scrolling settles');
  };
  try {
    await patch(page, { learner, learnerSession: 'fixture-revised-notice-session' });
    await writeAnswer('An answer belonging to the earlier reading');
    const paragraphs = primary.locator('[data-reading-passage] [data-reading-paragraph]');
    const later = paragraphs.nth(Math.floor(await paragraphs.count() / 2));
    const laterIndex = Number(await later.getAttribute('data-reading-paragraph'));
    await bookmark(later);
    await later.evaluate(node => window.scrollTo({ top: scrollY + node.getBoundingClientRect().top, behavior: 'instant' }));
    await page.waitForFunction(({ learner, index }) => Object.entries(JSON.parse(localStorage.getItem('alloflow_reading_places_v1') || '{}'))
      .some(([key, row]) => key.startsWith(learner + '|') && row.paragraph === index && row.resume === false), { learner, index: laterIndex });
    const [oldKey, oldWork] = Object.entries(await readSaved())[0];
    assert.equal(oldWork.bookmark.paragraph, laterIndex);
    assert.ok(Object.values(oldWork.responses).some(answer => answer.mainIdea === 'An answer belonging to the earlier reading'));
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await patch(page, { revision: initial.revision + 1 });
    await primary.locator('[data-reading-revised]').waitFor({ state: 'visible' });
    await acknowledge(paragraphs.first());
    const afterFresh = (await readSaved())[oldKey];
    assert.deepEqual(afterFresh.bookmark, oldWork.bookmark, 'Acknowledging changed text must preserve the old-version bookmark');
    assert.deepEqual(afterFresh.responses, oldWork.responses, 'Acknowledging changed text must preserve old-version answers');
    const earlierKeys = Object.keys(await readSaved());
    await patch(page, { revision: initial.revision + 2 });
    await primary.locator('[data-reading-revised]').waitFor({ state: 'visible' });
    await writeAnswer('An answer belonging to the current reading');
    await bookmark(later);
    await page.waitForFunction(({ learner, earlierKeys, index }) => Object.entries(JSON.parse(localStorage.getItem('alloflow_reading_places_v1') || '{}'))
      .some(([key, row]) => key.startsWith(learner + '|') && !earlierKeys.includes(key) && row.bookmark?.paragraph === index
        && Object.values(row.responses || {}).some(answer => answer.mainIdea === 'An answer belonging to the current reading')),
    { learner, earlierKeys, index: laterIndex });
    const [currentKey, currentWork] = Object.entries(await readSaved()).find(([key]) => !earlierKeys.includes(key));
    assert.equal(await primary.locator('[data-reading-revised]').count(), 1, 'The revision notice must still be pending while current work is authored');
    await acknowledge(later);
    const afterProgress = await readSaved();
    assert.deepEqual(afterProgress[currentKey].bookmark, currentWork.bookmark, 'Acknowledgement must preserve the current-version bookmark');
    assert.deepEqual(afterProgress[currentKey].responses, currentWork.responses, 'Acknowledgement must preserve current-version answers');
    assert.deepEqual(afterProgress[oldKey].bookmark, oldWork.bookmark);
    assert.deepEqual(afterProgress[oldKey].responses, oldWork.responses);
    return { freshKeyboardFocus: true, freshBeginningVisible: true, progressedKeyboardFocus: true, progressedTargetVisible: true,
      oldVersionWorkPreserved: true, currentVersionWorkPreserved: true };
  } finally {
    const close = primary.locator('[data-section-prompts]').getByRole('button', { name: 'Close', exact: true });
    if (await close.count()) await clickWithoutMoving(close);
    const outlineClose = primary.locator('[data-reading-outline-close]');
    if (await outlineClose.count()) await clickWithoutMoving(outlineClose);
    await patch(page, { learner: initial.learner, learnerSession: initial.learnerSession, revision: initial.revision });
    await page.evaluate(initial => window.scrollTo(initial.x, initial.y), initial);
    await nextPaint(page);
  }
}
async function checkMediaReadingPosition(page, primary, spec) {
  const initial = await page.evaluate(() => ({ resource: window.readerFixture.state.resource, learner: window.readerFixture.state.learner,
    learnerSession: window.readerFixture.state.learnerSession, mediaReading: window.readerFixture.state.mediaReading, x: scrollX, y: scrollY }));
  const clickWithoutMoving = node => node.evaluate(element => element.click());
  const results = {};
  const readSaved = learner => page.evaluate(learner => Object.entries(JSON.parse(localStorage.getItem('alloflow_reading_places_v1') || '{}'))
    .find(([key]) => key.startsWith(learner + '|'))?.[1] || null, learner);
  const focusedAndVisible = async (target, action) => {
    await page.waitForTimeout(1800);
    assert.equal(await target.evaluate(node => document.activeElement === node), true, action + ' must focus the media reading block');
    assert.equal(await target.evaluate(node => {
      const box = node.getBoundingClientRect();
      return box.top >= -1 && box.top < innerHeight && box.bottom > 0;
    }), true, action + ' must leave the media block visible after scrolling settles');
  };
  try {
    for (const kind of ['table', 'chart']) {
      const learner = 'fixture-media-position-' + kind;
      await patch(page, { resource: 'fixture-media-position', learner, learnerSession: learner + '-session', mediaReading: true });
      const target = primary.locator('[data-reading-' + kind + ']').first();
      await target.waitFor({ state: 'visible' });
      const paragraphId = await target.getAttribute('data-reading-paragraph');
      assert.match(paragraphId || '', /^\d+$/, 'A media block must expose its canonical paragraph index');
      const index = Number(paragraphId);
      const internal = target.locator(kind === 'table' ? 'tbody td' : 'svg [data-media-bar]').first();
      await internal.click();
      await clickWithoutMoving(primary.locator('[data-reading-outline-toggle]'));
      await clickWithoutMoving(primary.locator('[data-reading-bookmark]'));
      await page.waitForFunction(({ learner, index }) => Object.entries(JSON.parse(localStorage.getItem('alloflow_reading_places_v1') || '{}'))
        .some(([key, row]) => key.startsWith(learner + '|') && row.bookmark?.paragraph === index), { learner, index });
      const openBookmark = primary.locator('[data-reading-bookmark-open]');
      await openBookmark.focus(); await openBookmark.press('Enter');
      await focusedAndVisible(target, 'Opening the ' + kind + ' bookmark');
      await clickWithoutMoving(primary.locator('[data-reading-outline-close]'));
      await internal.click();
      await clickWithoutMoving(primary.locator('[data-section-prompts-toggle]'));
      assert.equal(await primary.locator('[data-section-prompts-section]').inputValue(), '1',
        'Questions from the trailing ' + kind + ' must use the second section');
      const answer = 'Evidence from the ' + kind + ' belongs to the second section.';
      await primary.locator('[data-section-prompt="mainIdea"]').fill(answer);
      await primary.locator('[data-section-prompts]').getByRole('button', { name: 'Close', exact: true }).click();
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
      await nextPaint(page);
      await target.evaluate(node => window.scrollTo({ top: scrollY + node.getBoundingClientRect().top, behavior: 'instant' }));
      await page.waitForFunction(({ learner, index, answer }) => Object.entries(JSON.parse(localStorage.getItem('alloflow_reading_places_v1') || '{}'))
        .some(([key, row]) => key.startsWith(learner + '|') && row.paragraph === index && row.resume === false
          && Object.values(row.responses || {}).some(response => response.mainIdea === answer)), { learner, index, answer });
      const before = await readSaved(learner);
      await patch(page, { learner: learner + '-away' });
      await patch(page, { learner });
      const resume = primary.locator('[data-reading-continue-go]');
      await resume.waitFor({ state: 'visible' });
      await resume.focus(); await resume.press('Enter');
      await primary.locator('[data-reading-continue]').waitFor({ state: 'detached' });
      await focusedAndVisible(target, 'Continuing at the ' + kind);
      const after = await readSaved(learner);
      assert.equal(after.paragraph, index, 'Continue must retain the exact media reading position');
      assert.deepEqual(after.bookmark, before.bookmark, 'Media Continue must preserve the bookmark');
      assert.deepEqual(after.responses, before.responses, 'Media Continue must preserve section answers');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true,
        'The media reading must fit the viewport');
      let screenshot;
      if (option('--screenshots-dir')) {
        fs.mkdirSync(path.resolve(option('--screenshots-dir')), { recursive: true });
        screenshot = path.resolve(option('--screenshots-dir'), spec.name + '-media-' + kind + '.png');
        await page.screenshot({ path: screenshot });
      }
      results[kind] = { paragraph: index, nestedPointerTracked: true, bookmarkFocus: true, bookmarkVisible: true,
        correctQuestionSection: true, scrollRestSaved: true, continueFocus: true, continueVisible: true, authoredWorkPreserved: true, screenshot };
    }
    return { syntheticMediaRenderer: true, ...results };
  } finally {
    const close = primary.locator('[data-section-prompts]').getByRole('button', { name: 'Close', exact: true });
    if (await close.count()) await clickWithoutMoving(close);
    const outlineClose = primary.locator('[data-reading-outline-close]');
    if (await outlineClose.count()) await clickWithoutMoving(outlineClose);
    await patch(page, { resource: initial.resource, learner: initial.learner, learnerSession: initial.learnerSession, mediaReading: initial.mediaReading });
    await page.evaluate(initial => window.scrollTo(initial.x, initial.y), initial);
    await nextPaint(page);
  }
}
async function checkOriginalReader(page, spec) {
  const source = page.locator('[data-original-source]');
  await source.waitFor({ state: 'visible' });
  const supports = source.locator('[data-reading-gloss]');
  const toggle = page.locator('[data-original-support-settings] input[type="checkbox"]');
  const density = page.locator('[data-original-support-settings] select');
  const sourceUnchanged = async () => {
    const preserved = await page.evaluate(() => {
      const copy = document.querySelector('[data-original-source]').cloneNode(true);
      copy.querySelectorAll('[data-reading-gloss], [data-sentence-read], .sr-only').forEach(node => node.remove());
      return copy.textContent === window.readerFixture.expectedOriginalText;
    });
    assert.equal(preserved, true, 'Word help changed the original reading text');
  };
  await toggle.check(); await density.selectOption('all'); await nextPaint(page);
  assert.equal(await supports.count(), spec.originalSupports);
  await sourceUnchanged();
  await toggle.uncheck(); await nextPaint(page);
  assert.equal(await supports.count(), 0); await sourceUnchanged();
  await toggle.check(); await density.selectOption('light'); await nextPaint(page);
  const lighterSupports = await supports.count();
  assert.ok(lighterSupports > 0 && lighterSupports < spec.originalSupports, 'Lighter word help should reduce visible supports');
  await sourceUnchanged();
  await density.selectOption('all'); await nextPaint(page);
  assert.equal(await supports.count(), spec.originalSupports); await sourceUnchanged();
  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  assert.equal(fitsViewport, true, 'Original reader should not overflow the viewport horizontally');
  return { exactSourcePreserved: true, supports: spec.originalSupports, lighterSupports, visibilityToggle: true };
}
async function unmount(page) {
  return page.evaluate(() => {
    const cleanupBaseline = window.readerFixture.cleanupBaseline;
    window.readerFixture.unmount();
    const immediatelyAfterClose = window.readerMetrics.assertCleanup(cleanupBaseline);
    return { cleanupBaseline, immediatelyAfterClose };
  });
}
async function memory(cdp, page) {
  await cdp.send('HeapProfiler.collectGarbage');
  return { dom: await cdp.send('Memory.getDOMCounters'), heap: await cdp.send('Runtime.getHeapUsage'),
    ...(retention ? { readingPlaces: await page.evaluate(() => window.readerPlaceRetention()) } : {}) };
}
function distribution(samples) {
  const sorted = [...samples].sort((a, b) => a - b), quantile = q => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return { count: sorted.length, p50: quantile(.5), p95: quantile(.95), p99: quantile(.99), samples };
}
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const { chromium } = req('playwright');
  let browser;
  const results = [];
  try {
    browser = await chromium.launch({ headless: true, channel: option('--browser', 'msedge') });
    for (const spec of selected) {
      const context = await browser.newContext({ viewport: { width: spec.width || 1280, height: 900 } });
      try {
        const page = await context.newPage(), errors = [], external = [];
        if (spec.crawl && verifyCrawlMotion) await page.emulateMedia({ reducedMotion: 'no-preference' });
        page.on('pageerror', error => { errors.push(error.message); console.error('Fixture page error: ' + error.message); });
        await page.route('**/*', route => {
          const url = route.request().url();
          if (url.startsWith(base + '/') || /^(blob:|data:)/.test(url)) return route.continue();
          external.push(url); return route.abort();
        });
        await page.addInitScript(() => localStorage.setItem('allo_save_karaoke_audio', '0'));
        await page.goto(base + '/?case=' + spec.name + '&instrument=' + (instrument ? 1 : 0));
        await page.waitForFunction(() => window.readerFixture?.ready, { timeout: 30000 });
        await nextPaint(page);
        if (smoke || spec.lifecycle === 'preview') {
          const setupToggle = page.locator('[data-teacher-setup-toggle]');
          if (await setupToggle.count() && await setupToggle.getAttribute('aria-expanded') === 'false') await setupToggle.click();
          await page.locator('[data-student-preview-open]').waitFor({ state: 'visible' });
        }
        const inventory = await page.evaluate(() => window.readerFixture.inventory);
        assert.equal(inventory.acceptedSupports, spec.supports || 0);
        assert.equal(inventory.acceptedOriginalSupports, spec.originalSupports || 0);
        // Run interaction checks before resetting the measured work counters.
        const crawlMotion = spec.crawl && verifyCrawlMotion ? await checkCrawlMotion(page) : null;
        const wordHelpSpotlight = verifyWordHelpSpotlight && spotlightCase(spec) ? await checkWordHelpSpotlight(page) : null;
        const auxiliaryAudio = verifyAuxiliaryAudio && spotlightCase(spec) ? await checkAuxiliaryAudio(page) : null;
        const sectionPrompts = verifySectionPrompts && spec.leadingTitle && spec.headings ? await checkSectionPrompts(page, spec) : null;
        const readingPosition = verifyReadingPosition && spec.leadingTitle && spec.headings ? await checkReadingPosition(page, spec) : null;
        const originalReader = spec.protectedOriginal ? await checkOriginalReader(page, spec) : null;
        if (spec.protectedOriginal) {
          assert.equal(inventory.readingForm, 'same-text-supported');
          assert.equal(inventory.sourcePreserved, true);
          assert.equal(inventory.displayedOriginalSupports, spec.originalSupports);
        }
        const screenshotsDir = option('--screenshots-dir');
        let screenshot, passageScreenshot;
        if (screenshotsDir) {
          fs.mkdirSync(path.resolve(screenshotsDir), { recursive: true });
          screenshot = path.resolve(screenshotsDir, spec.name + '.png');
          await page.evaluate(() => window.scrollTo(0, 0)); await nextPaint(page);
          await page.screenshot({ path: screenshot });
          if (spec.protectedOriginal) {
            passageScreenshot = path.resolve(screenshotsDir, spec.name + '-passage.png');
            await page.locator('[data-original-source]').evaluate(node => node.scrollIntoView({ block: 'start' }));
            await nextPaint(page); await page.screenshot({ path: passageScreenshot });
            await page.evaluate(() => window.scrollTo(0, 0)); await nextPaint(page);
          }
        }
        if (smoke) {
          await page.locator('[data-student-preview-open]').click();
          await page.locator('[data-student-preview]').waitFor();
          await page.locator('[data-student-preview-close]').click();
          assert.equal(await page.locator('[data-student-preview]').count(), 0);
          await patch(page, { immersive: true, sweep: 35 });
          assert.ok(await page.locator('[data-immersive-passage] [data-sentence-idx="0"]').count());
          await patch(page, { immersive: false, compare: true });
          assert.equal(await page.locator('[data-compare-version]').count(), 2);
          const cleanup = await unmount(page);
          assert.deepEqual(errors, []); assert.deepEqual(external, []);
          results.push({ name: spec.name, status: 'smoke-only', inventory, crawlMotion, wordHelpSpotlight, auxiliaryAudio, sectionPrompts, readingPosition, originalReader, screenshot, passageScreenshot, ...cleanup });
          continue;
        }
        const cdp = await context.newCDPSession(page);
        const retained = [{ phase: 'mounted', ...await memory(cdp, page) }];
        await page.evaluate(() => window.readerMetrics.reset());
        // Samples measure update-to-two-paints, including frame pacing. They are
        // never reported as render time. Instrumented Profiler actualDuration is separate.
        const latencies = [];
        for (let i = 0; i < 25; i++) {
          const elapsed = await page.evaluate(async i => {
            const start = performance.now();
            window.readerFixture.patch({ sweep: (i % 10) * 10, sentence: 0 });
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return performance.now() - start;
          }, i);
          if (i >= 5) latencies.push(elapsed);
        }
        const sweepMetrics = await page.evaluate(() => window.readerMetrics.snapshot());
        const cycles = spec.cycles || (spec.lifecycle === 'navigation' ? 100 : spec.lifecycle ? 50 : 0);
        for (let i = 0; i < cycles; i++) {
          if (spec.lifecycle === 'preview') {
            await page.evaluate(() => { const button = document.querySelector('[data-student-preview-open]'); button.focus(); button.click(); });
            await nextPaint(page);
            await page.evaluate(() => { const button = document.querySelector('[data-student-preview-close]'); button.focus(); button.click(); });
            await nextPaint(page);
          } else if (spec.lifecycle === 'overlay') {
            await patch(page, { immersive: false }); await patch(page, { immersive: true });
          } else {
            const revision = spec.unique ? i + 1 : i % 3;
            await patch(page, { resource: spec.unique ? 'fixture-resource-' + i : i % 2 ? 'fixture-a' : 'fixture-b',
              learner: 'fixture-learner-' + (spec.unique ? i : i % 2), revision, supportVersion: spec.unique ? i + 1 : i % 4 });
            if (spec.unique) {
              const visible = await page.evaluate(() => ({
                body: document.querySelector('[data-simplified-reading-body]')?.textContent.replace(/\s+/g, ''),
                help: document.querySelector('[data-adapted-word-help]')?.textContent.replace(/\s+/g, ''),
                resource: window.readerFixture.item.id, learner: window.readerFixture.state.learner
              }));
              assert.ok(visible.body?.includes('Thisreadingchanged' + revision + 'times.'), 'Stale reading after unique navigation');
              assert.ok(visible.help?.includes('Version' + (i + 1)), 'Stale support after unique navigation');
              assert.equal(visible.resource, 'fixture-resource-' + i); assert.equal(visible.learner, 'fixture-learner-' + i);
            }
          }
          if ((i + 1) % 10 === 0) retained.push({ phase: 'cycle-' + (i + 1), ...await memory(cdp, page) });
        }
        if (spec.audio) {
          await patch(page, { karaoke: true });
          await page.evaluate(() => document.querySelector('[role="dialog"][aria-labelledby="karaoke-reader-dialog-title"] button[aria-label="Play"]').focus());
          await page.keyboard.press('Enter'); // trusted activation without retaining a driver element handle
          await page.waitForFunction(() => window.readerMetrics.snapshot().audioStarts > 0);
          await page.waitForTimeout(300);
          await patch(page, { karaoke: false });
          assert.equal(await page.evaluate(() => window.readerMetrics.snapshot().playingAudio), 0);
        }
        if (spec.storage) {
          await page.evaluate(() => { document.querySelector('[data-reading-paragraph="1"]')?.scrollIntoView(); });
          await page.waitForTimeout(1000);
          await page.evaluate(() => document.dispatchEvent(new Event('scroll')));
          await page.waitForTimeout(1000);
        }
        const activityMetrics = await page.evaluate(() => window.readerMetrics.snapshot());
        const cleanup = await unmount(page);
        await page.mouse.click(1, 1); // leave focus and pointer on a neutral part of the disposable fixture
        await page.waitForTimeout(4500); // current focus/advance timers must have drained
        retained.push({ phase: 'unmounted', ...await memory(cdp, page) });
        const afterClose = await page.evaluate(() => window.readerMetrics.assertCleanup(window.readerFixture.cleanupBaseline));
        assert.deepEqual(errors, []); assert.deepEqual(external, []);
        results.push({ name: spec.name, inventory, crawlMotion, wordHelpSpotlight, auxiliaryAudio, sectionPrompts, readingPosition, originalReader, screenshot, passageScreenshot, updateToPaintMs: distribution(latencies),
          sweepMetrics, activityMetrics, retained, ...cleanup, afterClose, lifecycle: { cycles, uniqueResources: spec.unique ? cycles : null, freshnessChecks: spec.unique ? cycles : 0 } });
        console.log('Measured ' + spec.name);
      } finally { await context.close(); }
    }
    assert.equal(head(), baseline, 'HEAD changed during the run');
    assert.deepEqual(hashes(), initialHashes, 'Measured source changed during the run');
    const report = { status: smoke ? 'fixture-smoke-only' : 'candidate-baseline', baseline,
      environment, harnessHashes, browser: browser.version(), sourceMode: fromGit ? 'git-HEAD' : 'working-tree', instrumented: instrument, retentionProbe: retention, crawlMotionChecks: verifyCrawlMotion, wordHelpSpotlightChecks: verifyWordHelpSpotlight, auxiliaryAudioChecks: verifyAuxiliaryAudio, sectionPromptChecks: verifySectionPrompts, readingPositionChecks: verifyReadingPosition, sourceHashes: initialHashes,
      css: { file: cssFile, sha256: crypto.createHash('sha256').update(css).digest('hex') },
      limitations: ['Not the integrated host or deployed release.', 'Synthetic sweep updates, local audio route, and disposable browser storage; icon components are stubbed.',
        'Timing budgets are unset until repeated baseline runs establish noise and device constraints.',
        'DOM counters identify retention trends; detached-node retaining paths require a heap snapshot follow-up.'],
      results };
    const output = option('--output');
    if (output) { const destination = path.resolve(output); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n'); }
    console.log(JSON.stringify(output ? {status:report.status, baseline, cases:results.length, output:path.resolve(output)} : report, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
